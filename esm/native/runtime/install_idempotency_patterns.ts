import type { UnknownRecord } from '../../../types';

import { asRecord as readRecord } from './record.js';

export type CallableContractKey<T extends UnknownRecord = UnknownRecord> = keyof T & string;
export type NumberSlotKey<T extends UnknownRecord = UnknownRecord> = keyof T & string;

export function asRecord<T extends UnknownRecord = UnknownRecord>(value: unknown): T | null {
  return readRecord<T>(value);
}

export function hasCallableContract<T extends UnknownRecord = UnknownRecord>(
  value: unknown,
  keys: ReadonlyArray<CallableContractKey<T>>
): boolean {
  const record = asRecord<T>(value);
  if (!record) return false;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (typeof record[key] !== 'function') return false;
  }
  return true;
}

export function hasOwnNumberSlots<T extends UnknownRecord = UnknownRecord>(
  value: unknown,
  keys: ReadonlyArray<NumberSlotKey<T>>
): boolean {
  const record = asRecord<T>(value);
  if (!record) return false;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (!Object.prototype.hasOwnProperty.call(record, key) || typeof record[key] !== 'number') return false;
  }
  return true;
}

export function hasLiveHandle<T extends UnknownRecord = UnknownRecord>(
  value: unknown,
  key: keyof T & string
): boolean {
  const record = asRecord<T>(value);
  return !!(record && typeof record[key] === 'function');
}
