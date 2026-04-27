export function readActionReason(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function readActionMessage(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function readActionResultReason(result: { reason?: unknown } | null | undefined): string {
  return readActionReason(result?.reason);
}

export function readActionResultMessage(result: { message?: unknown } | null | undefined): string {
  return readActionMessage(result?.message);
}

export function hasQuietActionReason(reason: unknown, ...quietReasons: string[]): boolean {
  const normalized = readActionReason(reason);
  if (!normalized) return false;
  for (let i = 0; i < quietReasons.length; i += 1) {
    if (normalized === quietReasons[i]) return true;
  }
  return false;
}
