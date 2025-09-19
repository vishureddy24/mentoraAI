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
import { retryWithExponentialBackoff } from '../utils';

const SafetyNetProtocolInputSchema = z.object({
    languageCode: z.string().optional().describe("The BCP-47 language code to translate the response into. Defaults to 'en' if not provided."),
})
export type SafetyNetProtocolInput = z.infer<typeof SafetyNetProtocolInputSchema>;

const SafetyNetProtocolOutputSchema = z.object({
  message: z.string().describe('A message with links and phone numbers to professional helplines.'),
});
export type SafetyNetProtocolOutput = z.infer<typeof SafetyNetProtocolOutputSchema>;

export async function safetyNetProtocol(input: SafetyNetProtocolInput): Promise<SafetyNetProtocolOutput> {
  return safetyNetProtocolFlow(input);
}

const englishSafetyMessage = `It sounds like you are in a lot of pain, and your safety is the most important thing. Please know there are people who can help you right now. Here are some resources you can reach out to for immediate support:

National Suicide Prevention Lifeline:
Phone: 988
Website: https://988lifeline.org

Crisis Text Line:
Text HOME to 741741

The Trevor Project (for LGBTQ youth):
Phone: 1-866-488-7386
Website: https://www.thetrevorproject.org

Please, take a moment to connect with one of them. ❤️‍🩹`;

const translationPrompt = ai.definePrompt({
    name: 'safetyNetTranslationPrompt',
    input: { schema: z.object({ targetLanguage: z.string(), text: z.string() }) },
    output: { schema: z.string() },
    prompt: `Translate the following safety message to {{targetLanguage}}. Keep the formatting, phone numbers, and URLs exactly the same.

Text: {{{text}}}`,
});

const safetyNetProtocolFlow = ai.defineFlow(
  {
    name: 'safetyNetProtocolFlow',
    inputSchema: SafetyNetProtocolInputSchema,
    outputSchema: SafetyNetProtocolOutputSchema,
  },
  async ({ languageCode }) => {
    if (!languageCode || languageCode === 'en') {
        return { message: englishSafetyMessage };
    }
    
    try {
        const translatedResult = await retryWithExponentialBackoff(async () => 
            translationPrompt({ targetLanguage: languageCode, text: englishSafetyMessage })
        );
        return { message: translatedResult.output! };
    } catch(err) {
        console.error("Safety net translation error -> falling back to English", err);
        return { message: englishSafetyMessage };
    }
  }
);
