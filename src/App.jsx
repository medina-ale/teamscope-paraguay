import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line, Cell } from "recharts";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

// ============================================================
// CONFIGURACIÓN FIREBASE — TechCorp Paraguay
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
// PALETA DE COLORES
// ============================================================
const COLORS = {
  primary: "#0A2342",
  secondary: "#1B5E8A",
  accent: "#00C4B4",
  accentWarm: "#FF6B35",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  neutral: "#64748B",
  light: "#F0F4F8",
  white: "#FFFFFF",
  bg: "#F0F4F8",
};

const EQUIPOS = ["Desarrollo", "QA", "DevOps", "Data", "Soporte"];

const SCORE_RANGES = {
  critico:   { label: "Crítico",   color: "#EF4444" },
  riesgo:    { label: "En Riesgo", color: "#F59E0B" },
  aceptable: { label: "Aceptable", color: "#3B82F6" },
  optimo:    { label: "Óptimo",    color: "#10B981" },
};

function getScoreRange(score) {
  if (score <= 40) return SCORE_RANGES.critico;
  if (score <= 60) return SCORE_RANGES.riesgo;
  if (score <= 79) return SCORE_RANGES.aceptable;
  return SCORE_RANGES.optimo;
}

// ============================================================
// PREGUNTAS DE CLIMA LABORAL TI — PARAGUAY
// ============================================================
const PREGUNTAS = [
  { id: 1,  categoria: "Carga de trabajo",        texto: "Mi trabajo me exige estar disponible (Slack, Teams, email) fuera del horario laboral.", tipo: "likert" },
  { id: 2,  categoria: "Carga de trabajo",        texto: "Tengo demasiadas tareas en el sprint y poco tiempo para completarlas con calidad.", tipo: "likert" },
  { id: 3,  categoria: "Carga de trabajo",        texto: "Mi trabajo me exige atender múltiples incidentes o proyectos en simultáneo.", tipo: "likert" },
  { id: 4,  categoria: "Autonomía y control",     texto: "Puedo decidir cómo organizar mi trabajo y priorizar mis tareas durante el día.", tipo: "likert" },
  { id: 5,  categoria: "Jornada de trabajo",      texto: "Me quedo tiempo extra (más de 1 hora) para terminar mis tareas con frecuencia.", tipo: "likert" },
  { id: 6,  categoria: "Liderazgo",               texto: "Mi líder técnico me comunica claramente qué se espera de mi trabajo.", tipo: "likert" },
  { id: 7,  categoria: "Relaciones en el trabajo",texto: "Tengo buenas relaciones de colaboración con mis compañeros de equipo.", tipo: "likert" },
  { id: 8,  categoria: "Ambiente de respeto",     texto: "En mi equipo se respetan las opiniones y no hay críticas injustificadas.", tipo: "likert" },
  { id: 9,  categoria: "Equilibrio vida-trabajo", texto: "Mi trabajo me permite cumplir con mis responsabilidades personales y familiares.", tipo: "likert" },
  { id: 10, categoria: "Desarrollo profesional",  texto: "Siento que tengo oportunidades reales de aprender y crecer en esta empresa.", tipo: "likert" },
  { id: 11, categoria: "Reconocimiento",          texto: "Recibo reconocimiento cuando hago un buen trabajo.", tipo: "likert" },
  { id: 12, categoria: "Herramientas y recursos", texto: "Cuento con las herramientas, accesos y equipos necesarios para hacer bien mi trabajo.", tipo: "likert" },
  { id: 13, categoria: "Comentario abierto",      texto: "¿Qué cambiarías en tu equipo o en la empresa para sentirte mejor en el trabajo?", tipo: "abierta" },
];

const LIKERT = ["Nunca", "Casi nunca", "Algunas veces", "Casi siempre", "Siempre"];

// ============================================================
// CALCULAR SCORES DESDE RESPUESTAS REALES
// ============================================================
function calcularScoreGeneral(respuestas) {
  if (!respuestas || respuestas.length === 0) return 0;
  let total = 0, count = 0;
  respuestas.forEach(r => {
    PREGUNTAS.forEach(p => {
      if (p.tipo === "likert" && r.respuestas?.[p.id]) {
        // Preguntas positivas: mayor puntaje = mejor
        // Preguntas de carga/jornada: invertir escala
        const invertir = [1, 2, 3, 5].includes(p.id);
        const val = invertir ? 6 - r.respuestas[p.id] : r.respuestas[p.id];
        total += (val / 5) * 100;
        count++;
      }
    });
  });
  return count > 0 ? Math.round(total / count) : 0;
}

