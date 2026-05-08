import type {
  AppContainer,
  FatalOverlayShowOptionsLike,
  UnknownRecord,
  WardrobeProRuntimeConfig,
  WardrobeProRuntimeFlags,
  WardrobeProTabId,
} from '../types';
import type { ThreeLike } from '../types/three';

type NoArgCallback = () => unknown;
type OverlayFn = (opts: FatalOverlayShowOptionsLike) => unknown;
export type BootReactUiOptsLike = {
  app: AppContainer;
  window: Window;
  document: Document;
  mountId: string;
};
type BootReactUiFn = (opts: BootReactUiOptsLike) => unknown;
type MetaElementLike = Element & {
  getAttribute(name: string): string | null;
};

export type BootEnv = {
  window?: Window | null;
  document?: Document | null;
};

export type BootFailureKind = 'three' | 'boot' | 'unknown';

export type BootFailure = {
  kind: BootFailureKind;
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
};

export type RuntimeConfigModuleResult = {
  config: WardrobeProRuntimeConfig | null;
  flags: WardrobeProRuntimeFlags | null;
};

export type WindowWithBootFlag = Window & { __WP_BEFOREUNLOAD_GUARD__?: boolean };

const SITE2_ALLOWED_TAB_IDS = [
  'structure',
  'design',
  'interior',
  'render',
  'export',
] satisfies readonly WardrobeProTabId[];
const SITE2_ALLOWED_TABS = new Set<string>(SITE2_ALLOWED_TAB_IDS);

export function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isMetaElement(v: unknown): v is MetaElementLike {
  return isRecord(v) && typeof v.getAttribute === 'function';
}

export function getErrorMessage(err: unknown): string {
  try {
    if (typeof err === 'string') return err;
    if (isRecord(err) && typeof err.message === 'string') return err.message;
    return String(err);
  } catch {
    // keep classification helper resilient; caller will report the original failure
    return '';
  }
}

export function getNoArgMethod(value: unknown, name: string): NoArgCallback | null {
  if (!isRecord(value)) return null;
  const fn = value[name];
  if (typeof fn !== 'function') return null;
  return () => Reflect.apply(fn, value, []);
}

export function getOverlayCallback(value: unknown, name: string): OverlayFn | null {
  if (!isRecord(value)) return null;
  const fn = value[name];
  if (typeof fn !== 'function') return null;
  return (opts: FatalOverlayShowOptionsLike) => Reflect.apply(fn, value, [opts]);
}

export function getBootReactUiCallback(value: unknown, name: string): BootReactUiFn | null {
  if (!isRecord(value)) return null;
  const fn = value[name];
  if (typeof fn !== 'function') return null;
  return (opts: BootReactUiOptsLike) => Reflect.apply(fn, value, [opts]);
}

function coerceRuntimeFlags(rec: UnknownRecord): WardrobeProRuntimeFlags {
  return { ...rec };
}

function coerceRuntimeConfig(rec: UnknownRecord): WardrobeProRuntimeConfig {
  return { ...rec };
}

export function isThreeLikeNamespace(value: unknown): value is ThreeLike & UnknownRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.Group === 'function' &&
    typeof value.Mesh === 'function' &&
    typeof value.Vector3 === 'function' &&
    typeof value.BoxGeometry === 'function' &&
    typeof value.PlaneGeometry === 'function' &&
    typeof value.CylinderGeometry === 'function' &&
    typeof value.EdgesGeometry === 'function'
  );
}

export function parseRuntimeConfigModule(raw: unknown): RuntimeConfigModuleResult {
  if (!isRecord(raw)) return { config: null, flags: null };

  const flags = isRecord(raw.flags) ? coerceRuntimeFlags(raw.flags) : null;
  const cfgRaw: unknown = Object.prototype.hasOwnProperty.call(raw, 'config') ? raw.config : null;

  // Canonical runtime module shape:
  //   export default { flags?: {...}, config?: {...} }
  // We intentionally ignore flat config exports so runtime config stays explicit.
  // and never re-mixes flags/config payloads at the module root.
  if (!isRecord(cfgRaw)) return { config: null, flags };
  return { config: coerceRuntimeConfig(cfgRaw), flags };
}

export function parseSiteVariantFromMeta(
  value: string | null
): WardrobeProRuntimeConfig['siteVariant'] | null {
  if (!value) return null;
  const low = value.trim().toLowerCase();
  if (low === 'site2') return 'site2';
  if (low === 'main') return 'main';
  return null;
}

function isTabId(value: string): value is WardrobeProTabId {
  return SITE2_ALLOWED_TABS.has(value);
}

export function parseSite2EnabledTabs(value: string | null): WardrobeProTabId[] | null {
  if (!value) return null;
  const out: WardrobeProTabId[] = [];
  for (const part of value.split(',')) {
    const tab = part.trim().toLowerCase();
    if (!tab || !isTabId(tab) || out.includes(tab)) continue;
    out.push(tab);
  }
  return out.length ? out : null;
}

export function callFlushMaybe(service: unknown): void {
  const flush = getNoArgMethod(service, 'flush');
  if (flush) flush();
}

export function hasDirtyMeta(state: unknown): boolean {
  if (!isRecord(state)) return false;
  const meta = state.meta;
  return isRecord(meta) && meta.dirty === true;
}

export function readMetaContent(doc: Document | null, name: string): string | null {
  try {
    if (!doc) return null;
    const el = doc.querySelector(`meta[name="${name}"]`);
    if (!isMetaElement(el)) return null;
    const v = el.getAttribute('content');
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}
