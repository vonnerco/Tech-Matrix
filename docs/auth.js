// Supabase auth gate (invite-only) — load before any page script.
//
// When window.SUPABASE_URL / window.SUPABASE_ANON_KEY are set (see config.js),
// every page that includes this file requires a signed-in user: visitors without
// a session are redirected to login.html and returned to the page afterwards.
//
// When those values are blank (legacy mode), this is a no-op: no login gate, and
// pages fall back to their previous behavior.
(function () {
  "use strict";

  var url = (window.SUPABASE_URL || "").trim();
  var anon = (window.SUPABASE_ANON_KEY || "").trim();
  var enabled =
    !!(url && anon) && !!window.supabase && !!window.supabase.createClient;

  if (!enabled) {
    window.Auth = {
      enabled: false,
      client: null,
      session: null,
      user: null,
      userId: null,
      token: null,
      getSession: function () {
        return Promise.resolve(null);
      },
      signOut: function () {
        return Promise.resolve();
      },
      onChange: function () {},
      apiHeaders: function () {
        return Promise.resolve({});
      },
    };
    return;
  }

  var client = window.supabase.createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  // Where to return after sign-in. The root and the resume builder both start
  // at Candidate Skill Match; any other page returns to itself.
  function landingPath() {
    var p = location.pathname || "/";
    if (/\/$/.test(p) || /\/index\.html$/.test(p))
      return "candidate-match.html";
    return p + location.search + location.hash;
  }

  function loginUrl() {
    return "login.html?next=" + encodeURIComponent(landingPath());
  }

  function renderBar(user) {
    var bar = document.getElementById("authbar");
    if (!bar) {
      var style = document.createElement("style");
      style.textContent =
        ".authbar{--ab-bg:#e9ecf5;--ab-fg:#59607a;--ab-link:#2f4be0;" +
        "--ab-line:#cbd1e2;" +
        "display:flex;gap:1rem;align-items:center;justify-content:flex-end;" +
        "padding:0.4rem clamp(1.25rem,5vw,3rem);background:var(--ab-bg);" +
        "color:var(--ab-fg);border-bottom:1px solid var(--ab-line);" +
        'font:0.8125rem/1.4 "Space Grotesk",system-ui,-apple-system,' +
        '"Segoe UI",sans-serif}' +
        ".authbar a{color:var(--ab-link);text-decoration:none;cursor:pointer}" +
        ".authbar a:hover{text-decoration:underline}" +
        ":root[data-theme=dark] .authbar{--ab-bg:#0a0a0c;--ab-fg:#8e8e96;" +
        "--ab-link:#8a9bff;--ab-line:#1c1c20}" +
        "@media (prefers-color-scheme:dark){:root:not([data-theme=light]) " +
        ".authbar{--ab-bg:#0a0a0c;--ab-fg:#8e8e96;--ab-link:#8a9bff;" +
        "--ab-line:#1c1c20}}";
      document.head.appendChild(style);
      bar = document.createElement("div");
      bar.id = "authbar";
      bar.className = "authbar";
      document.body.insertBefore(bar, document.body.firstChild);
    }
    bar.innerHTML =
      "<span>" +
      escapeHtml((user && user.email) || "signed in") +
      '</span><a id="auth-signout" role="button">Sign out</a>';
    var out = document.getElementById("auth-signout");
    if (out)
      out.addEventListener("click", function () {
        window.Auth.signOut();
      });
  }

  function apply(session) {
    window.Auth.session = session || null;
    window.Auth.user = session && session.user ? session.user : null;
    window.Auth.userId = window.Auth.user ? window.Auth.user.id : null;
    window.Auth.token = session ? session.access_token : null;
  }

  window.Auth = {
    enabled: true,
    client: client,
    session: null,
    user: null,
    userId: null,
    token: null,
    getSession: function () {
      return client.auth.getSession().then(function (res) {
        return res && res.data && res.data.session ? res.data.session : null;
      });
    },
    signOut: function () {
      return client.auth
        .signOut()
        .catch(function () {})
        .then(function () {
          location.replace(loginUrl());
        });
    },
    onChange: function (cb) {
      if (typeof cb === "function")
        client.auth.onAuthStateChange(function (_event, session) {
          cb(session);
        });
    },
    // Extra headers for Worker calls: adds the bearer token when signed in.
    apiHeaders: function () {
      var s = window.Auth.session;
      var p = s ? Promise.resolve(s) : window.Auth.getSession();
      return p.then(function (session) {
        return session
          ? { Authorization: "Bearer " + session.access_token }
          : {};
      });
    },
  };

  // Gate the page. No valid session → go to login.
  window.Auth.getSession().then(
    function (session) {
      if (!session) {
        location.replace(loginUrl());
        return;
      }
      apply(session);
      window.Auth.onChange(function (s) {
        apply(s);
        if (!s) location.replace(loginUrl());
      });
      renderBar(session.user);
      document.dispatchEvent(new Event("auth:ready"));
    },
    function () {
      location.replace(loginUrl());
    },
  );
})();