function calcularScoresPorEquipo(respuestas) {
  const scores = {};
  EQUIPOS.forEach(eq => {
    const respEquipo = respuestas.filter(r => r.equipo === eq);
    scores[eq] = {
      score: calcularScoreGeneral(respEquipo),
      total: respEquipo.length,
    };
  });
  return scores;
}

function calcularScoresPorCategoria(respuestas) {
  const categorias = {};
  PREGUNTAS.filter(p => p.tipo === "likert").forEach(p => {
    const vals = [];
    respuestas.forEach(r => {
      if (r.respuestas?.[p.id]) {
        const invertir = [1, 2, 3, 5].includes(p.id);
        vals.push(invertir ? 6 - r.respuestas[p.id] : r.respuestas[p.id]);
      }
    });
    if (vals.length > 0) {
      categorias[p.categoria] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length / 5) * 100);
    }
  });
  return categorias;
}

// ============================================================
// COMPONENTES UI BASE
// ============================================================
const Badge = ({ text, color, size = "sm" }) => (
  <span style={{
    background: color + "20", color, border: `1px solid ${color}40`,
    padding: size === "sm" ? "2px 8px" : "4px 12px",
    borderRadius: "20px", fontSize: size === "sm" ? "11px" : "13px",
    fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
  }}>{text}</span>
);

const ProgressBar = ({ value, color = COLORS.accent, height = 8, showLabel = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ flex: 1, background: "#E8EEF4", borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.8s" }} />
    </div>
    {showLabel && <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, minWidth: 32, fontFamily: "'DM Sans', sans-serif" }}>{value}</span>}
  </div>
);

