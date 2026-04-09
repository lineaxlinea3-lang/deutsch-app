import { useState, useEffect, useRef } from "react";

// ─── SEED CARDS (mostradas mientras la IA genera) ──────────────────────────
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

const LEVELS = ["A1", "A2"];
const CATEGORIES = ["Vocabulario", "Frases", "Gramática", "Verbos"];
const CAT_ICONS = { Vocabulario: "📚", Frases: "💬", Gramática: "🔤", Verbos: "🔁" };
const THEME = {
  A1: { accent: "#1db954", glow: "rgba(29,185,84,0.3)", glass: "rgba(29,185,84,0.08)", border: "rgba(29,185,84,0.22)", label: "Principiante" },
  A2: { accent: "#1e90ff", glow: "rgba(30,144,255,0.3)", glass: "rgba(30,144,255,0.08)", border: "rgba(30,144,255,0.22)", label: "Básico" },
};

// ─── API CALL → /api/generate (Serverless en Vercel) ──────────────────────
async function generateCards(level, category, existingFronts = []) {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, category, language: "alemán", existingFronts }),
    });
    if (!res.ok) {
      console.error("API error:", res.status);
      return [];
    }
    const data = await res.json();
    return data.cards || [];
  } catch (e) {
    console.error("Error llamando /api/generate:", e);
    return [];
  }
}

// ─── SPEECH ────────────────────────────────────────────────────────────────
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

// ─── PRONUNCIATION ─────────────────────────────────────────────────────────
function normalizeDe(str) {
  return str.toLowerCase()
    .replace(/[!?.,;:¡¿]/g, "")
    .replace(/ß/g, "ss").replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u")
    .trim();
}
function scorePronunciation(expected, heard) {
  const exp = normalizeDe(expected), got = normalizeDe(heard);
  if (exp === got) return { score: 100, label: "¡Perfecto!", color: "#1db954", emoji: "🏆" };
  const expW = exp.split(" "), gotW = got.split(" ");
  let matched = 0;
  expW.forEach(w => { if (gotW.includes(w)) matched++; });
  let charScore = 0;
  const minLen = Math.min(exp.length, got.length);
  for (let i = 0; i < minLen; i++) { if (exp[i] === got[i]) charScore++; }
  const final = Math.round((matched / expW.length * 0.6 + charScore / Math.max(exp.length, got.length) * 0.4) * 100);
  if (final >= 85) return { score: final, label: "¡Muy bien!", color: "#1db954", emoji: "✅" };
  if (final >= 65) return { score: final, label: "Casi, sigue practicando", color: "#f5a623", emoji: "👍" };
  if (final >= 40) return { score: final, label: "Sigue intentando", color: "#ff6b00", emoji: "💪" };
  return { score: final, label: "Inténtalo de nuevo", color: "#e74c3c", emoji: "🔄" };
}
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

