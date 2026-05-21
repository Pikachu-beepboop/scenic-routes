"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import AuthModal from '../AuthModal';

const fmtKm = (km?: number) => km != null ? `${km.toLocaleString("en-US")} km` : "—";

export default function MyTripsPage() {
  const [user,         setUser]         = useState<any>(null);
  const [savedRoutes,  setSavedRoutes]  = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [isAuthOpen,   setIsAuthOpen]   = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarUrl,    setAvatarUrl]    = useState('');
  const [navScrolled,  setNavScrolled]  = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (!u) { setLoading(false); return; }
      fetchSavedRoutes(u.id);
      fetchProfile(u.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchSavedRoutes(userId: string) {
    setLoading(true);
    const { data } = await supabase
      .from('saved_routes')
      .select('route_id, routes(*)')
      .eq('user_id', userId);
    if (data) setSavedRoutes(data.map((r: any) => r.routes).filter(Boolean));
    setLoading(false);
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
    if (data) setAvatarUrl(data.avatar_url || '');
  }

  async function handleUnsave(routeId: string) {
    await supabase.from('saved_routes').delete().eq('user_id', user.id).eq('route_id', routeId);
    setSavedRoutes(prev => prev.filter((r: any) => r.id !== routeId));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null); setShowUserMenu(false);
    router.push('/');
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');
        :root {
          --bg:    #0c0b09; --bg2: #111009; --bg3: #181510;
          --gold:  #C9A86A; --cream: #EDE5D4;
          --muted: rgba(237,229,212,0.56); --dim: rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.10);
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans:  'Inter', system-ui, sans-serif;
        }
        .mt *, .mt *::before, .mt *::after { box-sizing:border-box; margin:0; padding:0; }
        .mt a      { color:inherit; text-decoration:none; }
        .mt button { border:none; font:inherit; cursor:pointer; background:none; }
        .mt img    { display:block; }
        .mt { min-height:100vh; background:var(--bg); color:var(--cream); font-family:var(--sans); overflow-x:hidden; }

        /* NAV */
        .nav { position:fixed; inset:0 0 auto; z-index:200; height:72px; padding:0 clamp(20px,4vw,60px); display:flex; align-items:center; justify-content:space-between; background:transparent; border-bottom:1px solid transparent; transition:background .35s,border-color .35s; }
        .nav.scrolled { background:rgba(12,11,9,0.92); backdrop-filter:blur(20px); border-bottom-color:var(--border); }
        .nav-logo { display:flex; flex-direction:column; line-height:1; }
        .nav-logo span { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .nav-links { display:flex; gap:36px; }
        .nav-link { position:relative; font-size:11px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .nav-link:hover { color:var(--cream); }
        .nav-link:hover::after { width:100%; }
        .nav-right { display:flex; align-items:center; gap:12px; }
        .nav-cta { padding:10px 22px; border:1px solid rgba(237,229,212,0.28); border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); background:rgba(237,229,212,0.04); transition:all .25s; }
        .nav-cta:hover { background:var(--cream); color:var(--bg); }
        .user-btn { width:38px; height:38px; border-radius:50%; border:1px solid var(--border); background:rgba(237,229,212,0.06); overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:var(--cream); }
        .user-btn img { width:100%; height:100%; object-fit:cover; }
        .user-dd { position:absolute; top:50px; right:0; width:210px; background:rgba(20,18,12,0.98); border:1px solid var(--border); border-radius:16px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.52); }
        .user-dd-email { padding:12px 14px; border-bottom:1px solid var(--border); font-size:10px; color:var(--dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .user-dd a, .user-dd button { display:block; width:100%; padding:12px 14px; font-size:13px; color:var(--cream); text-align:left; transition:background .15s; }
        .user-dd a:hover, .user-dd button:hover { background:rgba(237,229,212,0.06); }
        .user-dd button { color:#E08080; }

        /* PAGE HEADER */
        .page-header { position:relative; padding:clamp(180px,22vh,260px) clamp(24px,5vw,80px) clamp(120px,15vh,180px); border-bottom:1px solid var(--border); overflow:hidden; min-height:700px; }
        .page-header-bg { position:absolute; inset:0; }
        .page-header-bg img { width:100%; height:100%; object-fit:cover; object-position: top; filter:brightness(0.75) contrast(1.05) saturate(0.95); }
        .page-header-bg::after { content:""; position:absolute; inset:0; background: linear-gradient(to bottom, rgba(12,11,9,0.3) 0%, rgba(12,11,9,0.5) 60%, rgba(12,11,9,0.98) 100%), linear-gradient(to right, rgba(12,11,9,0.6) 0%, transparent 60%); }
        .page-header-inner { position:relative; z-index:10; max-width:1380px; margin:0 auto; display:flex; align-items:flex-end; justify-content:space-between; gap:24px; }

        .page-eyebrow { font-size:9px; font-weight:800; letter-spacing:0.38em; text-transform:uppercase; color:var(--gold); margin-bottom:16px; }
        .page-h1 { font-family:var(--serif); font-size:clamp(42px,6vw,80px); font-weight:300; line-height:0.9; letter-spacing:-0.04em; color:var(--cream); }
        .page-sub { font-size:14px; color:var(--dim); font-weight:300; line-height:1.6; max-width:320px; text-align:right; }

        /* MAIN CONTENT */
        .main { max-width:1380px; margin:0 auto; padding:clamp(48px,6vw,80px) clamp(24px,5vw,80px) clamp(80px,10vw,120px); }

        /* EMPTY STATE */
        .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:clamp(60px,10vh,100px) 20px; text-align:center; }
        .empty-icon { width:72px; height:72px; border-radius:50%; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:28px; color:var(--dim); margin-bottom:24px; }
        .empty-h2 { font-family:var(--serif); font-size:clamp(28px,4vw,44px); font-weight:300; font-style:italic; color:var(--cream); margin-bottom:12px; }
        .empty-p  { font-size:14px; color:var(--dim); font-weight:300; margin-bottom:32px; }
        .btn-gold-filled { display:inline-flex; align-items:center; gap:10px; padding:14px 28px; background:var(--gold); border:1px solid var(--gold); border-radius:999px; font-size:9px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--bg); transition:all .25s; }
        .btn-gold-filled:hover { background:#d8b978; transform:translateY(-1px); }

        /* LOADING */
        .loading-wrap { display:flex; justify-content:center; align-items:center; min-height:300px; }
        .spinner { width:36px; height:36px; border:2px solid var(--border); border-top-color:var(--gold); border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* GRID */
        .routes-count { font-size:12px; color:var(--dim); font-weight:500; letter-spacing:0.06em; margin-bottom:32px; padding-bottom:24px; border-bottom:1px solid var(--border); }
        .routes-count strong { color:var(--cream); font-weight:700; }
        .routes-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }

        /* ROUTE CARD */
        .route-card { position:relative; border-radius:20px; overflow:hidden; background:var(--bg3); border:1px solid var(--border); transition:transform .4s cubic-bezier(.25,.46,.45,.94),box-shadow .4s,border-color .4s; cursor:pointer; }
        .route-card:hover { transform:translateY(-6px); box-shadow:0 32px 80px rgba(0,0,0,0.5); border-color:rgba(201,168,106,0.22); }
        .route-card-img { position:relative; height:220px; overflow:hidden; }
        .route-card-img img { width:100%; height:100%; object-fit:cover; filter:brightness(0.88); transition:transform .7s ease; }
        .route-card:hover .route-card-img img { transform:scale(1.07); }
        .route-card-img::after { content:""; position:absolute; inset:0; background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,0.6) 100%); }
        .unsave-btn { position:absolute; top:12px; right:12px; z-index:5; width:36px; height:36px; border-radius:50%; background:rgba(12,11,9,0.55); backdrop-filter:blur(12px); border:1px solid rgba(237,229,212,0.18); display:flex; align-items:center; justify-content:center; transition:background .25s; }
        .unsave-btn:hover { background:rgba(224,80,80,0.3); border-color:rgba(224,80,80,0.5); }
        .unsave-btn svg { width:16px; height:16px; }
        .route-card-type { position:absolute; bottom:12px; left:12px; z-index:5; padding:5px 10px; border-radius:999px; background:rgba(12,11,9,0.65); backdrop-filter:blur(12px); border:1px solid rgba(237,229,212,0.16); font-size:8px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:rgba(237,229,212,0.8); }
        .route-card-body { padding:18px 18px 20px; }
        .route-card-country { font-size:9px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:var(--gold); margin-bottom:6px; }
        .route-card-title { font-family:var(--serif); font-size:22px; font-weight:400; color:var(--cream); line-height:1.05; letter-spacing:-0.02em; margin-bottom:8px; }
        .route-card-desc { font-size:12px; color:var(--dim); line-height:1.65; font-weight:300; margin-bottom:14px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .route-card-meta { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .meta-item { display:flex; align-items:center; gap:5px; font-size:10px; color:rgba(237,229,212,0.45); font-weight:500; }
        .meta-item svg { opacity:0.55; flex-shrink:0; }
        .route-card-footer { display:flex; align-items:center; justify-content:space-between; padding-top:14px; border-top:1px solid var(--border); }
        .rating { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--gold); font-weight:700; }
        .view-btn { font-size:10px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:var(--gold); transition:color .2s; }
        .view-btn:hover { color:var(--cream); }

        /* FOOTER */
        .footer { background:var(--bg); border-top:1px solid var(--border); padding:56px clamp(24px,5vw,80px) 28px; }
        .footer-inner  { max-width:1380px; margin:0 auto; }
        .footer-top    { display:grid; grid-template-columns:1.3fr 1fr 1fr 1fr 1.4fr; gap:36px; padding-bottom:40px; border-bottom:1px solid var(--border); margin-bottom:22px; }
        .footer-brand  { font-size:11px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); line-height:1.2; margin-bottom:12px; }
        .footer-tagline{ font-size:12px; color:var(--dim); line-height:1.7; font-weight:300; margin-bottom:18px; max-width:200px; }
        .footer-socials{ display:flex; gap:8px; }
        .footer-social { width:32px; height:32px; border-radius:50%; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:11px; color:var(--dim); transition:all .2s; }
        .footer-social:hover { border-color:var(--gold); color:var(--gold); }
        .footer-col-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:16px; }
        .footer-col a  { display:block; font-size:12px; color:rgba(237,229,212,0.38); margin-bottom:10px; font-weight:300; transition:color .2s; }
        .footer-col a:hover { color:var(--cream); }
        .footer-bottom { display:flex; justify-content:space-between; align-items:center; gap:16px; }
        .footer-copy   { font-size:10px; color:var(--dim); letter-spacing:0.08em; text-transform:uppercase; }
        .footer-legal  { display:flex; gap:22px; }
        .footer-legal a{ font-size:10px; color:var(--dim); letter-spacing:0.08em; text-transform:uppercase; transition:color .2s; }
        .footer-legal a:hover { color:var(--cream); }

        @media (max-width:1024px) { .routes-grid { grid-template-columns:repeat(2,1fr); } .footer-top { grid-template-columns:1fr 1fr; } }
        @media (max-width:640px)  { .nav-links { display:none; } .routes-grid { grid-template-columns:1fr; } .page-header-inner { flex-direction:column; align-items:flex-start; } .page-sub { text-align:left; } .footer-top { grid-template-columns:1fr; } .footer-bottom { flex-direction:column; align-items:flex-start; } }
      `}</style>

      <div className="mt">

        {/* NAV */}
        <nav className={`nav ${navScrolled ? "scrolled" : ""}`}>
          <Link href="/" className="nav-logo">
            <span>SCENIC</span><span>ROUTES</span>
          </Link>
          <div className="nav-links">
            <Link href="/explore"  className="nav-link">Explore Routes</Link>
            <Link href="/about"    className="nav-link">About</Link>
            {user && <Link href="/my-trips" className="nav-link" style={{color:"var(--gold)"}}>My Trips</Link>}
          </div>
          <div className="nav-right">
            {user ? (
              <div style={{position:"relative"}}>
                <button className="user-btn" onClick={()=>setShowUserMenu(p=>!p)}>
                  {avatarUrl ? <img src={avatarUrl} alt="avatar"/> : user.email?.[0]?.toUpperCase()}
                </button>
                {showUserMenu && (
                  <div className="user-dd">
                    <div className="user-dd-email">{user.email}</div>
                    <Link href="/profile" onClick={()=>setShowUserMenu(false)}>Profile</Link>
                    <Link href="/my-trips" onClick={()=>setShowUserMenu(false)}>My Trips</Link>
                    <button onClick={handleLogout}>Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <button className="nav-cta" onClick={()=>setIsAuthOpen(true)}>Login</button>
            )}
          </div>
        </nav>

        {/* PAGE HEADER */}
        <div className="page-header">
          <div className="page-header-bg">
            <img src="/Misty mountain road to the valley.jpg" alt="Hero" onError={e=>{e.currentTarget.src="/Trollstigen.jpg";}}/>
          </div>
          <div className="page-header-inner">
            <div>
              <p className="page-eyebrow">Your Collection</p>
              <h1 className="page-h1">My Trips</h1>
            </div>
            <p className="page-sub">
              Your saved scenic routes — ready whenever the road calls.
            </p>
          </div>
        </div>

        {/* MAIN */}
        <main className="main">
          {!user ? (
            <div className="empty-state">
              <div className="empty-icon">♡</div>
              <h2 className="empty-h2">Sign in to see your saved routes.</h2>
              <p className="empty-p">Create an account to start building your personal collection.</p>
              <button className="btn-gold-filled" onClick={()=>setIsAuthOpen(true)}>Login →</button>
            </div>
          ) : loading ? (
            <div className="loading-wrap">
              <div className="spinner"/>
            </div>
          ) : savedRoutes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">♡</div>
              <h2 className="empty-h2">No saved routes yet.</h2>
              <p className="empty-p">Explore our collection and save the routes that speak to you.</p>
              <Link href="/explore" className="btn-gold-filled">Explore Routes →</Link>
            </div>
          ) : (
            <>
              <p className="routes-count"><strong>{savedRoutes.length}</strong> saved route{savedRoutes.length !== 1 ? "s" : ""}</p>
              <div className="routes-grid">
                {savedRoutes.map((route: any) => (
                  <div key={route.id} className="route-card">
                    <div className="route-card-img">
                      <Link href={`/routedetail/${route.id}`}>
                        <img src={route.image_url || "/Amalfi coast road.jpg"} alt={route.title} onError={e=>{e.currentTarget.src="/Amalfi coast road.jpg";}}/>
                      </Link>
                      <button className="unsave-btn" onClick={()=>handleUnsave(route.id)} title="Remove from saved">
                        <svg viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{fill:"#ef4444",stroke:"#ef4444"}}>
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>
                      {(route.terrain || route.type) && (
                        <div className="route-card-type">{route.terrain || route.type}</div>
                      )}
                    </div>
                    <div className="route-card-body">
                      <div className="route-card-country">{route.country}</div>
                      <Link href={`/routedetail/${route.id}`}>
                        <div className="route-card-title">{route.title}</div>
                      </Link>
                      {route.description && (
                        <p className="route-card-desc">{route.description}</p>
                      )}
                      <div className="route-card-meta">
                        {route.duration && (
                          <div className="meta-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {route.duration}
                          </div>
                        )}
                        {route.distance_km && (
                          <div className="meta-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                            {fmtKm(route.distance_km)}
                          </div>
                        )}
                      </div>
                      <div className="route-card-footer">
                        <div className="rating">★ {route.rating ? route.rating.toFixed(1) : "—"}</div>
                        <Link href={`/routedetail/${route.id}`} className="view-btn">View Route →</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-top">
              <div>
                <div className="footer-brand">SCENIC<br/>ROUTES</div>
                <p className="footer-tagline">Thoughtfully curated road trips for people who value the journey.</p>
                <div className="footer-socials">
                  {["IG","FB","YT"].map(s=><a key={s} href="#" className="footer-social">{s[0]}</a>)}
                </div>
              </div>
              {[["Explore",["All Routes","Destinations","Experiences","Journal"]],["Company",["About Us","Membership","Gift Cards","Careers"]],["Support",["FAQ","Travel Policies","Contact Us","Privacy Policy"]]].map(([heading,links])=>(
                <div key={heading as string}>
                  <p className="footer-col-title">{heading as string}</p>
                  <div className="footer-col">
                    {(links as string[]).map(l=><a href="#" key={l}>{l}</a>)}
                  </div>
                </div>
              ))}
              <div>
                <p className="footer-col-title">Stay Inspired</p>
                <p style={{fontSize:"12px",color:"var(--dim)",lineHeight:1.6,marginBottom:"14px",fontWeight:300}}>Subscribe for new routes, stories, and exclusive guides.</p>
              </div>
            </div>
            <div className="footer-bottom">
              <p className="footer-copy">© {new Date().getFullYear()} Scenic Routes. All Rights Reserved.</p>
              <div className="footer-legal">
                <a href="#">Terms & Conditions</a>
                <a href="#">Privacy</a>
              </div>
            </div>
          </div>
        </footer>

      </div>
      <AuthModal isOpen={isAuthOpen} onClose={()=>setIsAuthOpen(false)}/>
    </>
  );
}