const KPICard = ({ titulo, valor, unidad, cambio, icono, color = COLORS.accent }) => (
  <div style={{
    background: COLORS.white, borderRadius: 16, padding: "20px 24px",
    border: "1px solid #E8EEF4", display: "flex", flexDirection: "column", gap: 8,
    borderTop: `3px solid ${color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <span style={{ fontSize: 13, color: COLORS.neutral, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>{titulo}</span>
      <span style={{ fontSize: 22 }}>{icono}</span>
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ fontSize: 32, fontWeight: 800, color: COLORS.primary, fontFamily: "'DM Sans', sans-serif", letterSpacing: "-1px" }}>{valor}</span>
      <span style={{ fontSize: 14, color: COLORS.neutral, fontFamily: "'DM Sans', sans-serif" }}>{unidad}</span>
    </div>
    {cambio !== undefined && (
      <span style={{ color: cambio >= 0 ? COLORS.success : COLORS.danger, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
        {cambio >= 0 ? "▲" : "▼"} {Math.abs(cambio)} pts vs mes anterior
      </span>
    )}
  </div>
);

const SectionHeader = ({ titulo, subtitulo }) => (
  <div style={{ marginBottom: 20 }}>
    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: COLORS.primary, fontFamily: "'DM Sans', sans-serif" }}>{titulo}</h2>
    {subtitulo && <p style={{ margin: "4px 0 0", fontSize: 13, color: COLORS.neutral, fontFamily: "'DM Sans', sans-serif" }}>{subtitulo}</p>}
  </div>
);

// ============================================================
// VISTA ENCUESTA — PARA FUNCIONARIOS
// ============================================================
const EncuestaView = ({ onVolver }) => {
  const [paso, setPaso] = useState(0);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState("");
  const [respuestas, setRespuestas] = useState({});
  const [completada, setCompletada] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const totalPasos = PREGUNTAS.length;
  const progreso = Math.round((paso / totalPasos) * 100);
  const preguntaActual = PREGUNTAS[paso];

  const handleRespuesta = (id, valor) => setRespuestas(prev => ({ ...prev, [id]: valor }));

  const guardarEnFirebase = async () => {
    setGuardando(true);
    try {
      await addDoc(collection(db, "respuestas"), {
        equipo: equipoSeleccionado,
        respuestas,
        timestamp: serverTimestamp(),
        // Sin datos personales — 100% anónimo
      });
      setCompletada(true);
    } catch (e) {
      setError("Error al guardar. Verificá tu conexión e intentá de nuevo.");
    }
    setGuardando(false);
  };

  // Pantalla de selección de equipo
  if (!equipoSeleccionado) {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: 40, maxWidth: 480, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔭</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: COLORS.primary, fontFamily: "'DM Sans', sans-serif" }}>Encuesta de Clima Laboral</h2>
            <p style={{ margin: 0, color: COLORS.neutral, fontSize: 14, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>100% anónima • Tus respuestas son confidenciales<br />Ley 1682/01 de Datos Personales — Paraguay</p>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.primary, marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>¿A qué equipo pertenecés?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {EQUIPOS.map(eq => (
              <button key={eq} onClick={() => setEquipoSeleccionado(eq)} style={{
                border: `2px solid #E8EEF4`, borderRadius: 12, padding: "14px 20px",
                fontSize: 15, cursor: "pointer", textAlign: "left", background: "#fff",
                color: COLORS.primary, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.border = `2px solid ${COLORS.accent}`; e.currentTarget.style.background = COLORS.accent + "10"; }}
                onMouseLeave={e => { e.currentTarget.style.border = "2px solid #E8EEF4"; e.currentTarget.style.background = "#fff"; }}
              >
                <span style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.accent + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {eq === "Desarrollo" ? "💻" : eq === "QA" ? "🧪" : eq === "DevOps" ? "⚙️" : eq === "Data" ? "📊" : "🎧"}
                </span>
                {eq}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de completado
  if (completada) {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: 48, textAlign: "center", maxWidth: 440, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, color: COLORS.primary, fontFamily: "'DM Sans', sans-serif" }}>¡Gracias por participar!</h2>
          <p style={{ color: COLORS.neutral, fontSize: 15, margin: "0 0 24px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>Tu opinión es completamente anónima y ayuda a mejorar el ambiente de trabajo para todos.</p>
          <div style={{ background: COLORS.light, borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: COLORS.neutral, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Equipo</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.accent, fontFamily: "'DM Sans', sans-serif" }}>{equipoSeleccionado}</div>
            <div style={{ fontSize: 13, color: COLORS.neutral, marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>{Object.keys(respuestas).length} preguntas respondidas ✅</div>
          </div>
          <p style={{ fontSize: 12, color: COLORS.neutral, fontFamily: "'DM Sans', sans-serif" }}>Podés cerrar esta ventana.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 600, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            Encuesta de Clima TI • {equipoSeleccionado} • Confidencial
          </span>
          <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{paso}/{totalPasos}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 99, height: 6, overflow: "hidden" }}>
          <div style={{ width: `${progreso}%`, height: "100%", background: COLORS.accent, borderRadius: 99, transition: "width 0.5s" }} />
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 24, padding: 36, maxWidth: 600, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
        <Badge text={preguntaActual.categoria} color={COLORS.secondary} size="md" />
        <p style={{ margin: "20px 0 28px", fontSize: 18, fontWeight: 600, color: COLORS.primary, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>
          {preguntaActual.texto}
        </p>

        {preguntaActual.tipo === "likert" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {LIKERT.map((op, i) => (
              <button key={i} onClick={() => handleRespuesta(preguntaActual.id, i + 1)} style={{
                border: respuestas[preguntaActual.id] === i + 1 ? `2px solid ${COLORS.accent}` : "2px solid #E8EEF4",
                borderRadius: 12, padding: "12px 20px", fontSize: 14, cursor: "pointer", textAlign: "left",
                background: respuestas[preguntaActual.id] === i + 1 ? COLORS.accent + "15" : "#fff",
                color: COLORS.primary, fontWeight: respuestas[preguntaActual.id] === i + 1 ? 700 : 400,
                transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: respuestas[preguntaActual.id] === i + 1 ? COLORS.accent : "#E8EEF4", color: respuestas[preguntaActual.id] === i + 1 ? "#fff" : COLORS.neutral, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                {op}
              </button>
            ))}
          </div>
        )}

        {preguntaActual.tipo === "abierta" && (
          <textarea value={respuestas[preguntaActual.id] || ""} onChange={e => handleRespuesta(preguntaActual.id, e.target.value)}
            placeholder="Escribí tu respuesta aquí... (opcional)"
            style={{ width: "100%", minHeight: 120, border: "2px solid #E8EEF4", borderRadius: 12, padding: 16, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: COLORS.primary, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
        )}

        {error && <p style={{ color: COLORS.danger, fontSize: 13, marginTop: 12, fontFamily: "'DM Sans', sans-serif" }}>{error}</p>}

        <div style={{ display: "flex", gap: 12, marginTop: 28, justifyContent: "space-between" }}>
          <button onClick={() => { if (paso > 0) setPaso(p => p - 1); else setEquipoSeleccionado(""); }}
            style={{ border: "2px solid #E8EEF4", background: "#fff", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", color: COLORS.neutral }}>
            ← Anterior
          </button>
          {paso < totalPasos - 1 ? (
            <button onClick={() => setPaso(p => p + 1)}
              disabled={preguntaActual.tipo === "likert" && !respuestas[preguntaActual.id]}
              style={{ background: (preguntaActual.tipo === "likert" && !respuestas[preguntaActual.id]) ? "#E8EEF4" : COLORS.accent, color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Siguiente →
            </button>
          ) : (
            <button onClick={guardarEnFirebase} disabled={guardando}
              style={{ background: guardando ? "#E8EEF4" : COLORS.success, color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              {guardando ? "⏳ Guardando..." : "Enviar respuestas ✓"}
            </button>
          )}
        </div>
      </div>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 16, fontFamily: "'DM Sans', sans-serif", textAlign: "center" }}>
        🔒 Anónimo • Ley 1682/01 de Datos Personales — Paraguay
      </p>
    </div>
  );
};

// ============================================================
// DASHBOARD SUPER ADMIN — DATOS EN TIEMPO REAL
// ============================================================
const Dashboard = ({ respuestas }) => {
  const scoreGeneral = calcularScoreGeneral(respuestas);
  const scoresPorEquipo = calcularScoresPorEquipo(respuestas);
  const scoresCat = calcularScoresPorCategoria(respuestas);
  const range = getScoreRange(scoreGeneral);

  const equipoData = EQUIPOS.map(eq => ({
    nombre: eq,
    score: scoresPorEquipo[eq]?.score || 0,
    total: scoresPorEquipo[eq]?.total || 0,
    riesgo: getScoreRange(scoresPorEquipo[eq]?.score || 0).label,
  })).sort((a, b) => a.score - b.score);

  const catData = Object.entries(scoresCat).map(([cat, score]) => ({ cat: cat.split(" ").slice(0, 2).join(" "), score }));

  // Respuestas abiertas reales
  const comentarios = respuestas
    .filter(r => r.respuestas?.[13])
    .slice(-5)
    .reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ALERTA si no hay respuestas */}
      {respuestas.length === 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 24 }}>⏳</span>
          <div>
            <div style={{ fontWeight: 700, color: COLORS.primary, fontFamily: "'DM Sans', sans-serif" }}>Esperando respuestas...</div>
            <div style={{ fontSize: 13, color: COLORS.neutral, fontFamily: "'DM Sans', sans-serif" }}>Compartí el link de la encuesta con los funcionarios. Los datos aparecerán aquí en tiempo real.</div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`, borderRadius: 16, padding: "20px 24px", color: "#fff", boxShadow: "0 4px 20px rgba(10,35,66,0.25)" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "'DM Sans', sans-serif" }}>Score de Clima General</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: range.color, fontFamily: "'DM Sans', sans-serif", letterSpacing: "-2px", lineHeight: 1.1, marginTop: 4 }}>{scoreGeneral}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans', sans-serif" }}>/100 • {range.label}</div>
        </div>
        <KPICard titulo="Total Respuestas" valor={respuestas.length} unidad="funcionarios" icono="📋" color={COLORS.success} />
        <KPICard titulo="Tasa de Respuesta" valor={Math.round((respuestas.length / 400) * 100)} unidad="% de 400" icono="📊" color={COLORS.accent} />
        <KPICard titulo="Equipos Evaluados" valor={EQUIPOS.filter(eq => (scoresPorEquipo[eq]?.total || 0) > 0).length} unidad={`de ${EQUIPOS.length}`} icono="👥" color={COLORS.secondary} />
        <KPICard titulo="Factores en Riesgo" valor={Object.values(scoresCat).filter(s => s < 65).length} unidad="categorías" icono="⚠️" color={COLORS.danger} />
      </div>

      {/* Score por equipo */}
      <div>
        <SectionHeader titulo="Clima por Equipo TI" subtitulo="Datos en tiempo real — se actualiza automáticamente con cada respuesta" />
        <div style={{ background: COLORS.white, borderRadius: 16, padding: 24, border: "1px solid #E8EEF4" }}>
          {equipoData.map((dep, i) => {
            const r = getScoreRange(dep.score);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr 50px 90px 80px", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < equipoData.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary, fontFamily: "'DM Sans', sans-serif" }}>{dep.nombre}</span>
                <ProgressBar value={dep.score} color={r.color} height={10} showLabel={false} />
                <span style={{ fontSize: 14, fontWeight: 800, color: r.color, fontFamily: "'DM Sans', sans-serif" }}>{dep.score || "—"}</span>
                <Badge text={dep.score > 0 ? r.label : "Sin datos"} color={dep.score > 0 ? r.color : COLORS.neutral} />
                <span style={{ fontSize: 11, color: COLORS.neutral, fontFamily: "'DM Sans', sans-serif" }}>{dep.total} resp.</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Categorías */}
      {catData.length > 0 && (
        <div>
          <SectionHeader titulo="Score por Categoría" subtitulo="Factores de riesgo psicosocial evaluados" />
          <div style={{ background: COLORS.white, borderRadius: 16, padding: 24, border: "1px solid #E8EEF4" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {Object.entries(scoresCat).map(([cat, score], i) => {
                const r = getScoreRange(score);
                return (
                  <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.primary, fontFamily: "'DM Sans', sans-serif" }}>{cat}</span>
                      <Badge text={`${score}/100`} color={r.color} />
                    </div>
                    <ProgressBar value={score} color={r.color} height={7} showLabel={false} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Gráfica barras por equipo */}
      {equipoData.some(e => e.score > 0) && (
        <div style={{ background: COLORS.white, borderRadius: 16, padding: 24, border: "1px solid #E8EEF4" }}>
          <SectionHeader titulo="Comparativa de Equipos" subtitulo="Score de clima por equipo" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={equipoData} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="nombre" tick={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif" }} />
              <Tooltip formatter={v => [`${v}/100`, "Score"]} contentStyle={{ borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 12 }} />
              <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                {equipoData.map((entry, index) => (
                  <Cell key={index} fill={getScoreRange(entry.score).color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comentarios abiertos reales */}
      {comentarios.length > 0 && (
        <div>
          <SectionHeader titulo="🧠 Comentarios Abiertos Recientes" subtitulo="Respuestas textuales anónimas de los funcionarios" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {comentarios.map((r, i) => (
              <div key={i} style={{ background: COLORS.white, borderRadius: 14, padding: "14px 18px", border: "1px solid #E8EEF4", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Badge text={r.equipo} color={COLORS.secondary} />
                <p style={{ margin: 0, fontSize: 13, color: COLORS.primary, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>"{r.respuestas[13]}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas automáticas */}
      {respuestas.length > 0 && (
        <div>
          <SectionHeader titulo="⚡ Alertas Automáticas" subtitulo="Generadas en base a los datos reales" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {equipoData.filter(e => e.score > 0 && e.score <= 60).map((e, i) => (
              <div key={i} style={{ background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px" }}>
                <p style={{ margin: 0, fontSize: 13, color: COLORS.primary, fontFamily: "'DM Sans', sans-serif" }}>
                  🔴 <strong>{e.nombre}</strong> tiene score {e.score}/100 — En zona de riesgo. Se recomienda intervención inmediata.
                </p>
              </div>
            ))}
            {Object.entries(scoresCat).filter(([, s]) => s < 65).map(([cat, score], i) => (
              <div key={i} style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "12px 16px" }}>
                <p style={{ margin: 0, fontSize: 13, color: COLORS.primary, fontFamily: "'DM Sans', sans-serif" }}>
                  ⚠️ <strong>{cat}</strong> está en {score}/100 — Por debajo del umbral seguro (65). Requiere plan de intervención.
                </p>
              </div>
            ))}
            {equipoData.every(e => e.score === 0 || e.score > 60) && Object.values(scoresCat).every(s => s >= 65) && (
              <div style={{ background: "#F0FFF4", border: "1px solid #A7F3D0", borderRadius: 12, padding: "12px 16px" }}>
                <p style={{ margin: 0, fontSize: 13, color: COLORS.primary, fontFamily: "'DM Sans', sans-serif" }}>
                  ✅ Todos los equipos y categorías están dentro del rango aceptable o superior.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// APP PRINCIPAL
// ============================================================
export default function TeamScopeApp() {
  const [modulo, setModulo] = useState("dashboard");
  const [modoEncuesta, setModoEncuesta] = useState(false);
  const [respuestas, setRespuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  // ─── ESCUCHAR FIREBASE EN TIEMPO REAL ─────────────────────
  useEffect(() => {
    const q = query(collection(db, "respuestas"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRespuestas(data);
      setUltimaActualizacion(new Date());
      setCargando(false);
    }, (error) => {
      console.error("Error Firebase:", error);
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  const nav = [
    { id: "dashboard", label: "Dashboard",         icon: "📊" },
    { id: "encuesta",  label: "Ver Encuesta",       icon: "📋" },
  ];

  if (modoEncuesta) return <EncuestaView onVolver={() => setModoEncuesta(false)} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #F1F5F9; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }
      `}</style>

      {/* SIDEBAR */}
      <div style={{ width: sidebarCollapsed ? 64 : 240, background: COLORS.primary, display: "flex", flexDirection: "column", transition: "width 0.3s", overflow: "hidden", flexShrink: 0, boxShadow: "2px 0 20px rgba(10,35,66,0.15)" }}>
        <div style={{ padding: sidebarCollapsed ? "20px 14px" : "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: COLORS.accent, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🔭</div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>TeamScope</div>
              <div style={{ color: COLORS.accent, fontSize: 10 }}>🇵🇾 Paraguay • Tiempo real</div>
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>TechCorp Paraguay S.A.</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 2 }}>
                {cargando ? "Conectando..." : `${respuestas.length} respuestas recibidas`}
              </div>
              {/* Indicador en vivo */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: cargando ? COLORS.warning : COLORS.success, animation: "pulse 2s infinite" }} />
                <span style={{ color: cargando ? COLORS.warning : COLORS.success, fontSize: 10, fontWeight: 600 }}>
                  {cargando ? "Conectando..." : "En vivo"}
                </span>
              </div>
            </div>
          </div>
        )}

        <nav style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          {nav.map(item => (
            <button key={item.id} onClick={() => setModulo(item.id)} style={{
              background: modulo === item.id ? COLORS.accent : "transparent",
              border: "none", borderRadius: 10, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              color: modulo === item.id ? "#fff" : "rgba(255,255,255,0.6)", width: "100%", textAlign: "left",
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: modulo === item.id ? 700 : 500, whiteSpace: "nowrap" }}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={() => setModoEncuesta(true)} style={{ background: "rgba(0,196,180,0.15)", border: "1px solid rgba(0,196,180,0.3)", borderRadius: 10, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: COLORS.accent, width: "100%" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📝</span>
            {!sidebarCollapsed && <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>Vista previa encuesta</span>}
          </button>
          <button onClick={() => setSidebarCollapsed(s => !s)} style={{ background: "transparent", border: "none", borderRadius: 10, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "rgba(255,255,255,0.4)", width: "100%", justifyContent: sidebarCollapsed ? "center" : "flex-start" }}>
            <span style={{ fontSize: 16 }}>{sidebarCollapsed ? "→" : "←"}</span>
            {!sidebarCollapsed && <span style={{ fontSize: 11 }}>Colapsar</span>}
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ background: COLORS.white, padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E8EEF4" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: COLORS.primary }}>
              {nav.find(n => n.id === modulo)?.icon} {nav.find(n => n.id === modulo)?.label}
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.neutral, marginTop: 2 }}>
              TechCorp Paraguay S.A. • {ultimaActualizacion ? `Última actualización: ${ultimaActualizacion.toLocaleTimeString()}` : "Conectando con Firebase..."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ background: cargando ? "#FFFBEB" : "#F0FFF4", borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: cargando ? COLORS.warning : COLORS.success }}>●</span>
              <span style={{ fontSize: 12, color: COLORS.neutral, fontWeight: 500 }}>
                {cargando ? "Conectando..." : `${respuestas.length} respuestas en tiempo real`}
              </span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          {cargando ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 48 }}>🔭</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.primary, fontFamily: "'DM Sans', sans-serif" }}>Conectando con Firebase...</div>
              <div style={{ fontSize: 13, color: COLORS.neutral, fontFamily: "'DM Sans', sans-serif" }}>Los datos aparecerán automáticamente</div>
            </div>
          ) : (
            modulo === "dashboard" ? <Dashboard respuestas={respuestas} /> :
            <div style={{ background: COLORS.white, borderRadius: 16, padding: 24, border: "1px solid #E8EEF4" }}>
              <SectionHeader titulo="Vista previa de la Encuesta" subtitulo="Así ven la encuesta los funcionarios cuando abren el link" />
              <button onClick={() => setModoEncuesta(true)} style={{ background: COLORS.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                📝 Abrir encuesta completa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
