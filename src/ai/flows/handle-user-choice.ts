'use server';

/**
 * @fileOverview This file defines a Genkit flow for handling user choices from the chat interface.
 * It now supports multilingual responses by translating the final output.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { retryWithExponentialBackoff } from '../utils';

// Input now accepts a languageCode to determine the response language.
const HandleUserChoiceInputSchema = z.object({
  action: z.string().describe("The action identifier for the user's choice (e.g., 'start_puzzle')."),
  languageCode: z.string().optional().default('en').describe("The ISO 639-1 code for the user's language (e.g., 'en', 'te')."),
});
export type HandleUserChoiceInput = z.infer<typeof HandleUserChoiceInputSchema>;

// Output remains the same.
const HandleUserChoiceOutputSchema = z.object({
  response: z.string().describe('The initial content or response for the chosen activity.'),
  activity: z.string().optional().describe("An identifier for the activity component to render, if any (e.g., 'puzzles')."),
});
export type HandleUserChoiceOutput = z.infer<typeof HandleUserChoiceOutputSchema>;

const translationPrompt = ai.definePrompt({
    name: 'choiceTranslationPrompt',
    input: { schema: z.object({ targetLanguage: z.string(), text: z.string() }) },
    output: { schema: z.string() },
    prompt: `Translate the following English text to the language with this ISO 639-1 code '{{targetLanguage}}': "{{text}}"`,
});


const handleUserChoiceFlow = ai.defineFlow(
  {
    name: 'handleUserChoiceFlow',
    inputSchema: HandleUserChoiceInputSchema,
    outputSchema: HandleUserChoiceOutputSchema,
  },
  async (input) => {
    let result;

    // The core logic remains in English for stability and ease of maintenance.
    switch (input.action) {
      case 'start_breathing':
        result = {
          response: "Of course. Find a comfortable position. We'll start with a simple breathing exercise to help calm your mind.",
          activity: 'breathing',
        };
        break;
      case 'start_puzzle':
        result = {
          response: "Great choice. Let's engage your mind with a little puzzle. Here's one for you.",
          activity: 'puzzles',
        };
        break;
      case 'start_fruit_slicer':
        result = {
          response: "Let's play Fruit Frenzy! Tap the fruit, but not the bombs.",
          activity: 'fruit-slicer',
        };
        break;
      case 'start_journaling':
        result = {
          response: "This is a safe space to let it all out. Write down whatever is on your mind.",
          activity: 'journal',
        };
        break;
      case 'start_talk':
        result = {
          response: "Of course. I'm here to listen. What's on your mind?",
        };
        break;
      default:
        result = {
          response: "I'm sorry, I didn't understand that choice. Let's just talk. How can I help?",
        };
        break;
    }

    // This is the crucial final step: translate the response if the user's language is not English.
    if (input.languageCode !== 'en' && result.response) {
        console.log(`--> Translating response from English to '${input.languageCode}'...`);
        try {
            const translatedResult = await retryWithExponentialBackoff(async () =>
              translationPrompt({ targetLanguage: input.languageCode!, text: result.response })
            );
            result.response = translatedResult.output!;
        } catch (error) {
            console.error("--> ERROR during translation:", error);
            // If translation fails for any reason, the original English text will be sent as a safe fallback.
        }
    }
    
    console.log("--> BACKEND SENDING (Final):", result);
    return result;
  }
);

// The exported function remains the same.
export async function handleUserChoice(input: HandleUserChoiceInput): Promise<HandleUserChoiceOutput> {
  return handleUserChoiceFlow(input);
}