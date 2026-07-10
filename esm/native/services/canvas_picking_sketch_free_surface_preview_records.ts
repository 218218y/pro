import { asRecord } from '../runtime/record.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';

export function readRecordValue(record: unknown, key: string): unknown {
  return asRecord(record)?.[key];
}

export function readRecordIdentity(record: unknown, key: string): string | null {
  const value = readRecordValue(record, key);
  const identity = formatIdentityValue(readIdentityValue(value));
  return identity || null;
}

export function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readRecordValue(record, key));
}