function PronunciationPanel({ card, theme, onSpeak, speaking }) {
  const { listening, transcript, supported, start, stop } = useSpeechRecognition();
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(0);
  useEffect(() => { setResult(null); setAttempts(0); }, [card?.front]);
  useEffect(() => {
    if (transcript && card) { setResult({ ...scorePronunciation(card.front, transcript), heard: transcript }); setAttempts(a => a + 1); }
  }, [transcript]);

  if (!supported) return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.border}`, borderRadius: 16, padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: 12, width: "100%", maxWidth: 420 }}>
      🎤 Usa Chrome para reconocimiento de voz
    </div>
  );

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`, borderRadius: 20, overflow: "hidden", marginBottom: 14, width: "100%", maxWidth: 420, animation: "slideUp 0.3s ease" }}>
      <div style={{ padding: "10px 16px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase" }}>🎤 Pronunciación</span>
        {attempts > 0 && <span style={{ fontSize: 10, color: theme.accent }}>{attempts} intento{attempts > 1 ? "s" : ""}</span>}
      </div>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: theme.glass, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: theme.accent, flexShrink: 0 }}>1</div>
          <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Escucha la pronunciación</span>
          <button onClick={(e) => { e.stopPropagation(); onSpeak(); }} style={{ background: speaking ? theme.glass : "rgba(255,255,255,0.04)", border: `1px solid ${speaking ? theme.accent : "rgba(255,255,255,0.1)"}`, borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "all 0.2s" }}>
            <span style={{ fontSize: 14, animation: speaking ? "speakPulse 0.6s ease infinite alternate" : "none" }}>🔊</span>
            <span style={{ fontSize: 11, color: speaking ? theme.accent : "rgba(255,255,255,0.35)" }}>{speaking ? "..." : "Escuchar"}</span>
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: theme.glass, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: theme.accent, flexShrink: 0 }}>2</div>
          <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Repite en voz alta</span>
          <button onClick={(e) => { e.stopPropagation(); listening ? stop() : start(); }} style={{ background: listening ? "rgba(231,76,60,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${listening ? "#e74c3c" : "rgba(255,255,255,0.1)"}`, borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "all 0.2s" }}>
            <span style={{ fontSize: 14, animation: listening ? "speakPulse 0.5s ease infinite alternate" : "none" }}>🎙️</span>
            <span style={{ fontSize: 11, color: listening ? "#e74c3c" : "rgba(255,255,255,0.35)" }}>{listening ? "Escuchando..." : "Hablar"}</span>
          </button>
        </div>
        {listening && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 26, marginTop: 10 }}>
            {[...Array(14)].map((_, i) => <div key={i} style={{ width: 3, borderRadius: 2, background: "#e74c3c", animation: `wave 0.${4 + (i % 5)}s ease infinite alternate`, animationDelay: `${i * 0.06}s` }} />)}
          </div>
        )}
        {result && !listening && (
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 14, padding: "12px", border: `1px solid ${result.color}25`, marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{result.emoji}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: result.color }}>{result.score}%</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginBottom: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: result.color, width: `${result.score}%`, transition: "width 1s ease" }} />
            </div>
            <div style={{ fontSize: 13, color: result.color, fontWeight: 600, marginBottom: 8 }}>{result.label}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <div><div style={{ color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>Correcto</div><div style={{ color: "rgba(255,255,255,0.6)" }}>"{card.front}"</div></div>
              <div style={{ textAlign: "right" }}><div style={{ color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>Escuché</div><div style={{ color: result.score >= 85 ? theme.accent : "rgba(255,255,255,0.4)" }}>"{result.heard}"</div></div>
            </div>
            {result.score < 85 && <button onClick={(e) => { e.stopPropagation(); start(); }} style={{ marginTop: 10, width: "100%", padding: "8px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>🔄 Intentar de nuevo</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function DeutschAI() {
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
  const generatingRef = useRef(false);

  const deckKey = `${level}-${category}`;
  const theme = THEME[level];
  const card = deck[index] || null;
  const progress = deck.length > 0 ? (known.size / deck.length) * 100 : 0;

  useEffect(() => { window.speechSynthesis?.getVoices(); }, []);

  useEffect(() => {
    setDeck(SEED_CARDS[deckKey] || []);
    setIndex(0); setFlipped(false); setShowTip(false);
    setKnown(new Set()); setUnknown(new Set());
    setShowPronunciation(false);
    generatingRef.current = false;
  }, [deckKey]);

  // Auto-generate when deck is small or near end
  useEffect(() => {
    const tooFew = deck.length < 8;
    const nearEnd = deck.length > 0 && index >= deck.length - 4;
    if ((tooFew || nearEnd) && !generatingRef.current) loadMore();
  }, [deck.length, index]);

  async function loadMore() {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    try {
      const newCards = await generateCards(level, category, deck.map(c => c.front));
      if (newCards.length > 0) setDeck(prev => [...prev, ...newCards]);
    } catch (e) { console.error(e); }
    finally { setGenerating(false); generatingRef.current = false; }
  }

  function go(dir) {
    setAnimDir(dir);
    setTimeout(() => {
      if (dir === "next") setIndex(i => Math.min(i + 1, deck.length - 1));
      else setIndex(i => Math.max(i - 1, 0));
      setFlipped(false); setShowTip(false); setAnimDir(null);
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

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg,#080810 0%,#0d0d1a 50%,#080f0b 100%)", color: "#fff", fontFamily: "system-ui,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 16px 52px", position: "relative", overflow: "hidden" }}>

      {/* Background orbs */}
      <div style={{ position: "fixed", left: "10%", top: "15%", width: 300, height: 300, borderRadius: "50%", background: theme.glow, filter: "blur(80px)", pointerEvents: "none", animation: "orbFloat 7s ease-in-out infinite alternate", opacity: 0.5 }} />
      <div style={{ position: "fixed", right: "5%", top: "55%", width: 220, height: 220, borderRadius: "50%", background: level === "A1" ? "rgba(29,185,84,0.1)" : "rgba(30,144,255,0.1)", filter: "blur(70px)", pointerEvents: "none", animation: "orbFloat 9s ease-in-out infinite alternate-reverse", opacity: 0.5 }} />
      <div style={{ position: "fixed", left: "40%", bottom: "10%", width: 180, height: 180, borderRadius: "50%", background: "rgba(120,40,200,0.08)", filter: "blur(60px)", pointerEvents: "none", animation: "orbFloat 11s ease-in-out infinite alternate" }} />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20, animation: "fadeDown 0.5s ease" }}>
        <div style={{ fontSize: 10, letterSpacing: 5, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 6 }}>Aprende Alemán · IA</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, background: `linear-gradient(135deg,#fff 30%,${theme.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Deutsch ∞
        </div>
        <div style={{ fontSize: 11, color: theme.accent, marginTop: 4, opacity: 0.7 }}>
          {deck.length} tarjetas · {CAT_ICONS[category]} {category}
        </div>
      </div>

      {/* Level + Category bubble menu */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "flex-start", justifyContent: "center", animation: "fadeDown 0.5s ease 0.1s both" }}>
        {LEVELS.map(l => {
          const t = THEME[l];
          const isOpen = openLevel === l;
          const isActive = level === l;
          return (
            <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {isOpen && (
                <div style={{ display: "flex", gap: 6, padding: "10px 14px", background: "rgba(255,255,255,0.92)", borderRadius: 40, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", animation: "popUp 0.25s cubic-bezier(.17,.67,.25,1.3)", position: "relative" }}>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => { setLevel(l); setCategory(c); setOpenLevel(null); }} title={c} style={{ width: 52, height: 52, borderRadius: "50%", background: level === l && category === c ? t.accent : "rgba(0,0,0,0.07)", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, transition: "all 0.2s", transform: level === l && category === c ? "scale(1.1)" : "scale(1)" }}>
                      <span style={{ fontSize: 20 }}>{CAT_ICONS[c]}</span>
                      <span style={{ fontSize: 7, fontWeight: 700, color: level === l && category === c ? "#fff" : "#555", letterSpacing: 0.3, textTransform: "uppercase" }}>{c.slice(0, 4)}</span>
                    </button>
                  ))}
                  <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "9px solid rgba(255,255,255,0.92)" }} />
                </div>
              )}
              <button onClick={() => setOpenLevel(isOpen ? null : l)} style={{ padding: "10px 22px", borderRadius: 30, background: isActive ? `linear-gradient(135deg,${t.accent}25,${t.accent}0a)` : "rgba(255,255,255,0.04)", border: `2px solid ${isActive ? t.accent : "rgba(255,255,255,0.1)"}`, color: isActive ? t.accent : "rgba(255,255,255,0.35)", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: isActive ? `0 0 22px ${t.glow}` : "none", transition: "all 0.3s ease", transform: isOpen ? "scale(1.08)" : "scale(1)", backdropFilter: "blur(12px)" }}>
                {l}
                <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 5, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>{t.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 420, marginBottom: 16 }}>
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
        <div style={{ width: "100%", maxWidth: 420, minHeight: 300, borderRadius: 28, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 28, animation: "spin 1s linear infinite" }}>⟳</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Cargando...</div>
        </div>
      ) : (
        <div onClick={() => setFlipped(f => !f)} style={{
          width: "100%", maxWidth: 420, minHeight: 300, borderRadius: 32,
          background: flipped ? "linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))" : "linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))",
          backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
          border: `1px solid ${flipped ? theme.accent + "55" : "rgba(255,255,255,0.1)"}`,
          cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "40px 32px 32px",
          boxShadow: flipped ? `0 8px 48px ${theme.glow},inset 0 1px 0 rgba(255,255,255,0.1)` : "0 8px 32px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.06)",
          position: "relative", userSelect: "none",
          transform: animDir === "next" ? "translateX(60px) scale(0.94)" : animDir === "prev" ? "translateX(-60px) scale(0.94)" : "translateX(0) scale(1)",
          opacity: animDir ? 0 : 1,
          transition: "transform 0.18s ease,opacity 0.18s ease,border-color 0.4s,box-shadow 0.4s",
          marginBottom: 14,
        }}>
          <div style={{ position: "absolute", top: 16, left: 20, fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: 2, textTransform: "uppercase" }}>{CAT_ICONS[category]} {category}</div>
          <div style={{ position: "absolute", top: 16, right: 20, fontSize: 10, fontWeight: 700, color: flipped ? theme.accent : "rgba(255,255,255,0.15)", transition: "color 0.3s" }}>{flipped ? "ES" : "DE"}</div>

          {!flipped ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1.5, marginBottom: 18, lineHeight: 1.1, textShadow: `0 0 40px ${theme.glow}` }}>{card.front}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <button onClick={(e) => { e.stopPropagation(); speakGerman(card.front, () => setSpeaking(true), () => setSpeaking(false)); }} style={{ width: 44, height: 44, borderRadius: "50%", background: speaking ? theme.glass : "rgba(255,255,255,0.06)", border: `2px solid ${speaking ? theme.accent : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: speaking ? `0 0 20px ${theme.glow}` : "none", transition: "all 0.25s" }}>
                  <span style={{ fontSize: 20, animation: speaking ? "speakPulse 0.6s ease infinite alternate" : "none" }}>🔊</span>
                </button>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>{card.phonetic}</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: theme.accent, marginBottom: 14, lineHeight: 1.2, textShadow: `0 0 30px ${theme.glow}` }}>{card.back}</div>
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
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {flipped && card && (
          <button onClick={() => setShowTip(s => !s)} style={{ background: showTip ? theme.glass : "transparent", border: `1px solid ${showTip ? theme.accent : "rgba(255,255,255,0.08)"}`, color: showTip ? theme.accent : "rgba(255,255,255,0.28)", padding: "6px 16px", borderRadius: 20, fontSize: 11, cursor: "pointer", transition: "all 0.2s" }}>
            {showTip ? "Ocultar consejo" : "💡 Ver consejo"}
          </button>
        )}
        {card && (
          <button onClick={() => setShowPronunciation(s => !s)} style={{ width: 44, height: 44, borderRadius: "50%", background: showPronunciation ? theme.glass : "rgba(255,255,255,0.05)", border: `2px solid ${showPronunciation ? theme.accent : "rgba(255,255,255,0.1)"}`, color: showPronunciation ? theme.accent : "rgba(255,255,255,0.4)", fontSize: showPronunciation ? 14 : 20, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: showPronunciation ? `0 0 16px ${theme.glow}` : "none", transition: "all 0.2s" }}>
            {showPronunciation ? "✕" : "🎤"}
          </button>
        )}
      </div>

      {showPronunciation && card && (
        <PronunciationPanel card={card} theme={theme} onSpeak={() => speakGerman(card.front, () => setSpeaking(true), () => setSpeaking(false))} speaking={speaking} />
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, alignItems: "center" }}>
        <button onClick={() => go("prev")} disabled={index === 0} style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", color: index === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.6)", fontSize: 20, cursor: index === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)", transition: "all 0.2s", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>←</button>
        <button onClick={markUnknown} style={{ padding: "12px 22px", borderRadius: 26, background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.28)", color: "#e74c3c", fontSize: 13, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(10px)", transition: "all 0.2s" }}>✗ Repasar</button>
        <button onClick={markKnown} style={{ padding: "12px 22px", borderRadius: 26, background: theme.glass, border: `1px solid ${theme.border}`, color: theme.accent, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 0 18px ${theme.glow}`, backdropFilter: "blur(10px)", transition: "all 0.2s" }}>✓ Lo sé</button>
        <button onClick={() => go("next")} style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)", transition: "all 0.2s", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>→</button>
      </div>

      {/* Generating indicator */}
      {generating && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 12, color: theme.accent }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: theme.accent, animation: "speakPulse 0.7s ease infinite alternate" }} />
          Generando más tarjetas...
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
        {[[known.size, "Aprendidas", theme.accent], [unknown.size, "Repasar", "#e74c3c"], [deck.length, "Total", "rgba(255,255,255,0.2)"]].map(([val, label, color]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color, textShadow: color === theme.accent ? `0 0 12px ${theme.glow}` : "none" }}>{val}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{label}</div>
          </div>
        ))}
      </div>

      <button onClick={loadMore} disabled={generating} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: generating ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.25)", padding: "8px 22px", borderRadius: 22, fontSize: 11, cursor: generating ? "not-allowed" : "pointer", backdropFilter: "blur(10px)", transition: "all 0.2s" }}>
        {generating ? "Generando..." : "⟳ Generar más tarjetas"}
      </button>

      <div style={{ marginTop: 20, fontSize: 10, color: "rgba(255,255,255,0.06)", letterSpacing: 4, textTransform: "uppercase" }}>
        Deutsch Lernen · IA · {level} · {category}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes speakPulse { from{transform:scale(1);opacity:0.6} to{transform:scale(1.4);opacity:1} }
        @keyframes wave { from{height:3px} to{height:22px} }
        @keyframes orbFloat { from{transform:translate(-50%,-50%) scale(1)} to{transform:translate(-50%,-50%) scale(1.15) translateY(-16px)} }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popUp { from{opacity:0;transform:scale(0.8) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        button:active { transform:scale(0.95) !important; }
      `}</style>
    </div>
  );
}
