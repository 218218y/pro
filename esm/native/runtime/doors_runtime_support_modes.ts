import { getTools } from './service_access.js';
import { readRootState } from './root_state_access.js';
import {
  type AppLike,
  type DoorUserDataLike,
  type ModeSliceLike,
  isRecord,
  getModeConst,
  readRecord,
} from './doors_runtime_support_shared.js';

function isModeSliceLike(value: unknown): value is ModeSliceLike {
  if (!isRecord(value)) return false;
  return (
    (typeof value.primary === 'undefined' || value.primary === null || typeof value.primary === 'string') &&
    (typeof value.opts === 'undefined' || value.opts === null || isRecord(value.opts))
  );
}

function isSketchInternalDrawersToolValue(tool: unknown): tool is string {
  return (
    typeof tool === 'string' && (tool === 'sketch_int_drawers' || tool.startsWith('sketch_int_drawers@'))
  );
}

function isSketchExternalDrawersToolValue(tool: unknown): tool is string {
  return typeof tool === 'string' && tool.startsWith('sketch_ext_drawers:');
}

function isSketchFreePlacementDoorUserData(userData: DoorUserDataLike | null | undefined): boolean {
  return !!(userData && userData.__wpSketchBoxDoor === true && userData.__wpSketchFreePlacement === true);
}

function isSketchDoorAuthoringToolValue(
  tool: unknown
): tool is 'sketch_box_door' | 'sketch_box_double_door' | 'sketch_box_door_hinge' {
  return (
    typeof tool === 'string' &&
    (tool === 'sketch_box_door' || tool === 'sketch_box_double_door' || tool === 'sketch_box_door_hinge')
  );
}

function isInteriorLayoutManualToolValue(tool: unknown): tool is string {
  if (typeof tool !== 'string' || !tool) return false;
  if (isSketchDoorAuthoringToolValue(tool)) return false;
  return (
    tool === 'shelf' ||
    tool === 'rod' ||
    tool === 'storage' ||
    tool.startsWith('sketch_shelf:') ||
    tool === 'sketch_rod' ||
    tool.startsWith('sketch_storage:') ||
    tool === 'sketch_box_divider' ||
    tool === 'sketch_box_divider_horizontal' ||
    isSketchExternalDrawersToolValue(tool) ||
    isSketchInternalDrawersToolValue(tool)
  );
}

export function getModeSlice(App: AppLike): ModeSliceLike | null {
  const state = readRecord(readRootState(App));
  if (!state) return null;
  return isModeSliceLike(state.mode) ? state.mode : null;
}

export function getSketchManualTool(App: AppLike): string | null {
  try {
    const st = readRecord(readRootState(App));
    const mode = readRecord(st?.mode);
    const opts = readRecord(mode?.opts);
    const mt = opts?.manualTool ?? null;
    if (typeof mt === 'string' && mt) return mt;
  } catch {
    // ignore
  }

  try {
    const tools = readRecord(getTools(App));
    const mt2 =
      tools && typeof tools.getInteriorManualTool === 'function'
        ? (tools.getInteriorManualTool() ?? null)
        : null;
    if (typeof mt2 === 'string' && mt2) return mt2;
  } catch {
    // ignore
  }

  try {
    const MANUAL = getModeConst('MANUAL_LAYOUT', 'manual_layout');
    const ms = getModeSlice(App);
    const cur = ms && typeof ms.primary === 'string' ? ms.primary : null;
    if (cur && String(cur) === String(MANUAL)) {
      const o = readRecord(ms?.opts);
      const mt3 = o?.manualTool ?? null;
      if (typeof mt3 === 'string' && mt3) return mt3;
    }
  } catch {
    // ignore
  }

  return null;
}

export function isManualLayoutEditActive(App: AppLike): boolean {
  try {
    const MANUAL_LAYOUT = getModeConst('MANUAL_LAYOUT', 'manual_layout');
    const ms = getModeSlice(App);
    const cur = ms && typeof ms.primary === 'string' ? ms.primary : null;
    return typeof cur === 'string' && cur === MANUAL_LAYOUT;
  } catch {
    return false;
  }
}

export function isSketchIntDrawersEditActive(App: AppLike): boolean {
  if (!isManualLayoutEditActive(App)) return false;
  const tool = getSketchManualTool(App);
  return isSketchInternalDrawersToolValue(tool);
}

export function isInteriorDoorEditModeActive(App: AppLike): boolean {
  try {
    const modes = {
      layout: getModeConst('LAYOUT', 'layout'),
      manualLayout: getModeConst('MANUAL_LAYOUT', 'manual_layout'),
      braceShelves: getModeConst('BRACE_SHELVES', 'brace_shelves'),
      extDrawer: getModeConst('EXT_DRAWER', 'ext_drawer'),
    };
    const ms = getModeSlice(App);
    const cur = ms && typeof ms.primary === 'string' ? ms.primary : null;
    if (!cur) return false;
    if (cur === modes.layout || cur === modes.braceShelves || cur === modes.extDrawer) return true;
    if (cur !== modes.manualLayout) return false;
    return isInteriorLayoutManualToolValue(getSketchManualTool(App));
  } catch {
    return false;
  }
}

export function shouldForceSketchFreeBoxDoorsOpen(
  manualTool: unknown,
  userData: DoorUserDataLike | null | undefined,
  opts?: { interiorDoorEditActive?: boolean }
): boolean {
  if (!isSketchFreePlacementDoorUserData(userData)) return false;
  if (isSketchDoorAuthoringToolValue(manualTool)) return false;
  if (opts?.interiorDoorEditActive === true) return true;
  return isSketchInternalDrawersToolValue(manualTool);
}

export function isSketchExtDrawersEditActive(App: AppLike): boolean {
  if (!isManualLayoutEditActive(App)) return false;
  const tool = getSketchManualTool(App);
  return isSketchExternalDrawersToolValue(tool);
}

export function isSketchEditActive(App: AppLike): boolean {
  if (!isManualLayoutEditActive(App)) return false;
  const tool = getSketchManualTool(App);
  return typeof tool === 'string' && tool.startsWith('sketch_');
}
