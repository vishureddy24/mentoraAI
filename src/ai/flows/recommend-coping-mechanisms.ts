'use server';

/**
 * @fileOverview Recommends coping mechanisms based on the user's detected emotion.
 *
 * - recommendCopingMechanisms - A function that recommends coping mechanisms.
 * - RecommendCopingMechanismsInput - The input type for the recommendCopingMechanisms function.
 * - RecommendCopingMechanismsOutput - The return type for the recommendCopingMechanisms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendCopingMechanismsInputSchema = z.object({
  emotion: z
    .string()
    .describe("The user's detected emotion (e.g., Sad, Angry, Neutral, Happy)."),
});
export type RecommendCopingMechanismsInput = z.infer<
  typeof RecommendCopingMechanismsInputSchema
>;

const RecommendCopingMechanismsOutputSchema = z.object({
  recommendations: z
    .array(z.string())
    .describe('A list of recommended coping mechanisms.'),
});
export type RecommendCopingMechanismsOutput = z.infer<
  typeof RecommendCopingMechanismsOutputSchema
>;

export async function recommendCopingMechanisms(
  input: RecommendCopingMechanismsInput
): Promise<RecommendCopingMechanismsOutput> {
  return recommendCopingMechanismsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendCopingMechanismsPrompt',
  input: {schema: RecommendCopingMechanismsInputSchema},
  output: {schema: RecommendCopingMechanismsOutputSchema},
  prompt: `Based on the user's emotion ({{{emotion}}}), recommend a list of relevant coping mechanisms. The list should include activities like creative puzzles, the "Smash-the-Stress" AR mini-game, guided breathing exercises, and secure journaling. Tailor the recommendations to the detected emotion. For example, suggest the "Smash-the-Stress" game for anger and creative puzzles for sadness. Always include an option to "just talk".`,
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
