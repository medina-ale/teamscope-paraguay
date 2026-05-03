import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line, Cell } from "recharts";

// ============================================================
// FIREBASE CONFIG
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyC4SaBt3GR1mATGWnhyYguRE1qnN264jBg",
  authDomain: "teamscope-paraguay.firebaseapp.com",
  projectId: "teamscope-paraguay",
  storageBucket: "teamscope-paraguay.firebasestorage.app",
  messagingSenderId: "637435893615",
  appId: "1:637435893615:web:e3336bf82bada23ed87a9a"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ============================================================
// CREDENCIALES ADMIN
// ============================================================
const ADMIN_EMAIL = "admin@techcorp.com.py";
const ADMIN_PASS  = "Admin2024";

// ============================================================
// COLORES
// ============================================================
const C = {
  primary:    "#0A2342",
  secondary:  "#1B5E8A",
  accent:     "#00C4B4",
  accentWarm: "#FF6B35",
  success:    "#10B981",
  warning:    "#F59E0B",
  danger:     "#EF4444",
  neutral:    "#64748B",
  light:      "#F0F4F8",
  white:      "#FFFFFF",
};

function scoreColor(s) {
  if (s <= 40) return C.danger;
  if (s <= 60) return C.warning;
  if (s <= 79) return "#3B82F6";
  return C.success;
}
function scoreLabel(s) {
  if (s <= 40) return "Crítico";
  if (s <= 60) return "En Riesgo";
  if (s <= 79) return "Aceptable";
  return "Óptimo";
}

// ============================================================
// DATOS MOCK — 400 FUNCIONARIOS / 5 EQUIPOS TI PARAGUAY
// ============================================================
const EQUIPOS = ["Desarrollo", "QA", "DevOps", "Data", "Soporte"];

const MOCK = {
  empresa: { nombre: "TechCorp Paraguay S.A.", empleados: 400, logo: "TC" },
  climaGeneral: 72,
  tasaRespuesta: 62,
  departamentos: [
    { nombre: "Desarrollo", score: 61, empleados: 80,  riesgo: "Medio"      },
    { nombre: "QA",         score: 48, empleados: 60,  riesgo: "Alto"       },
    { nombre: "DevOps",     score: 79, empleados: 50,  riesgo: "Bajo"       },
    { nombre: "Data",       score: 83, empleados: 70,  riesgo: "Bajo"       },
    { nombre: "Soporte",    score: 55, empleados: 140, riesgo: "Medio-Alto" },
  ],
  riesgoPsicosocial: {
    score: 69,
    categorias: [
      { cat: "Condiciones de trabajo",        score: 74 },
      { cat: "Carga de trabajo",              score: 58 },
      { cat: "Falta de control",              score: 71 },
      { cat: "Jornada de trabajo",            score: 65 },
      { cat: "Interferencia trabajo-familia", score: 62 },
      { cat: "Liderazgo",                     score: 78 },
      { cat: "Relaciones en el trabajo",      score: 81 },
      { cat: "Violencia laboral",             score: 88 },
    ],
  },
  tendencia: [
    { mes: "Ene", score: 64, engagement: 58, satisfaccion: 61 },
    { mes: "Feb", score: 66, engagement: 60, satisfaccion: 63 },
    { mes: "Mar", score: 65, engagement: 59, satisfaccion: 64 },
    { mes: "Abr", score: 68, engagement: 63, satisfaccion: 66 },
    { mes: "May", score: 70, engagement: 65, satisfaccion: 68 },
    { mes: "Jun", score: 69, engagement: 64, satisfaccion: 70 },
    { mes: "Jul", score: 72, engagement: 68, satisfaccion: 71 },
    { mes: "Ago", score: 75, engagement: 72, satisfaccion: 74 },
  ],
  aiInsights: [
    { tipo: "alerta",      texto: "⚠️ QA muestra patrones de agotamiento. 67% de comentarios menciona 'presión de entrega' o 'fines de semana trabajando'." },
    { tipo: "prediccion",  texto: "📊 Con la tendencia actual, Desarrollo podría bajar a zona crítica (<60) en 2 meses sin intervención." },
    { tipo: "oportunidad", texto: "✨ Data y DevOps son tus equipos ancla. Replicar sus prácticas de trabajo autónomo beneficiaría al resto." },
    { tipo: "accion",      texto: "🎯 Prioridad: reuniones 1:1 semanales en Soporte reduciría el riesgo psicosocial en ~18 puntos." },
  ],
  planesAccion: [
    { id: 1, titulo: "Reducción de carga en QA",             area: "QA",         prioridad: "Alta",  estado: "En progreso", avance: 35, responsable: "Ing. Carlos Benítez",  kpi: "Bugs críticos -20%" },
    { id: 2, titulo: "Programa de reconocimiento developers", area: "Desarrollo", prioridad: "Media", estado: "Iniciado",    avance: 60, responsable: "Lic. Ana Martínez",    kpi: "Score +15pts"       },
    { id: 3, titulo: "Talleres de liderazgo tech leads",     area: "Soporte",    prioridad: "Alta",  estado: "Planeado",    avance: 10, responsable: "Dra. María Giménez",   kpi: "NPS liderazgo +20pts" },
    { id: 4, titulo: "Política de desconexión digital",      area: "Todos",      prioridad: "Media", estado: "En progreso", avance: 45, responsable: "Lic. Roberto Sosa",    kpi: "Interferencia -10pts" },
  ],
  rotacion: [
    { area: "QA",         prob: 34, empleados: 60,  costo: "USD 22K",  prioridad: "Urgente" },
    { area: "Soporte",    prob: 28, empleados: 140, costo: "USD 48K",  prioridad: "Alta"    },
    { area: "Desarrollo", prob: 22, empleados: 80,  costo: "USD 35K",  prioridad: "Media"   },
    { area: "DevOps",     prob: 8,  empleados: 50,  costo: "USD 8K",   prioridad: "Baja"    },
    { area: "Data",       prob: 5,  empleados: 70,  costo: "USD 4K",   prioridad: "Baja"    },
  ],
};

