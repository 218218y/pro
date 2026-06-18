import type { AppContainer, ThreeLike, UnknownRecord } from '../../../types/index.js';

import { getModeId } from '../runtime/api.js';
import { getWardrobeGroup } from '../runtime/render_access.js';
import { readConfigMapFromSnapshot } from '../runtime/config_selectors.js';
import { isCanvasRemovablePartId, canonicalRemovablePartKey } from '../features/removable_parts.js';
import { getBuildStateMaybe, getMode, getState } from './store_access.js';
import { asRecord } from './post_build_extras_shared.js';

function readModePrimary(App: AppContainer): unknown {
  try {
    const buildState = getBuildStateMaybe(App) || getState(App) || {};
    const buildMode = asRecord(buildState.mode);
    if (buildMode && typeof buildMode.primary !== 'undefined') return buildMode.primary;
  } catch {
    // ignore
  }
  try {
    return getMode(App).primary;
  } catch {
    return null;
  }
}

function isRemovePartsMode(App: AppContainer): boolean {
  const removeModeId = getModeId('REMOVE_DOOR') || 'remove_door';
  return readModePrimary(App) === removeModeId;
}

export function requireRemovedPartsConfigSnapshot(cfgSnapshot: unknown): UnknownRecord {
  const cfg = asRecord(cfgSnapshot);
  if (!cfg) throw new TypeError('[post_build_removed_parts] cfgSnapshot is required');
  return cfg;
}

function readRemovedPartsMap(cfgSnapshot: UnknownRecord): UnknownRecord {
  return readConfigMapFromSnapshot(cfgSnapshot, 'removedDoorsMap', {});
}

function isRemovedPart(removedMap: UnknownRecord, partId: string): boolean {
  const key = canonicalRemovablePartKey(partId);
  return !!(key && removedMap[`removed_${key}`] === true);
}

function getOrCreateTransparentMaterial(THREE: ThreeLike, holder: UnknownRecord): unknown {
  if (holder.__wpRemovedPartTransparentMaterial) return holder.__wpRemovedPartTransparentMaterial;
  const threeRec = asRecord(THREE);
  const MaterialCtor = threeRec?.MeshBasicMaterial as (new (opts: UnknownRecord) => unknown) | undefined;
  const doubleSide = threeRec?.DoubleSide;
  const material = MaterialCtor
    ? new MaterialCtor({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: doubleSide,
      })
    : null;
  holder.__wpRemovedPartTransparentMaterial = material;
  return material;
}

function markNodeUserData(node: UnknownRecord, partId: string, removeMode: boolean): void {
  const userData = asRecord(node.userData) || {};
  userData.partId = userData.partId || partId;
  userData.__wpRemovablePartRemoved = true;
  userData.__wpRemovedPartRestoreTarget = removeMode;
  node.userData = userData;
}

function applyTransparentRemovedMaterial(args: {
  THREE: ThreeLike;
  materialHolder: UnknownRecord;
  node: UnknownRecord;
  partId: string;
  removeMode: boolean;
}): void {
  const { THREE, materialHolder, node, partId, removeMode } = args;
  markNodeUserData(node, partId, removeMode);

  const stack: UnknownRecord[] = [node];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    markNodeUserData(current, partId, removeMode);
    if (current.type === 'LineSegments' || current.type === 'Line' || current.type === 'Sprite') {
      current.visible = false;
    }
    if ('material' in current) {
      current.material = getOrCreateTransparentMaterial(THREE, materialHolder);
      current.visible = true;
    }
    const children = Array.isArray(current.children) ? current.children : [];
    for (let i = 0; i < children.length; i += 1) {
      const child = asRecord(children[i]);
      if (child) stack.push(child);
    }
  }
}

export function applyRemovedPartsAfterBuild(args: {
  App: AppContainer;
  THREE: ThreeLike;
  cfgSnapshot: unknown;
}): void {
  const { App, THREE, cfgSnapshot } = args;
  const cfg = requireRemovedPartsConfigSnapshot(cfgSnapshot);
  const removedMap = readRemovedPartsMap(cfg);
  const wardrobeGroup = asRecord(getWardrobeGroup(App));
  if (!wardrobeGroup) return;
  const removedKeys = Object.keys(removedMap).filter(
    key => key.startsWith('removed_') && removedMap[key] === true
  );
  if (!removedKeys.length) return;

  const removeMode = isRemovePartsMode(App);
  const materialHolder = asRecord(App) || {};
  const visited = new Set<UnknownRecord>();

  const stack: UnknownRecord[] = [wardrobeGroup];
  while (stack.length) {
    const node = stack.pop();
    if (!node || visited.has(node)) continue;
    visited.add(node);

    const userData = asRecord(node.userData);
    const partId = canonicalRemovablePartKey(userData?.partId);
    if (partId && isCanvasRemovablePartId(partId) && isRemovedPart(removedMap, partId)) {
      applyTransparentRemovedMaterial({ THREE, materialHolder, node, partId, removeMode });
      continue;
    }

    const children = Array.isArray(node.children) ? node.children : [];
    for (let i = 0; i < children.length; i += 1) {
      const child = asRecord(children[i]);
      if (child) stack.push(child);
    }
  }
}
