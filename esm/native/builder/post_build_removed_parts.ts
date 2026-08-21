import type { AppContainer, ThreeLike, UnknownRecord } from '../../../types/index.js';

import { getWardrobeGroup } from '../runtime/render_access.js';
import { isRemoveDoorModeFromSnapshot } from '../features/door_authoring/api.js';
import { asRecord } from './post_build_extras_shared.js';
import {
  builderCanonicalRemovablePartKey,
  captureBuilderRemovedPartsState,
  isBuilderCanvasRemovablePartId,
  type BuilderRemovedPartsState,
} from './removable_parts_state.js';

export function requireRemovedPartsConfigSnapshot(cfgSnapshot: unknown): UnknownRecord {
  const cfg = asRecord(cfgSnapshot);
  if (!cfg) throw new TypeError('[post_build_removed_parts] cfgSnapshot is required');
  return cfg;
}

function readRemovedPartsState(cfgSnapshot: UnknownRecord): BuilderRemovedPartsState {
  return captureBuilderRemovedPartsState(cfgSnapshot.removedDoorsMap);
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
  primaryMode: string;
}): void {
  const { App, THREE, cfgSnapshot, primaryMode } = args;
  const cfg = requireRemovedPartsConfigSnapshot(cfgSnapshot);

  const removedParts = readRemovedPartsState(cfg);
  const wardrobeGroup = asRecord(getWardrobeGroup(App));
  if (!wardrobeGroup) return;
  const removedKeys = Object.keys(removedParts.map).filter(key => removedParts.map[key] === true);
  if (!removedKeys.length) return;

  const removeMode = isRemoveDoorModeFromSnapshot({ primary: primaryMode });
  const materialHolder = asRecord(App) || {};
  const visited = new Set<UnknownRecord>();

  const stack: UnknownRecord[] = [wardrobeGroup];
  while (stack.length) {
    const node = stack.pop();
    if (!node || visited.has(node)) continue;
    visited.add(node);

    const userData = asRecord(node.userData);
    const partId = builderCanonicalRemovablePartKey(userData?.partId);
    if (partId && isBuilderCanvasRemovablePartId(partId) && removedParts.isRemoved(partId)) {
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
