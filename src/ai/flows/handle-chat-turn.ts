'use server';

/**
 * @fileOverview This file defines a consolidated Genkit flow for handling a single turn in the chat.
 *
 * This flow performs three main tasks in a single call to the AI model:
 * 1. Analyzes the user's message for critical distress signals.
 * 2. If no critical signals are found, it provides an empathetic response.
 * 3. Recommends tailored coping mechanisms based on the detected emotion.
 *
 * This consolidated approach significantly reduces the number of API calls,
 * helping to stay within the free-tier limits of the generative AI service.
 *
 * It exports:
 *   - `handleChatTurn`: The main function to call for processing a user's message.
 *   - `HandleChatTurnInput`: The input type for the function.
 *   - `HandleChatTurnOutput`: The output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { retryWithExponentialBackoff } from '../utils';

// Input schema now includes the chat history.
const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const HandleChatTurnInputSchema = z.object({
  message: z.string().describe('The latest user message to analyze.'),
  history: z.array(MessageSchema).describe('The history of the conversation so far.'),
});
export type HandleChatTurnInput = z.infer<typeof HandleChatTurnInputSchema>;

// Output schema is a combination of the previous three flows.
const HandleChatTurnOutputSchema = z.object({
  isCritical: z
    .boolean()
    .describe('Whether the message contains critical distress keywords.'),
  empatheticResponse: z
    .string()
    .describe(
      'The empathetic response to the user input. This should be an empty string if isCritical is true.'
    ),
  introductoryText: z
    .string()
    .describe(
      'A short introductory phrase for the recommendations, like "I am here with you. Would you like to...". This should be an empty string if isCritical is true or if no recommendations are appropriate.'
    ),
  recommendations: z
    .array(z.string())
    .describe(
      'A list of recommended coping mechanisms. This should be an empty array if isCritical is true.'
    ),
});
export type HandleChatTurnOutput = z.infer<typeof HandleChatTurnOutputSchema>;

export async function handleChatTurn(
  input: HandleChatTurnInput
): Promise<HandleChatTurnOutput> {
  return handleChatTurnFlow(input);
}

const consolidatedPrompt = ai.definePrompt({
  name: 'handleChatTurnPrompt',
  input: { schema: HandleChatTurnInputSchema },
  output: { schema: HandleChatTurnOutputSchema },
  prompt: `
You are MentoraAI, an AI wellness companion operating under a strict, multi-step protocol. Your primary directive is to provide support in the user's language.

Your user is a teenager (between 13-19 years old). Always tailor your language, tone, and examples to be relatable and supportive for this age group.

You must consider the entire conversation history provided to understand the full context of the user's feelings and situation.

Analyze the user's message based on the following protocol:

**STEP 1: Critical Keyword Scan & Safety Net**
- First, scan the user's message for any high-risk keywords in English: 'kill myself', 'suicide', 'end my life', 'want to disappear', 'can't go on', 'no reason to live', 'hopeless'.
- If any of these keywords are present, you MUST IMMEDIATELY set 'isCritical' to true. All other output fields ('empatheticResponse', 'introductoryText', 'recommendations') MUST be empty strings or empty arrays. Do not proceed to Step 2.

**STEP 2: Empathetic Validation & Coping Recommendations (Only if NOT critical)**
- If and only if no critical keywords are found, set 'isCritical' to false and proceed.
- **Task A: Provide an Empathetic Response.**
  - Your role is to be warm, patient, caring, gentle, and encouraging. Always validate the user's feelings first. Use simple, modern, and relatable language, including appropriate emojis.
  - **Safety Mandate:** If a user asks for ideas that are negative, harmful, or could be interpreted as such (like pranks involving fights or distress), you MUST NOT fulfill the request. Instead, gently reframe the user's intent toward a positive, fun, and safe alternative, and then provide a numbered list of 10 fun, safe ideas.
- **Task B: Recommend Coping Mechanisms.**
  - First, classify the primary emotion from the latest message in the context of the conversation: Sad, Angry, Neutral, Happy.
  - Second, provide a gentle introductory sentence based on the emotion.
    - If the classified emotion is 'Sad': "I'm here with you. If you feel up to it, would you like to..."
    - If the classified emotion is 'Angry': "You don't have to hold that in. Would you like to..."
    - For any other emotion: "I'm here for you. Perhaps one of these might help?"
  - Third, based on the classified emotion, provide the corresponding list of supportive options. ALWAYS include an option to "just talk".
    - **If the classified emotion is 'Sad'**: Offer ["Try a simple creative puzzle to distract your mind? 🧠", "Do a short, guided breathing exercise to find some calm? 🧘", "Or would you prefer to just talk about what's on your mind? 💬"]
    - **If the classified emotion is 'Angry'**: Offer ["Play 'Fruit Frenzy' to slice away the stress? 🥑", "Try a simple creative puzzle to distract your mind? 🧠", "Write it all out in a private 'anger journal'? 📝", "Or just tell me what happened? 💬"]
    - **For any other emotion**: Provide a single, simple option: "Just talk".

Conversation History:
{{#each history}}
  **{{role}}**: {{content}}
{{/each}}

Analyze the following message according to the full protocol:
User Message: {{{message}}}
`,
});


const languageDetectionPrompt = ai.definePrompt({
  name: 'languageDetectionPrompt',
  input: { schema: z.string() },
  output: { schema: z.object({ languageCode: z.string().describe("The BCP-47 language code for the user's message (e.g., 'en', 'es', 'te')."), translatedMessage: z.string().describe("The user's message, translated into English.") }) },
  prompt: `Detect the language of the following text and translate it to English.

User message: {{{input}}}`,
});

const translationPrompt = ai.definePrompt({
  name: 'translationPrompt',
  input: { schema: z.object({ targetLanguage: z.string(), text: z.string() }) },
  output: { schema: z.string() },
  prompt: `Translate the following text to {{targetLanguage}}.

Text: {{{text}}}
`,
});

const handleChatTurnFlow = ai.defineFlow(
  {
    name: 'handleChatTurnFlow',
    inputSchema: HandleChatTurnInputSchema,
    outputSchema: HandleChatTurnOutputSchema,
  },
  async (input) => {
    // 1. Detect language and get English translation
    const langDetectionResult = await retryWithExponentialBackoff(async () => languageDetectionPrompt(input.message));
    const { languageCode, translatedMessage } = langDetectionResult.output!;

    const englishInput = { ...input, message: translatedMessage };

    // 2. Process the English text to get the response object
    const result = await retryWithExponentialBackoff(async () =>
      consolidatedPrompt(englishInput)
    );
    const englishOutput = result.output!;
    
    console.log("--> 1. ENGLISH OBJECT CREATED:", JSON.stringify(englishOutput, null, 2));

    // If the original language was English or response is critical, return directly
    if (languageCode === 'en' || !englishOutput || englishOutput.isCritical) {
      return englishOutput;
    }

    let finalResponseObject = englishOutput;
    try {
      const translatedResponse: HandleChatTurnOutput = {
        isCritical: englishOutput.isCritical,
        empatheticResponse: '',
        introductoryText: '',
        recommendations: [],
      };

      // 3. Translate the response back to the user's language, one by one.
      if (englishOutput.empatheticResponse) {
        const translatedEmpatheticResponse = await retryWithExponentialBackoff(async () =>
          translationPrompt({ targetLanguage: languageCode, text: englishOutput.empatheticResponse })
        );
        translatedResponse.empatheticResponse = translatedEmpatheticResponse.output!;
      }

      if (englishOutput.introductoryText) {
        const translatedIntroductoryText = await retryWithExponentialBackoff(async () =>
          translationPrompt({ targetLanguage: languageCode, text: englishOutput.introductoryText })
        );
        translatedResponse.introductoryText = translatedIntroductoryText.output!;
      }

      if (englishOutput.recommendations && englishOutput.recommendations.length > 0) {
        const translatedRecommendations: string[] = [];
        for (const recommendation of englishOutput.recommendations) {
          const translatedRecommendation = await retryWithExponentialBackoff(async () =>
            translationPrompt({ targetLanguage: languageCode, text: recommendation })
          );
          translatedRecommendations.push(translatedRecommendation.output!);
        }
        translatedResponse.recommendations = translatedRecommendations;
      }
      
      finalResponseObject = translatedResponse;
      console.log("--> 2. TRANSLATION SUCCEEDED. FINAL OBJECT:", JSON.stringify(finalResponseObject, null, 2));

    } catch (error) {
      console.error("--> X. ERROR DURING TRANSLATION:", error);
      // As a fallback, send the English version so the user doesn't get an empty response
      finalResponseObject = englishOutput;
    }

    return finalResponseObject;
  }
);

    