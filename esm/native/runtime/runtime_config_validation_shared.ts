import type {
  UnknownRecord,
  WardrobeProRuntimeConfig,
  WardrobeProRuntimeFlags,
  WardrobeProSupabaseCloudSyncConfig,
  WardrobeProTabId,
} from '../../../types';

export type RuntimeConfigIssueKind = 'warn' | 'error';

export type RuntimeConfigIssue = {
  kind: RuntimeConfigIssueKind;
  message: string;
  path?: string;
};

export type ValidateOpts = {
  source?: string;
  failFast?: boolean;
};

const SITE_VARIANTS = new Set(['main', 'site2']);

export function isPlainObject(x: unknown): x is UnknownRecord {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

export function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export function toBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

export function toFiniteNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function normalizeSiteVariant(v: unknown): 'main' | 'site2' | null {
  const s = asString(v);
  if (!s || !SITE_VARIANTS.has(s)) return null;
  return s === 'site2' ? 'site2' : 'main';
}

export function normalizeTabId(v: unknown): WardrobeProTabId | null {
  const s = asString(v);
  if (!s) return null;
  switch (s) {
    case 'structure':
    case 'design':
    case 'interior':
    case 'sketch':
    case 'settings':
      return s;
    default:
      return null;
  }
}

export function normalizeTabs(v: unknown): WardrobeProTabId[] | null {
  if (!Array.isArray(v)) return null;
  const out: WardrobeProTabId[] = [];
  for (const candidate of v) {
    const tab = normalizeTabId(candidate);
    if (!tab || out.includes(tab)) return null;
    out.push(tab);
  }
  return out;
}

export function readOwn(obj: UnknownRecord, key: string): unknown {
  return obj[key];
}

export function writeOwn(obj: UnknownRecord, key: string, value: unknown): void {
  obj[key] = value;
}

export function deleteOwn(obj: UnknownRecord, key: string): void {
  delete obj[key];
}

export function cloneRuntimeFlags(raw: UnknownRecord): WardrobeProRuntimeFlags & UnknownRecord {
  return { ...raw };
}

export function cloneRuntimeConfig(raw: UnknownRecord): WardrobeProRuntimeConfig & UnknownRecord {
  return { ...raw };
}

export function cloneSupabaseCloudSync(
  raw: UnknownRecord
): WardrobeProSupabaseCloudSyncConfig & UnknownRecord {
  return { ...raw };
}
