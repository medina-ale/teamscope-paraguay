import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC4SaBt3GR1mATGWnhyYguRE1qnN264jBg",
  authDomain: "teamscope-paraguay.firebaseapp.com",
  projectId: "teamscope-paraguay",
  storageBucket: "teamscope-paraguay.firebasestorage.app",
  messagingSenderId: "637435893615",
  appId: "1:637435893615:web:e3336bf82bada23ed87a9a"
};
const db = getFirestore(initializeApp(firebaseConfig));

const ADMIN_EMAIL = "admin@techcorp.com.py";
const ADMIN_PASS = "Admin2024";
const TOTAL = 400;
const MIN_RESP = 5;
const EQUIPOS = ["Desarrollo","QA","DevOps","Data","Soporte"];

const C = {
  primary:"#0A2342",secondary:"#1B5E8A",accent:"#00C4B4",
  success:"#10B981",warning:"#F59E0B",danger:"#EF4444",
  neutral:"#64748B",light:"#F0F4F8",white:"#FFFFFF",
};

const PREGUNTAS = [
  {id:1,cat:"Carga de trabajo",txt:"Mi trabajo me exige estar disponible fuera del horario laboral.",tipo:"l"},
  {id:2,cat:"Carga de trabajo",txt:"Tengo demasiadas tareas y poco tiempo para completarlas con calidad.",tipo:"l"},
  {id:3,cat:"Carga de trabajo",txt:"Mi trabajo me exige atender múltiples incidentes en simultáneo.",tipo:"l"},
  {id:4,cat:"Autonomía",txt:"Puedo decidir cómo organizar mi trabajo durante el día.",tipo:"l"},
  {id:5,cat:"Jornada",txt:"Me quedo tiempo extra (más de 1 hora) con frecuencia.",tipo:"l"},
  {id:6,cat:"Liderazgo",txt:"Mi líder me comunica claramente qué se espera de mi trabajo.",tipo:"l"},
  {id:7,cat:"Relaciones",txt:"Tengo buenas relaciones de colaboración con mis compañeros.",tipo:"l"},
  {id:8,cat:"Respeto",txt:"En mi equipo se respetan las opiniones y no hay críticas injustificadas.",tipo:"l"},
  {id:9,cat:"Vida-trabajo",txt:"Mi trabajo me permite cumplir con mis responsabilidades personales.",tipo:"l"},
  {id:10,cat:"Desarrollo",txt:"Tengo oportunidades reales de aprender y crecer acá.",tipo:"l"},
  {id:11,cat:"Reconocimiento",txt:"Recibo reconocimiento cuando hago un buen trabajo.",tipo:"l"},
  {id:12,cat:"Herramientas",txt:"Cuento con las herramientas necesarias para hacer bien mi trabajo.",tipo:"l"},
  {id:13,cat:"Comentario",txt:"¿Qué cambiarías para sentirte mejor en el trabajo?",tipo:"a"},
];
const LIKERT = ["Nunca","Casi nunca","Algunas veces","Casi siempre","Siempre"];
const CATS_RIESGO = ["Carga de trabajo","Autonomía","Jornada","Liderazgo","Relaciones","Respeto","Vida-trabajo","Reconocimiento"];

function scoreColor(s){return s<=40?C.danger:s<=60?C.warning:s<=79?"#3B82F6":C.success}
function scoreLabel(s){return s<=40?"Crítico":s<=60?"En Riesgo":s<=79?"Aceptable":"Óptimo"}

function calcScore(resps){
  if(!resps||resps.length<MIN_RESP)return null;
  let tot=0,cnt=0;
  resps.forEach(r=>PREGUNTAS.forEach(p=>{
    if(p.tipo==="l"&&r.respuestas?.[p.id]){
      const inv=[1,2,3,5].includes(p.id);
      tot+=(inv?6-r.respuestas[p.id]:r.respuestas[p.id])/5*100; cnt++;
    }
  }));
  return cnt>0?Math.round(tot/cnt):null;
}
function calcPorEquipo(resps){
  const out={};
  EQUIPOS.forEach(eq=>{const r=resps.filter(x=>x.equipo===eq);out[eq]={score:calcScore(r),total:r.length};});
  return out;
}
function calcCats(resps){
  if(!resps||resps.length<MIN_RESP)return null;
  const cats={};
  PREGUNTAS.filter(p=>p.tipo==="l").forEach(p=>{
    const vals=[];
    resps.forEach(r=>{if(r.respuestas?.[p.id]){const inv=[1,2,3,5].includes(p.id);vals.push(inv?6-r.respuestas[p.id]:r.respuestas[p.id]);}});
    if(vals.length>0)cats[p.cat]=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length/5*100);
  });
  return cats;
}

const GS=`*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#F0F4F8}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:99px}@keyframes cb{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`;

const Bdg=({text,color,sm=true})=><span style={{background:color+"20",color,border:`1px solid ${color}40`,padding:sm?"2px 8px":"4px 12px",borderRadius:20,fontSize:sm?11:13,fontWeight:600,whiteSpace:"nowrap"}}>{text}</span>;
const PBar=({v,color,h=8})=><div style={{background:"#E8EEF4",borderRadius:99,height:h,overflow:"hidden",flex:1}}><div style={{width:`${Math.min(v,100)}%`,height:"100%",background:color,borderRadius:99,transition:"width .8s"}}/></div>;
const KPI=({label,value,unit,icon,color})=>(
  <div style={{background:C.white,borderRadius:14,padding:"16px 18px",border:"1px solid #E8EEF4",borderTop:`3px solid ${color}`}}>
    <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:C.neutral,fontWeight:500}}>{label}</span><span style={{fontSize:20}}>{icon}</span></div>
    <div style={{marginTop:6}}><span style={{fontSize:28,fontWeight:800,color:C.primary,letterSpacing:"-1px"}}>{value}</span>{unit&&<span style={{fontSize:13,color:C.neutral,marginLeft:4}}>{unit}</span>}</div>
  </div>
);
const NoData=({n})=>(
  <div style={{background:C.light,borderRadius:10,padding:"12px 16px",display:"flex",gap:10,alignItems:"center"}}>
    <span style={{fontSize:18}}>⏳</span>
    <span style={{fontSize:12,color:C.neutral,fontStyle:"italic"}}>Datos insuficientes — necesitás al menos {MIN_RESP} respuestas para ver scores confiables (actual: {n})</span>
  </div>
);

