
import { useState, useEffect, useRef } from "react";
// ─── SEED CARDS ────────────────────────────────────────────────────────────
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
    { front: "ich komme", back: "yo vengo", phonetic: "ikh KO-me", tip: "kommen = venir" },
    { front: "ich esse", back: "yo como", phonetic: "ikh E-se", tip: "essen = comer" },
    { front: "ich trinke", back: "yo bebo", phonetic: "ikh TRIN-ke", tip: "trinken = beber" },
    { front: "ich schlafe", back: "yo duermo", phonetic: "ikh SHLA-fe", tip: "schlafen = dormir" },
    { front: "ich arbeite", back: "yo trabajo", phonetic: "ikh AR-bai-te", tip: "arbeiten = trabajar" },
    { front: "ich lerne", back: "yo aprendo", phonetic: "ikh LER-ne", tip: "lernen = aprender" },
    { front: "ich spreche", back: "yo hablo", phonetic: "ikh SHPRE-khe", tip: "sprechen = hablar" },
    { front: "ich kaufe", back: "yo compro", phonetic: "ikh KAU-fe", tip: "kaufen = comprar" },
    { front: "ich lese", back: "yo leo", phonetic: "ikh LAY-ze", tip: "lesen = leer" },
    { front: "ich schreibe", back: "yo escribo", phonetic: "ikh SHRAI-be", tip: "schreiben = escribir" },
    { front: "ich höre", back: "yo escucho", phonetic: "ikh HÖ-re", tip: "hören = escuchar" },
    { front: "ich sehe", back: "yo veo", phonetic: "ikh ZAY-e", tip: "sehen = ver" },
    { front: "ich wohne", back: "yo vivo (en un lugar)", phonetic: "ikh VO-ne", tip: "wohnen = vivir" },
    { front: "ich fahre", back: "yo conduzco / viajo", phonetic: "ikh FA-re", tip: "fahren = conducir" },
    { front: "ich spiele", back: "yo juego", phonetic: "ikh SHPEE-le", tip: "spielen = jugar" },
    { front: "ich öffne", back: "yo abro", phonetic: "ikh ÖF-ne", tip: "öffnen = abrir" },
    { front: "ich frage", back: "yo pregunto", phonetic: "ikh FRA-ge", tip: "fragen = preguntar" },
  ],
  "A2-Vocabulario": [
    { front: "die Arbeit", back: "el trabajo", phonetic: "dee AR-bait", tip: "arbeiten = trabajar" },
    { front: "die Zeit", back: "el tiempo / la hora", phonetic: "dee TSAIT", tip: "doble significado" },
    { front: "das Geld", back: "el dinero", phonetic: "das GELT", tip: "muy útil 😄" },
    { front: "die Wohnung", back: "el apartamento", phonetic: "dee VO-nung", tip: "wohnen = vivir" },
    { front: "das Leben", back: "la vida", phonetic: "das LAY-ben", tip: "leben = vivir (verbo)" },
  ],
  "A2-Gramática": [
    { front: "weil + Verb am Ende", back: "porque (verbo al final)", phonetic: "VAIL", tip: "weil ich müde bin" },
    { front: "Perfekt: ich habe gemacht", back: "Pasado: yo hice", phonetic: "ikh HA-be ge-MAKHT", tip: "ge- + participio" },
    { front: "der / den / dem", back: "el (nominativo/acusativo/dativo)", phonetic: "dair / den / dem", tip: "casos del artículo" },
    { front: "wenn + Verb am Ende", back: "cuando / si (verbo al final)", phonetic: "VEN", tip: "wenn ich Zeit habe" },
  ],
  "A2-Frases": [
    { front: "Könnten Sie mir helfen?", back: "¿Podría usted ayudarme?", phonetic: "KÖN-ten zee meer HEL-fen", tip: "muy formal y educado" },
    { front: "Wie viel kostet das?", back: "¿Cuánto cuesta esto?", phonetic: "vee FEEL KOS-tet das", tip: "esencial de compras" },
    { front: "Ich hätte gern...", back: "Quisiera... (educado)", phonetic: "ikh HE-te gairn", tip: "para pedir en restaurante" },
    { front: "Das macht nichts.", back: "No importa / No pasa nada.", phonetic: "das MAKHT nikhts", tip: "muy cotidiano" },
  ],
  "A2-Verbos": [
    { front: "ich werde", back: "yo voy a / seré", phonetic: "ikh VER-de", tip: "werden + Infinitiv = futuro" },
    { front: "ich kann", back: "yo puedo", phonetic: "ikh KAN", tip: "können = poder" },
    { front: "ich muss", back: "yo debo / tengo que", phonetic: "ikh MUS", tip: "müssen = deber" },
    { front: "ich will", back: "yo quiero", phonetic: "ikh VIL", tip: "wollen = querer" },
    { front: "ich darf", back: "yo tengo permiso", phonetic: "ikh DARF", tip: "dürfen = tener permiso" },
    { front: "ich soll", back: "yo debería", phonetic: "ikh ZOL", tip: "sollen = obligación" },
    { front: "ich habe gemacht", back: "yo hice", phonetic: "ikh HA-be ge-MAKHT", tip: "Perfekt con haben" },
    { front: "ich bin gegangen", back: "yo fui", phonetic: "ikh BIN ge-GAN-gen", tip: "movimiento usa sein" },
    { front: "ich verstehe", back: "yo entiendo", phonetic: "ikh fer-SHTAY-e", tip: "verstehen = entender" },
    { front: "ich erkläre", back: "yo explico", phonetic: "ikh er-KLAY-re", tip: "erklären = explicar" },
    { front: "ich brauche", back: "yo necesito", phonetic: "ikh BRAU-khe", tip: "brauchen = necesitar" },
    { front: "ich versuche", back: "yo intento", phonetic: "ikh fer-ZU-khe", tip: "versuchen = intentar" },
    { front: "ich denke", back: "yo pienso", phonetic: "ikh DEN-ke", tip: "denken = pensar" },
    { front: "ich weiß", back: "yo sé", phonetic: "ikh VAIS", tip: "wissen = saber hechos" },
    { front: "ich kenne", back: "yo conozco", phonetic: "ikh KE-ne", tip: "kennen = conocer personas" },
    { front: "ich helfe", back: "yo ayudo", phonetic: "ikh HEL-fe", tip: "helfen = ayudar" },
    { front: "ich nehme", back: "yo tomo", phonetic: "ikh NAY-me", tip: "nehmen = tomar" },
    { front: "ich gebe", back: "yo doy", phonetic: "ikh GAY-be", tip: "geben = dar" },
    { front: "ich finde", back: "yo encuentro / opino", phonetic: "ikh FIN-de", tip: "finden = encontrar" },
    { front: "ich zeige", back: "yo muestro", phonetic: "ikh TSAI-ge", tip: "zeigen = mostrar" },
  ],
};

