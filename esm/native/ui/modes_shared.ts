import { getMode } from './store_access.js';
import { MODES, getTools, getUiFeedback, reportError } from '../services/api.js';

import type {
  AppContainer,
  ModeActionOptsLike,
  ModeStateLike,
  ToolsNamespaceLike,
  UiFeedbackNamespaceLike,
} from '../../../types';

export type ModesMap = Record<string, string> &
  Partial<{
    NONE: string;
    HANDLE: string;
    LAYOUT: string;
    MANUAL_LAYOUT: string;
    EXT_DRAWER: string;
    INT_DRAWER: string;
    DIVIDER: string;
    REMOVE_DOOR: string;
    BRACE_SHELVES: string;
  }>;

export type HandlesToolLike = { purgeHandlesForRemovedDoors?: (forceEnabled: boolean) => unknown };

export type ToolsSurfaceLike = ToolsNamespaceLike & {
  handles?: HandlesToolLike;
  handleService?: HandlesToolLike;
  handle?: HandlesToolLike;
};

export type ScrollRootLike = { scrollTop?: number };
export type WindowScrollLike = { scrollTo?: (x: number, y: number) => unknown };
export type ActiveElementLike = { blur?: () => unknown };
export type BodyLike = { style?: { cursor?: string } };
export type DocumentWithScrollLike = Document & {
  body?: HTMLElement & BodyLike;
  documentElement?: HTMLElement & ScrollRootLike;
  scrollingElement?: Element & ScrollRootLike;
  activeElement?: Element | ActiveElementLike | null;
};
export type DrawerVisualPositionLike = { copy?: (source: unknown) => unknown };
export type DrawerVisualGroupLike = {
  position?: DrawerVisualPositionLike | null;
  userData?: Record<string, unknown> | null;
};
export type DrawerVisualLike = {
  id?: string | number | null;
  drawerId?: string | number | null;
  isOpen?: boolean;
  group?: DrawerVisualGroupLike | null;
  closed?: unknown;
};
export type RenderSurfaceLike = { drawersArray?: DrawerVisualLike[] };
export type ModeStoreLike = {
  subscribe?: (listener: () => void) => (() => void) | { unsubscribe?: () => void } | null;
};

export type AppLike = AppContainer & {
  modes?: ModesMap;
  store?: ModeStoreLike;
  setPrimaryMode?: (mode: string, opts?: ModeActionOptsLike) => void;
  actions?: Record<string, unknown>;
  tools?: ToolsSurfaceLike;
  services?: Record<string, unknown>;
  render?: RenderSurfaceLike;
  platform?: Record<string, unknown>;
  flags?: Record<string, unknown>;
  config?: Record<string, unknown>;
  edit?: Record<string, unknown>;
  uiFeedback?: UiFeedbackNamespaceLike;
};

export type UiFeedbackWithEditStateToast = UiFeedbackNamespaceLike & {
  updateEditStateToast?: (text: string | null, isActive: boolean) => unknown;
};

export function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export function getStringProp(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}

export function getNullableStringProp(obj: unknown, key: string): string | null | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  if (typeof v === 'string') return v;
  return v === null ? null : undefined;
}

export function getNumberProp(obj: unknown, key: string): number | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === 'number' ? v : undefined;
}

export function getRecordProp(obj: unknown, key: string): ModeActionOptsLike | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return isRecord(v) ? v : undefined;
}

export function getModesMap(): ModesMap {
  return isRecord(MODES) ? MODES : {};
}

