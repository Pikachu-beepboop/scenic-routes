"use client";

import { useState } from "react";
import Link from "next/link";
import type { Stamp } from "../types";

const PASSPORT_PAGES = ["cover", "id", "stamps"] as const;
type PassportPageId = typeof PASSPORT_PAGES[number];

// чтобы паспорт было видно можно просто изменить на = true
const TRAVELLER_PASS_ENABLED = false;

export default function TravellerPass({ username, email, avatarPreview, initials, stamps }: {
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

  const passportContent = (
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

  if (TRAVELLER_PASS_ENABLED) {
    return passportContent;
  }

  // --- Coming-Soon-Zustand: Inhalt bleibt im DOM (Layout/Höhe bleiben
  // erhalten), wird aber geblurrt, nicht interagierbar und mit einem
  // zentrierten "Coming Soon"-Badge überdeckt. ---
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        aria-hidden="true"
        style={{
          filter: "blur(25px) saturate(70%)",
          pointerEvents: "none",
          userSelect: "none",
          transform: "scale(1.01)",
        }}
      >
        {passportContent}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            textAlign: "center",
            maxWidth: 340,
            padding: "36px 32px",
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--bg2) 88%, transparent)",
            backdropFilter: "blur(6px)",
            boxShadow: "0 24px 60px rgba(0,0,0,.45)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "#C9A86A",
              padding: "6px 16px",
              border: "1px solid rgba(201,168,106,.4)",
              borderRadius: 999,
              background: "rgba(201,168,106,.08)",
            }}
          >
            Coming Soon
          </div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--fg)" }}>
            Traveller Pass is on its way
          </h3>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--dim)" }}>
            We're putting the finishing touches on your digital passport. Check back soon.
          </p>
        </div>
      </div>
    </div>
  );
}