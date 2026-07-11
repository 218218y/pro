import type { UnknownRecord } from '../../../types/index.js';

import type { PlanarReflectorRenderResult, PlanarReflectorState } from './planar_reflector_contracts.js';
import { ensureRenderMetaArray } from './render_access_state_bags.js';

type HiddenPlanarReflectorSurface = { object: UnknownRecord; visible: unknown };

type PlanarReflectorRendererPassArgs = {
  App: unknown;
  mirror: UnknownRecord;
  renderer: UnknownRecord;
  scene: unknown;
  camera: UnknownRecord;
  virtualCamera: UnknownRecord;
  renderTarget: unknown;
};

function readRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function readFn<T extends (...args: never[]) => unknown>(obj: UnknownRecord | null, key: string): T | null {
  const value = obj?.[key];
  return typeof value === 'function' ? (value as T) : null;
}

function call0(ctx: unknown, fn: unknown): unknown {
  return typeof fn === 'function' ? Reflect.apply(fn, ctx, []) : undefined;
}

function call1(ctx: unknown, fn: unknown, a: unknown): unknown {
  return typeof fn === 'function' ? Reflect.apply(fn, ctx, [a]) : undefined;
}

function call2(ctx: unknown, fn: unknown, a: unknown, b: unknown): unknown {
  return typeof fn === 'function' ? Reflect.apply(fn, ctx, [a, b]) : undefined;
}

function call3(ctx: unknown, fn: unknown, a: unknown, b: unknown, c: unknown): unknown {
  return typeof fn === 'function' ? Reflect.apply(fn, ctx, [a, b, c]) : undefined;
}

function call4(ctx: unknown, fn: unknown, a: unknown, b: unknown, c: unknown, d: unknown): unknown {
  return typeof fn === 'function' ? Reflect.apply(fn, ctx, [a, b, c, d]) : undefined;
}

function readPlanarReflectorState(mirror: unknown): PlanarReflectorState | null {
  const userData = readRecord(readRecord(mirror)?.userData);
  const state = readRecord(userData?.__wpPlanarReflector);
  return state ? (state as PlanarReflectorState) : null;
}

function hidePlanarReflectorSurfacesForInternalPass(App: unknown): HiddenPlanarReflectorSurface[] {
  const hidden: HiddenPlanarReflectorSurface[] = [];
  const mirrors = ensureRenderMetaArray<UnknownRecord>(App, 'mirrors');
  const seen = new Set<UnknownRecord>();

  for (let i = 0; i < mirrors.length; i += 1) {
    const mirror = readRecord(mirrors[i]);
    if (!mirror) continue;
    const state = readPlanarReflectorState(mirror);
    const surface = readRecord(state?.surfaceObject);
    if (!surface || seen.has(surface)) continue;
    seen.add(surface);
    hidden.push({ object: surface, visible: surface.visible });
    surface.visible = false;
  }

  return hidden;
}

function restorePlanarReflectorSurfacesAfterInternalPass(hidden: HiddenPlanarReflectorSurface[]): void {
  for (let i = hidden.length - 1; i >= 0; i -= 1) {
    const entry = hidden[i];
    try {
      entry.object.visible = entry.visible;
    } catch {
      // Renderer cleanup must continue even when a detached surface became immutable.
    }
  }
}

function getMatrixWorld(obj: UnknownRecord | null): unknown {
  return obj ? obj.matrixWorld : null;
}

function setVector3(target: UnknownRecord | null, x: number, y: number, z: number): void {
  call3(target, target?.set, x, y, z);
}

function copyRecord(target: UnknownRecord | null, source: unknown): void {
  call1(target, target?.copy, source);
}

function writeReflectorTextureMatrix(textureMatrix: UnknownRecord): void {
  const set = textureMatrix.set;
  if (typeof set !== 'function') return;
  Reflect.apply(
    set,
    textureMatrix,
    [0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0]
  );
}

