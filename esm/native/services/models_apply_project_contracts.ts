import type {
  ModelsCommandReason,
  ModelsCommandResult,
  ProjectDataLike,
  SplitDoorsMap,
  UnknownRecord,
} from '../../../types';

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asProjectData(value: unknown): ProjectDataLike | null {
  return isRecord(value) ? value : null;
}

export function normalizeSplitDoorsMap(value: unknown): SplitDoorsMap | undefined {
  if (!isRecord(value)) return undefined;
  const out: SplitDoorsMap = {};
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const entry = value[key];
    if (entry == null) {
      out[key] = entry === null ? null : undefined;
      continue;
    }
    if (typeof entry === 'boolean' || typeof entry === 'number' || typeof entry === 'string') {
      out[key] = entry;
      continue;
    }
    if (Array.isArray(entry)) {
      const points: number[] = [];
      for (let j = 0; j < entry.length; j++) {
        const point = Number(entry[j]);
        if (Number.isFinite(point)) points.push(point);
      }
      out[key] = points;
    }
  }
  return out;
}

export function normalizeModelLoadReason(value: unknown): ModelsCommandReason {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (reason === 'missing') return 'missing';
  if (reason === 'invalid') return 'invalid';
  if (reason === 'superseded') return 'superseded';
  if (reason === 'not-installed') return 'not-installed';
  if (reason === 'error') return 'error';
  return 'load';
}

export function buildModelLoadFailureResult(
  reason: ModelsCommandReason,
  message?: string
): ModelsCommandResult {
  return message ? { ok: false, reason, message } : { ok: false, reason };
}
