import { readFiniteNumber, readInteger, readNumericInput } from '../../../../shared/numeric_value_shared.js';

export function asFiniteNumber(v: unknown, defaultValue: number): number {
  const n = readFiniteNumber(readNumericInput(v));
  return n ?? defaultValue;
}

export function asFiniteInt(v: unknown, defaultValue: number): number {
  const n = readInteger(readNumericInput(v));
  return n ?? defaultValue;
}

export function asOptionalNumber(v: unknown): number | '' {
  if (v === null || v === undefined || v === '') return '';
  const n = readFiniteNumber(readNumericInput(v));
  return n ?? '';
}