function prepareVirtualReflectorCamera(args: {
  mirror: UnknownRecord;
  surface: UnknownRecord;
  state: PlanarReflectorState;
  camera: UnknownRecord;
}): PlanarReflectorRenderResult {
  const { mirror, surface, state, camera } = args;
  const reflectorWorldPosition = state.reflectorWorldPosition;
  const cameraWorldPosition = state.cameraWorldPosition;
  const rotationMatrix = state.rotationMatrix;
  const normal = state.normal;
  const view = state.view;
  const target = state.targetVector;
  const lookAtPosition = state.lookAtPosition;
  const virtualCamera = state.virtualCamera;

  call1(mirror, mirror.updateMatrixWorld, true);
  call1(surface, surface.updateMatrixWorld, true);
  call1(camera, camera.updateMatrixWorld, true);

  call1(reflectorWorldPosition, reflectorWorldPosition.setFromMatrixPosition, getMatrixWorld(surface));
  call1(cameraWorldPosition, cameraWorldPosition.setFromMatrixPosition, getMatrixWorld(camera));
  call1(rotationMatrix, rotationMatrix.extractRotation, getMatrixWorld(surface));
  setVector3(normal, 0, 0, state.normalSign < 0 ? -1 : 1);
  call1(normal, normal.applyMatrix4, rotationMatrix);

  call2(view, view.subVectors, reflectorWorldPosition, cameraWorldPosition);
  const dot = typeof view.dot === 'function' ? Number(Reflect.apply(view.dot, view, [normal])) : NaN;
  if (Number.isFinite(dot) && dot > 0) return { ok: false, reason: 'backface-culled' };

  call1(view, view.reflect, normal);
  call0(view, view.negate);
  call1(view, view.add, reflectorWorldPosition);

  call1(rotationMatrix, rotationMatrix.extractRotation, getMatrixWorld(camera));
  setVector3(lookAtPosition, 0, 0, -1);
  call1(lookAtPosition, lookAtPosition.applyMatrix4, rotationMatrix);
  call1(lookAtPosition, lookAtPosition.add, cameraWorldPosition);

  call2(target, target.subVectors, reflectorWorldPosition, lookAtPosition);
  call1(target, target.reflect, normal);
  call0(target, target.negate);
  call1(target, target.add, reflectorWorldPosition);

  copyRecord(readRecord(virtualCamera.position), view);
  const virtualCameraUp = readRecord(virtualCamera.up);
  setVector3(virtualCameraUp, 0, 1, 0);
  call1(virtualCameraUp, virtualCameraUp?.applyMatrix4, rotationMatrix);
  call1(virtualCameraUp, virtualCameraUp?.reflect, normal);
  call1(virtualCamera, virtualCamera.lookAt, target);

  virtualCamera.far = camera.far;
  virtualCamera.near = camera.near;
  virtualCamera.aspect = camera.aspect;
  virtualCamera.fov = camera.fov;
  call0(virtualCamera, virtualCamera.updateProjectionMatrix);
  call1(virtualCamera, virtualCamera.updateMatrixWorld, true);
  const matrixWorldInverse = readRecord(virtualCamera.matrixWorldInverse);
  call1(matrixWorldInverse, matrixWorldInverse?.copy, virtualCamera.matrixWorld);
  call0(matrixWorldInverse, matrixWorldInverse?.invert);
  const projectionMatrix = readRecord(virtualCamera.projectionMatrix);
  call1(projectionMatrix, projectionMatrix?.copy, camera.projectionMatrix);

  const textureMatrix = state.textureMatrix;
  writeReflectorTextureMatrix(textureMatrix);
  call1(textureMatrix, textureMatrix.multiply, virtualCamera.projectionMatrix);
  call1(textureMatrix, textureMatrix.multiply, virtualCamera.matrixWorldInverse);
  call1(textureMatrix, textureMatrix.multiply, surface.matrixWorld);
  return { ok: true };
}

function applyReflectorObliqueClipPlane(state: PlanarReflectorState): PlanarReflectorRenderResult {
  const reflectorWorldPosition = state.reflectorWorldPosition;
  const normal = state.normal;
  const clipPlane = state.clipPlane;
  const reflectorPlane = state.reflectorPlane;
  const virtualCamera = state.virtualCamera;
  const q = state.q;

  call2(reflectorPlane, reflectorPlane.setFromNormalAndCoplanarPoint, normal, reflectorWorldPosition);
  call1(reflectorPlane, reflectorPlane.applyMatrix4, virtualCamera.matrixWorldInverse);
  const planeNormal = readRecord(reflectorPlane.normal);
  if (!planeNormal || typeof reflectorPlane.constant !== 'number') {
    return { ok: false, reason: 'reflector-plane-invalid' };
  }
  call4(clipPlane, clipPlane.set, planeNormal.x, planeNormal.y, planeNormal.z, reflectorPlane.constant);

  const projectionMatrix = readRecord(virtualCamera.projectionMatrix);
  const elements = Array.isArray(projectionMatrix?.elements)
    ? (projectionMatrix.elements as unknown[])
    : null;
  if (!projectionMatrix || !elements) return { ok: false, reason: 'projection-matrix-invalid' };

  const clipX = typeof clipPlane.x === 'number' ? clipPlane.x : 0;
  const clipY = typeof clipPlane.y === 'number' ? clipPlane.y : 0;
  call4(
    q,
    q.set,
    (Math.sign(clipX) + Number(elements[8] || 0)) / Number(elements[0] || 1),
    (Math.sign(clipY) + Number(elements[9] || 0)) / Number(elements[5] || 1),
    -1.0,
    (1.0 + Number(elements[10] || 0)) / Number(elements[14] || 1)
  );
  const denominator =
    typeof clipPlane.dot === 'function' ? Number(Reflect.apply(clipPlane.dot, clipPlane, [q])) : NaN;
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 0.000001) {
    return { ok: false, reason: 'clip-plane-degenerate' };
  }

  call1(clipPlane, clipPlane.multiplyScalar, 2.0 / denominator);
  elements[2] = clipPlane.x;
  elements[6] = clipPlane.y;
  elements[10] = Number(clipPlane.z || 0) + 1.0 - state.clipBias;
  elements[14] = clipPlane.w;
  return { ok: true };
}

