import { useState, useEffect, useRef } from "react";

// ─── SEED CARDS (shown while AI generates more) ───────────────────────────
const SEED_CARDS = {
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
    { front: "Ich heiße...", back: "Me llamo...", phonetic: "ikh HAI-se", tip: "presentarse" },
    { front: "Danke schön!", back: "¡Muchas gracias!", phonetic: "DAN-ke shön", tip: "ö suena entre e y o" },
  ],
  "A1-Verbos": [
    { front: "ich gehe", back: "yo voy", phonetic: "ikh GAY-e", tip: "gehen = ir" },
    { front: "ich habe", back: "yo tengo", phonetic: "ikh HA-be", tip: "haben = tener" },
    { front: "ich mache", back: "yo hago", phonetic: "ikh MA-khe", tip: "machen = hacer" },
  ],
  "A2-Vocabulario": [
    { front: "die Arbeit", back: "el trabajo", phonetic: "dee AR-bait", tip: "arbeiten = trabajar" },
    { front: "die Zeit", back: "el tiempo / la hora", phonetic: "dee TSAIT", tip: "doble significado" },
    { front: "das Geld", back: "el dinero", phonetic: "das GELT", tip: "muy útil 😄" },
  ],
  "A2-Gramática": [
    { front: "weil + Verb am Ende", back: "porque (verbo al final)", phonetic: "VAIL", tip: "weil ich müde bin" },
    { front: "Perfekt: ich habe gemacht", back: "Pasado: yo hice", phonetic: "ikh HA-be ge-MAKHT", tip: "ge- + participio" },
  ],
  "A2-Frases": [
    { front: "Könnten Sie mir helfen?", back: "¿Podría usted ayudarme?", phonetic: "KÖN-ten zee meer HEL-fen", tip: "muy formal y educado" },
    { front: "Wie viel kostet das?", back: "¿Cuánto cuesta esto?", phonetic: "vee FEEL KOS-tet das", tip: "esencial de compras" },
  ],
  "A2-Verbos": [
    { front: "ich werde... (Futur)", back: "yo voy a... (futuro)", phonetic: "ikh VER-de", tip: "werden + Infinitiv" },
    { front: "ich kann", back: "yo puedo", phonetic: "ikh KAN", tip: "können = poder" },
  ],
};

const LEVELS = ["A1", "A2"];
const CATEGORIES = ["Vocabulario", "Frases", "Gramática", "Verbos"];

const LEVEL_COLORS = {
  A1: { accent: "#3ecf8e", dim: "#3ecf8e30", label: "Principiante" },
  A2: { accent: "#4d9fff", dim: "#4d9fff30", label: "Básico" },
};

const CAT_ICONS = { Vocabulario: "📚", Frases: "💬", Gramática: "🔤", Verbos: "🔁" };

// ─── SPEECH ───────────────────────────────────────────────────────────────
function speakGerman(text, onStart, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "de-DE";
  utter.rate = 0.82;
  utter.pitch = 1.0;

  // Try to find a German voice
  const voices = window.speechSynthesis.getVoices();
  const deVoice = voices.find(v => v.lang.startsWith("de")) || null;
  if (deVoice) utter.voice = deVoice;

  utter.onstart = () => onStart && onStart();
  utter.onend = () => onEnd && onEnd();
  utter.onerror = () => onEnd && onEnd();
  window.speechSynthesis.speak(utter);
}

// ─── PRONUNCIATION ANALYSIS ──────────────────────────────────────────────
function normalizeDe(str) {
  return str
    .toLowerCase()
    .replace(/[!?.,;:¡¿]/g, "")
    .replace(/ß/g, "ss")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .trim();
}

