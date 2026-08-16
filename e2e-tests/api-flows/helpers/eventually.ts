export async function eventually<T>(
  fn: () => Promise<T | false | null | undefined>,
  { timeout = 15_000, interval = 250 } = {},
): Promise<T> {
  const deadline = Date.now() + timeout;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result !== false && result !== null && result !== undefined) {
        return result;
      }
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(
    `Condition not met within ${timeout}ms${lastError ? `: ${lastError}` : ''}`,
  );
}

export function futureDate(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().split('T')[0];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
