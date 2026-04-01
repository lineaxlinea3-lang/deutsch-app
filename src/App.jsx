import { useState, useEffect, useRef, useMemo } from "react";

// ========================== DATOS ESTÁTICOS ==========================
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
  ],
};

const LEVELS = ["A1", "A2"];
const CATEGORIES = ["Vocabulario", "Frases", "Gramática", "Verbos"];
const CAT_ICONS = { Vocabulario: "📚", Frases: "💬", Gramática: "🔤", Verbos: "🔁" };
const THEME = {
  A1: { accent: "#1db954", glow: "rgba(29,185,84,0.3)", glass: "rgba(29,185,84,0.08)", border: "rgba(29,185,84,0.22)", label: "Principiante" },
  A2: { accent: "#1e90ff", glow: "rgba(30,144,255,0.3)", glass: "rgba(30,144,255,0.08)", border: "rgba(30,144,255,0.22)", label: "Básico" },
};

// ========================== WORD LISTS (LISTA FIJA) ==========================
const WORD_LISTS = {
  A1: {
    Vocabulario: [
      "der Tisch", "die Tür", "das Fenster", "der Stuhl", "die Lampe", "das Bett", "der Schrank",
      "die Küche", "das Bad", "der Garten", "die Stadt", "das Dorf", "der Park", "die Schule",
      "der Lehrer", "die Schülerin", "das Buch", "der Kugelschreiber", "die Tasche", "das Papier"
    ],
    Verbos: [
      "gehen", "kommen", "sprechen", "essen", "trinken", "schlafen", "arbeiten", "lernen",
      "schreiben", "lesen", "hören", "sehen", "wohnen", "fahren", "spielen", "öffnen"
    ],
    Frases: [
      "Guten Morgen", "Guten Abend", "Gute Nacht", "Wie geht es dir?", "Mir geht es gut",
      "Wo ist die Toilette?", "Was kostet das?", "Ich hätte gern...", "Sprechen Sie Englisch?",
      "Entschuldigung", "Auf Wiedersehen", "Bis bald"
    ],
    Gramática: [
      "der", "die", "das", "Nominativ", "Akkusativ", "Dativ", "Verbposition", "Präteritum",
      "Perfekt", "Modalverben", "Trennbare Verben"
    ]
  },
  A2: {
    Vocabulario: [
      "die Arbeit", "die Zeit", "das Geld", "die Wohnung", "das Leben", "der Urlaub", "die Reise",
      "das Wetter", "die Gesundheit", "das Gefühl", "die Bedeutung", "die Möglichkeit"
    ],
    Verbos: [
      "werden", "können", "müssen", "wollen", "dürfen", "sollen", "verstehen", "erklären",
      "brauchen", "versuchen", "denken", "wissen", "kennen", "helfen", "nehmen", "geben"
    ],
    Frases: [
      "Könnten Sie mir helfen?", "Wie viel kostet das?", "Ich hätte gern...", "Das macht nichts",
      "Es tut mir leid", "Kein Problem", "Ich verstehe nicht", "Können Sie langsamer sprechen?"
    ],
    Gramática: [
      "weil", "wenn", "Perfekt", "Relativsätze", "Komparativ", "Superlativ", "Konjunktiv II"
    ]
  }
};

