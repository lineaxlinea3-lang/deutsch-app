import { useState, useEffect, useRef, useMemo } from "react";

// ... (aquí todo igual hasta antes de `generateCards`)

// ─── GEMINI API (MEJORADA) ─────────────────────────────────────────────────
async function generateCards(level, category, existingFronts = [], retryCount = 0) {
  const apiKey = process.env.REACT_APP_GEMINI_KEY;
  if (!apiKey) {
    console.error("❌ No tienes REACT_APP_GEMINI_KEY configurada");
    return [];
  }

  const avoid = existingFronts.slice(-10).join(", ");

  const prompt = `Genera exactamente 12 tarjetas de alemán para estudiantes hispanohablantes.

Nivel: ${level}
Categoría: ${category}
${avoid ? `Evita estas fronts (ya usadas): ${avoid}` : ""}

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
            maxOutputTokens: 2500,
            response_mime_type: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      console.error(`❌ Error Gemini HTTP ${res.status}`);
      if (retryCount < 2 && (res.status === 429 || res.status >= 500)) {
        console.log(`Reintentando (${retryCount + 1}/2)...`);
        await new Promise(r => setTimeout(r, 2000));
        return generateCards(level, category, existingFronts, retryCount + 1);
      }
      return [];
    }

    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    text = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("Error parseando JSON:", text);
      return [];
    }

    let newCards = parsed.cards || [];
    if (!Array.isArray(newCards)) newCards = [];

    if (newCards.length < 12 && retryCount < 1) {
      console.log(`Solo se generaron ${newCards.length} tarjetas, reintentando sin evitar fronts...`);
      return generateCards(level, category, [], retryCount + 1);
    }

    console.log(`✅ Gemini generó ${newCards.length} tarjetas nuevas`);
    return newCards;
  } catch (e) {
    console.error("❌ Error Gemini:", e);
    if (retryCount < 2) {
      await new Promise(r => setTimeout(r, 2000));
      return generateCards(level, category, existingFronts, retryCount + 1);
    }
    return [];
  }
}

// ... (el resto del código: `speakGerman`, `normalizeDe`, `scorePronunciation`, `useSpeechRecognition`, `PronunciationPanel` igual)

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
      const newCards = await generateCards(level, category, existingFronts);
      if (newCards.length > 0) {
        setDeck(prev => [...prev, ...newCards]);
      } else {
        setGenError("No se pudieron generar tarjetas. Intenta más tarde.");
      }
    } catch (error) {
      console.error("Error generando tarjetas:", error);
      setGenError("Error al generar. Revisa tu conexión o la clave de API.");
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
            {generating ? "Generando..." : "Generar con IA"}
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
              cursor: "pointer",
              transition: "all 0.2s"
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
            transition: "transform 0.4s, box-shadow 0.2s",
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
            {generating ? "..." : "+ Generar más"}
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