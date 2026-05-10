export function readCloudSyncCommandBoolean(value: unknown, defaultValue = false): boolean {
  return typeof value === 'boolean' ? value : defaultValue;
}

export function readCloudSyncCommandFiniteNumber(value: unknown, defaultValue = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
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