// Fallback manual (definiciones offline)
const FALLBACK_DICT = {
  "der Tisch": "la mesa",
  "die Tür": "la puerta",
  "das Fenster": "la ventana",
  "der Stuhl": "la silla",
  "die Lampe": "la lámpara",
  "das Bett": "la cama",
  "der Schrank": "el armario",
  "die Küche": "la cocina",
  "das Bad": "el baño",
  "der Garten": "el jardín",
  "die Stadt": "la ciudad",
  "das Dorf": "el pueblo",
  "der Park": "el parque",
  "die Schule": "la escuela",
  "der Lehrer": "el profesor",
  "die Schülerin": "la alumna",
  "das Buch": "el libro",
  "der Kugelschreiber": "el bolígrafo",
  "die Tasche": "la bolsa",
  "das Papier": "el papel",
  "gehen": "ir",
  "kommen": "venir",
  "sprechen": "hablar",
  "essen": "comer",
  "trinken": "beber",
  "schlafen": "dormir",
  "arbeiten": "trabajar",
  "lernen": "aprender",
  "schreiben": "escribir",
  "lesen": "leer",
  "hören": "escuchar",
  "sehen": "ver",
  "wohnen": "vivir",
  "fahren": "conducir/viajar",
  "spielen": "jugar",
  "öffnen": "abrir",
  "werden": "convertirse en / futuro",
  "können": "poder",
  "müssen": "deber",
  "wollen": "querer",
  "dürfen": "tener permiso",
  "sollen": "debería",
  "verstehen": "entender",
  "erklären": "explicar",
  "brauchen": "necesitar",
  "versuchen": "intentar",
  "denken": "pensar",
  "wissen": "saber",
  "kennen": "conocer",
  "helfen": "ayudar",
  "nehmen": "tomar",
  "geben": "dar"
};

// ========================== FUNCIONES DEL DICCIONARIO ==========================
function stripArticle(word) {
  const articles = ["der ", "die ", "das ", "den ", "dem ", "des "];
  const lower = word.toLowerCase();
  for (const art of articles) {
    if (lower.startsWith(art)) {
      return word.slice(art.length);
    }
  }
  return word;
}

async function fetchFromDictionary(word) {
  const clean = stripArticle(word);
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/de/${encodeURIComponent(clean)}`;
    const res = await fetch(url);
    if (!res.ok) {
      // Fallback offline
      if (FALLBACK_DICT[word]) {
        return {
          front: word,
          back: FALLBACK_DICT[word],
          phonetic: "",
          tip: "definición manual"
        };
      }
      return null;
    }
    const data = await res.json();
    const entry = data[0];
    if (!entry) return null;
    const definition = entry.meanings?.[0]?.definitions?.[0]?.definition || "Sin definición";
    const partOfSpeech = entry.meanings?.[0]?.partOfSpeech || "";
    const phonetic = entry.phonetic || "";
    return {
      front: word,
      back: definition,
      phonetic: phonetic,
      tip: partOfSpeech,
    };
  } catch (error) {
    if (FALLBACK_DICT[word]) {
      return {
        front: word,
        back: FALLBACK_DICT[word],
        phonetic: "",
        tip: "definición manual"
      };
    }
    return null;
  }
}

// Generar desde lista fija
async function generateFromDictionary(level, category, existingFronts = [], count = 12) {
  const words = WORD_LISTS[level]?.[category] || [];
  if (words.length === 0) return [];

  const existingSet = new Set(existingFronts);
  const candidates = words.filter(w => !existingSet.has(w));
  if (candidates.length === 0) return [];

  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = shuffled.slice(0, count);

  const cards = [];
  for (const word of selected) {
    const card = await fetchFromDictionary(word);
    if (card) cards.push(card);
    await new Promise(r => setTimeout(r, 150));
  }
  return cards;
}

// Obtener palabras aleatorias (API externa)
async function getRandomGermanWords(count = 15) {
  try {
    const res = await fetch(`https://random-word-api.herokuapp.com/word?number=${count}&lang=de`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Error obteniendo palabras aleatorias:", error);
    return [];
  }
}

