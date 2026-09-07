/** Keep a short operation visible without delaying slower requests further. */
export async function withMinimumDuration<T>(
  operation: () => Promise<T>,
  durationMs: number,
): Promise<T> {
  const started = Date.now();
  try {
    return await operation();
  } finally {
    const remaining = durationMs - (Date.now() - started);
    if (remaining > 0) {
      await new Promise<void>(resolve => setTimeout(resolve, remaining));
    }
  }
}
