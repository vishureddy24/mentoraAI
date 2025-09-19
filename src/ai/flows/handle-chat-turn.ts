'use server';

/**
 * @fileOverview This file defines a consolidated Genkit flow for handling a single turn in the chat.
 *
 * This flow performs three main tasks in a single call to the AI model:
 * 1. Detects language and translates to English (for model analysis).
 * 2. Analyzes the user's message for critical distress signals.
 * 3. If not critical, generates empathetic response + coping recommendations.
 * 4. Translates the response back to the user's original language (supports Indian languages).
 *
 * This ensures multilingual support while keeping within free-tier API limits.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { retryWithExponentialBackoff } from '../utils';

// ---------------- SCHEMAS ----------------

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const HandleChatTurnInputSchema = z.object({
  message: z.string().describe('The latest user message to analyze.'),
  history: z.array(MessageSchema).describe('The history of the conversation so far.'),
  languageCode: z.string().optional().describe('The BCP-47 language code of the user message.'),
});
export type HandleChatTurnInput = z.infer<typeof HandleChatTurnInputSchema>;

const HandleChatTurnOutputSchema = z.object({
  isCritical: z
    .boolean()
    .describe('Whether the message contains critical distress keywords.'),
  empatheticResponse: z
    .string()
    .describe(
      'The empathetic response to the user input. Empty string if isCritical is true.'
    ),
  introductoryText: z
    .string()
    .describe(
      'A short introductory phrase for recommendations. Empty string if isCritical or not applicable.'
    ),
  recommendations: z
    .array(z.string())
    .describe('List of coping mechanisms. Empty if isCritical.'),
  languageCode: z.string().optional().describe('The BCP-47 language code of the user message.'),
});
export type HandleChatTurnOutput = z.infer<typeof HandleChatTurnOutputSchema>;

// ---------------- MAIN ENTRY ----------------

export async function handleChatTurn(
  input: HandleChatTurnInput
): Promise<HandleChatTurnOutput> {
  return handleChatTurnFlow(input);
}

// ---------------- PROMPTS ----------------

// Consolidated prompt: English-only analysis
const consolidatedPrompt = ai.definePrompt({
  name: 'handleChatTurnPrompt',
  input: { schema: HandleChatTurnInputSchema },
  output: { schema: HandleChatTurnOutputSchema },
  prompt: `
You are MentoraAI, an AI wellness companion. Always reply in warm, teen-friendly, empathetic language.  

Protocol:  
**Step 1 – Critical Scan**  
If the user message contains clear, unambiguous, and high-intent keywords of self-harm like: 'kill myself', 'suicide', 'end my life', 'want to die' →  
Return: { isCritical: true, empatheticResponse: "", introductoryText: "", recommendations: [] }  

**Step 2 – Empathetic Response + Coping**  
If not critical:  
- Respond in caring tone. Validate feelings. Emojis allowed.  
- Classify emotion: Sad / Angry / Neutral / Happy.  
- Intro text depends on emotion:  
  - Sad → "I'm here with you. If you feel up to it, would you like to..."  
  - Angry → "You don't have to hold that in. Would you like to..."  
  - Other → "I'm here for you. Perhaps one of these might help?"  
- Coping recommendations:  
  - Sad → ["Try a simple creative puzzle 🧠", "Do a guided breathing exercise 🧘", "Or just talk 💬"]  
  - Angry → ["Play 'Fruit Frenzy' 🥑", "Try a puzzle 🧠", "Write in an anger journal 📝", "Or just talk 💬"]  
  - Other → ["Just talk 💬"]  

Conversation History:  
{{#each history}}  
  **{{role}}**: {{content}}  
{{/each}}  

Analyze and respond:  
User Message: {{{message}}}
`,
});

// Language detection + English translation
const languageDetectionPrompt = ai.definePrompt({
  name: 'languageDetectionPrompt',
  input: { schema: z.string() },
  output: {
    schema: z.object({
      languageCode: z.string().describe("BCP-47 language code (e.g., 'en', 'hi', 'te', 'ta', 'bn')."),
      translatedMessage: z.string().describe("Message translated into English."),
    }),
  },
  prompt: `
Detect the language of the following text.  
If it is in Hindi, Telugu, Tamil, Kannada, Malayalam, Bengali, Gujarati, Punjabi, Marathi, or English, return the correct BCP-47 code.  

Also translate it to English.  

User message: {{{input}}}
`,
});

// Translation (English → Target Language)
const translationPrompt = ai.definePrompt({
  name: 'translationPrompt',
  input: { schema: z.object({ targetLanguage: z.string(), text: z.string() }) },
  output: { schema: z.string() },
  prompt: `Translate the following text to {{targetLanguage}}.

Text: {{{text}}}`,
});

// ---------------- FLOW ----------------

const handleChatTurnFlow = ai.defineFlow(
  {
    name: 'handleChatTurnFlow',
    inputSchema: HandleChatTurnInputSchema,
    outputSchema: HandleChatTurnOutputSchema,
  },
  async (input) => {
    // 1. Detect language + translate to English
    const langDetectionResult = await retryWithExponentialBackoff(async () =>
      languageDetectionPrompt(input.message)
    );
    const { languageCode, translatedMessage } = langDetectionResult.output!;
    const englishInput = { ...input, message: translatedMessage };

    // 2. Process English text
    const result = await retryWithExponentialBackoff(async () =>
      consolidatedPrompt(englishInput)
    );
    let englishOutput = result.output!;
    englishOutput.languageCode = languageCode;
    console.log("--> ENGLISH OUTPUT:", JSON.stringify(englishOutput, null, 2));

    // If English or critical → return directly (languageCode will be passed through for safety net)
    if (languageCode === 'en' || !englishOutput || englishOutput.isCritical) {
      return englishOutput;
    }

    // 3. Translate back to user’s language
    let finalResponse: HandleChatTurnOutput = {
      ...englishOutput,
      empatheticResponse: '',
      introductoryText: '',
      recommendations: [],
    };

    try {
      if (englishOutput.empatheticResponse) {
        const t = await retryWithExponentialBackoff(async () =>
          translationPrompt({ targetLanguage: languageCode, text: englishOutput.empatheticResponse })
        );
        finalResponse.empatheticResponse = t.output!;
      }

      if (englishOutput.introductoryText) {
        const t = await retryWithExponentialBackoff(async () =>
          translationPrompt({ targetLanguage: languageCode, text: englishOutput.introductoryText })
        );
        finalResponse.introductoryText = t.output!;
      }

      if (englishOutput.recommendations?.length) {
        const translatedRecs: string[] = [];
        for (const rec of englishOutput.recommendations) {
          const t = await retryWithExponentialBackoff(async () =>
            translationPrompt({ targetLanguage: languageCode, text: rec })
          );
          translatedRecs.push(t.output!);
        }
        finalResponse.recommendations = translatedRecs;
      }
    } catch (err) {
      console.error("Translation error → fallback to English:", err);
      // If translation fails, return the untranslated English object.
      // The languageCode is still present.
      return englishOutput; 
    }

    console.log("--> FINAL OUTPUT:", JSON.stringify(finalResponse, null, 2));
    return finalResponse;
  }
);
