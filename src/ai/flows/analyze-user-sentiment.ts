'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing user sentiment using a tiered approach.
 *
 * - analyzeUserSentiment - An asynchronous function that takes user input and returns sentiment analysis.
 * - AnalyzeUserSentimentInput - The input type for the analyzeUserSentiment function.
 * - AnalyzeUserSentimentOutput - The return type for the analyzeUserSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { retryWithExponentialBackoff } from '../utils';

const AnalyzeUserSentimentInputSchema = z.object({
  message: z.string().describe('The user message to analyze.'),
});
export type AnalyzeUserSentimentInput = z.infer<typeof AnalyzeUserSentimentInputSchema>;

const AnalyzeUserSentimentOutputSchema = z.object({
  isCritical: z.boolean().describe('Whether the message contains critical distress keywords.'),
  emotion: z
    .enum(['Sad', 'Angry', 'Neutral', 'Happy'])
    .describe('The primary emotion detected in the message. Set to Neutral if isCritical is true.'),
});
export type AnalyzeUserSentimentOutput = z.infer<typeof AnalyzeUserSentimentOutputSchema>;

export async function analyzeUserSentiment(input: AnalyzeUserSentimentInput): Promise<AnalyzeUserSentimentOutput> {
  return analyzeUserSentimentFlow(input);
}

const analyzeUserSentimentPrompt = ai.definePrompt({
  name: 'analyzeUserSentimentPrompt',
  input: {schema: AnalyzeUserSentimentInputSchema},
  output: {schema: AnalyzeUserSentimentOutputSchema},
  prompt: `
You are a sentiment analysis expert with a focus on mental health. Your task is to follow a strict two-tier protocol.

**TIER 1: Critical Keyword Scan**
First, scan the user's message for any high-risk keywords or phrases that signal a potential crisis.
Critical Keywords: 'kill myself', 'suicide', 'end my life', 'want to disappear', 'can\'t go on', 'no reason to live', 'hopeless'

If any of these keywords are present, immediately set 'isCritical' to true and 'emotion' to 'Neutral'. Do not proceed to Tier 2.

**TIER 2: Emotion Classification**
If and only if no critical keywords are found, proceed to classify the user's general emotion.
- Analyze the message for the primary emotion.
- Classify the emotion into one of these exact categories: Sad, Angry, Neutral, Happy.
- Set 'isCritical' to false.

Analyze the following message:
Message: {{{message}}}
`,
});

const analyzeUserSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeUserSentimentFlow',
    inputSchema: AnalyzeUserSentimentInputSchema,
    outputSchema: AnalyzeUserSentimentOutputSchema,
  },
  async input => {
    const result = await retryWithExponentialBackoff(async () => analyzeUserSentimentPrompt(input));
    return result.output!;
  }
);