const LEVELS = ["A1", "A2"];
const CATEGORIES = ["Vocabulario", "Frases", "Gramática", "Verbos"];
const CAT_ICONS = { Vocabulario: "📚", Frases: "💬", Gramática: "🔤", Verbos: "🔁" };
const THEME = {
  A1: { accent: "#1db954", glow: "rgba(29,185,84,0.3)", glass: "rgba(29,185,84,0.08)", border: "rgba(29,185,84,0.22)", label: "Principiante" },
  A2: { accent: "#1e90ff", glow: "rgba(30,144,255,0.3)", glass: "rgba(30,144,255,0.08)", border: "rgba(30,144,255,0.22)", label: "Básico" },
};

// ─── GEMINI API ────────────────────────────────────────────────────────────
async function generateCards(level, category, existingFronts = []) {
  const apiKey = process.env.REACT_APP_GEMINI_KEY;
  if (!apiKey) {
    console.error("❌ No tienes REACT_APP_GEMINI_KEY configurada en Vercel");
    return [];
  }

  const avoid = existingFronts.slice(-30).join(", ");

  const prompt = `Genera exactamente 8 tarjetas de alemán para estudiantes hispanohablantes.

Nivel: ${level}
Categoría: ${category}
${avoid ? `Evita estas fronts ya usadas: ${avoid}` : ""}

Responde ÚNICAMENTE con este JSON, sin texto extra, sin backticks:

{
  "cards": [
    {
      "front": "der Hund",
      "back": "el perro",
      "phonetic": "dair HUNT",
      "tip": "Plural: Hunde"
    }
  ]
}

Reglas: artículo der/die/das, phonetic en MAYÚSCULAS, tip corto y útil, verbos en "ich ...".`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200,
            response_mime_type: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("❌ Error Gemini HTTP", res.status);
      return [];
    }

    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    text = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    const parsed = JSON.parse(text);
    const newCards = parsed.cards || [];
    console.log(`✅ Gemini generó ${newCards.length} tarjetas`);
    return Array.isArray(newCards) ? newCards : [];
  } catch (e) {
    console.error("❌ Error Gemini:", e);
    return [];
  }
}

