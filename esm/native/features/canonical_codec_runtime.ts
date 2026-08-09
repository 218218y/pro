export function serializeCanonicalFeatureValue(value: unknown): string {
  const seen = new WeakSet<object>();

  function serialize(entry: unknown): string | undefined {
    if (entry === null) return 'null';
    if (typeof entry === 'string') return JSON.stringify(entry);
    if (typeof entry === 'boolean') return entry ? 'true' : 'false';
    if (typeof entry === 'number') return Number.isFinite(entry) ? String(entry) : 'null';
    if (typeof entry === 'undefined' || typeof entry === 'function' || typeof entry === 'symbol') {
      return undefined;
    }
    if (typeof entry === 'bigint') throw new TypeError('Canonical JSON cannot serialize bigint values');
    if (typeof entry !== 'object') return undefined;
    if (seen.has(entry)) throw new TypeError('Canonical JSON cannot serialize circular values');
    seen.add(entry);
    try {
      if (Array.isArray(entry)) {
        return `[${entry.map(item => serialize(item) ?? 'null').join(',')}]`;
      }
      const record = entry as Record<string, unknown>;
      const parts: string[] = [];
      for (const key of Object.keys(record).sort()) {
        const serialized = serialize(record[key]);
        if (typeof serialized !== 'undefined') parts.push(`${JSON.stringify(key)}:${serialized}`);
      }
      return `{${parts.join(',')}}`;
    } finally {
      seen.delete(entry);
    }
  }

  const serialized = serialize(value);
  if (typeof serialized === 'undefined')
    throw new TypeError('Canonical JSON requires a serializable root value');
  return serialized;
}

export function cloneCanonicalFeatureValue<T>(value: T): T {
  return JSON.parse(serializeCanonicalFeatureValue(value)) as T;
}

export function fingerprintCanonicalFeatureValue(value: unknown): string {
  const serialized = serializeCanonicalFeatureValue(value);
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${serialized.length}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
