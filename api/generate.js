export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { level, category, existingFronts = [] } = req.body || {};
  if (!level || !category) return res.status(400).json({ error: "Faltan level y category" });

  const GOOGLE_KEY = process.env.GOOGLE_TRANSLATE_KEY;
  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GOOGLE_KEY || !GROQ_KEY) return res.status(500).json({ error: "Faltan variables de entorno" });

  // ── Banco de palabras por nivel/categoría ─────────────────────────────────
  const WORD_BANK = {
    "A1-Vocabulario": [
      "das Haus","der Mann","die Frau","das Kind","der Hund","die Katze","das Wasser",
      "das Brot","die Milch","der Apfel","das Buch","der Stift","die Schule","das Auto",
      "der Bus","der Zug","die Straße","das Geld","der Tag","die Nacht","das Jahr",
      "der Monat","die Woche","das Wetter","die Sonne","der Regen","der Wind","der Baum",
      "die Blume","das Tier","der Vogel","der Fisch","das Fleisch","das Gemüse","die Suppe",
      "der Käse","die Butter","das Ei","der Kaffee","der Tee","das Bier","der Wein",
      "die Stadt","das Dorf","der Park","der Markt","das Krankenhaus","die Apotheke",
      "die Post","die Bank","das Hotel","der Bahnhof","der Flughafen","das Restaurant",
      "die Küche","das Badezimmer","das Schlafzimmer","der Tisch","der Stuhl","das Bett",
      "das Fenster","die Tür","die Lampe","das Telefon","der Computer","der Fernseher",
    ],
    "A2-Vocabulario": [
      "die Gesundheit","das Krankenhaus","der Arzt","die Umwelt","die Natur","der Wald",
      "der Fluss","das Meer","die Reise","das Hotel","die Reservierung","die Rechnung",
      "der Beruf","das Gehalt","die Firma","die Technologie","das Internet","die Nachricht",
      "die Einladung","das Geschenk","der Geburtstag","die Hochzeit","die Regierung",
      "das Gesetz","die Freiheit","die Verantwortung","die Bildung","die Universität",
      "der Vertrag","die Versicherung","das Konto","die Steuer","der Urlaub","die Küste",
      "das Gebirge","der Hafen","die Brücke","das Museum","die Ausstellung","das Theater",
      "das Konzert","die Mannschaft","das Spiel","der Sieg","die Niederlage","die Grenze",
      "die Sprache","der Dialekt","die Kultur","die Tradition",
    ],
    "A1-Verbos": [
      "gehen","kommen","machen","haben","sein","essen","trinken","schlafen","arbeiten",
      "lernen","sprechen","kaufen","lesen","schreiben","hören","sehen","wohnen","fahren",
      "spielen","fragen","antworten","öffnen","schließen","nehmen","geben","bringen",
      "finden","suchen","warten","helfen","zeigen","zahlen","kochen","laufen","sitzen",
      "stehen","liegen","sagen","denken","wissen","kennen","lieben","brauchen","mögen",
    ],
    "A2-Verbos": [
      "werden","können","müssen","wollen","dürfen","sollen","verstehen","erklären",
      "entscheiden","vergessen","erinnern","vorbereiten","anfangen","aufhören","vorschlagen",
      "anrufen","zurückkommen","vorstellen","sich freuen","sich ärgern","sich interessieren",
      "sich bewerben","entwickeln","verbessern","erreichen","verlieren","gewinnen",
      "teilnehmen","organisieren","planen","beschreiben","vergleichen","analysieren",
      "empfehlen","erlauben","verbieten","versprechen","bemerken","übersetzen",
    ],
    "A1-Frases": [
      "Guten Morgen","Guten Tag","Guten Abend","Gute Nacht","Auf Wiedersehen","Tschüss",
      "Wie heißt du","Ich heiße","Wie geht es dir","Mir geht es gut","Danke schön",
      "Bitte","Entschuldigung","Es tut mir leid","Ich verstehe nicht","Sprechen Sie Englisch",
      "Wo ist die Toilette","Was kostet das","Ich möchte","Haben Sie","Die Rechnung bitte",
      "Ich habe Hunger","Ich habe Durst","Hilfe","Ich bin krank","Guten Appetit",
    ],
    "A2-Frases": [
      "Könnten Sie mir helfen","Ich hätte gern","Das macht nichts","Das stimmt",
      "Ich bin anderer Meinung","Ich rufe Sie zurück","Können wir uns treffen",
      "Ich freue mich darauf","Das war sehr lecker","Ich habe mich geirrt",
      "Das hängt davon ab","Ich mache mir Sorgen","Alles wird gut","Das klingt gut",
      "Ich weiß es nicht genau","Wie war dein Tag","Pass auf dich auf","Viel Glück",
      "Herzlichen Glückwunsch","Ich bin einverstanden","Das ist mir egal",
    ],
    "A1-Gramática": [
      "ich bin","du bist","er ist","wir sind","ihr seid","sie sind",
      "ich habe","du hast","er hat","wir haben","der die das","ein eine",
      "nicht","kein keine","und","oder","aber","weil","dass","W-Fragen",
    ],
    "A2-Gramática": [
      "Perfekt mit haben","Perfekt mit sein","Präteritum von sein","Komparativ",
      "Superlativ","Dativ","Akkusativ","Genitiv","Reflexive Verben","Passiv Präsens",
      "Futur mit werden","Konjunktiv II würde","Relativsätze","trennbare Verben",
      "Modalverben","Wechselpräpositionen","Dativpräpositionen","Akkusativpräpositionen",
    ],
  };

  const key = `${level}-${category}`;
  const allWords = WORD_BANK[key] || [];
  const used = new Set(existingFronts);
  const available = allWords.filter(w => !used.has(w));

  // Tomar hasta 8 palabras aleatorias
  const shuffled = available.sort(() => Math.random() - 0.5).slice(0, 8);
  if (shuffled.length === 0) return res.status(200).json({ cards: [] });

  try {
    // ── 1. Google Translate: traducir todas en una sola llamada ───────────────
    const translateRes = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: shuffled,
          source: "de",
          target: "es",
          format: "text",
        }),
      }
    );
    const translateData = await translateRes.json();
    if (!translateData.data?.translations) {
      console.error("Google Translate error:", JSON.stringify(translateData));
      return res.status(502).json({ error: "Error en Google Translate" });
    }
    const translations = translateData.data.translations.map(t => t.translatedText);

    // ── 2. Groq: generar fonética + tip para todas en una sola llamada ────────
    const pairs = shuffled.map((w, i) => `${i + 1}. "${w}" = "${translations[i]}"`).join("\n");
    const groqPrompt = `Para estas palabras/frases en alemán con su traducción al español, genera fonética y un consejo corto.

${pairs}

Responde SOLO con este JSON exacto, sin texto extra:
{"items":[{"phonetic":"pronunciación silábica en MAYÚSCULAS","tip":"consejo útil máx 8 palabras"}]}

Exactamente ${shuffled.length} items en el mismo orden. Fonética en mayúsculas silábicas como: "ikh GAY-e", "dee FRAU", etc.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "Eres experto en fonética alemana. Responde SOLO con JSON válido sin texto extra ni backticks." },
          { role: "user", content: groqPrompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    const groqData = await groqRes.json();
    if (groqData.error) {
      console.error("Groq error:", groqData.error.message);
      return res.status(502).json({ error: "Error en Groq" });
    }

    const groqText = groqData.choices?.[0]?.message?.content || "";
    const groqClean = groqText.replace(/```json|```/g, "").trim();
    const groqParsed = JSON.parse(groqClean);
    const items = groqParsed.items || [];

    // ── 3. Combinar todo en tarjetas ─────────────────────────────────────────
    const cards = shuffled.map((word, i) => ({
      front: word,
      back: translations[i] || "",
      phonetic: items[i]?.phonetic || word.toUpperCase(),
      tip: items[i]?.tip || "",
    }));

    return res.status(200).json({ cards });

  } catch (e) {
    console.error("Error en /api/generate:", e);
    return res.status(500).json({ error: "Error interno", detail: e.message });
  }
}
