export async function withSuppressedConsole<T>(run: () => T | Promise<T>): Promise<T> {
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  console.error = (() => undefined) as typeof console.error;
  console.warn = (() => undefined) as typeof console.warn;
  console.log = (() => undefined) as typeof console.log;

  try {
    return await run();
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
    console.log = originalLog;
  }
}
