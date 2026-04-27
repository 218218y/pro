import type {
  DoorVisualEntryLike,
  DrawerVisualEntryLike,
  Namespace,
  RenderNamespaceLike,
} from '../../../types';
import type {
  CameraLike,
  ControlsLike,
  GroupOpsLike,
  Object3DLike,
  RenderViewportSurfaceLike,
  SceneOpsLike,
} from './render_access_shared.js';
import {
  ensureArraySlot,
  ensureRenderBag,
  isSceneOpsLike,
  readObject3D,
  readRenderSurface,
  readValue,
} from './render_access_shared.js';

export function ensureRenderNamespace(App: unknown): Namespace & RenderNamespaceLike {
  return ensureRenderBag(App);
}

export function getRenderNamespace(App: unknown): Namespace & RenderNamespaceLike {
  return ensureRenderNamespace(App);
}

function readSceneNamedObject(App: unknown, name: string): Object3DLike | null {
  try {
    const sceneRaw = getScene(App);
    const scene = isSceneOpsLike(sceneRaw) ? sceneRaw : null;
    return scene && typeof scene.getObjectByName === 'function' ? scene.getObjectByName(name) : null;
  } catch {
    return null;
  }
}

export function getRenderer(App: unknown) {
  return readRenderSurface(App, 'renderer');
}

export function getScene(App: unknown): Object3DLike | null {
  return readRenderSurface(App, 'scene');
}

export function getCamera(App: unknown): CameraLike | null {
  return readRenderSurface(App, 'camera');
}

export function getControls(App: unknown): ControlsLike | null {
  return readRenderSurface(App, 'controls');
}

export function getWardrobeGroup(App: unknown): Object3DLike | null {
  return readRenderSurface(App, 'wardrobeGroup') || readSceneNamedObject(App, 'App.render.wardrobeGroup');
}

export function getRoomGroup(App: unknown): Object3DLike | null {
  return readRenderSurface(App, 'roomGroup') || readSceneNamedObject(App, 'App.render.roomGroup');
}

export function setRoomGroup(App: unknown, group: Object3DLike | null): Object3DLike | null {
  const renderBag = ensureRenderBag(App);
  try {
    renderBag.roomGroup = group || null;
  } catch {
    // ignore
  }
  return readObject3D(renderBag.roomGroup);
}

export function getViewportSurface(App: unknown): RenderViewportSurfaceLike {
  const renderBag = ensureRenderBag(App);
  return {
    renderer: renderBag.renderer || null,
    scene: renderBag.scene || null,
    camera: renderBag.camera || null,
    controls: renderBag.controls || null,
    wardrobeGroup: renderBag.wardrobeGroup || null,
    roomGroup: renderBag.roomGroup || null,
  };
}

export function hasViewportPickingSurface(App: unknown): boolean {
  const surface = getViewportSurface(App);
  return !!(surface.renderer && surface.camera && surface.wardrobeGroup);
}

export function getRenderSlot<T = unknown>(App: unknown, key: string): T | null {
  return readRenderSurface<T>(App, key);
}

export function setRenderSlot<T = unknown>(App: unknown, key: string, value: T | null): T | null {
  const renderBag = ensureRenderBag(App);
  try {
    renderBag[key] = value || null;
  } catch {
    // ignore
  }
  return readValue<T>(renderBag[key]);
}

export function getDoorsArray(App: unknown): DoorVisualEntryLike[] {
  const renderBag = ensureRenderBag(App);
  return ensureArraySlot<DoorVisualEntryLike>(renderBag, 'doorsArray');
}

export function getDrawersArray(App: unknown): DrawerVisualEntryLike[] {
  const renderBag = ensureRenderBag(App);
  return ensureArraySlot<DrawerVisualEntryLike>(renderBag, 'drawersArray');
}

export function clearRenderArrays(App: unknown): void {
  try {
    const doors = getDoorsArray(App);
    const drawers = getDrawersArray(App);
    doors.length = 0;
    drawers.length = 0;
  } catch {
    // ignore
  }
}

export function getAnimateFn(App: unknown): (() => unknown) | null {
  return readRenderSurface(App, 'animate');
}

export function setAnimateFn(App: unknown, fn: (() => void) | null): (() => void) | null {
  return setRenderSlot<() => void>(App, 'animate', fn || null);
}

export function getLoopRaf(App: unknown): number {
  const renderBag = ensureRenderBag(App);
  return typeof renderBag.loopRaf === 'number' ? renderBag.loopRaf : 0;
}

export function setLoopRaf(App: unknown, value: number): number {
  const renderBag = ensureRenderBag(App);
  const next = Number.isFinite(value) ? value : 0;
  try {
    renderBag.loopRaf = next;
  } catch {
    // ignore
  }
  return typeof renderBag.loopRaf === 'number' ? renderBag.loopRaf : next;
}

export function getLastFrameTs(App: unknown): number {
  const renderBag = ensureRenderBag(App);
  return typeof renderBag.__lastFrameTs === 'number' ? renderBag.__lastFrameTs : 0;
}

export function setLastFrameTs(App: unknown, value: number): number {
  const renderBag = ensureRenderBag(App);
  const next = Number.isFinite(value) ? value : 0;
  try {
    renderBag.__lastFrameTs = next;
  } catch {
    // ignore
  }
  return typeof renderBag.__lastFrameTs === 'number' ? renderBag.__lastFrameTs : next;
}

export function getRafScheduledAt(App: unknown): number {
  const renderBag = ensureRenderBag(App);
  return typeof renderBag.__rafScheduledAt === 'number' ? renderBag.__rafScheduledAt : 0;
}

export function setRafScheduledAt(App: unknown, value: number): number {
  const renderBag = ensureRenderBag(App);
  const next = Number.isFinite(value) ? value : 0;
  try {
    renderBag.__rafScheduledAt = next;
  } catch {
    // ignore
  }
  return typeof renderBag.__rafScheduledAt === 'number' ? renderBag.__rafScheduledAt : next;
}

export function addToWardrobeGroup(App: unknown, obj: unknown): boolean {
  const group = readRenderSurface<GroupOpsLike>(App, 'wardrobeGroup');
  if (!group || typeof group.add !== 'function') return false;
  try {
    group.add(obj);
    return true;
  } catch {
    return false;
  }
}

export function addToScene(App: unknown, obj: unknown): boolean {
  const scene = readRenderSurface<SceneOpsLike>(App, 'scene');
  if (!scene || typeof scene.add !== 'function') return false;
  try {
    scene.add(obj);
    return true;
  } catch {
    return false;
  }
}

export function removeFromSceneByName(App: unknown, name: string): unknown | null {
  const scene = readRenderSurface<SceneOpsLike>(App, 'scene');
  if (!scene || typeof scene.getObjectByName !== 'function' || typeof scene.remove !== 'function') {
    return null;
  }
  try {
    const existing = scene.getObjectByName(name) || null;
    if (existing) scene.remove(existing);
    return existing;
  } catch {
    return null;
  }
}