function scorePronunciation(expected, heard) {
  const exp = normalizeDe(expected);
  const got = normalizeDe(heard);
  if (exp === got) return { score: 100, label: "¡Perfecto!", color: "#3ecf8e", emoji: "🏆" };

  // Token overlap score
  const expWords = exp.split(" ");
  const gotWords = got.split(" ");
  let matched = 0;
  expWords.forEach(w => { if (gotWords.includes(w)) matched++; });
  const overlap = matched / expWords.length;

  // Character similarity (simple)
  let charScore = 0;
  const minLen = Math.min(exp.length, got.length);
  for (let i = 0; i < minLen; i++) { if (exp[i] === got[i]) charScore++; }
  const charSim = charScore / Math.max(exp.length, got.length);

  const final = Math.round((overlap * 0.6 + charSim * 0.4) * 100);

  if (final >= 85) return { score: final, label: "¡Muy bien!", color: "#3ecf8e", emoji: "✅" };
  if (final >= 65) return { score: final, label: "Casi, sigue practicando", color: "#f5a623", emoji: "👍" };
  if (final >= 40) return { score: final, label: "Sigue intentando", color: "#ff6b00", emoji: "💪" };
  return { score: final, label: "Inténtalo de nuevo", color: "#e74c3c", emoji: "🔄" };
}

function useSpeechRecognition() {
  const recogRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const r = new SR();
    r.lang = "de-DE";
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 3;
    r.onresult = (e) => {
      const best = e.results[0][0].transcript;
      setTranscript(best);
      setListening(false);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recogRef.current = r;
  }, []);

  function start() {
    if (!recogRef.current) return;
    setTranscript("");
    setListening(true);
    try { recogRef.current.start(); } catch(e) { setListening(false); }
  }

  function stop() {
    recogRef.current?.stop();
    setListening(false);
  }

  return { listening, transcript, supported, start, stop };
}

