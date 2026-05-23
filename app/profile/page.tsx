"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Stamp = {
  id: string;
  title: string;
  country: string;
  terrain?: string;
  completed_at?: string;
};

function TravellerPass({ username, email, avatarPreview, initials, stamps }: {
  username: string; email: string; avatarPreview: string; initials: string; stamps: Stamp[];
}) {
  const [page, setPage] = useState<"cover" | "id" | "stamps">("cover");
  const [flipping, setFlipping] = useState(false);

  function goTo(next: "cover" | "id" | "stamps") {
    if (flipping || next === page) return;
    setFlipping(true);
    setTimeout(() => { setPage(next); setFlipping(false); }, 350);
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

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,width:"100%",maxWidth:420}}>

      {/* TABS */}
      <div style={{display:"flex",border:"1px solid rgba(237,229,212,0.12)",borderRadius:10,overflow:"hidden",background:"rgba(14,12,10,0.6)"}}>
        {(["cover","id","stamps"] as const).map((p) => (
          <button key={p} onClick={() => goTo(p)} style={{padding:"9px 18px",fontSize:10,fontWeight:800,letterSpacing:"0.16em",textTransform:"uppercase",color: page===p ? "#C9A86A" : "rgba(237,229,212,0.32)",background: page===p ? "rgba(201,168,106,0.08)" : "none",border:"none",borderRight:"1px solid rgba(237,229,212,0.08)",cursor:"pointer",transition:"all .2s",fontFamily:"Inter,sans-serif"}}>
            {p === "cover" ? "Cover" : p === "id" ? "ID Page" : `Stamps (${stamps.length})`}
          </button>
        ))}
      </div>

      {/* PASSPORT */}
      <div style={{width:"100%",animation: flipping ? "passFlip .35s ease" : "none"}}>
        <style>{`@keyframes passFlip{0%{opacity:1;transform:rotateY(0)}50%{opacity:.5;transform:rotateY(-10deg)}100%{opacity:1;transform:rotateY(0)}}`}</style>

        {/* ── COVER ── */}
        {page === "cover" && (
          <div style={{background:"linear-gradient(160deg,#0e1a0e 0%,#142114 50%,#0e1a0e 100%)",borderRadius:"4px 14px 14px 4px",borderLeft:"8px solid #0a150a",minHeight:500,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"40px 36px 36px",boxShadow:"4px 4px 28px rgba(0,0,0,.7),-1px 0 0 #1e2e1e",position:"relative",overflow:"hidden"}}>
            {/* pattern */}
            <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0px,rgba(255,255,255,.018) 1px,transparent 1px,transparent 10px),repeating-linear-gradient(-45deg,rgba(255,255,255,.018) 0px,rgba(255,255,255,.018) 1px,transparent 1px,transparent 10px)"}}/>
            {/* top */}
            <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
              <span style={{fontSize:9,letterSpacing:".32em",textTransform:"uppercase",color:"rgba(200,180,110,.5)",fontWeight:400}}>International</span>
              <span style={{fontSize:12,letterSpacing:".28em",textTransform:"uppercase",color:"rgba(200,180,110,.9)",fontWeight:600}}>Scenic Routes</span>
            </div>
            {/* emblem */}
            <div style={{position:"relative",zIndex:1,width:100,height:100,borderRadius:"50%",border:"1.5px solid rgba(200,180,110,.3)",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(200,180,110,.05)"}}>
              <div style={{width:76,height:76,borderRadius:"50%",border:"1px solid rgba(200,180,110,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:38,color:"rgba(200,180,110,.65)"}}>✦</div>
            </div>
            {/* bottom */}
            <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <span style={{fontSize:22,letterSpacing:".22em",textTransform:"uppercase",color:"rgba(200,180,110,.85)",fontFamily:"'Cormorant Garamond',Georgia,serif",fontWeight:400}}>Passport</span>
              <span style={{fontSize:8,letterSpacing:".14em",color:"rgba(200,180,110,.35)",textTransform:"uppercase"}}>Passeport · Pasaporte · Reisepass</span>
              {/* chip */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gridTemplateRows:"1fr 1fr 1fr",gap:2,padding:5,width:50,height:36,border:"1.5px solid rgba(200,180,110,.28)",borderRadius:5,marginTop:6}}>
                {[0,0,0,0,1,0,1,0,0].map((big,i)=>(
                  <div key={i} style={{background:`rgba(200,180,110,${big?0.32:0.18})`,borderRadius:1}}/>
                ))}
              </div>
              <button onClick={() => goTo("id")} style={{marginTop:14,padding:"9px 26px",border:"1px solid rgba(200,180,110,.4)",borderRadius:999,fontSize:9,fontWeight:700,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(200,180,110,.78)",background:"transparent",cursor:"pointer"}}>
                Open passport →
              </button>
            </div>
          </div>
        )}

        {/* ── ID PAGE ── */}
        {page === "id" && (
          <div style={{background:"linear-gradient(170deg,#f9f4eb 0%,#f2e9d6 60%,#ece0c8 100%)",borderRadius:"4px 14px 14px 4px",borderLeft:"8px solid #d4c090",minHeight:500,display:"flex",flexDirection:"column",boxShadow:"4px 4px 28px rgba(0,0,0,.5)",position:"relative",overflow:"hidden",color:"#1a1200"}}>
            {/* watermark */}
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",opacity:.04,fontSize:90,fontFamily:"'Cormorant Garamond',Georgia,serif",color:"#5a4010",transform:"rotate(-20deg)",letterSpacing:".1em"}}>SR</div>
            {/* guilloche line */}
            <div style={{position:"absolute",bottom:90,left:0,right:0,height:36,opacity:.1,background:"repeating-linear-gradient(90deg,transparent,transparent 3px,#8a6a20 3px,#8a6a20 4px)"}}/>
            {/* header */}
            <div style={{background:"linear-gradient(135deg,#1a3a1a,#2a5a2a)",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:9,letterSpacing:".28em",textTransform:"uppercase",color:"rgba(200,180,110,.88)",fontWeight:700}}>Scenic Routes</div>
                <div style={{fontSize:8,letterSpacing:".16em",color:"rgba(200,180,110,.48)",textTransform:"uppercase",marginTop:2}}>Traveller Passport</div>
              </div>
              <div style={{fontSize:20,color:"rgba(200,180,110,.55)"}}>✦</div>
            </div>
            {/* body */}
            <div style={{display:"flex",gap:16,padding:"18px 18px 12px",position:"relative",zIndex:1}}>
              {/* photo */}
              <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="photo" style={{width:88,height:108,objectFit:"cover",border:"2px solid #b8921a",borderRadius:2,display:"block"}}/>
                  : <div style={{width:88,height:108,border:"2px solid #b8921a",borderRadius:2,background:"linear-gradient(135deg,#e8dcc0,#d4c490)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:38,fontWeight:300,color:"#8a6a20"}}>{initials}</div>
                }
                <span style={{fontSize:7,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a40",fontWeight:500}}>Photo / Photo</span>
                <div style={{width:88,height:28,borderBottom:"1px solid #b8921a",display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:2,marginTop:6}}>
                  <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:13,fontStyle:"italic",color:"#5a3a10",opacity:.6}}>{displayName}</span>
                </div>
                <span style={{fontSize:6,letterSpacing:".14em",textTransform:"uppercase",color:"#8a6a40"}}>Signature</span>
              </div>
              {/* data */}
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:9}}>
                {[
                  ["Surname / Nom", displayName.toUpperCase()],
                  ["Given names / Prénoms", "ROUTE EXPLORER"],
                  ["Nationality / Nationalité", "WORLD TRAVELLER"],
                ].map(([label, value]) => (
                  <div key={label} style={{display:"flex",flexDirection:"column",gap:1,borderBottom:".5px solid rgba(90,60,16,.15)",paddingBottom:6}}>
                    <span style={{fontSize:7,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a40",fontWeight:700}}>{label}</span>
                    <span style={{fontSize:12,fontWeight:700,color:"#1a1200",letterSpacing:".04em"}}>{value}</span>
                  </div>
                ))}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div style={{display:"flex",flexDirection:"column",gap:1,borderBottom:".5px solid rgba(90,60,16,.15)",paddingBottom:6}}>
                    <span style={{fontSize:7,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a40",fontWeight:700}}>Date of issue</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#1a1200"}}>{issued}</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:1,borderBottom:".5px solid rgba(90,60,16,.15)",paddingBottom:6}}>
                    <span style={{fontSize:7,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a40",fontWeight:700}}>Date of expiry</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#8a1a1a"}}>{expiry}</span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:1}}>
                  <span style={{fontSize:7,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a40",fontWeight:700}}>Routes completed</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#7a5a18"}}>{stamps.length} Destination{stamps.length!==1?"s":""}</span>
                </div>
              </div>
            </div>
            {/* obs */}
            <div style={{position:"relative",zIndex:1,margin:"0 18px 10px",padding:"7px 10px",background:"rgba(26,58,26,.06)",border:".5px solid rgba(26,58,26,.15)",borderRadius:3,fontSize:8,color:"#4a5a30",letterSpacing:".06em",lineHeight:1.5}}>
              Type: P &nbsp;|&nbsp; Code: SRT &nbsp;|&nbsp; No: SR{String(stamps.length).padStart(7,"0")} &nbsp;|&nbsp; Authority: Scenic Routes International
            </div>
            {/* MRZ */}
            <div style={{marginTop:"auto",padding:"10px 14px",background:"#1a3a1a",fontFamily:"'Courier New',monospace",fontSize:8,color:"rgba(200,180,110,.65)",letterSpacing:".05em",lineHeight:1.8,wordBreak:"break-all",position:"relative",zIndex:1}}>
              <div style={{fontSize:7,letterSpacing:".2em",textTransform:"uppercase",color:"rgba(200,180,110,.3)",marginBottom:4}}>Machine readable zone</div>
              <div>{"P<SRT" + mrzName + "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<".slice(0, 39 - mrzName.length)}</div>
              <div>{"SR" + String(stamps.length).padStart(7,"0") + "0SRT" + String(today.getFullYear()).slice(2) + "01014M" + String(today.getFullYear()+10).slice(2) + "1231<<<<<<<<<<<<<<6"}</div>
            </div>
            <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"flex-end",padding:"10px 18px 16px"}}>
              <button onClick={() => goTo("stamps")} style={{padding:"8px 20px",border:"1px solid #8a6a20",borderRadius:999,fontSize:8,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a20",background:"transparent",cursor:"pointer"}}>
                View stamps →
              </button>
            </div>
          </div>
        )}

        {/* ── STAMPS ── */}
        {page === "stamps" && (
          <div style={{background:"linear-gradient(170deg,#f8f3e8 0%,#f0e6d0 60%,#e8dcc0 100%)",borderRadius:"4px 14px 14px 4px",borderLeft:"8px solid #d4c090",minHeight:500,display:"flex",flexDirection:"column",boxShadow:"4px 4px 28px rgba(0,0,0,.5)",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",opacity:.03,fontSize:130,fontFamily:"'Cormorant Garamond',Georgia,serif",color:"#5a4010",transform:"rotate(-15deg)"}}>✦</div>
            {/* header */}
            <div style={{background:"linear-gradient(135deg,#1a3a1a,#2a5a2a)",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:9,letterSpacing:".28em",textTransform:"uppercase",color:"rgba(200,180,110,.88)",fontWeight:700}}>Entry Stamps</div>
                <div style={{fontSize:8,letterSpacing:".14em",color:"rgba(200,180,110,.45)",textTransform:"uppercase",marginTop:2}}>Cachets d'entrée · Sellos de entrada</div>
              </div>
              <div style={{fontSize:20,color:"rgba(200,180,110,.55)"}}>✦</div>
            </div>
            {/* grid */}
            {stamps.length === 0 ? (
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:24}}>
                <div style={{fontSize:40,opacity:.18,color:"#5a3a10"}}>✦</div>
                <p style={{fontSize:12,color:"#8a6a40",textAlign:"center",lineHeight:1.7}}>No stamps yet.<br/>Complete routes to earn your first stamp.</p>
                <Link href="/explore" style={{padding:"8px 20px",border:"1px solid #8a6a20",borderRadius:999,fontSize:8,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a20"}}>Explore Routes →</Link>
              </div>
            ) : (
              <div style={{position:"relative",zIndex:1,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,padding:"16px 18px",flex:1}}>
                {stamps.map((s, i) => {
                  const st = STAMP_STYLES[i % STAMP_STYLES.length];
                  return (
                    <div key={s.id} style={{border:`2px solid ${st.border}`,background:st.bg,borderRadius:4,aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",transition:"transform .2s",cursor:"default"}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,padding:8,textAlign:"center"}}>
                        <div style={{fontSize:16,lineHeight:1,color:st.icon}}>{TERRAIN_ICONS[s.terrain||""]||"◎"}</div>
                        <div style={{fontSize:7,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",lineHeight:1.3,color:st.text}}>{s.title}</div>
                        <div style={{fontSize:6,letterSpacing:".14em",textTransform:"uppercase",color:st.sub}}>{s.country}</div>
                        {s.completed_at && <div style={{fontSize:6,fontFamily:"'Courier New',monospace",color:st.sub,opacity:.7,marginTop:1}}>{new Date(s.completed_at).toLocaleDateString("en",{month:"short",year:"numeric"})}</div>}
                      </div>
                    </div>
                  );
                })}
                {Array.from({length:Math.max(0,6-stamps.length)}).map((_,i)=>(
                  <div key={`e${i}`} style={{border:"1.5px dashed rgba(90,60,16,.14)",borderRadius:4,aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:14,opacity:.12,color:"#5a3a10"}}>✦</span>
                  </div>
                ))}
              </div>
            )}
            {/* footer */}
            <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 18px 16px",borderTop:".5px solid rgba(90,60,16,.15)"}}>
              <span style={{fontSize:10,color:"#5a3a10",fontWeight:500}}>{stamps.length} of 10 stamps collected</span>
              <button onClick={() => goTo("id")} style={{padding:"8px 20px",border:"1px solid #8a6a20",borderRadius:999,fontSize:8,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",color:"#8a6a20",background:"transparent",cursor:"pointer"}}>
                ← ID page
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [activeSection, setActiveSection] = useState<"profile" | "favorites" | "settings" | "pass">("profile");
  const [navScrolled, setNavScrolled]     = useState(false);
  const [stamps, setStamps]               = useState<Stamp[]>([]);
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
    // Try saved_routes or my_trips table — adjust table name to match your schema
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

        .pp-bg { position:fixed; inset:0; z-index:0; }
        .pp-bg img { width:100%; height:100%; object-fit:cover; object-position:center 40%; filter:brightness(0.28) contrast(1.1) saturate(0.7); }
        .pp-bg::after { content:""; position:absolute; inset:0; background:linear-gradient(135deg, rgba(12,11,9,0.88) 0%, rgba(12,11,9,0.6) 50%, rgba(12,11,9,0.82) 100%); }

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

        .pp-layout { position:relative; z-index:10; min-height:100vh; display:flex; padding-top:72px; }

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

        .pp-main { flex:1; display:flex; align-items:flex-start; justify-content:center; padding:48px clamp(20px,4vw,60px); gap:32px; }

        .pp-card { width:100%; max-width:420px; }
        .pp-card-inner { background:rgba(14,12,10,0.82); backdrop-filter:blur(28px); border:1px solid var(--border); border-radius:24px; overflow:hidden; box-shadow:0 40px 100px rgba(0,0,0,0.55); }

        .pp-avatar-header { padding:32px 32px 24px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:20px; position:relative; }
        .pp-avatar-wrap { position:relative; flex-shrink:0; }
        .pp-avatar { width:64px; height:64px; border-radius:14px; border:1px solid rgba(201,168,106,0.3); object-fit:cover; display:block; }
        .pp-avatar-placeholder { width:64px; height:64px; border-radius:14px; border:1px solid rgba(201,168,106,0.3); background:rgba(201,168,106,0.1); display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:26px; font-weight:300; color:var(--gold); }
        .pp-avatar-edit { position:absolute; bottom:-6px; right:-6px; width:22px; height:22px; border-radius:50%; background:var(--gold); border:2px solid var(--bg); display:flex; align-items:center; justify-content:center; font-size:10px; color:var(--bg); cursor:pointer; transition:transform .2s; }
        .pp-avatar-edit:hover { transform:scale(1.15); }
        .pp-user-name { font-family:var(--serif); font-size:22px; font-weight:300; color:var(--cream); letter-spacing:-0.02em; }
        .pp-user-email { font-size:11px; color:var(--dim); margin-top:2px; }
        .pp-user-role  { font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); margin-top:6px; }

        .pp-stats { display:grid; grid-template-columns:repeat(3,1fr); border-bottom:1px solid var(--border); }
        .pp-stat { padding:18px 12px; text-align:center; border-right:1px solid var(--border); }
        .pp-stat:last-child { border-right:none; }
        .pp-stat-num { font-family:var(--serif); font-size:28px; font-weight:300; color:var(--cream); line-height:1; }
        .pp-stat-label { font-size:8px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--dim); margin-top:4px; }

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
            <Link href="/my-trips" className="pp-nav-link" style={{ color: "#EDE5D4" }}>My Trips</Link>
          </div>
          <div className="pp-nav-right" />
        </nav>

        <div className="pp-layout">
          <aside className="pp-sidebar">
            <div className="pp-sidebar-top">
              <div>
                <p className="pp-sidebar-label">Navigation</p>
                <div className="pp-nav-items">
                  {([
                    { id: "profile",   label: "Profile",        icon: "◎" },
                    { id: "favorites", label: "Favorites",      icon: "♡" },
                    { id: "settings",  label: "Settings",       icon: "⬡" },
                    { id: "pass",      label: "Traveller Pass", icon: "✦" },
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

          <main className="pp-main">

            {/* PROFILE */}
            {activeSection === "profile" && (
              <div className="pp-card">
                <div className="pp-card-inner">
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
                  <div className="pp-stats">
                    {[["12","Trips"],["5","Routes"],[String(stamps.length),"Stamps"]].map(([n,l]) => (
                      <div className="pp-stat" key={l}>
                        <div className="pp-stat-num">{n}</div>
                        <div className="pp-stat-label">{l}</div>
                      </div>
                    ))}
                  </div>
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
            )}

            {/* TRAVELLER PASS */}
            {activeSection === "pass" && (
              <TravellerPass
                username={username}
                email={user?.email || ""}
                avatarPreview={avatarPreview}
                initials={initials}
                stamps={stamps}
              />
            )}

            {/* FAVORITES placeholder */}
            {activeSection === "favorites" && (
              <div className="pp-card">
                <div className="pp-card-inner" style={{padding:40,textAlign:"center"}}>
                  <div style={{fontSize:32,marginBottom:16,color:"var(--gold)"}}>♡</div>
                  <p style={{fontFamily:"var(--serif)",fontSize:24,fontWeight:300,color:"var(--cream)",marginBottom:8}}>Favorites</p>
                  <p style={{fontSize:13,color:"var(--dim)",lineHeight:1.7}}>Your saved routes will appear here.</p>
                  <Link href="/explore" style={{display:"inline-flex",marginTop:24,padding:"12px 24px",border:"1px solid var(--gold)",borderRadius:999,fontSize:9,fontWeight:800,letterSpacing:"0.2em",textTransform:"uppercase",color:"var(--gold)",transition:"all .25s"}}>Explore Routes →</Link>
                </div>
              </div>
            )}

            {/* SETTINGS placeholder */}
            {activeSection === "settings" && (
              <div className="pp-card">
                <div className="pp-card-inner" style={{padding:40,textAlign:"center"}}>
                  <div style={{fontSize:32,marginBottom:16,color:"var(--gold)"}}>⬡</div>
                  <p style={{fontFamily:"var(--serif)",fontSize:24,fontWeight:300,color:"var(--cream)",marginBottom:8}}>Settings</p>
                  <p style={{fontSize:13,color:"var(--dim)",lineHeight:1.7}}>Account settings coming soon.</p>
                </div>
              </div>
            )}

            {/* RIGHT PANEL */}
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
                  <div className="pp-info-icon">✦</div>
                  <div className="pp-info-text"><h4>Traveller Pass</h4><p>Collect stamps for every route you complete.</p></div>
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