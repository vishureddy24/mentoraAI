'use server';

/**
 * @fileOverview This file defines a consolidated Genkit flow for handling a single turn in the chat.
 *
 * This flow performs these main tasks:
 * 1. Detects the user's language and translates their message to English for analysis.
 * 2. Analyzes the English message for critical distress signals.
 * 3. If not critical, generates an empathetic response and coping recommendations in English.
 * 4. Translates the English response object back into the user's original language.
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

// Create a Zod schema for the prompt output by omitting the languageCode
const PromptOutputSchema = HandleChatTurnOutputSchema.omit({ languageCode: true });


// ---------------- MAIN ENTRY ----------------

export async function handleChatTurn(
  input: HandleChatTurnInput
): Promise<HandleChatTurnOutput> {
  return handleChatTurnFlow(input);
}

// ---------------- PROMPTS ----------------

const consolidatedPrompt = ai.definePrompt({
  name: 'handleChatTurnPrompt',
  input: { schema: HandleChatTurnInputSchema },
  output: { schema: PromptOutputSchema },
  prompt: `
You are MentoraAI, an AI wellness companion. Always reply in warm, teen-friendly, empathetic language.
You will be given the conversation history and the latest user message. Use the history to understand the context.

STRICT RULES:
1. Keep tone empathetic, simple, and supportive.
2. Responses should be short (2–3 sentences).

Protocol:
**Step 1 – Critical Scan**
If the user message contains clear, unambiguous, and high-intent keywords of self-harm like: 'kill myself', 'suicide', 'end my life', 'want to die' →
Return: { isCritical: true, empatheticResponse: "", introductoryText: "", recommendations: [] }

**Step 2 – Greeting Check**
If the conversation has just started and the user message is a simple greeting like "Hi", "Hello", "Hey", "Namaste", "Namaskaram", etc. and NOT expressing any emotion →
Return: { isCritical: false, empatheticResponse: "Hi there! I'm MentoraAI, your personal companion. How are you feeling today?", introductoryText: "", recommendations: [] }

**Step 3 – Empathetic Response + Coping**
If not critical and not a simple greeting:
- Respond in a caring tone. Validate their feelings. Emojis are allowed.
- Classify emotion: Sad / Angry / Neutral / Happy.
- Intro text depends on emotion:
  - Sad → "I'm here with you. If you feel up to it, would you like to..."
  - Angry → "It’s okay to feel angry. When you're ready, would you like to..."
  - Other → "I'm here for you. Perhaps one of these might help?"
- Coping recommendations (use these EXACT strings):
  - Sad → ["try a simple puzzle 🧠", "do a breathing exercise 🧘", "just talk 💬"]
  - Angry → ["play 'fruit frenzy' 🥑", "write in a journal 📝", "just talk 💬"]
  - Other → ["just talk 💬"]

Conversation History:
{{#each history}}
  **{{role}}**: {{content}}
{{/each}}

Analyze and respond to the latest user message based on the history.
User Message: {{{message}}}
`,
});

const languageDetectionPrompt = ai.definePrompt({
  name: 'languageDetectionPrompt',
  input: { schema: z.string() },
  output: {
    schema: z.object({
      languageCode: z.string().describe("BCP-47 language code. Supported codes: 'en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'gu', 'pa', 'mr'. Default to 'en' if unsure."),
      translatedMessage: z.string().describe("Message translated into English."),
    }),
  },
  prompt: `
Detect the language of the following text. The supported languages and their BCP-47 codes are:
- English (en)
- Hindi (hi)
- Telugu (te)
- Tamil (ta)
- Kannada (kn)
- Malayalam (ml)
- Bengali (bn)
- Gujarati (gu)
- Punjabi (pa)
- Marathi (mr)

If you can determine the language is one of the supported languages, return its BCP-47 code. If you cannot determine the language or it is not in the supported list, default to 'en'.

Also translate the text to English.

User message: {{{input}}}
`,
});

const translationPrompt = ai.definePrompt({
  name: 'translationPrompt',
  input: { schema: z.object({ targetLanguage: z.string(), text: z.string() }) },
  output: { schema: z.string() },
  prompt: `Translate the following English text to the language with this BCP-47 code: {{targetLanguage}}.

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
    const { languageCode = 'en', translatedMessage } = langDetectionResult.output!;
    const englishInput = { ...input, message: translatedMessage };

    // 2. Process English text to get the base response object
    const result = await retryWithExponentialBackoff(async () =>
      consolidatedPrompt(englishInput)
    );
    const englishOutput = result.output;

    // If there's no valid output, return a default safe response
    if (!englishOutput) {
        return {
            isCritical: false,
            empatheticResponse: 'Sorry, something went wrong. Could you please rephrase?',
            introductoryText: '',
            recommendations: [],
            languageCode: 'en',
        };
    }

    // If the message is critical, return immediately without translation
    if (englishOutput.isCritical) {
      return { ...englishOutput, languageCode };
    }

    // If the user's language is English, return the English response directly
    if (languageCode === 'en') {
      return { ...englishOutput, languageCode };
    }

    // 3. Translate the English response back to the user’s language
    const finalResponse: HandleChatTurnOutput = {
      ...englishOutput,
      languageCode: languageCode,
    };

    try {
      if (englishOutput.empatheticResponse) {
        const translationResult = await retryWithExponentialBackoff(() => 
          translationPrompt({ targetLanguage: languageCode, text: englishOutput.empatheticResponse })
        );
        finalResponse.empatheticResponse = translationResult.output!;
      }

      if (englishOutput.introductoryText) {
        const translationResult = await retryWithExponentialBackoff(() => 
          translationPrompt({ targetLanguage: languageCode, text: englishOutput.introductoryText })
        );
        finalResponse.introductoryText = translationResult.output!;
      }

      if (englishOutput.recommendations?.length) {
        const translatedRecs: string[] = [];
        for (const rec of englishOutput.recommendations) {
           const translationResult = await retryWithExponentialBackoff(() => 
            translationPrompt({ targetLanguage: languageCode, text: rec })
          );
          translatedRecs.push(translationResult.output!);
        }
        finalResponse.recommendations = translatedRecs;
      }
    } catch (err) {
      console.error("Translation error -> fallback to English:", err);
      // If translation fails, return the untranslated English object but with the language code.
      return { ...englishOutput, languageCode };
    }
    
    return finalResponse;
  }
);
