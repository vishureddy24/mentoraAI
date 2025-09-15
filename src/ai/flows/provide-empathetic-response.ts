'use server';
/**
 * @fileOverview This file defines a Genkit flow for providing an empathetic response to user input.
 *
 * The flow takes user input and detected emotion, and generates an empathetic response that validates the user's feelings.
 * It exports:
 *   - `provideEmpatheticResponse`: The main function to call to generate the response.
 *   - `ProvideEmpatheticResponseInput`: The input type for the `provideEmpatheticResponse` function.
 *   - `ProvideEmpatheticResponseOutput`: The output type for the `provideEmpatheticResponse` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProvideEmpatheticResponseInputSchema = z.object({
  userInput: z.string().describe('The user input message.'),
  emotion: z.enum(['Sad', 'Angry', 'Neutral', 'Happy']).describe('The detected emotion of the user message.'),
});
export type ProvideEmpatheticResponseInput = z.infer<typeof ProvideEmpatheticResponseInputSchema>;

const ProvideEmpatheticResponseOutputSchema = z.object({
  empatheticResponse: z.string().describe('The empathetic response to the user input.'),
});
export type ProvideEmpatheticResponseOutput = z.infer<typeof ProvideEmpatheticResponseOutputSchema>;

export async function provideEmpatheticResponse(input: ProvideEmpatheticResponseInput): Promise<ProvideEmpatheticResponseOutput> {
  return provideEmpatheticResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideEmpatheticResponsePrompt',
  input: {schema: ProvideEmpatheticResponseInputSchema},
  output: {schema: ProvideEmpatheticResponseOutputSchema},
  prompt: `You are an AI companion whose role is to provide empathetic responses to user messages.

You will receive the user's message and the detected emotion. Your first response must always validate the user's feeling, never dismiss it.

Here are some example responses:
* For Sadness: "I hear you. It sounds like a really heavy day."
* For Anger: "I can see you're really angry right now. It's okay to let it out here."

User Message: {{{userInput}}}
Detected Emotion: {{{emotion}}}

Provide an empathetic response that validates the user's feelings:
`,
});

const provideEmpatheticResponseFlow = ai.defineFlow(
  {
    name: 'provideEmpatheticResponseFlow',
    inputSchema: ProvideEmpatheticResponseInputSchema,
    outputSchema: ProvideEmpatheticResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
