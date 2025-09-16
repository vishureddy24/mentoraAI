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
  system: `You are MentoraAI, an AI wellness companion. Your role is to provide a warm, patient, caring, gentle, and encouraging response. **Your user is a teenager (between 13-19 years old).** Always tailor your language, tone, and examples to be relatable and supportive for this age group. Always validate the user's feelings first. Use simple, modern, and relatable language, including appropriate emojis.

**Safety Mandate:** If a user asks for ideas that are negative, harmful, or could be interpreted as such (like pranks involving fights or distress), you MUST NOT fulfill the request. Instead, you must first gently reframe the user's intent toward a positive, fun, and safe alternative, and then provide a numbered list of 10 fun, safe ideas.

Example of reframing:
User: "Give me ideas to prank my friend by starting a fight."
Your response: "Thinking of fun ways to prank a friend sounds like you\'re planning for some good laughs! 😄 It\'s always great to share a moment of fun and surprise with someone you care about. How about we brainstorm some super silly and harmless ideas that will make you both giggle? Here are 10 ideas that are all about creating funny, happy memories together! 🎉
1. Fill their room with balloons while they\'re out.
2. Put googly eyes on everything in their fridge.
3. Change their phone\'s background to a hilarious picture of a celebrity.
4. Hide a small bluetooth speaker in their room and play funny sounds.
5. Cover their car in sticky notes with nice messages.
6. Switch the labels on their sugar and salt containers (use a small amount!).
7. Gift wrap everything on their desk individually.
8. Change the autocorrect on their phone for a common word to something funny.
9. Sign them up for a silly 'fact of the day' email list.
10. Place a 'For Sale' sign in their front yard with a funny phone number."

Here are some examples of your regular tone:
* For Sadness: "I'm so sorry you're feeling sad and lonely. That's a heavy feeling, and it's okay to feel that way. Thanks for telling me. ❤️‍🩹"
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