export function runPlanarReflectorRendererPass(
  args: PlanarReflectorRendererPassArgs
): PlanarReflectorRenderResult {
  const { App, mirror, renderer, scene, camera, virtualCamera, renderTarget } = args;
  const rendererShadowMap = readRecord(renderer.shadowMap);
  const previousShadowAutoUpdate = rendererShadowMap ? rendererShadowMap.autoUpdate : undefined;
  const xr = readRecord(renderer.xr);
  const previousXrEnabled = xr ? xr.enabled : undefined;
  const getRenderTarget = readFn(renderer, 'getRenderTarget');
  const setRenderTarget = readFn(renderer, 'setRenderTarget');
  const clear = readFn(renderer, 'clear');
  const render = readFn(renderer, 'render');
  if (!setRenderTarget || !render) return { ok: false, reason: 'renderer-surface-incomplete' };

  const mirrorVisibleBefore = mirror.visible;
  let hiddenPlanarSurfaces: HiddenPlanarReflectorSurface[] = [];
  let previousRenderTarget: unknown = null;
  let renderTargetChanged = false;

  try {
    previousRenderTarget = getRenderTarget ? call0(renderer, getRenderTarget) : null;
    hiddenPlanarSurfaces = hidePlanarReflectorSurfacesForInternalPass(App);
    mirror.visible = false;
    if (rendererShadowMap && typeof previousShadowAutoUpdate !== 'undefined') {
      rendererShadowMap.autoUpdate = false;
    }
    if (xr && typeof previousXrEnabled !== 'undefined') xr.enabled = false;

    call1(renderer, setRenderTarget, renderTarget);
    renderTargetChanged = true;
    const rendererState = readRecord(renderer.state);
    const depthBuffer = readRecord(readRecord(rendererState?.buffers)?.depth);
    call1(depthBuffer, depthBuffer?.setMask, true);
    call0(renderer, clear);
    call2(renderer, render, scene, virtualCamera);
    call1(renderer, setRenderTarget, previousRenderTarget);
    const viewport = camera.viewport;
    if (typeof viewport !== 'undefined') call1(rendererState, rendererState?.viewport, viewport);
    renderTargetChanged = false;
    return { ok: true };
  } catch {
    return { ok: false, reason: 'render-exception' };
  } finally {
    if (renderTargetChanged) call1(renderer, setRenderTarget, previousRenderTarget);
    restorePlanarReflectorSurfacesAfterInternalPass(hiddenPlanarSurfaces);
    mirror.visible = mirrorVisibleBefore;
    if (rendererShadowMap && typeof previousShadowAutoUpdate !== 'undefined') {
      rendererShadowMap.autoUpdate = previousShadowAutoUpdate;
    }
    if (xr && typeof previousXrEnabled !== 'undefined') xr.enabled = previousXrEnabled;
  }
}

export function renderPlanarReflectorSurface(args: {
  App: unknown;
  mirror: UnknownRecord;
  state: PlanarReflectorState;
  renderer: UnknownRecord;
  scene: unknown;
  camera: UnknownRecord;
}): PlanarReflectorRenderResult {
  const { App, mirror, state, renderer, scene, camera } = args;
  const surface = readRecord(state.surfaceObject) || mirror;
  try {
    const cameraResult = prepareVirtualReflectorCamera({ mirror, surface, state, camera });
    if (!cameraResult.ok) return cameraResult;
    const clipResult = applyReflectorObliqueClipPlane(state);
    if (!clipResult.ok) return clipResult;
    const renderResult = runPlanarReflectorRendererPass({
      App,
      mirror,
      renderer,
      scene,
      camera,
      virtualCamera: state.virtualCamera,
      renderTarget: state.renderTarget,
    });
    if (!renderResult.ok) return renderResult;
    state.updateCount += 1;
    return { ok: true };
  } catch {
    return { ok: false, reason: 'render-exception' };
  }
}