// ─── PRONUNCIATION PANEL COMPONENT ───────────────────────────────────────
function PronunciationPanel({ card, lc, onSpeak, speaking }) {
  const { listening, transcript, supported, start, stop } = useSpeechRecognition();
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setResult(null);
    setAttempts(0);
  }, [card?.front]);

  useEffect(() => {
    if (transcript && card) {
      const r = scorePronunciation(card.front, transcript);
      setResult({ ...r, heard: transcript });
      setAttempts(a => a + 1);
    }
  }, [transcript]);

  if (!supported) return (
    <div style={{ width: "100%", maxWidth: 380, background: "#111", borderRadius: 16, padding: "14px 18px", border: "1px solid #1e1e1e", fontSize: 12, color: "#555", textAlign: "center" }}>
      🎤 Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.
    </div>
  );

  return (
    <div style={{ width: "100%", maxWidth: 380, background: "#0e0e0e", borderRadius: 18, border: "1px solid #1a1a1a", overflow: "hidden", marginBottom: 12 }}>
      {/* Header */}
      <div style={{ padding: "12px 18px 10px", borderBottom: "1px solid #141414", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "#444", letterSpacing: 2, textTransform: "uppercase" }}>🎤 Practica tu pronunciación</div>
        {attempts > 0 && <div style={{ fontSize: 10, color: "#333" }}>{attempts} intento{attempts > 1 ? "s" : ""}</div>}
      </div>

      <div style={{ padding: "16px 18px" }}>
        {/* Step 1: Listen */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#555", flexShrink: 0 }}>1</div>
          <div style={{ flex: 1, fontSize: 12, color: "#555" }}>Escucha cómo se pronuncia</div>
          <button onClick={(e) => { e.stopPropagation(); onSpeak(); }} style={{
            background: speaking ? lc.dim : "#141414",
            border: `1px solid ${speaking ? lc.accent : "#2a2a2a"}`,
            borderRadius: 20, padding: "6px 14px",
            display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          }}>
            <span style={{ fontSize: 14, animation: speaking ? "speakPulse 0.6s ease infinite alternate" : "none" }}>🔊</span>
            <span style={{ fontSize: 11, color: speaking ? lc.accent : "#666", fontFamily: "inherit" }}>
              {speaking ? "..." : "Escuchar"}
            </span>
          </button>
        </div>

        {/* Step 2: Repeat */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#555", flexShrink: 0 }}>2</div>
          <div style={{ flex: 1, fontSize: 12, color: "#555" }}>Ahora repite en voz alta</div>
          <button
            onClick={(e) => { e.stopPropagation(); listening ? stop() : start(); }}
            style={{
              background: listening ? "#e74c3c20" : "#141414",
              border: `1px solid ${listening ? "#e74c3c" : "#2a2a2a"}`,
              borderRadius: 20, padding: "6px 14px",
              display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <span style={{
              fontSize: 14,
              display: "inline-block",
              transform: listening && pulse ? "scale(1.3)" : "scale(1)",
              transition: "transform 0.3s",
            }}>🎙️</span>
            <span style={{ fontSize: 11, color: listening ? "#e74c3c" : "#666", fontFamily: "inherit" }}>
              {listening ? "Escuchando..." : "Hablar"}
            </span>
          </button>
        </div>

        {/* Waveform animation while listening */}
        {listening && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginBottom: 14, height: 24 }}>
            {[...Array(12)].map((_, i) => (
              <div key={i} style={{
                width: 3, borderRadius: 2,
                background: "#e74c3c",
                height: `${8 + Math.sin((Date.now() / 200) + i) * 8}px`,
                animation: `wave 0.${5 + (i % 4)}s ease infinite alternate`,
                animationDelay: `${i * 0.05}s`,
              }} />
            ))}
          </div>
        )}

        {/* Result */}
        {result && !listening && (
          <div style={{ background: "#141414", borderRadius: 14, padding: "14px", border: `1px solid ${result.color}22` }}>
            {/* Score bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 20 }}>{result.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: result.color }}>{result.score}%</div>
            </div>
            <div style={{ height: 4, background: "#1e1e1e", borderRadius: 2, marginBottom: 10 }}>
              <div style={{ height: "100%", borderRadius: 2, background: result.color, width: `${result.score}%`, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ fontSize: 13, color: result.color, fontWeight: 600, marginBottom: 8 }}>{result.label}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <div>
                <div style={{ color: "#444", marginBottom: 2 }}>Correcto</div>
                <div style={{ color: "#888" }}>"{card.front}"</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#444", marginBottom: 2 }}>Escuché</div>
                <div style={{ color: result.score >= 85 ? lc.accent : "#888" }}>"{result.heard}"</div>
              </div>
            </div>
            {result.score < 85 && (
              <button onClick={(e) => { e.stopPropagation(); start(); }} style={{
                marginTop: 10, width: "100%", padding: "8px", borderRadius: 10,
                background: "transparent", border: "1px solid #2a2a2a",
                color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>
                🔄 Intentar de nuevo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
async function generateCards(level, category, existingFronts = []) {
  const avoidList = existingFronts.slice(-20).join(", ");
  const prompt = `Genera exactamente 8 tarjetas de alemán para estudiantes hispanohablantes.
Nivel: ${level} (${level === "A1" ? "principiante absoluto" : "básico"})
Categoría: ${category}
${avoidList ? `Evita estas palabras/frases ya usadas: ${avoidList}` : ""}

Responde SOLO con JSON válido, sin texto extra, sin backticks:
{"cards":[{"front":"palabra o frase en alemán","back":"traducción al español","phonetic":"pronunciación fonética","tip":"consejo corto de gramática o uso"}]}

Reglas:
- front: alemán (incluye artículo der/die/das si es sustantivo)
- back: español claro y natural
- phonetic: pronunciación en mayúsculas silábicas
- tip: máximo 8 palabras, útil para hispanohablantes
- Varía entre común/cotidiano y útil para la vida real
- Para Verbos: usa conjugación en primera persona presente`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.content?.map(b => b.text || "").join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return parsed.cards || [];
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────
export default function DeutschAI() {
  const [level, setLevel] = useState("A1");
  const [category, setCategory] = useState("Vocabulario");
  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [known, setKnown] = useState(new Set());
  const [unknown, setUnknown] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [animDir, setAnimDir] = useState(null);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showPronunciation, setShowPronunciation] = useState(false);
  const generatingRef = useRef(false);

  // Preload voices
  useEffect(() => {
    window.speechSynthesis?.getVoices();
  }, []);

  const deckKey = `${level}-${category}`;

  // Load seed cards when level/category changes + auto-generate immediately
  useEffect(() => {
    const seeds = SEED_CARDS[deckKey] || [];
    setDeck(seeds);
    setIndex(0);
    setFlipped(false);
    setShowTip(false);
    setKnown(new Set());
    setUnknown(new Set());
    generatingRef.current = false;
    // Auto-generate right away so there are always enough cards
    setTimeout(() => loadMoreCards(), 100);
  }, [deckKey]);

  // Pulse animation
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 900);
    return () => clearInterval(t);
  }, []);

  // Auto-generate more cards when near the end (trigger earlier)
  useEffect(() => {
    if (deck.length > 0 && index >= deck.length - 5 && !generatingRef.current) {
      loadMoreCards();
    }
  }, [index, deck.length]);

  async function loadMoreCards() {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    try {
      const existingFronts = deck.map(c => c.front);
      const newCards = await generateCards(level, category, existingFronts);
      setDeck(prev => [...prev, ...newCards]);
      setTotalGenerated(t => t + newCards.length);
    } catch (e) {
      console.error("Error generating cards:", e);
    } finally {
      setGenerating(false);
      generatingRef.current = false;
    }
  }

  const card = deck[index];
  const progress = deck.length > 0 ? ((known.size) / Math.max(deck.length, 1)) * 100 : 0;
  const lc = LEVEL_COLORS[level];

  function go(dir) {
    setAnimDir(dir);
    setTimeout(() => {
      if (dir === "next") setIndex(i => Math.min(i + 1, deck.length - 1));
      else setIndex(i => Math.max(i - 1, 0));
      setFlipped(false);
      setShowTip(false);
      setAnimDir(null);
    }, 180);
  }

  function markKnown() {
    if (!card) return;
    setKnown(s => new Set([...s, index]));
    setUnknown(s => { const n = new Set(s); n.delete(index); return n; });
    go("next");
  }

  function markUnknown() {
    if (!card) return;
    setUnknown(s => new Set([...s, index]));
    setKnown(s => { const n = new Set(s); n.delete(index); return n; });
    go("next");
  }

  function handleSpeak(e) {
    e.stopPropagation();
    if (!card) return;
    speakGerman(card.front, () => setSpeaking(true), () => setSpeaking(false));
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080810",
      fontFamily: "'Georgia', serif",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 16px 40px",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#444", textTransform: "uppercase", marginBottom: 4 }}>
          powered by IA · Tarjetas infinitas
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>
          Deutsch <span style={{ color: lc.accent }}>∞</span>
        </div>
        <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>
          {totalGenerated > 0 && `✦ ${deck.length} tarjetas generadas`}
        </div>
      </div>

      {/* Level tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {LEVELS.map(l => (
          <button key={l} onClick={() => setLevel(l)} style={{
            padding: "8px 24px", borderRadius: 24,
            background: level === l ? lc.accent : "transparent",
            border: `1px solid ${level === l ? lc.accent : "#222"}`,
            color: level === l ? "#000" : "#555",
            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.2s",
          }}>
            {l} <span style={{ fontSize: 10, opacity: 0.7 }}>{LEVEL_COLORS[l].label}</span>
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", justifyContent: "center" }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            padding: "6px 14px", borderRadius: 20,
            background: category === c ? lc.dim : "transparent",
            border: `1px solid ${category === c ? lc.accent : "#1e1e1e"}`,
            color: category === c ? lc.accent : "#444",
            fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.2s",
          }}>
            {CAT_ICONS[c]} {c}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div style={{ width: "100%", maxWidth: 380, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11, color: "#333" }}>
          <span>{card ? `${index + 1} / ${deck.length}` : "—"}</span>
          <span style={{ color: lc.accent }}>✓ {known.size} aprendidas</span>
        </div>
        <div style={{ height: 2, background: "#111", borderRadius: 2 }}>
          <div style={{ height: "100%", borderRadius: 2, background: lc.accent, width: `${progress}%`, transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* Card */}
      {!card ? (
        <div style={{ width: "100%", maxWidth: 380, minHeight: 200, borderRadius: 20, background: "#111", border: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 28 }}>🔄</div>
          <div style={{ fontSize: 13, color: "#444" }}>Cargando tarjetas...</div>
        </div>
      ) : (
        <div
          onClick={() => setFlipped(f => !f)}
          style={{
            width: "100%", maxWidth: 380, minHeight: 210,
            borderRadius: 20,
            background: flipped ? `linear-gradient(135deg, #0e0e18 0%, #111 100%)` : "#0e0e0e",
            border: `1px solid ${flipped ? lc.accent + "44" : "#1a1a1a"}`,
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "28px 28px 24px",
            boxShadow: flipped ? `0 0 40px ${lc.accent}18` : "0 8px 32px rgba(0,0,0,0.6)",
            position: "relative", userSelect: "none",
            transform: animDir ? `translateX(${animDir === "next" ? "40px" : "-40px"})` : "translateX(0)",
            opacity: animDir ? 0 : 1,
            transition: "transform 0.18s ease, opacity 0.18s ease, border-color 0.3s, box-shadow 0.3s",
            marginBottom: 12,
          }}
        >
          {/* Top labels */}
          <div style={{ position: "absolute", top: 14, left: 18, fontSize: 10, color: "#333", letterSpacing: 2, textTransform: "uppercase" }}>
            {CAT_ICONS[category]} {category}
          </div>
          <div style={{ position: "absolute", top: 14, right: 18, fontSize: 10, color: flipped ? lc.accent : "#2a2a2a" }}>
            {flipped ? "ES" : "DE"}
          </div>

          {!flipped ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, marginBottom: 14, lineHeight: 1.1 }}>
                {card.front}
              </div>
              {/* Speaker button */}
              <button
                onClick={handleSpeak}
                style={{
                  background: speaking ? lc.dim : "#141414",
                  border: `1px solid ${speaking ? lc.accent : "#2a2a2a"}`,
                  borderRadius: 24, padding: "7px 18px",
                  display: "inline-flex", alignItems: "center", gap: 7,
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 16, animation: speaking ? "speakPulse 0.6s ease infinite alternate" : "none" }}>
                  🔊
                </span>
                <span style={{ fontSize: 12, color: speaking ? lc.accent : "#555", fontStyle: "italic", fontFamily: "inherit" }}>
                  {speaking ? "reproduciendo..." : card.phonetic}
                </span>
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: lc.accent, marginBottom: 10, lineHeight: 1.2 }}>
                {card.back}
              </div>
              {/* Speaker button on back too */}
              <button
                onClick={handleSpeak}
                style={{
                  background: speaking ? lc.dim : "#141414",
                  border: `1px solid ${speaking ? lc.accent : "#1e1e1e"}`,
                  borderRadius: 20, padding: "5px 14px",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  cursor: "pointer", marginBottom: showTip ? 12 : 0, transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 14, animation: speaking ? "speakPulse 0.6s ease infinite alternate" : "none" }}>🔊</span>
                <span style={{ fontSize: 11, color: speaking ? lc.accent : "#444", fontStyle: "italic", fontFamily: "inherit" }}>
                  {speaking ? "reproduciendo..." : card.phonetic}
                </span>
              </button>
              {showTip && (
                <div style={{ fontSize: 12, background: "#141414", padding: "8px 14px", borderRadius: 10, color: "#888", border: "1px solid #222", marginTop: 8 }}>
                  💡 {card.tip}
                </div>
              )}
            </div>
          )}

          <div style={{ position: "absolute", bottom: 12, fontSize: 10, color: "#222" }}>
            toca para {flipped ? "ocultar" : "voltear"}
          </div>
        </div>
      )}

      {/* Tip button */}
      {flipped && card && (
        <button onClick={(e) => { e.stopPropagation(); setShowTip(s => !s); }} style={{
          background: "transparent", border: "1px solid #1e1e1e", color: "#444",
          padding: "5px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer",
          marginBottom: 10, fontFamily: "inherit",
        }}>
          {showTip ? "Ocultar consejo" : "💡 Ver consejo"}
        </button>
      )}

      {/* Pronunciation toggle */}
      {card && (
        <button onClick={() => setShowPronunciation(s => !s)} style={{
          background: showPronunciation ? lc.dim : "transparent",
          border: `1px solid ${showPronunciation ? lc.accent : "#1e1e1e"}`,
          color: showPronunciation ? lc.accent : "#444",
          padding: "6px 16px", borderRadius: 20, fontSize: 11,
          cursor: "pointer", marginBottom: 14, fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
        }}>
          🎤 {showPronunciation ? "Cerrar pronunciación" : "Practicar pronunciación"}
        </button>
      )}

      {/* Pronunciation panel */}
      {showPronunciation && card && (
        <PronunciationPanel
          card={card}
          lc={lc}
          onSpeak={() => speakGerman(card.front, () => setSpeaking(true), () => setSpeaking(false))}
          speaking={speaking}
        />
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <button onClick={() => go("prev")} disabled={index === 0} style={{
          width: 44, height: 44, borderRadius: "50%", background: "#111",
          border: "1px solid #1e1e1e", color: index === 0 ? "#222" : "#888",
          fontSize: 16, cursor: index === 0 ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>←</button>

        <button onClick={markUnknown} style={{
          padding: "11px 20px", borderRadius: 22, background: "transparent",
          border: "1px solid #e74c3c44", color: "#e74c3c", fontSize: 13,
          cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
        }}>✗ Repasar</button>

        <button onClick={markKnown} style={{
          padding: "11px 20px", borderRadius: 22,
          background: lc.dim,
          border: `1px solid ${lc.accent}`, color: lc.accent, fontSize: 13,
          cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
        }}>✓ Lo sé</button>

        <button onClick={() => go("next")} disabled={index >= deck.length - 1 && !generating} style={{
          width: 44, height: 44, borderRadius: "50%", background: "#111",
          border: "1px solid #1e1e1e", color: "#888",
          fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>→</button>
      </div>

      {/* AI generating indicator */}
      {generating && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 12, color: lc.accent }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: lc.accent, opacity: pulse ? 1 : 0.3, transition: "opacity 0.4s" }} />
          IA generando más tarjetas...
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "flex", gap: 28, fontSize: 12 }}>
        {[
          [known.size, "Aprendidas", lc.accent],
          [unknown.size, "Repasar", "#e74c3c"],
          [deck.length, "En mazo", "#333"],
        ].map(([val, label, color]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
            <div style={{ color: "#333", fontSize: 11 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Reload batch */}
      <button onClick={loadMoreCards} disabled={generating} style={{
        marginTop: 20, background: "transparent", border: "1px solid #1a1a1a",
        color: generating ? "#222" : "#333", padding: "8px 20px", borderRadius: 20,
        fontSize: 11, cursor: generating ? "not-allowed" : "pointer", fontFamily: "inherit",
        letterSpacing: 1,
      }}>
        {generating ? "Generando..." : "⟳ Generar más tarjetas"}
      </button>

      <div style={{ marginTop: 24, fontSize: 10, color: "#1e1e1e", letterSpacing: 3, textTransform: "uppercase" }}>
        Deutsch Lernen · IA · {level} · {category}
      </div>

      <style>{`
        @keyframes speakPulse {
          from { transform: scale(1); opacity: 0.7; }
          to   { transform: scale(1.3); opacity: 1; }
        }
        @keyframes wave {
          from { height: 4px; }
          to   { height: 20px; }
        }
      `}</style>
    </div>
  );
}
