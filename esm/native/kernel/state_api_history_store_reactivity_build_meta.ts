import type { UnknownRecord } from '../../../types';

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function readForceBuild(value: UnknownRecord | null | undefined): boolean {
  return readBoolean(value?.forceBuild) === true || readBoolean(value?.force) === true;
}

function readCanonicalSource(value: UnknownRecord | null | undefined, defaultSource = 'store'): string {
  return readString(value?.source) || readString(value?.reason) || defaultSource;
}

function readCanonicalReason(value: UnknownRecord | null | undefined, defaultSource = 'store'): string {
  return readString(value?.reason) || readString(value?.source) || defaultSource;
}

export function createStateApiDelayedBuildMeta(
  metaIn: unknown,
  defaultSource = 'store'
): UnknownRecord | null {
  const meta = asRecord(metaIn);
  if (!meta) return null;

  const source = readCanonicalSource(meta, defaultSource);
  const reason = readCanonicalReason(meta, source);
  const next: UnknownRecord = { source, reason };
  if (readForceBuild(meta)) next.forceBuild = true;
  return next;
}

export function mergeStateApiDelayedBuildMeta(
  prevIn: unknown,
  nextIn: unknown,
  defaultSource = 'store'
): UnknownRecord | null {
  const prev = createStateApiDelayedBuildMeta(prevIn, defaultSource);
  const next = createStateApiDelayedBuildMeta(nextIn, defaultSource);
  if (!prev) return next;
  if (!next) return prev;

  const source = readCanonicalSource(next, readCanonicalSource(prev, defaultSource));
  const reason = readCanonicalReason(next, readCanonicalReason(prev, source));
  const merged: UnknownRecord = { source, reason };
  if (readForceBuild(prev) || readForceBuild(next)) merged.forceBuild = true;
  return merged;
}