// ============================================================
// PREGUNTAS ENCUESTA (CLIMA LABORAL TI — PARAGUAY)
// ============================================================
const PREGUNTAS_BASE = [
  { id: 1,  categoria: "Carga de trabajo",         texto: "Mi trabajo me exige estar disponible (Slack, Teams) fuera del horario laboral.",          tipo: "likert"  },
  { id: 2,  categoria: "Carga de trabajo",         texto: "Tengo demasiadas tareas en el sprint y poco tiempo para completarlas con calidad.",        tipo: "likert"  },
  { id: 3,  categoria: "Carga de trabajo",         texto: "Mi trabajo me exige atender múltiples incidentes o proyectos en simultáneo.",              tipo: "likert"  },
  { id: 4,  categoria: "Autonomía y control",      texto: "Puedo decidir cómo organizar mi trabajo y priorizar mis tareas durante el día.",           tipo: "likert"  },
  { id: 5,  categoria: "Jornada de trabajo",       texto: "Me quedo tiempo extra (más de 1 hora) para terminar mis tareas con frecuencia.",           tipo: "likert"  },
  { id: 6,  categoria: "Liderazgo",                texto: "Mi líder técnico me comunica claramente qué se espera de mi trabajo.",                     tipo: "likert"  },
  { id: 7,  categoria: "Relaciones",               texto: "Tengo buenas relaciones de colaboración con mis compañeros de equipo.",                    tipo: "likert"  },
  { id: 8,  categoria: "Ambiente de respeto",      texto: "En mi equipo se respetan las opiniones y no hay críticas injustificadas.",                 tipo: "likert"  },
  { id: 9,  categoria: "Equilibrio vida-trabajo",  texto: "Mi trabajo me permite cumplir con mis responsabilidades personales y familiares.",         tipo: "likert"  },
  { id: 10, categoria: "Desarrollo profesional",   texto: "Siento que tengo oportunidades reales de aprender y crecer en esta empresa.",              tipo: "likert"  },
  { id: 11, categoria: "Reconocimiento",           texto: "Recibo reconocimiento cuando hago un buen trabajo.",                                       tipo: "likert"  },
  { id: 12, categoria: "Herramientas y recursos",  texto: "Cuento con las herramientas y equipos necesarios para hacer bien mi trabajo.",             tipo: "likert"  },
  { id: 13, categoria: "Comentario abierto",       texto: "¿Qué cambiarías en tu equipo o en la empresa para sentirte mejor en el trabajo?",         tipo: "abierta" },
];

const LIKERT_OPTS = ["Nunca", "Casi nunca", "Algunas veces", "Casi siempre", "Siempre"];

// ============================================================
// ESTILOS GLOBALES
// ============================================================
const globalStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #F0F4F8; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #F1F5F9; }
  ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }
  @keyframes chatBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
`;

// ============================================================
// HELPERS UI
// ============================================================
const Badge = ({ text, color, size = "sm" }) => (
  <span style={{
    background: color + "20", color, border: `1px solid ${color}40`,
    padding: size === "sm" ? "2px 8px" : "4px 12px",
    borderRadius: 20, fontSize: size === "sm" ? 11 : 13,
    fontWeight: 600, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
  }}>{text}</span>
);

const ProgressBar = ({ value, color, height = 8 }) => (
  <div style={{ background: "#E8EEF4", borderRadius: 99, height, overflow: "hidden", flex: 1 }}>
    <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.8s" }} />
  </div>
);

const KPICard = ({ label, value, unit, change, icon, color }) => (
  <div style={{
    background: C.white, borderRadius: 14, padding: "16px 18px",
    border: "1px solid #E8EEF4", borderTop: `3px solid ${color}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <span style={{ fontSize: 12, color: C.neutral, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 20 }}>{icon}</span>
    </div>
    <div style={{ marginTop: 6 }}>
      <span style={{ fontSize: 28, fontWeight: 800, color: C.primary, letterSpacing: "-1px" }}>{value}</span>
      {unit && <span style={{ fontSize: 13, color: C.neutral, marginLeft: 4 }}>{unit}</span>}
    </div>
    {change !== undefined && (
      <div style={{ fontSize: 11, color: change >= 0 ? C.success : C.danger, marginTop: 3, fontWeight: 600 }}>
        {change >= 0 ? "▲" : "▼"} {Math.abs(change)} pts vs mes anterior
      </div>
    )}
  </div>
);

