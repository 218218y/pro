import type { UnknownRecord } from '../../../types';

import { getTools } from '../runtime/service_access.js';
import { readConfigLooseScalarFromApp } from '../runtime/config_selectors.js';
import { setPlatformHasInternalDrawers } from '../runtime/platform_access.js';
import {
  ensureDrawerMetaMap,
  ensureDrawerService,
  getDrawerMetaEntry,
  getDrawerMetaMap as getDrawerMetaMapAccess,
  initDrawerRuntime,
  resetDrawerMetaMap,
  setDrawerMetaEntry,
} from '../runtime/doors_access.js';
import { getDrawersArray } from '../runtime/render_access.js';
import {
  type AppLike,
  type DrawerId,
  doorsRuntimeNow,
  getDoorsLastToggleTime,
  getDoorsOpen,
  getDrawerModuleKey,
  getGroupUserData,
  getOpenDoorModuleKeys,
  hasAnyOpenDoor,
  hasInternalDrawers,
  isGlobalClickMode,
  isIntDrawerEditActive,
  isSketchEditActive,
  isSketchExtDrawersEditActive,
  isSketchIntDrawersEditActive,
  vecCopy,
  wardrobeType,
} from './doors_runtime_shared.js';

export function rebuildDrawerMeta(App: AppLike): void {
  if (!App || typeof App !== 'object') return;

  resetDrawerMetaMap(App);

  let hasInternal = false;
  const drawers = getDrawersArray(App);
  if (drawers.length) {
    for (let i = 0; i < drawers.length; i++) {
      const drawer = drawers[i];
      if (!drawer) continue;

      if (typeof drawer.isInternal === 'undefined') {
        drawer.isInternal = !!(drawer.id && String(drawer.id).includes('int'));
      } else {
        drawer.isInternal = !!drawer.isInternal;
      }

      if (drawer.id != null) {
        setDrawerMetaEntry(App, drawer.id, { isInternal: !!drawer.isInternal });
      }

      if (drawer.isInternal) {
        hasInternal = true;
        break;
      }
    }
  }

  setPlatformHasInternalDrawers(App, hasInternal);
}

export function isInternalDrawerIdStrict(App: AppLike, id: DrawerId | null | undefined): boolean {
  try {
    if (!id) return false;
    const sid = String(id);
    const meta = getDrawerMetaEntry(App, sid);
    if (meta && typeof meta.isInternal !== 'undefined') return !!meta.isInternal;
    return sid.includes('int');
  } catch (_) {
    return false;
  }
}

export function getDrawerMetaMap(App: AppLike): UnknownRecord {
  return getDrawerMetaMapAccess(App);
}

export function installDrawerMeta(App: AppLike): void {
  if (!App || typeof App !== 'object') return;
  const drawer = ensureDrawerService(App);

  initDrawerRuntime(App);
  ensureDrawerMetaMap(App);

  if (!drawer.isInternalDrawerIdStrict) {
    drawer.isInternalDrawerIdStrict = (id: DrawerId | null | undefined) => isInternalDrawerIdStrict(App, id);
  }

  if (!drawer.rebuildMeta) {
    drawer.rebuildMeta = () => rebuildDrawerMeta(App);
  }

  if (!drawer.getMetaMap) {
    drawer.getMetaMap = () => getDrawerMetaMap(App);
  }
}

export function snapDrawersToTargets(App: AppLike): void {
  if (!App) return;

  const sketchEditActive = isSketchEditActive(App);
  const sketchIntDrawersEditActive = isSketchIntDrawersEditActive(App);
  const intDrawerEditActive = isIntDrawerEditActive(App);
  const sketchExtDrawersEditActive = isSketchExtDrawersEditActive(App);

  const tools = getTools(App);
  const openId = typeof tools.getDrawersOpenId === 'function' ? (tools.getDrawersOpenId() ?? null) : null;
  const globalClickMode = isGlobalClickMode(App);

  const now = doorsRuntimeNow();
  const delayTime = Number(readConfigLooseScalarFromApp(App, 'DOOR_DELAY_MS', 600)) || 600;

  const lastToggle = getDoorsLastToggleTime(App);
  const timeSinceToggle = now - (lastToggle || 0);
  const doorsOpenFlag = !!getDoorsOpen(App);
  const hasInternal = hasInternalDrawers(App);

  const localOpenDoorModules = globalClickMode ? new Set<string>() : getOpenDoorModuleKeys(App);
  const hasAnyLocalOpenDoor = globalClickMode ? false : hasAnyOpenDoor(App);
  const internalDrawersShouldBeOpen = !!(
    !sketchEditActive &&
    doorsOpenFlag &&
    (!hasInternal || timeSinceToggle > delayTime)
  );
  const externalDrawersShouldBeOpen = !!doorsOpenFlag;

  for (const drawer of getDrawersArray(App)) {
    if (!drawer || !drawer.group || !drawer.open || !drawer.closed) continue;

    const userData = getGroupUserData(drawer.group);
    const isExtDrawer = !!(userData && userData.__wpType === 'extDrawer');
    const isSketchExtDrawer = !!(userData && userData.__wpSketchExtDrawer === true);

    const type = wardrobeType(App);
    let isInternal = !isExtDrawer;
    if (!isInternal && type === 'sliding') {
      isInternal = true;
    } else if (isInternal) {
      if (typeof drawer.isInternal === 'undefined') {
        drawer.isInternal = !!(drawer.id && String(drawer.id).includes('int'));
      } else {
        drawer.isInternal = !!drawer.isInternal;
      }
      if (drawer.isInternal === false && isExtDrawer) isInternal = false;
    }

    let shouldOpen = false;

    if (sketchIntDrawersEditActive || intDrawerEditActive) {
      shouldOpen = false;
      try {
        drawer.isOpen = false;
      } catch (_) {
        // ignore
      }
    } else if (sketchEditActive && isInternal) {
      shouldOpen = false;
      try {
        drawer.isOpen = false;
      } catch (_) {
        // ignore
      }
    } else if (globalClickMode) {
      shouldOpen = isInternal ? internalDrawersShouldBeOpen : externalDrawersShouldBeOpen;
      if (sketchExtDrawersEditActive && isSketchExtDrawer) shouldOpen = false;
    } else if (isInternal) {
      const moduleKey = getDrawerModuleKey(drawer);
      const matchesOpenModule = moduleKey ? localOpenDoorModules.has(moduleKey) : hasAnyLocalOpenDoor;
      shouldOpen = !!(!sketchEditActive && matchesOpenModule && timeSinceToggle > delayTime);
    } else {
      shouldOpen = !!drawer.isOpen;
    }

    if (
      !sketchEditActive &&
      !sketchIntDrawersEditActive &&
      !intDrawerEditActive &&
      openId &&
      drawer.id === openId
    ) {
      shouldOpen = true;
    }

    vecCopy(drawer.group.position, shouldOpen ? drawer.open : drawer.closed);
  }
}
