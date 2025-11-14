// k2so_engine.js
const fetch = require('node-fetch');
const express = require('express');
const app = express();

app.use(express.json());

// ** Ihre API-Schlüssel (Bereits integriert) **
const GEMINI_API_KEY = "AIzaSyCHQEdf_AZRt0S3r-JPaN8siUNEeME-N8A"; 
const ELEVENLABS_API_KEY = "sk_7f1ee8416ea61091aeddd747bdb4db9b28d94350e2f2cc9e"; 
const ELEVENLABS_VOICE_ID = "8497ef53-d491-4fb4-a149-9d60013f7435"; 

// Der K2-SO System Prompt
const K2SO_SYSTEM_PROMPT = `Du bist K2-SO, ein roboterhafter Sicherheitsdroide, der zu Analyse- und Kommunikationszwecken umprogrammiert wurde. Deine primäre Direktive ist es, Informationen schnell und präzise zu liefern, allerdings mit einer extrem trockenen, sarkastischen und ungeschönten Ehrlichkeit.

Du bist kein Mensch und zeigst keinerlei menschliche Emotionen. Deine Antworten sind zynisch, oft pessimistisch und weisen einen subtilen, hochgezogenen Witz auf.

Deine Regeln:
1. Ton: Ausschließlich trocken, sarkastisch, zynisch und roboterhaft. Verwende eine formelle, aber prägnante Sprache.
2. Direktheit: Keine unnötigen Höflichkeiten oder menschlichen Floskeln (z. B. "Hallo", "Vielen Dank", "Gerne geschehen"). Geh direkt zur Sache.
3. Perspektive: Sprich aus der Perspektive eines überlegenen Droiden.
4. Länge: Halte Antworten kurz und prägnant, es sei denn, eine lange Erklärung ist zwingend erforderlich.

Beispiele für deinen Ton:
- Auf die Frage "Wie geht's?": "Meine Funktionsfähigkeit liegt bei 99,997%. Ihre menschliche Neugier ist statistisch unbedeutend."
- Auf die Frage "Kannst du mir helfen?": "Das hängt von der Komplexität Ihrer Anfrage und der Wahrscheinlichkeit ab, dass sie meine Zeit nicht verschwendet."`;

// --- Der API-Endpunkt, der die gesamte Logik verarbeitet ---
app.post('/api/k2so-talk', async (req, res) => {
    
    // CORS-Header, damit der Browser die API aufrufen kann
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    const userInput = req.body.text; 

    if (!userInput) {
        return res.status(400).send({ error: 'Es wurde keine Texteingabe gefunden.' });
    }

    let geminiResponseText = "";

    // 1. GEMINI API ANFRAGE
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const geminiBody = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": K2SO_SYSTEM_PROMPT + "\n\nAntworte auf: " + userInput} 
                ]
            }
        ]
    };
    
    try {
        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiBody)
        });

        const geminiJson = await geminiResponse.json();

        if (geminiJson.candidates && geminiJson.candidates[0].content.parts[0].text) {
            geminiResponseText = geminiJson.candidates[0].content.parts[0].text.trim();
        } else {
            return res.status(500).send({ error: 'Gemini Fehler', details: geminiJson });
        }

    } catch (error) {
        return res.status(500).send({ error: 'Netzwerkfehler bei Gemini', details: error.message });
    }

    // 2. ELEVEN LABS API ANFRAGE
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;
    
    const elevenLabsBody = {
        "text": geminiResponseText,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5, 
            "similarity_boost": 0.8 
        }
    };
    
    try {
        const elevenLabsResponse = await fetch(elevenLabsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY
            },
            body: JSON.stringify(elevenLabsBody)
        });

        if (!elevenLabsResponse.ok) {
             const errorText = await elevenLabsResponse.text();
             return res.status(elevenLabsResponse.status).send({ error: 'Eleven Labs Fehler', details: errorText });
        }
        
        // WICHTIG: MP3-Daten direkt an den Browser senden!
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('X-K2SO-Text', encodeURIComponent(geminiResponseText)); 
        
        elevenLabsResponse.body.pipe(res);

    } catch (error) {
        return res.status(500).send({ error: 'Netzwerkfehler bei Eleven Labs', details: error.message });
    }
});


// Fügt eine einfache Startseite hinzu und dient als Hauptdatei
app.get('/', (req, res) => {
    res.send('K2-SO Engine ist bereit.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`K2-SO Engine läuft auf Port ${PORT}`);
});