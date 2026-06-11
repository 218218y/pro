import type {
  Object3DLike,
  RenderAutoHideFloorCacheLike,
  RendererCompatDefaultsLike,
  RendererLike,
  ShadowMapLike,
  UnknownRecord,
  WebGLRenderTargetLike,
} from './render_access_shared.js';
import {
  ensureRenderBag,
  isShadowMapLike,
  readObject3D,
  readRenderSurface,
  readValue,
} from './render_access_shared.js';
import { asRecord } from './record.js';
import { ensureRenderMetaArray } from './render_access_state_bags.js';

export type RenderRuntimeStateLike = {
  ambLightObj: Object3DLike | null;
  dirLightObj: Object3DLike | null;
  mirrorCubeCamera: Object3DLike | null;
  mirrorRenderTarget: WebGLRenderTargetLike | null;
  animate: (() => void) | null;
  loopRaf: number;
  __lastFrameTs: number;
  __rafScheduledAt: number;
  __mirrorHideScratch: Object3DLike[];
  __wpRendererCompatDefaults: RendererCompatDefaultsLike | null;
  __mirrorLastUpdateMs: number;
  __mirrorDirty: boolean;
  __mirrorPresenceKnown: boolean;
  __mirrorPresenceHasMirror: boolean;
  __mirrorPresenceCheckedAtMs: number;
  __mirrorTrackedPruneAtMs: number;
  __mirrorBudgetDeferredAtMs: number;
  __mirrorBudgetDeferredCount: number;
  __mirrorPresenceBudgetSkipCount: number;
  __mirrorPruneBudgetSkipCount: number;
  __mirrorUpdateCount: number;
  __mirrorMotionActive: boolean;
  __mirrorMotionUntilMs: number;
  __mirrorMotionSnap: UnknownRecord | null;
  __mirrorWorkPending: boolean;
  __splitHoverPickablesDirty: boolean;
  __wpAutoHideFloorRef: unknown | null;
  __wpAutoHideFloorRoomKey: unknown | null;
  __wpAutoHideFloorSceneKey: unknown | null;
  __wpAutoHideFloorTick: number;
  __wpAutoHideFloorVecFloor: UnknownRecord | null;
  __wpAutoHideFloorVecCam: UnknownRecord | null;
  cacheClock: number;
  lastPruneAt: number;
};

export type MirrorRefreshNowResult = {
  refreshed: boolean;
  mirrorCount: number;
  materialSyncCount: number;
  skippedReason: string | null;
};

function isRenderRuntimeStateBag(
  value: ReturnType<typeof ensureRenderBag>
): value is ReturnType<typeof ensureRenderBag> & RenderRuntimeStateLike {
  return (
    Array.isArray(value.__mirrorHideScratch) &&
    typeof value.__mirrorDirty === 'boolean' &&
    typeof value.__mirrorPresenceKnown === 'boolean' &&
    typeof value.__mirrorPresenceHasMirror === 'boolean' &&
    typeof value.__mirrorMotionActive === 'boolean' &&
    typeof value.__mirrorWorkPending === 'boolean' &&
    typeof value.__splitHoverPickablesDirty === 'boolean' &&
    Number.isFinite(value.loopRaf) &&
    Number.isFinite(value.__lastFrameTs) &&
    Number.isFinite(value.__rafScheduledAt) &&
    Number.isFinite(value.__mirrorLastUpdateMs) &&
    Number.isFinite(value.__mirrorPresenceCheckedAtMs) &&
    Number.isFinite(value.__mirrorTrackedPruneAtMs) &&
    Number.isFinite(value.__mirrorBudgetDeferredAtMs) &&
    Number.isFinite(value.__mirrorBudgetDeferredCount) &&
    Number.isFinite(value.__mirrorPresenceBudgetSkipCount) &&
    Number.isFinite(value.__mirrorPruneBudgetSkipCount) &&
    Number.isFinite(value.__mirrorUpdateCount) &&
    Number.isFinite(value.__mirrorMotionUntilMs) &&
    Number.isFinite(value.__wpAutoHideFloorTick) &&
    Number.isFinite(value.cacheClock) &&
    Number.isFinite(value.lastPruneAt)
  );
}

