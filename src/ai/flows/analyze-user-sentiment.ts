'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing user sentiment.
 *
 * - analyzeUserSentiment - An asynchronous function that takes user input and returns sentiment analysis.
 * - AnalyzeUserSentimentInput - The input type for the analyzeUserSentiment function.
 * - AnalyzeUserSentimentOutput - The return type for the analyzeUserSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeUserSentimentInputSchema = z.object({
  message: z.string().describe('The user message to analyze.'),
});
export type AnalyzeUserSentimentInput = z.infer<typeof AnalyzeUserSentimentInputSchema>;

const AnalyzeUserSentimentOutputSchema = z.object({
  emotion: z
    .enum(['Sad', 'Angry', 'Neutral', 'Happy'])
    .describe('The primary emotion detected in the message.'),
  intensity: z
    .string()
    .describe('The intensity of the emotion (mild vs. severe).'),
  keywords: z.array(z.string()).describe('Keywords indicating critical distress.'),
});
export type AnalyzeUserSentimentOutput = z.infer<typeof AnalyzeUserSentimentOutputSchema>;

export async function analyzeUserSentiment(input: AnalyzeUserSentimentInput): Promise<AnalyzeUserSentimentOutput> {
  return analyzeUserSentimentFlow(input);
}

const analyzeUserSentimentPrompt = ai.definePrompt({
  name: 'analyzeUserSentimentPrompt',
  input: {schema: AnalyzeUserSentimentInputSchema},
  output: {schema: AnalyzeUserSentimentOutputSchema},
  prompt: `Analyze the sentiment of the following message and detect the emotion, intensity, and any keywords indicating critical distress.\n\nMessage: {{{message}}}`,
});

const analyzeUserSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeUserSentimentFlow',
    inputSchema: AnalyzeUserSentimentInputSchema,
    outputSchema: AnalyzeUserSentimentOutputSchema,
  },
  async input => {
    const {output} = await analyzeUserSentimentPrompt(input);
    return output!;
  }
);
