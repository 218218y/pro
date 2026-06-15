import type { ConfigStateLike, ModeStateLike, UiStateLike, UnknownRecord } from '../../../types';

import { normalizeKnownMapSnapshot } from '../runtime/maps_access.js';

function readBuildUiToggle(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function readModePrimary(modeSnapshot: ModeStateLike | null | undefined): string {
  const value = modeSnapshot?.primary;
  return typeof value === 'string' ? value : '';
}

function isRemoveDoorsBuildVisible(
  uiSnapshot: UiStateLike,
  modeSnapshot: ModeStateLike | null | undefined
): boolean {
  return readBuildUiToggle(uiSnapshot.removeDoorsEnabled) || readModePrimary(modeSnapshot) === 'remove_door';
}

function asMutableRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

type HiddenSketchDoorGrooveResult = {
  value: unknown;
  changed: boolean;
};

function hideSketchBoxDoorGroovesInDoorList(doorsValue: unknown): HiddenSketchDoorGrooveResult {
  if (!Array.isArray(doorsValue)) return { value: doorsValue, changed: false };
  let changed = false;
  const nextDoors = doorsValue.map(doorValue => {
    const door = asMutableRecord(doorValue);
    if (!door || (door.groove !== true && door.grooveLinesCount == null)) return doorValue;
    changed = true;
    return { ...door, groove: false, grooveLinesCount: null };
  });
  return { value: changed ? nextDoors : doorsValue, changed };
}

function hideSketchBoxDoorGroovesInSketchExtras(sketchExtrasValue: unknown): HiddenSketchDoorGrooveResult {
  const sketchExtras = asMutableRecord(sketchExtrasValue);
  const boxes = Array.isArray(sketchExtras?.boxes) ? sketchExtras.boxes : null;
  if (!sketchExtras || !boxes) return { value: sketchExtrasValue, changed: false };

  let changed = false;
  const nextBoxes = boxes.map(boxValue => {
    const box = asMutableRecord(boxValue);
    if (!box) return boxValue;
    const nextDoors = hideSketchBoxDoorGroovesInDoorList(box.doors);
    if (!nextDoors.changed) return boxValue;
    changed = true;
    return { ...box, doors: nextDoors.value };
  });

  if (!changed) return { value: sketchExtrasValue, changed: false };
  return { value: { ...sketchExtras, boxes: nextBoxes }, changed: true };
}

function hideSketchBoxDoorGroovesInModuleList(modulesValue: unknown): HiddenSketchDoorGrooveResult {
  if (!Array.isArray(modulesValue)) return { value: modulesValue, changed: false };
  let changed = false;
  const nextModules = modulesValue.map(moduleValue => {
    const moduleConfig = asMutableRecord(moduleValue);
    if (!moduleConfig) return moduleValue;
    const nextSketchExtras = hideSketchBoxDoorGroovesInSketchExtras(moduleConfig.sketchExtras);
    if (!nextSketchExtras.changed) return moduleValue;
    changed = true;
    return { ...moduleConfig, sketchExtras: nextSketchExtras.value };
  });

  return { value: changed ? nextModules : modulesValue, changed };
}

function hideSketchBoxDoorGroovesInCornerConfiguration(cornerValue: unknown): HiddenSketchDoorGrooveResult {
  const corner = asMutableRecord(cornerValue);
  if (!corner) return { value: cornerValue, changed: false };

  let nextCorner: UnknownRecord | null = null;
  const nextTopModules = hideSketchBoxDoorGroovesInModuleList(corner.modulesConfiguration);
  if (nextTopModules.changed) {
    nextCorner = { ...corner, modulesConfiguration: nextTopModules.value };
  }

  const lower = asMutableRecord(corner.stackSplitLower);
  const nextLowerModules = lower
    ? hideSketchBoxDoorGroovesInModuleList(lower.modulesConfiguration)
    : { value: null, changed: false };
  if (lower && nextLowerModules.changed) {
    nextCorner = nextCorner || { ...corner };
    nextCorner.stackSplitLower = { ...lower, modulesConfiguration: nextLowerModules.value };
  }

  return nextCorner ? { value: nextCorner, changed: true } : { value: cornerValue, changed: false };
}

function hideSketchBoxDoorGroovesForBuildSnapshot(cfg: ConfigStateLike): void {
  const topModules = hideSketchBoxDoorGroovesInModuleList(cfg.modulesConfiguration);
  if (topModules.changed)
    cfg.modulesConfiguration = topModules.value as ConfigStateLike['modulesConfiguration'];

  const lowerModules = hideSketchBoxDoorGroovesInModuleList(cfg.stackSplitLowerModulesConfiguration);
  if (lowerModules.changed) {
    cfg.stackSplitLowerModulesConfiguration =
      lowerModules.value as ConfigStateLike['stackSplitLowerModulesConfiguration'];
  }

  const cornerConfiguration = hideSketchBoxDoorGroovesInCornerConfiguration(cfg.cornerConfiguration);
  if (cornerConfiguration.changed) {
    cfg.cornerConfiguration = cornerConfiguration.value as ConfigStateLike['cornerConfiguration'];
  }
}

export function applyBuildVisibleConfigMapGates(
  cfg: ConfigStateLike,
  uiSnapshot: UiStateLike,
  modeSnapshot?: ModeStateLike | null
): ConfigStateLike {
  if (!readBuildUiToggle(uiSnapshot.groovesEnabled)) {
    cfg.groovesMap = normalizeKnownMapSnapshot('groovesMap', null);
    cfg.grooveLinesCountMap = normalizeKnownMapSnapshot('grooveLinesCountMap', null);
    hideSketchBoxDoorGroovesForBuildSnapshot(cfg);
  }

  if (!readBuildUiToggle(uiSnapshot.splitDoors)) {
    cfg.splitDoorsMap = normalizeKnownMapSnapshot('splitDoorsMap', null);
    cfg.splitDoorsBottomMap = normalizeKnownMapSnapshot('splitDoorsBottomMap', null);
  }

  if (!isRemoveDoorsBuildVisible(uiSnapshot, modeSnapshot)) {
    cfg.removedDoorsMap = normalizeKnownMapSnapshot('removedDoorsMap', null);
    cfg.roundedFrameSideShelvesMap = normalizeKnownMapSnapshot('roundedFrameSideShelvesMap', null);
  }

  if (!readBuildUiToggle(uiSnapshot.hingeDirection)) {
    cfg.hingeMap = normalizeKnownMapSnapshot('hingeMap', null);
  }

  return cfg;
}