function stableSerializeModeValue(value: unknown, seen: WeakSet<object> = new WeakSet<object>()): string {
  if (value == null) return 'null';
  const valueType = typeof value;
  if (valueType === 'string') return JSON.stringify(value);
  if (valueType === 'number' || valueType === 'boolean') return String(value);
  if (valueType !== 'object') return JSON.stringify(String(value));

  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerializeModeValue(item, seen)).join(',')}]`;
  }

  const rec = isRecord(value) ? value : null;
  if (!rec) return JSON.stringify(String(value));
  if (seen.has(rec)) return '"[Circular]"';
  seen.add(rec);
  const parts: string[] = [];
  for (const key of Object.keys(rec).sort()) {
    const next = rec[key];
    if (typeof next === 'undefined') continue;
    parts.push(`${JSON.stringify(key)}:${stableSerializeModeValue(next, seen)}`);
  }
  seen.delete(rec);
  return `{${parts.join(',')}}`;
}

export function buildModeActionOptsFingerprint(value: unknown): string {
  return stableSerializeModeValue(isRecord(value) ? value : {});
}

export function asModeState(value: unknown): ModeStateLike {
  if (!isRecord(value)) return {};
  return value;
}

export function getModeState(App: AppLike): ModeStateLike {
  try {
    const modeState = getMode(App);
    return asModeState(modeState);
  } catch (_e) {
    return {};
  }
}

export function getPrimaryModeValue(App: AppLike): string {
  const NONE = getModesMap().NONE ?? 'none';
  try {
    const modeState = getMode(App);
    return getStringProp(modeState, 'primary') || NONE;
  } catch (_e) {
    return NONE;
  }
}

export function getPrimaryModeOptsValue(App: AppLike): Record<string, unknown> {
  try {
    const modeState = getMode(App);
    return getRecordProp(modeState, 'opts') || {};
  } catch (_e) {
    return {};
  }
}

export function isModeActiveValue(App: AppLike, mode: string): boolean {
  if (!mode) return false;
  return getPrimaryModeValue(App) === mode;
}

export function isDocumentWithScroll(doc: Document | null | undefined): doc is DocumentWithScrollLike {
  return !!doc && typeof doc === 'object';
}

export function asDocumentWithScroll(doc: Document | null | undefined): DocumentWithScrollLike | null {
  return isDocumentWithScroll(doc) ? doc : null;
}

export function isBodyLike(value: unknown): value is BodyLike {
  if (!isRecord(value)) return false;
  const style = value.style;
  return style == null || isRecord(style);
}

export function asBody(value: unknown): BodyLike | null {
  return isBodyLike(value) ? value : null;
}

export function isWindowScrollLike(value: unknown): value is WindowScrollLike {
  if (!isRecord(value)) return false;
  const scrollTo = value.scrollTo;
  return scrollTo == null || typeof scrollTo === 'function';
}

export function asWindowScroll(value: unknown): WindowScrollLike | null {
  return isWindowScrollLike(value) ? value : null;
}

export function isActiveElementLike(value: unknown): value is ActiveElementLike {
  if (!isRecord(value)) return false;
  const blur = value.blur;
  return blur == null || typeof blur === 'function';
}

export function asActiveElement(value: unknown): ActiveElementLike | null {
  return isActiveElementLike(value) ? value : null;
}

export function isUiFeedbackWithEditStateToast(value: unknown): value is UiFeedbackWithEditStateToast {
  if (!isRecord(value)) return false;
  const updateEditStateToast = value.updateEditStateToast;
  return updateEditStateToast == null || typeof updateEditStateToast === 'function';
}

export function asUiFeedback(value: unknown): UiFeedbackWithEditStateToast | null {
  return isUiFeedbackWithEditStateToast(value) ? value : null;
}

export function getScrollRoot(doc: Document | null | undefined): ScrollRootLike | null {
  const d = asDocumentWithScroll(doc);
  const candidate = d ? d.scrollingElement || d.documentElement || d.body : null;
  return candidate && typeof candidate === 'object' ? candidate : null;
}

export function isToolsSurfaceLike(value: unknown): value is ToolsSurfaceLike {
  return isRecord(value);
}

export function getHandlesTools(App: AppLike): HandlesToolLike | null {
  const tools = getTools(App);
  if (!isToolsSurfaceLike(tools)) return null;
  return tools.handles || tools.handleService || tools.handle || null;
}

const __modesSoftSeen = new Map<string, number>();

export function modesReportNonFatal(App: AppLike, op: string, err: unknown, throttleMs = 4000): void {
  try {
    const now = Date.now();
    const prev = __modesSoftSeen.get(op) || 0;
    if (prev && now - prev < throttleMs) return;
    __modesSoftSeen.set(op, now);
    if (__modesSoftSeen.size > 400) {
      for (const [k, ts] of __modesSoftSeen) {
        if (now - ts > throttleMs * 3) __modesSoftSeen.delete(k);
      }
    }
  } catch (_e) {
    // ignore dedupe bookkeeping failures
  }
  try {
    reportError(App, err, { where: 'native/ui/modes', op, fatal: false }, { consoleFallback: false });
  } catch (_e) {
    // ignore reporting failures
  }
}

export function safeUpdateEditToast(App: AppLike, text: string | null, isActive: boolean): void {
  try {
    const fb = asUiFeedback(getUiFeedback(App));
    if (fb && typeof fb.updateEditStateToast === 'function') {
      fb.updateEditStateToast(text, !!isActive);
      return;
    }
    if (text && isActive && fb && typeof fb.toast === 'function') fb.toast(text, 'info');
  } catch (_e) {
    // ignore
  }
}