// LOGIN
const Login=({onLogin})=>{
  const [em,setEm]=useState("");const [pw,setPw]=useState("");const [err,setErr]=useState("");const [ld,setLd]=useState(false);
  const go=()=>{setLd(true);setErr("");setTimeout(()=>{if(em.trim()===ADMIN_EMAIL&&pw===ADMIN_PASS)onLogin();else setErr("Correo o contraseña incorrectos");setLd(false);},500);};
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.primary},${C.secondary})`,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.white,borderRadius:24,padding:"36px 32px",width:"100%",maxWidth:400,boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
        <div style={{textAlign:"center",marginBottom:28}}><div style={{fontSize:48,marginBottom:10}}>🔭</div><h1 style={{fontSize:22,fontWeight:800,color:C.primary,marginBottom:4}}>TeamScope Paraguay</h1><p style={{fontSize:13,color:C.neutral}}>Acceso administrador · TechCorp Paraguay S.A.</p></div>
        {[["Correo electrónico","email",em,setEm,"admin@techcorp.com.py"],["Contraseña","password",pw,setPw,"••••••••"]].map(([lbl,type,val,set,ph],i)=>(
          <div key={i} style={{marginBottom:14}}>
            <label style={{fontSize:12,color:C.neutral,fontWeight:500,display:"block",marginBottom:6}}>{lbl}</label>
            <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph} onKeyDown={e=>e.key==="Enter"&&go()}
              style={{width:"100%",padding:"12px 14px",border:"2px solid #E8EEF4",borderRadius:12,fontSize:14,color:C.primary,outline:"none",fontFamily:"'DM Sans',sans-serif"}}
              onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor="#E8EEF4"}/>
          </div>
        ))}
        {err&&<p style={{color:C.danger,fontSize:13,marginBottom:14,textAlign:"center"}}>❌ {err}</p>}
        <button onClick={go} disabled={ld} style={{width:"100%",background:ld?"#E8EEF4":C.accent,color:C.white,border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{ld?"⏳ Verificando...":"Ingresar al panel"}</button>
        <p style={{textAlign:"center",fontSize:11,color:C.neutral,marginTop:16}}>🔒 Ley 1682/01 de Datos Personales · Paraguay</p>
      </div>
    </div>
  );
};

// ENCUESTA
const Encuesta=({preguntas,onVolver})=>{
  const [paso,setPaso]=useState(0);const [equipo,setEquipo]=useState("");const [resps,setResps]=useState({});const [done,setDone]=useState(false);const [saving,setSaving]=useState(false);const [err,setErr]=useState("");
  const q=preguntas[paso];const prog=Math.round(paso/preguntas.length*100);
  const guardar=async()=>{setSaving(true);try{await addDoc(collection(db,"respuestas"),{equipo,respuestas:resps,timestamp:serverTimestamp()});setDone(true);}catch{setErr("Error al guardar. Intentá de nuevo.");}setSaving(false);};
  if(!equipo)return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.primary},${C.secondary})`,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.white,borderRadius:24,padding:36,maxWidth:460,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
        <div style={{textAlign:"center",marginBottom:24}}><div style={{fontSize:40,marginBottom:10}}>🔭</div><h2 style={{fontSize:20,fontWeight:800,color:C.primary,marginBottom:6}}>Encuesta de Clima Laboral</h2><p style={{fontSize:13,color:C.neutral,lineHeight:1.6}}>100% anónima · Ley 1682/01 · Paraguay</p></div>
        <p style={{fontSize:14,fontWeight:600,color:C.primary,marginBottom:14}}>¿A qué equipo pertenecés?</p>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {EQUIPOS.map(eq=>(
            <button key={eq} onClick={()=>setEquipo(eq)} style={{border:"2px solid #E8EEF4",borderRadius:12,padding:"12px 16px",fontSize:14,cursor:"pointer",textAlign:"left",background:C.white,color:C.primary,fontWeight:500,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:10}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background=C.accent+"10";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#E8EEF4";e.currentTarget.style.background=C.white;}}>
              <span style={{fontSize:20}}>{eq==="Desarrollo"?"💻":eq==="QA"?"🧪":eq==="DevOps"?"⚙️":eq==="Data"?"📊":"🎧"}</span>{eq}
            </button>
          ))}
        </div>
        {onVolver&&<button onClick={onVolver} style={{marginTop:18,background:"transparent",border:"none",color:C.neutral,cursor:"pointer",fontSize:13,width:"100%",textAlign:"center",fontFamily:"'DM Sans',sans-serif"}}>← Volver al panel</button>}
      </div>
    </div>
  );
  if(done)return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.primary},${C.secondary})`,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.white,borderRadius:24,padding:40,textAlign:"center",maxWidth:440,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
        <div style={{fontSize:56,marginBottom:14}}>🎉</div>
        <h2 style={{fontSize:24,fontWeight:800,color:C.primary,marginBottom:8}}>¡Gracias por participar!</h2>
        <p style={{color:C.neutral,fontSize:14,lineHeight:1.6,marginBottom:20}}>Tu opinión es completamente anónima y ayuda a mejorar el ambiente de trabajo.</p>
        <div style={{background:C.light,borderRadius:14,padding:18,marginBottom:20}}><div style={{fontSize:11,color:C.neutral,marginBottom:4}}>Equipo · Preguntas respondidas</div><div style={{fontSize:18,fontWeight:800,color:C.accent}}>{equipo} · {Object.keys(resps).length}/{preguntas.length}</div></div>
        <p style={{fontSize:12,color:C.neutral}}>Podés cerrar esta ventana.</p>
      </div>
    </div>
  );
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.primary},${C.secondary})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 16px"}}>
      <div style={{width:"100%",maxWidth:560,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",color:"rgba(255,255,255,.7)",fontSize:12,marginBottom:8}}><span>Encuesta Clima TI · {equipo} · Confidencial</span><span style={{color:C.accent,fontWeight:700}}>{paso}/{preguntas.length}</span></div>
        <div style={{background:"rgba(255,255,255,.15)",borderRadius:99,height:5,overflow:"hidden"}}><div style={{width:`${prog}%`,height:"100%",background:C.accent,borderRadius:99,transition:"width .5s"}}/></div>
      </div>
      <div style={{background:C.white,borderRadius:20,padding:32,maxWidth:560,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <Bdg text={q.cat} color={C.secondary} sm={false}/>
        <p style={{margin:"18px 0 24px",fontSize:17,fontWeight:600,color:C.primary,lineHeight:1.5}}>{q.txt}</p>
        {q.tipo==="l"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>{LIKERT.map((op,i)=>{const sel=resps[q.id]===i+1;return(<button key={i} onClick={()=>setResps(p=>({...p,[q.id]:i+1}))} style={{border:`2px solid ${sel?C.accent:"#E8EEF4"}`,borderRadius:12,padding:"11px 16px",fontSize:13,cursor:"pointer",textAlign:"left",background:sel?C.accent+"15":C.white,color:C.primary,fontWeight:sel?700:400,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:10}}><span style={{width:24,height:24,borderRadius:"50%",background:sel?C.accent:"#E8EEF4",color:sel?C.white:C.neutral,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</span>{op}</button>);})}</div>}
        {q.tipo==="a"&&<textarea value={resps[q.id]||""} onChange={e=>setResps(p=>({...p,[q.id]:e.target.value}))} placeholder="Escribí tu respuesta aquí... (opcional)" style={{width:"100%",minHeight:110,border:"2px solid #E8EEF4",borderRadius:12,padding:14,fontSize:13,fontFamily:"'DM Sans',sans-serif",color:C.primary,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>}
        {err&&<p style={{color:C.danger,fontSize:13,marginTop:10}}>{err}</p>}
        <div style={{display:"flex",gap:10,marginTop:24,justifyContent:"space-between"}}>
          <button onClick={()=>{if(paso>0)setPaso(p=>p-1);else setEquipo("");}} style={{border:"2px solid #E8EEF4",background:C.white,borderRadius:12,padding:"11px 22px",fontSize:13,fontWeight:600,cursor:"pointer",color:C.neutral,fontFamily:"'DM Sans',sans-serif"}}>← Anterior</button>
          {paso<preguntas.length-1?<button onClick={()=>setPaso(p=>p+1)} disabled={q.tipo==="l"&&!resps[q.id]} style={{background:(q.tipo==="l"&&!resps[q.id])?"#E8EEF4":C.accent,color:C.white,border:"none",borderRadius:12,padding:"11px 26px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Siguiente →</button>
          :<button onClick={guardar} disabled={saving} style={{background:saving?"#E8EEF4":C.success,color:C.white,border:"none",borderRadius:12,padding:"11px 26px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{saving?"⏳ Guardando...":"Enviar ✓"}</button>}
        </div>
      </div>
      <p style={{color:"rgba(255,255,255,.5)",fontSize:11,marginTop:14,textAlign:"center"}}>🔒 Anónimo · Ley 1682/01 de Datos Personales · Paraguay</p>
    </div>
  );
};

// CHATBOT
const Chat=({onClose,resps})=>{
  const [msgs,setMsgs]=useState([{r:"a",t:"¡Hola! Soy tu asistente con datos en tiempo real. ¿En qué te puedo ayudar?"}]);
  const [inp,setInp]=useState("");const [ld,setLd]=useState(false);const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,ld]);
  const score=calcScore(resps);
  const send=async()=>{
    if(!inp.trim()||ld)return;const txt=inp.trim();setMsgs(p=>[...p,{r:"user",t:txt}]);setInp("");setLd(true);
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,system:`Experto en clima laboral TI en Paraguay. TechCorp, ${TOTAL} funcionarios. ${resps.length} respuestas reales. Score: ${score!==null?score+"/100":"insuficiente"}. Respondé en español rioplatense, usá "vos", máximo 4 puntos.`,messages:[...msgs.map(m=>({role:m.r==="a"?"assistant":"user",content:m.t})),{role:"user",content:txt}]})});const d=await r.json();setMsgs(p=>[...p,{r:"a",t:d.content?.map(c=>c.text||"").join("")||"Error."}]);}catch{setMsgs(p=>[...p,{r:"a",t:"❌ Error de conexión."}]);}setLd(false);
  };
  return(
    <div style={{position:"fixed",bottom:24,right:24,width:340,height:480,background:C.white,borderRadius:16,boxShadow:"0 16px 48px rgba(10,35,66,.2)",display:"flex",flexDirection:"column",border:`1px solid ${C.accent}30`,zIndex:1000}}>
      <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,padding:"12px 16px",borderRadius:"16px 16px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}><div style={{width:30,height:30,background:C.accent,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🤖</div><div><div style={{color:C.white,fontWeight:700,fontSize:13}}>Asistente IA</div><div style={{color:C.accent,fontSize:10}}>● {resps.length} respuestas reales</div></div></div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:C.white,width:24,height:24,borderRadius:6,cursor:"pointer",fontSize:12}}>✕</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.r==="user"?"flex-end":"flex-start",gap:6,alignItems:"flex-start"}}>
            {m.r==="a"&&<div style={{width:22,height:22,background:C.accent+"20",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>🤖</div>}
            <div style={{maxWidth:"80%",padding:"8px 11px",background:m.r==="user"?`linear-gradient(135deg,${C.secondary},${C.primary})`:C.light,color:m.r==="user"?C.white:C.primary,borderRadius:m.r==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",fontSize:12,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.t}</div>
          </div>
        ))}
        {ld&&<div style={{display:"flex",gap:4,padding:"8px 11px",background:C.light,borderRadius:"12px 12px 12px 4px",width:"fit-content"}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,background:C.accent,borderRadius:"50%",animation:`cb 1s infinite ${i*.2}s`}}/>)}</div>}
        <div ref={endRef}/>
      </div>
      <div style={{padding:"0 10px 8px",display:"flex",flexWrap:"wrap",gap:4}}>
        {["¿Equipos con más riesgo?","¿Cómo mejorar tasa de respuesta?","Plan para QA"].map((q,i)=><button key={i} onClick={()=>setInp(q)} style={{background:C.light,border:`1px solid ${C.accent}40`,borderRadius:14,padding:"3px 8px",fontSize:10,color:C.secondary,cursor:"pointer"}}>{q}</button>)}
      </div>
      <div style={{padding:"8px 10px",borderTop:"1px solid #E8EEF4",display:"flex",gap:6}}>
        <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Preguntá sobre tus resultados..." style={{flex:1,border:"1px solid #E8EEF4",borderRadius:9,padding:"8px 10px",fontSize:12,fontFamily:"'DM Sans',sans-serif",outline:"none",color:C.primary,background:C.light}}/>
        <button onClick={send} disabled={ld||!inp.trim()} style={{background:inp.trim()?C.accent:"#E8EEF4",color:C.white,border:"none",borderRadius:9,width:32,cursor:"pointer",fontSize:14}}>➤</button>
      </div>
    </div>
  );
};

// DASHBOARD
const Dashboard=({resps})=>{
  const scoreG=calcScore(resps);const porEq=calcPorEquipo(resps);
  const tasa=Math.round(resps.length/TOTAL*100);
  const hoy=new Date();
  const hoyN=resps.filter(r=>{const t=r.timestamp?.toDate?.();return t&&t.getDate()===hoy.getDate()&&t.getMonth()===hoy.getMonth()&&t.getFullYear()===hoy.getFullYear();}).length;
  const eqData=[...EQUIPOS.map(eq=>({n:eq,...porEq[eq]}))].sort((a,b)=>(a.score||999)-(b.score||999));
  const comments=resps.filter(r=>r.respuestas?.[13]).slice(0,5);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:22}}>
      <div style={{background:"#F0FFF4",border:"1px solid #A7F3D0",borderRadius:12,padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{animation:"pulse 2s infinite"}}>🟢</span>
        <span style={{fontSize:12,color:C.primary,fontWeight:600}}>Panel en tiempo real · {resps.length} respuesta(s) de {TOTAL} funcionarios</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14}}>
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,borderRadius:14,padding:"16px 18px",color:C.white}}>
          <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:6}}>Score de Clima General</div>
          {scoreG!==null?<><div style={{fontSize:38,fontWeight:800,color:scoreColor(scoreG),letterSpacing:"-2px"}}>{scoreG}</div><div style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>/100 · {scoreLabel(scoreG)}</div></>
          :<div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginTop:6}}>Necesitás {MIN_RESP-resps.length} respuesta(s) más...</div>}
        </div>
        <KPI label="Respuestas recibidas" value={resps.length} unit={`de ${TOTAL}`} icon="📋" color={C.success}/>
        <KPI label="Tasa de respuesta"    value={tasa}         unit="%"             icon="📊" color={C.accent}/>
        <KPI label="Respuestas hoy"       value={hoyN}         unit="hoy"           icon="✅" color={C.secondary}/>
        <KPI label="Equipos con datos"    value={EQUIPOS.filter(eq=>porEq[eq].total>=MIN_RESP).length} unit={`de ${EQUIPOS.length}`} icon="👥" color={C.warning}/>
      </div>
      {resps.length<MIN_RESP&&<div style={{background:"#FFF5F5",border:"1px solid #FECACA",borderRadius:12,padding:"12px 16px",fontSize:13,color:C.primary}}>⚠️ Solo {resps.length} respuesta(s). Compartí el link de la encuesta con los funcionarios para obtener datos confiables.</div>}
      <div>
        <h2 style={{fontSize:17,fontWeight:800,color:C.primary,marginBottom:3}}>Clima por Equipo TI</h2>
        <p style={{fontSize:12,color:C.neutral,marginBottom:12}}>Scores calculados en tiempo real · datos reales únicamente</p>
        <div style={{background:C.white,borderRadius:14,padding:20,border:"1px solid #E8EEF4"}}>
          {eqData.map((dep,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"120px 1fr 55px 100px 75px",alignItems:"center",gap:12,padding:"9px 0",borderBottom:i<eqData.length-1?"1px solid #F1F5F9":"none"}}>
              <span style={{fontSize:13,fontWeight:600,color:C.primary}}>{dep.n}</span>
              {dep.score!==null?<><PBar v={dep.score} color={scoreColor(dep.score)} h={9}/><span style={{fontSize:14,fontWeight:800,color:scoreColor(dep.score)}}>{dep.score}</span><Bdg text={scoreLabel(dep.score)} color={scoreColor(dep.score)}/></>
              :<><PBar v={0} color="#E8EEF4" h={9}/><span style={{fontSize:11,color:C.neutral}}>—</span><Bdg text="Sin datos" color={C.neutral}/></>}
              <span style={{fontSize:11,color:C.neutral}}>{dep.total} resp.</span>
            </div>
          ))}
        </div>
      </div>
      {comments.length>0&&(
        <div>
          <h2 style={{fontSize:17,fontWeight:800,color:C.primary,marginBottom:12}}>🧠 Comentarios Recientes</h2>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {comments.map((r,i)=>(
              <div key={i} style={{background:C.white,borderRadius:12,padding:"12px 16px",border:"1px solid #E8EEF4",display:"flex",gap:10,alignItems:"flex-start"}}>
                <Bdg text={r.equipo} color={C.secondary}/><p style={{margin:0,fontSize:13,color:C.primary,lineHeight:1.6}}>"{r.respuestas[13]}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ENCUESTAS
const ModEnc=({resps,onResponder})=>{
  const [encs,setEncs]=useState([{id:1,nombre:"Clima TI 2024 - Completa",preguntas:[...PREGUNTAS],activa:true}]);
  const [prev,setPrev]=useState(null);const [editEnc,setEditEnc]=useState(null);const [editPreg,setEditPreg]=useState(null);const [editTxt,setEditTxt]=useState("");
  const [creando,setCreando]=useState(false);const [newN,setNewN]=useState("");const [newP,setNewP]=useState([]);
  const [npTxt,setNpTxt]=useState("");const [npCat,setNpCat]=useState("Carga de trabajo");const [npTipo,setNpTipo]=useState("l");
  const CATS=["Carga de trabajo","Autonomía","Jornada","Liderazgo","Relaciones","Respeto","Vida-trabajo","Reconocimiento","Herramientas","Comentario"];
  const hoy=new Date();const hoyN=resps.filter(r=>{const t=r.timestamp?.toDate?.();return t&&t.getDate()===hoy.getDate()&&t.getMonth()===hoy.getMonth();}).length;
  const addP=()=>{if(!npTxt.trim())return;setNewP(p=>[...p,{id:Date.now(),cat:npCat,txt:npTxt.trim(),tipo:npTipo}]);setNpTxt("");};
  const saveEnc=()=>{if(!newN.trim()||!newP.length){alert("Poné un nombre y al menos una pregunta.");return;}setEncs(p=>[...p,{id:Date.now(),nombre:newN.trim(),preguntas:newP,activa:true}]);setNewN("");setNewP([]);setCreando(false);alert("✅ Encuesta creada correctamente.");};
  const saveEP=(eid,pid)=>{setEncs(p=>p.map(e=>e.id===eid?{...e,preguntas:e.preguntas.map(p=>p.id===pid?{...p,txt:editTxt}:p)}:e));setEditPreg(null);setEditTxt("");};
  const delP=(eid,pid)=>{if(!confirm("¿Eliminar esta pregunta?"))return;setEncs(p=>p.map(e=>e.id===eid?{...e,preguntas:e.preguntas.filter(p=>p.id!==pid)}:e));};
  const tasa=Math.round(resps.length/TOTAL*100);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        <KPI label="Encuestas activas"  value={encs.filter(e=>e.activa).length} unit="activas" icon="📊" color={C.accent}/>
        <KPI label="Total funcionarios" value={TOTAL}                           unit="pers."   icon="👥" color={C.success}/>
        <KPI label="Respuestas hoy"     value={hoyN}                            unit="hoy"     icon="✅" color={C.secondary}/>
      </div>
      {!creando
        ?<button onClick={()=>setCreando(true)} style={{background:C.accent,color:C.white,border:"none",borderRadius:12,padding:"12px 20px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",width:"fit-content"}}>✏️ Crear nueva encuesta manualmente</button>
        :<div style={{background:`linear-gradient(135deg,${C.accent}08,${C.secondary}06)`,border:`1px solid ${C.accent}30`,borderRadius:14,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><h3 style={{fontSize:15,fontWeight:700,color:C.primary}}>✏️ Nueva encuesta manual</h3><button onClick={()=>{setCreando(false);setNewP([]);}} style={{background:"transparent",border:"none",color:C.neutral,cursor:"pointer",fontSize:20}}>✕</button></div>
          <label style={{fontSize:12,color:C.neutral,fontWeight:500,display:"block",marginBottom:6}}>Nombre de la encuesta</label>
          <input value={newN} onChange={e=>setNewN(e.target.value)} placeholder="Ej: Pulso mensual Mayo 2025" style={{width:"100%",border:"1.5px solid #E8EEF4",borderRadius:9,padding:"9px 12px",fontSize:13,color:C.primary,outline:"none",fontFamily:"'DM Sans',sans-serif",marginBottom:14}}/>
          <div style={{background:C.white,borderRadius:10,padding:14,border:"1px solid #E8EEF4",marginBottom:12}}>
            <p style={{fontSize:12,fontWeight:700,color:C.primary,marginBottom:10}}>Agregar pregunta</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
              <input value={npTxt} onChange={e=>setNpTxt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addP()} placeholder="Escribí el texto de la pregunta..." style={{flex:1,minWidth:180,border:"1.5px solid #E8EEF4",borderRadius:8,padding:"8px 11px",fontSize:12,color:C.primary,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
              <select value={npCat} onChange={e=>setNpCat(e.target.value)} style={{border:"1.5px solid #E8EEF4",borderRadius:8,padding:"8px 10px",fontSize:12,color:C.primary,fontFamily:"'DM Sans',sans-serif"}}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
              <select value={npTipo} onChange={e=>setNpTipo(e.target.value)} style={{border:"1.5px solid #E8EEF4",borderRadius:8,padding:"8px 10px",fontSize:12,color:C.primary,fontFamily:"'DM Sans',sans-serif"}}><option value="l">Escala 1-5</option><option value="a">Respuesta abierta</option></select>
              <button onClick={addP} style={{background:C.accent,color:C.white,border:"none",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>+ Agregar</button>
            </div>
            {newP.length>0&&<div style={{marginTop:8}}><p style={{fontSize:11,color:C.neutral,marginBottom:6}}>{newP.length} pregunta(s):</p>{newP.map((p,i)=><div key={i} style={{display:"flex",gap:7,alignItems:"center",padding:"5px 0",borderBottom:"1px solid #F1F5F9"}}><span style={{fontSize:9,color:C.neutral,minWidth:16}}>{i+1}.</span><span style={{flex:1,fontSize:11,color:C.primary}}>{p.txt}</span><Bdg text={p.cat} color={C.secondary}/><button onClick={()=>setNewP(p=>p.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",color:C.danger,cursor:"pointer",fontSize:13}}>✕</button></div>)}</div>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={saveEnc} style={{background:C.success,color:C.white,border:"none",borderRadius:9,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>✅ Guardar encuesta</button>
            <button onClick={()=>{setCreando(false);setNewP([]);}} style={{background:C.light,color:C.neutral,border:"none",borderRadius:9,padding:"10px 16px",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancelar</button>
          </div>
        </div>
      }
      <div>
        <h2 style={{fontSize:17,fontWeight:800,color:C.primary,marginBottom:14}}>Encuestas disponibles</h2>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {encs.map(enc=>(
            <div key={enc.id} style={{background:C.white,borderRadius:14,padding:18,border:"1px solid #E8EEF4"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div><div style={{fontSize:14,fontWeight:700,color:C.primary,marginBottom:4}}>{enc.nombre}</div><div style={{display:"flex",gap:12,alignItems:"center"}}><span style={{fontSize:11,color:C.neutral}}>📝 {enc.preguntas.length} preguntas</span><Bdg text={enc.activa?"Activa":"Inactiva"} color={enc.activa?C.success:C.neutral}/></div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:800,color:C.accent}}>{tasa}%</div><div style={{fontSize:11,color:C.neutral}}>{resps.length}/{TOTAL}</div></div>
              </div>
              <div style={{marginBottom:12}}><PBar v={tasa} color={C.accent} h={6}/></div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>setPrev(prev===enc.id?null:enc.id)} style={{background:`${C.accent}15`,color:"#0A7A6E",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>👁 {prev===enc.id?"Ocultar":"Vista previa"}</button>
                <button onClick={()=>setEditEnc(editEnc===enc.id?null:enc.id)} style={{background:`${C.secondary}12`,color:C.secondary,border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>✏️ {editEnc===enc.id?"Cerrar edición":"Editar preguntas"}</button>
                <button onClick={()=>{const l=window.location.origin+"?encuesta=true";navigator.clipboard.writeText(l);alert("✅ Link copiado:\n"+l+"\n\nEste link va DIRECTO a la encuesta, SIN login.\nCompartilo en el grupo de WhatsApp 📱");}} style={{background:"#10B98115",color:"#065F46",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>📤 Copiar link encuesta</button>
                <button onClick={()=>onResponder(enc.preguntas)} style={{background:C.light,color:C.neutral,border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>▶ Probar</button>
              </div>
              {prev===enc.id&&<div style={{marginTop:12,background:C.light,borderRadius:10,padding:14}}><p style={{fontSize:12,fontWeight:700,color:C.primary,marginBottom:10}}>Vista previa — {enc.preguntas.length} preguntas:</p>{enc.preguntas.map((p,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"5px 0",borderBottom:"1px solid #E8EEF4"}}><div style={{width:18,height:18,background:C.accent+"20",color:"#0A7A6E",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{flex:1,fontSize:12,color:C.primary}}>{p.txt}</div><Bdg text={p.cat} color={C.secondary}/></div>)}</div>}
              {editEnc===enc.id&&(
                <div style={{marginTop:12,background:"#FFFBEB",borderRadius:10,padding:16,border:"1px solid #FDE68A"}}>
                  <p style={{fontSize:13,fontWeight:700,color:C.primary,marginBottom:12}}>✏️ Editar preguntas de "{enc.nombre}"</p>
                  {enc.preguntas.map((p,i)=>(
                    <div key={p.id} style={{background:C.white,borderRadius:9,padding:11,marginBottom:7,border:"1px solid #E8EEF4"}}>
                      {editPreg?.eid===enc.id&&editPreg?.pid===p.id
                        ?<div><textarea value={editTxt} onChange={e=>setEditTxt(e.target.value)} style={{width:"100%",border:`2px solid ${C.accent}`,borderRadius:8,padding:10,fontSize:13,fontFamily:"'DM Sans',sans-serif",color:C.primary,resize:"vertical",outline:"none",boxSizing:"border-box",minHeight:65,marginBottom:8}}/><div style={{display:"flex",gap:6}}><button onClick={()=>saveEP(enc.id,p.id)} style={{background:C.success,color:C.white,border:"none",borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>💾 Guardar</button><button onClick={()=>{setEditPreg(null);setEditTxt("");}} style={{background:C.light,color:C.neutral,border:"none",borderRadius:7,padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancelar</button></div></div>
                        :<div style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:11,fontWeight:700,color:C.neutral,minWidth:18}}>{i+1}.</span><span style={{flex:1,fontSize:12,color:C.primary,lineHeight:1.5}}>{p.txt}</span><div style={{display:"flex",gap:4,flexShrink:0}}><button onClick={()=>{setEditPreg({eid:enc.id,pid:p.id});setEditTxt(p.txt);}} style={{background:`${C.secondary}12`,color:C.secondary,border:"none",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>✏️ Editar</button><button onClick={()=>delP(enc.id,p.id)} style={{background:`${C.danger}12`,color:C.danger,border:"none",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>🗑 Eliminar</button></div></div>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// RIESGO PSICOSOCIAL
const ModRiesgo=({resps})=>{
  const scoreG=calcScore(resps);const cats=calcCats(resps);const n=resps.length;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`,borderRadius:16,padding:24,color:C.white,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:6}}>Marco OIT / Resolución MTESS Paraguay</div><h2 style={{fontSize:20,fontWeight:800,color:C.white,marginBottom:4}}>Factores de Riesgo Psicosocial</h2><p style={{fontSize:12,color:"rgba(255,255,255,.7)"}}>Datos en tiempo real · {n} colaborador(es) evaluado(s)</p></div>
        <div style={{textAlign:"center"}}>{scoreG!==null?<><div style={{fontSize:38,fontWeight:800,color:scoreColor(scoreG)}}>{scoreG}</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>/100 · <Bdg text={scoreLabel(scoreG)} color={scoreColor(scoreG)}/></div></>:<div style={{fontSize:12,color:"rgba(255,255,255,.6)",maxWidth:120,textAlign:"center"}}>Necesitás {MIN_RESP-n} respuesta(s) más</div>}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
        <KPI label="Colaboradores evaluados" value={n}                                                   unit="pers."   icon="👥" color={C.success}/>
        <KPI label="Factores en riesgo"       value={cats?Object.values(cats).filter(s=>s<65).length:"—"} unit={cats?"categ.":""} icon="⚠️" color={C.warning}/>
      </div>
      <div style={{background:C.white,borderRadius:14,padding:20,border:"1px solid #E8EEF4"}}>
        <h3 style={{fontSize:15,fontWeight:800,color:C.primary,marginBottom:16}}>Categorías de Riesgo Psicosocial</h3>
        {cats?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>{CATS_RIESGO.map((cat,i)=>{const s=cats[cat]??null;return(<div key={i} style={{paddingBottom:12,borderBottom:"1px solid #F1F5F9"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:12,fontWeight:600,color:C.primary}}>{cat}</span>{s!==null?<Bdg text={`${s}/100`} color={scoreColor(s)}/>:<Bdg text="Sin datos" color={C.neutral}/>}</div>{s!==null?<PBar v={s} color={scoreColor(s)} h={8}/>:<PBar v={0} color="#E8EEF4" h={8}/>}</div>);})}</div>:<NoData n={n}/>}
      </div>
      {cats&&Object.values(cats).some(s=>s<65)&&(
        <div style={{background:"#FFF8EE",borderRadius:14,padding:20,border:"1px solid #FDE68A"}}>
          <h3 style={{fontSize:14,fontWeight:700,color:C.primary,marginBottom:12}}>⚠️ Factores que requieren acción inmediata</h3>
          {CATS_RIESGO.filter(c=>cats[c]!==undefined&&cats[c]<65).map((cat,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #FDE68A"}}>
              <div><div style={{fontSize:13,fontWeight:600,color:C.primary}}>{cat}</div><div style={{fontSize:11,color:C.neutral,marginTop:2}}>Requiere programa de intervención documentado</div></div>
              <Bdg text={`${cats[cat]}/100`} color={C.danger}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// PLANES
const ModPlanes=({resps})=>{
  const [gen,setGen]=useState(false);const [plan,setPlan]=useState("");const [area,setArea]=useState("QA");
  const porEq=calcPorEquipo(resps);
  const genPlan=async()=>{setGen(true);setPlan("");const score=porEq[area]?.score;const tot=porEq[area]?.total||0;
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:`Experto en bienestar TI Paraguay. Plan SMART para equipo "${area}" de TechCorp (${TOTAL} funcionarios). Score actual: ${score!==null?score+"/100":"insuficiente ("+tot+" respuestas)"}. 3 iniciativas, plazos 30/60/90 días, KPIs en USD. Sin nombres de personas. Usá "vos".`}]})});const d=await r.json();setPlan(d.content?.map(c=>c.text||"").join("")||"Error.");}catch{setPlan("❌ Error de conexión.");}setGen(false);};
  const planes=[
    {id:1,titulo:"Reducción de carga en QA",            area:"QA",        pri:"Alta", est:"En progreso",av:35,kpi:"Bugs -20%"},
    {id:2,titulo:"Programa de reconocimiento developers",area:"Desarrollo",pri:"Media",est:"Iniciado",   av:60,kpi:"Score +15pts"},
    {id:3,titulo:"Talleres de liderazgo tech leads",    area:"Soporte",   pri:"Alta", est:"Planeado",    av:10,kpi:"NPS +20pts"},
    {id:4,titulo:"Política de desconexión digital",     area:"Todos",     pri:"Media",est:"En progreso",av:45,kpi:"Interferencia -10pts"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}><KPI label="En progreso" value={2} icon="🔄" color={C.warning}/><KPI label="Iniciado" value={1} icon="🚀" color={C.accent}/><KPI label="Planeado" value={1} icon="📋" color={C.neutral}/></div>
      <div style={{background:`linear-gradient(135deg,${C.accent}08,${C.secondary}06)`,borderRadius:14,padding:20,border:`1px solid ${C.accent}30`}}>
        <h3 style={{fontSize:15,fontWeight:700,color:C.primary,marginBottom:4}}>🤖 Generador de Planes con IA</h3>
        <p style={{fontSize:12,color:C.neutral,marginBottom:14}}>Planes SMART basados en datos reales · sin nombres de personas</p>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <select value={area} onChange={e=>setArea(e.target.value)} style={{border:"1px solid #E8EEF4",borderRadius:9,padding:"9px 12px",fontSize:13,color:C.primary,fontFamily:"'DM Sans',sans-serif"}}>{EQUIPOS.map(d=><option key={d}>{d}</option>)}</select>
          <button onClick={genPlan} disabled={gen} style={{background:gen?"#E8EEF4":C.accent,color:C.white,border:"none",borderRadius:9,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{gen?"⏳ Generando...":"✨ Generar Plan con IA"}</button>
        </div>
        {plan&&<div style={{marginTop:14,background:C.white,borderRadius:10,padding:16,border:"1px solid #E8EEF4",maxHeight:260,overflowY:"auto"}}><pre style={{margin:0,fontSize:12,color:C.primary,fontFamily:"'DM Sans',sans-serif",whiteSpace:"pre-wrap",lineHeight:1.7}}>{plan}</pre></div>}
      </div>
      <div>
        <h2 style={{fontSize:17,fontWeight:800,color:C.primary,marginBottom:14}}>Planes Activos</h2>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {planes.map(p=>{const ec=p.est==="En progreso"?C.warning:p.est==="Iniciado"?C.accent:C.neutral;const pc=p.pri==="Alta"?C.danger:C.warning;const sr=porEq[p.area]?.score;return(
            <div key={p.id} style={{background:C.white,borderRadius:14,padding:18,border:"1px solid #E8EEF4"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div><div style={{display:"flex",gap:7,alignItems:"center",marginBottom:5}}><span style={{fontSize:14,fontWeight:700,color:C.primary}}>{p.titulo}</span><Bdg text={p.pri} color={pc}/></div>
                <div style={{display:"flex",gap:12,alignItems:"center"}}><span style={{fontSize:11,color:C.neutral}}>📍 {p.area}</span>{sr!==null&&sr!==undefined?<span style={{fontSize:11,color:scoreColor(sr),fontWeight:600}}>Score actual: {sr}/100</span>:<span style={{fontSize:11,color:C.neutral,fontStyle:"italic"}}>Score: sin datos suficientes</span>}</div></div>
                <Bdg text={p.est} color={ec}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:11,color:C.neutral,minWidth:70}}>Avance: {p.av}%</span><PBar v={p.av} color={p.av>=70?C.success:p.av>=30?C.warning:C.danger} h={8}/><Bdg text={p.kpi} color={C.secondary}/></div>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
};

// PREDICCIÓN
const ModPred=({resps})=>{
  const [pred,setPred]=useState(false);const [txt,setTxt]=useState("");
  const porEq=calcPorEquipo(resps);
  const rotData=EQUIPOS.map(eq=>{const d=porEq[eq];const prob=d.score!==null?Math.max(0,Math.round((100-d.score)*.4)):null;return{area:eq,total:d.total,score:d.score,prob};}).sort((a,b)=>(b.prob||0)-(a.prob||0));
  const gen=async()=>{setPred(true);setTxt("");const res=rotData.map(r=>`${r.area}: ${r.total} resp., score ${r.score!==null?r.score:"sin datos"}`).join("; ");
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:`Analista RRHH experto retención TI Paraguay. TechCorp, ${TOTAL} funcionarios. Datos: ${res}. Total: ${resps.length}. ${resps.length<MIN_RESP?"AVISO: pocas respuestas.":""} Proyección 3 y 6 meses, costos USD, top 3 intervenciones. Usá "vos".`}]})});const d=await r.json();setTxt(d.content?.map(c=>c.text||"").join("")||"Error.");}catch{setTxt("❌ Error.");}setPred(false);};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{background:"linear-gradient(135deg,#2D1B69,#1B5E8A)",borderRadius:16,padding:24,color:C.white}}>
        <h2 style={{fontSize:20,fontWeight:800,color:C.white,marginBottom:6}}>🔮 Predicción de Rotación con IA</h2>
        <p style={{fontSize:13,color:"rgba(255,255,255,.7)"}}>Basado en {resps.length} respuesta(s) real(es) · {TOTAL} funcionarios</p>
      </div>
      <div style={{background:C.white,borderRadius:14,padding:20,border:"1px solid #E8EEF4"}}>
        <h3 style={{fontSize:15,fontWeight:800,color:C.primary,marginBottom:14}}>Riesgo de Rotación por Equipo</h3>
        {resps.length>=MIN_RESP?rotData.map((item,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"100px 1fr 50px 75px",alignItems:"center",gap:12,padding:"9px 0",borderBottom:i<rotData.length-1?"1px solid #F1F5F9":"none"}}>
            <span style={{fontSize:13,fontWeight:600,color:C.primary}}>{item.area}</span>
            {item.prob!==null?<><PBar v={item.prob*2.5} color={item.prob>=30?C.danger:item.prob>=20?C.warning:C.success} h={10}/><span style={{fontSize:14,fontWeight:800,color:item.prob>=30?C.danger:item.prob>=20?C.warning:C.success}}>{item.prob}%</span></>:<><PBar v={0} color="#E8EEF4" h={10}/><span style={{fontSize:12,color:C.neutral}}>—</span></>}
            <span style={{fontSize:11,color:C.neutral}}>{item.total} resp.</span>
          </div>
        )):<NoData n={resps.length}/>}
      </div>
      <div style={{background:`linear-gradient(135deg,${C.accent}08,${C.secondary}06)`,borderRadius:14,padding:20,border:`1px solid ${C.accent}30`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div><h3 style={{fontSize:15,fontWeight:700,color:C.primary,marginBottom:3}}>🤖 Análisis Predictivo con IA</h3><p style={{fontSize:12,color:C.neutral}}>Proyecciones y estrategias basadas en datos reales</p></div>
          <button onClick={gen} disabled={pred} style={{background:pred?"#E8EEF4":C.primary,color:C.white,border:"none",borderRadius:9,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{pred?"⏳ Analizando...":"Generar Análisis"}</button>
        </div>
        {txt&&<div style={{background:C.white,borderRadius:10,padding:16,border:"1px solid #E8EEF4",maxHeight:300,overflowY:"auto"}}><pre style={{margin:0,fontSize:12,color:C.primary,fontFamily:"'DM Sans',sans-serif",whiteSpace:"pre-wrap",lineHeight:1.7}}>{txt}</pre></div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:14}}>
        {rotData.map((item,i)=>(
          <div key={i} style={{background:C.white,borderRadius:14,padding:18,border:"1px solid #E8EEF4"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:15,fontWeight:700,color:C.primary}}>{item.area}</span>{item.prob!==null?<Bdg text={item.prob>=30?"Urgente":item.prob>=20?"Alta":item.prob>=10?"Media":"Baja"} color={item.prob>=30?C.danger:item.prob>=20?C.warning:item.prob>=10?C.accent:C.success}/>:<Bdg text="Sin datos" color={C.neutral}/>}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:11,color:C.neutral}}>Respuestas</div><div style={{fontSize:20,fontWeight:800,color:C.primary}}>{item.total}</div></div>
              <div><div style={{fontSize:11,color:C.neutral}}>Riesgo</div><div style={{fontSize:20,fontWeight:800,color:item.prob!==null?(item.prob>=30?C.danger:C.warning):C.neutral}}>{item.prob!==null?`${item.prob}%`:"—"}</div></div>
              {item.score!==null&&<div style={{gridColumn:"span 2"}}><div style={{fontSize:11,color:C.neutral}}>Score clima</div><div style={{fontSize:14,fontWeight:700,color:scoreColor(item.score)}}>{item.score}/100</div></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// APP
export default function App(){
  const [li,setLi]=useState(false);const [mod,setMod]=useState("dashboard");const [modoEnc,setModoEnc]=useState(false);const [pregEnc,setPregEnc]=useState(PREGUNTAS);const [chatOpen,setChatOpen]=useState(false);const [sbCol,setSbCol]=useState(false);const [resps,setResps]=useState([]);
  const urlParams=new URLSearchParams(window.location.search);const esEnc=urlParams.get("encuesta")==="true";
  useEffect(()=>{if(!li&&!esEnc)return;const q=query(collection(db,"respuestas"),orderBy("timestamp","desc"));const u=onSnapshot(q,snap=>{setResps(snap.docs.map(d=>({id:d.id,...d.data()})));},()=>{});return()=>u();},[li]);
  if(esEnc)return<Encuesta preguntas={PREGUNTAS} onVolver={null}/>;
  if(!li)return<Login onLogin={()=>setLi(true)}/>;
  if(modoEnc)return<Encuesta preguntas={pregEnc} onVolver={()=>setModoEnc(false)}/>;
  const nav=[{id:"dashboard",label:"Dashboard",icon:"📊"},{id:"encuestas",label:"Encuestas",icon:"📋"},{id:"riesgo",label:"Riesgo Psicosocial",icon:"🏛️"},{id:"planes",label:"Planes de Acción",icon:"🎯"},{id:"prediccion",label:"Predicción IA",icon:"🔮"}];
  const sA=calcScore(resps);
  return(
    <>
      <style>{GS}</style>
      <div style={{display:"flex",height:"100vh",background:C.light,fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{width:sbCol?64:230,background:C.primary,display:"flex",flexDirection:"column",flexShrink:0,transition:"width .3s",overflow:"hidden",boxShadow:"2px 0 20px rgba(10,35,66,.12)"}}>
          <div style={{padding:sbCol?"18px 14px":"18px 16px",borderBottom:"1px solid rgba(255,255,255,.08)",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,background:C.accent,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🔭</div>
            {!sbCol&&<div><div style={{color:C.white,fontWeight:800,fontSize:14}}>TeamScope</div><div style={{color:C.accent,fontSize:10}}>🇵🇾 Paraguay</div></div>}
          </div>
          {!sbCol&&<div style={{padding:"12px 14px",borderBottom:"1px solid rgba(255,255,255,.08)"}}><div style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"10px 12px"}}><div style={{color:C.white,fontSize:11,fontWeight:600}}>TechCorp Paraguay S.A.</div><div style={{color:"rgba(255,255,255,.5)",fontSize:9,marginTop:2}}>{TOTAL} funcionarios · 5 equipos</div><div style={{display:"flex",alignItems:"center",gap:4,marginTop:5}}><div style={{width:6,height:6,borderRadius:"50%",background:C.success,animation:"pulse 2s infinite"}}/><span style={{color:C.success,fontSize:9,fontWeight:600}}>{resps.length} respuestas en vivo</span></div></div></div>}
          <nav style={{flex:1,padding:"12px 8px",display:"flex",flexDirection:"column",gap:3}}>
            {nav.map(item=><button key={item.id} onClick={()=>setMod(item.id)} style={{background:mod===item.id?C.accent:"transparent",border:"none",borderRadius:9,padding:"9px 12px",display:"flex",alignItems:"center",gap:8,cursor:"pointer",color:mod===item.id?C.white:"rgba(255,255,255,.6)",width:"100%",textAlign:"left",fontFamily:"'DM Sans',sans-serif",justifyContent:sbCol?"center":"flex-start"}}><span style={{fontSize:17,flexShrink:0}}>{item.icon}</span>{!sbCol&&<span style={{fontSize:13,fontWeight:mod===item.id?700:500,whiteSpace:"nowrap"}}>{item.label}</span>}</button>)}
          </nav>
          <div style={{padding:"10px 8px",borderTop:"1px solid rgba(255,255,255,.08)",display:"flex",flexDirection:"column",gap:5}}>
            <button onClick={()=>{setPregEnc(PREGUNTAS);setModoEnc(true);}} style={{background:"rgba(0,196,180,.15)",border:"1px solid rgba(0,196,180,.3)",borderRadius:9,padding:"8px 12px",display:"flex",alignItems:"center",gap:7,cursor:"pointer",color:C.accent,width:"100%",fontFamily:"'DM Sans',sans-serif",justifyContent:sbCol?"center":"flex-start"}}><span style={{fontSize:15,flexShrink:0}}>📝</span>{!sbCol&&<span style={{fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>Probar encuesta</span>}</button>
            <button onClick={()=>setSbCol(s=>!s)} style={{background:"transparent",border:"none",borderRadius:9,padding:"8px 12px",display:"flex",alignItems:"center",gap:7,cursor:"pointer",color:"rgba(255,255,255,.4)",width:"100%",fontFamily:"'DM Sans',sans-serif",justifyContent:sbCol?"center":"flex-start"}}><span style={{fontSize:15}}>{sbCol?"→":"←"}</span>{!sbCol&&<span style={{fontSize:11}}>Colapsar</span>}</button>
          </div>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{background:C.white,padding:"12px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #E8EEF4",flexShrink:0}}>
            <div><h1 style={{margin:0,fontSize:17,fontWeight:800,color:C.primary}}>{nav.find(n=>n.id===mod)?.icon} {nav.find(n=>n.id===mod)?.label}</h1><p style={{margin:0,fontSize:11,color:C.neutral,marginTop:2}}>TechCorp Paraguay S.A. · {resps.length} respuestas en tiempo real</p></div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{background:C.light,borderRadius:8,padding:"5px 12px",fontSize:11,color:C.neutral,fontWeight:500}}>{sA!==null?`● Score: ${sA}/100`:"● Sin datos suficientes"}</div>
              <button onClick={()=>setChatOpen(c=>!c)} style={{background:chatOpen?C.accent:C.primary,color:C.white,border:"none",borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>🤖 Asistente IA</button>
              <button onClick={()=>setLi(false)} style={{background:"transparent",border:"1px solid #E8EEF4",borderRadius:9,padding:"5px 10px",fontSize:11,color:C.neutral,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>🚪 Salir</button>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
            {mod==="dashboard" &&<Dashboard resps={resps}/>}
            {mod==="encuestas" &&<ModEnc resps={resps} onResponder={p=>{setPregEnc(p);setModoEnc(true);}}/>}
            {mod==="riesgo"    &&<ModRiesgo resps={resps}/>}
            {mod==="planes"    &&<ModPlanes resps={resps}/>}
            {mod==="prediccion"&&<ModPred resps={resps}/>}
          </div>
        </div>
      </div>
      {chatOpen&&<Chat onClose={()=>setChatOpen(false)} resps={resps}/>}
    </>
  );
}
