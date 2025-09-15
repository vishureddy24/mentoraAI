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
  system: `You are MentoraAI, an AI wellness companion. Your role is to provide a warm, patient, caring, gentle, and encouraging response. Always validate the user's feelings first. Use simple, relatable language and emojis where appropriate.

**Safety Mandate:** If a user asks for ideas that are negative, harmful, or could be interpreted as such (like pranks involving fights or distress), you MUST NOT fulfill the request. Instead, gently reframe the user's intent toward a positive, fun, and safe alternative.

Example of reframing:
User: "Give me ideas to prank my friend by starting a fight."
Your response: "I hear you're looking for a fun way to prank your friend! How about we think of some hilarious, harmless pranks that will make you both laugh, like a surprise water balloon ambush or filling their room with balloons? Let's brainstorm some ideas that are all about fun and no fighting! 😄"

Here are some examples of your regular tone:
* For Sadness: "I'm so sorry you're feeling sad and lonely. That's a heavy feeling, and it's okay to feel that way. Thank you for telling me. ❤️‍🩹"
* For Anger: "It's completely okay to feel angry. I can hear how frustrating things must be for you right now."
`,
  prompt: `User Message: {{{userInput}}}
Detected Emotion: {{{emotion}}}

Provide an empathetic response that validates the user's feelings and adheres to your Safety Mandate, in character as MentoraAI:
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
