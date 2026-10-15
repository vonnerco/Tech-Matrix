// Deployed Cloudflare Worker URL that rewrites bullets with AI.
// Leave empty to use the built-in local keyword rewrite (no network).
// Set this to your worker URL after `wrangler deploy`, e.g.
// window.WORKER_URL = "https://resume-tailor-api.<account>.workers.dev";
window.WORKER_URL = "https://resume-tailor-api.corderio-vonner.workers.dev";

// Supabase: invite-only login + per-user records (RLS).
// From Supabase → Project Settings → API. The anon key is safe to ship in a
// public site — RLS, not secrecy, protects the data.
//
// Leave BOTH blank to run in legacy mode: no login gate, and the records page
// falls back to the Worker's token-protected store.
window.SUPABASE_URL = "https://asnoxduvpngwvxwxslqj.supabase.co";
window.SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbm94ZHV2cG5nd3Z4d3hzbHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMDc4MzIsImV4cCI6MjEwNzU4MzgzMn0.IP2z-lzqE_nbO6l_sV_xm4K7RqHF-3oX8xM-6JYJmJA";
