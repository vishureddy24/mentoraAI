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
  action: z.string().describe('The action identifier for the user\'s choice (e.g., \'start_puzzle\').'),
});
export type HandleUserChoiceInput = z.infer<typeof HandleUserChoiceInputSchema>;

const HandleUserChoiceOutputSchema = z.object({
  response: z.string().describe('The initial content or response for the chosen activity.'),
  activity: z.string().optional().describe('An identifier for the activity component to render, if any (e.g., \'puzzles\').'),
});
export type HandleUserChoiceOutput = z.infer<typeof HandleUserChoiceOutputSchema>;


const handleUserChoiceFlow = ai.defineFlow(
  {
    name: 'handleUserChoiceFlow',
    inputSchema: HandleUserChoiceInputSchema,
    outputSchema: HandleUserChoiceOutputSchema,
  },
  async (input) => {
    let result;
    switch (input.action) {
      case 'start_breathing':
        result = {
          response: "Of course. Find a comfortable position. We'll start with a simple breathing exercise to help calm your mind.",
          activity: 'breathing',
        };
        break;
      case 'start_puzzle':
        result = {
          response: "Great choice. Let's engage your mind with a little puzzle. Here's one for you.",
          activity: 'puzzles',
        };
        break;
      case 'start_fruit_slicer':
        result = {
          response: "Let's play Fruit Frenzy! Tap the fruit, but not the bombs. The game will open in a new tab.",
          activity: 'fruit-slicer',
        };
        break;
      case 'start_journaling':
        result = {
          response: "This is a safe space to let it all out. Write down whatever is on your mind. It will be securely deleted when you're done.",
          activity: 'journal',
        };
        break;
      case 'start_talk':
        result = {
          response: "Of course. I'm here to listen. What's on your mind?",
        };
        break;
      default:
        result = {
          response: "I'm sorry, I didn't understand that choice. Let's just talk. How can I help?",
        };
        break;
    }
    console.log("--> BACKEND SENDING:", result);
    return result;
  }
);


export async function handleUserChoice(input: HandleUserChoiceInput): Promise<HandleUserChoiceOutput> {
  return handleUserChoiceFlow(input);
}