export function ensureRenderRuntimeState(App: unknown): RenderRuntimeStateLike {
  const renderBag = ensureRenderBag(App);

  if (typeof renderBag.ambLightObj === 'undefined') renderBag.ambLightObj = null;
  if (typeof renderBag.dirLightObj === 'undefined') renderBag.dirLightObj = null;
  if (typeof renderBag.mirrorCubeCamera === 'undefined') renderBag.mirrorCubeCamera = null;
  if (typeof renderBag.mirrorRenderTarget === 'undefined') renderBag.mirrorRenderTarget = null;
  if (typeof renderBag.animate === 'undefined') renderBag.animate = null;
  if (!Number.isFinite(renderBag.loopRaf)) renderBag.loopRaf = 0;
  if (!Number.isFinite(renderBag.__lastFrameTs)) renderBag.__lastFrameTs = 0;
  if (!Number.isFinite(renderBag.__rafScheduledAt)) renderBag.__rafScheduledAt = 0;
  if (!Array.isArray(renderBag.__mirrorHideScratch)) renderBag.__mirrorHideScratch = [];
  if (!asRecord(renderBag.__wpRendererCompatDefaults)) renderBag.__wpRendererCompatDefaults = null;

  if (!Number.isFinite(renderBag.__mirrorLastUpdateMs)) renderBag.__mirrorLastUpdateMs = 0;
  if (typeof renderBag.__mirrorDirty !== 'boolean') renderBag.__mirrorDirty = false;
  if (typeof renderBag.__mirrorPresenceKnown !== 'boolean') renderBag.__mirrorPresenceKnown = false;
  if (typeof renderBag.__mirrorPresenceHasMirror !== 'boolean') renderBag.__mirrorPresenceHasMirror = false;
  if (!Number.isFinite(renderBag.__mirrorPresenceCheckedAtMs)) renderBag.__mirrorPresenceCheckedAtMs = 0;
  if (!Number.isFinite(renderBag.__mirrorTrackedPruneAtMs)) renderBag.__mirrorTrackedPruneAtMs = 0;
  if (!Number.isFinite(renderBag.__mirrorBudgetDeferredAtMs)) renderBag.__mirrorBudgetDeferredAtMs = 0;
  if (!Number.isFinite(renderBag.__mirrorBudgetDeferredCount)) renderBag.__mirrorBudgetDeferredCount = 0;
  if (!Number.isFinite(renderBag.__mirrorPresenceBudgetSkipCount))
    renderBag.__mirrorPresenceBudgetSkipCount = 0;
  if (!Number.isFinite(renderBag.__mirrorPruneBudgetSkipCount)) renderBag.__mirrorPruneBudgetSkipCount = 0;
  if (!Number.isFinite(renderBag.__mirrorUpdateCount)) renderBag.__mirrorUpdateCount = 0;
  if (typeof renderBag.__mirrorMotionActive !== 'boolean') renderBag.__mirrorMotionActive = false;
  if (!Number.isFinite(renderBag.__mirrorMotionUntilMs)) renderBag.__mirrorMotionUntilMs = 0;
  if (!asRecord(renderBag.__mirrorMotionSnap)) renderBag.__mirrorMotionSnap = null;
  if (typeof renderBag.__mirrorWorkPending !== 'boolean') renderBag.__mirrorWorkPending = false;
  if (typeof renderBag.__splitHoverPickablesDirty !== 'boolean') renderBag.__splitHoverPickablesDirty = false;

  if (typeof renderBag.__wpAutoHideFloorRef === 'undefined') renderBag.__wpAutoHideFloorRef = null;
  if (typeof renderBag.__wpAutoHideFloorRoomKey === 'undefined') renderBag.__wpAutoHideFloorRoomKey = null;
  if (typeof renderBag.__wpAutoHideFloorSceneKey === 'undefined') renderBag.__wpAutoHideFloorSceneKey = null;
  if (!Number.isFinite(renderBag.__wpAutoHideFloorTick)) renderBag.__wpAutoHideFloorTick = 0;
  if (!asRecord(renderBag.__wpAutoHideFloorVecFloor)) renderBag.__wpAutoHideFloorVecFloor = null;
  if (!asRecord(renderBag.__wpAutoHideFloorVecCam)) renderBag.__wpAutoHideFloorVecCam = null;

  if (!Number.isFinite(renderBag.cacheClock)) renderBag.cacheClock = 1;
  if (!Number.isFinite(renderBag.lastPruneAt)) renderBag.lastPruneAt = 0;

  if (isRenderRuntimeStateBag(renderBag)) return renderBag;
  throw new Error('[WardrobePro] Failed to normalize render runtime state');
}

export function getAmbientLight(App: unknown): Object3DLike | null {
  return readObject3D(ensureRenderRuntimeState(App).ambLightObj);
}

export function setAmbientLight(App: unknown, light: Object3DLike | null): Object3DLike | null {
  const renderBag = ensureRenderRuntimeState(App);
  try {
    renderBag.ambLightObj = light || null;
  } catch {
    // ignore
  }
  return readObject3D(renderBag.ambLightObj);
}

