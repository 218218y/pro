import type { AppContainer, TimeoutHandleLike, UnknownRecord } from '../../../../../types';
import { getBrowserTimers, MODES } from '../../../services/api.js';
import { toggleIntDrawerMode as interiorToggleIntDrawerMode } from '../actions/interior_actions.js';
import {
  SKETCH_BOX_OPTIONAL_DIM_MAX_CM,
  SKETCH_BOX_OPTIONAL_DIM_MIN_CM,
  asStr,
  clampSketch,
} from './interior_tab_helpers.js';
import type { DoorTrimUiAxis, DoorTrimUiColor, DoorTrimUiSpan } from './interior_tab_helpers.js';
import type { InteriorWorkflowModeIds } from './interior_tab_workflows_controller_contracts.js';

type InteriorDrawerModeBootstrapState = {
  handle: TimeoutHandleLike | null;
  token: number;
  clearTimeoutFn: (handle?: TimeoutHandleLike | null) => void;
};

const interiorDrawerModeBootstrapPending = new WeakMap<AppContainer, InteriorDrawerModeBootstrapState>();

export function createInteriorWorkflowModeIds(): InteriorWorkflowModeIds {
  return {
    layout: asStr(MODES.LAYOUT, 'layout'),
    manualLayout: asStr(MODES.MANUAL_LAYOUT, 'manual_layout'),
    braceShelves: asStr(MODES.BRACE_SHELVES, 'brace_shelves'),
    extDrawer: asStr(MODES.EXT_DRAWER, 'ext_drawer'),
    doorTrim: asStr(MODES.DOOR_TRIM, 'door_trim'),
  };
}

export function clampInteriorSketchOptionalDim(value: number | ''): number | null {
  return typeof value === 'number'
    ? clampSketch(value, SKETCH_BOX_OPTIONAL_DIM_MIN_CM, SKETCH_BOX_OPTIONAL_DIM_MAX_CM)
    : null;
}

export function createDoorTrimModeOpts(args: {
  axis: DoorTrimUiAxis;
  span: DoorTrimUiSpan;
  color: DoorTrimUiColor;
  sizeCm?: number | '';
  crossSizeCm?: number | '';
}): UnknownRecord {
  const nextSize =
    typeof args.sizeCm === 'number' && Number.isFinite(args.sizeCm) && args.sizeCm > 0
      ? args.sizeCm
      : undefined;
  const nextCrossSize =
    typeof args.crossSizeCm === 'number' && Number.isFinite(args.crossSizeCm) && args.crossSizeCm > 0
      ? args.crossSizeCm
      : undefined;
  return {
    trimAxis: args.axis,
    trimColor: args.color,
    trimSpan: args.span,
    trimSizeCm: nextSize,
    trimCrossSizeCm: nextCrossSize,
  };
}

export function clearInteriorDrawerModeBootstrap(app: AppContainer): void {
  const pending = interiorDrawerModeBootstrapPending.get(app);
  if (!pending) return;
  interiorDrawerModeBootstrapPending.delete(app);
  pending.token += 1;
  const handle = pending.handle;
  pending.handle = null;
  try {
    pending.clearTimeoutFn(handle);
  } catch {
    // ignore
  }
}

export function scheduleInteriorDrawerModeBootstrap(app: AppContainer): void {
  const existing = interiorDrawerModeBootstrapPending.get(app);
  if (existing?.handle) return;
  try {
    const timers = getBrowserTimers(app);
    const token = Number(existing?.token || 0) + 1;
    const state: InteriorDrawerModeBootstrapState = {
      handle: null,
      token,
      clearTimeoutFn: handle => {
        try {
          timers.clearTimeout(handle || undefined);
        } catch {
          // ignore
        }
      },
    };
    const pending = timers.setTimeout(() => {
      const current = interiorDrawerModeBootstrapPending.get(app);
      if (!current || current.token !== token || current.handle !== pending) return;
      interiorDrawerModeBootstrapPending.delete(app);
      current.handle = null;
      try {
        interiorToggleIntDrawerMode(app);
      } catch {
        // ignore
      }
    }, 0);
    state.handle = pending;
    interiorDrawerModeBootstrapPending.set(app, state);
    return;
  } catch {
    interiorDrawerModeBootstrapPending.delete(app);
  }
  try {
    interiorToggleIntDrawerMode(app);
  } catch {
    // ignore
  }
}
