import React, { useState, useEffect } from 'react';
import './App.css';

// --- CONFIGURACIÓN INICIAL (CARTAS SEMILLA) ---
const SEED_CARDS = [
  { front: "das Haus", back: "la casa", phonetic: "das HAUS", tip: "Sustantivo neutro." },
  { front: "der Mann", back: "el hombre", phonetic: "der MAN", tip: "Sustantivo masculino." },
  { front: "die Frau", back: "la mujer", phonetic: "di FRAU", tip: "Sustantivo femenino." },
  { front: "Kind", back: "niño/niña", phonetic: "KINT", tip: "das Kind (neutro)." },
  { front: "Apfel", back: "manzana", phonetic: "AP-fel", tip: "der Apfel (masculino)." }
];

// --- GENERADOR IA (GEMINI) ---
async function generateCards(level, category, existingFronts=[]) {
  const apiKey = process.env.REACT_APP_GEMINI_KEY;
  if (!apiKey) { 
    console.warn("Configura REACT_APP_GEMINI_KEY en Vercel."); 
    return []; 
  }

  const prompt = `Genera exactamente 8 tarjetas de alemán para hispanohablantes. 
  Nivel: ${level}. Categoría: ${category}. 
  Responde SOLO el JSON puro, sin markdown ni backticks: 
  {"cards":[{"front":"alemán","back":"español","phonetic":"fonética","tip":"consejo"}]}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    const data = await res.json();
    if (!data.candidates) throw new Error("Sin respuesta de Gemini");
    
    const text = data.candidates[0].content.parts[0].text;
    const cleanText = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanText);
    return parsed.cards || [];
  } catch (error) {
    console.error("Error con Gemini:", error);
    return [];
  }
}

function App() {
  const [level, setLevel] = useState('A1');
  const [category, setCategory] = useState('Vocabulario');
  const [cards, setCards] = useState(SEED_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentCard = cards[currentIndex];

  const handleNext = async () => {
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setLoading(true);
      const newCards = await generateCards(level, category, cards.map(c => c.front));
      if (newCards.length > 0) {
        setCards([...cards, ...newCards]);
        setCurrentIndex(currentIndex + 1);
      }
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>Deutsch ∞</h1>
        <div className="controls">
          <button onClick={() => setLevel('A1')} className={level === 'A1' ? 'active' : ''}>A1</button>
          <button onClick={() => setLevel('A2')} className={level === 'A2' ? 'active' : ''}>A2</button>
        </div>
      </header>

      <main>
        {loading ? (
          <div className="loader">Generando tarjetas con IA...</div>
        ) : (
          <div className={`card ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
            <div className="card-inner">
              <div className="card-front">
                <h2>{currentCard?.front}</h2>
                <p className="phonetic">{currentCard?.phonetic}</p>
              </div>
              <div className="card-back">
                <h2>{currentCard?.back}</h2>
                <p className="tip">💡 {currentCard?.tip}</p>
              </div>
            </div>
          </div>
        )}
        <button className="next-btn" onClick={handleNext} disabled={loading}>
          {currentIndex < cards.length - 1 ? "Siguiente" : "Generar más con IA"}
        </button>
      </main>
    </div>
  );
}

export default App;