// ─── SPEECH + PRONUNCIATION ────────────────────────────────────────────────
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
    if (transcript && card) {
      setResult({ ...scorePronunciation(card.front, transcript), heard: transcript });
      setAttempts(a => a + 1);
    }
  }, [transcript, card]);

  if (!supported) return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.border}`, borderRadius: 16, padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: 12, width: "100%", maxWidth: 400 }}>
      🎤 Usa Chrome o Edge para reconocimiento de voz
    </div>
  );

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`, borderRadius: 20, overflow: "hidden", marginBottom: 14, width: "100%", maxWidth: 400, animation: "slideUp 0.3s ease" }}>
      <div style={{ padding: "10px 16px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase" }}>🎤 Pronunciación</span>
        {attempts > 0 && <span style={{ fontSize: 10, color: theme.accent }}>{attempts} intento{attempts > 1 ? "s" : ""}</span>}
      </div>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: theme.glass, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: theme.accent, flexShrink: 0 }}>1</div>
          <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Escucha la pronunciación</span>
          <button onClick={(e) => { e.stopPropagation(); onSpeak(); }} style={{ background: speaking ? theme.glass : "rgba(255,255,255,0.04)", border: `1px solid ${speaking ? theme.accent : "rgba(255,255,255,0.1)"}`, borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", boxShadow: speaking ? `0 0 14px ${theme.glow}` : "none", transition: "all 0.2s" }}>
            <span style={{ fontSize: 14, animation: speaking ? "speakPulse 0.6s ease infinite alternate" : "none" }}>🔊</span>
            <span style={{ fontSize: 11, color: speaking ? theme.accent : "rgba(255,255,255,0.35)" }}>{speaking ? "..." : "Escuchar"}</span>
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: listening ? 10 : 0 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: theme.glass, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: theme.accent, flexShrink: 0 }}>2</div>
          <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Repite en voz alta</span>
          <button onClick={(e) => { e.stopPropagation(); listening ? stop() : start(); }} style={{ background: listening ? "rgba(231,76,60,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${listening ? "#e74c3c" : "rgba(255,255,255,0.1)"}`, borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", boxShadow: listening ? "0 0 16px rgba(231,76,60,0.4)" : "none", transition: "all 0.2s" }}>
            <span style={{ fontSize: 14, animation: listening ? "speakPulse 0.5s ease infinite alternate" : "none" }}>🎙️</span>
            <span style={{ fontSize: 11, color: listening ? "#e74c3c" : "rgba(255,255,255,0.35)" }}>{listening ? "Escuchando..." : "Hablar"}</span>
          </button>
        </div>
        {listening && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 26, marginBottom: 10 }}>
            {[...Array(14)].map((_, i) => (
              <div key={i} style={{ width: 3, borderRadius: 2, background: "#e74c3c", animation: `wave 0.\( {4 + (i % 5)}s ease infinite alternate`, animationDelay: ` \){i * 0.06}s` }} />
            ))}
          </div>
        )}
        {result && !listening && (
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 14, padding: "12px", border: `1px solid ${result.color}25`, marginTop: 10, animation: "slideUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{result.emoji}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: result.color }}>{result.score}%</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginBottom: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: result.color, width: `${result.score}%`, transition: "width 1s ease", boxShadow: `0 0 8px ${result.color}` }} />
            </div>
            <div style={{ fontSize: 13, color: result.color, fontWeight: 600, marginBottom: 8 }}>{result.label}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <div><div style={{ color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>Correcto</div><div style={{ color: "rgba(255,255,255,0.6)" }}>"{card.front}"</div></div>
              <div style={{ textAlign: "right" }}><div style={{ color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>Escuché</div><div style={{ color: result.score >= 85 ? theme.accent : "rgba(255,255,255,0.4)" }}>"{result.heard}"</div></div>
            </div>
            {result.score < 85 && (
              <button onClick={(e) => { e.stopPropagation(); start(); }} style={{ marginTop: 10, width: "100%", padding: "8px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>
                🔄 Intentar de nuevo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP (con el fix del loading) ─────────────────────────────────────
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

  const deckKey = `\( {level}- \){category}`;
  const theme = THEME[level];

  // SAFE CARD + CLAMP INDEX (esto arregla el bug de "Cargando tarjetas...")
  const safeIndex = Math.max(0, Math.min(index, deck.length - 1));
  const card = deck[safeIndex];

  const progress = deck.length > 0 ? (known.size / deck.length) * 100 : 0;

  useEffect(() => { window.speechSynthesis?.getVoices(); }, []);

  useEffect(() => {
    setDeck(SEED_CARDS[deckKey] || []);
    setIndex(0);
    setFlipped(false); setShowTip(false);
    setKnown(new Set()); setUnknown(new Set());
    setShowPronunciation(false);
    generatingRef.current = false;
  }, [deckKey]);

  // Mantiene el índice válido cuando el mazo crece
  useEffect(() => {
    if (deck.length > 0 && index !== safeIndex) {
      setIndex(safeIndex);
    }
  }, [deck.length, index, safeIndex]);

  useEffect(() => {
    const tooFew = deck.length < 8;
    const nearEnd = deck.length > 0 && safeIndex >= deck.length - 4;
    if ((tooFew || nearEnd) && !generatingRef.current) {
      loadMoreCards();
    }
  }, [deck.length, safeIndex]);

  async function loadMoreCards() {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    console.log(`🔄 Generando más tarjetas para ${deckKey}...`);

    try {
      const newCards = await generateCards(level, category, deck.map(c => c.front));
      if (newCards.length > 0) {
        setDeck(prev => [...prev, ...newCards]);
      }
    } catch (e) {
      console.error(e);
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

  function markKnown() {
    if (!card) return;
    setKnown(s => new Set([...s, safeIndex]));
    setUnknown(s => { const n = new Set(s); n.delete(safeIndex); return n; });
    go("next");
  }

  function markUnknown() {
    if (!card) return;
    setUnknown(s => new Set([...s, safeIndex]));
    setKnown(s => { const n = new Set(s); n.delete(safeIndex); return n; });
    go("next");
  }

  const glassBase = {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: `1px solid ${theme.border}`,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg,#080810 0%,#0d0d1a 50%,#080f0b 100%)",
      color: "#fff", fontFamily: "system-ui, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "28px 16px 52px", position: "relative", overflow: "hidden",
    }}>

      {/* Background orbs, Header, Level selector, Progress bar (igual que antes) */}
      {/* ... (todo el código de orbs, header, level buttons y progress bar que ya tenías) ... */}

      {/* CARD */}
      {deck.length === 0 ? (
        <div style={{ width: "100%", maxWidth: 400, minHeight: 280, borderRadius: 24, ...glassBase, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 28, animation: "spin 1s linear infinite" }}>⟳</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Cargando tarjetas...</div>
        </div>
      ) : (
        <div
          onClick={() => setFlipped(f => !f)}
          style={{
            width: "100%", maxWidth: 420, minHeight: 300, borderRadius: 32,
            background: flipped
              ? "linear-gradient(135deg,rgba(255,255,255,0.08) 0%,rgba(255,255,255,0.03) 100%)"
              : "linear-gradient(135deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%)",
            backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
            border: `1px solid ${flipped ? theme.accent + "55" : "rgba(255,255,255,0.1)"}`,
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "40px 32px 32px",
            boxShadow: flipped
              ? `0 8px 48px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`
              : "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
            position: "relative", userSelect: "none",
            transform: animDir === "next" ? "translateX(60px) scale(0.94)" : animDir === "prev" ? "translateX(-60px) scale(0.94)" : "translateX(0) scale(1)",
            opacity: animDir ? 0 : 1,
            transition: "transform 0.18s ease, opacity 0.18s ease, border-color 0.4s, box-shadow 0.4s",
            marginBottom: 14,
          }}
        >
          {/* contenido de la card (front / back) igual que antes */}
          {/* ... (usa {card.front}, {card.phonetic}, {card.back}, {card.tip} ...) ... */}
        </div>
      )}

      {/* El resto del JSX (toggles, PronunciationPanel, action buttons, stats, botón generar) es exactamente igual que en la versión anterior */}

      <style>{`
        * { box-sizing: border-box; }
        @keyframes speakPulse { from{transform:scale(1);opacity:0.6} to{transform:scale(1.4);opacity:1} }
        @keyframes wave { from{height:3px} to{height:22px} }
        @keyframes orbFloat { from{transform:translate(-50%,-50%) scale(1)} to{transform:translate(-50%,-50%) scale(1.15) translateY(-16px)} }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popUp { from{opacity:0;transform:scale(0.8) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        button:active { transform:scale(0.95) !important; }
      `}</style>
    </div>
  );
}