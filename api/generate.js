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

  const WORD_BANK = {
    "A1-Vocabulario": [
      "das Haus","der Mann","die Frau","das Kind","der Hund","die Katze","das Wasser",
      "das Brot","die Milch","der Apfel","das Buch","der Stift","die Schule","das Auto",
      "der Bus","der Zug","die Straße","das Geld","der Tag","die Nacht","das Jahr",
      "der Monat","die Woche","das Wetter","die Sonne","der Regen","der Baum","die Blume",
      "das Tier","der Vogel","der Fisch","das Fleisch","das Gemüse","die Suppe","der Käse",
      "die Butter","das Ei","der Kaffee","der Tee","die Stadt","das Hotel","der Bahnhof",
      "das Restaurant","die Küche","das Badezimmer","der Tisch","der Stuhl","das Bett",
      "das Fenster","die Tür","die Lampe","das Telefon","der Computer","die Uhr",
      "das Hemd","die Hose","die Jacke","der Schuh","die Tasche",
    ],
    "A2-Vocabulario": [
      "die Gesundheit","der Arzt","die Umwelt","die Natur","der Wald","der Fluss",
      "das Meer","die Reise","die Reservierung","die Rechnung","der Beruf","das Gehalt",
      "die Firma","die Technologie","das Internet","die Nachricht","die Einladung",
      "das Geschenk","der Geburtstag","die Hochzeit","die Regierung","das Gesetz",
      "die Freiheit","die Bildung","die Universität","der Vertrag","die Versicherung",
      "das Konto","der Urlaub","die Küste","der Hafen","die Brücke","das Museum",
      "das Konzert","die Mannschaft","die Grenze","die Sprache","die Kultur","die Tradition",
      "die Möglichkeit","die Gelegenheit","der Unterschied","die Gewohnheit",
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
      "teilnehmen","organisiern","planen","beschreiben","vergleichen","empfehlen",
      "erlauben","verbieten","versprechen","bemerken","übersetzen","sich gewöhnen",
    ],
    "A1-Frases": [
      "Guten Morgen","Guten Tag","Guten Abend","Gute Nacht","Auf Wiedersehen","Tschüss",
      "Wie heißt du","Ich heiße","Wie geht es dir","Mir geht es gut","Danke schön",
      "Bitte","Entschuldigung","Es tut mir leid","Ich verstehe nicht","Sprechen Sie Englisch",
      "Wo ist die Toilette","Was kostet das","Ich möchte","Die Rechnung bitte",
      "Ich habe Hunger","Ich habe Durst","Hilfe","Ich bin krank","Guten Appetit","Prost",
      "Wie alt bist du","Ich komme aus","Wo wohnen Sie","Ich brauche einen Arzt",
    ],
    "A2-Frases": [
      "Könnten Sie mir helfen","Ich hätte gern","Das macht nichts","Das stimmt",
      "Ich bin anderer Meinung","Ich rufe Sie zurück","Können wir uns treffen",
      "Ich freue mich darauf","Das war sehr lecker","Ich habe mich geirrt",
      "Das hängt davon ab","Ich mache mir Sorgen","Alles wird gut","Das klingt gut",
      "Ich weiß es nicht genau","Wie war dein Tag","Pass auf dich auf","Viel Glück",
      "Herzlichen Glückwunsch","Ich bin einverstanden","Das ist mir egal",
      "Kannst du mir erklären","Es war ein langer Tag","Ich freue mich dich zu sehen",
    ],
  };

  // ── GRAMÁTICA: solo Groq con lógica pedagógica ────────────────────────────
  if (category === "Gramática") {
    const used = new Set(existingFronts);
    const avoidList = [...used].slice(-15).join(", ");

    const groqPrompt = `Eres un profesor experto en alemán para hispanohablantes de nivel ${level}.
Genera exactamente 8 tarjetas de gramática alemana nivel ${level}.
${avoidList ? `Evita estos temas ya vistos: ${avoidList}` : ""}

Cada tarjeta enseña UNA regla gramatical clara y útil:
- front: nombre del concepto gramatical (ej: "Perfekt mit haben")
- back: explicación en español + ejemplo concreto (ej: "Pasado con haben · Ich habe gegessen ✓")
- phonetic: oración de ejemplo en alemán (ej: "Ich habe das Buch gelesen.")
- tip: truco o regla mnemotécnica corta en español (ej: "Verbos de acción usan haben")

Responde SOLO con JSON válido sin backticks ni texto extra:
{"cards":[{"front":"...","back":"...","phonetic":"...","tip":"..."}]}

Temas para nivel ${level === "A1"
  ? "A1: artículos der/die/das, conjugación de sein y haben, negación con nicht y kein, plural de sustantivos, casos Nominativ y Akkusativ, verbos modales können/müssen, posición del verbo en oración, preguntas con W-Fragen, verbos separables, pronombres personales"
  : "A2: Perfekt con haben y sein, Präteritum de sein y haben, Komparativ y Superlativ, caso Dativ, preposiciones con Dativ y Akkusativ, verbos reflexivos, Konjunktiv II con würde, Passiv Präsens, oraciones con weil/dass/wenn, Futur con werden"}`;

    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: "Eres experto en gramática alemana. Responde SOLO con JSON válido sin texto extra ni backticks." },
            { role: "user", content: groqPrompt },
          ],
          temperature: 0.5,
          max_tokens: 1200,
        }),
      });

      const groqData = await groqRes.json();
      if (groqData.error) return res.status(502).json({ error: "Error Groq gramática: " + groqData.error.message });

      const text = groqData.choices?.[0]?.message?.content || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return res.status(200).json({ cards: parsed.cards || [] });
    } catch (e) {
      return res.status(500).json({ error: "Error gramática", detail: e.message });
    }
  }

  // ── VOCABULARIO / VERBOS / FRASES: Google Translate + Groq ───────────────
  const key = `${level}-${category}`;
  const allWords = WORD_BANK[key] || [];
  const used = new Set(existingFronts);
  const available = allWords.filter(w => !used.has(w));
  const shuffled = available.sort(() => Math.random() - 0.5).slice(0, 8);

  if (shuffled.length === 0) return res.status(200).json({ cards: [] });

  try {
    // 1. Google Translate
    const translateRes = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: shuffled, source: "de", target: "es", format: "text" }),
      }
    );
    const translateData = await translateRes.json();
    if (!translateData.data?.translations) return res.status(502).json({ error: "Error Google Translate" });
    const translations = translateData.data.translations.map(t => t.translatedText);

    // 2. Groq: fonética + tip
    const pairs = shuffled.map((w, i) => `${i + 1}. "${w}" = "${translations[i]}"`).join("\n");
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
          { role: "user", content: `Para estas palabras alemanas genera fonética y consejo pedagógico para hispanohablantes.\n\n${pairs}\n\nResponde SOLO con JSON:\n{"items":[{"phonetic":"MAYÚSCULAS silábicas","tip":"consejo máx 8 palabras"}]}\nExactamente ${shuffled.length} items en el mismo orden.` },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    const groqData = await groqRes.json();
    if (groqData.error) return res.status(502).json({ error: "Error Groq: " + groqData.error.message });

    const groqText = groqData.choices?.[0]?.message?.content || "";
    const groqParsed = JSON.parse(groqText.replace(/```json|```/g, "").trim());
    const items = groqParsed.items || [];

    const cards = shuffled.map((word, i) => ({
      front: word,
      back: translations[i] || "",
      phonetic: items[i]?.phonetic || word.toUpperCase(),
      tip: items[i]?.tip || "",
    }));

    return res.status(200).json({ cards });
  } catch (e) {
    return res.status(500).json({ error: "Error interno", detail: e.message });
  }
}
