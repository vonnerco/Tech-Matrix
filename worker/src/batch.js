// Durable batch scoring: one Durable Object per batch job.
//
// The job holds the queue (candidate name + resume text) and its results in
// SQLite storage, and works the queue down on an alarm. Both the state and the
// alarm are durable, so a run keeps going after the browser tab closes: the
// client polls progress() and pulls results when it comes back.
//
// The Worker (not this object) verifies the Supabase token, so every method
// takes the caller's user id and refuses a job owned by someone else.
import { DurableObject } from "cloudflare:workers";
import { MAX_RESUME, localScore, mapLimit, scoreWithRetry } from "./scoring.js";

export const MAX_BATCH_ITEMS = 300;
const TICK = 4; // candidates handled per alarm
const TICK_CONCURRENCY = 3; // parallel model calls within a tick
const NEXT_TICK_MS = 150; // pause between ticks

function toArray(json) {
  try {
    const a = JSON.parse(json);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function assertOwner(sql, userId) {
  const job = sql.exec("SELECT user_id FROM job WHERE id = 1").toArray()[0];
  if (!job) throw new Error("missing");
  if (job.user_id && userId && String(job.user_id) !== String(userId)) {
    throw new Error("forbidden");
  }
}

export class BatchJob extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const sql = ctx.storage.sql;
      sql.exec(
        "CREATE TABLE IF NOT EXISTS job (" +
          "id INTEGER PRIMARY KEY CHECK (id = 1), job_id TEXT NOT NULL, " +
          "user_id TEXT, role TEXT NOT NULL, status TEXT NOT NULL, " +
          "created_at TEXT NOT NULL, total INTEGER NOT NULL)",
      );
      sql.exec(
        "CREATE TABLE IF NOT EXISTS items (" +
          "i INTEGER PRIMARY KEY, name TEXT, resume TEXT, status TEXT NOT NULL, " +
          "score REAL, verdict TEXT, summary TEXT, dimensions TEXT, " +
          "strengths TEXT, gaps TEXT, source TEXT, error TEXT, " +
          "recorded INTEGER NOT NULL DEFAULT 0)",
      );
    });
  }

  // --- control (the Worker calls these for a signed-in user) ---

  // Create the job shell. Chunks of items follow via addItems, then go().
  async start({ jobId, userId, role, total }) {
    const sql = this.ctx.storage.sql;
    const count = Math.max(0, Math.min(MAX_BATCH_ITEMS, Number(total) || 0));
    sql.exec("DELETE FROM items");
    sql.exec("DELETE FROM job");
    sql.exec(
      "INSERT INTO job (id, job_id, user_id, role, status, created_at, total) " +
        "VALUES (1, ?, ?, ?, 'queued', ?, ?)",
      String(jobId || ""),
      userId || null,
      String(role || ""),
      new Date().toISOString(),
      count,
    );
    return { id: jobId, total: count };
  }

  // Insert one chunk of resumes. Kept small so each RPC stays well under the
  // message-size limit (the Worker sends the whole batch as several chunks).
  async addItems({ offset, items }) {
    const sql = this.ctx.storage.sql;
    const list = Array.isArray(items) ? items : [];
    const base = Number(offset) || 0;
    for (let k = 0; k < list.length; k++) {
      const it = list[k] || {};
      sql.exec(
        "INSERT OR REPLACE INTO items (i, name, resume, status) " +
          "VALUES (?, ?, ?, 'queued')",
        base + k,
        String(it.name ?? "").slice(0, 200),
        String(it.resume ?? "").slice(0, MAX_RESUME),
      );
    }
    return { queuedThrough: base + list.length };
  }

  // Kick off processing once every chunk is stored.
  async go() {
    this.ctx.storage.sql.exec(
      "UPDATE job SET status = 'running' WHERE id = 1 AND status = 'queued'",
    );
    await this.ctx.storage.setAlarm(Date.now() + 50);
    return { ok: true };
  }

  async cancel(userId) {
    const sql = this.ctx.storage.sql;
    assertOwner(sql, userId);
    sql.exec("UPDATE job SET status = 'canceled' WHERE id = 1");
    sql.exec(
      "UPDATE items SET status = 'canceled' WHERE status IN ('queued', 'running')",
    );
    await this.ctx.storage.deleteAlarm();
    return { status: "canceled" };
  }

  // Compact progress for polling: names, statuses, scores, one strength/gap.
  async progress(userId) {
    const sql = this.ctx.storage.sql;
    assertOwner(sql, userId);
    const job = sql.exec("SELECT * FROM job WHERE id = 1").toArray()[0];
    if (!job) return { status: "missing", items: [] };
    const rows = sql
      .exec(
        "SELECT i, name, status, score, verdict, strengths, gaps, error " +
          "FROM items ORDER BY i",
      )
      .toArray();
    const items = rows.map((r) => ({
      i: r.i,
      name: r.name,
      status: r.status,
      score: r.score,
      verdict: r.verdict,
      strength: toArray(r.strengths)[0] || "",
      gap: toArray(r.gaps)[0] || "",
      error: r.error || "",
    }));
    return {
      status: job.status,
      role: job.role,
      total: job.total,
      done: items.filter((x) => x.status === "done").length,
      failed: items.filter((x) => x.status === "error").length,
      items,
    };
  }

  // Full results (with resume text) for candidates not yet copied into the
  // user's account. The client inserts these, then calls markRecorded.
  async pending(userId) {
    const sql = this.ctx.storage.sql;
    assertOwner(sql, userId);
    const rows = sql
      .exec(
        "SELECT i, name, resume, score, verdict, summary, dimensions, " +
          "strengths, gaps, source FROM items " +
          "WHERE status = 'done' AND recorded = 0 ORDER BY i",
      )
      .toArray();
    return {
      items: rows.map((r) => ({
        i: r.i,
        name: r.name,
        resume: r.resume,
        score: r.score,
        verdict: r.verdict,
        summary: r.summary,
        dimensions: toArray(r.dimensions),
        strengths: toArray(r.strengths),
        gaps: toArray(r.gaps),
        source: r.source,
      })),
    };
  }

  async markRecorded(userId, indexes) {
    const sql = this.ctx.storage.sql;
    assertOwner(sql, userId);
    const list = Array.isArray(indexes) ? indexes : [];
    for (const value of list) {
      const n = Number(value);
      if (Number.isInteger(n)) {
        sql.exec("UPDATE items SET recorded = 1 WHERE i = ?", n);
      }
    }
    return { ok: true };
  }

  // --- processing ---

  async alarm() {
    const sql = this.ctx.storage.sql;
    const job = sql.exec("SELECT status, role FROM job WHERE id = 1").toArray()[0];
    if (!job || job.status !== "running") return;

    // An item still "running" is from a tick that was interrupted; retry it.
    sql.exec("UPDATE items SET status = 'queued' WHERE status = 'running'");

    const batch = sql
      .exec(
        "SELECT i, name, resume FROM items WHERE status = 'queued' " +
          "ORDER BY i LIMIT ?",
        TICK,
      )
      .toArray();
    if (!batch.length) {
      sql.exec("UPDATE job SET status = 'done' WHERE id = 1");
      return;
    }

    await mapLimit(batch, TICK_CONCURRENCY, async (row) => {
      const live = sql.exec("SELECT status FROM job WHERE id = 1").toArray()[0];
      if (!live || live.status !== "running") {
        sql.exec("UPDATE items SET status = 'canceled' WHERE i = ?", row.i);
        return;
      }
      const text = String(row.resume || "").trim();
      if (text.length < 40) {
        sql.exec(
          "UPDATE items SET status = 'error', error = ? WHERE i = ?",
          "Couldn't read text from that file.",
          row.i,
        );
        return;
      }
      let result;
      let source = "ai";
      try {
        result = await scoreWithRetry(this.env.DEEPSEEK_API_KEY, job.role, text);
      } catch {
        // Retries exhausted: keep a usable keyword estimate rather than lose it.
        result = localScore(job.role, text);
        source = "local";
      }
      sql.exec(
        "UPDATE items SET status = 'done', score = ?, verdict = ?, summary = ?, " +
          "dimensions = ?, strengths = ?, gaps = ?, source = ?, error = NULL " +
          "WHERE i = ?",
        Number(result.score) || 0,
        String(result.verdict ?? "").slice(0, 40),
        String(result.summary ?? "").slice(0, 600),
        JSON.stringify(result.dimensions ?? []),
        JSON.stringify(result.strengths ?? []),
        JSON.stringify(result.gaps ?? []),
        source,
        row.i,
      );
    });

    const after = sql.exec("SELECT status FROM job WHERE id = 1").toArray()[0];
    if (!after || after.status !== "running") return;
    const remaining = sql
      .exec("SELECT COUNT(*) AS n FROM items WHERE status = 'queued'")
      .toArray()[0].n;
    if (remaining > 0) await this.ctx.storage.setAlarm(Date.now() + NEXT_TICK_MS);
    else sql.exec("UPDATE job SET status = 'done' WHERE id = 1");
  }
}
