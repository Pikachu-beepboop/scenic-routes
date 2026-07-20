"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { useTheme } from "next-themes";
import { useUnit } from "../UnitContext";
import {
  User, Award, Settings as SettingsIcon, Map, LogOut,
  Bell, ShieldCheck, LifeBuoy, Info,
  ChevronRight, Menu, X,
} from "lucide-react";

type Stamp = {
  id: string;
  title: string;
  country: string;
  terrain?: string;
  completed_at?: string;
};

const PASSPORT_PAGES = ["cover", "id", "stamps"] as const;
type PassportPageId = typeof PASSPORT_PAGES[number];

function TravellerPass({ username, email, avatarPreview, initials, stamps }: {
  username: string; email: string; avatarPreview: string; initials: string; stamps: Stamp[];
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const [flipping, setFlipping] = useState(false);

  const page = PASSPORT_PAGES[pageIndex];

  function goTo(next: PassportPageId) {
    const nextIdx = PASSPORT_PAGES.indexOf(next);
    if (flipping || nextIdx === pageIndex) return;
    setDirection(nextIdx > pageIndex ? "fwd" : "back");
    setPrevIndex(pageIndex);
    setPageIndex(nextIdx);
    setFlipping(true);
    window.setTimeout(() => { setFlipping(false); setPrevIndex(null); }, 680);
  }

  const today = new Date();
  const issued = `${String(today.getDate()).padStart(2,"0")} ${today.toLocaleString("en",{month:"long"})} ${today.getFullYear()}`;
  const expiry = `${String(today.getDate()).padStart(2,"0")} ${today.toLocaleString("en",{month:"long"})} ${today.getFullYear()+10}`;
  const displayName = username || email.split("@")[0];
  const mrzName = displayName.toUpperCase().replace(/[^A-Z]/g,"");

  const STAMP_STYLES = [
    { border:"rgba(180,100,60,.6)", bg:"rgba(180,100,60,.08)", icon:"rgba(180,100,60,.8)", text:"#5a2010", sub:"#8a4020" },
    { border:"rgba(60,110,180,.6)", bg:"rgba(60,110,180,.08)", icon:"rgba(60,110,180,.8)", text:"#102050", sub:"#204080" },
    { border:"rgba(40,130,80,.6)",  bg:"rgba(40,130,80,.08)",  icon:"rgba(40,130,80,.8)",  text:"#0a3020", sub:"#1a6040" },
    { border:"rgba(140,80,180,.6)", bg:"rgba(140,80,180,.08)", icon:"rgba(140,80,180,.8)", text:"#301050", sub:"#602090" },
    { border:"rgba(180,140,40,.6)", bg:"rgba(180,140,40,.08)", icon:"rgba(180,140,40,.8)", text:"#3a2a00", sub:"#7a5a10" },
    { border:"rgba(60,150,160,.6)", bg:"rgba(60,150,160,.08)", icon:"rgba(60,150,160,.8)", text:"#0a3040", sub:"#1a6070" },
    { border:"rgba(180,60,80,.6)",  bg:"rgba(180,60,80,.08)",  icon:"rgba(180,60,80,.8)",  text:"#4a0a14", sub:"#8a2030" },
    { border:"rgba(80,100,60,.6)",  bg:"rgba(80,100,60,.08)",  icon:"rgba(80,100,60,.8)",  text:"#1a2810", sub:"#3a5020" },
  ];

  const TERRAIN_ICONS: Record<string, string> = {
    Mountains:"△", Coastal:"〰", Desert:"◇", Forest:"◉", Alpine:"▲", Scenic:"◎",
  };

  function renderPage(p: PassportPageId) {
    if (p === "cover") {
  return (
    <div style={{background:"linear-gradient(160deg,#0e1a0e 0%,#142114 50%,#0e1a0e 100%)",borderRadius:"4px 14px 14px 4px",borderLeft:"8px solid #0a150a",minHeight:620,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"50px 44px 44px",boxShadow:"4px 4px 28px rgba(0,0,0,.7),-1px 0 0 #1e2e1e",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0px,rgba(255,255,255,.018) 1px,transparent 1px,transparent 10px),repeating-linear-gradient(-45deg,rgba(255,255,255,.018) 0px,rgba(255,255,255,.018) 1px,transparent 1px,transparent 10px)"}}/>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
        <span style={{fontSize:10,letterSpacing:".32em",textTransform:"uppercase",color:"rgba(200,180,110,.5)",fontWeight:400}}>International</span>
      </div>
      
      {/* ЛОГОТИП - БЕЗ БЕЛОГО ФОНА */}
      <div style={{position:"relative",zIndex:1}}>
        <img 
          src="/logo2.png" 
          alt="Scenic Routes Logo" 
          style={{
            width:400,
            height:320,
            objectFit:"contain",
            display:"block"
          }} 
        />
      </div>
      
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
        <span style={{fontSize:27,letterSpacing:".22em",textTransform:"uppercase",color:"rgba(200,180,110,.85)",fontFamily:"'Cormorant Garamond',Georgia,serif",fontWeight:400}}>Passport</span>
        <span style={{fontSize:10,letterSpacing:".14em",color:"rgba(200,180,110,.35)",textTransform:"uppercase"}}>Passeport · Pasaporte · Reisepass</span>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gridTemplateRows:"1fr 1fr 1fr",gap:2,padding:6,width:62,height:44,border:"1.5px solid rgba(200,180,110,.28)",borderRadius:6,marginTop:8}}>
          {[0,0,0,0,1,0,1,0,0].map((big,i)=>(
            <div key={i} style={{background:`rgba(200,180,110,${big?0.32:0.18})`,borderRadius:1}}/>
          ))}
        </div>
        <button onClick={() => goTo("id")} style={{marginTop:18,padding:"11px 32px",border:"1px solid rgba(200,180,110,.4)",borderRadius:999,fontSize:10,fontWeight:700,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(200,180,110,.78)",background:"transparent",cursor:"pointer"}}>
          Open passport →
        </button>
      </div>
    </div>
  );
}

    if (p === "id") {
      return (
        <div style={{background:"linear-gradient(170deg,#f9f4eb 0%,#f2e9d6 60%,#ece0c8 100%)",borderRadius:"4px 14px 14px 4px",borderLeft:"8px solid #d4c090",minHeight:620,display:"flex",flexDirection:"column",boxShadow:"4px 4px 28px rgba(0,0,0,.5)",position:"relative",overflow:"hidden",color:"#1a1200"}}>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",opacity:.04,fontSize:110,fontFamily:"'Cormorant Garamond',Georgia,serif",color:"#5a4010",transform:"rotate(-20deg)",letterSpacing:".1em"}}>SR</div>
          <div style={{position:"absolute",bottom:110,left:0,right:0,height:44,opacity:.1,background:"repeating-linear-gradient(90deg,transparent,transparent 3px,#8a6a20 3px,#8a6a20 4px)"}}/>
          <div style={{background:"linear-gradient(135deg,#1a3a1a,#2a5a2a)",padding:"14px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:10,letterSpacing:".28em",textTransform:"uppercase",color:"rgba(200,180,110,.88)",fontWeight:700}}>Scenic Routes</div>
              <div style={{fontSize:9,letterSpacing:".16em",color:"rgba(200,180,110,.48)",textTransform:"uppercase",marginTop:3}}>Traveller Passport</div>
            </div>
            <div style={{fontSize:24,color:"rgba(200,180,110,.55)"}}>✦</div>
          </div>
          <div style={{display:"flex",gap:20,padding:"22px 22px 14px",position:"relative",zIndex:1}}>
            <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
              {avatarPreview
                ? <img src={avatarPreview} alt="photo" style={{width:108,height:132,objectFit:"cover",border:"2px solid #b8921a",borderRadius:2,display:"block"}}/>
                : <div style={{width:108,height:132,border:"2px solid #b8921a",borderRadius:2,background:"linear-gradient(135deg,#e8dcc0,#d4c490)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:46,fontWeight:300,color:"#8a6a20"}}>{initials}</div>
              }
              <span style={{fontSize:8,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a40",fontWeight:500}}>Photo / Photo</span>
              <div style={{width:108,height:34,borderBottom:"1px solid #b8921a",display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:2,marginTop:7}}>
                <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:15,fontStyle:"italic",color:"#5a3a10",opacity:.6}}>{displayName}</span>
              </div>
              <span style={{fontSize:7,letterSpacing:".14em",textTransform:"uppercase",color:"#8a6a40"}}>Signature</span>
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:11}}>
              {[
                ["Surname / Nom", displayName.toUpperCase()],
                ["Given names / Prénoms", "ROUTE EXPLORER"],
                ["Nationality / Nationalité", "WORLD TRAVELLER"],
              ].map(([label, value]) => (
                <div key={label} style={{display:"flex",flexDirection:"column",gap:2,borderBottom:".5px solid rgba(90,60,16,.15)",paddingBottom:7}}>
                  <span style={{fontSize:8,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a40",fontWeight:700}}>{label}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#1a1200",letterSpacing:".04em"}}>{value}</span>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{display:"flex",flexDirection:"column",gap:2,borderBottom:".5px solid rgba(90,60,16,.15)",paddingBottom:7}}>
                  <span style={{fontSize:8,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a40",fontWeight:700}}>Date of issue</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#1a1200"}}>{issued}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:2,borderBottom:".5px solid rgba(90,60,16,.15)",paddingBottom:7}}>
                  <span style={{fontSize:8,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a40",fontWeight:700}}>Date of expiry</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#8a1a1a"}}>{expiry}</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                <span style={{fontSize:8,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a40",fontWeight:700}}>Routes completed</span>
                <span style={{fontSize:13,fontWeight:700,color:"#7a5a18"}}>{stamps.length} Destination{stamps.length!==1?"s":""}</span>
              </div>
            </div>
          </div>
          <div style={{position:"relative",zIndex:1,margin:"0 22px 12px",padding:"9px 12px",background:"rgba(26,58,26,.06)",border:".5px solid rgba(26,58,26,.15)",borderRadius:3,fontSize:9,color:"#4a5a30",letterSpacing:".06em",lineHeight:1.5}}>
            Type: P &nbsp;|&nbsp; Code: SRT &nbsp;|&nbsp; No: SR{String(stamps.length).padStart(7,"0")} &nbsp;|&nbsp; Authority: Scenic Routes International
          </div>
          <div style={{marginTop:"auto",padding:"12px 16px",background:"#1a3a1a",fontFamily:"'Courier New',monospace",fontSize:9,color:"rgba(200,180,110,.65)",letterSpacing:".05em",lineHeight:1.8,wordBreak:"break-all",position:"relative",zIndex:1}}>
            <div style={{fontSize:8,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(200,180,110,.3)",marginBottom:5}}>Machine readable zone</div>
            <div>{"P<SRT" + mrzName + "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<".slice(0, 39 - mrzName.length)}</div>
            <div>{"SR" + String(stamps.length).padStart(7,"0") + "0SRT" + String(today.getFullYear()).slice(2) + "01014M" + String(today.getFullYear()+10).slice(2) + "1231<<<<<<<<<<<<<<6"}</div>
          </div>
          <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",padding:"12px 22px 18px"}}>
            <button onClick={() => goTo("cover")} style={{padding:"10px 24px",border:"1px solid #8a6a20",borderRadius:999,fontSize:9,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a20",background:"transparent",cursor:"pointer"}}>
              ← Cover
            </button>
            <button onClick={() => goTo("stamps")} style={{padding:"10px 24px",border:"1px solid #8a6a20",borderRadius:999,fontSize:9,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a20",background:"transparent",cursor:"pointer"}}>
              View stamps →
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{background:"linear-gradient(170deg,#f8f3e8 0%,#f0e6d0 60%,#e8dcc0 100%)",borderRadius:"4px 14px 14px 4px",borderLeft:"8px solid #d4c090",minHeight:620,display:"flex",flexDirection:"column",boxShadow:"4px 4px 28px rgba(0,0,0,.5)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",opacity:.03,fontSize:155,fontFamily:"'Cormorant Garamond',Georgia,serif",color:"#5a4010",transform:"rotate(-15deg)"}}>✦</div>
        <div style={{background:"linear-gradient(135deg,#1a3a1a,#2a5a2a)",padding:"14px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,letterSpacing:".28em",textTransform:"uppercase",color:"rgba(200,180,110,.88)",fontWeight:700}}>Entry Stamps</div>
            <div style={{fontSize:9,letterSpacing:".14em",color:"rgba(200,180,110,.45)",textTransform:"uppercase",marginTop:3}}>Cachets d'entrée · Sellos de entrada</div>
          </div>
          <div style={{fontSize:24,color:"rgba(200,180,110,.55)"}}>✦</div>
        </div>
        {stamps.length === 0 ? (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,padding:28}}>
            <div style={{fontSize:48,opacity:.18,color:"#5a3a10"}}>✦</div>
            <p style={{fontSize:14,color:"#8a6a40",textAlign:"center",lineHeight:1.7}}>No stamps yet.<br/>Complete routes to earn your first stamp.</p>
            <Link href="/explore" style={{padding:"10px 24px",border:"1px solid #8a6a20",borderRadius:999,fontSize:9,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a20"}}>Explore Routes →</Link>
          </div>
        ) : (
          <div style={{position:"relative",zIndex:1,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,padding:"20px 22px",flex:1}}>
            {stamps.map((s, i) => {
              const st = STAMP_STYLES[i % STAMP_STYLES.length];
              return (
                <div key={s.id} style={{border:`2px solid ${st.border}`,background:st.bg,borderRadius:4,aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",transition:"transform .2s",cursor:"default"}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:10,textAlign:"center"}}>
                    <div style={{fontSize:19,lineHeight:1,color:st.icon}}>{TERRAIN_ICONS[s.terrain||""]||"◎"}</div>
                    <div style={{fontSize:8,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",lineHeight:1.3,color:st.text}}>{s.title}</div>
                    <div style={{fontSize:7,letterSpacing:".14em",textTransform:"uppercase",color:st.sub}}>{s.country}</div>
                    {s.completed_at && <div style={{fontSize:7,fontFamily:"'Courier New',monospace",color:st.sub,opacity:.7,marginTop:1}}>{new Date(s.completed_at).toLocaleDateString("en",{month:"short",year:"numeric"})}</div>}
                  </div>
                </div>
              );
            })}
            {Array.from({length:Math.max(0,6-stamps.length)}).map((_,i)=>(
              <div key={`e${i}`} style={{border:"1.5px dashed rgba(90,60,16,.14)",borderRadius:4,aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:16,opacity:.12,color:"#5a3a10"}}>✦</span>
              </div>
            ))}
          </div>
        )}
        <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 22px 18px",borderTop:".5px solid rgba(90,60,16,.15)"}}>
          <span style={{fontSize:11,color:"#5a3a10",fontWeight:500}}>{stamps.length} of 10 stamps collected</span>
          <button onClick={() => goTo("id")} style={{padding:"10px 24px",border:"1px solid #8a6a20",borderRadius:999,fontSize:9,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a20",background:"transparent",cursor:"pointer"}}>
            ← ID page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,width:"100%",maxWidth:540,margin:"0 auto"}}>

      {/* TABS */}
      <div style={{display:"flex",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",background:"color-mix(in srgb, var(--bg2) 60%, transparent)"}}>
        {PASSPORT_PAGES.map((p) => (
          <button key={p} onClick={() => goTo(p)} disabled={flipping} style={{padding:"11px 22px",fontSize:11,fontWeight:800,letterSpacing:"0.16em",textTransform:"uppercase",color: page===p ? "#C9A86A" : "var(--dim)",background: page===p ? "rgba(201,168,106,0.08)" : "none",border:"none",borderRight:"1px solid var(--border)",cursor: flipping ? "default" : "pointer",transition:"all .2s",fontFamily:"Inter,sans-serif"}}>
            {p === "cover" ? "Cover" : p === "id" ? "ID Page" : `Stamps (${stamps.length})`}
          </button>
        ))}
      </div>

      {/* PASSPORT — eigenständiges Reisepass-Design, bewusst unverändert (eigene Materialfarben: dunkelgrünes Leder / cremefarbenes Papier, unabhängig vom Light/Dark-Theme der Seite) */}
      <div style={{width:"100%",position:"relative",perspective:2400}}>
        <style>{`
          @keyframes ppFlipFwd {
            0%   { transform: rotateY(0deg);    filter: brightness(1); }
            48%  { filter: brightness(.5); }
            52%  { filter: brightness(.5); }
            100% { transform: rotateY(-179deg); filter: brightness(1); }
          }
          @keyframes ppFlipBack {
            0%   { transform: rotateY(0deg);   filter: brightness(1); }
            48%  { filter: brightness(.5); }
            52%  { filter: brightness(.5); }
            100% { transform: rotateY(179deg); filter: brightness(1); }
          }
          @keyframes ppShadeFwd { 0%{opacity:0;} 46%{opacity:.45;} 54%{opacity:.45;} 100%{opacity:0;} }
          @keyframes ppShadeBack { 0%{opacity:0;} 46%{opacity:.45;} 54%{opacity:.45;} 100%{opacity:0;} }
          .pp-flip-layer {
            position:absolute; inset:0;
            transform-style:preserve-3d;
            backface-visibility:hidden;
            -webkit-backface-visibility:hidden;
            will-change:transform,filter;
            box-shadow:0 24px 70px rgba(0,0,0,.55);
            border-radius:4px 14px 14px 4px;
          }
          .pp-flip-layer.fwd  { transform-origin:left center;  animation:ppFlipFwd .68s cubic-bezier(.45,.1,.2,1) forwards; }
          .pp-flip-layer.back { transform-origin:right center; animation:ppFlipBack .68s cubic-bezier(.45,.1,.2,1) forwards; }
          .pp-flip-shade { position:absolute; inset:0; pointer-events:none; border-radius:inherit; }
          .pp-flip-layer.fwd  .pp-flip-shade { background:linear-gradient(to right, rgba(0,0,0,.6), transparent 65%); animation:ppShadeFwd .68s cubic-bezier(.45,.1,.2,1) forwards; }
          .pp-flip-layer.back .pp-flip-shade { background:linear-gradient(to left, rgba(0,0,0,.6), transparent 65%);  animation:ppShadeBack .68s cubic-bezier(.45,.1,.2,1) forwards; }
        `}</style>

        {renderPage(page)}

        {flipping && prevIndex !== null && (
          <div className={`pp-flip-layer ${direction}`}>
            {renderPage(PASSPORT_PAGES[prevIndex])}
            <div className="pp-flip-shade" />
          </div>
        )}
      </div>
    </div>
  );
}

const SUBTAB_META: Record<string, { title: string; subtitle: string; icon: ReactNode }> = {
  account:       { title: "Account",            subtitle: "Manage your personal information and login details.", icon: <User size={20} strokeWidth={1.8} /> },
  pass:          { title: "Traveller Pass",      subtitle: "Your digital passport — stamps, routes and identity.", icon: <Award size={20} strokeWidth={1.8} /> },
  preferences:   { title: "Preferences",         subtitle: "Units, language, map style and recommendations.",      icon: <SettingsIcon size={20} strokeWidth={1.8} /> },
  notifications: { title: "Notifications",       subtitle: "Choose what you want to be notified about.",           icon: <Bell size={20} strokeWidth={1.8} /> },
  privacy:       { title: "Privacy & Security",  subtitle: "Control your visibility and data.",                    icon: <ShieldCheck size={20} strokeWidth={1.8} /> },
  support:       { title: "Support & Feedback",  subtitle: "Get help or send us your feedback.",                   icon: <LifeBuoy size={20} strokeWidth={1.8} /> },
  about:         { title: "About",               subtitle: "Version, legal and app information.",                  icon: <Info size={20} strokeWidth={1.8} /> },
};

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
  const [navScrolled, setNavScrolled]     = useState(false);
  const [stamps, setStamps]               = useState<Stamp[]>([]);
  // NEU: Delete-Account-Flow (Bestätigungsdialog + Status)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // NEU (Mobile): Popup-Menü, identisch zum Muster auf About-/Route-Detail-Seite
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const [subTab, setSubTab] = useState<
    "account" | "pass" | "preferences" | "notifications" | "privacy" | "support" | "about"
  >("account");

  const [toggles, setToggles] = useState({
    nearbyRoutes: true,
    tripReminders: true,
    communityUpdates: false,
    profileVisible: true,
    activityTracking: true,
  });

  function toggleSwitch(key: keyof typeof toggles) {
    setToggles((t) => ({ ...t, [key]: !t[key] }));
  }

  const { theme } = useTheme();
  const { unit, setUnit } = useUnit();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // NEU (Mobile): Body-Scroll sperren, solange das Popup-Menü offen ist
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      if (!u) { router.push("/"); return; }
      setUser(u);
      fetchProfile(u.id);
      fetchStamps(u.id);
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

  async function fetchStamps(userId: string) {
    const { data } = await supabase
      .from("saved_routes")
      .select("id, title, country, terrain, completed_at")
      .eq("user_id", userId);
    if (data && data.length > 0) setStamps(data);
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

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    setDeleteError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setDeleteError("Your session has expired. Please log in again.");
        setDeleting(false);
        return;
      }

      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        setDeleteError(result?.error || "Something went wrong while deleting your account.");
        setDeleting(false);
        return;
      }

      // Löschung erfolgreich — client-seitig ausloggen und zur Startseite
      await supabase.auth.signOut();
      router.push("/");
    } catch (err: any) {
      setDeleteError(err?.message || "Something went wrong while deleting your account.");
      setDeleting(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0c0b09", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: "2px solid rgba(201,168,106,0.15)", borderTopColor: "#C9A86A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const initials = (username || user?.email || "U")[0].toUpperCase();
  const meta = SUBTAB_META[subTab];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');
        :root {
          --gold:  #C9A86A;
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans:  'Inter', system-ui, sans-serif;
        }

        .light { --gold: #B08A3F; }

        /* DARK THEME (Standard) */
        .dark {
          --bg:    #0c0b09;
          --bg2:   #111009;
          --bg3:   #181510;
          --cream: #EDE5D4;
          --muted: rgba(237,229,212,0.56);
          --dim:   rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.10);
        }

        /* LIGHT THEME — klar, warm, hoher Kontrast statt blassem Creme-Einheitsbrei */
        .light {
          --bg:    #FAF6EE;
          --bg2:   #FFFFFF;
          --bg3:   #F1EADA;
          --cream: #221C13;
          --muted: rgba(34,28,19,0.68);
          --dim:   rgba(34,28,19,0.44);
          --border:rgba(34,28,19,0.14);
        }

        .pp *, .pp *::before, .pp *::after { box-sizing:border-box; margin:0; padding:0; }
        .pp a { color:inherit; text-decoration:none; }
        .pp button { border:none; font:inherit; cursor:pointer; background:none; }
        .pp input, .pp select { font:inherit; }
        .pp { min-height:100vh; background:var(--bg); color:var(--cream); font-family:var(--sans); }

        .pp-bg { position:fixed; inset:0; z-index:0; }
        .pp-bg img { width:100%; height:100%; object-fit:cover; object-position:center 40%; filter:brightness(0.28) contrast(1.1) saturate(0.7); }
        .pp-bg::after { content:""; position:absolute; inset:0; background:linear-gradient(135deg, color-mix(in srgb, var(--bg) 88%, transparent) 0%, color-mix(in srgb, var(--bg) 60%, transparent) 50%, color-mix(in srgb, var(--bg) 82%, transparent) 100%); }
        .light .pp-bg img { filter:brightness(0.78) contrast(1.12) saturate(1.05); }
        .light .pp-bg::after { background:linear-gradient(135deg, rgba(250,246,238,0.92) 0%, rgba(250,246,238,0.7) 50%, rgba(250,246,238,0.9) 100%); }

        .pp-nav { position:fixed; inset:0 0 auto; z-index:200; height:72px; padding:0 clamp(20px,4vw,60px); display:flex; align-items:center; justify-content:space-between; background:transparent; border-bottom:1px solid transparent; transition:background .35s,border-color .35s; }
        .pp-nav.scrolled { background:color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter:blur(20px); border-bottom-color:var(--border); }
        .pp-nav-logo { display:flex; flex-direction:column; line-height:1; }
        .pp-nav-logo span { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .pp-nav-links { display:flex; gap:36px; }
        .pp-nav-link { position:relative; font-size:13px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); opacity:0.5; transition:color .2s, opacity .2s; }
        .pp-nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .pp-nav-link:hover { color:var(--cream); opacity:1; }
        .pp-nav-link:hover::after { width:100%; }
        .pp-nav-link-active { color:var(--cream) !important; font-weight:700; opacity:1; }
        .pp-nav-right { display:flex; align-items:center; justify-content:flex-end; }
        @media (max-width:680px) { .pp-nav-links { display:none; } .pp-nav-right { display:none; } }

        /* THEME SWITCH — glasmorpher Apple-Stil */
        /* !important auf border/background sichert den Gold-Hover-Rand gegen den globalen
           .pg button Reset ab (dieser überschreibt sonst border:none/background:none). */
        .theme-switch { position:relative; display:flex; align-items:center; width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 70%, transparent) !important; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--border) !important; box-shadow:0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06); cursor:pointer; transition:background .35s, border-color .35s; flex-shrink:0; }
        .theme-switch:hover { border-color: var(--gold) !important; }
        .theme-switch-knob { position:absolute; top:4.5px; left:3.5px; width:22px; height:22px; border-radius:50%; background:linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(237,229,212,0.85)); box-shadow:0 4px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.6); display:flex; align-items:center; justify-content:center; transition:transform .45s cubic-bezier(0.22,1,0.36,1); }
        .theme-switch-knob.is-light { transform:translateX(36px); }
        .theme-switch-icon { width:14px; height:14px; }
        .theme-switch-placeholder { width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 50%, transparent); border:1px solid var(--border); flex-shrink:0; }

        .pp-layout { position:relative; z-index:10; min-height:100vh; padding:112px clamp(20px,4vw,60px) 60px; display:flex; justify-content:center; }

        /* ── SETTINGS-STYLE PAGE ── */
        .st-wrap { width:100%; max-width:1180px; display:flex; flex-direction:column; gap:24px; }
        .st-megacard { background:color-mix(in srgb, var(--bg2) 82%, transparent); border:1px solid var(--border); border-radius:28px; padding:28px; box-shadow:0 40px 100px rgba(0,0,0,0.45); display:flex; flex-direction:column; gap:24px; }
        .light .st-megacard { background:#FFFFFF; box-shadow:0 30px 80px rgba(58,44,16,0.12); }

        .st-header { display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap; padding-bottom:24px; border-bottom:1px solid var(--border); }
        .st-header-left { display:flex; align-items:center; gap:14px; }
        .st-header-icon { width:42px; height:42px; border-radius:12px; background:rgba(201,168,106,0.1); border:1px solid rgba(201,168,106,0.25); display:flex; align-items:center; justify-content:center; color:var(--gold); flex-shrink:0; }
        .st-title { font-family:var(--serif); font-size:26px; font-weight:300; color:var(--cream); letter-spacing:-0.01em; line-height:1.1; }
        .st-subtitle { font-size:12px; color:var(--dim); margin-top:3px; font-weight:300; }
        .st-header .st-save-btn { padding:8px 16px; border-radius:10px; background:none; font-family:var(--serif); font-size:20px; font-weight:500; font-style:normal; letter-spacing:-0.01em; transition:all .2s; flex-shrink:0; }
        .dark .st-header .st-save-btn { color:#FFFFFF; }
        .light .st-header .st-save-btn { color:#000000; }
        .st-header .st-save-btn:hover { background:var(--gold); transform:translateY(-1px); }
        .dark .st-header .st-save-btn:hover { color:#1a1404; }
        .light .st-header .st-save-btn:hover { color:#1a1404; }
        .st-header .st-save-btn:disabled { opacity:0.5; cursor:not-allowed; }

        .st-body { display:grid; grid-template-columns:230px 1fr; gap:0; align-items:start; padding-top:24px; }
        .st-subnav { border-right:1px solid var(--border); padding-right:18px; display:flex; flex-direction:column; gap:2px; }
        .st-subnav-item { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:10px; font-size:12px; font-weight:600; color:var(--dim); transition:all .18s; width:100%; text-align:left; }
        .st-subnav-item:hover { color:var(--muted); background:color-mix(in srgb, var(--border) 40%, transparent); }
        .st-subnav-item.active { color:var(--gold); background:rgba(201,168,106,0.1); }
        .st-subnav-item svg { flex-shrink:0; }
        .st-subnav-divider { height:1px; background:var(--border); margin:6px 4px; }
        .st-subnav-logout { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:10px; font-size:12px; font-weight:600; color:rgba(224,128,128,0.55); transition:all .18s; width:100%; text-align:left; }
        .st-subnav-logout:hover { color:#e08080; background:rgba(224,128,128,0.07); }

        .st-content { display:grid; grid-template-columns:1fr; max-width:560px; padding-left:28px; }
        .st-content.wide { max-width:none; padding-left:28px; }
        .st-card { background:none; border:none; border-radius:0; padding:0; display:flex; flex-direction:column; gap:16px; }
        .st-card-title { font-size:9px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--gold); }

        .st-profile-head { display:flex; align-items:center; gap:16px; padding-bottom:16px; border-bottom:1px solid var(--border); position:relative; }
        .st-avatar-wrap { position:relative; flex-shrink:0; }
        .st-avatar-lg { width:64px; height:64px; border-radius:16px; object-fit:cover; border:1px solid rgba(201,168,106,0.3); display:block; }
        .st-avatar-lg-placeholder { width:64px; height:64px; border-radius:16px; background:rgba(201,168,106,0.12); border:1px solid rgba(201,168,106,0.3); display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:24px; color:var(--gold); }
        .st-avatar-edit { position:absolute; bottom:-5px; right:-5px; width:21px; height:21px; border-radius:50%; background:var(--gold); border:2px solid var(--bg2); display:flex; align-items:center; justify-content:center; font-size:9px; color:var(--bg); cursor:pointer; transition:transform .2s; }
        .light .st-avatar-edit { border-color:#FFFFFF; }
        .st-avatar-edit:hover { transform:scale(1.15); }
        .st-profile-name { font-family:var(--serif); font-size:18px; font-weight:400; color:var(--cream); }
        .st-profile-email { font-size:11px; color:var(--dim); margin-top:1px; }
        .st-profile-role { font-size:9px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold); margin-top:5px; opacity:0.85; }

        .st-field { display:flex; flex-direction:column; gap:6px; }
        .st-field-label { font-size:9px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:var(--dim); }
        .st-input { width:100%; padding:12px 14px; background:color-mix(in srgb, var(--border) 35%, transparent); border:1px solid var(--border); border-radius:10px; color:var(--cream); font-size:13px; outline:none; transition:all .25s; }
        .st-input::placeholder { color:var(--dim); }
        .st-input:focus { border-color:rgba(201,168,106,0.45); background:color-mix(in srgb, var(--border) 55%, transparent); box-shadow:0 0 0 3px rgba(201,168,106,0.09); }
        .light .st-input { background:#FBF8F2; border-color:rgba(34,28,19,0.16); }
        .light .st-input:focus { background:#FFFFFF; }
        .st-divider { height:1px; background:var(--border); margin:2px 0; }
        .st-error   { font-size:12px; color:#e08080; padding:10px 14px; background:rgba(224,128,128,0.08); border:1px solid rgba(224,128,128,0.18); border-radius:10px; }
        .st-success { font-size:12px; color:#86c9a0; padding:10px 14px; background:rgba(134,201,160,0.08); border:1px solid rgba(134,201,160,0.18); border-radius:10px; }

        .st-row { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:11px 0; border-bottom:1px solid var(--border); }
        .st-row:last-child { border-bottom:none; padding-bottom:0; }
        .st-row-label { font-size:12px; font-weight:600; color:var(--cream); }
        .st-row-sub { font-size:11px; color:var(--dim); margin-top:2px; line-height:1.5; max-width:280px; }
        .st-row-value { font-size:12px; color:var(--dim); display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .st-row-clickable { cursor:pointer; transition:opacity .2s; }
        .st-row-clickable:hover { opacity:0.7; }
        .st-row-danger .st-row-label { color:#e08080; }
        .st-select { background:none; border:none; font:inherit; font-size:12px; color:var(--dim); cursor:pointer; }

        .st-content .st-toggle { position:relative; width:38px; height:22px; border-radius:999px; background:var(--border); flex-shrink:0; transition:background .25s; cursor:pointer; }
        .st-toggle.on { background:var(--gold); }
        .st-toggle-knob { position:absolute; top:2px; left:2px; width:18px; height:18px; border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.3); transition:transform .25s; }
        .st-toggle.on .st-toggle-knob { transform:translateX(16px); }



        @media (max-width:760px) { .st-body { grid-template-columns:1fr; } .st-subnav { position:static; flex-direction:row; overflow-x:auto; } }

        /* ==================================================================
           NEU (Mobile-Design) — ab hier ausschließlich neue Regeln/Klassen.
           Nichts oberhalb dieser Zeile wurde verändert. Die Basis-Regeln hier
           (außerhalb der @media-Blöcke) sind bewusst wirkungslos für PC.
           ================================================================== */

        .mobile-only { display:none; }

        /* Hamburger-Button */
        .pp-mobile-menu-btn { width:42px; height:42px; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:50%; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent) !important; flex-shrink:0; }

        /* Popup-Menü (zentriertes Fenster), identisch im Aufbau zu About-/Route-Detail-Seite */
        .pp-mobile-nav-backdrop { position:fixed; inset:0; z-index:400; background:rgba(0,0,0,0.55); backdrop-filter:blur(2px); opacity:0; pointer-events:none; transition:opacity .3s; }
        .pp-mobile-nav-backdrop.open { opacity:1; pointer-events:auto; }
        .pp-mobile-nav-drawer { position:fixed; top:50%; left:50%; z-index:401; width:min(380px,88vw); max-height:85vh; overflow-y:auto; background:var(--bg); border:1px solid var(--border); border-radius:26px; box-shadow:0 50px 120px rgba(0,0,0,0.55); opacity:0; pointer-events:none; transform:translate(-50%,-50%) scale(0.94); transition:opacity .28s ease, transform .28s ease; padding:22px 22px 26px; }
        .pp-mobile-nav-drawer.open { opacity:1; pointer-events:auto; transform:translate(-50%,-50%) scale(1); }
        .pp-mobile-nav-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
        .pp-mobile-nav-close { width:38px; height:38px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:1px solid var(--border); color:var(--cream); background:none !important; }

        .pp-mobile-profile-card { border:1px solid var(--border); border-radius:20px; background:color-mix(in srgb, var(--bg2) 80%, transparent); overflow:hidden; }
        .pp-mobile-profile-head { padding:18px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:14px; }
        .pp-mobile-avatar { width:46px; height:46px; border-radius:14px; border:1px solid rgba(201,168,106,0.3); background:rgba(201,168,106,0.12); display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:20px; color:var(--gold); overflow:hidden; flex-shrink:0; }
        .pp-mobile-avatar img { width:100%; height:100%; object-fit:cover; }
        .pp-mobile-name { font-family:var(--serif); font-size:17px; font-weight:400; color:var(--cream); line-height:1.2; }
        .pp-mobile-email { font-size:10px; color:var(--dim); margin-top:2px; }
        .pp-mobile-role { font-size:8px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold); margin-top:4px; opacity:0.8; }
        .pp-mobile-theme-row { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid var(--border); }
        .pp-mobile-theme-label { font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); }
        .pp-mobile-section-label { font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--dim); padding:14px 12px 6px; }
        .pp-mobile-links { padding:8px; }
        .pp-mobile-link { display:flex; align-items:center; gap:12px; width:100%; padding:11px 12px; border-radius:10px; font-size:13px; font-weight:600; color:var(--dim); transition:all .18s; }
        .pp-mobile-link:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
        .pp-mobile-link.active { color:var(--gold); background:rgba(201,168,106,0.1); }
        .pp-mobile-link-icon { width:18px; display:flex; align-items:center; justify-content:center; color:var(--gold); flex-shrink:0; }
        .pp-mobile-divider { height:1px; background:var(--border); margin:4px 8px; }
        .pp-mobile-logout { display:flex; align-items:center; gap:12px; width:100%; padding:11px 12px; border-radius:10px; font-size:13px; font-weight:600; color:rgba(224,128,128,0.55); }
        .pp-mobile-logout:hover { background:rgba(224,128,128,0.07); color:#e08080; }

        /* Mobile Subnav — horizontale Pill-Tabs statt Sidebar */
        .pp-mobile-subnav { display:none; gap:8px; overflow-x:auto; padding-bottom:4px; margin:0 0 18px; scrollbar-width:none; }
        .pp-mobile-subnav::-webkit-scrollbar { display:none; }
        .pp-mobile-subnav-item { flex-shrink:0; display:flex; align-items:center; gap:7px; padding:9px 16px; border-radius:999px; border:1px solid var(--border); font-size:11px; font-weight:700; letter-spacing:0.04em; color:var(--dim); background:color-mix(in srgb, var(--bg2) 60%, transparent); white-space:nowrap; }
        .pp-mobile-subnav-item.active { color:var(--gold); border-color:rgba(201,168,106,0.4); background:rgba(201,168,106,0.1); }

        /* Traveller Pass auf Mobile herunterskalieren, damit die feste Breite nicht überläuft.
           Ohne Media Query ist der Wrapper ein reiner No-Op (kein Effekt auf PC). */
        .pp-pass-scale-wrap { }

        @media (max-width:760px) {
          .pp-mobile-menu-btn { display:flex; }
          .pp-mobile-subnav { display:flex; }
          .st-subnav { display:none; }

          .pp-layout { padding:84px 16px 40px; }
          .st-megacard { padding:18px; border-radius:22px; box-shadow:0 24px 60px rgba(0,0,0,0.35); }
          .st-header { flex-direction:column; align-items:flex-start; gap:14px; padding-bottom:18px; }
          .st-header .st-save-btn { width:100%; text-align:center; background:color-mix(in srgb, var(--border) 40%, transparent); }
          .st-title { font-size:21px; }

          .st-body { padding-top:18px; }
          .st-content, .st-content.wide { padding-left:0; max-width:none; }
          .st-profile-head { flex-wrap:wrap; }

          .pp-pass-scale-wrap { transform:scale(0.8); transform-origin:top center; margin-bottom:-125px; width:125%; margin-left:-12.5%; }
        }

        @media (max-width:420px) {
          .pp-pass-scale-wrap { transform:scale(0.68); margin-bottom:-195px; width:147%; margin-left:-23.5%; }
        }
      `}</style>

      <div className="pp">
        <div className="pp-bg">
          <img src="/Stelvio Pass.jpg" alt="Scenic road" onError={e => { (e.currentTarget as HTMLImageElement).src = "/Pacific Route Highway.jpg"; }} />
        </div>

        <nav className={`pp-nav ${navScrolled ? "scrolled" : ""}`}>
          <Link href="/" className="pp-nav-logo">
            <span>SCENIC</span><span>ROUTES</span>
          </Link>
          <div className="pp-nav-links">
            <Link href="/explore"  className="pp-nav-link">Explore Routes</Link>
            <Link href="/about"    className="pp-nav-link">About</Link>
            <Link href="/my-trips" className="pp-nav-link">My Trips</Link>
          </div>
          <div className="pp-nav-right">
            <ThemeSwitch />
          </div>

          {/* NEU (Mobile): Hamburger-Button, öffnet das Popup-Menü */}
          <button
            className="pp-mobile-menu-btn mobile-only"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menü öffnen"
          >
            <Menu size={20} strokeWidth={1.8} />
          </button>
        </nav>

        {/* NEU (Mobile): Popup-Menü + Backdrop */}
        <div className={`pp-mobile-nav-backdrop ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(false)} />

        <div className={`pp-mobile-nav-drawer ${mobileMenuOpen ? "open" : ""}`}>
          <div className="pp-mobile-nav-top">
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em", color: "var(--cream)" }}>SCENIC ROUTES</span>
            <button className="pp-mobile-nav-close" onClick={() => setMobileMenuOpen(false)} aria-label="Menü schließen">
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>

          <div className="pp-mobile-profile-card">
            <div className="pp-mobile-profile-head">
              <div className="pp-mobile-avatar">
                {avatarPreview ? <img src={avatarPreview} alt="avatar" /> : initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="pp-mobile-name">{username || user?.email?.split("@")[0]}</p>
                <p className="pp-mobile-email">{user?.email}</p>
                <p className="pp-mobile-role">Scenic Route Explorer</p>
              </div>
            </div>

            <div className="pp-mobile-theme-row">
              <span className="pp-mobile-theme-label">Theme</span>
              <ThemeSwitch />
            </div>

            <div className="pp-mobile-links">
              <p className="pp-mobile-section-label">Navigate</p>
              <Link href="/explore" className="pp-mobile-link" onClick={() => setMobileMenuOpen(false)}>
                <span className="pp-mobile-link-icon"><Map size={14} strokeWidth={1.8} /></span>
                Explore Routes
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </Link>
              <Link href="/about" className="pp-mobile-link" onClick={() => setMobileMenuOpen(false)}>
                <span className="pp-mobile-link-icon"><Info size={14} strokeWidth={1.8} /></span>
                About
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </Link>
              <Link href="/my-trips" className="pp-mobile-link" onClick={() => setMobileMenuOpen(false)}>
                <span className="pp-mobile-link-icon"><Map size={14} strokeWidth={1.8} /></span>
                My Trips
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </Link>

              <div className="pp-mobile-divider" />

              <p className="pp-mobile-section-label">Profile Settings</p>
              {([
                { id: "account",       label: "Account",            icon: <User size={14} strokeWidth={1.8} /> },
                { id: "pass",          label: "Traveller Pass",     icon: <Award size={14} strokeWidth={1.8} /> },
                { id: "preferences",   label: "Preferences",        icon: <SettingsIcon size={14} strokeWidth={1.8} /> },
                { id: "notifications", label: "Notifications",      icon: <Bell size={14} strokeWidth={1.8} /> },
                { id: "privacy",       label: "Privacy & Security", icon: <ShieldCheck size={14} strokeWidth={1.8} /> },
                { id: "support",       label: "Support & Feedback", icon: <LifeBuoy size={14} strokeWidth={1.8} /> },
                { id: "about",         label: "About",              icon: <Info size={14} strokeWidth={1.8} /> },
              ] as const).map(({ id, label, icon }) => (
                <button
                  key={id}
                  className={`pp-mobile-link ${subTab === id ? "active" : ""}`}
                  onClick={() => { setSubTab(id); setMobileMenuOpen(false); }}
                >
                  <span className="pp-mobile-link-icon">{icon}</span>
                  {label}
                  <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
                </button>
              ))}

              <div className="pp-mobile-divider" />

              <button
                className="pp-mobile-logout"
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              >
                <span className="pp-mobile-link-icon" style={{ color: "#e08080" }}><LogOut size={14} strokeWidth={1.8} /></span>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="pp-layout">
          <div className="st-wrap">

            <div className="st-megacard">
              <div className="st-header">
                <div className="st-header-left">
                  <div className="st-header-icon">{meta.icon}</div>
                  <div>
                    <p className="st-title">{meta.title}</p>
                    <p className="st-subtitle">{meta.subtitle}</p>
                  </div>
                </div>
                {subTab === "account" && (
                <button className="st-save-btn" disabled={saving} onClick={handleSave}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                )}
              </div>

              <div className="st-body">
              {/* NEU (Mobile): horizontale Pill-Tabs statt Sidebar-Navigation */}
              <div className="pp-mobile-subnav mobile-only">
                {([
                  { id: "account",       label: "Account",      icon: <User size={13} strokeWidth={1.8} /> },
                  { id: "pass",          label: "Pass",          icon: <Award size={13} strokeWidth={1.8} /> },
                  { id: "preferences",   label: "Preferences",   icon: <SettingsIcon size={13} strokeWidth={1.8} /> },
                  { id: "notifications", label: "Notifications", icon: <Bell size={13} strokeWidth={1.8} /> },
                  { id: "privacy",       label: "Privacy",       icon: <ShieldCheck size={13} strokeWidth={1.8} /> },
                  { id: "support",       label: "Support",       icon: <LifeBuoy size={13} strokeWidth={1.8} /> },
                  { id: "about",         label: "About",         icon: <Info size={13} strokeWidth={1.8} /> },
                ] as const).map(({ id, label, icon }) => (
                  <button
                    key={id}
                    className={`pp-mobile-subnav-item ${subTab === id ? "active" : ""}`}
                    onClick={() => setSubTab(id)}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>

              {/* SUB-NAVIGATION */}
              <div className="st-subnav">
                {([
                  { id: "account",       label: "Account",            icon: <User size={15} strokeWidth={1.8} /> },
                  { id: "pass",          label: "Traveller Pass",     icon: <Award size={15} strokeWidth={1.8} /> },
                  { id: "preferences",   label: "Preferences",        icon: <SettingsIcon size={15} strokeWidth={1.8} /> },
                  { id: "notifications", label: "Notifications",      icon: <Bell size={15} strokeWidth={1.8} /> },
                  { id: "privacy",       label: "Privacy & Security", icon: <ShieldCheck size={15} strokeWidth={1.8} /> },
                  { id: "support",       label: "Support & Feedback", icon: <LifeBuoy size={15} strokeWidth={1.8} /> },
                  { id: "about",         label: "About",              icon: <Info size={15} strokeWidth={1.8} /> },
                ] as const).map(({ id, label, icon }) => (
                  <button
                    key={id}
                    className={`st-subnav-item ${subTab === id ? "active" : ""}`}
                    onClick={() => setSubTab(id)}
                  >
                    {icon} {label}
                  </button>
                ))}

                <div className="st-subnav-divider" />

                <button className="st-subnav-item" onClick={() => router.push("/my-trips")}>
                  <Map size={15} strokeWidth={1.8} /> My Trips
                </button>
                <button className="st-subnav-logout" onClick={handleLogout}>
                  <LogOut size={15} strokeWidth={1.8} /> Sign Out
                </button>
              </div>

              {/* CONTENT */}
              {subTab === "account" && (
                <div className="st-content">
                  <div className="st-card">
                    <div className="st-profile-head">
                      <div className="st-avatar-wrap">
                        {avatarPreview
                          ? <img src={avatarPreview} className="st-avatar-lg" alt="avatar" />
                          : <div className="st-avatar-lg-placeholder">{initials}</div>
                        }
                        <label className="st-avatar-edit" title="Change photo">
                          ✎
                          <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                        </label>
                      </div>
                      <div>
                        <p className="st-profile-name">{username || user?.email?.split("@")[0]}</p>
                        <p className="st-profile-email">{user?.email}</p>
                        <p className="st-profile-role">Scenic Route Explorer</p>
                      </div>
                    </div>

                    <p className="st-card-title">Profile Information</p>
                    <div className="st-field">
                      <label className="st-field-label">Username</label>
                      <input className="st-input" type="text" placeholder="Your username" value={username} onChange={e => setUsername(e.target.value)} />
                    </div>
                    <div className="st-field">
                      <label className="st-field-label">Email</label>
                      <input className="st-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>

                    <div className="st-divider" />

                    <p className="st-card-title">Change Password</p>
                    <div className="st-field">
                      <label className="st-field-label">New Password</label>
                      <input className="st-input" type="password" placeholder="Leave blank to keep current" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <div className="st-field">
                      <label className="st-field-label">Confirm New Password</label>
                      <input className="st-input" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>

                    {error   && <p className="st-error">{error}</p>}
                    {success && <p className="st-success">{success}</p>}

                    <div className="st-divider" />

                    <div
                      className="st-row st-row-clickable st-row-danger"
                      onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(""); setDeleteError(""); }}
                      role="button"
                      tabIndex={0}
                    >
                      <div>
                        <p className="st-row-label">Delete Account</p>
                        <p className="st-row-sub">Permanently delete your account and data.</p>
                      </div>
                      <ChevronRight size={15} color="#e08080" />
                    </div>
                  </div>
                </div>
              )}

              {subTab === "pass" && (
                <div className="st-content wide">
                  <div className="pp-pass-scale-wrap">
                    <TravellerPass
                      username={username}
                      email={user?.email || ""}
                      avatarPreview={avatarPreview}
                      initials={initials}
                      stamps={stamps}
                    />
                  </div>
                </div>
              )}

              {subTab === "preferences" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">Preferences</p>
                    <div className="st-row">
                      <span className="st-row-label">Distance Unit</span>
                      <select
                        className="st-select"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value as "km" | "mi")}
                      >
                        <option value="km">Kilometers</option>
                        <option value="mi">Miles</option>
                      </select>
                    </div>
                    <div className="st-row">
                      <span className="st-row-label">Language</span>
                      <select className="st-select" defaultValue="en"><option value="en">English</option><option value="de">Deutsch</option></select>
                    </div>
                    <div className="st-row">
                      <span className="st-row-label">Start Page</span>
                      <select className="st-select" defaultValue="explore"><option value="explore">Explore</option><option value="trips">My Trips</option></select>
                    </div>
                    <div className="st-row">
                      <span className="st-row-label">Default Map Style</span>
                      <select className="st-select" defaultValue="scenic"><option value="scenic">Scenic</option><option value="satellite">Satellite</option></select>
                    </div>
                  </div>
                </div>
              )}

              {subTab === "notifications" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">Notifications</p>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label">New Routes Nearby</p>
                        <p className="st-row-sub">Get notified about newly recommended routes near you.</p>
                      </div>
                      <button className={`st-toggle ${toggles.nearbyRoutes ? "on" : ""}`} onClick={() => toggleSwitch("nearbyRoutes")}><span className="st-toggle-knob" /></button>
                    </div>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label">Trip Reminders</p>
                        <p className="st-row-sub">Get reminders for upcoming planned trips.</p>
                      </div>
                      <button className={`st-toggle ${toggles.tripReminders ? "on" : ""}`} onClick={() => toggleSwitch("tripReminders")}><span className="st-toggle-knob" /></button>
                    </div>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label">Community Updates</p>
                        <p className="st-row-sub">News and updates from Scenic Routes.</p>
                      </div>
                      <button className={`st-toggle ${toggles.communityUpdates ? "on" : ""}`} onClick={() => toggleSwitch("communityUpdates")}><span className="st-toggle-knob" /></button>
                    </div>
                    <div className="st-row st-row-clickable">
                      <span className="st-row-label">Email Settings</span>
                      <ChevronRight size={15} color="var(--dim)" />
                    </div>
                  </div>
                </div>
              )}

              {subTab === "privacy" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">Privacy & Security</p>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label">Make Profile Visible</p>
                        <p className="st-row-sub">Your profile is visible to other users.</p>
                      </div>
                      <button className={`st-toggle ${toggles.profileVisible ? "on" : ""}`} onClick={() => toggleSwitch("profileVisible")}><span className="st-toggle-knob" /></button>
                    </div>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label">Track Activity</p>
                        <p className="st-row-sub">Save your activity for personal statistics.</p>
                      </div>
                      <button className={`st-toggle ${toggles.activityTracking ? "on" : ""}`} onClick={() => toggleSwitch("activityTracking")}><span className="st-toggle-knob" /></button>
                    </div>
                  </div>
                </div>
              )}

              {subTab === "support" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">Support & Feedback</p>
                    <div className="st-row st-row-clickable">
                      <span className="st-row-label">FAQ</span>
                      <ChevronRight size={15} color="var(--dim)" />
                    </div>
                    <div className="st-row st-row-clickable">
                      <span className="st-row-label">Contact Us</span>
                      <ChevronRight size={15} color="var(--dim)" />
                    </div>
                    <div className="st-row st-row-clickable">
                      <span className="st-row-label">Tutorials & Help Articles</span>
                      <ChevronRight size={15} color="var(--dim)" />
                    </div>
                    <div className="st-row st-row-clickable">
                      <span className="st-row-label">Send Feedback</span>
                      <ChevronRight size={15} color="var(--dim)" />
                    </div>
                  </div>
                </div>
              )}

              {subTab === "about" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">About</p>
                    <div className="st-row"><span className="st-row-label">Version</span><span className="st-row-value">1.0.0</span></div>
                    <div className="st-row st-row-clickable"><span className="st-row-label">Terms of Use</span><ChevronRight size={15} color="var(--dim)" /></div>
                    <div className="st-row st-row-clickable"><span className="st-row-label">Privacy Policy</span><ChevronRight size={15} color="var(--dim)" /></div>
                    <div className="st-row st-row-clickable"><span className="st-row-label">Impressum</span><ChevronRight size={15} color="var(--dim)" /></div>
                  </div>
                </div>
              )}
              </div>
            </div>

          </div>
        </div>

        {/* Delete-Account-Bestätigungsdialog */}
        {showDeleteConfirm && (
          <>
            <div
              onClick={() => !deleting && setShowDeleteConfirm(false)}
              style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
            />
            <div
              style={{
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                zIndex: 501, width: "min(420px,90vw)", background: "var(--bg2)",
                border: "1px solid var(--border)", borderRadius: 22,
                boxShadow: "0 50px 120px rgba(0,0,0,0.55)", padding: 28,
              }}
            >
              <p style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 400, color: "#e08080", marginBottom: 10 }}>
                Delete your account?
              </p>
              <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6, marginBottom: 18 }}>
                This will permanently delete your account, saved routes, and profile data. This action cannot be undone.
              </p>

              <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--dim)", display: "block", marginBottom: 6 }}>
                Type DELETE to confirm
              </label>
              <input
                className="st-input"
                type="text"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                style={{ marginBottom: 14 }}
              />

              {deleteError && <p className="st-error" style={{ marginBottom: 14 }}>{deleteError}</p>}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 999, border: "1px solid var(--border)",
                    background: "transparent", color: "var(--cream)", fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.08em", cursor: deleting ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || deleting}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 999, border: "1px solid #e08080",
                    background: deleteConfirmText === "DELETE" ? "#e08080" : "transparent",
                    color: deleteConfirmText === "DELETE" ? "#1a0a0a" : "#e08080",
                    fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                    cursor: deleteConfirmText !== "DELETE" || deleting ? "not-allowed" : "pointer",
                    opacity: deleteConfirmText !== "DELETE" || deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? "Deleting…" : "Delete Account"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}