import type { ConfigStateLike, ModeStateLike, UiStateLike } from '../../../types';

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

export function applyBuildVisibleConfigMapGates(
  cfg: ConfigStateLike,
  uiSnapshot: UiStateLike,
  modeSnapshot?: ModeStateLike | null
): ConfigStateLike {
  if (!readBuildUiToggle(uiSnapshot.groovesEnabled)) {
    cfg.groovesMap = normalizeKnownMapSnapshot('groovesMap', null);
    cfg.grooveLinesCountMap = normalizeKnownMapSnapshot('grooveLinesCountMap', null);
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
