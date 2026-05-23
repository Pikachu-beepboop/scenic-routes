"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ProfilePage() {
  const [user, setUser]                   = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [username, setUsername]           = useState("");
  const [email, setEmail]                 = useState("");
  const [avatarUrl, setAvatarUrl]         = useState("");
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");
  const [avatarFile, setAvatarFile]       = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [activeSection, setActiveSection] = useState<"profile" | "favorites" | "settings">("profile");
  const [navScrolled, setNavScrolled]     = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      if (!u) { router.push("/"); return; }
      setUser(u);
      fetchProfile(u.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setUsername(data.username || "");
      setEmail(data.email || "");
      setAvatarUrl(data.avatar_url || "");
      setAvatarPreview(data.avatar_url || "");
    }
    setLoading(false);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    let uploadedAvatarUrl = avatarUrl;

    if (avatarFile) {
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${user.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("Avatars").upload(fileName, avatarFile, { upsert: true });
      if (uploadError) { setError("Error uploading avatar: " + uploadError.message); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("Avatars").getPublicUrl(fileName);
      uploadedAvatarUrl = urlData.publicUrl;
    }

    const { error: profileError } = await supabase.from("profiles")
      .update({ username, avatar_url: uploadedAvatarUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (profileError) { setError(profileError.message); setSaving(false); return; }

    if (email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) { setError(emailError.message); setSaving(false); return; }
    }

    if (newPassword) {
      if (newPassword !== confirmPassword) { setError("Passwords do not match."); setSaving(false); return; }
      if (newPassword.length < 6) { setError("Password must be at least 6 characters."); setSaving(false); return; }
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) { setError(passwordError.message); setSaving(false); return; }
    }

    setSuccess("Profile updated successfully!");
    setAvatarUrl(uploadedAvatarUrl);
    setNewPassword(""); setConfirmPassword("");
    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0c0b09", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: "2px solid rgba(201,168,106,0.15)", borderTopColor: "#C9A86A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const initials = (username || user?.email || "U")[0].toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');
        :root {
          --bg:    #0c0b09;
          --bg2:   #111009;
          --gold:  #C9A86A;
          --cream: #EDE5D4;
          --muted: rgba(237,229,212,0.56);
          --dim:   rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.10);
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans:  'Inter', system-ui, sans-serif;
        }
        .pp *, .pp *::before, .pp *::after { box-sizing:border-box; margin:0; padding:0; }
        .pp a { color:inherit; text-decoration:none; }
        .pp button { border:none; font:inherit; cursor:pointer; background:none; }
        .pp input  { font:inherit; }
        .pp { min-height:100vh; background:var(--bg); color:var(--cream); font-family:var(--sans); }

        /* BG */
        .pp-bg { position:fixed; inset:0; z-index:0; }
        .pp-bg img { width:100%; height:100%; object-fit:cover; object-position:center 40%; filter:brightness(0.28) contrast(1.1) saturate(0.7); }
        .pp-bg::after { content:""; position:absolute; inset:0; background:linear-gradient(135deg, rgba(12,11,9,0.88) 0%, rgba(12,11,9,0.6) 50%, rgba(12,11,9,0.82) 100%); }

        /* NAV */
        .pp-nav { position:fixed; inset:0 0 auto; z-index:200; height:72px; padding:0 clamp(20px,4vw,60px); display:flex; align-items:center; justify-content:space-between; background:transparent; border-bottom:1px solid transparent; transition:background .35s,border-color .35s; }
        .pp-nav.scrolled { background:rgba(12,11,9,0.92); backdrop-filter:blur(20px); border-bottom-color:var(--border); }
        .pp-nav-logo { display:flex; flex-direction:column; line-height:1; }
        .pp-nav-logo span { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .pp-nav-links { display:flex; gap:36px; }
        .pp-nav-link { position:relative; font-size:11px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .pp-nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .pp-nav-link:hover { color:var(--cream); }
        .pp-nav-link:hover::after { width:100%; }
        .pp-nav-right { width:107px; display:flex; justify-content:flex-end; }
        @media (max-width:680px) { .pp-nav-links { display:none; } .pp-nav-right { display:none; } }

        /* LAYOUT */
        .pp-layout { position:relative; z-index:10; min-height:100vh; display:flex; padding-top:72px; }

        /* SIDEBAR */
        .pp-sidebar { width:220px; flex-shrink:0; display:flex; flex-direction:column; justify-content:space-between; padding:40px 20px 32px; border-right:1px solid var(--border); background:rgba(12,11,9,0.5); backdrop-filter:blur(20px); }
        .pp-sidebar-top { display:flex; flex-direction:column; gap:32px; }
        .pp-sidebar-label { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:8px; }
        .pp-nav-items { display:flex; flex-direction:column; gap:4px; }
        .pp-nav-item { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; font-size:12px; font-weight:600; letter-spacing:0.06em; color:var(--dim); border:1px solid transparent; transition:all .2s; text-align:left; width:100%; }
        .pp-nav-item:hover { color:var(--muted); background:rgba(237,229,212,0.04); }
        .pp-nav-item.active { color:var(--gold); background:rgba(201,168,106,0.08); border-color:rgba(201,168,106,0.18); }
        .pp-nav-item-icon { font-size:15px; width:18px; text-align:center; }
        .pp-logout { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; font-size:12px; font-weight:600; letter-spacing:0.06em; color:rgba(224,128,128,0.5); border:1px solid transparent; transition:all .2s; width:100%; }
        .pp-logout:hover { color:#e08080; background:rgba(224,128,128,0.06); }

        /* MAIN */
        .pp-main { flex:1; display:flex; align-items:flex-start; justify-content:center; padding:48px clamp(20px,4vw,60px); gap:32px; }

        /* PROFILE CARD */
        .pp-card { width:100%; max-width:420px; }
        .pp-card-inner { background:rgba(14,12,10,0.82); backdrop-filter:blur(28px); border:1px solid var(--border); border-radius:24px; overflow:hidden; box-shadow:0 40px 100px rgba(0,0,0,0.55); }

        /* AVATAR HEADER */
        .pp-avatar-header { padding:32px 32px 24px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:20px; position:relative; }
        .pp-avatar-wrap { position:relative; flex-shrink:0; }
        .pp-avatar { width:64px; height:64px; border-radius:14px; border:1px solid rgba(201,168,106,0.3); object-fit:cover; display:block; }
        .pp-avatar-placeholder { width:64px; height:64px; border-radius:14px; border:1px solid rgba(201,168,106,0.3); background:rgba(201,168,106,0.1); display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:26px; font-weight:300; color:var(--gold); }
        .pp-avatar-edit { position:absolute; bottom:-6px; right:-6px; width:22px; height:22px; border-radius:50%; background:var(--gold); border:2px solid var(--bg); display:flex; align-items:center; justify-content:center; font-size:10px; color:var(--bg); cursor:pointer; transition:transform .2s; }
        .pp-avatar-edit:hover { transform:scale(1.15); }
        .pp-user-name { font-family:var(--serif); font-size:22px; font-weight:300; color:var(--cream); letter-spacing:-0.02em; }
        .pp-user-email { font-size:11px; color:var(--dim); margin-top:2px; }
        .pp-user-role  { font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); margin-top:6px; }

        /* STATS */
        .pp-stats { display:grid; grid-template-columns:repeat(3,1fr); border-bottom:1px solid var(--border); }
        .pp-stat { padding:18px 12px; text-align:center; border-right:1px solid var(--border); }
        .pp-stat:last-child { border-right:none; }
        .pp-stat-num { font-family:var(--serif); font-size:28px; font-weight:300; color:var(--cream); line-height:1; }
        .pp-stat-label { font-size:8px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--dim); margin-top:4px; }

        /* FORM */
        .pp-form { padding:28px 32px 32px; display:flex; flex-direction:column; gap:16px; }
        .pp-section-label { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:4px; }
        .pp-field { display:flex; flex-direction:column; gap:6px; }
        .pp-field-label { font-size:9px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:rgba(237,229,212,0.28); }
        .pp-input { width:100%; padding:13px 16px; background:rgba(237,229,212,0.04); border:1px solid rgba(237,229,212,0.10); border-radius:12px; color:var(--cream); font-size:13px; outline:none; transition:all .25s; }
        .pp-input::placeholder { color:rgba(237,229,212,0.2); }
        .pp-input:focus { border-color:rgba(201,168,106,0.45); background:rgba(237,229,212,0.07); box-shadow:0 0 0 3px rgba(201,168,106,0.09); }
        .pp-divider { height:1px; background:var(--border); margin:4px 0; }
        .pp-error   { font-size:12px; color:#e08080; padding:10px 14px; background:rgba(224,128,128,0.08); border:1px solid rgba(224,128,128,0.18); border-radius:10px; }
        .pp-success { font-size:12px; color:#86c9a0; padding:10px 14px; background:rgba(134,201,160,0.08); border:1px solid rgba(134,201,160,0.18); border-radius:10px; }
        .pp-submit { width:100%; padding:14px 24px; background:transparent; border:1px solid var(--gold); border-radius:999px; color:var(--gold); font-size:9px; font-weight:800; letter-spacing:0.24em; text-transform:uppercase; cursor:pointer; transition:all .25s; margin-top:4px; }
        .pp-submit:hover:not(:disabled) { background:var(--gold); color:var(--bg); }
        .pp-submit:disabled { opacity:0.5; cursor:not-allowed; }

        /* RIGHT INFO PANEL */
        .pp-info { width:280px; flex-shrink:0; display:flex; flex-direction:column; gap:16px; }
        .pp-info-card { background:rgba(14,12,10,0.72); backdrop-filter:blur(20px); border:1px solid var(--border); border-radius:18px; padding:24px; }
        .pp-info-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--gold); margin-bottom:16px; }
        .pp-info-item { display:flex; align-items:flex-start; gap:12px; margin-bottom:14px; }
        .pp-info-icon { width:30px; height:30px; border-radius:50%; border:1px solid rgba(201,168,106,0.25); display:grid; place-items:center; flex-shrink:0; color:var(--gold); font-size:12px; }
        .pp-info-text h4 { font-size:11px; font-weight:700; letter-spacing:0.06em; color:var(--cream); margin-bottom:2px; }
        .pp-info-text p  { font-size:11px; color:var(--dim); line-height:1.5; font-weight:300; }
        .pp-explore-btn { display:flex; align-items:center; justify-content:center; gap:8px; padding:12px 20px; border:1px solid rgba(201,168,106,0.3); border-radius:999px; font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); transition:all .25s; width:100%; }
        .pp-explore-btn:hover { background:var(--gold); color:var(--bg); }

        @media (max-width:1100px) { .pp-info { display:none; } }
        @media (max-width:760px)  { .pp-sidebar { display:none; } .pp-main { padding-top:32px; } }
      `}</style>

      <div className="pp">
        {/* BG */}
        <div className="pp-bg">
          <img src="/Stelvio Pass.jpg" alt="Scenic road" onError={e => { (e.currentTarget as HTMLImageElement).src = "/Pacific Route Highway.jpg"; }} />
        </div>

        {/* NAV */}
        <nav className={`pp-nav ${navScrolled ? "scrolled" : ""}`}>
          <Link href="/" className="pp-nav-logo">
            <span>SCENIC</span><span>ROUTES</span>
          </Link>
          <div className="pp-nav-links">
            <Link href="/explore"  className="pp-nav-link">Explore Routes</Link>
            <Link href="/my-trips" className="pp-nav-link" style={{ color: "var(--gold)" }}>My Trips</Link>
            <Link href="/about"    className="pp-nav-link">About</Link>
          </div>
          <div className="pp-nav-right" />
        </nav>

        <div className="pp-layout">

          {/* SIDEBAR */}
          <aside className="pp-sidebar">
            <div className="pp-sidebar-top">
              <div>
                <p className="pp-sidebar-label">Navigation</p>
                <div className="pp-nav-items">
                  {([
                    { id: "profile",   label: "Profile",   icon: "◎" },
                    { id: "favorites", label: "Favorites", icon: "♡" },
                    { id: "settings",  label: "Settings",  icon: "⬡" },
                  ] as const).map(({ id, label, icon }) => (
                    <button key={id} className={`pp-nav-item ${activeSection === id ? "active" : ""}`} onClick={() => setActiveSection(id)}>
                      <span className="pp-nav-item-icon">{icon}</span>
                      {label}
                    </button>
                  ))}
                  <button className="pp-nav-item" onClick={() => router.push("/my-trips")}>
                    <span className="pp-nav-item-icon">△</span>
                    My Trips
                  </button>
                </div>
              </div>
            </div>
            <button className="pp-logout" onClick={handleLogout}>
              <span className="pp-nav-item-icon">→</span>
              Sign Out
            </button>
          </aside>

          {/* MAIN */}
          <main className="pp-main">

            {/* PROFILE CARD */}
            <div className="pp-card">
              <div className="pp-card-inner">

                {/* AVATAR HEADER */}
                <div className="pp-avatar-header">
                  <div className="pp-avatar-wrap">
                    {avatarPreview
                      ? <img src={avatarPreview} className="pp-avatar" alt="avatar" />
                      : <div className="pp-avatar-placeholder">{initials}</div>
                    }
                    <label className="pp-avatar-edit" title="Change photo">
                      ✎
                      <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                    </label>
                  </div>
                  <div>
                    <p className="pp-user-name">{username || user?.email?.split("@")[0]}</p>
                    <p className="pp-user-email">{user?.email}</p>
                    <p className="pp-user-role">Scenic Route Explorer</p>
                  </div>
                </div>

                {/* STATS */}
                <div className="pp-stats">
                  {[["12", "Trips"], ["5", "Routes"], ["8", "Saved"]].map(([n, l]) => (
                    <div className="pp-stat" key={l}>
                      <div className="pp-stat-num">{n}</div>
                      <div className="pp-stat-label">{l}</div>
                    </div>
                  ))}
                </div>

                {/* FORM */}
                <div className="pp-form">
                  <p className="pp-section-label">Profile Settings</p>

                  <div className="pp-field">
                    <label className="pp-field-label">Username</label>
                    <input className="pp-input" type="text" placeholder="Your username" value={username} onChange={e => setUsername(e.target.value)} />
                  </div>

                  <div className="pp-field">
                    <label className="pp-field-label">Email</label>
                    <input className="pp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>

                  <div className="pp-divider" />
                  <p className="pp-section-label">Change Password</p>

                  <div className="pp-field">
                    <label className="pp-field-label">New Password</label>
                    <input className="pp-input" type="password" placeholder="Leave blank to keep current" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  </div>

                  <div className="pp-field">
                    <label className="pp-field-label">Confirm New Password</label>
                    <input className="pp-input" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  </div>

                  {error   && <p className="pp-error">{error}</p>}
                  {success && <p className="pp-success">{success}</p>}

                  <button className="pp-submit" type="button" disabled={saving} onClick={handleSave}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

              </div>
            </div>

            {/* RIGHT INFO PANEL */}
            <div className="pp-info">
              <div className="pp-info-card">
                <p className="pp-info-title">Your Journey</p>
                <div className="pp-info-item">
                  <div className="pp-info-icon">◎</div>
                  <div className="pp-info-text"><h4>Saved Routes</h4><p>Access all your bookmarked routes anytime.</p></div>
                </div>
                <div className="pp-info-item">
                  <div className="pp-info-icon">△</div>
                  <div className="pp-info-text"><h4>Trip History</h4><p>Review your completed road trips and memories.</p></div>
                </div>
                <div className="pp-info-item" style={{ marginBottom: 0 }}>
                  <div className="pp-info-icon">⬡</div>
                  <div className="pp-info-text"><h4>Exclusive Access</h4><p>Members get hidden gems and insider tips.</p></div>
                </div>
              </div>
              <div className="pp-info-card">
                <p className="pp-info-title">Discover More</p>
                <p style={{ fontSize: 13, color: "var(--dim)", fontWeight: 300, lineHeight: 1.7, marginBottom: 16 }}>
                  150+ curated routes across 40+ countries are waiting for you.
                </p>
                <Link href="/explore" className="pp-explore-btn">Explore Routes →</Link>
              </div>
            </div>

          </main>
        </div>
      </div>
    </>
  );
}