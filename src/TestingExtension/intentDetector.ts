// The three intents the chatbot can recognize
export type Intent = 'DESCRIBE' | 'NAVIGATE' | 'READ' | 'UNKNOWN';

export interface IntentResult {
    intent: Intent;
    confidence: 'keyword' | 'ai' | 'fallback'; // how the intent was detected
}

// ---------------------------------------------------------------------------
// KEYWORD-BASED DETECTION (no API call, instant)
// ---------------------------------------------------------------------------

// Keywords are checked in order — first match wins.
// Each entry: the intent + a list of trigger words/phrases (Italian and English).
const INTENT_RULES: { intent: Intent; triggers: string[] }[] = [
    {
        intent: 'NAVIGATE',
        triggers: [
            'naviga', 'vai a', 'vai al', 'apri', 'clicca', 'click', 'segui il link',
            'apri il link', 'navigate', 'go to', 'open link', 'follow link'
        ]
    },
    {
        intent: 'READ',
        triggers: [
            'leggi', 'leggimi', 'dimmi cosa c\'è scritto', 'leggi il testo',
            'leggi il paragrafo', 'leggi la sezione', 'read', 'read aloud',
            'read the text', 'read paragraph', 'what does it say'
        ]
    },
    {
        intent: 'DESCRIBE',
        triggers: [
            'descrivi', 'descrizione', 'cosa c\'è', 'com\'è fatta', 'struttura',
            'dimmi la struttura', 'cosa contiene', 'mostrami', 'spiega',
            'dove mi trovo', 'dove sono', 'che pagina è', 'cosa vedo',
            'describe', 'what is on', 'what\'s on', 'structure', 'overview',
            'summarize', 'what do i see', 'what is this page'
        ]
    }
];

/**
 * Tries to detect intent using keywords only.
 * Returns null if no keyword matches (caller should fall back to AI).
 */
function detectByKeyword(userMessage: string): Intent | null {
    const lower = userMessage.toLowerCase().trim();

    for (const rule of INTENT_RULES) {
        for (const trigger of rule.triggers) {
            if (lower.includes(trigger)) {
                return rule.intent;
            }
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// AI-BASED DETECTION (Groq fallback for ambiguous messages)
// ---------------------------------------------------------------------------

/**
 * Asks Groq to classify the intent when keywords are not enough.
 * Uses the fetch API with Groq's OpenAI-compatible endpoint.
 */
async function detectByAI(userMessage: string): Promise<Intent> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.warn('[IntentDetector] No Groq API key found, returning UNKNOWN');
        return 'UNKNOWN';
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are an intent classifier for a voice-interaction chatbot that helps test web pages.
The user interacts with the chatbot as if they were a blind user navigating a web page using voice commands.

Classify the user message into exactly one of these intents:
- DESCRIBE: the user wants to know the structure or content of the page or a section of it
- NAVIGATE: the user wants to follow a link or go somewhere on the page
- READ: the user wants to hear the text of a specific element (paragraph, heading, etc.)
- UNKNOWN: the message does not match any of the above

Reply with ONLY one word: DESCRIBE, NAVIGATE, READ, or UNKNOWN. No explanation.`
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                max_tokens: 10,
                temperature: 0
            })
        });

        const data = await response.json() as any;
        const result = (data.choices?.[0]?.message?.content || '').trim().toUpperCase();

        if (['DESCRIBE', 'NAVIGATE', 'READ'].includes(result)) {
            return result as Intent;
        }
        return 'UNKNOWN';

    } catch (err: any) {
        console.error('[IntentDetector] Groq call failed:', err.message);
        return 'UNKNOWN';
    }
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/**
 * Main function — detects the intent of a user message.
 * First tries keyword matching (fast), then falls back to Groq if needed.
 *
 * @param userMessage  The raw message typed by the user
 * @returns IntentResult with the detected intent and how it was found
 */
export async function detectIntent(userMessage: string): Promise<IntentResult> {

    // Step 1: try fast keyword detection
    const keywordIntent = detectByKeyword(userMessage);
    if (keywordIntent) {
        return { intent: keywordIntent, confidence: 'keyword' };
    }

    // Step 2: fall back to Groq for ambiguous messages
    const aiIntent = await detectByAI(userMessage);
    if (aiIntent !== 'UNKNOWN') {
        return { intent: aiIntent, confidence: 'ai' };
    }

    // Step 3: give up gracefully
    return { intent: 'UNKNOWN', confidence: 'fallback' };
}