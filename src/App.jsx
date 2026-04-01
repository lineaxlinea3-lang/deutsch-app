import { useState, useEffect, useRef, useMemo } from "react";

// ─── SEED CARDS (básicas) ────────────────────────────────────────────────────
const SEED_CARDS = {
  "A1-Vocabulario": [
    { front: "das Haus", back: "la casa", phonetic: "das HAUS", tip: "das = neutro" },
    { front: "der Mann", back: "el hombre", phonetic: "dair MAN", tip: "der = masculino" },
    // ... (mantén las semillas que ya tenías)
  ],
  // ... resto de semillas
};

const LEVELS = ["A1", "A2"];
const CATEGORIES = ["Vocabulario", "Frases", "Gramática", "Verbos"];
const CAT_ICONS = { Vocabulario: "📚", Frases: "💬", Gramática: "🔤", Verbos: "🔁" };
const THEME = {
  A1: { accent: "#1db954", glow: "rgba(29,185,84,0.3)", glass: "rgba(29,185,84,0.08)", border: "rgba(29,185,84,0.22)", label: "Principiante" },
  A2: { accent: "#1e90ff", glow: "rgba(30,144,255,0.3)", glass: "rgba(30,144,255,0.08)", border: "rgba(30,144,255,0.22)", label: "Básico" },
};

// ─── LISTAS DE PALABRAS COMUNES POR NIVEL ───────────────────────────────────
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
      "der, die, das", "Nominativ", "Akkusativ", "Dativ", "Verbposition", "Präteritum",
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
      "weil + Verb am Ende", "wenn + Verb am Ende", "Perfekt mit sein/haben",
      "Relativsätze", "Komparativ", "Superlativ", "Konjunktiv II"
    ]
  }
};

// ─── DICCIONARIO API (gratuita, sin clave) ─────────────────────────────────
async function fetchFromDictionary(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/de/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[0];
    if (!entry) return null;

    // Extraer definición en alemán (a veces está en alemán, a veces en inglés)
    const meaning = entry.meanings?.[0];
    const definition = meaning?.definitions?.[0]?.definition || "Sin definición disponible";
    const partOfSpeech = meaning?.partOfSpeech || "";
    const phonetic = entry.phonetic || "";
    const audio = entry.phonetics?.find(p => p.audio)?.audio || null;

    return {
      front: word,
      back: definition,
      phonetic: phonetic,
      tip: partOfSpeech,
      audio: audio  // por si quieres usar audio real
    };
  } catch (error) {
    console.error("Error consultando diccionario para", word, error);
    return null;
  }
}

async function generateFromDictionary(level, category, existingFronts = [], count = 12) {
  const words = WORD_LISTS[level]?.[category] || [];
  if (words.length === 0) return [];

  const existingSet = new Set(existingFronts);
  const candidates = words.filter(w => !existingSet.has(w));

  // Seleccionar aleatoriamente hasta count
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selectedWords = shuffled.slice(0, count);

  // Consultar API para cada palabra (limitamos concurrencia)
  const cards = [];
  for (const word of selectedWords) {
    const card = await fetchFromDictionary(word);
    if (card) {
      cards.push(card);
    }
    // Pequeña pausa para no saturar la API
    await new Promise(r => setTimeout(r, 100));
  }
  return cards;
}

// ─── GEMINI API (opcional, mantén si quieres IA) ────────────────────────────
async function generateCardsWithAI(level, category, existingFronts = [], retryCount = 0) {
  const apiKey = process.env.REACT_APP_GEMINI_KEY;
  if (!apiKey) return { success: false, cards: [], error: "No API key" };

  // ... (código de Gemini que ya tenías, ajustado para devolver objeto { success, cards, error })
  // Puedes dejar el código anterior que devuelve { success, cards }.
  // Si prefieres simplificar, aquí pondré un esqueleto que devuelve éxito falso si no hay key.
  return { success: false, cards: [], error: "IA no disponible" };
}

// ─── GENERACIÓN COMBINADA (diccionario + IA opcional) ───────────────────────
async function generateCards(level, category, existingFronts = [], useAI = false) {
  // 1. Intentar con diccionario
  console.log("📚 Generando desde diccionario...");
  const dictCards = await generateFromDictionary(level, category, existingFronts, 12);
  if (dictCards.length > 0) {
    console.log(`✅ Diccionario generó ${dictCards.length} tarjetas`);
    return { success: true, cards: dictCards };
  }

  // 2. Si no hay suficientes, intentar con IA (si está activada)
  if (useAI) {
    console.log("🤖 Generando con IA...");
    const aiResult = await generateCardsWithAI(level, category, existingFronts);
    if (aiResult.success && aiResult.cards.length > 0) {
      return aiResult;
    }
  }

  // 3. Si todo falla, devolver error
  return { success: false, cards: [], error: "No se pudieron generar tarjetas" };
}

// ─── SPEECH + PRONUNCIATION (igual que antes) ────────────────────────────────
// ... (copia aquí las funciones speakGerman, normalizeDe, scorePronunciation, useSpeechRecognition, PronunciationPanel)

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────
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
      // Usamos diccionario, sin IA (cambia a true si quieres IA)
      const result = await generateCards(level, category, existingFronts, false);
      if (result.success && result.cards.length > 0) {
        setDeck(prev => [...prev, ...result.cards]);
      } else {
        setGenError(result.error || "No se pudieron generar tarjetas.");
      }
    } catch (error) {
      console.error(error);
      setGenError("Error inesperado.");
    } finally {
      setGenerating(false);
    }
  };

  const speakCard = () => {
    if (!card) return;
    speakGerman(card.front, () => setSpeaking(true), () => setSpeaking(false));
  };

  // Si no hay tarjetas y el deck está vacío, mostrar pantalla de carga
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
      {/* Controles de nivel y categoría */}
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

      {/* Progreso */}
      <div style={{ maxWidth: 500, margin: "0 auto 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
          <span>Conocidas: {known.size} / {deck.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: theme.accent, transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Tarjeta */}
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

        {/* Botones auxiliares */}
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

        {/* Navegación y botones de known/unknown */}
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

      {/* Indicador de posición */}
      <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
        {safeIndex + 1} / {deck.length}
      </div>
    </div>
  );
}