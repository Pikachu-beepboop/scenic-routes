"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const router = useRouter();

  const checks = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    number:  /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  async function handleReset() {
    if (!password || !confirmPassword) { setError("Please fill in all fields."); return; }
    if (password !== confirmPassword)  { setError("Passwords do not match."); return; }
    if (!checks.length || !checks.upper || !checks.number || !checks.special) {
      setError("Password does not meet requirements."); return;
    }
    setLoading(true); setError("");
        const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setIsDone(true);
      setTimeout(() => router.push("/"), 2500);
    }
    setLoading(false);
  }

  const EyeIcon = ({ open }: { open: boolean }) => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      {open
        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      }
    </svg>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');
        :root {
          --bg:    #0c0b09;
          --gold:  #C9A86A;
          --cream: #EDE5D4;
          --muted: rgba(237,229,212,0.56);
          --dim:   rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.10);
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans:  'Inter', system-ui, sans-serif;
        }
        .rp *, .rp *::before, .rp *::after { box-sizing:border-box; margin:0; padding:0; }
        .rp a { color:inherit; text-decoration:none; }
        .rp button { border:none; font:inherit; cursor:pointer; background:none; }
        .rp input  { font:inherit; }
        .rp { min-height:100vh; background:var(--bg); color:var(--cream); font-family:var(--sans); }

        /* BG */
        .rp-bg { position:fixed; inset:0; z-index:0; }
        .rp-bg img { width:100%; height:100%; object-fit:cover; object-position:center 40%; filter:brightness(0.34) contrast(1.1) saturate(0.75); }
        .rp-bg::after { content:""; position:absolute; inset:0; background:linear-gradient(135deg, rgba(12,11,9,0.82) 0%, rgba(12,11,9,0.55) 50%, rgba(12,11,9,0.78) 100%); }

        /* NAV */
        .rp-nav { position:fixed; inset:0 0 auto; z-index:200; height:72px; padding:0 clamp(20px,4vw,60px); display:flex; align-items:center; justify-content:space-between; background:transparent; border-bottom:1px solid transparent; }
        .rp-nav-logo { display:flex; flex-direction:column; line-height:1; }
        .rp-nav-logo span { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .rp-nav-links { display:flex; gap:36px; }
        .rp-nav-link { position:relative; font-size:11px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .rp-nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .rp-nav-link:hover { color:var(--cream); }
        .rp-nav-link:hover::after { width:100%; }
        .rp-nav-right { width:107px; display:flex; justify-content:flex-end; }
        @media (max-width:680px) { .rp-nav-links { display:none; } .rp-nav-right { display:none; } }

        /* MAIN */
        .rp-main { position:relative; z-index:10; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:100px clamp(20px,5vw,60px) 60px; gap:clamp(40px,6vw,100px); }

        /* LEFT */
        .rp-copy { flex:1; max-width:480px; }
        .rp-eyebrow { font-size:9px; font-weight:800; letter-spacing:0.36em; text-transform:uppercase; color:var(--gold); margin-bottom:20px; }
        .rp-h1 { font-family:var(--serif); font-size:clamp(48px,6vw,82px); font-weight:300; line-height:0.9; letter-spacing:-0.04em; color:var(--cream); margin-bottom:20px; }
        .rp-sub { font-size:14px; font-weight:300; color:var(--muted); line-height:1.8; max-width:360px; margin-bottom:40px; }
        .rp-feats { display:flex; flex-direction:column; gap:20px; }
        .rp-feat { display:flex; align-items:flex-start; gap:16px; }
        .rp-feat-icon { width:36px; height:36px; border-radius:50%; border:1px solid rgba(201,168,106,0.35); display:grid; place-items:center; flex-shrink:0; color:var(--gold); font-size:14px; }
        .rp-feat-text h4 { font-size:12px; font-weight:700; letter-spacing:0.08em; color:var(--cream); margin-bottom:3px; text-transform:uppercase; }
        .rp-feat-text p  { font-size:12px; color:var(--dim); line-height:1.6; font-weight:300; }

        /* CARD */
        .rp-card { flex-shrink:0; width:100%; max-width:440px; }
        .rp-card-inner { background:rgba(14,12,10,0.85); backdrop-filter:blur(28px); border:1px solid rgba(237,229,212,0.10); border-radius:24px; padding:clamp(32px,5vw,48px); box-shadow:0 40px 100px rgba(0,0,0,0.55); }

        .rp-form-title { font-family:var(--serif); font-size:clamp(26px,3vw,34px); font-weight:300; letter-spacing:-0.03em; color:var(--cream); margin-bottom:6px; }
        .rp-form-sub   { font-size:12px; color:var(--dim); font-weight:300; margin-bottom:24px; }

        /* INPUT */
        .rp-input-wrap { position:relative; margin-bottom:12px; }
        .rp-input { width:100%; padding:14px 44px 14px 16px; background:rgba(237,229,212,0.04); border:1px solid rgba(237,229,212,0.12); border-radius:12px; color:var(--cream); font-size:13px; outline:none; transition:all .25s; }
        .rp-input::placeholder { color:rgba(237,229,212,0.28); }
        .rp-input:focus { border-color:rgba(201,168,106,0.5); background:rgba(237,229,212,0.07); box-shadow:0 0 0 3px rgba(201,168,106,0.1); }
        .rp-eye { position:absolute; right:14px; top:50%; transform:translateY(-50%); color:var(--dim); transition:color .2s; display:flex; }
        .rp-eye:hover { color:var(--muted); }

        /* REQUIREMENTS */
        .rp-reqs { margin-bottom:20px; }
        .rp-reqs-title { font-size:10px; color:var(--dim); letter-spacing:0.12em; text-transform:uppercase; margin-bottom:10px; }
        .rp-req { display:flex; align-items:center; gap:8px; margin-bottom:7px; }
        .rp-req-dot { width:16px; height:16px; border-radius:50%; border:1px solid rgba(237,229,212,0.2); display:grid; place-items:center; flex-shrink:0; transition:all .25s; font-size:9px; font-weight:800; color:transparent; }
        .rp-req-dot.ok { border-color:var(--gold); background:rgba(201,168,106,0.15); color:var(--gold); }
        .rp-req span { font-size:12px; color:var(--dim); transition:color .25s; font-weight:300; }
        .rp-req.ok span { color:var(--muted); }

        /* MSG */
        .rp-error   { font-size:12px; color:#e08080; margin-bottom:12px; line-height:1.5; }
        .rp-success { font-size:12px; color:#86c9a0; margin-bottom:12px; line-height:1.5; }

        /* SUBMIT */
        .rp-submit { width:100%; padding:15px 24px; background:transparent; border:1px solid var(--gold); border-radius:999px; color:var(--gold); font-size:9px; font-weight:800; letter-spacing:0.24em; text-transform:uppercase; cursor:pointer; transition:all .25s; margin-bottom:16px; }
        .rp-submit:hover:not(:disabled) { background:var(--gold); color:var(--bg); }
        .rp-submit:disabled { opacity:0.5; cursor:not-allowed; }

                .rp-back { display:block; text-align:center; font-size:11px; color:var(--dim); letter-spacing:0.1em; text-transform:uppercase; transition:color .2s; }
        .rp-back:hover { color:var(--gold); }

        .success-slide {
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
          margin-bottom: 24px;
        }

        @media (max-width:860px) {
          .rp-main { flex-direction:column; align-items:center; padding-top:100px; }
          .rp-copy { max-width:440px; text-align:center; }
          .rp-feats { display:none; }
          .rp-sub { max-width:none; }
        }
      `}</style>

      <div className="rp">
        {/* BG */}
        <div className="rp-bg">
          <img
            src="/north_coast_500.jpg"
            alt="Scenic road"
            onError={e => { (e.currentTarget as HTMLImageElement).src = "/pacific_route_highway.jpg"; }}
          />
        </div>

        {/* NAV */}
        <nav className="rp-nav">
          <Link href="/" className="rp-nav-logo">
            <span>SCENIC</span><span>ROUTES</span>
          </Link>
          <div className="rp-nav-links">
            <Link href="/explore" className="rp-nav-link">Explore Routes</Link>
            <Link href="/about"   className="rp-nav-link">About</Link>
          </div>
          <div className="rp-nav-right" />
        </nav>

        {/* MAIN */}
        <main className="rp-main">

          {/* LEFT COPY */}
          <div className="rp-copy">
            <p className="rp-eyebrow">Account Security</p>
            <h1 className="rp-h1">New<br/>password</h1>
            <p className="rp-sub">Choose a strong password to keep your account and saved routes secure</p>
            <div className="rp-feats">
              <div className="rp-feat">
                <div className="rp-feat-icon">◎</div>
                <div className="rp-feat-text"><h4>Secure & private</h4><p>Your data is always protected with us</p></div>
              </div>
              <div className="rp-feat">
                <div className="rp-feat-icon">△</div>
                <div className="rp-feat-text"><h4>Back to exploring</h4><p>Once reset, continue discovering routes</p></div>
              </div>
              <div className="rp-feat">
                <div className="rp-feat-icon">⬡</div>
                <div className="rp-feat-text"><h4>One-time link</h4><p>This link expires after use for your safety</p></div>
              </div>
            </div>
          </div>

                    {/* CARD */}
          <div className="rp-card">
            <div className="rp-card-inner">
              {isDone ? (
                <div className="success-slide">
                  <div className="success-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <p className="rp-form-title" style={{ textAlign: 'center' }}>Success!</p>
                  <p className="rp-form-sub" style={{ textAlign: 'center', fontSize: '13px', lineHeight: '1.6', marginTop: '10px' }}>
                    Your password has been updated. <br/>
                    Redirecting you to the home page...
                  </p>
                </div>
              ) : (
                <>
                  <p className="rp-form-title">Create password</p>
                  <p className="rp-form-sub">Enter and confirm your new password below</p>

                  {/* NEW PASSWORD */}
                  <div className="rp-input-wrap">
                    <input
                      className="rp-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="New password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button className="rp-eye" type="button" onClick={() => setShowPassword(p => !p)}>
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>

                  {/* CONFIRM */}
                  <div className="rp-input-wrap" style={{ marginBottom: "20px" }}>
                    <input
                      className="rp-input"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button className="rp-eye" type="button" onClick={() => setShowConfirm(p => !p)}>
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>

                  {/* REQUIREMENTS */}
                  <div className="rp-reqs">
                    <p className="rp-reqs-title">Password must include</p>
                    {[
                      { key: "length",  label: "At least 8 characters" },
                      { key: "upper",   label: "One uppercase letter" },
                      { key: "number",  label: "One number" },
                      { key: "special", label: "One special character" },
                    ].map(({ key, label }) => {
                      const ok = checks[key as keyof typeof checks];
                      return (
                        <div key={key} className={`rp-req ${ok ? "ok" : ""}`}>
                          <div className={`rp-req-dot ${ok ? "ok" : ""}`}>{ok ? "✓" : ""}</div>
                          <span>{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {error   && <p className="rp-error">{error}</p>}
                  {success && <p className="rp-success">{success}</p>}

                  <button className="rp-submit" type="button" disabled={loading} onClick={handleReset}>
                    {loading ? "Updating..." : "Update Password"}
                  </button>

                  <Link href="/" className="rp-back">← Back to home</Link>
                </>
              )}
            </div>
          </div>

        </main>
      </div>
    </>
  );
}