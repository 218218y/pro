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
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'on') return true;
  if (s === '0' || s === 'false' || s === 'no' || s === 'n' || s === 'off') return false;
  return null;
}

export function toFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function normalizeSiteVariant(v: unknown): 'main' | 'site2' | null {
  const s = asString(v);
  if (!s) return null;
  const low = s.toLowerCase();
  if (!SITE_VARIANTS.has(low)) return null;
  return low === 'site2' ? 'site2' : 'main';
}

export function normalizeTabId(v: unknown): WardrobeProTabId | null {
  const s = asString(v);
  if (!s) return null;
  const low = s.toLowerCase();
  switch (low) {
    case 'structure':
    case 'design':
    case 'interior':
    case 'render':
    case 'export':
      return low;
    default:
      return null;
  }
}

export function normalizeTabs(v: unknown): WardrobeProTabId[] | null {
  const addTab = (out: WardrobeProTabId[], candidate: unknown): void => {
    const tab = normalizeTabId(candidate);
    if (tab && !out.includes(tab)) out.push(tab);
  };

  if (Array.isArray(v)) {
    const out: WardrobeProTabId[] = [];
    for (const x of v) addTab(out, x);
    return out;
  }

  const s = asString(v);
  if (s) {
    const out: WardrobeProTabId[] = [];
    for (const part of s.split(',')) addTab(out, part);
    return out;
  }

  return null;
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
