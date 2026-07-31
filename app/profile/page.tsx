"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getSupabaseConsent, persistConsent } from "../../lib/cookieConsent";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { useTheme } from "next-themes";
import { useUnit } from "../UnitContext";
import { useLanguage } from "../LanguageContext";
import type { TranslationKey } from "@/lib/translations";
import {
  User, Award, Settings as SettingsIcon, Map, LogOut,
  Bell, ShieldCheck, LifeBuoy, Info,
  ChevronRight, ChevronDown, Menu, X,
  Mail, Lock, Smartphone, Monitor, CheckCircle2,
  Camera, Compass, Globe, Bookmark, TrendingUp,
  Calendar, MapPin, AlertTriangle, Circle,
} from "lucide-react";

type Stamp = {
  id: string;
  title: string;
  country: string;
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

  function renderPage(p: PassportPageId) {
    if (p === "cover") {
  return (
    <div style={{background:"linear-gradient(160deg,#0e1a0e 0%,#142114 50%,#0e1a0e 100%)",borderRadius:"4px 14px 14px 4px",borderLeft:"8px solid #0a150a",minHeight:620,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"50px 44px 44px",boxShadow:"4px 4px 28px rgba(0,0,0,.7),-1px 0 0 #1e2e1e",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0px,rgba(255,255,255,.018) 1px,transparent 1px,transparent 10px),repeating-linear-gradient(-45deg,rgba(255,255,255,.018) 0px,rgba(255,255,255,.018) 1px,transparent 1px,transparent 10px)"}}/>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
        <span style={{fontSize:10,letterSpacing:".32em",textTransform:"uppercase",color:"rgba(200,180,110,.5)",fontWeight:400}}>International</span>
      </div>

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
                    <div style={{fontSize:19,lineHeight:1,color:st.icon}}>◎</div>
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

      <div style={{display:"flex",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",background:"color-mix(in srgb, var(--bg2) 60%, transparent)"}}>
        {PASSPORT_PAGES.map((p) => (
          <button key={p} onClick={() => goTo(p)} disabled={flipping} style={{padding:"11px 22px",fontSize:11,fontWeight:800,letterSpacing:"0.16em",textTransform:"uppercase",color: page===p ? "#C9A86A" : "var(--dim)",background: page===p ? "rgba(201,168,106,0.08)" : "none",border:"none",borderRight:"1px solid var(--border)",cursor: flipping ? "default" : "pointer",transition:"all .2s",fontFamily:"Inter,sans-serif"}}>
            {p === "cover" ? "Cover" : p === "id" ? "ID Page" : `Stamps (${stamps.length})`}
          </button>
        ))}
      </div>

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

const SUBTAB_META: Record<string, { titleKey: TranslationKey; subtitleKey: TranslationKey; icon: ReactNode }> = {
  profile:       { titleKey: "profile.subtab.profile.title",       subtitleKey: "profile.subtab.profile.subtitle",       icon: <User size={20} strokeWidth={1.8} /> },
  pass:          { titleKey: "profile.subtab.pass.title",          subtitleKey: "profile.subtab.pass.subtitle",          icon: <Award size={20} strokeWidth={1.8} /> },
  preferences:   { titleKey: "prefs.title",                        subtitleKey: "prefs.subtitle",                        icon: <SettingsIcon size={20} strokeWidth={1.8} /> },
  email:         { titleKey: "profile.subtab.email.title",         subtitleKey: "profile.subtab.email.subtitle",         icon: <Mail size={20} strokeWidth={1.8} /> },
  password:      { titleKey: "profile.subtab.password.title",      subtitleKey: "profile.subtab.password.subtitle",      icon: <Lock size={20} strokeWidth={1.8} /> },
  twofa:         { titleKey: "profile.subtab.twofa.title",         subtitleKey: "profile.subtab.twofa.subtitle",         icon: <Smartphone size={20} strokeWidth={1.8} /> },
  sessions:      { titleKey: "profile.subtab.sessions.title",      subtitleKey: "profile.subtab.sessions.subtitle",      icon: <Monitor size={20} strokeWidth={1.8} /> },
  notifications: { titleKey: "profile.subtab.notifications.title", subtitleKey: "profile.subtab.notifications.subtitle", icon: <Bell size={20} strokeWidth={1.8} /> },
  privacy:       { titleKey: "profile.subtab.privacy.title",       subtitleKey: "profile.subtab.privacy.subtitle",       icon: <ShieldCheck size={20} strokeWidth={1.8} /> },
  support:       { titleKey: "profile.subtab.support.title",       subtitleKey: "profile.subtab.support.subtitle",       icon: <LifeBuoy size={20} strokeWidth={1.8} /> },
  about:         { titleKey: "profile.subtab.about.title",         subtitleKey: "profile.subtab.about.subtitle",         icon: <Info size={20} strokeWidth={1.8} /> },
};

const NAV_GROUPS = [
  {
    id: "account",
    labelKey: "profile.nav.account" as TranslationKey,
    icon: <User size={15} strokeWidth={1.8} />,
    items: [
      { id: "profile" as const,     labelKey: "profile.subtab.profile.title" as TranslationKey },
      { id: "preferences" as const, labelKey: "prefs.title" as TranslationKey },
    ],
  },
  {
    id: "security",
    labelKey: "profile.nav.security" as TranslationKey,
    icon: <ShieldCheck size={15} strokeWidth={1.8} />,
    items: [
      { id: "email" as const,    labelKey: "profile.subtab.email.title" as TranslationKey },
      { id: "password" as const, labelKey: "profile.subtab.password.title" as TranslationKey },
      { id: "twofa" as const,    labelKey: "profile.subtab.twofa.title" as TranslationKey },
      { id: "sessions" as const, labelKey: "profile.subtab.sessions.title" as TranslationKey },
    ],
  },
];

export default function ProfilePage() {
  const [user, setUser]                   = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [username, setUsername]           = useState("");
  const [email, setEmail]                 = useState("");
  const [avatarUrl, setAvatarUrl]         = useState("");

  // Profile tab — additional fields. NOTE: `profiles` table currently only has
  // username/avatar_url/email. To persist these, add columns display_name,
  // country, timezone, about (text) to `profiles` — until then these are
  // local-only and handleSaveProfile will silently skip them.
  const [displayName, setDisplayName]     = useState("");
  const [country, setCountry]             = useState("");
  const [timezone, setTimezone]           = useState("UTC+0");
  const [aboutYou, setAboutYou]           = useState("");
  const ABOUT_MAX = 250;
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");
  const [avatarFile, setAvatarFile]       = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [navScrolled, setNavScrolled]     = useState(false);
  const [stamps, setStamps]               = useState<Stamp[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const [subTab, setSubTab] = useState<
    "profile" | "pass" | "preferences" | "email" | "password" | "twofa" | "sessions" | "notifications" | "privacy" | "support" | "about"
  >("profile");

  const [accountGroupOpen, setAccountGroupOpen] = useState(true);
  const [securityGroupOpen, setSecurityGroupOpen] = useState(true);

  // Email Address tab
  const [newEmailInput, setNewEmailInput]         = useState("");
  const [confirmEmailPassword, setConfirmEmailPassword] = useState("");
  const [emailError, setEmailError]               = useState("");
  const [emailSuccess, setEmailSuccess]           = useState("");
  const [emailSaving, setEmailSaving]             = useState(false);

  // Password tab
  const [passwordError, setPasswordError]         = useState("");
  const [passwordSuccess, setPasswordSuccess]     = useState("");
  const [passwordSaving, setPasswordSaving]       = useState(false);

  // Sessions tab
  const [sessionsError, setSessionsError]         = useState("");
  const [sessionsSuccess, setSessionsSuccess]     = useState("");
  const [sessionsSaving, setSessionsSaving]       = useState(false);

  // Privacy tab — Google Maps consent, kept in sync with the same
  // cookie_consents table the cookie banner reads/writes, so toggling it
  // here has the same effect as changing it in the banner's settings.
  const [googleMapsConsent, setGoogleMapsConsent] = useState(false);
  const [mapsConsentSaving, setMapsConsentSaving] = useState(false);

  const [toggles, setToggles] = useState({
    nearbyRoutes: true,
    tripReminders: true,
    communityUpdates: false,
    activityTracking: true,
  });

  function toggleSwitch(key: keyof typeof toggles) {
    setToggles((t) => ({ ...t, [key]: !t[key] }));
  }

  async function handleGoogleMapsToggle() {
    if (!user || mapsConsentSaving) return;
    const nextValue = !googleMapsConsent;
    setMapsConsentSaving(true);
    setGoogleMapsConsent(nextValue);
    await persistConsent({ necessary: true, googleMaps: nextValue }, user.id);
    setMapsConsentSaving(false);
  }

  const { theme } = useTheme();
  const { unit, setUnit } = useUnit();
  const { lang, setLang, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // NEU: liest ?tab=... aus der URL beim Laden aus (z.B. vom Footer-Link
  // "Traveller Pass" -> /profile?tab=pass) und öffnet direkt den passenden
  // Sub-Tab, statt immer auf "account" zu starten.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const validTabs = ["profile", "pass", "preferences", "email", "password", "twofa", "sessions", "notifications", "privacy", "support", "about"] as const;
    if (tabParam && (validTabs as readonly string[]).includes(tabParam)) {
      setSubTab(tabParam as typeof subTab);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      getSupabaseConsent(u.id).then((consent) => {
        setGoogleMapsConsent(consent?.googleMaps ?? false);
      });
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
      // Optional columns — read if present (see note above `displayName` state).
      setDisplayName(data.display_name || data.username || "");
      setCountry(data.country || "");
      setTimezone(data.timezone || "UTC+0");
      setAboutYou(data.about || "");
    }
    setLoading(false);
  }

  // GEÄNDERT: saved_routes hat nur id/user_id/route_id/created_at — title/country
  // kommen jetzt per Join aus routes(...), completed_at nutzt created_at als
  // "wann gespeichert"-Zeitpunkt, terrain gibt es nicht (Feld komplett entfernt).
  async function fetchStamps(userId: string) {
    const { data } = await supabase
      .from("saved_routes")
      .select("id, created_at, routes(title, country)")
      .eq("user_id", userId);

    if (data && data.length > 0) {
      const mapped: Stamp[] = data.map((r: any) => ({
        id: r.id,
        title: r.routes?.title || "",
        country: r.routes?.country || "",
        completed_at: r.created_at,
      }));
      setStamps(mapped);
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSaveProfile() {
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
      .update({
        username,
        avatar_url: uploadedAvatarUrl,
        display_name: displayName,
        country,
        timezone,
        about: aboutYou,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (profileError) { setError(profileError.message); setSaving(false); return; }

    setSuccess("Profile updated successfully!");
    setAvatarUrl(uploadedAvatarUrl);
    setSaving(false);
  }

  async function handleChangeEmail() {
    setEmailSaving(true); setEmailError(""); setEmailSuccess("");

    if (!confirmEmailPassword) {
      setEmailError("Please enter your current password to confirm.");
      setEmailSaving(false);
      return;
    }
    if (!newEmailInput || newEmailInput === user?.email) {
      setEmailError("Please enter a new email address.");
      setEmailSaving(false);
      return;
    }

    // Verify the current password before allowing the email change
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: confirmEmailPassword,
    });
    if (verifyError) {
      setEmailError("Incorrect password.");
      setEmailSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ email: newEmailInput });
    if (updateError) {
      setEmailError(updateError.message);
      setEmailSaving(false);
      return;
    }

    setEmailSuccess("A verification link has been sent to your new email address.");
    setNewEmailInput("");
    setConfirmEmailPassword("");
    setEmailSaving(false);
  }

  async function handleChangePassword() {
    setPasswordSaving(true); setPasswordError(""); setPasswordSuccess("");

    if (!newPassword || !confirmPassword) {
      setPasswordError("Please fill in both fields.");
      setPasswordSaving(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      setPasswordSaving(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      setPasswordSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
      setPasswordSaving(false);
      return;
    }

    setPasswordSuccess("Password updated successfully.");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaving(false);
  }

  async function handleSignOutOthers() {
    setSessionsSaving(true); setSessionsError(""); setSessionsSuccess("");

    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) {
      setSessionsError(error.message);
      setSessionsSaving(false);
      return;
    }

    setSessionsSuccess("Signed out of all other sessions.");
    setSessionsSaving(false);
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
  const metaRaw = SUBTAB_META[subTab];
  const meta = { title: t(metaRaw.titleKey), subtitle: t(metaRaw.subtitleKey), icon: metaRaw.icon };

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

        .dark {
          --bg:    #0c0b09;
          --bg2:   #111009;
          --bg3:   #181510;
          --cream: #EDE5D4;
          --muted: rgba(237,229,212,0.56);
          --dim:   rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.10);
        }

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
        .pp-nav-logo span { font-size:11px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .pp-nav-links { display:flex; gap:36px; }
        .pp-nav-link { position:relative; font-size:13px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); opacity:0.5; transition:color .2s, opacity .2s; }
        .pp-nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .pp-nav-link:hover { color:var(--cream); opacity:1; }
        .pp-nav-link:hover::after { width:100%; }
        .pp-nav-link-active { color:var(--cream) !important; font-weight:700; opacity:1; }
        .pp-nav-right { display:flex; align-items:center; justify-content:flex-end; }
        @media (max-width:680px) { .pp-nav-links { display:none; } .pp-nav-right { display:none; } }

        .theme-switch { position:relative; display:flex; align-items:center; width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 70%, transparent) !important; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--border) !important; box-shadow:0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06); cursor:pointer; transition:background .35s, border-color .35s; flex-shrink:0; }
        .theme-switch:hover { border-color: var(--gold) !important; }
        .theme-switch-knob { position:absolute; top:4.5px; left:3.5px; width:22px; height:22px; border-radius:50%; background:linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(237,229,212,0.85)); box-shadow:0 4px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.6); display:flex; align-items:center; justify-content:center; transition:transform .45s cubic-bezier(0.22,1,0.36,1); }
        .theme-switch-knob.is-light { transform:translateX(36px); }
        .theme-switch-icon { width:14px; height:14px; }
        .theme-switch-placeholder { width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 50%, transparent); border:1px solid var(--border); flex-shrink:0; }

        .pp-layout { position:relative; z-index:10; min-height:100vh; padding:112px clamp(20px,4vw,60px) 60px; display:flex; justify-content:center; }

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
        .st-subnav-label { font-size:9px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--dim); padding:4px 12px 8px; }
        .st-subnav-item { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:10px; font-size:12px; font-weight:600; color:var(--dim); transition:all .18s; width:100%; text-align:left; }
        .st-subnav-item:hover { color:var(--muted); background:color-mix(in srgb, var(--border) 40%, transparent); }
        .st-subnav-item.active { color:var(--gold); background:rgba(201,168,106,0.1); }
        .st-subnav-item svg { flex-shrink:0; }
        .st-subnav-divider { height:1px; background:var(--border); margin:6px 4px; }
        .st-subnav-logout { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:10px; font-size:12px; font-weight:600; color:rgba(224,128,128,0.55); transition:all .18s; width:100%; text-align:left; }
        .st-subnav-logout:hover { color:#e08080; background:rgba(224,128,128,0.07); }

        .st-subnav-group { display:flex; flex-direction:column; gap:2px; margin-bottom:4px; }
        .st-subnav-group-title { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:10px; font-size:12px; font-weight:700; color:var(--cream); width:100%; text-align:left; }
        .st-subnav-group-title:hover { background:color-mix(in srgb, var(--border) 40%, transparent); }
        .st-subnav-group-title svg:first-child { flex-shrink:0; color:var(--gold); }
        .st-subnav-group-title span { flex:1; }
        .st-subnav-chevron { transition:transform .2s; opacity:0.6; flex-shrink:0; }
        .st-subnav-chevron.open { transform:rotate(180deg); }
        .st-subnav-sub { display:flex; flex-direction:column; gap:2px; padding-left:14px; }
        .st-subnav-item-sub { font-weight:500; padding:9px 12px; }

        .st-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; flex-shrink:0; }
        .st-badge-verified { color:#86c9a0; background:rgba(134,201,160,0.1); }
        .st-badge-unverified { color:var(--dim); background:color-mix(in srgb, var(--border) 40%, transparent); }

        .st-info-banner { display:flex; align-items:flex-start; gap:10px; padding:12px 14px; border-radius:10px; background:color-mix(in srgb, var(--border) 30%, transparent); border:1px solid var(--border); font-size:12px; color:var(--dim); line-height:1.5; }
        .st-info-banner svg { flex-shrink:0; margin-top:1px; color:var(--gold); }

        .st-action-row { display:flex; justify-content:flex-end; gap:10px; margin-top:10px; }
        .st-btn { display:inline-flex; align-items:center; gap:8px; padding:11px 22px; border-radius:10px; font-size:12px; font-weight:700; letter-spacing:0.02em; transition:all .2s; }
        .st-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .st-btn-secondary { background:color-mix(in srgb, var(--border) 40%, transparent); color:var(--cream); }
        .st-btn-secondary:hover { background:color-mix(in srgb, var(--border) 60%, transparent); }
        .st-btn-primary { background:var(--gold); color:#1a1404; }
        .st-btn-primary:hover:not(:disabled) { background:#d8b978; transform:translateY(-1px); }

        .st-content { display:grid; grid-template-columns:1fr; max-width:560px; padding-left:28px; }
        .st-content.wide { max-width:none; padding-left:28px; }
        .st-card { background:none; border:none; border-radius:0; padding:0; display:flex; flex-direction:column; gap:14px; }
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

        /* Profile tab — identity, stats, completion, pass, danger zone */
        .st-profile-grid { display:grid; grid-template-columns:1fr 300px; gap:20px; align-items:start; }
        .st-profile-col { display:flex; flex-direction:column; gap:20px; min-width:0; }
        .st-profile-col-side { min-width:0; }

        /* Boxed sub-cards for the Profile tab — .st-card itself is bare
           (used as a plain layout wrapper elsewhere in the app), so these
           need their own background/border to read as distinct cards. */
        .st-subcard { background:color-mix(in srgb, var(--bg3) 65%, transparent); border:1px solid var(--border); border-radius:18px; padding:20px; box-shadow:0 16px 40px rgba(0,0,0,0.18); }
        .light .st-subcard { background:#FFFFFF; box-shadow:0 12px 30px rgba(58,44,16,0.08); }
        .st-profile-head-card { padding:20px; }
        .st-profile-meta-row { display:flex; flex-wrap:wrap; gap:14px; margin-top:8px; }
        .st-profile-meta-row span { display:inline-flex; align-items:center; gap:6px; font-size:11px; color:var(--dim); }
        .st-profile-meta-row svg { color:var(--gold); flex-shrink:0; }

        .st-field-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .st-field-label-row { display:flex; align-items:center; justify-content:space-between; }
        .st-char-count { font-size:10px; color:var(--dim); }
        .st-select-full { appearance:none; -webkit-appearance:none; cursor:pointer; }
        .st-select-wrap { position:relative; }
        .st-select-wrap svg { position:absolute; right:14px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--dim); }
        .st-textarea { min-height:90px; resize:vertical; line-height:1.6; font-family:inherit; }

        .st-stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .st-stat-item { display:flex; align-items:center; gap:10px; }
        .st-stat-icon { width:36px; height:36px; border-radius:10px; background:rgba(201,168,106,0.1); border:1px solid rgba(201,168,106,0.25); display:flex; align-items:center; justify-content:center; color:var(--gold); flex-shrink:0; }
        .st-stat-num { font-family:var(--serif); font-size:19px; font-weight:500; color:var(--cream); line-height:1.15; }
        .st-stat-label { font-size:10px; color:var(--dim); margin-top:1px; }

        .st-completion-head { display:flex; align-items:center; justify-content:space-between; }
        .st-completion-pct { font-family:var(--serif); font-size:20px; font-weight:500; color:var(--gold); }
        .st-completion-track { height:6px; border-radius:999px; background:var(--border); overflow:hidden; margin-top:2px; }
        .st-completion-fill { height:100%; background:var(--gold); border-radius:999px; transition:width .3s ease; }
        .st-completion-hint { font-size:11px; color:var(--dim); line-height:1.5; }
        .st-checklist { display:flex; flex-direction:column; gap:9px; margin-top:2px; }
        .st-checklist-item { display:flex; align-items:center; gap:9px; font-size:12px; color:var(--cream); }
        .st-checklist-item svg { flex-shrink:0; }

        .st-pass-mini-card { gap:14px; }
        .st-pass-mini-head { display:flex; align-items:center; gap:12px; }

        .st-danger-banner { display:flex; align-items:flex-start; gap:14px; padding:18px 20px; border-radius:16px; background:rgba(224,128,128,0.06); border:1px solid rgba(224,128,128,0.28); margin-bottom: 24px; margin-top: 20px; }

        @media (max-width:900px) { .st-profile-grid { grid-template-columns:1fr; } }

        @media (max-width:760px) { .st-body { grid-template-columns:1fr; } .st-subnav { position:static; flex-direction:row; overflow-x:auto; } .st-field-row { grid-template-columns:1fr; } .st-danger-banner { flex-direction:column; } .st-action-row { flex-direction:column-reverse; } .st-action-row .st-btn { width:100%; justify-content:center; } }

        .mobile-only { display:none; }

        .pp-mobile-menu-btn { width:42px; height:42px; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:50%; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent) !important; flex-shrink:0; }

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

        .pp-mobile-subnav { display:none; gap:8px; overflow-x:auto; padding-bottom:4px; margin:0 0 18px; scrollbar-width:none; }
        .pp-mobile-subnav::-webkit-scrollbar { display:none; }
        .pp-mobile-subnav-item { flex-shrink:0; display:flex; align-items:center; gap:7px; padding:9px 16px; border-radius:999px; border:1px solid var(--border); font-size:11px; font-weight:700; letter-spacing:0.04em; color:var(--dim); background:color-mix(in srgb, var(--bg2) 60%, transparent); white-space:nowrap; }
        .pp-mobile-subnav-item.active { color:var(--gold); border-color:rgba(201,168,106,0.4); background:rgba(201,168,106,0.1); }

        .pp-pass-scale-wrap { }

        /* Traveller Pass — locked / coming soon overlay */
        .pp-pass-locked-wrap {
          position:relative;
          overflow:hidden;
          border-radius:28px;
          padding-bottom:36px;
        }
        .pp-pass-blur-layer {
          filter:blur(1000px);
          pointer-events:none;
          user-select:none;
        }
        .pp-pass-overlay {
          position:absolute; inset:0; z-index:20;
          display:flex; align-items:center; justify-content:center;
          padding:24px;
          cursor:default;
        }
        .pp-pass-overlay-card {
          display:flex; flex-direction:column; align-items:center;
          gap:10px; text-align:center;
          padding:32px 40px;
          background:var(--bg2);
          border:1px solid var(--border);
          border-radius:20px;
          box-shadow:0 24px 60px rgba(0,0,0,0.45);
        }
        .light .pp-pass-overlay-card { background:#FFFFFF; }
        .pp-pass-overlay-badge {
          width:52px; height:52px; border-radius:50%;
          background:rgba(201,168,106,0.14); border:1px solid rgba(201,168,106,0.35);
          display:flex; align-items:center; justify-content:center; color:var(--gold);
          margin-bottom:4px;
        }
        .pp-pass-overlay-text { font-family:var(--serif); font-size:26px; font-weight:500; color:var(--cream); letter-spacing:0.02em; }
        .pp-pass-overlay-sub { font-size:13px; color:var(--muted); max-width:280px; line-height:1.6; }

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
            <span>EXPLORE</span><span>SCENIC</span><span>ROUTES</span>
          </Link>
          <div className="pp-nav-links">
            <Link href="/explore"  className="pp-nav-link">{t("nav.explore")}</Link>
            <Link href="/about"    className="pp-nav-link">{t("nav.about")}</Link>
            <Link href="/my-trips" className="pp-nav-link">{t("nav.myTrips")}</Link>
          </div>
          <div className="pp-nav-right">
            <ThemeSwitch />
          </div>

          <button
            className="pp-mobile-menu-btn mobile-only"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menü öffnen"
          >
            <Menu size={20} strokeWidth={1.8} />
          </button>
        </nav>

        <div className={`pp-mobile-nav-backdrop ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(false)} />

        <div className={`pp-mobile-nav-drawer ${mobileMenuOpen ? "open" : ""}`}>
          <div className="pp-mobile-nav-top">
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em", color: "var(--cream)" }}>EXPLORE SCENIC ROUTES</span>
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
                <p className="pp-mobile-role">{t("common.roleExplorer")}</p>
              </div>
            </div>

            <div className="pp-mobile-theme-row">
              <span className="pp-mobile-theme-label">{t("common.theme")}</span>
              <ThemeSwitch />
            </div>

            <div className="pp-mobile-links">
              <p className="pp-mobile-section-label">{t("profile.mobile.navigate")}</p>
              <Link href="/explore" className="pp-mobile-link" onClick={() => setMobileMenuOpen(false)}>
                <span className="pp-mobile-link-icon"><Map size={14} strokeWidth={1.8} /></span>
                {t("nav.explore")}
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </Link>
              <Link href="/about" className="pp-mobile-link" onClick={() => setMobileMenuOpen(false)}>
                <span className="pp-mobile-link-icon"><Info size={14} strokeWidth={1.8} /></span>
                {t("nav.about")}
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </Link>
              <Link href="/my-trips" className="pp-mobile-link" onClick={() => setMobileMenuOpen(false)}>
                <span className="pp-mobile-link-icon"><Map size={14} strokeWidth={1.8} /></span>
                {t("nav.myTrips")}
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </Link>

              <div className="pp-mobile-divider" />

              <p className="pp-mobile-section-label">{t("profile.mobile.account")}</p>
              {([
                { id: "profile",     label: t("profile.subtab.profile.title"), icon: <User size={14} strokeWidth={1.8} /> },
                { id: "preferences", label: t("prefs.title"),                   icon: <SettingsIcon size={14} strokeWidth={1.8} /> },
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

              <p className="pp-mobile-section-label">{t("profile.mobile.security")}</p>
              {([
                { id: "email",    label: t("profile.subtab.email.title"),    icon: <Mail size={14} strokeWidth={1.8} /> },
                { id: "password", label: t("profile.subtab.password.title"), icon: <Lock size={14} strokeWidth={1.8} /> },
                { id: "twofa",    label: t("profile.subtab.twofa.title"),    icon: <Smartphone size={14} strokeWidth={1.8} /> },
                { id: "sessions", label: t("profile.subtab.sessions.title"), icon: <Monitor size={14} strokeWidth={1.8} /> },
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

              <p className="pp-mobile-section-label">{t("profile.mobile.more")}</p>
              {([
                { id: "pass",          label: t("profile.subtab.pass.title"),          icon: <Award size={14} strokeWidth={1.8} /> },
                { id: "notifications", label: t("profile.subtab.notifications.title"), icon: <Bell size={14} strokeWidth={1.8} /> },
                { id: "privacy",       label: t("profile.subtab.privacy.title"),       icon: <ShieldCheck size={14} strokeWidth={1.8} /> },
                { id: "support",       label: t("profile.subtab.support.title"),       icon: <LifeBuoy size={14} strokeWidth={1.8} /> },
                { id: "about",         label: t("profile.subtab.about.title"),         icon: <Info size={14} strokeWidth={1.8} /> },
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
                {t("nav.signOut")}
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
                {subTab === "profile" && (
                <button className="st-save-btn" disabled={saving} onClick={handleSaveProfile}>
                  {saving ? t("profile.save.saving") : t("common.saveChanges")}
                </button>
                )}
              </div>

              <div className="st-body">
              <div className="pp-mobile-subnav mobile-only">
                {([
                  { id: "profile",       label: t("profile.subtab.profile.title"),       icon: <User size={13} strokeWidth={1.8} /> },
                  { id: "preferences",   label: t("prefs.title"),                         icon: <SettingsIcon size={13} strokeWidth={1.8} /> },
                  { id: "email",         label: t("profile.nav.emailShort"),              icon: <Mail size={13} strokeWidth={1.8} /> },
                  { id: "password",      label: t("profile.nav.passwordShort"),           icon: <Lock size={13} strokeWidth={1.8} /> },
                  { id: "twofa",         label: t("profile.nav.twofaShort"),              icon: <Smartphone size={13} strokeWidth={1.8} /> },
                  { id: "sessions",      label: t("profile.nav.sessionsShort"),           icon: <Monitor size={13} strokeWidth={1.8} /> },
                  { id: "pass",          label: t("profile.nav.passShort"),               icon: <Award size={13} strokeWidth={1.8} /> },
                  { id: "notifications", label: t("profile.nav.notificationsShort"),      icon: <Bell size={13} strokeWidth={1.8} /> },
                  { id: "privacy",       label: t("profile.nav.privacyShort"),            icon: <ShieldCheck size={13} strokeWidth={1.8} /> },
                  { id: "support",       label: t("profile.nav.supportShort"),            icon: <LifeBuoy size={13} strokeWidth={1.8} /> },
                  { id: "about",         label: t("profile.nav.aboutShort"),              icon: <Info size={13} strokeWidth={1.8} /> },
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

              <div className="st-subnav">
                <p className="st-subnav-label">{t("profile.nav.settings")}</p>

                {NAV_GROUPS.map((group) => {
                  const isOpen = group.id === "account" ? accountGroupOpen : securityGroupOpen;
                  const toggleOpen = () => group.id === "account"
                    ? setAccountGroupOpen((v) => !v)
                    : setSecurityGroupOpen((v) => !v);

                  return (
                    <div key={group.id} className="st-subnav-group">
                      <button className="st-subnav-group-title" onClick={toggleOpen}>
                        {group.icon} <span>{t(group.labelKey)}</span>
                        <ChevronDown size={14} className={`st-subnav-chevron ${isOpen ? "open" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="st-subnav-sub">
                          {group.items.map((item) => (
                            <button
                              key={item.id}
                              className={`st-subnav-item st-subnav-item-sub ${subTab === item.id ? "active" : ""}`}
                              onClick={() => setSubTab(item.id)}
                            >
                              {t(item.labelKey)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="st-subnav-divider" />

                {([
                  { id: "pass",          label: t("profile.subtab.pass.title"),    icon: <Award size={15} strokeWidth={1.8} /> },
                  { id: "notifications", label: t("profile.subtab.notifications.title"), icon: <Bell size={15} strokeWidth={1.8} /> },
                  { id: "privacy",       label: t("profile.subtab.privacy.title"), icon: <ShieldCheck size={15} strokeWidth={1.8} /> },
                  { id: "support",       label: t("profile.subtab.support.title"), icon: <LifeBuoy size={15} strokeWidth={1.8} /> },
                  { id: "about",         label: t("profile.subtab.about.title"),   icon: <Info size={15} strokeWidth={1.8} /> },
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
                  <Map size={15} strokeWidth={1.8} /> {t("profile.nav.myTrips")}
                </button>
                <button className="st-subnav-logout" onClick={handleLogout}>
                  <LogOut size={15} strokeWidth={1.8} /> {t("nav.signOut")}
                </button>
              </div>

              {subTab === "profile" && (() => {
                // Profile Completion — derived from data we already have on hand
                // (no extra backend calls). The overall % is computed from this
                // checklist rather than hardcoded, so it stays honest even
                // though the underlying stat cards below are still placeholders.
                const completionChecks = [
                  { label: t("profile.completion.addPhoto"),     done: !!avatarPreview },
                  { label: t("profile.completion.addAbout"),      done: aboutYou.trim().length > 0 },
                  { label: t("profile.completion.addCountry"),    done: country.trim().length > 0 },
                  { label: t("profile.completion.connectEmail"),  done: !!user?.email_confirmed_at },
                  { label: t("profile.completion.setPreferences"), done: false }, // TODO: wire once a "preferences saved" flag exists
                ];
                const completionPct = Math.round((completionChecks.filter(c => c.done).length / completionChecks.length) * 100);
                const memberSince = user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en", { month: "long", year: "numeric" })
                  : "—";

                return (
                <div className="st-content wide">
                  <div className="st-profile-grid">

                    {/* Left column — identity + editable profile info */}
                    <div className="st-profile-col">
                      <div className="st-card st-subcard st-profile-head-card">
                        <div className="st-profile-head" style={{ borderBottom: "none", paddingBottom: 0 }}>
                          <div className="st-avatar-wrap">
                            {avatarPreview
                              ? <img src={avatarPreview} className="st-avatar-lg" alt="avatar" />
                              : <div className="st-avatar-lg-placeholder">{initials}</div>
                            }
                            <label className="st-avatar-edit" title="Change photo">
                              <Camera size={11} strokeWidth={2.2} />
                              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                            </label>
                          </div>
                          <div>
                            <p className="st-profile-name">{displayName || username || user?.email?.split("@")[0]}</p>
                            <p className="st-profile-role">{t("common.roleExplorer")}</p>
                            <p className="st-profile-email">{user?.email}</p>
                            <div className="st-profile-meta-row">
                              <span><Calendar size={11} strokeWidth={1.8} /> {t("profile.info.memberSince")} {memberSince}</span>
                              {country && <span><MapPin size={11} strokeWidth={1.8} /> {country}</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="st-card st-subcard">
                        <p className="st-card-title">{t("profile.info.title")}</p>

                        <div className="st-field">
                          <label className="st-field-label">{t("profile.info.displayName")}</label>
                          <input className="st-input" type="text" placeholder={t("profile.info.displayNamePh")} value={displayName} onChange={e => setDisplayName(e.target.value)} />
                        </div>

                        <div className="st-field">
                          <label className="st-field-label">{t("profile.info.username")}</label>
                          <input className="st-input" type="text" placeholder={t("profile.info.usernamePh")} value={username} onChange={e => setUsername(e.target.value)} />
                        </div>

                        <div className="st-field-row">
                          <div className="st-field">
                            <label className="st-field-label">{t("profile.info.country")}</label>
                            <div className="st-select-wrap">
                              <select className="st-input st-select-full" value={country} onChange={e => setCountry(e.target.value)}>
                                <option value="">{t("profile.info.selectCountry")}</option>
                                {["Germany","Pakistan","United States","United Kingdom","France","Italy","Spain","Switzerland","Austria","Norway","Canada","Australia","Other"].map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} strokeWidth={2} />
                            </div>
                          </div>
                          <div className="st-field">
                            <label className="st-field-label">{t("profile.info.timezone")}</label>
                            <div className="st-select-wrap">
                              <select className="st-input st-select-full" value={timezone} onChange={e => setTimezone(e.target.value)}>
                                {["UTC-8","UTC-5","UTC+0","UTC+1","UTC+2","UTC+5","UTC+8","UTC+9"].map(tz => (
                                  <option key={tz} value={tz}>{tz}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} strokeWidth={2} />
                            </div>
                          </div>
                        </div>

                        <div className="st-field">
                          <div className="st-field-label-row">
                            <label className="st-field-label">{t("profile.info.aboutYou")}</label>
                            <span className="st-char-count">{aboutYou.length}/{ABOUT_MAX}</span>
                          </div>
                          <textarea
                            className="st-input st-textarea"
                            placeholder={t("profile.info.aboutYouPh")}
                            value={aboutYou}
                            maxLength={ABOUT_MAX}
                            onChange={e => setAboutYou(e.target.value)}
                          />
                        </div>

                        {error   && <p className="st-error">{error}</p>}
                        {success && <p className="st-success">{success}</p>}
                      </div>
                    </div>

                    {/* Right column — stats, completion, pass */}
                    <div className="st-profile-col st-profile-col-side">
                      <div className="st-card st-subcard st-stats-card">
                        <p className="st-card-title">{t("profile.stats.title")}</p>
                        {/* TODO: replace placeholders with real counts once wired
                            (trips = completed routes, countries = distinct route
                            countries, distance = sum of route lengths). Saved
                            Routes could use stamps.length today if desired. */}
                        <div className="st-stats-grid">
                          <div className="st-stat-item">
                            <div className="st-stat-icon"><Compass size={16} strokeWidth={1.8} /></div>
                            <div><p className="st-stat-num">18</p><p className="st-stat-label">{t("profile.stats.trips")}</p></div>
                          </div>
                          <div className="st-stat-item">
                            <div className="st-stat-icon"><Globe size={16} strokeWidth={1.8} /></div>
                            <div><p className="st-stat-num">4</p><p className="st-stat-label">{t("profile.stats.countries")}</p></div>
                          </div>
                          <div className="st-stat-item">
                            <div className="st-stat-icon"><Bookmark size={16} strokeWidth={1.8} /></div>
                            <div><p className="st-stat-num">{stamps.length}</p><p className="st-stat-label">{t("profile.stats.saved")}</p></div>
                          </div>
                          <div className="st-stat-item">
                            <div className="st-stat-icon"><TrendingUp size={16} strokeWidth={1.8} /></div>
                            <div><p className="st-stat-num">4,328 km</p><p className="st-stat-label">{t("profile.stats.distance")}</p></div>
                          </div>
                        </div>
                      </div>

                      <div className="st-card st-subcard st-completion-card">
                        <div className="st-completion-head">
                          <p className="st-card-title" style={{ marginBottom: 0 }}><CheckCircle2 size={13} strokeWidth={2} style={{ marginRight: 6, verticalAlign: -2 }} />{t("profile.completion.title")}</p>
                          <span className="st-completion-pct">{completionPct}%</span>
                        </div>
                        <div className="st-completion-track">
                          <div className="st-completion-fill" style={{ width: `${completionPct}%` }} />
                        </div>
                        <p className="st-completion-hint">{t("profile.completion.hint")}</p>
                        <div className="st-checklist">
                          {completionChecks.map((c) => (
                            <div key={c.label} className="st-checklist-item">
                              {c.done ? <CheckCircle2 size={14} strokeWidth={2} color="var(--gold)" /> : <Circle size={14} strokeWidth={1.8} color="var(--dim)" />}
                              <span style={{ opacity: c.done ? 1 : 0.6 }}>{c.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                         {/*}
                      <div className="st-card st-subcard st-pass-mini-card">
                        <div className="st-pass-mini-head">
                          <div className="st-header-icon" style={{ width: 34, height: 34, borderRadius: 10 }}><Award size={17} strokeWidth={1.8} /></div>
                          <div style={{ flex: 1 }}>
                            <p className="st-profile-name" style={{ fontSize: 15 }}>{t("profile.passMini.title")}</p>
                            <p className="st-row-sub" style={{ marginTop: 1 }}>{t("profile.passMini.sub")}</p>
                          </div>
                          <span className="st-badge st-badge-verified">{t("profile.passMini.active")}</span>
                        </div>
                        <button className="st-btn st-btn-secondary" style={{ width: "100%", justifyContent: "space-between" }} onClick={() => setSubTab("pass")}>
                          {t("profile.passMini.view")} <ChevronRight size={14} />
                        </button>
                      </div>
                      */}

                    </div>
                  </div>
                  

                  <div className="st-danger-banner">
                    <AlertTriangle size={18} strokeWidth={1.8} color="#e08080" />
                    <div style={{ flex: 1 }}>
                      <p className="st-row-label" style={{ color: "#e08080" }}>{t("profile.danger.title")}</p>
                      <p className="st-row-sub">{t("profile.danger.text")}</p>
                    </div>
                    <button
                      className="st-btn"
                      style={{ background: "rgba(224,128,128,0.12)", border: "1px solid rgba(224,128,128,0.4)", color: "#e08080", flexShrink: 0 }}
                      onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(""); setDeleteError(""); }}
                    >
                      {t("profile.danger.delete")}
                    </button>
                  </div>

                  <div className="st-action-row">
                    <button
                      className="st-btn st-btn-secondary"
                      onClick={() => { setDisplayName(username); setAboutYou(""); setCountry(""); setTimezone("UTC+0"); }}
                    >
                      {t("common.cancel")}
                    </button>
                    <button className="st-btn st-btn-primary" disabled={saving} onClick={handleSaveProfile}>
                      {saving ? t("common.saving") : t("common.saveChanges")}
                    </button>
                  </div>
                </div>
                );
              })()}

              {subTab === "email" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">{t("profile.email.current")}</p>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label" style={{ fontSize: 14 }}>{user?.email}</p>
                      </div>
                      {user?.email_confirmed_at ? (
                        <span className="st-badge st-badge-verified"><CheckCircle2 size={12} strokeWidth={2} /> {t("profile.email.verified")}</span>
                      ) : (
                        <span className="st-badge st-badge-unverified">{t("profile.email.unverified")}</span>
                      )}
                    </div>

                    <div className="st-divider" />

                    <p className="st-card-title">{t("profile.email.newTitle")}</p>
                    <div className="st-field">
                      <input
                        className="st-input"
                        type="email"
                        placeholder={t("profile.email.newPh")}
                        value={newEmailInput}
                        onChange={e => setNewEmailInput(e.target.value)}
                      />
                    </div>

                    <p className="st-card-title">{t("profile.email.confirmTitle")}</p>
                    <div className="st-field">
                      <input
                        className="st-input"
                        type="password"
                        placeholder={t("profile.email.confirmPh")}
                        value={confirmEmailPassword}
                        onChange={e => setConfirmEmailPassword(e.target.value)}
                      />
                    </div>

                    {emailError   && <p className="st-error">{emailError}</p>}
                    {emailSuccess && <p className="st-success">{emailSuccess}</p>}

                    <div className="st-info-banner">
                      <Mail size={14} strokeWidth={1.8} />
                      <span>{t("profile.email.info")}</span>
                    </div>

                    <div className="st-action-row">
                      <button
                        className="st-btn st-btn-secondary"
                        onClick={() => { setNewEmailInput(""); setConfirmEmailPassword(""); setEmailError(""); setEmailSuccess(""); }}
                      >
                        {t("common.cancel")}
                      </button>
                      <button className="st-btn st-btn-primary" disabled={emailSaving} onClick={handleChangeEmail}>
                        <Mail size={13} strokeWidth={2} /> {emailSaving ? t("profile.email.sending") : t("profile.email.change")}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {subTab === "password" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">{t("profile.password.title")}</p>
                    <div className="st-field">
                      <label className="st-field-label">{t("profile.password.new")}</label>
                      <input className="st-input" type="password" placeholder={t("profile.password.newPh")} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <div className="st-field">
                      <label className="st-field-label">{t("profile.password.confirm")}</label>
                      <input className="st-input" type="password" placeholder={t("profile.password.confirmPh")} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>

                    {passwordError   && <p className="st-error">{passwordError}</p>}
                    {passwordSuccess && <p className="st-success">{passwordSuccess}</p>}

                    <div className="st-action-row">
                      <button
                        className="st-btn st-btn-secondary"
                        onClick={() => { setNewPassword(""); setConfirmPassword(""); setPasswordError(""); setPasswordSuccess(""); }}
                      >
                        {t("common.cancel")}
                      </button>
                      <button className="st-btn st-btn-primary" disabled={passwordSaving} onClick={handleChangePassword}>
                        <Lock size={13} strokeWidth={2} /> {passwordSaving ? t("profile.password.saving") : t("profile.password.change")}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {subTab === "twofa" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">{t("profile.twofa.title")}</p>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label">{t("profile.twofa.app")}</p>
                        <p className="st-row-sub">{t("profile.twofa.comingSoon")}</p>
                      </div>
                      <button className="st-toggle" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>
                        <span className="st-toggle-knob" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {subTab === "sessions" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">{t("profile.sessions.title")}</p>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label">{t("profile.sessions.thisDevice")}</p>
                        <p className="st-row-sub">{t("profile.sessions.currentSession")}</p>
                      </div>
                      <span className="st-badge st-badge-verified">{t("profile.sessions.active")}</span>
                    </div>

                    {sessionsError   && <p className="st-error">{sessionsError}</p>}
                    {sessionsSuccess && <p className="st-success">{sessionsSuccess}</p>}

                    <div className="st-action-row">
                      <button className="st-btn st-btn-primary" disabled={sessionsSaving} onClick={handleSignOutOthers}>
                        <LogOut size={13} strokeWidth={2} /> {sessionsSaving ? t("profile.sessions.signingOut") : t("profile.sessions.signOutOthers")}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {subTab === "pass" && (
                <div className="st-content wide">
                  <div className="pp-pass-locked-wrap">
                    <div className="pp-pass-blur-layer">
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

                    <div className="pp-pass-overlay">
                      <div className="pp-pass-overlay-card">
                        <div className="pp-pass-overlay-badge">
                          <Award size={22} strokeWidth={1.6} />
                        </div>
                        <p className="pp-pass-overlay-text">
                          {lang === "de" ? "Demnächst verfügbar" : lang === "ru" ? "Скоро будет доступно" : "Coming Soon"}
                        </p>
                        <p className="pp-pass-overlay-sub">
                          {lang === "de"
                            ? "Der Traveller Pass wird gerade vorbereitet."
                            : lang === "ru"
                            ? "Пропуск Путешественника находится в разработке."
                            : "Your Traveller Pass is being prepared."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {subTab === "preferences" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">{t("prefs.title")}</p>
                    <div className="st-row">
                      <span className="st-row-label">{t("prefs.distanceUnit")}</span>
                      <select
                        className="st-select"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value as "km" | "mi")}
                      >
                        <option value="km">{t("prefs.km")}</option>
                        <option value="mi">{t("prefs.mi")}</option>
                      </select>
                    </div>
                    <div className="st-row">
                      <span className="st-row-label">{t("prefs.language")}</span>
                      <select
                        className="st-select"
                        value={lang}
                        onChange={(e) => setLang(e.target.value as "en" | "de" | "ru")}
                      >
                        <option value="en">English</option>
                        <option value="de">Deutsch</option>
                        <option value="ru">Русский</option>
                      </select>
                    </div>
                    <div className="st-row">
                      <span className="st-row-label">{t("prefs.startPage")}</span>
                      <select className="st-select" defaultValue="explore"><option value="explore">{t("nav.explore")}</option><option value="trips">{t("nav.myTrips")}</option></select>
                    </div>
                    <div className="st-row">
                      <span className="st-row-label">{t("prefs.mapStyle")}</span>
                      <select className="st-select" defaultValue="scenic"><option value="scenic">{t("prefs.scenic")}</option><option value="satellite">{t("prefs.satellite")}</option></select>
                    </div>
                  </div>
                </div>
              )}

              {subTab === "notifications" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">{t("profile.notif.title")}</p>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label">{t("profile.notif.nearby")}</p>
                        <p className="st-row-sub">{t("profile.notif.nearbyText")}</p>
                      </div>
                      <button className={`st-toggle ${toggles.nearbyRoutes ? "on" : ""}`} onClick={() => toggleSwitch("nearbyRoutes")}><span className="st-toggle-knob" /></button>
                    </div>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label">{t("profile.notif.reminders")}</p>
                        <p className="st-row-sub">{t("profile.notif.remindersText")}</p>
                      </div>
                      <button className={`st-toggle ${toggles.tripReminders ? "on" : ""}`} onClick={() => toggleSwitch("tripReminders")}><span className="st-toggle-knob" /></button>
                    </div>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label">{t("profile.notif.community")}</p>
                        <p className="st-row-sub">{t("profile.notif.communityText")}</p>
                      </div>
                      <button className={`st-toggle ${toggles.communityUpdates ? "on" : ""}`} onClick={() => toggleSwitch("communityUpdates")}><span className="st-toggle-knob" /></button>
                    </div>
                    <div className="st-row st-row-clickable">
                      <span className="st-row-label">{t("profile.notif.emailSettings")}</span>
                      <ChevronRight size={15} color="var(--dim)" />
                    </div>
                  </div>
                </div>
              )}

              {subTab === "privacy" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">{t("profile.privacy.title")}</p>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label">{t("profile.privacy.maps")}</p>
                        <p className="st-row-sub">{t("profile.privacy.mapsText")}</p>
                      </div>
                      <button
                        className={`st-toggle ${googleMapsConsent ? "on" : ""}`}
                        onClick={handleGoogleMapsToggle}
                        disabled={mapsConsentSaving}
                      >
                        <span className="st-toggle-knob" />
                      </button>
                    </div>
                    <div className="st-row">
                      <div>
                        <p className="st-row-label">{t("profile.privacy.track")}</p>
                        <p className="st-row-sub">{t("profile.privacy.trackText")}</p>
                      </div>
                      <button className={`st-toggle ${toggles.activityTracking ? "on" : ""}`} onClick={() => toggleSwitch("activityTracking")}><span className="st-toggle-knob" /></button>
                    </div>
                  </div>
                </div>
              )}

              {subTab === "support" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">{t("profile.support.title")}</p>
                    <div className="st-row st-row-clickable">
                      <span className="st-row-label">{t("profile.support.faq")}</span>
                      <ChevronRight size={15} color="var(--dim)" />
                    </div>
                    <div className="st-row st-row-clickable">
                      <span className="st-row-label">{t("profile.support.contact")}</span>
                      <ChevronRight size={15} color="var(--dim)" />
                    </div>
                    <div className="st-row st-row-clickable">
                      <span className="st-row-label">{t("profile.support.tutorials")}</span>
                      <ChevronRight size={15} color="var(--dim)" />
                    </div>
                    <div className="st-row st-row-clickable">
                      <span className="st-row-label">{t("profile.support.feedback")}</span>
                      <ChevronRight size={15} color="var(--dim)" />
                    </div>
                  </div>
                </div>
              )}

              {subTab === "about" && (
                <div className="st-content">
                  <div className="st-card">
                    <p className="st-card-title">{t("profile.about.title")}</p>
                    <div className="st-row"><span className="st-row-label">{t("profile.about.version")}</span><span className="st-row-value">1.0.0</span></div>
                    <div className="st-row st-row-clickable"><span className="st-row-label">{t("profile.about.terms")}</span><ChevronRight size={15} color="var(--dim)" /></div>
                    <div className="st-row st-row-clickable"><span className="st-row-label">{t("profile.about.privacy")}</span><ChevronRight size={15} color="var(--dim)" /></div>
                    <div className="st-row st-row-clickable"><span className="st-row-label">{t("profile.about.imprint")}</span><ChevronRight size={15} color="var(--dim)" /></div>
                  </div>
                </div>
              )}
              </div>
            </div>

          </div>
        </div>

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
                {t("profile.delete.title")}
              </p>
              <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6, marginBottom: 18 }}>
                {t("profile.delete.text")}
              </p>

              <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--dim)", display: "block", marginBottom: 6 }}>
                {t("profile.delete.typeConfirm")}
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
                  {t("common.cancel")}
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
                  {deleting ? t("profile.delete.deleting") : t("profile.danger.delete")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}