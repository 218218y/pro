import type { AppContainer } from '../../../types';
import { readModeOpts, readPrimaryMode, readUiState } from './canvas_picking_interior_hover_state.js';
import { readActiveManualTool, readCanvasPaintSelection } from './canvas_picking_tool_access.js';
import { parseSketchBoxToolSpec } from './canvas_picking_sketch_box_runtime_spec.js';

export type CanvasPrecisionAxis = 'horizontal' | 'vertical';
export type CanvasPrecisionClientPoint = { cx: number; cy: number };

type CanvasPrecisionAxisLockState = {
  pressed: boolean;
  scope: string | null;
  latest: CanvasPrecisionClientPoint | null;
  anchor: CanvasPrecisionClientPoint | null;
  axis: CanvasPrecisionAxis | null;
  localLatest: { x: number; y: number } | null;
  localAnchor: { x: number; y: number } | null;
  keyboardXOffsetM: number;
  keyboardYOffsetM: number;
};

const AXIS_DECISION_THRESHOLD_PX = 4;
const stateByApp = new WeakMap<object, CanvasPrecisionAxisLockState>();

function readPositiveDraftCm(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readManualToolScope(App: AppContainer, manualToolFromMode: unknown): string {
  const fromMode = typeof manualToolFromMode === 'string' ? manualToolFromMode : '';
  if (fromMode) return fromMode;
  return readActiveManualTool(App) || 'manual';
}

/**
 * Returns a stable scope only for authoring workflows where a 2D position is being chosen.
 * Ordinary paint, selection, measurement and camera interactions intentionally return null.
 */
export function readCanvasPrecisionAxisLockScope(App: AppContainer): string | null {
  const primary = readPrimaryMode(App);
  const opts = readModeOpts(App);

  if (primary === 'manual_layout') {
    return `manual_layout:${readManualToolScope(App, opts.manualTool)}`;
  }

  if (primary === 'handle' && opts.handlePlacement === 'manual') {
    return 'handle:manual';
  }

  if (primary === 'door_trim') {
    return 'door_trim:placement';
  }

  if (primary === 'groove') {
    const ui = readUiState(App);
    if (ui.grooveManualEnabled === true) return 'groove:manual';
    return null;
  }

  if (primary === 'paint') {
    const ui = readUiState(App);
    const hasSizedMirrorDraft =
      readPositiveDraftCm(ui.currentMirrorDraftWidthCm) != null ||
      readPositiveDraftCm(ui.currentMirrorDraftHeightCm) != null;
    if (!hasSizedMirrorDraft) return null;
    const selection = readCanvasPaintSelection(App);
    if (selection === 'mirror') return 'paint:mirror-sized';
    if (selection === 'black_glass' || selection === 'frosted_glass') return `paint:${selection}-sized`;
    return null;
  }

  return null;
}

function allowsCanvasPrecisionHorizontalKeyboardNudge(App: AppContainer): boolean {
  const primary = readPrimaryMode(App);
  const opts = readModeOpts(App);

  if (primary === 'handle' && opts.handlePlacement === 'manual') return true;
  if (primary === 'door_trim') return true;

  if (primary === 'groove') {
    const ui = readUiState(App);
    return ui.grooveManualEnabled === true && readPositiveDraftCm(ui.currentGrooveDraftWidthCm) != null;
  }

  if (primary === 'paint') {
    const ui = readUiState(App);
    if (readPositiveDraftCm(ui.currentMirrorDraftWidthCm) == null) return false;
    const selection = readCanvasPaintSelection(App);
    return selection === 'mirror' || selection === 'black_glass' || selection === 'frosted_glass';
  }

  if (primary === 'manual_layout') {
    const manualTool = readManualToolScope(App, opts.manualTool);
    if (manualTool === 'sketch_box_divider') return true;
    if (!manualTool.startsWith('sketch_box:')) return false;
    const spec = parseSketchBoxToolSpec(manualTool);
    return spec?.widthCm != null && Number.isFinite(spec.widthCm) && spec.widthCm > 0;
  }

  return false;
}

function getState(App: AppContainer): CanvasPrecisionAxisLockState {
  const key = App as object;
  const current = stateByApp.get(key);
  if (current) return current;
  const created: CanvasPrecisionAxisLockState = {
    pressed: false,
    scope: null,
    latest: null,
    anchor: null,
    axis: null,
    localLatest: null,
    localAnchor: null,
    keyboardXOffsetM: 0,
    keyboardYOffsetM: 0,
  };
  stateByApp.set(key, created);
  return created;
}

function clonePoint(point: CanvasPrecisionClientPoint): CanvasPrecisionClientPoint {
  return { cx: Number(point.cx), cy: Number(point.cy) };
}

export function setCanvasPrecisionAxisLockPressed(App: AppContainer, pressed: boolean): void {
  const state = getState(App);
  const next = !!pressed;
  if (state.pressed === next) return;

  const nextScope = readCanvasPrecisionAxisLockScope(App);
  const scopeChanged = state.scope !== nextScope;
  state.pressed = next;
  state.scope = nextScope;
  state.axis = null;
  state.anchor = next && nextScope && state.latest ? clonePoint(state.latest) : null;
  if (scopeChanged) {
    state.localLatest = null;
    state.keyboardXOffsetM = 0;
    state.keyboardYOffsetM = 0;
  }
  state.localAnchor = next && nextScope && state.localLatest ? { ...state.localLatest } : null;
}

export function resolveCanvasPrecisionAxisLockedClientPoint(
  App: AppContainer,
  point: CanvasPrecisionClientPoint
): CanvasPrecisionClientPoint {
  const current = clonePoint(point);
  const state = getState(App);
  const previousLatest = state.latest ? clonePoint(state.latest) : null;
  const nextScope = readCanvasPrecisionAxisLockScope(App);

  if (state.scope !== nextScope) {
    state.scope = nextScope;
    state.axis = null;
    state.anchor = state.pressed && nextScope ? previousLatest || clonePoint(current) : null;
    state.localAnchor = null;
    state.localLatest = null;
    state.keyboardXOffsetM = 0;
    state.keyboardYOffsetM = 0;
  }
  state.latest = clonePoint(current);

  if (!state.pressed || !nextScope) return current;
  if (!state.anchor) state.anchor = previousLatest || clonePoint(current);

  const dx = current.cx - state.anchor.cx;
  const dy = current.cy - state.anchor.cy;
  if (!state.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= AXIS_DECISION_THRESHOLD_PX) {
    state.axis = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
  }

  if (state.axis === 'horizontal') return { cx: current.cx, cy: state.anchor.cy };
  if (state.axis === 'vertical') return { cx: state.anchor.cx, cy: current.cy };
  return current;
}

export function resolveCanvasPrecisionAxisLockedLocalPoint(
  App: AppContainer,
  point: { x: number; y: number }
): { x: number; y: number } {
  const current = { x: Number(point.x), y: Number(point.y) };
  if (!Number.isFinite(current.x) || !Number.isFinite(current.y)) return current;

  const state = getState(App);
  const nextScope = readCanvasPrecisionAxisLockScope(App);
  const previousLatest = state.localLatest ? { ...state.localLatest } : null;
  if (state.scope !== nextScope) {
    state.scope = nextScope;
    state.axis = null;
    state.anchor = null;
    state.localAnchor = state.pressed && nextScope ? previousLatest || { ...current } : null;
    state.keyboardXOffsetM = 0;
    state.keyboardYOffsetM = 0;
  }
  state.localLatest = { ...current };

  let resolved = current;
  if (state.pressed && nextScope && state.axis) {
    if (!state.localAnchor) state.localAnchor = previousLatest || { ...current };

    resolved =
      state.axis === 'horizontal'
        ? { x: current.x, y: state.localAnchor.y }
        : { x: state.localAnchor.x, y: current.y };
  }

  if (!nextScope || (!state.keyboardXOffsetM && !state.keyboardYOffsetM)) return resolved;
  return {
    x: resolved.x + state.keyboardXOffsetM,
    y: resolved.y + state.keyboardYOffsetM,
  };
}

/**
 * Marks real pointer motion for positional authoring. Keyboard nudges deliberately
 * survive hover refreshes at the same client point, but the next physical move
 * hands control back to the pointer immediately.
 */
export function prepareCanvasPrecisionPointerMove(App: AppContainer): void {
  const state = getState(App);
  state.keyboardXOffsetM = 0;
  state.keyboardYOffsetM = 0;
}

export function hasCanvasPrecisionLocalPoint(App: AppContainer): boolean {
  const state = stateByApp.get(App as object);
  if (!state?.localLatest) return false;
  const scope = readCanvasPrecisionAxisLockScope(App);
  return !!scope && state.scope === scope;
}

/**
 * Moves the active positional authoring target horizontally in local/world X when the
 * active tool owns an explicit horizontal placement coordinate. Returns null for
 * workflows whose horizontal position is fixed by their host cell/surface.
 */
export function nudgeCanvasPrecisionLocalX(App: AppContainer, deltaM: number): number | null {
  const delta = Number(deltaM);
  if (!Number.isFinite(delta) || !delta) return null;
  if (!allowsCanvasPrecisionHorizontalKeyboardNudge(App)) return null;

  const state = getState(App);
  const nextScope = readCanvasPrecisionAxisLockScope(App);
  if (!nextScope) return null;
  if (state.scope !== nextScope) {
    state.scope = nextScope;
    state.axis = null;
    state.anchor = null;
    state.localAnchor = null;
    state.localLatest = null;
    state.keyboardXOffsetM = 0;
    state.keyboardYOffsetM = 0;
    return null;
  }
  if (!state.localLatest) return null;

  state.keyboardXOffsetM += delta;
  return state.localLatest.x + state.keyboardXOffsetM;
}

/**
 * Moves the active positional authoring target vertically in local/world Y.
 * Returns null until the active workflow has produced at least one local point,
 * so arrow keys never hijack unrelated controls or an uninitialized canvas.
 */
export function nudgeCanvasPrecisionLocalY(App: AppContainer, deltaM: number): number | null {
  const delta = Number(deltaM);
  if (!Number.isFinite(delta) || !delta) return null;

  const state = getState(App);
  const nextScope = readCanvasPrecisionAxisLockScope(App);
  if (!nextScope) return null;
  if (state.scope !== nextScope) {
    state.scope = nextScope;
    state.axis = null;
    state.anchor = null;
    state.localAnchor = null;
    state.localLatest = null;
    state.keyboardXOffsetM = 0;
    state.keyboardYOffsetM = 0;
    return null;
  }
  if (!state.localLatest) return null;

  state.keyboardYOffsetM += delta;
  return state.localLatest.y + state.keyboardYOffsetM;
}

export function clearCanvasPrecisionAxisLock(App: AppContainer): void {
  stateByApp.delete(App as object);
}
