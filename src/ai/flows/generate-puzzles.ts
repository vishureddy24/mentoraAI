'use server';

/**
 * @fileOverview A Genkit flow to generate a list of puzzles.
 *
 * - generatePuzzles - A function that returns a list of puzzles.
 * - GeneratePuzzlesOutput - The return type for the generatePuzzles function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { retryWithExponentialBackoff } from '../utils';

const PuzzleSchema = z.object({
  type: z.string().describe("The category of the puzzle (e.g., 'Riddle', 'Logic Puzzle', 'Word Challenge')."),
  question: z.string().describe('The text of the puzzle question.'),
  answer: z.string().describe('The correct answer to the puzzle.'),
});

const GeneratePuzzlesOutputSchema = z.object({
  puzzles: z
    .array(PuzzleSchema)
    .length(10)
    .describe('An array of 10 unique and engaging puzzles for a user seeking a mental distraction.'),
});

export type GeneratePuzzlesOutput = z.infer<typeof GeneratePuzzlesOutputSchema>;

export async function generatePuzzles(): Promise<GeneratePuzzlesOutput> {
  return generatePuzzlesFlow();
}

const generatePuzzlesPrompt = ai.definePrompt({
  name: 'generatePuzzlesPrompt',
  output: { schema: GeneratePuzzlesOutputSchema },
  prompt: `
You are an expert puzzle master. Your task is to generate a list of 10 unique and engaging puzzles for a user looking for a mental distraction.
The puzzles should be a mix of types: riddles, logic puzzles, and word challenges.
The questions should be clear, and the answers should be concise (typically one or a few words).
Do not repeat puzzles.
`,
});

const generatePuzzlesFlow = ai.defineFlow(
  {
    name: 'generatePuzzlesFlow',
    outputSchema: GeneratePuzzlesOutputSchema,
  },
  async () => {
    const result = await retryWithExponentialBackoff(async () => generatePuzzlesPrompt());
    return result.output!;
  }
);
