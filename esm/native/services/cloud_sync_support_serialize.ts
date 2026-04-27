import { asRecord, asString } from './cloud_sync_support_shared_core.js';

export type CloudSyncStableSerializeOptions = {
  undefinedValue?: 'undefined' | 'null';
  bigintValue?: 'string' | 'quoted-n';
  otherPrimitiveValue?: 'stringified-string' | 'type-label';
};

function readCloudSyncStableSerializeUndefinedValue(options: CloudSyncStableSerializeOptions): string {
  return options.undefinedValue === 'null' ? 'null' : 'undefined';
}

function readCloudSyncStableSerializeBigIntValue(
  value: bigint,
  options: CloudSyncStableSerializeOptions
): string {
  return options.bigintValue === 'quoted-n' ? `"${String(value)}n"` : String(value);
}

function readCloudSyncStableSerializeOtherPrimitiveValue(
  value: unknown,
  options: CloudSyncStableSerializeOptions
): string {
  return options.otherPrimitiveValue === 'type-label' ? `"${typeof value}"` : JSON.stringify(String(value));
}

export function stableSerializeCloudSyncValue(
  value: unknown,
  options: CloudSyncStableSerializeOptions = {},
  seen: WeakSet<object> = new WeakSet<object>()
): string {
  if (value === null) return 'null';
  if (typeof value === 'undefined') return readCloudSyncStableSerializeUndefinedValue(options);
  const valueType = typeof value;
  if (valueType === 'string') return JSON.stringify(value);
  if (valueType === 'number' || valueType === 'boolean') return String(value);
  if (valueType === 'bigint') return readCloudSyncStableSerializeBigIntValue(value as bigint, options);
  if (valueType !== 'object') return readCloudSyncStableSerializeOtherPrimitiveValue(value, options);
  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerializeCloudSyncValue(item, options, seen)).join(',')}]`;
  }
  const rec = asRecord(value);
  if (!rec) return readCloudSyncStableSerializeOtherPrimitiveValue(value, options);
  if (seen.has(rec)) return '"[Circular]"';
  seen.add(rec);
  try {
    const parts: string[] = [];
    for (const key of Object.keys(rec).sort()) {
      const next = rec[key];
      if (typeof next === 'undefined') continue;
      parts.push(`${JSON.stringify(key)}:${stableSerializeCloudSyncValue(next, options, seen)}`);
    }
    return `{${parts.join(',')}}`;
  } finally {
    seen.delete(rec);
  }
}

export function computeHash(
  modelsArr: unknown[],
  colorsArr: unknown[],
  colorOrder: unknown[],
  presetOrder: unknown[],
  hiddenPresets: unknown[]
): string {
  const s = stableSerializeCloudSyncValue({
    m: modelsArr,
    c: colorsArr,
    o: colorOrder,
    p: presetOrder,
    h: hiddenPresets,
  });
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `${s.length}:${h}`;
}

export function hashString32(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `${s.length}:${h}`;
}

export function parseIsoTimeMs(v: unknown): number {
  const s = asString(v);
  if (!s) return 0;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : 0;
}
