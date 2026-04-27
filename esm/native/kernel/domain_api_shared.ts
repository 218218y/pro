import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  AppContainer,
  DrawersOpenIdLike,
  HandleType,
  MetaActionsNamespaceLike,
  RuntimeScalarKey,
  UnknownCallable,
  UnknownRecord,
} from '../../../types';
import { reportErrorThrottled, shouldFailFast } from '../runtime/api.js';
import { readRuntimeScalarOrDefault } from '../runtime/runtime_selectors.js';
export type DomainDoorsSelect = UnknownRecord & {
  count?: () => number;
  isOpen?: () => boolean;
  splitMap?: () => UnknownRecord;
  splitBottomMap?: () => UnknownRecord;
  removedMap?: () => UnknownRecord;
  hingeMap?: () => UnknownRecord;
  handlesMap?: () => UnknownRecord;
  isRemoved?: (partId: unknown) => boolean;
  isSplit?: (doorBaseId: unknown) => boolean;
  isSplitBottom?: (doorBaseId: unknown) => boolean;
  hingeDir?: (hingeKey: unknown, def: unknown) => unknown;
  handleType?: (doorId: unknown, fallback: unknown) => unknown;
  globalHandleType?: () => HandleType | string | null;
};
export type DomainDrawersSelect = UnknownRecord & { openId?: () => DrawersOpenIdLike };
export type DomainDividersSelect = UnknownRecord & {
  map?: () => UnknownRecord;
  isOn?: (dividerKey: unknown) => boolean;
  has?: (primaryKey: unknown, altKey: unknown) => boolean;
};
export type DomainViewSelect = UnknownRecord & { sketchMode?: () => boolean };
export type DomainFlagsSelect = UnknownRecord & {
  globalClickMode?: () => boolean;
  isRestoring?: () => boolean;
};
export type DomainGroovesSelect = UnknownRecord & {
  map?: () => UnknownRecord;
  isOn?: (partIdOrKey: unknown) => boolean;
  hasAny?: () => boolean;
};
export type DomainCurtainsSelect = UnknownRecord & {
  map?: () => UnknownRecord;
  get?: (partId: unknown) => string;
};
export type DomainTexturesSelect = UnknownRecord & { customUploadedDataURL?: () => string | null };
export type DomainSelectSurface = UnknownRecord & {
  map?: (mapName: unknown) => UnknownRecord;
  doors: DomainDoorsSelect;
  drawers: DomainDrawersSelect;
  dividers: DomainDividersSelect;
  view: DomainViewSelect;
  flags: DomainFlagsSelect;
  room: UnknownRecord;
  colors: UnknownRecord;
  grooves: DomainGroovesSelect;
  curtains: DomainCurtainsSelect;
  modules: UnknownRecord;
  corner: UnknownRecord;
  textures: DomainTexturesSelect;
};
export type RuntimeFlagKey = Extract<RuntimeScalarKey, 'sketchMode' | 'globalClickMode' | 'restoring'>;
type DelegateMarkedFn = UnknownCallable & { __wp_delegatesStackPatch?: boolean };
export function isDomainObject<T extends object = UnknownRecord>(value: unknown): value is T {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function asDomainObject<T extends object = UnknownRecord>(value: unknown): T | null {
  return isDomainObject<T>(value) ? value : null;
}
export function ensureDomainNamespace(owner: UnknownRecord, key: string): UnknownRecord {
  const current = asDomainObject(owner[key]);
  if (current) return current;
  const next: UnknownRecord = {};
  owner[key] = next;
  return next;
}
export function ensureDomainRecord(value: unknown): UnknownRecord {
  return asDomainObject(value) || {};
}
export function isDomainRecord(value: unknown): value is UnknownRecord {
  return isDomainObject<UnknownRecord>(value);
}
export function asActionMeta(
  meta: ActionMetaLike | UnknownRecord | null | undefined
): ActionMetaLike | undefined {
  return isDomainRecord(meta) ? { ...meta } : undefined;
}
export function markDelegatesStackPatch(fn: unknown): void {
  if (typeof fn === 'function')
    Object.assign(fn, { __wp_delegatesStackPatch: true } satisfies Partial<DelegateMarkedFn>);
}
function metaNs(actions: ActionsNamespaceLike): MetaActionsNamespaceLike | null {
  return asDomainObject<MetaActionsNamespaceLike>(actions.meta);
}
export function metaNoBuild(
  actions: ActionsNamespaceLike,
  meta: ActionMetaLike | UnknownRecord | null | undefined,
  source: string
): ActionMetaLike {
  const ns = metaNs(actions);
  if (ns && typeof ns.noBuild === 'function') return ns.noBuild(asActionMeta(meta), source);
  return Object.assign({ source }, asActionMeta(meta) || {});
}
export function metaNoBuildNoHistory(
  actions: ActionsNamespaceLike,
  meta: ActionMetaLike | UnknownRecord | null | undefined,
  source: string
): ActionMetaLike {
  const ns = metaNs(actions);
  if (ns && typeof ns.noBuild === 'function' && typeof ns.noHistory === 'function')
    return ns.noBuild(ns.noHistory(asActionMeta(meta), source), source);
  return Object.assign({ source }, asActionMeta(meta) || {});
}
export function readRuntimeFlag(rt: unknown, key: RuntimeFlagKey, fallback: boolean): boolean {
  return !!readRuntimeScalarOrDefault(rt, key, fallback);
}
export function domainApiReportNonFatal(
  app: AppContainer,
  op: string,
  error: unknown,
  opts?: { throttleMs?: number; failFast?: boolean }
): void {
  const throttleMs = opts && typeof opts.throttleMs === 'number' ? Math.max(0, opts.throttleMs) : 4000;
  reportErrorThrottled(app, error, {
    where: 'kernel/domain_api',
    op,
    throttleMs,
    failFast: !!(opts && opts.failFast),
  });
  try {
    console.warn('[WardrobePro][domain_api][' + op + ']', error);
  } catch {}
  if (opts && opts.failFast && shouldFailFast(app)) throw error;
}
export function readNumberOrNull(value: unknown): number | null {
  const next = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;
  return typeof next === 'number' && Number.isFinite(next) ? next : null;
}
export function safeMapFromReader(
  reader: (() => UnknownRecord) | undefined,
  ensureObj: (value: unknown) => UnknownRecord = ensureDomainRecord
): UnknownRecord {
  return typeof reader === 'function' ? ensureObj(reader()) : {};
}
