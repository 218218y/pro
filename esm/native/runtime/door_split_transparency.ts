// Manual door-split transparency runtime.
//
// The transparency toggle is deliberately a transient authoring concern:
// - state lives in mode.opts, so it is not persisted into the project;
// - visible door materials are cloned before opacity changes, so shared cabinet/interior
//   materials are never mutated;
// - original material references are restored when the mode/toggle is left;
// - a post-build sync reapplies the authoring view after door geometry rebuilds.

import type { AppContainer, Object3DLike, UnknownRecord } from '../../../types';

import { getDoorsArray } from './render_access.js';
import { MODES } from './modes_constants.js';
import { readModeStateFromApp } from './root_state_access.js';
import { asRecord } from './record.js';

export const MANUAL_DOOR_SPLIT_GHOST_OPACITY = 0.08;

type MaterialHolderLike = Object3DLike & { material?: unknown };
type GhostMaterialState = {
  original: unknown;
  ghost: unknown;
};

const materialStateByNode = new WeakMap<object, GhostMaterialState>();

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isMaterialHolder(value: unknown): value is MaterialHolderLike {
  const rec = asRecord<MaterialHolderLike>(value);
  return !!rec && Object.prototype.hasOwnProperty.call(rec, 'material');
}

function cloneOneMaterial(material: unknown): unknown {
  const rec = asRecord<UnknownRecord>(material);
  if (!rec) return material;
  const clone = rec.clone;
  if (typeof clone !== 'function') return material;

  try {
    const next = Reflect.apply(clone, material, []);
    const nextRec = asRecord<UnknownRecord>(next);
    if (!nextRec || next === material) return material;

    const opacity = isFiniteNumber(rec.opacity) ? Math.max(0, Math.min(1, Number(rec.opacity))) : 1;
    nextRec.transparent = true;
    nextRec.opacity = Math.min(opacity, MANUAL_DOOR_SPLIT_GHOST_OPACITY);
    nextRec.depthWrite = false;
    nextRec.needsUpdate = true;
    return next;
  } catch (error) {
    // Optional material cloning may be unsupported by a custom material; keep the original untouched.
    void error;
    return material;
  }
}

function cloneGhostMaterial(material: unknown): unknown {
  if (!Array.isArray(material)) return cloneOneMaterial(material);
  let changed = false;
  const next = material.map(item => {
    const ghost = cloneOneMaterial(item);
    if (ghost !== item) changed = true;
    return ghost;
  });
  return changed ? next : material;
}

function disposeOneMaterial(material: unknown): void {
  const rec = asRecord<UnknownRecord>(material);
  const dispose = rec?.dispose;
  if (typeof dispose !== 'function') return;
  try {
    Reflect.apply(dispose, material, []);
  } catch (error) {
    // Material disposal is best-effort; restoration of the original reference is the important part.
    void error;
  }
}

function disposeGhostMaterial(material: unknown, original: unknown): void {
  if (material === original) return;
  if (Array.isArray(material)) {
    const originals = Array.isArray(original) ? new Set(original) : new Set<unknown>([original]);
    for (const item of material) {
      if (!originals.has(item)) disposeOneMaterial(item);
    }
    return;
  }
  disposeOneMaterial(material);
}

function enableGhostOnNode(node: MaterialHolderLike): boolean {
  const current = node.material;
  const previous = materialStateByNode.get(node);
  if (previous && current === previous.ghost) return false;

  if (previous) {
    disposeGhostMaterial(previous.ghost, previous.original);
    materialStateByNode.delete(node);
  }

  const ghost = cloneGhostMaterial(current);
  if (ghost === current) return false;
  materialStateByNode.set(node, { original: current, ghost });
  node.material = ghost;
  return true;
}

function disableGhostOnNode(node: MaterialHolderLike): boolean {
  const previous = materialStateByNode.get(node);
  if (!previous) return false;

  // Do not overwrite a material that another subsystem intentionally replaced while the
  // authoring ghost was active. We only restore when our own clone is still installed.
  const ownsCurrentMaterial = node.material === previous.ghost;
  if (ownsCurrentMaterial) node.material = previous.original;
  disposeGhostMaterial(previous.ghost, previous.original);
  materialStateByNode.delete(node);
  return ownsCurrentMaterial;
}

function visitObjectTree(root: Object3DLike, visitor: (node: Object3DLike) => void): void {
  if (typeof root.traverse === 'function') {
    root.traverse(visitor);
    return;
  }

  const stack: Object3DLike[] = [root];
  const seen = new Set<Object3DLike>();
  while (stack.length) {
    const node = stack.pop();
    if (!node || seen.has(node)) continue;
    seen.add(node);
    visitor(node);
    if (!Array.isArray(node.children)) continue;
    for (let i = node.children.length - 1; i >= 0; i -= 1) {
      const child = node.children[i];
      if (child) stack.push(child);
    }
  }
}

export function isManualDoorSplitTransparencyEnabled(App: unknown): boolean {
  const mode = readModeStateFromApp(App);
  const opts = asRecord(mode.opts);
  return (
    mode.primary === MODES.SPLIT && opts?.splitVariant === 'custom' && opts?.splitDoorsTransparent === true
  );
}

export function setDoorGroupAuthoringTransparency(root: Object3DLike, enabled: boolean): number {
  let changed = 0;
  visitObjectTree(root, node => {
    if (!isMaterialHolder(node)) return;
    if (enabled ? enableGhostOnNode(node) : disableGhostOnNode(node)) changed += 1;
  });
  return changed;
}

export function syncManualDoorSplitTransparency(
  App: AppContainer,
  enabled = isManualDoorSplitTransparencyEnabled(App)
): number {
  let changed = 0;
  const doors = getDoorsArray(App);
  for (const door of doors) {
    if (!door?.group) continue;
    changed += setDoorGroupAuthoringTransparency(door.group, enabled);
  }
  return changed;
}
