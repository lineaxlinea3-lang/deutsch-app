import React, { useState, useEffect } from 'react';

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

  const prompt = `Genera exactamente 8 tarjetas de alemán para hispanohablantes. Nivel: ${level}. Categoría: ${category}. Responde SOLO el JSON puro, sin markdown ni backticks: {"cards":[{"front":"alemán","back":"español","phonetic":"fonética","tip":"consejo"}]}`;

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
    <div style={{ backgroundColor: '#121212', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <header>
        <h1>Deutsch ∞</h1>
        <div style={{ marginBottom: '20px' }}>
          <button onClick={() => setLevel('A1')} style={{ padding: '10px', margin: '5px', backgroundColor: level === 'A1' ? '#4CAF50' : '#333', color: 'white', border: 'none', borderRadius: '5px' }}>A1</button>
          <button onClick={() => setLevel('A2')} style={{ padding: '10px', margin: '5px', backgroundColor: level === 'A2' ? '#4CAF50' : '#333', color: 'white', border: 'none', borderRadius: '5px' }}>A2</button>
        </div>
      </header>

      <main>
        {loading ? (
          <div>Generando tarjetas con IA...</div>
        ) : (
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ 
              width: '300px', height: '200px', margin: '0 auto', 
              backgroundColor: '#1e1e1e', borderRadius: '15px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', border: '1px solid #333', position: 'relative'
            }}
          >
            {!isFlipped ? (
              <div>
                <h2 style={{ fontSize: '2rem' }}>{currentCard?.front}</h2>
                <p style={{ color: '#aaa' }}>{currentCard?.phonetic}</p>
              </div>
            ) : (
              <div>
                <h2 style={{ color: '#4CAF50' }}>{currentCard?.back}</h2>
                <p style={{ fontSize: '0.9rem', padding: '0 10px' }}>💡 {currentCard?.tip}</p>
              </div>
            )}
          </div>
        )}
        
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={handleNext} 
            disabled={loading}
            style={{ padding: '15px 30px', fontSize: '1rem', borderRadius: '25px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            {currentIndex < cards.length - 1 ? "Siguiente" : "Generar más con IA"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
