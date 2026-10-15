// Sign-in page for the invite-only Resume-Tailor app.
//
// - Returning users sign in with email + password.
// - Invited users arrive via an email link (#...type=invite) and are asked to
//   set a password; the same panel handles password-recovery links.
// - New sign-ups are disabled in Supabase, so there is no registration form.
(function () {
  "use strict";

  var url = (window.SUPABASE_URL || "").trim();
  var anon = (window.SUPABASE_ANON_KEY || "").trim();

  var signinForm = document.getElementById("signin-form");
  var setpwForm = document.getElementById("setpw-form");
  var statusEl = document.getElementById("status");
  var status2El = document.getElementById("status2");
  var btnSignin = document.getElementById("btn-signin");
  var btnSetpw = document.getElementById("btn-setpw");

  function setStatus(el, msg, err) {
    el.textContent = msg || "";
    el.className = "status" + (err ? " err" : "");
  }

  // Where to land after sign-in when the link didn't say: Candidate Skill Match.
  var DEFAULT_NEXT = "candidate-match.html";

  function safeNext(raw) {
    try {
      var u = new URL(raw || DEFAULT_NEXT, location.href);
      if (u.origin !== location.origin) return DEFAULT_NEXT;
      return u.pathname + u.search + u.hash;
    } catch (e) {
      return DEFAULT_NEXT;
    }
  }

  if (!url || !anon || !window.supabase || !window.supabase.createClient) {
    setStatus(
      statusEl,
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in config.js.",
      true,
    );
    signinForm.querySelectorAll("input,button").forEach(function (el) {
      el.disabled = true;
    });
    return;
  }

  // Capture the auth-link type before the client consumes the URL hash.
  var search = new URLSearchParams(location.search);
  var hashType = new URLSearchParams(
    (location.hash || "").replace(/^#/, ""),
  ).get("type");
  // Arriving via an email link (invite/recovery) or an explicit request
  // (?setpw=1) shows the password form instead of bouncing into the app.
  var setPassword =
    hashType === "invite" ||
    hashType === "recovery" ||
    search.get("type") === "invite" ||
    search.get("type") === "recovery" ||
    search.get("setpw") === "1";
  var next = safeNext(search.get("next"));

  var client = window.supabase.createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  function showSetPassword() {
    signinForm.hidden = true;
    setpwForm.hidden = false;
  }

  function go() {
    location.replace(next);
  }

  // 1) Already signed in (or arrived via an invite/recovery link).
  client.auth.getSession().then(function (res) {
    var session = res && res.data && res.data.session;
    if (!session) return;
    if (session && setPassword) {
      showSetPassword();
    } else if (session) {
      go();
    }
  });

  // Supabase also reports recovery links through this event.
  client.auth.onAuthStateChange(function (event) {
    if (event === "PASSWORD_RECOVERY") showSetPassword();
  });

  // 2) Sign in.
  signinForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("email").value.trim();
    var password = document.getElementById("password").value;
    if (!email || !password) {
      setStatus(statusEl, "Enter your email and password.", true);
      return;
    }
    btnSignin.disabled = true;
    setStatus(statusEl, "Signing in…");
    client.auth
      .signInWithPassword({ email: email, password: password })
      .then(function (res) {
        if (res.error) {
          setStatus(statusEl, res.error.message || "Sign-in failed.", true);
          return;
        }
        go();
      })
      .catch(function () {
        setStatus(statusEl, "Network error. Try again.", true);
      })
      .then(function () {
        btnSignin.disabled = false;
      });
  });

  // 3) Set password (invite / recovery).
  setpwForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = document.getElementById("newpw").value;
    var pw2 = document.getElementById("newpw2").value;
    if (pw.length < 8) {
      setStatus(status2El, "Use at least 8 characters.", true);
      return;
    }
    if (pw !== pw2) {
      setStatus(status2El, "Passwords do not match.", true);
      return;
    }
    btnSetpw.disabled = true;
    setStatus(status2El, "Saving…");
    client.auth
      .updateUser({ password: pw })
      .then(function (res) {
        if (res.error) {
          setStatus(status2El, res.error.message || "Could not save.", true);
          return;
        }
        go();
      })
      .catch(function () {
        setStatus(status2El, "Network error. Try again.", true);
      })
      .then(function () {
        btnSetpw.disabled = false;
      });
  });
})();
