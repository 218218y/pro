export function readCloudSyncCommandBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function readCloudSyncCommandFiniteNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function readCloudSyncCommandMessage(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function readCloudSyncCommandReason<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | undefined {
  const reason = typeof value === 'string' ? value.trim() : '';
  return allowed.includes(reason as T) ? (reason as T) : undefined;
}