// ============================================================
// MÓDULO: LOGIN
// ============================================================
const LoginPage = ({ onLogin }) => {
  const [email, setEmail]   = useState("");
  const [pass, setPass]     = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (email.trim() === ADMIN_EMAIL && pass === ADMIN_PASS) {
        onLogin();
      } else {
        setError("Correo o contraseña incorrectos");
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div style={{
      minHeight: "100vh", background: `linear-gradient(135deg, ${C.primary} 0%, ${C.secondary} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        background: C.white, borderRadius: 24, padding: "36px 32px",
        width: "100%", maxWidth: 400, boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🔭</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.primary, marginBottom: 4 }}>TeamScope Paraguay</h1>
          <p style={{ fontSize: 13, color: C.neutral }}>Acceso administrador · TechCorp Paraguay S.A.</p>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: C.neutral, fontWeight: 500, display: "block", marginBottom: 6 }}>Correo electrónico</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="admin@techcorp.com.py"
            style={{
              width: "100%", padding: "12px 14px", border: "2px solid #E8EEF4", borderRadius: 12,
              fontSize: 14, color: C.primary, outline: "none", fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={e => e.target.style.borderColor = C.accent}
            onBlur={e => e.target.style.borderColor = "#E8EEF4"}
          />
        </div>
        <div style={{ marginBottom: error ? 10 : 20 }}>
          <label style={{ fontSize: 12, color: C.neutral, fontWeight: 500, display: "block", marginBottom: 6 }}>Contraseña</label>
          <input
            type="password" value={pass} onChange={e => setPass(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", padding: "12px 14px", border: "2px solid #E8EEF4", borderRadius: 12,
              fontSize: 14, color: C.primary, outline: "none", fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={e => e.target.style.borderColor = C.accent}
            onBlur={e => e.target.style.borderColor = "#E8EEF4"}
          />
        </div>
        {error && <p style={{ color: C.danger, fontSize: 13, marginBottom: 14, textAlign: "center" }}>❌ {error}</p>}
        <button
          onClick={handleLogin} disabled={loading}
          style={{
            width: "100%", background: loading ? "#E8EEF4" : C.accent, color: C.white,
            border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {loading ? "⏳ Verificando..." : "Ingresar al panel"}
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: C.neutral, marginTop: 16 }}>
          🔒 Ley 1682/01 de Datos Personales · Paraguay
        </p>
      </div>
    </div>
  );
};

// ============================================================
// MÓDULO: ENCUESTA (vista funcionario)
// ============================================================
const EncuestaView = ({ preguntas, onVolver }) => {
  const [paso, setPaso]       = useState(0);
  const [equipo, setEquipo]   = useState("");
  const [resps, setResps]     = useState({});
  const [done, setDone]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");

  const q = preguntas[paso];
  const prog = Math.round((paso / preguntas.length) * 100);

  const guardar = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, "respuestas"), {
        equipo, respuestas: resps, timestamp: serverTimestamp(),
      });
      setDone(true);
    } catch { setErr("Error al guardar. Intentá de nuevo."); }
    setSaving(false);
  };

  if (!equipo) {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: C.white, borderRadius: 24, padding: 36, maxWidth: 460, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔭</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.primary, marginBottom: 6 }}>Encuesta de Clima Laboral</h2>
            <p style={{ fontSize: 13, color: C.neutral, lineHeight: 1.6 }}>100% anónima · Ley 1682/01 de Datos Personales · Paraguay</p>
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 14 }}>¿A qué equipo pertenecés?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {EQUIPOS.map(eq => (
              <button key={eq} onClick={() => setEquipo(eq)} style={{
                border: "2px solid #E8EEF4", borderRadius: 12, padding: "12px 16px",
                fontSize: 14, cursor: "pointer", textAlign: "left", background: C.white,
                color: C.primary, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", gap: 10,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accent + "10"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8EEF4"; e.currentTarget.style.background = C.white; }}
              >
                <span style={{ fontSize: 20 }}>
                  {eq === "Desarrollo" ? "💻" : eq === "QA" ? "🧪" : eq === "DevOps" ? "⚙️" : eq === "Data" ? "📊" : "🎧"}
                </span>
                {eq}
              </button>
            ))}
          </div>
          <button onClick={onVolver} style={{ marginTop: 20, background: "transparent", border: "none", color: C.neutral, cursor: "pointer", fontSize: 13, width: "100%", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
            ← Volver al panel
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: C.white, borderRadius: 24, padding: 40, textAlign: "center", maxWidth: 440, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.primary, marginBottom: 8 }}>¡Gracias por participar!</h2>
          <p style={{ color: C.neutral, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>Tu opinión es completamente anónima y ayuda a mejorar el ambiente de trabajo para todos.</p>
          <div style={{ background: C.light, borderRadius: 14, padding: 18, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: C.neutral, marginBottom: 4 }}>Equipo · Respuestas enviadas</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{equipo} · {Object.keys(resps).length}/{preguntas.length}</div>
          </div>
          <button onClick={onVolver} style={{ background: C.accent, color: C.white, border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", fontFamily: "'DM Sans', sans-serif" }}>
            Volver al panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
      <div style={{ width: "100%", maxWidth: 560, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,.7)", fontSize: 12, marginBottom: 8 }}>
          <span>Encuesta Clima TI · {equipo} · Confidencial</span>
          <span style={{ color: C.accent, fontWeight: 700 }}>{paso}/{preguntas.length}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 99, height: 5, overflow: "hidden" }}>
          <div style={{ width: `${prog}%`, height: "100%", background: C.accent, borderRadius: 99, transition: "width .5s" }} />
        </div>
      </div>
      <div style={{ background: C.white, borderRadius: 20, padding: 32, maxWidth: 560, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <Badge text={q.categoria} color={C.secondary} size="md" />
        <p style={{ margin: "18px 0 24px", fontSize: 17, fontWeight: 600, color: C.primary, lineHeight: 1.5 }}>{q.texto}</p>
        {q.tipo === "likert" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {LIKERT_OPTS.map((op, i) => {
              const sel = resps[q.id] === i + 1;
              return (
                <button key={i} onClick={() => setResps(prev => ({ ...prev, [q.id]: i + 1 }))} style={{
                  border: `2px solid ${sel ? C.accent : "#E8EEF4"}`, borderRadius: 12,
                  padding: "11px 16px", fontSize: 13, cursor: "pointer", textAlign: "left",
                  background: sel ? C.accent + "15" : C.white, color: C.primary,
                  fontWeight: sel ? 700 : 400, fontFamily: "'DM Sans', sans-serif",
                  display: "flex", alignItems: "center", gap: 10, transition: "all .2s",
                }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: sel ? C.accent : "#E8EEF4", color: sel ? C.white : C.neutral, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  {op}
                </button>
              );
            })}
          </div>
        )}
        {q.tipo === "abierta" && (
          <textarea
            value={resps[q.id] || ""} onChange={e => setResps(prev => ({ ...prev, [q.id]: e.target.value }))}
            placeholder="Escribí tu respuesta aquí... (opcional)"
            style={{ width: "100%", minHeight: 110, border: "2px solid #E8EEF4", borderRadius: 12, padding: 14, fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: C.primary, resize: "vertical", outline: "none", boxSizing: "border-box" }}
          />
        )}
        {err && <p style={{ color: C.danger, fontSize: 13, marginTop: 10 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "space-between" }}>
          <button onClick={() => { if (paso > 0) setPaso(p => p - 1); else setEquipo(""); }} style={{ border: "2px solid #E8EEF4", background: C.white, borderRadius: 12, padding: "11px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.neutral, fontFamily: "'DM Sans', sans-serif" }}>
            ← Anterior
          </button>
          {paso < preguntas.length - 1 ? (
            <button onClick={() => setPaso(p => p + 1)} disabled={q.tipo === "likert" && !resps[q.id]} style={{
              background: (q.tipo === "likert" && !resps[q.id]) ? "#E8EEF4" : C.accent,
              color: C.white, border: "none", borderRadius: 12, padding: "11px 26px",
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              Siguiente →
            </button>
          ) : (
            <button onClick={guardar} disabled={saving} style={{
              background: saving ? "#E8EEF4" : C.success, color: C.white, border: "none",
              borderRadius: 12, padding: "11px 26px", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              {saving ? "⏳ Guardando..." : "Enviar ✓"}
            </button>
          )}
        </div>
      </div>
      <p style={{ color: "rgba(255,255,255,.5)", fontSize: 11, marginTop: 14, textAlign: "center" }}>🔒 Anónimo · Ley 1682/01 de Datos Personales · Paraguay</p>
    </div>
  );
};

// ============================================================
// CHATBOT IA
// ============================================================
const ChatBot = ({ onClose }) => {
  const [msgs, setMsgs]     = useState([{ role: "assistant", text: "¡Hola! Soy tu asistente de clima laboral. Puedo analizar resultados, sugerir intervenciones y responder sobre riesgo psicosocial en equipos TI. ¿En qué te puedo ayudar?" }]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const txt = input.trim();
    setMsgs(prev => [...prev, { role: "user", text: txt }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 600,
          system: `Sos experto en clima laboral y RRHH de equipos TI en Paraguay. TechCorp Paraguay S.A., 400 funcionarios. Score clima 72/100. QA: 48 (riesgo alto, 60 pers). Soporte: 55 (140 pers). Desarrollo: 61 (80 pers). Marco legal: Código Trabajo Paraguay Ley 213/93, Res. MTESS. Respondé en español rioplatense, usá "vos", máximo 4 puntos concisos.`,
          messages: [...msgs.map(m => ({ role: m.role, content: m.text })), { role: "user", content: txt }],
        }),
      });
      const data = await res.json();
      const reply = data.content?.map(c => c.text || "").join("") || "Lo siento, hubo un error.";
      setMsgs(prev => [...prev, { role: "assistant", text: reply }]);
    } catch { setMsgs(prev => [...prev, { role: "assistant", text: "❌ Error de conexión." }]); }
    setLoading(false);
  };

  const quickQs = ["¿Equipos con más riesgo?", "Plan de acción para QA", "¿Cumplimos con el marco MTESS?", "¿Qué predecís sobre la rotación?"];

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, width: 380, height: 540, background: C.white, borderRadius: 18, boxShadow: "0 16px 48px rgba(10,35,66,.2)", display: "flex", flexDirection: "column", border: `1px solid ${C.accent}30`, zIndex: 1000 }}>
      <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, padding: "14px 18px", borderRadius: "18px 18px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, background: C.accent, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🤖</div>
          <div>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>Asistente IA</div>
            <div style={{ color: C.accent, fontSize: 10 }}>● En línea · Experto clima TI · Paraguay</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", color: C.white, width: 28, height: 28, borderRadius: 7, cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 7, alignItems: "flex-start" }}>
            {m.role === "assistant" && <div style={{ width: 26, height: 26, background: C.accent + "20", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🤖</div>}
            <div style={{
              maxWidth: "80%", padding: "9px 13px",
              background: m.role === "user" ? `linear-gradient(135deg, ${C.secondary}, ${C.primary})` : C.light,
              color: m.role === "user" ? C.white : C.primary,
              borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <div style={{ width: 26, height: 26, background: C.accent + "20", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
            <div style={{ background: C.light, padding: "9px 13px", borderRadius: "14px 14px 14px 4px", display: "flex", gap: 4 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, background: C.accent, borderRadius: "50%", animation: `chatBounce 1s infinite ${i * 0.2}s` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {msgs.length <= 1 && (
        <div style={{ padding: "0 14px 10px", display: "flex", flexWrap: "wrap", gap: 5 }}>
          {quickQs.map((q, i) => (
            <button key={i} onClick={() => { setInput(q); }} style={{ background: C.light, border: `1px solid ${C.accent}40`, borderRadius: 20, padding: "4px 10px", fontSize: 11, color: C.secondary, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{q}</button>
          ))}
        </div>
      )}
      <div style={{ padding: "10px 14px", borderTop: "1px solid #E8EEF4", display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Preguntá sobre tus resultados..."
          style={{ flex: 1, border: "1px solid #E8EEF4", borderRadius: 10, padding: "9px 12px", fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: "none", color: C.primary, background: C.light }} />
        <button onClick={send} disabled={loading || !input.trim()} style={{ background: input.trim() ? C.accent : "#E8EEF4", color: C.white, border: "none", borderRadius: 10, width: 38, cursor: "pointer", fontSize: 16 }}>➤</button>
      </div>
    </div>
  );
};

// ============================================================
// MÓDULO: DASHBOARD
// ============================================================
const Dashboard = ({ respuestas }) => {
  const radarData = MOCK.riesgoPsicosocial.categorias.map(c => ({
    subject: c.cat.split(" ").slice(0, 2).join(" "), A: c.score,
  }));
  const ibg = { alerta: "#FFF5F5", prediccion: "#FFFBEB", oportunidad: "#F0FFF4", accion: "#EFF6FF" };
  const ibo = { alerta: "#FECACA", prediccion: "#FDE68A", oportunidad: "#A7F3D0", accion: "#BFDBFE" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        <KPICard label="Índice de Clima"    value={MOCK.climaGeneral}           unit="/100"     change={3}  icon="🌡️" color={C.accent}     />
        <KPICard label="Tasa de Respuesta"  value={MOCK.tasaRespuesta}          unit="%"        change={4}  icon="📋" color={C.success}    />
        <KPICard label="Encuestas Activas"  value={2}                           unit="activas"              icon="📊" color={C.accentWarm} />
        <KPICard label="Score Psicosocial"  value={MOCK.riesgoPsicosocial.score} unit="/100"    change={2}  icon="🏛️" color={C.secondary}  />
        <KPICard label="Riesgo Rotación"    value={34}                          unit="% QA"                 icon="⚠️" color={C.danger}     />
        <KPICard label="Planes Activos"     value={MOCK.planesAccion.length}    unit="planes"               icon="🎯" color={C.warning}    />
      </div>

      {respuestas.length > 0 && (
        <div style={{ background: "#F0FFF4", border: "1px solid #A7F3D0", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🟢</span>
          <span style={{ fontSize: 13, color: C.primary, fontWeight: 600 }}>{respuestas.length} respuestas reales recibidas en tiempo real · Actualizando automáticamente</span>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: C.primary, marginBottom: 3 }}>🤖 Insights de Inteligencia Artificial</h2>
        <p style={{ fontSize: 12, color: C.neutral, marginBottom: 12 }}>Análisis automático basado en tus datos recientes</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          {MOCK.aiInsights.map((ins, i) => (
            <div key={i} style={{ background: ibg[ins.tipo], border: `1px solid ${ibo[ins.tipo]}`, borderRadius: 12, padding: "12px 14px", fontSize: 12, color: C.primary, lineHeight: 1.6 }}>
              {ins.texto}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
        <div style={{ background: C.white, borderRadius: 14, padding: 20, border: "1px solid #E8EEF4" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: C.primary, marginBottom: 3 }}>Tendencia de Clima Laboral</h3>
          <p style={{ fontSize: 11, color: C.neutral, marginBottom: 14 }}>Últimos 8 meses</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={MOCK.tendencia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: C.neutral }} />
              <YAxis domain={[50, 90]} tick={{ fontSize: 11, fill: C.neutral }} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
              <Line type="monotone" dataKey="score" stroke={C.primary} strokeWidth={2.5} dot={{ r: 4 }} name="Clima" />
              <Line type="monotone" dataKey="engagement" stroke={C.accent} strokeWidth={2} strokeDasharray="5 5" dot={false} name="Engagement" />
              <Line type="monotone" dataKey="satisfaccion" stroke={C.accentWarm} strokeWidth={2} strokeDasharray="3 3" dot={false} name="Satisfacción" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: C.white, borderRadius: 14, padding: 20, border: "1px solid #E8EEF4" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: C.primary, marginBottom: 3 }}>Riesgo Psicosocial</h3>
          <p style={{ fontSize: 11, color: C.neutral, marginBottom: 14 }}>Por categoría</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E8EEF4" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: C.neutral }} />
              <Radar dataKey="A" stroke={C.secondary} fill={C.secondary} fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: C.primary, marginBottom: 3 }}>Clima por Equipo TI</h2>
        <p style={{ fontSize: 12, color: C.neutral, marginBottom: 12 }}>Score y nivel de riesgo psicosocial · 400 funcionarios</p>
        <div style={{ background: C.white, borderRadius: 14, padding: 20, border: "1px solid #E8EEF4" }}>
          {[...MOCK.departamentos].sort((a, b) => a.score - b.score).map((dep, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr 50px 90px", alignItems: "center", gap: 14, padding: "9px 0", borderBottom: i < MOCK.departamentos.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>{dep.nombre}</span>
              <ProgressBar value={dep.score} color={scoreColor(dep.score)} height={9} />
              <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(dep.score) }}>{dep.score}</span>
              <Badge text={dep.riesgo} color={scoreColor(dep.score)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MÓDULO: ENCUESTAS (panel admin)
// ============================================================
const ModuloEncuestas = ({ onResponder }) => {
  const [encuestas, setEncuestas] = useState([
    { id: 1, nombre: "Clima TI 2024 - Completa",       preguntas: PREGUNTAS_BASE, tiempo: "8 min", activa: true,  respondidas: 247 },
    { id: 2, nombre: "Pulso Rápido Mensual",            preguntas: PREGUNTAS_BASE.slice(0, 5), tiempo: "3 min", activa: true,  respondidas: 180 },
    { id: 3, nombre: "Evaluación 360° Tech Leads",     preguntas: PREGUNTAS_BASE.slice(5, 12), tiempo: "5 min", activa: false, respondidas: 0   },
  ]);
  const [generando, setGenerando] = useState(false);
  const [tema, setTema]           = useState("");
  const [nuevasPregs, setNuevasPregs] = useState([]);
  const [editando, setEditando]   = useState(null);
  const [previewing, setPreviewing] = useState(null);

  const generarEncuesta = async () => {
    if (!tema.trim()) return;
    setGenerando(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 600,
          messages: [{ role: "user", content: `Generá 8 preguntas de encuesta de clima laboral para equipos TI en Paraguay sobre el tema: "${tema}". Escala Likert 1-5. Solo las preguntas numeradas, sin explicación adicional.` }],
        }),
      });
      const data = await res.json();
      const txt = data.content?.map(c => c.text || "").join("") || "";
      const lines = txt.split("\n").filter(l => l.trim() && /^\d+\./.test(l.trim())).map((l, i) => ({
        id: 100 + i, categoria: tema, texto: l.replace(/^\d+\.\s*/, "").trim(), tipo: "likert",
      }));
      setNuevasPregs(lines);
    } catch { alert("Error al generar. Intentá de nuevo."); }
    setGenerando(false);
  };

  const agregarEncuesta = () => {
    if (!nuevasPregs.length) return;
    const nueva = { id: encuestas.length + 1, nombre: `Encuesta: ${tema}`, preguntas: nuevasPregs, tiempo: "5 min", activa: true, respondidas: 0 };
    setEncuestas(prev => [...prev, nueva]);
    setNuevasPregs([]);
    setTema("");
    alert("✅ Encuesta creada y activada correctamente.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Crear encuesta */}
      <div style={{ background: `linear-gradient(135deg, ${C.accent}10, ${C.secondary}08)`, border: `1px solid ${C.accent}30`, borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.primary, marginBottom: 4 }}>✨ Crear nueva encuesta con IA</h3>
        <p style={{ fontSize: 12, color: C.neutral, marginBottom: 14 }}>Generá una encuesta personalizada para tus equipos de TI</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <input value={tema} onChange={e => setTema(e.target.value)} placeholder="Ej: clima post-sprint, liderazgo técnico, burnout..."
            style={{ flex: 1, minWidth: 180, border: "1px solid #E8EEF4", borderRadius: 9, padding: "9px 12px", fontSize: 13, color: C.primary, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
          <button onClick={generarEncuesta} disabled={generando || !tema.trim()} style={{ background: generando ? "#E8EEF4" : C.accent, color: C.white, border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {generando ? "⏳ Generando..." : "✨ Generar con IA"}
          </button>
        </div>
        {nuevasPregs.length > 0 && (
          <div style={{ background: C.white, borderRadius: 10, padding: 14, border: "1px solid #E8EEF4" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 10 }}>Preguntas generadas ({nuevasPregs.length}):</p>
            {nuevasPregs.map((p, i) => (
              <div key={i} style={{ fontSize: 12, color: C.primary, padding: "5px 0", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontWeight: 600 }}>{i + 1}.</span> {p.texto}
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={agregarEncuesta} style={{ background: C.success, color: C.white, border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                ✅ Agregar al panel
              </button>
              <button onClick={() => setNuevasPregs([])} style={{ background: C.light, color: C.neutral, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <KPICard label="Encuestas activas" value={encuestas.filter(e => e.activa).length} unit="activas" icon="📊" color={C.accent} />
        <KPICard label="Total funcionarios" value={400} unit="pers." icon="👥" color={C.success} />
        <KPICard label="Respuestas hoy" value={47} unit="hoy" icon="✅" color={C.secondary} />
      </div>

      {/* Lista encuestas */}
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: C.primary, marginBottom: 3 }}>Encuestas disponibles</h2>
        <p style={{ fontSize: 12, color: C.neutral, marginBottom: 14 }}>Gestioná, editá y enviá tus encuestas</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {encuestas.map(enc => (
            <div key={enc.id} style={{ background: C.white, borderRadius: 14, padding: 18, border: "1px solid #E8EEF4" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  {editando === enc.id ? (
                    <input defaultValue={enc.nombre} onBlur={e => { setEncuestas(prev => prev.map(x => x.id === enc.id ? { ...x, nombre: e.target.value } : x)); setEditando(null); }}
                      style={{ fontSize: 14, fontWeight: 700, border: "2px solid " + C.accent, borderRadius: 7, padding: "4px 8px", color: C.primary, fontFamily: "'DM Sans', sans-serif", outline: "none" }} autoFocus />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.primary, marginBottom: 4 }}>{enc.nombre}</div>
                  )}
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: C.neutral }}>📝 {enc.preguntas.length} preguntas</span>
                    <span style={{ fontSize: 11, color: C.neutral }}>⏱️ {enc.tiempo}</span>
                    <Badge text={enc.activa ? "Activa" : "Inactiva"} color={enc.activa ? C.success : C.neutral} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{Math.round((enc.respondidas / 400) * 100)}%</div>
                  <div style={{ fontSize: 11, color: C.neutral }}>{enc.respondidas}/400</div>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <ProgressBar value={Math.round((enc.respondidas / 400) * 100)} color={C.accent} height={6} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => setPreviewing(previewing === enc.id ? null : enc.id)} style={{ background: `${C.accent}15`, color: "#0A7A6E", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  👁 {previewing === enc.id ? "Cerrar" : "Vista previa"}
                </button>
                <button onClick={() => setEditando(enc.id)} style={{ background: `${C.secondary}12`, color: C.secondary, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  ✏️ Editar nombre
                </button>
                <button onClick={() => { navigator.clipboard.writeText(window.location.origin + "?enc=" + enc.id); alert("Link copiado:\n" + window.location.origin + "\n\nCompartí este link en el grupo de WhatsApp"); }} style={{ background: "#10B98115", color: "#065F46", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  📤 Enviar link
                </button>
                <button onClick={() => onResponder(enc.preguntas)} style={{ background: C.light, color: C.neutral, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  ▶ Probar encuesta
                </button>
              </div>
              {previewing === enc.id && (
                <div style={{ marginTop: 14, background: C.light, borderRadius: 10, padding: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 10 }}>Vista previa — {enc.preguntas.length} preguntas:</p>
                  {enc.preguntas.map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid #E8EEF4" }}>
                      <div style={{ width: 20, height: 20, background: C.accent + "20", color: "#0A7A6E", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, fontSize: 12, color: C.primary }}>{p.texto}</div>
                      <Badge text={p.categoria} color={C.secondary} />
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

// ============================================================
// MÓDULO: RIESGO PSICOSOCIAL (reemplaza NOM-035)
// ============================================================
const ModuloRiesgo = () => {
  const { score, categorias } = MOCK.riesgoPsicosocial;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, borderRadius: 16, padding: 24, color: C.white, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginBottom: 6 }}>Marco OIT / Resolución MTESS Paraguay</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.white, marginBottom: 4 }}>Factores de Riesgo Psicosocial</h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>Evaluación anual recomendada · Última actualización: Ago 2024</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 38, fontWeight: 800, color: C.accent }}>{score}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>/100 · <Badge text={scoreLabel(score)} color={C.accent} /></div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <KPICard label="Colaboradores evaluados" value={247} unit="pers." icon="👥" color={C.success}   />
        <KPICard label="Factores en riesgo"       value={3}   unit="categ." icon="⚠️" color={C.warning}  />
        <KPICard label="Documentación"            value={85}  unit="%"     icon="📄" color={C.secondary} />
      </div>
      <div style={{ background: C.white, borderRadius: 14, padding: 20, border: "1px solid #E8EEF4" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: C.primary, marginBottom: 16 }}>Categorías de Riesgo Psicosocial</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {categorias.map((cat, i) => (
            <div key={i} style={{ paddingBottom: 12, borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>{cat.cat}</span>
                <Badge text={`${cat.score}/100`} color={scoreColor(cat.score)} />
              </div>
              <ProgressBar value={cat.score} color={scoreColor(cat.score)} height={8} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "#FFF8EE", borderRadius: 14, padding: 20, border: "1px solid #FDE68A" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.primary, marginBottom: 12 }}>⚠️ Factores que requieren acción inmediata</h3>
        {categorias.filter(c => c.score < 65).map((cat, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #FDE68A" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>{cat.cat}</div>
              <div style={{ fontSize: 11, color: C.neutral, marginTop: 2 }}>Requiere programa de intervención documentado</div>
            </div>
            <Badge text={`${cat.score}/100`} color={C.danger} />
          </div>
        ))}
        <div style={{ marginTop: 14, background: C.white, borderRadius: 10, padding: 14, border: "1px solid #FDE68A", fontSize: 12, color: C.neutral, lineHeight: 1.6 }}>
          📌 <strong>Marco legal paraguayo:</strong> El Código del Trabajo (Ley 213/93) y las resoluciones del MTESS obligan a prevenir riesgos psicosociales. El incumplimiento puede derivar en sanciones del MTESS y responsabilidad civil ante el empleado.
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MÓDULO: PLANES DE ACCIÓN
// ============================================================
const ModuloPlanes = () => {
  const [generando, setGenerando] = useState(false);
  const [planGenerado, setPlanGenerado] = useState("");
  const [area, setArea] = useState("QA");

  const genPlan = async () => {
    setGenerando(true);
    setPlanGenerado("");
    try {
      const dept = MOCK.departamentos.find(d => d.nombre === area) || { score: 55, empleados: 80 };
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 800,
          messages: [{ role: "user", content: `Sos experto en desarrollo organizacional y bienestar en equipos TI en Paraguay.
Generá un PLAN DE ACCIÓN SMART para el equipo "${area}" de TechCorp Paraguay S.A.:
- Score clima: ${dept.score}/100, Empleados: ${dept.empleados} de 400 totales
- Contexto: Mercado TI paraguayo con alta demanda regional (Argentina, Brasil, Uruguay)
- Problemas: Alta carga de trabajo, falta de reconocimiento, comunicación con liderazgo
Incluye: 3 iniciativas SMART, responsables, plazos 30/60/90 días, KPIs, recursos en USD. Usá "vos".` }],
        }),
      });
      const data = await res.json();
      setPlanGenerado(data.content?.map(c => c.text || "").join("") || "Error al generar.");
    } catch { setPlanGenerado("❌ Error de conexión."); }
    setGenerando(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <KPICard label="En progreso" value={2} icon="🔄" color={C.warning}   />
        <KPICard label="Iniciado"    value={1} icon="🚀" color={C.accent}    />
        <KPICard label="Planeado"    value={1} icon="📋" color={C.neutral}   />
      </div>
      <div style={{ background: `linear-gradient(135deg, ${C.accent}08, ${C.secondary}06)`, borderRadius: 14, padding: 20, border: `1px solid ${C.accent}30` }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.primary, marginBottom: 4 }}>🤖 Generador de Planes con IA</h3>
        <p style={{ fontSize: 12, color: C.neutral, marginBottom: 14 }}>Creá planes SMART automáticamente basados en tus datos reales</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: planGenerado ? 14 : 0 }}>
          <select value={area} onChange={e => setArea(e.target.value)} style={{ border: "1px solid #E8EEF4", borderRadius: 9, padding: "9px 12px", fontSize: 13, color: C.primary, fontFamily: "'DM Sans', sans-serif" }}>
            {MOCK.departamentos.map(d => <option key={d.nombre}>{d.nombre}</option>)}
          </select>
          <button onClick={genPlan} disabled={generando} style={{ background: generando ? "#E8EEF4" : C.accent, color: C.white, border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {generando ? "⏳ Generando..." : "✨ Generar Plan con IA"}
          </button>
        </div>
        {planGenerado && (
          <div style={{ background: C.white, borderRadius: 10, padding: 16, border: "1px solid #E8EEF4", maxHeight: 260, overflowY: "auto" }}>
            <pre style={{ margin: 0, fontSize: 12, color: C.primary, fontFamily: "'DM Sans', sans-serif", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{planGenerado}</pre>
          </div>
        )}
      </div>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: C.primary, marginBottom: 3 }}>Planes Activos</h2>
        <p style={{ fontSize: 12, color: C.neutral, marginBottom: 14 }}>Iniciativas en seguimiento</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MOCK.planesAccion.map(plan => {
            const ec = plan.estado === "En progreso" ? C.warning : plan.estado === "Iniciado" ? C.accent : C.neutral;
            const pc = plan.prioridad === "Alta" ? C.danger : C.warning;
            return (
              <div key={plan.id} style={{ background: C.white, borderRadius: 14, padding: 18, border: "1px solid #E8EEF4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>{plan.titulo}</span>
                      <Badge text={plan.prioridad} color={pc} />
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: C.neutral }}>📍 {plan.area}</span>
                      <span style={{ fontSize: 11, color: C.neutral }}>👤 {plan.responsable}</span>
                    </div>
                  </div>
                  <Badge text={plan.estado} color={ec} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 11, color: C.neutral, minWidth: 70 }}>Avance: {plan.avance}%</span>
                  <ProgressBar value={plan.avance} color={plan.avance >= 70 ? C.success : plan.avance >= 30 ? C.warning : C.danger} height={8} />
                  <Badge text={plan.kpi} color={C.secondary} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MÓDULO: PREDICCIÓN IA
// ============================================================
const ModuloPrediccion = () => {
  const [prediciendo, setPrediciendo] = useState(false);
  const [prediccion, setPrediccion]   = useState("");

  const genPrediccion = async () => {
    setPrediciendo(true);
    setPrediccion("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 800,
          messages: [{ role: "user", content: `Analista RRHH experto en retención TI Paraguay. TechCorp Paraguay S.A., 400 funcionarios:
- QA: score 48, rotación 34% (60 personas)
- Soporte: score 55, rotación 28% (140 personas)
- Desarrollo: score 61, rotación 22% (80 personas)
- Salario promedio dev PY: USD 1.200-2.500/mes
Generá análisis predictivo: proyección 3 y 6 meses, costos USD, top 3 intervenciones costo-efectivas para Paraguay. Usá "vos".` }],
        }),
      });
      const data = await res.json();
      setPrediccion(data.content?.map(c => c.text || "").join("") || "Error.");
    } catch { setPrediccion("❌ Error de conexión."); }
    setPrediciendo(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "linear-gradient(135deg, #2D1B69, #1B5E8A)", borderRadius: 16, padding: 24, color: C.white }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.white, marginBottom: 6 }}>🔮 Predicción de Rotación con IA</h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>Modelos predictivos basados en datos de clima, engagement y tendencias históricas · 400 funcionarios</p>
      </div>
      <div style={{ background: C.white, borderRadius: 14, padding: 20, border: "1px solid #E8EEF4" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: C.primary, marginBottom: 14 }}>Probabilidad de Rotación por Equipo</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={MOCK.rotacion} layout="vertical" margin={{ left: 60, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis type="number" domain={[0, 40]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <YAxis dataKey="area" type="category" tick={{ fontSize: 12, fill: C.primary }} width={70} />
            <Tooltip formatter={v => [`${v}%`, "Riesgo"]} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
            <Bar dataKey="prob" radius={[0, 8, 8, 0]}>
              {MOCK.rotacion.map((entry, i) => (
                <Cell key={i} fill={entry.prob >= 30 ? C.danger : entry.prob >= 20 ? C.warning : C.success} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background: `linear-gradient(135deg, ${C.accent}08, ${C.secondary}06)`, borderRadius: 14, padding: 20, border: `1px solid ${C.accent}30` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.primary, marginBottom: 3 }}>🤖 Análisis Predictivo Detallado</h3>
            <p style={{ fontSize: 12, color: C.neutral }}>Proyecciones y estrategias de retención para el mercado TI paraguayo</p>
          </div>
          <button onClick={genPrediccion} disabled={prediciendo} style={{ background: prediciendo ? "#E8EEF4" : C.primary, color: C.white, border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {prediciendo ? "⏳ Analizando..." : "Generar Análisis IA"}
          </button>
        </div>
        {prediccion && (
          <div style={{ background: C.white, borderRadius: 10, padding: 16, border: "1px solid #E8EEF4", maxHeight: 320, overflowY: "auto" }}>
            <pre style={{ margin: 0, fontSize: 12, color: C.primary, fontFamily: "'DM Sans', sans-serif", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{prediccion}</pre>
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {MOCK.rotacion.map((item, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 14, padding: 18, border: "1px solid #E8EEF4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.primary }}>{item.area}</span>
              <Badge text={item.prioridad} color={item.prioridad === "Urgente" ? C.danger : item.prioridad === "Alta" ? C.warning : item.prioridad === "Media" ? C.accent : C.success} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><div style={{ fontSize: 11, color: C.neutral }}>Colaboradores</div><div style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>{item.empleados}</div></div>
              <div><div style={{ fontSize: 11, color: C.neutral }}>Riesgo rotación</div><div style={{ fontSize: 20, fontWeight: 800, color: item.prob >= 30 ? C.danger : C.warning }}>{item.prob}%</div></div>
              <div style={{ gridColumn: "span 2" }}><div style={{ fontSize: 11, color: C.neutral }}>Costo estimado</div><div style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>{item.costo}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// APP PRINCIPAL
// ============================================================
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [modulo, setModulo]     = useState("dashboard");
  const [modoEnc, setModoEnc]   = useState(false);
  const [preguntasEnc, setPreguntasEnc] = useState(PREGUNTAS_BASE);
  const [chatOpen, setChatOpen] = useState(false);
  const [sbCollapsed, setSbCollapsed] = useState(false);
  const [respuestas, setRespuestas] = useState([]);

  // Escuchar respuestas en tiempo real
  useEffect(() => {
    if (!loggedIn) return;
    const q = query(collection(db, "respuestas"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, snap => {
      setRespuestas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [loggedIn]);

  const nav = [
    { id: "dashboard", label: "Dashboard",          icon: "📊" },
    { id: "encuestas", label: "Encuestas",           icon: "📋" },
    { id: "riesgo",    label: "Riesgo Psicosocial",  icon: "🏛️" },
    { id: "planes",    label: "Planes de Acción",    icon: "🎯" },
    { id: "prediccion",label: "Predicción IA",       icon: "🔮" },
  ];

  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;
  if (modoEnc)   return <EncuestaView preguntas={preguntasEnc} onVolver={() => setModoEnc(false)} />;

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ display: "flex", height: "100vh", background: C.light, fontFamily: "'DM Sans', sans-serif" }}>
        {/* SIDEBAR */}
        <div style={{ width: sbCollapsed ? 64 : 230, background: C.primary, display: "flex", flexDirection: "column", flexShrink: 0, transition: "width .3s", overflow: "hidden", boxShadow: "2px 0 20px rgba(10,35,66,.12)" }}>
          <div style={{ padding: sbCollapsed ? "18px 14px" : "18px 16px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: C.accent, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🔭</div>
            {!sbCollapsed && (
              <div>
                <div style={{ color: C.white, fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>TeamScope</div>
                <div style={{ color: C.accent, fontSize: 10 }}>🇵🇾 Paraguay</div>
              </div>
            )}
          </div>
          {!sbCollapsed && (
            <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: C.white, fontSize: 11, fontWeight: 600 }}>TechCorp Paraguay S.A.</div>
                <div style={{ color: "rgba(255,255,255,.5)", fontSize: 9, marginTop: 2 }}>400 funcionarios · 5 equipos</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.success }} />
                  <span style={{ color: C.success, fontSize: 9, fontWeight: 600 }}>admin@techcorp.com.py</span>
                </div>
              </div>
            </div>
          )}
          <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
            {nav.map(item => (
              <button key={item.id} onClick={() => setModulo(item.id)} style={{
                background: modulo === item.id ? C.accent : "transparent",
                border: "none", borderRadius: 9, padding: "9px 12px",
                display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                color: modulo === item.id ? C.white : "rgba(255,255,255,.6)",
                width: "100%", textAlign: "left", fontFamily: "'DM Sans', sans-serif",
                justifyContent: sbCollapsed ? "center" : "flex-start",
              }}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>{item.icon}</span>
                {!sbCollapsed && <span style={{ fontSize: 13, fontWeight: modulo === item.id ? 700 : 500, whiteSpace: "nowrap" }}>{item.label}</span>}
              </button>
            ))}
          </nav>
          <div style={{ padding: "10px 8px", borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", flexDirection: "column", gap: 5 }}>
            <button onClick={() => { setPreguntasEnc(PREGUNTAS_BASE); setModoEnc(true); }} style={{ background: "rgba(0,196,180,.15)", border: "1px solid rgba(0,196,180,.3)", borderRadius: 9, padding: "8px 12px", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", color: C.accent, width: "100%", fontFamily: "'DM Sans', sans-serif", justifyContent: sbCollapsed ? "center" : "flex-start" }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>📝</span>
              {!sbCollapsed && <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>Responder encuesta</span>}
            </button>
            <button onClick={() => setSbCollapsed(s => !s)} style={{ background: "transparent", border: "none", borderRadius: 9, padding: "8px 12px", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", color: "rgba(255,255,255,.4)", width: "100%", fontFamily: "'DM Sans', sans-serif", justifyContent: sbCollapsed ? "center" : "flex-start" }}>
              <span style={{ fontSize: 15 }}>{sbCollapsed ? "→" : "←"}</span>
              {!sbCollapsed && <span style={{ fontSize: 11 }}>Colapsar</span>}
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: C.white, padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E8EEF4", boxShadow: "0 1px 4px rgba(0,0,0,.04)", flexShrink: 0 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.primary }}>
                {nav.find(n => n.id === modulo)?.icon} {nav.find(n => n.id === modulo)?.label}
              </h1>
              <p style={{ margin: 0, fontSize: 11, color: C.neutral, marginTop: 2 }}>
                TechCorp Paraguay S.A. · {respuestas.length > 0 ? `${respuestas.length} respuestas en tiempo real` : "Datos actualizados"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ background: C.light, borderRadius: 8, padding: "5px 12px", fontSize: 11, color: C.neutral, fontWeight: 500 }}>
                ● Score: {MOCK.climaGeneral}/100
              </div>
              <button onClick={() => setChatOpen(c => !c)} style={{ background: chatOpen ? C.accent : C.primary, color: C.white, border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
                🤖 Asistente IA
              </button>
              <button onClick={() => setLoggedIn(false)} style={{ background: "transparent", border: "1px solid #E8EEF4", borderRadius: 9, padding: "5px 10px", fontSize: 11, color: C.neutral, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                🚪 Salir
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {modulo === "dashboard"  && <Dashboard respuestas={respuestas} />}
            {modulo === "encuestas"  && <ModuloEncuestas onResponder={(pregs) => { setPreguntasEnc(pregs); setModoEnc(true); }} />}
            {modulo === "riesgo"     && <ModuloRiesgo />}
            {modulo === "planes"     && <ModuloPlanes />}
            {modulo === "prediccion" && <ModuloPrediccion />}
          </div>
        </div>
      </div>
      {chatOpen && <ChatBot onClose={() => setChatOpen(false)} />}
    </>
  );
}
