// start.mjs — run the write-back server AND the file watcher together, so
// realtime bidirectional autosave is on: edit the dashboard in the browser
// (autosaves on edit) or save TASKS.md / tasks.json / dashboard.html on disk,
// and the other copies update automatically.
//
//   cd "<project root>"      (folder containing TASKS.md and dashboard/)
//   node dashboard/start.mjs
//   open http://localhost:8000/dashboard/dashboard.html
//
// Stop with Ctrl+C (stops both). Override the port with PORT, e.g. `set PORT=8080`.
//
// Prefer running the pieces separately? `node dashboard/server.mjs` (web + write-
// back) and `node dashboard/watch.mjs` (autosync) still work on their own.

import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL(".", import.meta.url));

const children = ["server.mjs", "watch.mjs"].map((file) =>
  spawn(process.execPath, [join(DIR, file)], { stdio: "inherit" }),
);

let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    try {
      c.kill();
    } catch {
      /* already gone */
    }
  }
  process.exit(code);
};

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

// If either process dies, stop the other so we never leave a half-running setup.
for (const c of children) {
  c.on("exit", (code, signal) => {
    if (stopping) return;
    console.error(
      `\n[dashboard] a child process exited (${signal || code}) — stopping.`,
    );
    stop(code ?? 0);
  });
}
