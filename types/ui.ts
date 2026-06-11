// UI-adjacent shared types (registry surface).

import type { UnknownRecord } from './common';

export type RegistryValue = UnknownRecord;

export interface RegistryLike<T = RegistryValue> extends UnknownRecord {
  get?: (key: string) => T | null;
  set?: (key: string, value: T) => unknown;
  has?: (key: string) => boolean;
  del?: (key: string) => unknown;
  list?: () => string[];
  [k: string]: unknown;
}