export function getDirectionalLight(App: unknown): Object3DLike | null {
  return readObject3D(ensureRenderRuntimeState(App).dirLightObj);
}

export function setDirectionalLight(App: unknown, light: Object3DLike | null): Object3DLike | null {
  const renderBag = ensureRenderRuntimeState(App);
  try {
    renderBag.dirLightObj = light || null;
  } catch {
    // ignore
  }
  return readObject3D(renderBag.dirLightObj);
}

export function getShadowMap(App: unknown): ShadowMapLike | null {
  const renderer = readRenderSurface<RendererLike>(App, 'renderer');
  if (!renderer) return null;
  return isShadowMapLike(renderer.shadowMap) ? renderer.shadowMap : null;
}

export function getMirrorRenderTarget(App: unknown): WebGLRenderTargetLike | null {
  return readValue<WebGLRenderTargetLike>(ensureRenderRuntimeState(App).mirrorRenderTarget);
}

export function markSplitHoverPickablesDirty(App: unknown, value = true): boolean {
  const renderBag = ensureRenderRuntimeState(App);
  const next = value === true;
  try {
    renderBag.__splitHoverPickablesDirty = next;
  } catch {
    // ignore
  }
  return renderBag.__splitHoverPickablesDirty === true;
}

export function trackMirrorSurface(App: unknown, obj: unknown): boolean {
  const mirror = asRecord(obj);
  if (!mirror) return false;
  const mirrors = ensureRenderMetaArray<UnknownRecord>(App, 'mirrors');
  if (mirrors.indexOf(mirror) < 0) mirrors.push(mirror);
  const renderBag = ensureRenderRuntimeState(App);
  try {
    renderBag.__mirrorDirty = true;
    renderBag.__mirrorPresenceKnown = false;
  } catch {
    // ignore
  }
  return true;
}

export function getMirrorCubeCamera(App: unknown): Object3DLike | null {
  return readObject3D(ensureRenderRuntimeState(App).mirrorCubeCamera);
}

export function getMirrorHideScratch(App: unknown): Object3DLike[] {
  return ensureRenderRuntimeState(App).__mirrorHideScratch;
}

function readUnknownRecord(value: unknown): UnknownRecord | null {
  return asRecord<UnknownRecord>(value);
}

function readMirrorMaterialRecords(obj: UnknownRecord | null): UnknownRecord[] {
  if (!obj) return [];
  const material = obj.material;
  if (!material) return [];
  if (Array.isArray(material))
    return material.filter((entry): entry is UnknownRecord => !!readUnknownRecord(entry));
  const single = readUnknownRecord(material);
  return single ? [single] : [];
}

function isTrackedMirrorSurface(obj: UnknownRecord | null): boolean {
  if (!obj || obj.isMesh !== true) return false;
  const userData = readUnknownRecord(obj.userData);
  return userData?.__wpMirrorSurface === true;
}

function syncMirrorMaterialEnvMap(obj: UnknownRecord | null, texture: unknown): number {
  if (!obj || !texture) return 0;
  let syncCount = 0;
  const materials = readMirrorMaterialRecords(obj);
  for (let i = 0; i < materials.length; i += 1) {
    const material = materials[i];
    if (!material) continue;
    if (material.envMap === texture) continue;
    material.envMap = texture;
    material.needsUpdate = true;
    syncCount += 1;
  }
  return syncCount;
}

function pruneTrackedMirrorList(mirrors: UnknownRecord[]): number {
  const seen = new Set<UnknownRecord>();
  let writeIndex = 0;
  for (let i = 0; i < mirrors.length; i += 1) {
    const mirror = readUnknownRecord(mirrors[i]);
    if (!mirror || seen.has(mirror)) continue;
    if (typeof mirror.parent === 'undefined') continue;
    seen.add(mirror);
    mirrors[writeIndex] = mirror;
    writeIndex += 1;
  }
  if (mirrors.length !== writeIndex) mirrors.length = writeIndex;
  return writeIndex;
}

function writeMirrorPresenceState(
  renderBag: RenderRuntimeStateLike,
  hasMirror: boolean,
  nowMs: number
): void {
  renderBag.__mirrorDirty = false;
  renderBag.__mirrorWorkPending = false;
  renderBag.__mirrorPresenceKnown = true;
  renderBag.__mirrorPresenceHasMirror = hasMirror;
  renderBag.__mirrorPresenceCheckedAtMs = nowMs;
  if (hasMirror) {
    renderBag.__mirrorLastUpdateMs = nowMs;
    renderBag.__mirrorUpdateCount += 1;
  }
}

