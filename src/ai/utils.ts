
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
        // The Gemini API can sometimes return a 503 error when the model is overloaded
        // or a 429 error for rate limiting. We check for these conditions in the error message.
        const errorMessage = error.message?.toLowerCase() || '';
        const isRetryableError = errorMessage.includes('503') || 
                                 errorMessage.includes('429') || 
                                 errorMessage.includes('model is overloaded') ||
                                 errorMessage.includes('rate limit');

        if (isRetryableError) {
          retries++;
          if (retries >= maxRetries) {
            console.error('Max retries reached. Failing.');
            throw error;
          }
          console.log(`Retryable error detected. Retrying in ${delay / 1000} seconds... (Attempt ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Double the delay for the next attempt
        } else {
          // For non-retryable errors, throw it immediately.
          console.error('Non-retryable error:', error);
          throw error;
        }
      }
    }
  
    // This should not be reachable if maxRetries > 0, but is here for type safety and to satisfy TypeScript.
    throw new Error('Max retries reached. Failing.');
  }
  
