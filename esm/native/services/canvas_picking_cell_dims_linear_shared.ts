import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../types';
import type { CanvasLinearCellDimsArgs } from './canvas_picking_cell_dims_contracts.js';

import { getUiFeedback } from '../runtime/service_access.js';
import { readRootState } from '../runtime/root_state_access.js';
import { __wp_metaNoBuild } from './canvas_picking_core_helpers.js';

export type ModuleShape = UnknownRecord & { doors?: unknown; specialDims?: unknown };
export type FeedbackShape = { updateEditStateToast?: (message: string, sticky?: boolean) => unknown };

export interface LinearCellDimsContext extends CanvasLinearCellDimsArgs {
  idx: number;
  moduleCount: number;
  wardrobeType: string;
  totalW: number;
  totalH: number;
  totalD: number;
  doorsPerModule: number[];
  fallbackW: number[];
  prevModsCfg: unknown[];
  widthsCurr: number[];
  heightsCurr: number[];
  depthsCurr: number[];
  baseW: number[];
  baseH: number[];
  baseD: number[];
  tgtW: number;
  tgtH: number;
  tgtD: number;
  didToggleBack: boolean;
  toggledBackW: boolean;
  toggledBackH: boolean;
  toggledBackD: boolean;
}

export type EnsureOwnLinearModule = (i: number) => ModuleShape;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asModuleShape(value: unknown): ModuleShape {
  return asRecord(value) || {};
}

export function readArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

export function readString(rec: unknown, key: string, fallback = ''): string {
  const obj = asRecord(rec);
  const value = obj ? obj[key] : undefined;
  return typeof value === 'string' && value ? value : fallback;
}

export function readBool(rec: unknown, key: string): boolean {
  const obj = asRecord(rec);
  return !!(obj && obj[key]);
}

export function readSpecialDimsRecord(cfgMod: unknown): UnknownRecord | null {
  const mod = asRecord(cfgMod);
  const dims = mod ? asRecord(mod.specialDims) : null;
  return dims || null;
}

export function cloneModuleRecord(value: unknown): ModuleShape {
  return { ...asModuleShape(value) };
}

export function readModulesStructureFromRootState(state: unknown): unknown[] | null {
  const root = asRecord(state);
  const build = asRecord(root?.build);
  return readArray(build?.modulesStructure);
}

export function readModulesStructureFromCfg(cfg: UnknownRecord): unknown[] | null {
  return readArray(cfg.modulesStructure);
}

export function createHistoryableNoBuildMeta(App: AppContainer, source: string): ActionMetaLike {
  return __wp_metaNoBuild(App, source, { immediate: true });
}

export function readToastFn(App: AppContainer): FeedbackShape['updateEditStateToast'] | null {
  const feedback = asRecord(getUiFeedback(App));
  const fn = feedback ? feedback.updateEditStateToast : null;
  return typeof fn === 'function' ? (message, sticky) => fn(message, sticky) : null;
}

export function readBuildModulesStructure(App: AppContainer): unknown[] | null {
  return readModulesStructureFromRootState(readRootState(App));
}
