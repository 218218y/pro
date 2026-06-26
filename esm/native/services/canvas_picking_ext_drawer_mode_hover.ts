import type { AppContainer, UnknownRecord } from '../../../types';
import {
  __wp_clearSketchHover,
  __wp_readSketchHover,
  __wp_writeSketchHover,
} from './canvas_picking_local_helpers_runtime.js';

export const EXT_DRAWER_MODE_HOVER_TOOL = 'ext_drawer_mode';

export type ExtDrawerModeHoverKind = 'drawers' | 'ext_drawers';
export type ExtDrawerModeHoverOp = 'add' | 'remove';
export type ExtDrawerModeHoverModuleKey = number | 'corner' | `corner:${number}` | null;

export type ExtDrawerModeHoverRecord = UnknownRecord & {
  ts: number;
  tool: typeof EXT_DRAWER_MODE_HOVER_TOOL;
  moduleKey: ExtDrawerModeHoverModuleKey;
  isBottom: boolean;
  hostModuleKey: ExtDrawerModeHoverModuleKey;
  hostIsBottom: boolean;
  kind: ExtDrawerModeHoverKind;
  op: ExtDrawerModeHoverOp;
  removeId?: string;
  removeKind?: 'sketch' | 'std' | '';
  removePid?: string;
  __wpBlockedReason?: string;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function coerceExtDrawerModeHoverModuleKey(value: unknown): ExtDrawerModeHoverModuleKey {
  if (value === 'corner') return 'corner';
  if (typeof value === 'string' && /^corner:\d+$/u.test(value)) return value as `corner:${number}`;
  const n = readNumber(value);
  return n != null && Number.isInteger(n) ? n : null;
}

export function writeExtDrawerModeHover(
  App: AppContainer,
  args: {
    moduleKey: unknown;
    isBottom?: boolean;
    kind: ExtDrawerModeHoverKind;
    op: ExtDrawerModeHoverOp;
    yCenter?: number | null;
    baseY?: number | null;
    removeId?: string | null;
    removeKind?: 'sketch' | 'std' | '' | null;
    removePid?: string | null;
    drawerH?: number | null;
    drawerGap?: number | null;
    stackH?: number | null;
    drawerCount?: number | null;
    drawerHeightM?: number | null;
    blockedReason?: string | null;
  }
): ExtDrawerModeHoverRecord {
  const moduleKey = coerceExtDrawerModeHoverModuleKey(args.moduleKey);
  const record: ExtDrawerModeHoverRecord = {
    ts: Date.now(),
    tool: EXT_DRAWER_MODE_HOVER_TOOL,
    moduleKey,
    isBottom: !!args.isBottom,
    hostModuleKey: moduleKey,
    hostIsBottom: !!args.isBottom,
    kind: args.kind,
    op: args.op,
  };

  const optional: Record<string, unknown> = {
    yCenter: args.yCenter ?? undefined,
    baseY: args.baseY ?? undefined,
    removeId: args.removeId || undefined,
    removeKind: args.removeKind || undefined,
    removePid: args.removePid || undefined,
    drawerH: args.drawerH ?? undefined,
    drawerGap: args.drawerGap ?? undefined,
    stackH: args.stackH ?? undefined,
    drawerCount: args.drawerCount ?? undefined,
    drawerHeightM: args.drawerHeightM ?? undefined,
    __wpBlockedReason: args.blockedReason || undefined,
  };
  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined) record[key] = value;
  }
  __wp_writeSketchHover(App, record);
  return record;
}

export function readRecentExtDrawerModeHover(
  App: AppContainer,
  maxAgeMs = 900
): ExtDrawerModeHoverRecord | null {
  const hover = asRecord(__wp_readSketchHover(App));
  if (!hover || readString(hover.tool) !== EXT_DRAWER_MODE_HOVER_TOOL) return null;
  const ts = readNumber(hover.ts);
  if (ts == null || Date.now() - ts > maxAgeMs) return null;
  const kind = readString(hover.kind);
  const op = readString(hover.op);
  if ((kind !== 'drawers' && kind !== 'ext_drawers') || (op !== 'add' && op !== 'remove')) return null;
  return hover as ExtDrawerModeHoverRecord;
}

export function clearExtDrawerModeHover(App: AppContainer): void {
  const hover = asRecord(__wp_readSketchHover(App));
  if (hover && readString(hover.tool) === EXT_DRAWER_MODE_HOVER_TOOL) __wp_clearSketchHover(App);
}

export function extDrawerModeHoverMatchesModule(
  hover: ExtDrawerModeHoverRecord | null,
  moduleKey: unknown
): boolean {
  if (!hover) return false;
  const hoverModuleKey = coerceExtDrawerModeHoverModuleKey(hover.hostModuleKey ?? hover.moduleKey);
  const targetModuleKey = coerceExtDrawerModeHoverModuleKey(moduleKey);
  return (
    targetModuleKey == null || hoverModuleKey == null || String(hoverModuleKey) === String(targetModuleKey)
  );
}
