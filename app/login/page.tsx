"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, getSessionSafe } from "../../lib/supabase";
import { useLanguage } from "@/app/LanguageContext";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, setLang, t } = useLanguage();

  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [isRegistered, setIsRegistered] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const redirectPath = useMemo(() => {
    const rawRedirect = searchParams.get("redirect");

    if (!rawRedirect) return "/";

    try {
      const decoded = decodeURIComponent(rawRedirect);

      if (!decoded.startsWith("/")) return "/";
      if (decoded.startsWith("//")) return "/";

      return decoded;
    } catch {
      return "/";
    }
  }, [searchParams]);

  const backLabel = useMemo(() => {
    if (redirectPath.startsWith("/explore")) return t("login.back.explore");
    if (redirectPath.startsWith("/my-trips")) return t("login.back.myTrips");
    if (redirectPath.startsWith("/routedetail")) return t("login.back.route");
    if (redirectPath.startsWith("/about")) return t("login.back.about");
    if (redirectPath === "/") return t("login.back.home");

    return t("login.back.default");
  }, [redirectPath, t]);

  // Проверка существующей сессии + защита от редирект-цикла с /admin
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));

    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });

    // GEÄNDERT: getSessionSafe() — bei ungültigem Token liefert das
    // zuverlässig "keine Session", statt die Login-Seite hängen zu lassen.
    getSessionSafe().then(({ session }) => {
      const email = session?.user?.email?.toLowerCase();
      const isAdmin = !!email && ADMIN_EMAILS.includes(email);

      // Если редирект ведёт в /admin, а пользователь не админ — не отправляем его
      // туда автоматически, иначе получится бесконечный цикл /admin <-> /login
      if (redirectPath === "/admin" && !isAdmin) return;

      if (session?.user && searchParams.get("redirect")) {
        router.replace(redirectPath);
      }
    });

    return () => window.removeEventListener("scroll", onScroll);
  }, [redirectPath, router, searchParams]);

  // Google-Login über den normalen Supabase-OAuth-Redirect-Flow.
  // Kein zusätzliches Google-Skript, kein Popup, kein iframe-Proxy-Klick -
  // dadurch unabhängig von Popup-Blockern, Tracking-Schutz oder Erweiterungen.
  // Der App-Name/Support-E-Mail im Google-Fenster kommen weiterhin aus dem
  // OAuth-Zustimmungsbildschirm in der Google Cloud Console.
  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${redirectPath}`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // Bei Erfolg leitet der Browser sofort zu Google weiter, daher wird
    // setGoogleLoading(false) hier bewusst nicht mehr aufgerufen.
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || loading) return;

    if (mode === "reset") {
      handleResetPassword();
    } else if (mode === "login") {
      handleLogin();
    } else {
      handleRegister();
    }
  }

    function resetFields() {
    setEmail("");
    setPassword("");
    setName("");
    setError("");
    setSuccess("");
    setIsRegistered(false);
    setIsResetSent(false);
  }

  function switchMode(m: "login" | "register" | "reset") {
    resetFields();
    setMode(m);
  }

  async function handleLogin() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(t("login.success.welcomeBack"));
      setTimeout(() => router.push(redirectPath), 900);
    }

    setLoading(false);
  }

  async function handleRegister() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

        if (error) {
      setError(error.message);
    } else if (data.user?.identities?.length === 0) {
      setError(t("login.error.emailInUse"));
    } else {
      setIsRegistered(true);
    }

    setLoading(false);
  }

  async function handleResetPassword() {
    if (!email) {
      setError(t("login.error.enterEmailFirst"));
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : "",
    });

        if (error) {
      setError(error.message);
    } else {
      setIsResetSent(true);
    }

    setLoading(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');
        :root {
          --bg:    #0c0b09;
          --bg2:   #111009;
          --bg3:   #181510;
          --gold:  #C9A86A;
          --cream: #EDE5D4;
          --muted: rgba(237,229,212,0.56);
          --dim:   rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.10);
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans:  'Inter', system-ui, sans-serif;
        }

        .lp *, .lp *::before, .lp *::after { box-sizing:border-box; margin:0; padding:0; }
        .lp a { color:inherit; text-decoration:none; }
        .lp button { border:none; font:inherit; cursor:pointer; background:none; }
        .lp input { font:inherit; }
        .lp { min-height:100vh; background:var(--bg); color:var(--cream); font-family:var(--sans); overflow-x:hidden; }

        /* NAV */
        .lp-nav { position:fixed; inset:0 0 auto; z-index:200; height:72px; padding:0 clamp(20px,4vw,60px); display:flex; align-items:center; justify-content:space-between; background:transparent; border-bottom:1px solid transparent; transition:background .35s,border-color .35s; }
        .lp-nav.scrolled { background:rgba(12,11,9,0.92); -webkit-backdrop-filter:blur(20px); backdrop-filter:blur(20px); border-bottom-color:var(--border); }
        .lp-nav-logo { display:flex; flex-direction:column; line-height:1; }
        .lp-nav-logo span { font-size:11px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .lp-nav-links { display:flex; gap:36px; }
        .lp-nav-right { display:flex; align-items:center; width:107px; justify-content:flex-end; }
        .lp-nav-link { position:relative; font-size:13px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .lp-nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .lp-nav-link:hover { color:var(--cream); }
        .lp-nav-link:hover::after { width:100%; }
        @media (max-width:680px) { .lp-nav-links { display:none; } .lp-nav-right { display:none; } }

        /* HERO BG */
        .lp-hero-bg { position:fixed; inset:0; z-index:0; transform:translateZ(0); }
        .lp-hero-bg img { width:100%; height:100%; object-fit:cover; object-position:center 40%; filter:brightness(0.34) contrast(1.1) saturate(0.75); }
        .lp-hero-bg::after { content:""; position:absolute; inset:0; background:linear-gradient(135deg, rgba(12,11,9,0.82) 0%, rgba(12,11,9,0.55) 50%, rgba(12,11,9,0.78) 100%); }

        /* MAIN LAYOUT */
        .lp-main { position:relative; z-index:10; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:100px clamp(20px,5vw,60px) 60px; gap:clamp(40px,6vw,100px); }

        /* LEFT COPY */
        .lp-copy { flex:1; max-width:480px; opacity:0; transform:translateY(22px); transition:opacity .9s .1s, transform .9s .1s; will-change:opacity, transform; }
        .lp-copy.visible { opacity:1; transform:translateY(0); }
        .lp-eyebrow { font-size:9px; font-weight:800; letter-spacing:0.36em; text-transform:uppercase; color:var(--gold); margin-bottom:20px; }
        .lp-h1 { font-family:var(--serif); font-size:clamp(48px,6vw,82px); font-weight:300; line-height:0.9; letter-spacing:-0.04em; color:var(--cream); margin-bottom:20px; }
        .lp-sub { font-size:14px; font-weight:300; color:var(--muted); line-height:1.8; max-width:360px; margin-bottom:40px; }
        .lp-features { display:flex; flex-direction:column; gap:20px; }
        .lp-feat { display:flex; align-items:flex-start; gap:16px; }
        .lp-feat-icon { width:36px; height:36px; border-radius:50%; border:1px solid rgba(201,168,106,0.35); display:grid; place-items:center; flex-shrink:0; color:var(--gold); font-size:14px; }
        .lp-feat-text h4 { font-size:12px; font-weight:700; letter-spacing:0.08em; color:var(--cream); margin-bottom:3px; text-transform:uppercase; }
        .lp-feat-text p { font-size:12px; color:var(--dim); line-height:1.6; font-weight:300; }

        /* CARD */
        .lp-card { flex-shrink:0; width:100%; max-width:440px; opacity:0; transform:translateY(26px); transition:opacity .9s .25s, transform .9s .25s; will-change:opacity, transform; }
        .lp-card.visible { opacity:1; transform:translateY(0); }
        .lp-card-inner { background:rgba(14,12,10,0.85); -webkit-backdrop-filter:blur(28px); backdrop-filter:blur(28px); border:1px solid rgba(237,229,212,0.10); border-radius:24px; padding:clamp(32px,5vw,48px); box-shadow:0 40px 100px rgba(0,0,0,0.55); }

        /* TABS */
        .lp-tabs { display:flex; gap:0; margin-bottom:32px; border-bottom:1px solid var(--border); }
        .lp-tab { flex:1; padding:12px 0; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--dim); background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; transition:all .25s; margin-bottom:-1px; }
        .lp-tab.active { color:var(--gold); border-bottom-color:var(--gold); }
        .lp-tab:hover:not(.active) { color:var(--muted); }

        /* FORM TITLE */
        .lp-form-title { font-family:var(--serif); font-size:clamp(26px,3vw,34px); font-weight:300; letter-spacing:-0.03em; color:var(--cream); margin-bottom:6px; }
        .lp-form-sub { font-size:12px; color:var(--dim); font-weight:300; margin-bottom:24px; }

        /* GOOGLE BUTTON */
        .lp-google-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:10px; padding:14px 16px; background:rgba(237,229,212,0.04); border:1px solid rgba(237,229,212,0.12); border-radius:12px; color:var(--cream); font-size:13px; font-weight:500; cursor:pointer; transition:all .25s; margin-bottom:20px; }
        .lp-google-btn:hover { border-color:rgba(201,168,106,0.5); background:rgba(237,229,212,0.07); }
        .lp-google-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .lp-google-btn:disabled:hover { border-color:rgba(237,229,212,0.12); background:rgba(237,229,212,0.04); }
        .lp-google-btn svg { flex-shrink:0; }

        /* DIVIDER */
        .lp-divider { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
        .lp-divider::before, .lp-divider::after { content:""; flex:1; height:1px; background:var(--border); }
        .lp-divider span { font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:var(--dim); white-space:nowrap; }

        /* INPUT */
        .lp-input { width:100%; padding:14px 16px; background:rgba(237,229,212,0.04); border:1px solid rgba(237,229,212,0.12); border-radius:12px; color:var(--cream); font-size:13px; outline:none; transition:all .25s; margin-bottom:12px; }
        .lp-input::placeholder { color:rgba(237,229,212,0.28); }
        .lp-input:focus { border-color:rgba(201,168,106,0.5); background:rgba(237,229,212,0.07); box-shadow:0 0 0 3px rgba(201,168,106,0.1); }

        /* FORGOT */
        .lp-forgot { font-size:11px; color:var(--dim); font-weight:400; letter-spacing:0.04em; transition:color .2s; display:block; text-align:right; margin-top:-4px; margin-bottom:20px; background:none; border:none; cursor:pointer; width:100%; }
        .lp-forgot:hover { color:var(--gold); }

        /* MSG */
        .lp-error { font-size:12px; color:#e08080; margin-bottom:12px; line-height:1.5; }
        .lp-success { font-size:12px; color:#86c9a0; margin-bottom:12px; line-height:1.5; }

        /* SUBMIT BTN */
        .lp-submit { width:100%; padding:15px 24px; background:transparent; border:1px solid var(--gold); border-radius:999px; color:var(--gold); font-size:9px; font-weight:800; letter-spacing:0.24em; text-transform:uppercase; cursor:pointer; transition:all .25s; margin-top:4px; }
        .lp-submit:hover:not(:disabled) { background:var(--gold); color:var(--bg); }
        .lp-submit:disabled { opacity:0.5; cursor:not-allowed; }

        /* SWITCH LINK */
        .lp-switch { text-align:center; margin-top:20px; font-size:12px; color:var(--dim); }
        .lp-switch button { color:var(--gold); background:none; border:none; cursor:pointer; font-size:12px; font-weight:600; transition:opacity .2s; }
        .lp-switch button:hover { opacity:0.75; }

        /* BACK LINK */
        .lp-back { display:inline-flex; align-items:center; gap:8px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--dim); transition:color .2s; margin-bottom:32px; }
                .lp-back:hover { color:var(--gold); }

        /* LANGUAGE SWITCH */
        .lp-lang-switch { position:fixed; right:clamp(16px,3vw,32px); bottom:clamp(16px,3vw,28px); z-index:300; display:flex; gap:2px; padding:4px; background:rgba(12,11,9,0.78); -webkit-backdrop-filter:blur(16px); backdrop-filter:blur(16px); border:1px solid var(--border); border-radius:999px; }
        .lp-lang-btn { padding:7px 12px; border-radius:999px; font-size:10px; font-weight:800; letter-spacing:0.1em; color:var(--dim); transition:all .2s; }
        .lp-lang-btn:hover { color:var(--cream); }
        .lp-lang-btn.active { background:var(--gold); color:var(--bg); }
        @media (max-width:480px) { .lp-lang-switch { right:12px; bottom:12px; } .lp-lang-btn { padding:6px 10px; font-size:9px; } }

        .registration-success-slide {
          animation: slideIn .5s cubic-bezier(0.22, 1, 0.36, 1) both;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 0;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .success-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(201,168,106,0.1);
          display: grid;
          place-items: center;
          margin-bottom: 20px;
        }

        @media (max-width:860px) {
          .lp-main { flex-direction:column; align-items:center; padding-top:100px; }
          .lp-copy { max-width:440px; text-align:center; align-items:center; }
          .lp-feat { text-align:left; }
          .lp-sub { max-width:none; }
          .lp-features { display:none; }
        }
      `}</style>

      <div className="lp">
        {/* BACKGROUND */}
        <div className="lp-hero-bg">
          <img
            src="/North Coast 500.jpg"
            alt="Scenic road"
            onError={(e) => {
              e.currentTarget.src = "/Pacific Route Highway.jpg";
            }}
          />
        </div>

        {/* NAV */}
        <nav className={`lp-nav ${navScrolled ? "scrolled" : ""}`}>
          <Link href="/" className="lp-nav-logo">
            <span>EXPLORE</span>
            <span>SCENIC</span>
            <span>ROUTES</span>
          </Link>

          <div className="lp-nav-links">
            <Link href="/explore" className="lp-nav-link">
              {t("nav.explore")}
            </Link>
            <Link href="/about" className="lp-nav-link">
              {t("nav.about")}
            </Link>
          </div>

          <div className="lp-nav-right" />
        </nav>

        {/* MAIN */}
        <main className="lp-main">
          {/* LEFT COPY */}
          <div className={`lp-copy ${visible ? "visible" : ""}`}>
            <Link href={redirectPath} className="lp-back">
              {backLabel}
            </Link>

            <p className="lp-eyebrow">{t("login.eyebrow")}</p>

            <h1 className="lp-h1">
              {t("login.h1.line1")}
              <br />
              {t("login.h1.line2")}
            </h1>

            <p className="lp-sub">
              {t("login.sub")}
            </p>

            <div className="lp-features">
              <div className="lp-feat">
                <div className="lp-feat-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 3.5C6 2.67157 6.67157 2 7.5 2H16.5C17.3284 2 18 2.67157 18 3.5V21L12 17L6 21V3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="lp-feat-text">
                  <h4>{t("login.feat1.title")}</h4>
                  <p>{t("login.feat1.text")}</p>
                </div>
              </div>

              <div className="lp-feat">
                <div className="lp-feat-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="5" cy="6" r="2" stroke="currentColor" strokeWidth="1.4"/>
                    <circle cx="19" cy="18" r="2" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M5 8C5 8 5 13 9 13H15C19 13 19 16 19 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="lp-feat-text">
                  <h4>{t("login.feat2.title")}</h4>
                  <p>{t("login.feat2.text")}</p>
                </div>
              </div>

              <div className="lp-feat">
                <div className="lp-feat-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 9L8 3H16L20 9L12 21L4 9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M4 9H20M9.5 3L8 9L12 21M14.5 3L16 9L12 21" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="lp-feat-text">
                  <h4>{t("login.feat3.title")}</h4>
                  <p>{t("login.feat3.text")}</p>
                </div>
              </div>
            </div>
          </div>

                    {/* CARD */}
                    <div className={`lp-card ${visible ? "visible" : ""}`}>
            <div className="lp-card-inner">
              {isRegistered || isResetSent ? (
                <div className="registration-success-slide">
                  <div className="success-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <p className="lp-form-title" style={{ textAlign: 'center' }}>
                    {isResetSent ? t("login.confirm.checkEmailTitle") : t("login.confirm.confirmEmailTitle")}
                  </p>
                  <p className="lp-form-sub" style={{ textAlign: 'center', fontSize: '13px', lineHeight: '1.6', marginTop: '10px' }}>
                    {isResetSent 
                      ? t("login.confirm.resetSentText") 
                      : t("login.confirm.confirmSentText")} 
                    <br/>
                    <strong style={{ color: 'var(--cream)' }}>{email}</strong>. <br/>
                    {t("login.confirm.checkInbox")}
                  </p>
                  <button
                    className="lp-submit"
                    style={{ marginTop: '30px' }}
                    onClick={() => {
                      setIsRegistered(false);
                      setIsResetSent(false);
                      setMode("login");
                    }}
                  >
                    {t("login.confirm.backToSignIn")}
                  </button>
                </div>
              ) : (
                <>
                  {mode !== "reset" && (
                    <div className="lp-tabs">
                      <button
                        className={`lp-tab ${mode === "login" ? "active" : ""}`}
                        onClick={() => switchMode("login")}
                      >
                        {t("login.tab.signIn")}
                      </button>

                      <button
                        className={`lp-tab ${
                          mode === "register" ? "active" : ""
                        }`}
                        onClick={() => switchMode("register")}
                      >
                        {t("login.tab.createAccount")}
                      </button>
                    </div>
                  )}

                  {mode === "reset" && (
                    <>
                      <p className="lp-form-title">{t("login.form.resetTitle")}</p>
                      <p className="lp-form-sub">
                        {t("login.form.resetSub")}
                      </p>

                      <input
                        className="lp-input"
                        type="email"
                        placeholder={t("login.placeholder.email")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />

                      {error && <p className="lp-error">{error}</p>}
                      {success && <p className="lp-success">{success}</p>}

                      <button
                        className="lp-submit"
                        type="button"
                        disabled={loading}
                        onClick={handleResetPassword}
                      >
                        {loading ? t("login.submit.sending") : t("login.submit.sendResetLink")}
                      </button>

                      <div className="lp-switch">
                        <button onClick={() => switchMode("login")}>
                          {t("login.switch.backToSignIn")}
                        </button>
                      </div>
                    </>
                  )}

                  {mode !== "reset" && (
                    <>
                      {mode === "login" ? (
                        <>
                          <p className="lp-form-title">{t("login.form.welcomeTitle")}</p>
                          <p className="lp-form-sub">
                            {t("login.form.welcomeSub")}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="lp-form-title">{t("login.form.joinTitle")}</p>
                          <p className="lp-form-sub">
                            {t("login.form.joinSub")}
                          </p>
                        </>
                      )}

                      <button
                        type="button"
                        className="lp-google-btn"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"/>
                          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"/>
                          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z"/>
                          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
                        </svg>
                        {googleLoading ? t("login.google.loading") : t("login.google.continue")}
                      </button>

                      <div className="lp-divider">
                        <span>{t("login.divider.or")}</span>
                      </div>

                      {mode === "register" && (
                        <input
                          className="lp-input"
                          type="text"
                          placeholder={t("login.placeholder.fullName")}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onKeyDown={handleKeyDown}
                        />
                      )}

                      <input
                        className="lp-input"
                        type="email"
                        placeholder={t("login.placeholder.email")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />

                      <input
                        className="lp-input"
                        type="password"
                        placeholder={t("login.placeholder.password")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />

                      {mode === "login" && (
                        <button
                          className="lp-forgot"
                          type="button"
                          onClick={() => switchMode("reset")}
                        >
                          {t("login.forgotPassword")}
                        </button>
                      )}

                      {error && <p className="lp-error">{error}</p>}
                      {success && <p className="lp-success">{success}</p>}

                      <button
                        className="lp-submit"
                        type="button"
                        disabled={loading}
                        onClick={mode === "login" ? handleLogin : handleRegister}
                      >
                        {loading
                          ? t("login.submit.loading")
                          : mode === "login"
                          ? t("login.submit.signIn")
                          : t("login.submit.createAccount")}
                      </button>

                      <div className="lp-switch">
                        {mode === "login" ? (
                          <>
                            {t("login.switch.noAccount")}{" "}
                            <button onClick={() => switchMode("register")}>
                              {t("login.switch.signUp")}
                            </button>
                          </>
                        ) : (
                          <>
                            {t("login.switch.haveAccount")}{" "}
                            <button onClick={() => switchMode("login")}>
                              {t("login.switch.signIn")}
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        {/* LANGUAGE SWITCH */}
        <div className="lp-lang-switch">
          <button
            type="button"
            className={`lp-lang-btn ${lang === "en" ? "active" : ""}`}
            onClick={() => setLang("en")}
          >
            EN
          </button>
          <button
            type="button"
            className={`lp-lang-btn ${lang === "de" ? "active" : ""}`}
            onClick={() => setLang("de")}
          >
            DE
          </button>
          <button
            type="button"
            className={`lp-lang-btn ${lang === "ru" ? "active" : ""}`}
            onClick={() => setLang("ru")}
          >
            RU
          </button>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}