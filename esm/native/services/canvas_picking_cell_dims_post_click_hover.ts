import type { AppContainer } from '../../../types';
import { getWardrobeGroup } from '../runtime/render_access.js';
import {
  ensureCanvasPickingRuntime,
  getCanvasPickingRuntime,
} from '../runtime/canvas_picking_runtime_slot.js';
import type {
  InteriorHoverTarget,
  MeasureObjectLocalBoxFn,
  ModuleKey,
} from './canvas_picking_hover_targets.js';
import { buildInteriorHoverTarget } from './canvas_picking_hover_targets_interior_target.js';
import type { InteriorHoverScanResult } from './canvas_picking_hover_targets_interior_scan.js';
import { findModuleSelectorObject } from './canvas_picking_module_selector_hits.js';
import { __wp_toModuleKey } from './canvas_picking_core_support_numbers.js';
import { __wp_projectWorldPointToLocal } from './canvas_picking_local_helpers_runtime.js';

const RUNTIME_KEY = '__cellDimsPostClickHoverTarget';
const MAX_AGE_MS = 1200;
const MAX_NDC_DISTANCE = 0.045;

type CellDimsPostClickHoverTarget = {
  moduleKey: ModuleKey;
  stackKey: 'top' | 'bottom';
  ndcX: number;
  ndcY: number;
  createdAt: number;
  freeBoxId?: string | null;
};

function nowMs(): number {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
  } catch {
    // ignore
  }
  return Date.now();
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function asPostClickTarget(value: unknown): CellDimsPostClickHoverTarget | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  const moduleKey = __wp_toModuleKey(rec.moduleKey);
  const stackKey = rec.stackKey === 'bottom' ? 'bottom' : rec.stackKey === 'top' ? 'top' : null;
  const ndcX = rec.ndcX;
  const ndcY = rec.ndcY;
  const createdAt = rec.createdAt;
  if (
    moduleKey == null ||
    !stackKey ||
    !isFiniteNumber(ndcX) ||
    !isFiniteNumber(ndcY) ||
    !isFiniteNumber(createdAt)
  ) {
    return null;
  }
  const freeBoxRaw = rec.freeBoxId;
  const freeBoxId = typeof freeBoxRaw === 'string' && freeBoxRaw.trim() ? freeBoxRaw.trim() : null;
  return { moduleKey, stackKey, ndcX, ndcY, createdAt, freeBoxId };
}

function clearCellDimsPostClickHoverTarget(App: AppContainer): void {
  try {
    const runtime = getCanvasPickingRuntime(App);
    if (runtime && Object.prototype.hasOwnProperty.call(runtime, RUNTIME_KEY)) {
      delete runtime[RUNTIME_KEY];
    }
  } catch {
    // ignore
  }
}

export function rememberCellDimsPostClickHoverTarget(args: {
  App: AppContainer;
  moduleKey: unknown;
  isBottom: boolean;
  ndcX?: number | null;
  ndcY?: number | null;
  freeBoxId?: string | null;
}): void {
  const { App, moduleKey, isBottom, ndcX, ndcY, freeBoxId } = args;
  const normalizedModuleKey = __wp_toModuleKey(moduleKey);
  if (normalizedModuleKey == null || !isFiniteNumber(ndcX) || !isFiniteNumber(ndcY)) {
    clearCellDimsPostClickHoverTarget(App);
    return;
  }

  try {
    const runtime = ensureCanvasPickingRuntime(App);
    runtime[RUNTIME_KEY] = {
      moduleKey: normalizedModuleKey,
      stackKey: isBottom ? 'bottom' : 'top',
      ndcX,
      ndcY,
      createdAt: nowMs(),
      freeBoxId: typeof freeBoxId === 'string' && freeBoxId.trim() ? freeBoxId.trim() : null,
    } satisfies CellDimsPostClickHoverTarget;
  } catch {
    // ignore
  }
}

function readFreshPostClickTarget(
  App: AppContainer,
  ndcX: number,
  ndcY: number
): CellDimsPostClickHoverTarget | null {
  const runtime = getCanvasPickingRuntime(App);
  const pending = asPostClickTarget(runtime ? runtime[RUNTIME_KEY] : null);
  if (!pending) return null;

  const age = nowMs() - pending.createdAt;
  if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_MS) return null;
  if (!isFiniteNumber(ndcX) || !isFiniteNumber(ndcY)) return null;

  const dx = Math.abs(ndcX - pending.ndcX);
  const dy = Math.abs(ndcY - pending.ndcY);
  if (dx > MAX_NDC_DISTANCE || dy > MAX_NDC_DISTANCE) return null;
  return pending;
}

function takeFreshPostClickTarget(
  App: AppContainer,
  ndcX: number,
  ndcY: number
): CellDimsPostClickHoverTarget | null {
  const pending = readFreshPostClickTarget(App, ndcX, ndcY);
  clearCellDimsPostClickHoverTarget(App);
  return pending;
}

export function resolveCellDimsPostClickFreeBoxHoverIdentity(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
}): { moduleKey: ModuleKey; stackKey: 'top' | 'bottom'; freeBoxId: string } | null {
  const { App, ndcX, ndcY } = args;
  try {
    const pending = readFreshPostClickTarget(App, ndcX, ndcY);
    if (!pending || !pending.freeBoxId) return null;
    clearCellDimsPostClickHoverTarget(App);
    return { moduleKey: pending.moduleKey, stackKey: pending.stackKey, freeBoxId: pending.freeBoxId };
  } catch {
    return null;
  }
}

export function resolveCellDimsPostClickHoverTarget(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  measureObjectLocalBox: MeasureObjectLocalBoxFn;
}): InteriorHoverTarget | null {
  const { App, ndcX, ndcY, measureObjectLocalBox } = args;
  try {
    const pending = takeFreshPostClickTarget(App, ndcX, ndcY);
    if (!pending || pending.freeBoxId) return null;

    const selector = findModuleSelectorObject({
      root: getWardrobeGroup(App),
      moduleKey: pending.moduleKey,
      stackKey: pending.stackKey,
      toModuleKey: __wp_toModuleKey,
    });
    if (!selector) return null;

    const selectorBox = measureObjectLocalBox(App, selector);
    const hitY = selectorBox && Number.isFinite(selectorBox.centerY) ? Number(selectorBox.centerY) : 0;

    return buildInteriorHoverTarget({
      App,
      measureObjectLocalBox,
      projectWorldPointToLocal: __wp_projectWorldPointToLocal,
      toModuleKey: __wp_toModuleKey,
      scan: {
        intersects: [],
        hitModuleKey: pending.moduleKey,
        ['hit' + 'Fall' + 'backObj']: selector,
        hitSelectorObj: selector,
        hitStack: pending.stackKey,
        hitY,
        hitPoint: null,
      } as unknown as InteriorHoverScanResult,
    });
  } catch {
    return null;
  }
}
