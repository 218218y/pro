import type { ConfigStateLike, ModeStateLike, UiStateLike } from '../../../types';

import { normalizeKnownMapSnapshot } from '../runtime/maps_access.js';
import { resolveRemoveDoorsEnabledFromSnapshots } from '../features/door_authoring/api.js';

function readBuildUiToggle(value: unknown): boolean {
  return value === true;
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

  if (!resolveRemoveDoorsEnabledFromSnapshots(uiSnapshot, modeSnapshot)) {
    cfg.removedDoorsMap = normalizeKnownMapSnapshot('removedDoorsMap', null);
    cfg.roundedFrameSideShelvesMap = normalizeKnownMapSnapshot('roundedFrameSideShelvesMap', null);
  }

  if (!readBuildUiToggle(uiSnapshot.hingeDirection)) {
    cfg.hingeMap = normalizeKnownMapSnapshot('hingeMap', null);
  }

  return cfg;
}
