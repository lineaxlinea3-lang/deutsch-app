import { useState, useEffect, useRef, useCallback } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────
const SUPABASE_URL = "https://snmdvcwchgkbxnifcnwi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubWR2Y3djaGdrYnhuaWZjbndpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NzExOTEsImV4cCI6MjA5MTQ0NzE5MX0.Wu6TGVgPcy5C-uLRS9nJCphHLF9H_yK37teKo1Q_89Y";

// Supabase client ligero sin dependencias externas
const supabase = {
  headers: {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  },

  // Auth: registrar con email
  async signUp(email, password, name) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ email, password, data: { full_name: name } }),
    });
    return res.json();
  },

  // Auth: iniciar sesión con email
  async signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  // Auth: cerrar sesión
  async signOut(accessToken) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { ...this.headers, "Authorization": `Bearer ${accessToken}` },
    });
  },

  // Auth: Google OAuth URL
  getGoogleOAuthURL() {
    return `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`;
  },

  // DB: obtener progreso SRS del usuario
  async getSRSProgress(userId, deckKey, accessToken) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/srs_progress?user_id=eq.${userId}&deck_key=eq.${deckKey}`,
      { headers: { ...this.headers, "Authorization": `Bearer ${accessToken}` } }
    );
    return res.json();
  },

  // DB: guardar/actualizar progreso SRS
  async upsertSRS(userId, deckKey, cardFront, data, accessToken) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/srs_progress`, {
      method: "POST",
      headers: {
        ...this.headers,
        "Authorization": `Bearer ${accessToken}`,
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        user_id: userId,
        deck_key: deckKey,
        card_front: cardFront,
        ...data,
      }),
    });
    return res.ok;
  },

  // DB: actualizar perfil
  async updateProfile(userId, data, accessToken) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        ...this.headers,
        "Authorization": `Bearer ${accessToken}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  },
};

// ─── SESSION STORAGE ──────────────────────────────────────────────────────
function saveSession(session) {
  try { localStorage.setItem("glota-session", JSON.stringify(session)); } catch {}
}
function loadSession() {
  try {
    const raw = localStorage.getItem("glota-session");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function clearSession() {
  try { localStorage.removeItem("glota-session"); } catch {}
}

// ─── UNIQUE ID ────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => `card_${Date.now()}_${++_uid}`;

// ─── SEED CARDS ───────────────────────────────────────────────────────────
const RAW_SEEDS = {
  "A1-Vocabulario": [
    { front: "das Haus", back: "la casa", phonetic: "das HAUS", tip: "das = neutro" },
    { front: "der Mann", back: "el hombre", phonetic: "dair MAN", tip: "der = masculino" },
    { front: "die Frau", back: "la mujer", phonetic: "dee FRAU", tip: "die = femenino" },
    { front: "das Kind", back: "el niño/la niña", phonetic: "das KINT", tip: "Plural: Kinder" },
    { front: "der Hund", back: "el perro", phonetic: "dair HUNT", tip: "Plural: Hunde" },
  ],
  "A1-Gramática": [
    { front: "ich bin", back: "yo soy / estoy", phonetic: "ikh BIN", tip: "sein = ser/estar" },
    { front: "du bist", back: "tú eres", phonetic: "doo BIST", tip: "informal" },
    { front: "nicht", back: "no (negación)", phonetic: "nikht", tip: "va después del verbo" },
    { front: "kein / keine", back: "ningún / ninguna", phonetic: "KAIN / KAI-ne", tip: "niega sustantivos" },
  ],
  "A1-Frases": [
    { front: "Guten Morgen!", back: "¡Buenos días!", phonetic: "GOO-ten MOR-gen", tip: "hasta el mediodía" },
    { front: "Wie heißt du?", back: "¿Cómo te llamas?", phonetic: "vee HAIST doo", tip: "informal" },
    { front: "Danke schön!", back: "¡Muchas gracias!", phonetic: "DAN-ke shön", tip: "ö suena entre e y o" },
    { front: "Entschuldigung!", back: "¡Perdón! / Disculpe", phonetic: "ent-SHOOL-di-gung", tip: "la más larga del día" },
  ],
  "A1-Verbos": [
    { front: "ich gehe", back: "yo voy", phonetic: "ikh GAY-e", tip: "gehen = ir" },
    { front: "ich habe", back: "yo tengo", phonetic: "ikh HA-be", tip: "haben = tener" },
    { front: "ich mache", back: "yo hago", phonetic: "ikh MA-khe", tip: "machen = hacer" },
    { front: "ich esse", back: "yo como", phonetic: "ikh E-se", tip: "essen = comer" },
    { front: "ich spreche", back: "yo hablo", phonetic: "ikh SHPRE-khe", tip: "sprechen = hablar" },
  ],
  "A2-Vocabulario": [
    { front: "die Arbeit", back: "el trabajo", phonetic: "dee AR-bait", tip: "arbeiten = trabajar" },
    { front: "die Zeit", back: "el tiempo / la hora", phonetic: "dee TSAIT", tip: "doble significado" },
    { front: "das Geld", back: "el dinero", phonetic: "das GELT", tip: "muy útil 😄" },
    { front: "die Wohnung", back: "el apartamento", phonetic: "dee VO-nung", tip: "wohnen = vivir" },
  ],
  "A2-Gramática": [
    { front: "weil + Verb am Ende", back: "porque (verbo al final)", phonetic: "VAIL", tip: "weil ich müde bin" },
    { front: "Perfekt: ich habe gemacht", back: "Pasado: yo hice", phonetic: "ikh HA-be ge-MAKHT", tip: "ge- + participio" },
    { front: "Komparativ: schneller", back: "más rápido (comparativo)", phonetic: "SHNEL-er", tip: "adj + -er" },
  ],
  "A2-Frases": [
    { front: "Könnten Sie mir helfen?", back: "¿Podría usted ayudarme?", phonetic: "KÖN-ten zee meer HEL-fen", tip: "muy formal" },
    { front: "Wie viel kostet das?", back: "¿Cuánto cuesta esto?", phonetic: "vee FEEL KOS-tet das", tip: "de compras" },
    { front: "Das klingt gut.", back: "Eso suena bien.", phonetic: "das KLINGT goot", tip: "mostrar interés" },
  ],
  "A2-Verbos": [
    { front: "ich kann", back: "yo puedo", phonetic: "ikh KAN", tip: "können = poder" },
    { front: "ich muss", back: "yo debo", phonetic: "ikh MUS", tip: "müssen = deber" },
    { front: "ich will", back: "yo quiero", phonetic: "ikh VIL", tip: "wollen = querer" },
    { front: "ich verstehe", back: "yo entiendo", phonetic: "ikh fer-SHTAY-e", tip: "verstehen = entender" },
  ],
};

const SEED_CARDS = {};
Object.entries(RAW_SEEDS).forEach(([key, cards]) => {
  SEED_CARDS[key] = cards.map(c => ({ ...c, id: uid() }));
});

const LEVELS = ["A1", "A2"];
const CATEGORIES = ["Vocabulario", "Frases", "Gramática", "Verbos"];
const CAT_ICONS = { Vocabulario: "📚", Frases: "💬", Gramática: "🔤", Verbos: "🔁" };
const THEME = {
  A1: { accent: "#1db954", glow: "rgba(29,185,84,0.3)", glass: "rgba(29,185,84,0.08)", border: "rgba(29,185,84,0.22)", label: "Principiante" },
  A2: { accent: "#1e90ff", glow: "rgba(30,144,255,0.3)", glass: "rgba(30,144,255,0.08)", border: "rgba(30,144,255,0.22)", label: "Básico" },
};

// ─── SRS ──────────────────────────────────────────────────────────────────
const SRS_INTERVALS = [0, 1, 3, 7, 14, 30, 60];

function sortBySRS(cards, srsData) {
  const now = new Date();
  return [...cards].sort((a, b) => {
    const srsA = srsData[a.front];
    const srsB = srsData[b.front];
    if (!srsA && !srsB) return 0;
    if (!srsA) return -1;
    if (!srsB) return 1;
    const nextA = new Date(srsA.next_review);
    const nextB = new Date(srsB.next_review);
    const aOverdue = nextA <= now;
    const bOverdue = nextB <= now;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return nextA - nextB;
  });
}

function getDueTodayCount(srsData) {
  const now = new Date();
  return Object.values(srsData).filter(c => !c.next_review || new Date(c.next_review) <= now).length;
}

// ─── API CALL (SIN TOCAR) ─────────────────────────────────────────────────
async function generateCards(level, category, existingFronts = []) {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, category, language: "alemán", existingFronts }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    return (data.cards || []).map(c => ({ ...c, id: uid() }));
  } catch (e) {
    console.error("Error /api/generate:", e);
    throw e;
  }
}

// ─── SPEECH (SIN TOCAR) ───────────────────────────────────────────────────
function speakGerman(text, onStart, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "de-DE"; utter.rate = 0.82; utter.pitch = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const deVoice = voices.find(v => v.lang.startsWith("de"));
  if (deVoice) utter.voice = deVoice;
  utter.onstart = () => onStart?.();
  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utter);
}

// ─── LEVENSHTEIN ──────────────────────────────────────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function normalizeDe(str) {
  return str.toLowerCase()
    .replace(/[!?.,;:¡¿"']/g, "")
    .replace(/ß/g, "ss").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
    .trim();
}

function scorePronunciation(expected, heard) {
  const exp = normalizeDe(expected), got = normalizeDe(heard);
  if (exp === got) return { score: 100, label: "¡Perfecto!", color: "#1db954", emoji: "🏆" };
  const expWords = exp.split(/\s+/), gotWords = got.split(/\s+/);
  let wordMatches = 0;
  expWords.forEach(w => {
    const bestDist = Math.min(...gotWords.map(gw => levenshtein(w, gw)));
    if (bestDist <= Math.max(1, Math.floor(w.length * 0.3))) wordMatches++;
  });
  const wordScore = expWords.length > 0 ? wordMatches / expWords.length : 0;
  const dist = levenshtein(exp, got);
  const charScore = 1 - dist / Math.max(exp.length, got.length, 1);
  const final = Math.round((wordScore * 0.55 + charScore * 0.45) * 100);
  if (final >= 90) return { score: final, label: "¡Excelente!", color: "#1db954", emoji: "🏆" };
  if (final >= 75) return { score: final, label: "¡Muy bien!", color: "#1db954", emoji: "✅" };
  if (final >= 55) return { score: final, label: "Casi, sigue practicando", color: "#f5a623", emoji: "👍" };
  if (final >= 35) return { score: final, label: "Sigue intentando", color: "#ff6b00", emoji: "💪" };
  return { score: final, label: "Inténtalo de nuevo", color: "#e74c3c", emoji: "🔄" };
}

// ─── SPEECH RECOGNITION ───────────────────────────────────────────────────
function useSpeechRecognition() {
  const ref = useRef(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const r = new SR();
    r.lang = "de-DE"; r.continuous = false; r.interimResults = false; r.maxAlternatives = 3;
    r.onresult = (e) => { setTranscript(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    ref.current = r;
  }, []);
  const start = () => { if (!ref.current) return; setTranscript(""); setListening(true); try { ref.current.start(); } catch { setListening(false); } };
  const stop = () => { ref.current?.stop(); setListening(false); };
  return { listening, transcript, supported, start, stop };
}

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const show = useCallback((message, type = "info", duration = 3500) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null;
  const colors = {
    error:   { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.3)",  text: "#fca5a5", icon: "✕" },
    success: { bg: "rgba(29,185,84,0.15)",  border: "rgba(29,185,84,0.3)",  text: "#86efac", icon: "✓" },
    info:    { bg: "rgba(30,144,255,0.15)", border: "rgba(30,144,255,0.3)", text: "#93c5fd", icon: "ℹ" },
  };
  return (
    <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, width: "90%", maxWidth: 380 }}>
      {toasts.map(t => {
        const c = colors[t.type] || colors.info;
        return (
          <div key={t.id} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "12px 18px", color: c.text, fontSize: 13, fontWeight: 600, backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 10, animation: "slideDown 0.3s ease" }}>
            <span style={{ fontSize: 14, fontWeight: 800, width: 22, height: 22, borderRadius: "50%", background: c.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.icon}</span>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}

// ─── PRONUNCIATION PANEL ──────────────────────────────────────────────────
function PronunciationPanel({ card, theme, onSpeak, speaking }) {
  const { listening, transcript, supported, start, stop } = useSpeechRecognition();
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(0);
  useEffect(() => { setResult(null); setAttempts(0); }, [card?.id]);
  useEffect(() => {
    if (transcript && card) { setResult({ ...scorePronunciation(card.front, transcript), heard: transcript }); setAttempts(a => a + 1); }
  }, [transcript]);
  if (!supported) return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.border}`, borderRadius: 16, padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: 12, width: "100%", maxWidth: 420 }}>
      Usa Chrome para reconocimiento de voz
    </div>
  );
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`, borderRadius: 20, overflow: "hidden", marginBottom: 14, width: "100%", maxWidth: 420, animation: "slideUp 0.3s ease" }}>
      <div style={{ padding: "10px 16px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase" }}>🎤 Pronunciación</span>
        {attempts > 0 && <span style={{ fontSize: 10, color: theme.accent }}>{attempts} intento{attempts > 1 ? "s" : ""}</span>}
      </div>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: theme.glass, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: theme.accent, flexShrink: 0 }}>1</div>
          <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Escucha la pronunciación</span>
          <button onClick={(e) => { e.stopPropagation(); onSpeak(); }} style={{ background: speaking ? theme.glass : "rgba(255,255,255,0.04)", border: `1px solid ${speaking ? theme.accent : "rgba(255,255,255,0.1)"}`, borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "all 0.2s" }}>
            <span style={{ fontSize: 14, animation: speaking ? "speakPulse 0.6s ease infinite alternate" : "none" }}>🔊</span>
            <span style={{ fontSize: 11, color: speaking ? theme.accent : "rgba(255,255,255,0.35)" }}>{speaking ? "..." : "Oír"}</span>
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: theme.glass, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: theme.accent, flexShrink: 0 }}>2</div>
          <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Repite en voz alta</span>
          <button onClick={(e) => { e.stopPropagation(); listening ? stop() : start(); }} style={{ background: listening ? "rgba(231,76,60,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${listening ? "#e74c3c" : "rgba(255,255,255,0.1)"}`, borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "all 0.2s" }}>
            <span style={{ fontSize: 14, animation: listening ? "speakPulse 0.5s ease infinite alternate" : "none" }}>🎙️</span>
            <span style={{ fontSize: 11, color: listening ? "#e74c3c" : "rgba(255,255,255,0.35)" }}>{listening ? "Grabando..." : "Hablar"}</span>
          </button>
        </div>
        {listening && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 28, marginTop: 10 }}>
            {[...Array(16)].map((_, i) => <div key={i} style={{ width: 3, borderRadius: 2, background: "#e74c3c", animation: `wave 0.${4 + (i % 5)}s ease infinite alternate`, animationDelay: `${i * 0.05}s` }} />)}
          </div>
        )}
        {result && !listening && (
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 14, padding: "12px", border: `1px solid ${result.color}22`, marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{result.emoji}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: result.color }}>{result.score}%</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginBottom: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: result.color, width: `${result.score}%`, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ fontSize: 13, color: result.color, fontWeight: 600, marginBottom: 8 }}>{result.label}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <div><div style={{ color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>Correcto</div><div style={{ color: "rgba(255,255,255,0.6)" }}>{card.front}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>Escuché</div><div style={{ color: result.score >= 75 ? theme.accent : "rgba(255,255,255,0.4)" }}>{result.heard}</div></div>
            </div>
            {result.score < 75 && <button onClick={(e) => { e.stopPropagation(); start(); }} style={{ marginTop: 10, width: "100%", padding: "8px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>🔄 Intentar de nuevo</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LOGO COMPONENTS ─────────────────────────────────────────────────────
function GlotaIcon({ size = 48 }) {
  return <img src="/icon.jpg" alt="Glota" style={{ width: size, height: size, borderRadius: size * 0.22, objectFit: "cover", boxShadow: "0 4px 20px rgba(255,107,26,0.3)" }} />;
}

function GlotaLogoFull({ height = 36 }) {
  return <img src="/logo.jpg" alt="Glota" style={{ height, objectFit: "contain", filter: "invert(1) brightness(1.2)" }} />;
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
function LoginScreen({ onLogin, toastShow, confirmedEmail }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const errs = {};
    if (mode === "register" && !name.trim()) errs.name = "Ingresa tu nombre";
    if (!email.trim()) {
      errs.email = "Ingresa tu correo";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Correo inválido";
    }
    if (!password) {
      errs.password = "Ingresa tu contraseña";
    } else if (mode === "register" && password.length < 8) {
      errs.password = "Mínimo 8 caracteres";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      let result;
      if (mode === "login") {
        result = await supabase.signIn(email, password);
      } else {
        result = await supabase.signUp(email, password, name);
      }
      if (result.error) {
        const msg = result.error.message || "Error de autenticación";
        if (msg.includes("Invalid login")) toastShow("Correo o contraseña incorrectos", "error");
        else if (msg.includes("already registered")) toastShow("Este correo ya está registrado", "error");
        else if (msg.includes("Email not confirmed")) toastShow("Confirma tu correo antes de entrar", "error", 5000);
        else toastShow(msg, "error");
      } else if (result.access_token) {
        saveSession(result);
        onLogin(result);
        toastShow(mode === "login" ? "¡Bienvenido de vuelta!" : "¡Cuenta creada!", "success");
      } else if (mode === "register") {
        toastShow("¡Listo! Revisa tu correo para confirmar tu cuenta 📧", "info", 6000);
      }
    } catch (e) {
      toastShow("Error de conexión. Intenta de nuevo.", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    window.location.href = supabase.getGoogleOAuthURL();
  }

  const inputStyle = (field) => ({
    width: "100%", padding: "13px 16px", borderRadius: 14,
    background: errors[field] ? "rgba(231,76,60,0.08)" : "rgba(255,255,255,0.06)",
    border: `1px solid ${errors[field] ? "rgba(231,76,60,0.4)" : "rgba(255,255,255,0.1)"}`,
    color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box",
    marginBottom: errors[field] ? 4 : 10, transition: "border-color 0.2s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg,#080810 0%,#0d0d1a 50%,#080f0b 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", fontFamily: "system-ui,sans-serif", color: "#fff" }}>
      <div style={{ position: "fixed", left: "10%", top: "15%", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,107,26,0.15)", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", right: "5%", bottom: "20%", width: 220, height: 220, borderRadius: "50%", background: "rgba(255,61,0,0.1)", filter: "blur(70px)", pointerEvents: "none" }} />

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <GlotaIcon size={72} />
          <GlotaLogoFull height={38} />
        </div>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 4 }}>Aprende Idiomas con IA</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Tu progreso guardado en la nube ☁️</div>
      </div>

      <div style={{ width: "100%", maxWidth: 380, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "28px 24px" }}>

        {/* Correo confirmado banner */}
        {confirmedEmail && (
          <div style={{ background: "rgba(29,185,84,0.12)", border: "1px solid rgba(29,185,84,0.3)", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, color: "#1db954", fontWeight: 700 }}>¡Correo confirmado!</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Ya puedes iniciar sesión con tu cuenta</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 4, marginBottom: 24 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setErrors({}); }} style={{ flex: 1, padding: "9px", borderRadius: 11, background: mode === m ? "rgba(255,107,26,0.2)" : "transparent", border: `1px solid ${mode === m ? "rgba(255,107,26,0.3)" : "transparent"}`, color: mode === m ? "#FF6B1A" : "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
              {m === "login" ? "Iniciar sesión" : "Registrarse"}
            </button>
          ))}
        </div>

        {/* Google */}
        <button onClick={handleGoogle} style={{ width: "100%", padding: "13px", borderRadius: 14, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16, transition: "all 0.2s" }}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/></svg>
          Continuar con Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>o con correo</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Name */}
        {mode === "register" && (
          <>
            <input placeholder="Tu nombre" value={name} onChange={e => { setName(e.target.value); setErrors(p => ({...p, name: ""})); }} style={inputStyle("name")} />
            {errors.name && <div style={{ fontSize: 11, color: "#e74c3c", marginBottom: 8, paddingLeft: 4 }}>⚠ {errors.name}</div>}
          </>
        )}

        {/* Email */}
        <input type="email" placeholder="Correo electrónico" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: ""})); }} style={inputStyle("email")} />
        {errors.email && <div style={{ fontSize: 11, color: "#e74c3c", marginBottom: 8, paddingLeft: 4 }}>⚠ {errors.email}</div>}

        {/* Password */}
        <input type="password" placeholder={mode === "register" ? "Contraseña (mín. 8 caracteres)" : "Contraseña"} value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: ""})); }} onKeyDown={e => e.key === "Enter" && handleSubmit()} style={inputStyle("password")} />
        {errors.password && <div style={{ fontSize: 11, color: "#e74c3c", marginBottom: 8, paddingLeft: 4 }}>⚠ {errors.password}</div>}

        <div style={{ marginBottom: 16 }} />

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "14px", borderRadius: 14, background: loading ? "rgba(255,107,26,0.3)" : "linear-gradient(135deg,#FF6B1A,#FF3D00)", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", boxShadow: loading ? "none" : "0 4px 20px rgba(255,107,26,0.3)" }}>
          {loading ? "..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </button>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.12)", textAlign: "center" }}>
        Al continuar aceptas nuestros términos de uso
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────
function Sidebar({ open, onClose, session, onLogout, theme }) {
  if (!open) return null;
  const user = session?.user;
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const email = user?.email || "";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 100 }} />
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 280, background: "linear-gradient(180deg,#0d0d1a,#080810)", border: "1px solid rgba(255,255,255,0.08)", borderLeft: "none", zIndex: 101, display: "flex", flexDirection: "column", animation: "slideRight 0.25s ease", padding: "0 0 24px" }}>

        {/* Header */}
        <div style={{ padding: "48px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <GlotaIcon size={40} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{name}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{email}</div>
        </div>

        {/* Menu items */}
        <div style={{ flex: 1, padding: "16px 12px" }}>
          {[
            { icon: "📊", label: "Mi progreso", soon: true },
            { icon: "🎯", label: "Cuestionario de nivel", soon: true },
            { icon: "🌍", label: "Otros idiomas", soon: true },
            { icon: "🎨", label: "Apariencia", soon: true },
            { icon: "⚙️", label: "Configuración", soon: true },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, color: item.soon ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)", cursor: item.soon ? "default" : "pointer", marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
              {item.soon && <span style={{ marginLeft: "auto", fontSize: 9, color: theme.accent, background: theme.glass, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "2px 6px", fontWeight: 700 }}>PRONTO</span>}
            </div>
          ))}
        </div>

        {/* Logout */}
        <div style={{ padding: "0 12px" }}>
          <button onClick={onLogout} style={{ width: "100%", padding: "13px", borderRadius: 14, background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)", color: "#e74c3c", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────
export default function DeutschAI() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [confirmedEmail, setConfirmedEmail] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [level, setLevel] = useState("A1");
  const [category, setCategory] = useState("Vocabulario");
  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [known, setKnown] = useState(new Set());
  const [unknown, setUnknown] = useState(new Set());
  const [generating, setGenerating] = useState(false);
  const [animDir, setAnimDir] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [showPronunciation, setShowPronunciation] = useState(false);
  const [openLevel, setOpenLevel] = useState(null);
  const [srsData, setSrsData] = useState({});
  const [dueToday, setDueToday] = useState(0);
  const generatingRef = useRef(false);
  const touchRef = useRef(null);
  const { toasts, show: showToast } = useToast();

  const deckKey = `${level}-${category}`;
  const theme = THEME[level];
  const card = deck[index] || null;
  const progress = deck.length > 0 ? (known.size / deck.length) * 100 : 0;

  // Check session on mount
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    const saved = loadSession();
    if (saved?.access_token) {
      setSession(saved);
    }
    // Handle OAuth/email redirect
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const type = params.get("type"); // "signup" = confirmación de correo, "recovery", etc.
      window.location.hash = "";

      if (type === "signup" || type === "email_change") {
        // Es confirmación de correo — mostrar login con mensaje
        setConfirmedEmail(true);
      } else {
        // Es login con Google u OAuth — entrar directo
        const sessionData = {
          access_token: params.get("access_token"),
          refresh_token: params.get("refresh_token"),
          user: { email: params.get("user") || "" },
        };
        saveSession(sessionData);
        setSession(sessionData);
      }
    }
    setAuthLoading(false);
  }, []);

  // Load SRS from Supabase when session + deckKey changes
  useEffect(() => {
    if (!session) return;
    loadSRSFromDB();
  }, [session, deckKey]);

  async function loadSRSFromDB() {
    try {
      const rows = await supabase.getSRSProgress(session.user?.id, deckKey, session.access_token);
      if (Array.isArray(rows)) {
        const srsMap = {};
        rows.forEach(r => { srsMap[r.card_front] = r; });
        setSrsData(srsMap);
        setDueToday(getDueTodayCount(srsMap));

        // Sort seeds by SRS
        const seeds = SEED_CARDS[deckKey] || [];
        const sorted = sortBySRS(seeds, srsMap);
        setDeck(sorted);

        // Restore known cards
        const now = new Date();
        const knownSet = new Set(
          sorted.filter(c => {
            const srs = srsMap[c.front];
            return srs && srs.streak > 0 && new Date(srs.next_review) > now;
          }).map(c => c.id)
        );
        setKnown(knownSet);
        setUnknown(new Set());
        setIndex(0); setFlipped(false); setShowTip(false);
        generatingRef.current = false;
      }
    } catch (e) {
      console.error("Error loading SRS:", e);
      resetDeck();
    }
  }

  function resetDeck() {
    const seeds = SEED_CARDS[deckKey] || [];
    setDeck(seeds);
    setIndex(0); setFlipped(false); setShowTip(false);
    setKnown(new Set()); setUnknown(new Set());
    generatingRef.current = false;
  }

  // Auto-generate (solo si hay sesión activa)
  useEffect(() => {
    if (!session) return;
    const tooFew = deck.length < 8;
    const nearEnd = deck.length > 0 && index >= deck.length - 4;
    if ((tooFew || nearEnd) && !generatingRef.current) loadMore();
  }, [deck.length, index, session]);

  async function loadMore() {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    try {
      const newCards = await generateCards(level, category, deck.map(c => c.front));
      if (newCards.length > 0) {
        setDeck(prev => [...prev, ...newCards]);
        showToast(`+${newCards.length} tarjetas nuevas`, "success", 2500);
      }
    } catch {
      showToast("No se pudieron generar tarjetas.", "error", 4000);
    } finally {
      setGenerating(false);
      generatingRef.current = false;
    }
  }

  function go(dir) {
    setAnimDir(dir);
    setTimeout(() => {
      if (dir === "next") setIndex(i => Math.min(i + 1, deck.length - 1));
      else setIndex(i => Math.max(i - 1, 0));
      setFlipped(false); setShowTip(false); setAnimDir(null);
    }, 180);
  }

  async function saveSRSToDB(cardFront, correct) {
    if (!session) return;
    const existing = srsData[cardFront] || { streak: 0 };
    const newStreak = correct ? Math.min((existing.streak || 0) + 1, SRS_INTERVALS.length - 1) : 0;
    const daysUntil = SRS_INTERVALS[newStreak];
    const next = new Date();
    next.setDate(next.getDate() + daysUntil);
    const newData = {
      streak: newStreak,
      next_review: next.toISOString(),
      total_reviews: (existing.total_reviews || 0) + 1,
      last_review: new Date().toISOString(),
    };
    const updated = { ...srsData, [cardFront]: newData };
    setSrsData(updated);
    setDueToday(getDueTodayCount(updated));
    await supabase.upsertSRS(session.user?.id, deckKey, cardFront, newData, session.access_token);
  }

  function markKnown() {
    if (!card) return;
    setKnown(s => new Set([...s, card.id]));
    setUnknown(s => { const n = new Set(s); n.delete(card.id); return n; });
    saveSRSToDB(card.front, true);
    go("next");
  }

  function markUnknown() {
    if (!card) return;
    setUnknown(s => new Set([...s, card.id]));
    setKnown(s => { const n = new Set(s); n.delete(card.id); return n; });
    saveSRSToDB(card.front, false);
    setDeck(prev => { const rest = prev.filter((_, i) => i !== index); return [...rest, card]; });
    go("next");
  }

  function handleLogout() {
    if (session?.access_token) supabase.signOut(session.access_token);
    clearSession();
    setSession(null);
    setSidebarOpen(false);
  }

  // Swipe
  function handleTouchStart(e) { touchRef.current = e.touches[0].clientX; }
  function handleTouchEnd(e) {
    if (touchRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchRef.current;
    if (Math.abs(diff) > 60) {
      if (diff < 0 && index < deck.length - 1) go("next");
      else if (diff > 0 && index > 0) go("prev");
    }
    touchRef.current = null;
  }

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 28, animation: "spin 1s linear infinite", color: "#1db954" }}>⟳</div>
    </div>
  );

  if (!session) return (
    <>
      <ToastContainer toasts={toasts} />
      <LoginScreen onLogin={setSession} toastShow={showToast} confirmedEmail={confirmedEmail} />
    </>
  );

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ minHeight: "100vh", background: "linear-gradient(145deg,#080810 0%,#0d0d1a 50%,#080f0b 100%)", color: "#fff", fontFamily: "system-ui,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 16px 60px", position: "relative", overflow: "hidden" }}>

      <ToastContainer toasts={toasts} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} session={session} onLogout={handleLogout} theme={theme} />

      {/* Orbs */}
      <div style={{ position: "fixed", left: "10%", top: "15%", width: 300, height: 300, borderRadius: "50%", background: theme.glow, filter: "blur(80px)", pointerEvents: "none", animation: "orbFloat 7s ease-in-out infinite alternate", opacity: 0.5 }} />
      <div style={{ position: "fixed", right: "5%", top: "55%", width: 220, height: 220, borderRadius: "50%", background: level === "A1" ? "rgba(29,185,84,0.1)" : "rgba(30,144,255,0.1)", filter: "blur(70px)", pointerEvents: "none", animation: "orbFloat 9s ease-in-out infinite alternate-reverse", opacity: 0.5 }} />

      {/* Header con botón menú */}
      <div style={{ width: "100%", maxWidth: 420, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, zIndex: 1 }}>
        <button onClick={() => setSidebarOpen(true)} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4, transition: "all 0.2s" }}>
          <div style={{ width: 16, height: 1.5, background: "currentColor", borderRadius: 1 }} />
          <div style={{ width: 12, height: 1.5, background: "currentColor", borderRadius: 1 }} />
          <div style={{ width: 16, height: 1.5, background: "currentColor", borderRadius: 1 }} />
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, background: `linear-gradient(135deg,#fff 30%,${theme.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Deutsch ∞</div>
          <div style={{ fontSize: 10, color: theme.accent, opacity: 0.7 }}>{deck.length} tarjetas · {CAT_ICONS[category]} {category}{dueToday > 0 && <span style={{ marginLeft: 6, background: "rgba(239,68,68,0.15)", color: "#e74c3c", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>{dueToday} hoy</span>}</div>
        </div>
        <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <GlotaIcon size={40} />
        </button>
      </div>

      {/* Level + Category bubble menu */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "flex-start", justifyContent: "center", zIndex: 2 }}>
        {LEVELS.map(l => {
          const t = THEME[l];
          const isOpen = openLevel === l;
          const isActive = level === l;
          return (
            <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {isOpen && (
                <div style={{ display: "flex", gap: 6, padding: "10px 14px", background: "rgba(255,255,255,0.93)", borderRadius: 40, boxShadow: "0 8px 40px rgba(0,0,0,0.5)", animation: "popUp 0.25s cubic-bezier(.17,.67,.25,1.3)", position: "relative" }}>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => { setLevel(l); setCategory(c); setOpenLevel(null); }} title={c} style={{ width: 50, height: 50, borderRadius: "50%", background: level === l && category === c ? t.accent : "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, transition: "all 0.2s" }}>
                      <span style={{ fontSize: 18 }}>{CAT_ICONS[c]}</span>
                      <span style={{ fontSize: 7, fontWeight: 700, color: level === l && category === c ? "#fff" : "#555", textTransform: "uppercase" }}>{c.slice(0, 4)}</span>
                    </button>
                  ))}
                  <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "9px solid rgba(255,255,255,0.93)" }} />
                </div>
              )}
              <button onClick={() => setOpenLevel(isOpen ? null : l)} style={{ padding: "10px 22px", borderRadius: 30, background: isActive ? `linear-gradient(135deg,${t.accent}25,${t.accent}0a)` : "rgba(255,255,255,0.04)", border: `2px solid ${isActive ? t.accent : "rgba(255,255,255,0.1)"}`, color: isActive ? t.accent : "rgba(255,255,255,0.35)", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: isActive ? `0 0 22px ${t.glow}` : "none", transition: "all 0.3s ease", backdropFilter: "blur(12px)" }}>
                {l}
                <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 5, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>{t.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 420, marginBottom: 16, zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
          <span>{card ? `${index + 1} / ${deck.length}` : "—"}</span>
          <span style={{ color: theme.accent }}>{known.size} aprendidas</span>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg,${theme.accent},${theme.accent}77)`, width: `${progress}%`, transition: "width 0.6s ease", boxShadow: `0 0 8px ${theme.glow}` }} />
        </div>
      </div>

      {/* Card */}
      {!card ? (
        <div style={{ width: "100%", maxWidth: 420, minHeight: 300, borderRadius: 28, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, zIndex: 1 }}>
          <div style={{ fontSize: 28, animation: "spin 1s linear infinite" }}>⟳</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Cargando...</div>
        </div>
      ) : (
        <div onClick={() => setFlipped(f => !f)} style={{ width: "100%", maxWidth: 420, minHeight: 300, borderRadius: 32, background: flipped ? "linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))" : "linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))", backdropFilter: "blur(30px)", border: `1px solid ${flipped ? theme.accent + "55" : "rgba(255,255,255,0.1)"}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px 32px", boxShadow: flipped ? `0 8px 48px ${theme.glow}` : "0 8px 32px rgba(0,0,0,0.5)", position: "relative", userSelect: "none", transform: animDir === "next" ? "translateX(60px) scale(0.94)" : animDir === "prev" ? "translateX(-60px) scale(0.94)" : "translateX(0) scale(1)", opacity: animDir ? 0 : 1, transition: "transform 0.18s ease,opacity 0.18s ease,border-color 0.4s", marginBottom: 14, zIndex: 1 }}>
          <div style={{ position: "absolute", top: 16, left: 20, fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: 2, textTransform: "uppercase" }}>{CAT_ICONS[category]} {category}</div>
          <div style={{ position: "absolute", top: 16, right: 20, fontSize: 10, fontWeight: 700, color: flipped ? theme.accent : "rgba(255,255,255,0.15)", transition: "color 0.3s" }}>{flipped ? "ES" : "DE"}</div>
          {(known.has(card.id) || unknown.has(card.id)) && (
            <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", fontSize: 9, padding: "2px 10px", borderRadius: 10, background: known.has(card.id) ? "rgba(29,185,84,0.12)" : "rgba(231,76,60,0.12)", color: known.has(card.id) ? "#1db954" : "#e74c3c", border: `1px solid ${known.has(card.id) ? "rgba(29,185,84,0.2)" : "rgba(231,76,60,0.2)"}`, fontWeight: 700 }}>
              {known.has(card.id) ? "Aprendida" : "Repasar"}
            </div>
          )}
          {!flipped ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.5, marginBottom: 18, lineHeight: 1.1, textShadow: `0 0 40px ${theme.glow}` }}>{card.front}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <button onClick={(e) => { e.stopPropagation(); speakGerman(card.front, () => setSpeaking(true), () => setSpeaking(false)); }} style={{ width: 44, height: 44, borderRadius: "50%", background: speaking ? theme.glass : "rgba(255,255,255,0.06)", border: `2px solid ${speaking ? theme.accent : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.25s" }}>
                  <span style={{ fontSize: 20, animation: speaking ? "speakPulse 0.6s ease infinite alternate" : "none" }}>🔊</span>
                </button>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>{card.phonetic}</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: theme.accent, marginBottom: 14, lineHeight: 1.2, textShadow: `0 0 30px ${theme.glow}` }}>{card.back}</div>
              <button onClick={(e) => { e.stopPropagation(); speakGerman(card.front, () => setSpeaking(true), () => setSpeaking(false)); }} style={{ width: 40, height: 40, borderRadius: "50%", background: speaking ? theme.glass : "rgba(255,255,255,0.05)", border: `2px solid ${speaking ? theme.accent : "rgba(255,255,255,0.1)"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: showTip ? 12 : 0, transition: "all 0.2s" }}>
                <span style={{ fontSize: 18, animation: speaking ? "speakPulse 0.6s ease infinite alternate" : "none" }}>🔊</span>
              </button>
              {showTip && <div style={{ fontSize: 12, background: "rgba(0,0,0,0.3)", padding: "8px 16px", borderRadius: 12, color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)", marginTop: 10 }}>💡 {card.tip}</div>}
            </div>
          )}
          <div style={{ position: "absolute", bottom: 12, fontSize: 10, color: "rgba(255,255,255,0.1)" }}>toca para {flipped ? "ocultar" : "voltear"}</div>
        </div>
      )}

      {/* Toggles */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", justifyContent: "center", zIndex: 1 }}>
        {flipped && card && (
          <button onClick={() => setShowTip(s => !s)} style={{ background: showTip ? theme.glass : "transparent", border: `1px solid ${showTip ? theme.accent : "rgba(255,255,255,0.08)"}`, color: showTip ? theme.accent : "rgba(255,255,255,0.28)", padding: "6px 16px", borderRadius: 20, fontSize: 11, cursor: "pointer", transition: "all 0.2s" }}>
            {showTip ? "Ocultar consejo" : "💡 Ver consejo"}
          </button>
        )}
        {card && (
          <button onClick={() => setShowPronunciation(s => !s)} style={{ width: 44, height: 44, borderRadius: "50%", background: showPronunciation ? theme.glass : "rgba(255,255,255,0.05)", border: `2px solid ${showPronunciation ? theme.accent : "rgba(255,255,255,0.1)"}`, color: showPronunciation ? theme.accent : "rgba(255,255,255,0.4)", fontSize: showPronunciation ? 14 : 20, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
            {showPronunciation ? "✕" : "🎤"}
          </button>
        )}
      </div>

      {showPronunciation && card && (
        <PronunciationPanel card={card} theme={theme} onSpeak={() => speakGerman(card.front, () => setSpeaking(true), () => setSpeaking(false))} speaking={speaking} />
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, alignItems: "center", zIndex: 1 }}>
        <button onClick={() => go("prev")} disabled={index === 0} style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", color: index === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.6)", fontSize: 20, cursor: index === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)", transition: "all 0.2s" }}>←</button>
        <button onClick={markUnknown} style={{ padding: "12px 22px", borderRadius: 26, background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.28)", color: "#e74c3c", fontSize: 13, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(10px)", transition: "all 0.2s" }}>✗ Repasar</button>
        <button onClick={markKnown} style={{ padding: "12px 22px", borderRadius: 26, background: theme.glass, border: `1px solid ${theme.border}`, color: theme.accent, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 0 18px ${theme.glow}`, backdropFilter: "blur(10px)", transition: "all 0.2s" }}>✓ Lo sé</button>
        <button onClick={() => go("next")} style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)", transition: "all 0.2s" }}>→</button>
      </div>

      {generating && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 12, color: theme.accent, zIndex: 1 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: theme.accent, animation: "speakPulse 0.7s ease infinite alternate" }} />
          Generando más tarjetas...
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "flex", gap: 24, marginBottom: 16, zIndex: 1 }}>
        {[[known.size, "Aprendidas", theme.accent], [unknown.size, "Repasar", "#e74c3c"], [deck.length, "Total", "rgba(255,255,255,0.2)"], [dueToday, "Hoy", "#f5a623"]].map(([val, label, color]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color, textShadow: color === theme.accent ? `0 0 12px ${theme.glow}` : "none" }}>{val}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{label}</div>
          </div>
        ))}
      </div>

      <button onClick={loadMore} disabled={generating} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: generating ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.25)", padding: "8px 22px", borderRadius: 22, fontSize: 11, cursor: generating ? "not-allowed" : "pointer", backdropFilter: "blur(10px)", transition: "all 0.2s", zIndex: 1 }}>
        {generating ? "Generando..." : "⟳ Generar más tarjetas"}
      </button>

      <div style={{ marginTop: 20, fontSize: 9, color: "rgba(255,255,255,0.05)", letterSpacing: 4, textTransform: "uppercase", zIndex: 1 }}>
        Glota · IA · {level} · {category}
      </div>

      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: rgba(255,255,255,0.25); }
        input { color-scheme: dark; }
        @keyframes speakPulse { from{transform:scale(1);opacity:0.6} to{transform:scale(1.35);opacity:1} }
        @keyframes wave { from{height:3px} to{height:24px} }
        @keyframes orbFloat { from{transform:translate(-50%,-50%) scale(1)} to{transform:translate(-50%,-50%) scale(1.15) translateY(-16px)} }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideRight { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes popUp { from{opacity:0;transform:scale(0.8) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        button:active { transform:scale(0.95) !important; }
      `}</style>
    </div>
  );
}
