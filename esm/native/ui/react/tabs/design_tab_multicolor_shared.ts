import type { AppContainer, UnknownRecord } from '../../../../../types';
import { STANDARD_CABINET_COLOR_SWATCHES } from '../../../../shared/standard_cabinet_textures_shared.js';

import { reportError } from '../../../services/api.js';

const __designTabReportNonFatalSeen = new Map<string, number>();

function readDesignTabReportArgs(args: ArrayLike<unknown>): {
  app: AppContainer | null;
  op: string;
  err: unknown;
  throttleMs: number;
} {
  if (args.length >= 3 && typeof args[0] !== 'string' && typeof args[1] === 'string') {
    return {
      app: args[0] && typeof args[0] === 'object' ? (args[0] as AppContainer) : null,
      op: String(args[1] || 'unknown'),
      err: args[2],
      throttleMs: typeof args[3] === 'number' && Number.isFinite(args[3]) ? Math.max(0, args[3]) : 4000,
    };
  }

  return {
    app: null,
    op: String(args[0] || 'unknown'),
    err: args[1],
    throttleMs: typeof args[2] === 'number' && Number.isFinite(args[2]) ? Math.max(0, args[2]) : 4000,
  };
}

type DesignTabReportNonFatalArgs =
  | [op: string, err: unknown, throttleMs?: number]
  | [app: AppContainer | null | undefined, op: string, err: unknown, throttleMs?: number];

export function __designTabReportNonFatal(...args: DesignTabReportNonFatalArgs): void {
  const { app, op, err, throttleMs } = readDesignTabReportArgs(args);
  const now = Date.now();
  let msg = 'unknown';
  if (typeof err === 'string') msg = err;
  else if (typeof err === 'number' || typeof err === 'boolean') msg = String(err);
  else if (isRecord(err)) {
    if (typeof err.stack === 'string' && err.stack) msg = err.stack.split('\n')[0] || err.stack;
    else if (typeof err.message === 'string' && err.message) msg = err.message;
  }
  const key = `${op}::${msg}`;
  const prev = __designTabReportNonFatalSeen.get(key) || 0;
  if (throttleMs > 0 && prev && now - prev < throttleMs) return;
  __designTabReportNonFatalSeen.set(key, now);
  if (__designTabReportNonFatalSeen.size > 600) {
    const pruneOlderThan = Math.max(10000, throttleMs * 4);
    for (const [k, ts] of __designTabReportNonFatalSeen) {
      if (now - ts > pruneOlderThan) __designTabReportNonFatalSeen.delete(k);
    }
  }
  if (app) {
    reportError(
      app,
      err,
      { where: 'native/ui/react/design_tab', op, fatal: false },
      { consoleOutput: false }
    );
    return;
  }
  try {
    console.error(`[WardrobePro][DesignTab] ${op}`, err);
  } catch {
    // ignore no-app console failures
  }
}

export type SavedColor = {
  id: string;
  name: string;
  type: 'color' | 'texture';
  value: string;
  textureData: string | null;
  locked?: boolean;
};

export type CurtainPreset = 'none' | 'white' | 'pink' | 'purple';

export type DefaultColorLike = {
  value?: unknown;
  name?: unknown;
  type?: unknown;
  textureData?: unknown;
};

export type DefaultSwatch = {
  paintId: string;
  title: string;
  val: string;
  isTexture?: boolean;
  textureData?: string | null;
};

export function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function mapHasAny(map: unknown, pred: (v: unknown) => boolean): boolean {
  if (!isRecord(map)) return false;
  try {
    return Object.values(map).some(v => pred(v));
  } catch {
    return false;
  }
}

export function mapHasAnyTrue(map: unknown): boolean {
  return mapHasAny(map, v => v === true);
}

export function normalizeSavedColors(raw: unknown): SavedColor[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedColor[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const value = typeof item.value === 'string' ? item.value.trim() : '';
    if (!id || !value || seen.has(id)) continue;

    const rawName = typeof item.name === 'string' ? item.name.trim() : '';
    const name = rawName || 'ללא שם';
    const type: 'color' | 'texture' = item.type === 'texture' ? 'texture' : 'color';
    const textureData = typeof item.textureData === 'string' ? item.textureData : null;
    const locked = item.locked === true;

    out.push({ id, name, type, value, textureData, locked });
    seen.add(id);
  }
  return out;
}

export const DEFAULT_COLOR_SWATCHES: SavedColor[] = STANDARD_CABINET_COLOR_SWATCHES.map(swatch => ({
  id: swatch.id,
  name: swatch.name,
  type: swatch.type,
  value: swatch.value,
  textureData: swatch.textureData,
}));

export const MULTI_CURTAIN_LABELS: Record<CurtainPreset, string> = {
  none: 'ללא',
  white: 'לבן',
  pink: 'ורוד',
  purple: 'סגול',
};

export type CurtainChoiceOption = { id: CurtainPreset; label: string };

export const CURTAIN_OPTIONS: CurtainChoiceOption[] = [
  { id: 'none', label: MULTI_CURTAIN_LABELS.none },
  { id: 'white', label: MULTI_CURTAIN_LABELS.white },
  { id: 'pink', label: MULTI_CURTAIN_LABELS.pink },
  { id: 'purple', label: MULTI_CURTAIN_LABELS.purple },
];

export function isCurtainPreset(v: string): v is CurtainPreset {
  return v === 'none' || v === 'white' || v === 'pink' || v === 'purple';
}

function readDefaultSwatch(c: DefaultColorLike | SavedColor): DefaultSwatch {
  const value = String(c && c.value ? c.value : '');
  const type = c && c.type === 'texture' ? 'texture' : 'color';
  const textureData = typeof c?.textureData === 'string' ? c.textureData : null;
  return {
    paintId: value,
    title: String(c && c.name ? c.name : ''),
    val: value,
    isTexture: type === 'texture' && !!textureData,
    textureData,
  };
}

export function readDefaultColorsFromApp(app: Pick<AppContainer, 'ui'>): DefaultColorLike[] | null {
  const ui = isRecord(app.ui) ? app.ui : null;
  const colors = ui && isRecord(ui.colors) ? ui.colors : null;
  const defaults = colors?.DEFAULT_COLORS;
  if (!Array.isArray(defaults)) return null;
  return defaults.filter(isRecord);
}

export function buildDesignTabDefaultSwatchesFromUi(ui: unknown): DefaultSwatch[] {
  const colors = isRecord(ui) && isRecord(ui.colors) ? ui.colors : null;
  const defaults = colors?.DEFAULT_COLORS;
  const defaultsFromApp = Array.isArray(defaults) ? defaults.filter(isRecord) : null;
  return Array.isArray(defaultsFromApp)
    ? defaultsFromApp.map(readDefaultSwatch).filter(c => !!c.paintId && !!c.val)
    : DEFAULT_COLOR_SWATCHES.map(readDefaultSwatch);
}

export function buildDesignTabDefaultSwatches(app: AppContainer): DefaultSwatch[] {
  const defaultsFromApp = readDefaultColorsFromApp(app);
  return Array.isArray(defaultsFromApp)
    ? defaultsFromApp.map(readDefaultSwatch).filter(c => !!c.paintId && !!c.val)
    : DEFAULT_COLOR_SWATCHES.map(readDefaultSwatch);
}

export function asUnknownRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? { ...value } : null;
}
