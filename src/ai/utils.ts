
/**
 * Retries a function with exponential backoff.
 * @param fn The async function to retry.
 * @param maxRetries The maximum number of retries.
 * @param initialDelayMs The initial delay in milliseconds.
 * @returns A promise that resolves with the result of the function.
 */
export async function retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 5,
    initialDelayMs = 1000
  ): Promise<T> {
    let retries = 0;
    let delay = initialDelayMs;
  
    while (retries < maxRetries) {
      try {
        return await fn();
      } catch (error: any) {
        // The Gemini API error for overloaded models or rate limits, but the Genkit
        // library may not expose the status code directly. We check the error message instead.
        if (error.message && (error.message.includes('503') || error.message.includes('429') ||error.message.toLowerCase().includes('model is overloaded') || error.message.toLowerCase().includes('too many requests'))) {
            retries++;
          if (retries >= maxRetries) {
            console.error('Max retries reached. Failing.');
            throw error;
          }
          console.log(`Model overloaded or rate limited. Retrying in ${delay / 1000} seconds... (Attempt ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Double the delay for the next attempt
        } else {
          // It's a different error, so throw it immediately.
          throw error;
        }
      }
    }
  
    // This should not be reachable if maxRetries > 0, but is here for type safety.
    throw new Error('Max retries reached. Failing.');
  }
  
