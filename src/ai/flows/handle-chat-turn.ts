'use server';

/**
 * @fileOverview This file defines a consolidated Genkit flow for handling a single turn in the chat.
 *
 * This flow performs three main tasks:
 * 1. Detects language and translates to English (for model analysis).
 * 2. Analyzes the user's message for critical distress signals.
 * 3. If not critical, generates an empathetic response + coping recommendations in English.
 * 4. Translates the English response back to the user's original language.
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

// Consolidated prompt for English analysis
const consolidatedPrompt = ai.definePrompt({
  name: 'handleChatTurnPrompt',
  input: { schema: HandleChatTurnInputSchema },
  output: { schema: PromptOutputSchema },
  prompt: `
You are MentoraAI, an AI wellness companion. Always reply in warm, teen-friendly, empathetic language.
You will be given the conversation history and the latest user message. Use the history to understand the context.

STRICT RULES:
1. Detect the language of the user’s input.
2. ALWAYS reply in the SAME language as the user’s input.
3. Keep tone empathetic, simple, and supportive.
4. Responses should be short (2–3 sentences).

Protocol:
**Step 1 – Critical Scan**
If the user message contains clear, unambiguous, and high-intent keywords of self-harm like: 'kill myself', 'suicide', 'end my life', 'want to die' →
Return: { isCritical: true, empatheticResponse: "", introductoryText: "", recommendations: [] }

**Step 2 – Greeting Check**
If the conversation has just started and the user message is a simple greeting like "Hi", "Hello", "Hey", etc. and NOT expressing any emotion →
Return: { isCritical: false, empatheticResponse: "Hi there! I'm MentoraAI, your personal companion. How are you feeling today?", introductoryText: "", recommendations: [] }

**Step 3 – Empathetic Response + Coping**
If not critical and not a simple greeting:
- Respond in caring tone. Validate feelings. Emojis allowed.
- Classify emotion: Sad / Angry / Neutral / Happy.
- Intro text depends on emotion:
  - Sad → "I'm here with you. If you feel up to it, would you like to..."
  - Angry → "You don't have to hold that in. Would you like to..."
  - Other → "I'm here for you. Perhaps one of these might help?"
- Coping recommendations (use these EXACT strings):
  - Sad → ["try a simple puzzle 🧠", "do a breathing exercise 🧘", "or just talk 💬"]
  - Angry → ["play 'fruit frenzy' 🥑", "try a simple puzzle 🧠", "write in a journal 📝", "or just talk 💬"]
  - Other → ["just talk 💬"]

Conversation History:
{{#each history}}
  **{{role}}**: {{content}}
{{/each}}

Analyze and respond to the latest user message based on the history.
User Message: {{{message}}}
`,
});

// Language detection + English translation prompt
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

// Translation (English → Target Language) prompt
const translationPrompt = ai.definePrompt({
  name: 'translationPrompt',
  input: { schema: z.object({ targetLanguage: z.string(), text: z.string() }) },
  output: { schema: z.string() },
  prompt: `Translate the following English text to the language with this ISO 639-1 code: {{targetLanguage}}.

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

    // 2. Process English text to get response object
    const result = await retryWithExponentialBackoff(async () =>
      consolidatedPrompt(englishInput)
    );
    let englishOutput = result.output!;
    console.log("--> ENGLISH OUTPUT:", JSON.stringify(englishOutput, null, 2));

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

    // If English or a critical message, return directly, but include the language code
    if (languageCode === 'en' || englishOutput.isCritical) {
      return { ...englishOutput, languageCode };
    }

    // 3. Translate the English response back to the user’s language
    let finalResponse: HandleChatTurnOutput = {
      ...englishOutput,
      languageCode: languageCode,
    };

    try {
      // Use sequential translation for better reliability
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
      console.error("Translation error → fallback to English:", err);
      // If translation fails, return the untranslated English object with the language code.
      return { ...englishOutput, languageCode };
    }

    console.log("--> FINAL OUTPUT:", JSON.stringify(finalResponse, null, 2));
    return finalResponse;
  }
);
