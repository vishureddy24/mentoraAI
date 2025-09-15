'use server';

/**
 * @fileOverview This file defines a Genkit flow for handling user choices from the chat interface.
 *
 * - handleUserChoice - An asynchronous function that takes a choice action and returns the appropriate activity content.
 * - HandleUserChoiceInput - The input type for the handleUserChoice function.
 * - HandleUserChoiceOutput - The return type for the handleUserChoice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HandleUserChoiceInputSchema = z.object({
  action: z.string().describe('The action identifier for the user\'s choice.'),
});
export type HandleUserChoiceInput = z.infer<typeof HandleUserChoiceInputSchema>;

const HandleUserChoiceOutputSchema = z.object({
  response: z.string().describe('The initial content or response for the chosen activity.'),
  activity: z.string().optional().describe('An identifier for the activity component to render, if any.'),
});
export type HandleUserChoiceOutput = z.infer<typeof HandleUserChoiceOutputSchema>;

const prompt = ai.definePrompt({
  name: 'handleUserChoicePrompt',
  input: {schema: HandleUserChoiceInputSchema},
  output: {schema: HandleUserChoiceOutputSchema},
  prompt: `
You are a helpful assistant guiding a user through a mental wellness app.
The user has made a choice. Based on their action, provide the starting response.
The available actions are: 'start_puzzle', 'start_breathing', 'start_journaling', 'start_smash_stress', 'start_talk'.

- If the action is 'start_puzzle', respond with the first puzzle and set the activity to 'puzzles'.
- If the action is 'start_breathing', respond with instructions to begin and set the activity to 'breathing'.
- If the action is 'start_journaling', respond with an invitation to write and set the activity to 'journal'.
- If the action is 'start_smash_stress', respond with a description of the game and set the activity to 'smash-the-stress'.
- If the action is 'start_talk', just provide a listening response.

User action: {{{action}}}
`,
});

const handleUserChoiceFlow = ai.defineFlow(
  {
    name: 'handleUserChoiceFlow',
    inputSchema: HandleUserChoiceInputSchema,
    outputSchema: HandleUserChoiceOutputSchema,
  },
  async (input) => {
    switch (input.action) {
      case 'start_puzzle':
        return {
          response: "Great choice. Let's start with a small puzzle to get your mind engaged.",
          activity: 'puzzles',
        };
      case 'start_breathing':
        return {
          response: "Okay. Find a comfortable position and close your eyes if you'd like. We'll start with a deep breath.",
          activity: 'breathing',
        };
      case 'start_journaling':
        return {
          response: "This is a safe space. Take your time and write down anything that comes to mind. I'm here to listen without judgment.",
          activity: 'journal',
        };
      case 'start_smash_stress':
        return {
          response: "Let's smash some stress! This experience uses your camera to overlay virtual, breakable objects onto your environment. Tap to smash them!",
          activity: 'smash-the-stress',
        };
      case 'start_talk':
        return {
          response: "Of course. I'm here to listen. What's on your mind?",
        };
      default:
        return {
          response: "I'm sorry, I didn't understand that choice. Let's just talk for a bit. What's on your mind?",
        };
    }
  }
);


export async function handleUserChoice(input: HandleUserChoiceInput): Promise<HandleUserChoiceOutput> {
  return handleUserChoiceFlow(input);
}
