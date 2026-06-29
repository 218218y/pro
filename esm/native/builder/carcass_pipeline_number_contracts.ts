export function readRequiredCarcassPipelineNumber(value: unknown, name: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new Error(`[WardrobePro] Carcass pipeline: ${name} must be a finite number`);
}

export function readOptionalCarcassPipelineNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readCarcassPipelineNumberOr(value: unknown, defaultValue: number): number {
  const n = readOptionalCarcassPipelineNumber(value);
  return n != null ? n : defaultValue;
}

export function readCarcassPipelineIntegerOr(value: unknown, defaultValue: number): number {
  return Math.trunc(readCarcassPipelineNumberOr(value, defaultValue));
}