// ========================== PRONUNCIACIÓN ==========================
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
    <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`, borderRadius: 20, overflow: "hidden", marginBottom: 14, width: "100%", maxWidth: 400 }}>
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
              <div key={i} style={{ width: 3, borderRadius: 2, background: "#e74c3c", animation: `wave 0.${4 + (i % 5)}s ease infinite alternate`, animationDelay: `${i * 0.06}s` }} />
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

// ========================== COMPONENTE PRINCIPAL ==========================
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
  const [genError, setGenError] = useState(null);
  const [animDir, setAnimDir] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [showPronunciation, setShowPronunciation] = useState(false);

  const theme = THEME[level];
  const deckKey = useMemo(() => `${level}-${category}`, [level, category]);

  useEffect(() => {
    setDeck(SEED_CARDS[deckKey] || []);
    setIndex(0);
    setFlipped(false);
    setShowTip(false);
    setKnown(new Set());
    setUnknown(new Set());
    setShowPronunciation(false);
    setGenError(null);
  }, [deckKey]);

  const safeIndex = deck.length > 0 ? Math.max(0, Math.min(index, deck.length - 1)) : 0;
  const card = deck[safeIndex];
  const progress = deck.length > 0 ? (known.size / deck.length) * 100 : 0;

  const nextCard = () => {
    if (deck.length === 0) return;
    setAnimDir("right");
    setFlipped(false);
    setShowTip(false);
    setShowPronunciation(false);
    setTimeout(() => {
      setIndex(prev => (prev + 1) % deck.length);
      setAnimDir(null);
    }, 200);
  };

  const prevCard = () => {
    if (deck.length === 0) return;
    setAnimDir("left");
    setFlipped(false);
    setShowTip(false);
    setShowPronunciation(false);
    setTimeout(() => {
      setIndex(prev => (prev - 1 + deck.length) % deck.length);
      setAnimDir(null);
    }, 200);
  };

  const markKnown = () => {
    if (!card) return;
    setKnown(prev => new Set(prev).add(card.front));
    setUnknown(prev => {
      const newSet = new Set(prev);
      newSet.delete(card.front);
      return newSet;
    });
    nextCard();
  };

  const markUnknown = () => {
    if (!card) return;
    setUnknown(prev => new Set(prev).add(card.front));
    setKnown(prev => {
      const newSet = new Set(prev);
      newSet.delete(card.front);
      return newSet;
    });
    nextCard();
  };

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setGenError(null);
    try {
      const existingFronts = deck.map(c => c.front);
      // 1. Intentar con lista fija
      let newCards = await generateFromDictionary(level, category, existingFronts, 12);
      
      // 2. Si no hubo, usar palabras aleatorias
      if (newCards.length === 0) {
        const randomWords = await getRandomGermanWords(15);
        for (const word of randomWords) {
          if (existingFronts.includes(word)) continue;
          const cardData = await fetchFromDictionary(word);
          if (cardData) {
            newCards.push(cardData);
            if (newCards.length >= 12) break;
          }
          await new Promise(r => setTimeout(r, 150));
        }
      }
      
      if (newCards.length > 0) {
        setDeck(prev => [...prev, ...newCards]);
      } else {
        setGenError("No se encontraron definiciones. Prueba con otro nivel o categoría, o revisa tu conexión.");
      }
    } catch (error) {
      console.error(error);
      setGenError("Error inesperado al generar tarjetas.");
    } finally {
      setGenerating(false);
    }
  };

  const speakCard = () => {
    if (!card) return;
    speakGerman(card.front, () => setSpeaking(true), () => setSpeaking(false));
  };

  if (deck.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <p>No hay tarjetas disponibles para {level} - {category}</p>
          <button onClick={handleGenerate} disabled={generating} style={{ marginTop: 16, padding: "12px 24px", background: theme.accent, border: "none", borderRadius: 40, color: "white", fontWeight: "bold", cursor: "pointer" }}>
            {generating ? "Generando..." : "Generar con diccionario"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", fontFamily: "system-ui, -apple-system, sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto 24px", display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {LEVELS.map(lvl => (
          <button
            key={lvl}
            onClick={() => setLevel(lvl)}
            style={{
              background: level === lvl ? THEME[lvl].accent : "rgba(255,255,255,0.05)",
              border: `1px solid ${level === lvl ? THEME[lvl].accent : "rgba(255,255,255,0.1)"}`,
              borderRadius: 40,
              padding: "8px 20px",
              color: "white",
              fontWeight: level === lvl ? "bold" : "normal",
              cursor: "pointer"
            }}
          >
            {lvl}
          </button>
        ))}
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              background: category === cat ? theme.accent : "rgba(255,255,255,0.05)",
              border: `1px solid ${category === cat ? theme.accent : "rgba(255,255,255,0.1)"}`,
              borderRadius: 40,
              padding: "8px 20px",
              color: "white",
              fontWeight: category === cat ? "bold" : "normal",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>{CAT_ICONS[cat]}</span> {cat}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
          <span>Conocidas: {known.size} / {deck.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: theme.accent, transition: "width 0.3s" }} />
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", perspective: 1200 }}>
        <div
          onClick={() => setFlipped(!flipped)}
          style={{
            width: "100%",
            minHeight: 380,
            background: "rgba(20,20,30,0.7)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${theme.border}`,
            borderRadius: 32,
            boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${theme.glass}`,
            cursor: "pointer",
            transition: "transform 0.4s",
            transform: animDir === "right" ? "rotateY(15deg) translateX(30px)" : animDir === "left" ? "rotateY(-15deg) translateX(-30px)" : "rotateY(0deg)",
            opacity: animDir ? 0.5 : 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "24px"
          }}
        >
          <div style={{ fontSize: 14, color: theme.accent, marginBottom: 16, textTransform: "uppercase", letterSpacing: 2 }}>
            {flipped ? "🔍 Significado" : "🇩🇪 Alemán"}
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, marginBottom: 20, wordBreak: "break-word" }}>
            {flipped ? card.back : card.front}
          </div>
          {flipped && card.phonetic && (
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
              /{card.phonetic}/
            </div>
          )}
          {showTip && card.tip && (
            <div style={{ fontSize: 13, background: "rgba(0,0,0,0.4)", padding: "8px 16px", borderRadius: 40, color: "#ffd966" }}>
              💡 {card.tip}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 20 }}>
          <button onClick={() => setShowTip(!showTip)} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 40, padding: "8px 16px", color: "white", cursor: "pointer", fontSize: 12 }}>
            {showTip ? "Ocultar tip" : "Mostrar tip"}
          </button>
          <button onClick={() => setShowPronunciation(!showPronunciation)} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 40, padding: "8px 16px", color: "white", cursor: "pointer", fontSize: 12 }}>
            {showPronunciation ? "Ocultar pronunciación" : "Practicar pronunciación"}
          </button>
          <button onClick={handleGenerate} disabled={generating} style={{ background: theme.accent, border: "none", borderRadius: 40, padding: "8px 16px", color: "white", cursor: "pointer", fontSize: 12 }}>
            {generating ? "..." : "+ Generar más (diccionario)"}
          </button>
        </div>

        {showPronunciation && (
          <div style={{ marginTop: 20 }}>
            <PronunciationPanel card={card} theme={theme} onSpeak={speakCard} speaking={speaking} />
          </div>
        )}

        {genError && (
          <div style={{ maxWidth: 500, margin: "16px auto 0", background: "#e74c3c20", border: "1px solid #e74c3c", borderRadius: 12, padding: "12px", textAlign: "center", fontSize: 14, color: "#e74c3c" }}>
            ⚠️ {genError}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 12 }}>
          <button onClick={prevCard} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 60, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20 }}>
            ◀
          </button>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={markUnknown} style={{ background: "rgba(231,76,60,0.2)", border: `1px solid #e74c3c`, borderRadius: 40, padding: "10px 20px", color: "white", fontWeight: "bold", cursor: "pointer" }}>
              ❌ No la sé
            </button>
            <button onClick={markKnown} style={{ background: "rgba(29,185,84,0.2)", border: `1px solid #1db954`, borderRadius: 40, padding: "10px 20px", color: "white", fontWeight: "bold", cursor: "pointer" }}>
              ✅ La sé
            </button>
          </div>
          <button onClick={nextCard} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 60, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20 }}>
            ▶
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
        {safeIndex + 1} / {deck.length}
      </div>
    </div>
  );
}