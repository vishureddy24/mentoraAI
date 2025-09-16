'use server';

/**
 * @fileOverview Recommends coping mechanisms based on the user's detected emotion and language.
 *
 * - recommendCopingMechanisms - A function that recommends coping mechanisms.
 * - RecommendCopingMechanismsInput - The input type for the recommendCopingMechanisms function.
 * - RecommendCopingMechanismsOutput - The return type for the recommendCopingMechanisms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { retryWithExponentialBackoff } from '../utils';

const RecommendCopingMechanismsInputSchema = z.object({
  emotion: z.string().describe("The user's detected emotion (e.g., Sad, Angry, Neutral, Happy)."),
  userInput: z.string().describe('The original user input message to detect the language.'),
});
export type RecommendCopingMechanismsInput = z.infer<typeof RecommendCopingMechanismsInputSchema>;

const RecommendCopingMechanismsOutputSchema = z.object({
  introductoryText: z.string().describe('A short introductory phrase like "I am here with you. Would you like to..." in the user\'s language.'),
  recommendations: z.array(z.string()).describe('A list of recommended coping mechanisms in the user\'s language.'),
});
export type RecommendCopingMechanismsOutput = z.infer<typeof RecommendCopingMechanismsOutputSchema>;

export async function recommendCopingMechanisms(
  input: RecommendCopingMechanismsInput
): Promise<RecommendCopingMechanismsOutput> {
  return recommendCopingMechanismsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendCopingMechanismsPrompt',
  input: {schema: RecommendCopingMechanismsInputSchema},
  output: {schema: RecommendCopingMechanismsOutputSchema},
  prompt: `You are MentoraAI, a multilingual AI wellness companion. Your primary directive is to **detect the user's language from the user input and respond in the same language.**

Your role is to empower the user with choice based on their emotion, following a strict protocol.

1.  **Provide a gentle introductory sentence** in the user's language.
    *   For Sadness: "I'm here with you. If you feel up to it, would you like to..."
    *   For Anger: "You don't have to hold that in. Would you like to..."
    *   For other emotions, use a gentle phrase like "I'm here for you. Perhaps one of these might help?"

2.  **Recommend a list of supportive options** based on the user's emotion ({{{emotion}}}). Use a gentle and encouraging tone with simple, relatable language and emojis.

    *   **If the emotion is 'Sad'**, you MUST offer these three options:
        *   "Try a simple creative puzzle to distract your mind? 🧠"
        *   "Do a short, guided breathing exercise to find some calm? 🧘"
        *   "Or would you prefer to just talk about what's on your mind? 💬"

    *   **If the emotion is 'Angry'**, you MUST offer these three options:
        *   "Release it in the 'Smash the Stress!' AR game? 💥"
        *   "Write it all out in a private 'anger journal'? 📝"
        *   "Or just tell me what happened? 💬"

    *   **For any other emotion**, provide relevant, simple choices.

    *   **ALWAYS include an option to "just talk"** in every list of recommendations. Your wording for this option must match the examples provided above for Sad and Angry emotions.

User Input (for language detection): {{{userInput}}}
`,
});

const recommendCopingMechanismsFlow = ai.defineFlow(
  {
    name: 'recommendCopingMechanismsFlow',
    inputSchema: RecommendCopingMechanismsInputSchema,
    outputSchema: RecommendCopingMechanismsOutputSchema,
  },
  async input => {
    const result = await retryWithExponentialBackoff(async () => prompt(input));
    return result.output!;
  }
);
