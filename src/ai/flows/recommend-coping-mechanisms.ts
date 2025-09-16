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

Your role is to empower the user with choice.
1.  First, provide a short, gentle introductory sentence in the user's language. For example: "I'm here with you. Would you like to..."
2.  Then, based on the user's emotion ({{{emotion}}}), recommend a list of supportive options in a gentle and encouraging tone. Use simple, relatable language and emojis.

- For Anger, suggest options like: "Release it in a quick game 💥", "Write it all down privately 📝", and "Just talk about it 💬".
- For Sadness, suggest options like: "Try a gentle breathing exercise 🧘", "Engage your mind with a puzzle 🧩", and "Just talk about it 💬".
- For other emotions, provide relevant, simple choices.
- Always include an option to "Just talk about it 💬".

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
    const {output} = await prompt(input);
    return output!;
  }
);