export function refreshTrackedMirrorSurfacesNow(App: unknown): MirrorRefreshNowResult {
  const result: MirrorRefreshNowResult = {
    refreshed: false,
    mirrorCount: 0,
    materialSyncCount: 0,
    skippedReason: null,
  };

  let renderBag: RenderRuntimeStateLike;
  try {
    renderBag = ensureRenderRuntimeState(App);
  } catch {
    result.skippedReason = 'render-state-unavailable';
    return result;
  }

  const cube = readUnknownRecord(renderBag.mirrorCubeCamera);
  const target = readUnknownRecord(renderBag.mirrorRenderTarget);
  const scene = readUnknownRecord(readRenderSurface(App, 'scene'));
  const renderer = readUnknownRecord(readRenderSurface(App, 'renderer'));
  const update = cube && typeof cube.update === 'function' ? cube.update : null;
  const texture = target ? target.texture : null;

  if (!(cube && update && target && texture && scene && renderer)) {
    result.skippedReason = 'mirror-refresh-surface-incomplete';
    return result;
  }

  const mirrors = ensureRenderMetaArray<UnknownRecord>(App, 'mirrors');
  pruneTrackedMirrorList(mirrors);

  const restored: Array<{ obj: UnknownRecord; visible: unknown }> = [];
  const nowMs = Date.now();
  let hasMirror = false;

  try {
    for (let i = 0; i < mirrors.length; i += 1) {
      const mirror = readUnknownRecord(mirrors[i]);
      if (!isTrackedMirrorSurface(mirror)) continue;
      hasMirror = true;
      result.mirrorCount += 1;
      result.materialSyncCount += syncMirrorMaterialEnvMap(mirror, texture);
      if (mirror && mirror.visible !== false) {
        restored.push({ obj: mirror, visible: mirror.visible });
        mirror.visible = false;
      }
    }

    if (!hasMirror) {
      writeMirrorPresenceState(renderBag, false, nowMs);
      result.skippedReason = 'no-tracked-mirror-surfaces';
      return result;
    }

    update.call(cube, renderer, scene);
    writeMirrorPresenceState(renderBag, true, nowMs);
    result.refreshed = true;
    return result;
  } catch {
    result.skippedReason = 'mirror-refresh-failed';
    return result;
  } finally {
    for (let i = 0; i < restored.length; i += 1) {
      restored[i].obj.visible = restored[i].visible;
    }
  }
}

export function invalidateMirrorTracking(App: unknown): void {
  const renderBag = ensureRenderRuntimeState(App);
  const mirrors = ensureRenderMetaArray(App, 'mirrors');
  mirrors.length = 0;
  try {
    renderBag.__mirrorDirty = true;
    renderBag.__mirrorPresenceKnown = false;
    renderBag.__mirrorPresenceHasMirror = false;
    renderBag.__mirrorWorkPending = false;
    renderBag.__mirrorPresenceCheckedAtMs = 0;
    renderBag.__mirrorTrackedPruneAtMs = 0;
  } catch {
    // ignore
  }
}

export function readAutoHideFloorCache(App: unknown): RenderAutoHideFloorCacheLike {
  const renderBag = ensureRenderRuntimeState(App);
  return {
    floor: renderBag.__wpAutoHideFloorRef || null,
    roomKey:
      typeof renderBag.__wpAutoHideFloorRoomKey !== 'undefined' ? renderBag.__wpAutoHideFloorRoomKey : null,
    sceneKey:
      typeof renderBag.__wpAutoHideFloorSceneKey !== 'undefined' ? renderBag.__wpAutoHideFloorSceneKey : null,
  };
}

export function writeAutoHideFloorCache(
  App: unknown,
  floor: unknown | null,
  roomKey: unknown,
  sceneKey: unknown
): void {
  const renderBag = ensureRenderRuntimeState(App);
  try {
    renderBag.__wpAutoHideFloorRef = floor || null;
    renderBag.__wpAutoHideFloorRoomKey = roomKey;
    renderBag.__wpAutoHideFloorSceneKey = sceneKey;
  } catch {
    // ignore
  }
}

export function readRendererCompatDefaults(App: unknown): RendererCompatDefaultsLike | null {
  return readValue<RendererCompatDefaultsLike>(ensureRenderRuntimeState(App).__wpRendererCompatDefaults);
}

export function writeRendererCompatDefaults(
  App: unknown,
  value: RendererCompatDefaultsLike | null
): RendererCompatDefaultsLike | null {
  const renderBag = ensureRenderRuntimeState(App);
  try {
    renderBag.__wpRendererCompatDefaults = value || null;
  } catch {
    // ignore
  }
  return readValue<RendererCompatDefaultsLike>(renderBag.__wpRendererCompatDefaults);
}
