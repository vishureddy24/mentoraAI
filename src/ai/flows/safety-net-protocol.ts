'use server';

/**
 * @fileOverview This file implements the Safety Net Protocol, which provides immediate access to professional help resources if severe distress is detected.
 *
 * - safetyNetProtocol - A function that provides a message with links and phone numbers to professional helplines.
 * - SafetyNetProtocolInput - The input type for the safetyNetProtocol function (currently empty).
 * - SafetyNetProtocolOutput - The return type for the safetyNetProtocol function, containing the safety message.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SafetyNetProtocolInputSchema = z.object({})
export type SafetyNetProtocolInput = z.infer<typeof SafetyNetProtocolInputSchema>;

const SafetyNetProtocolOutputSchema = z.object({
  message: z.string().describe('A message with links and phone numbers to professional helplines.'),
});
export type SafetyNetProtocolOutput = z.infer<typeof SafetyNetProtocolOutputSchema>;

export async function safetyNetProtocol(input: SafetyNetProtocolInput): Promise<SafetyNetProtocolOutput> {
  return safetyNetProtocolFlow(input);
}

const prompt = ai.definePrompt({
  name: 'safetyNetProtocolPrompt',
  input: {schema: SafetyNetProtocolInputSchema},
  output: {schema: SafetyNetProtocolOutputSchema},
  prompt: `It sounds like you are in a lot of pain. Please know there are people who can help right now. Here is a resource:\n\nNational Suicide Prevention Lifeline:\nPhone: 988\nWebsite: https://988lifeline.org\n\nCrisis Text Line:\nText HOME to 741741\n\nThe Trevor Project (for LGBTQ youth):\nPhone: 1-866-488-7386\nWebsite: https://www.thetrevorproject.org\n\nPlease reach out to one of these resources for immediate support.`,
});

const safetyNetProtocolFlow = ai.defineFlow(
  {
    name: 'safetyNetProtocolFlow',
    inputSchema: SafetyNetProtocolInputSchema,
    outputSchema: SafetyNetProtocolOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
