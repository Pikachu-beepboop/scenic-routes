"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function resetFields() {
    setEmail(""); setPassword(""); setName(""); setError(""); setSuccess("");
  }

  function switchMode(m: "login" | "register" | "reset") {
    resetFields();
    setMode(m);
  }

  async function handleLogin() {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else { setSuccess("Welcome back!"); setTimeout(() => router.push("/"), 900); }
    setLoading(false);
  }

  async function handleRegister() {
    setLoading(true); setError("");
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    });
    if (error) setError(error.message);
    else if (data.user?.identities?.length === 0) setError("This email is already in use. Please sign in instead.");
    else setSuccess("Check your email to confirm registration!");
    setLoading(false);
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin : "" }
    });
  }

  async function handleResetPassword() {
    if (!email) { setError("Please enter your email address first."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : ""
    });
    if (error) setError(error.message);
    else setSuccess("Password reset link sent to your email!");
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
        .lp-nav.scrolled { background:rgba(12,11,9,0.92); backdrop-filter:blur(20px); border-bottom-color:var(--border); }
        .lp-nav-logo { display:flex; flex-direction:column; line-height:1; }
        .lp-nav-logo span { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .lp-nav-links { display:flex; gap:36px; }
        .lp-nav-right { display:flex; align-items:center; width:107px; justify-content:flex-end; }
        .lp-nav-link { position:relative; font-size:11px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .lp-nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .lp-nav-link:hover { color:var(--cream); }
        .lp-nav-link:hover::after { width:100%; }
        @media (max-width:680px) { .lp-nav-links { display:none; } .lp-nav-right { display:none; } }

        /* HERO BG */
        .lp-hero-bg { position:fixed; inset:0; z-index:0; }
        .lp-hero-bg img { width:100%; height:100%; object-fit:cover; object-position:center 40%; filter:brightness(0.34) contrast(1.1) saturate(0.75); }
        .lp-hero-bg::after { content:""; position:absolute; inset:0; background:linear-gradient(135deg, rgba(12,11,9,0.82) 0%, rgba(12,11,9,0.55) 50%, rgba(12,11,9,0.78) 100%); }

        /* MAIN LAYOUT */
        .lp-main { position:relative; z-index:10; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:100px clamp(20px,5vw,60px) 60px; gap:clamp(40px,6vw,100px); }

        /* LEFT COPY */
        .lp-copy { flex:1; max-width:480px; opacity:0; transform:translateY(22px); transition:opacity .9s .1s, transform .9s .1s; }
        .lp-copy.visible { opacity:1; transform:translateY(0); }
        .lp-eyebrow { font-size:9px; font-weight:800; letter-spacing:0.36em; text-transform:uppercase; color:var(--gold); margin-bottom:20px; }
        .lp-h1 { font-family:var(--serif); font-size:clamp(48px,6vw,82px); font-weight:300; line-height:0.9; letter-spacing:-0.04em; color:var(--cream); margin-bottom:20px; }
        .lp-sub { font-size:14px; font-weight:300; color:var(--muted); line-height:1.8; max-width:360px; margin-bottom:40px; }
        .lp-features { display:flex; flex-direction:column; gap:20px; }
        .lp-feat { display:flex; align-items:flex-start; gap:16px; }
        .lp-feat-icon { width:36px; height:36px; border-radius:50%; border:1px solid rgba(201,168,106,0.35); display:grid; place-items:center; flex-shrink:0; color:var(--gold); font-size:14px; }
        .lp-feat-text h4 { font-size:12px; font-weight:700; letter-spacing:0.08em; color:var(--cream); margin-bottom:3px; text-transform:uppercase; }
        .lp-feat-text p  { font-size:12px; color:var(--dim); line-height:1.6; font-weight:300; }

        /* CARD */
        .lp-card { flex-shrink:0; width:100%; max-width:440px; opacity:0; transform:translateY(26px); transition:opacity .9s .25s, transform .9s .25s; }
        .lp-card.visible { opacity:1; transform:translateY(0); }
        .lp-card-inner { background:rgba(14,12,10,0.85); backdrop-filter:blur(28px); border:1px solid rgba(237,229,212,0.10); border-radius:24px; padding:clamp(32px,5vw,48px); box-shadow:0 40px 100px rgba(0,0,0,0.55); }

        /* TABS */
        .lp-tabs { display:flex; gap:0; margin-bottom:32px; border-bottom:1px solid var(--border); }
        .lp-tab { flex:1; padding:12px 0; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--dim); background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; transition:all .25s; margin-bottom:-1px; }
        .lp-tab.active { color:var(--gold); border-bottom-color:var(--gold); }
        .lp-tab:hover:not(.active) { color:var(--muted); }

        /* FORM TITLE */
        .lp-form-title { font-family:var(--serif); font-size:clamp(26px,3vw,34px); font-weight:300; letter-spacing:-0.03em; color:var(--cream); margin-bottom:6px; }
        .lp-form-sub   { font-size:12px; color:var(--dim); font-weight:300; margin-bottom:24px; }

        /* GOOGLE BTN */
        .lp-google-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:10px; padding:13px 20px; border:1px solid rgba(237,229,212,0.16); border-radius:12px; background:rgba(237,229,212,0.04); color:var(--muted); font-size:12px; font-weight:600; letter-spacing:0.06em; transition:all .25s; margin-bottom:20px; }
        .lp-google-btn:hover { border-color:rgba(237,229,212,0.32); background:rgba(237,229,212,0.08); color:var(--cream); }
        .lp-google-icon { width:18px; height:18px; flex-shrink:0; }

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
        .lp-error   { font-size:12px; color:#e08080; margin-bottom:12px; line-height:1.5; }
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

        @media (max-width:860px) {
          .lp-main { flex-direction:column; align-items:center; padding-top:100px; }
          .lp-copy { max-width:440px; text-align:center; align-items:center; }
          .lp-feat { text-align:left; }
          .lp-sub  { max-width:none; }
          .lp-features { display:none; }
        }
      `}</style>

      <div className="lp">
        {/* BACKGROUND */}
        <div className="lp-hero-bg">
          <img src="/North Coast 500.jpg" alt="Scenic road" onError={e => { (e.currentTarget as HTMLImageElement).src = "/Pacific Route Highway.jpg"; }} />
        </div>

        {/* NAV */}
        <nav className={`lp-nav ${navScrolled ? "scrolled" : ""}`}>
          <Link href="/" className="lp-nav-logo">
            <span>SCENIC</span><span>ROUTES</span>
          </Link>
          <div className="lp-nav-links">
            <Link href="/explore" className="lp-nav-link">Explore Routes</Link>
            <Link href="/about"   className="lp-nav-link">About</Link>
          </div>
          <div className="lp-nav-right" />
        </nav>

        {/* MAIN */}
        <main className="lp-main">

          {/* LEFT COPY */}
          <div className={`lp-copy ${visible ? "visible" : ""}`}>
            <Link href="/" className="lp-back">← Back to home</Link>
            <p className="lp-eyebrow">Member Access</p>
            <h1 className="lp-h1">Roads worth<br/>remembering.</h1>
            <p className="lp-sub">Sign in to save your favourite routes, build custom journeys, and unlock hidden destinations around the world.</p>
            <div className="lp-features">
              <div className="lp-feat">
                <div className="lp-feat-icon">◎</div>
                <div className="lp-feat-text"><h4>Save your routes</h4><p>Bookmark any route and access it anytime, anywhere.</p></div>
              </div>
              <div className="lp-feat">
                <div className="lp-feat-icon">△</div>
                <div className="lp-feat-text"><h4>Build custom trips</h4><p>Plan and personalise multi-day road trips with ease.</p></div>
              </div>
              <div className="lp-feat">
                <div className="lp-feat-icon">⬡</div>
                <div className="lp-feat-text"><h4>Discover hidden gems</h4><p>Exclusive spots and insider tips for members only.</p></div>
              </div>
            </div>
          </div>

          {/* CARD */}
          <div className={`lp-card ${visible ? "visible" : ""}`}>
            <div className="lp-card-inner">

              {/* TABS — скрыты на экране сброса */}
              {mode !== "reset" && (
                <div className="lp-tabs">
                  <button className={`lp-tab ${mode === "login" ? "active" : ""}`} onClick={() => switchMode("login")}>Sign In</button>
                  <button className={`lp-tab ${mode === "register" ? "active" : ""}`} onClick={() => switchMode("register")}>Create Account</button>
                </div>
              )}

              {/* RESET PASSWORD SCREEN */}
              {mode === "reset" && (
                <>
                  <p className="lp-form-title">Reset password.</p>
                  <p className="lp-form-sub">Enter your email and we'll send you a reset link.</p>
                  <input className="lp-input" type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
                  {error   && <p className="lp-error">{error}</p>}
                  {success && <p className="lp-success">{success}</p>}
                  <button className="lp-submit" type="button" disabled={loading} onClick={handleResetPassword}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                  <div className="lp-switch">
                    <button onClick={() => switchMode("login")}>← Back to Sign In</button>
                  </div>
                </>
              )}

              {/* LOGIN / REGISTER */}
              {mode !== "reset" && (
                <>
                  {/* FORM HEADING */}
                  {mode === "login" ? (
                    <>
                      <p className="lp-form-title">Welcome back.</p>
                      <p className="lp-form-sub">Sign in to continue your journey.</p>
                    </>
                  ) : (
                    <>
                      <p className="lp-form-title">Join the road.</p>
                      <p className="lp-form-sub">Create your free account today.</p>
                    </>
                  )}

                  {/* GOOGLE */}
                  <button className="lp-google-btn" onClick={handleGoogleLogin}>
                    <svg className="lp-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>

                  {/* DIVIDER */}
                  <div className="lp-divider"><span>or</span></div>

                  {/* FIELDS */}
                  {mode === "register" && (
                    <input className="lp-input" type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
                  )}
                  <input className="lp-input" type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
                  <input className="lp-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />

                  {mode === "login" && (
                    <button className="lp-forgot" type="button" onClick={() => switchMode("reset")}>Forgot your password?</button>
                  )}

                  {error   && <p className="lp-error">{error}</p>}
                  {success && <p className="lp-success">{success}</p>}

                  <button
                    className="lp-submit"
                    type="button"
                    disabled={loading}
                    onClick={mode === "login" ? handleLogin : handleRegister}
                  >
                    {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
                  </button>

                  <div className="lp-switch">
                    {mode === "login" ? (
                      <>Don&apos;t have an account?{" "}<button onClick={() => switchMode("register")}>Sign Up</button></>
                    ) : (
                      <>Already have an account?{" "}<button onClick={() => switchMode("login")}>Sign In</button></>
                    )}
                  </div>
                </>
              )}

            </div>
          </div>

        </main>
      </div>
    </>
  );
}