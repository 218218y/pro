import type { AppContainer, UnknownRecord } from '../../../types/index.js';
import { getBrowserTimers, requestIdleCallbackMaybe } from './api_browser_surface.js';
import { runPerfPhase } from './observability_surface.js';
import { getCamera, getMirrorRenderTarget, getRenderer, getScene } from './render_access.js';
import { getCacheBag } from './cache_access.js';

const ADHESIVE_GLASS_STANDARD_WARMUP_KEY = '__wpAdhesiveGlassStandardShaderWarmup';
const ADHESIVE_GLASS_STANDARD_WARMUP_PROFILE = 'cube-standard-front-opaque-warm-v1';

type WarmupState = {
  scheduled?: boolean;
  inFlight?: Promise<void> | null;
  completed?: boolean;
  profile?: string;
  material?: unknown;
  geometry?: unknown;
  mesh?: unknown;
  attempts?: number;
  lastSkippedReason?: string | null;
};

type MeshStandardMaterialConstructor = new (params: UnknownRecord) => unknown;
type BoxGeometryConstructor = new (width: number, height: number, depth: number) => unknown;
type MeshConstructor = new (geometry: unknown, material: unknown) => unknown;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readWarmupState(App: unknown): WarmupState {
  const cache = getCacheBag(App) as Record<string, unknown>;
  const existing = cache[ADHESIVE_GLASS_STANDARD_WARMUP_KEY];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) return existing as WarmupState;
  const next: WarmupState = Object.create(null) as WarmupState;
  cache[ADHESIVE_GLASS_STANDARD_WARMUP_KEY] = next;
  return next;
}

function readMirrorRenderTargetTexture(App: unknown): unknown {
  try {
    const renderTarget = getMirrorRenderTarget(App) as { texture?: unknown } | null;
    return renderTarget?.texture || null;
  } catch {
    return null;
  }
}

function readMeshStandardMaterialConstructor(value: unknown): MeshStandardMaterialConstructor | null {
  return typeof value === 'function' ? (value as MeshStandardMaterialConstructor) : null;
}

function readBoxGeometryConstructor(value: unknown): BoxGeometryConstructor | null {
  return typeof value === 'function' ? (value as BoxGeometryConstructor) : null;
}

function readMeshConstructor(value: unknown): MeshConstructor | null {
  return typeof value === 'function' ? (value as MeshConstructor) : null;
}

function readThreeRecord(THREE: unknown): UnknownRecord | null {
  return isRecord(THREE) ? THREE : null;
}

function readFrontSide(THREE: unknown): unknown {
  const three = readThreeRecord(THREE);
  if (!three) return undefined;
  return typeof three.FrontSide !== 'undefined' ? three.FrontSide : three.DoubleSide;
}

function call0(ctx: unknown, fn: unknown): unknown {
  return typeof fn === 'function' ? fn.call(ctx) : undefined;
}

function call1(ctx: unknown, fn: unknown, a: unknown): unknown {
  return typeof fn === 'function' ? fn.call(ctx, a) : undefined;
}

function call2(ctx: unknown, fn: unknown, a: unknown, b: unknown): unknown {
  return typeof fn === 'function' ? fn.call(ctx, a, b) : undefined;
}

function call3(ctx: unknown, fn: unknown, a: unknown, b: unknown, c: unknown): unknown {
  return typeof fn === 'function' ? fn.call(ctx, a, b, c) : undefined;
}

function createWarmupMaterial(THREE: unknown, texture: unknown): unknown {
  const three = readThreeRecord(THREE);
  const MeshStandardMaterial = readMeshStandardMaterialConstructor(three?.MeshStandardMaterial);
  if (!MeshStandardMaterial) return null;
  const mat = new MeshStandardMaterial({
    color: 0x050608,
    transparent: false,
    opacity: 1,
    roughness: 0.18,
    metalness: 0.06,
    envMap: texture,
    envMapIntensity: 0.72,
    side: readFrontSide(THREE),
  });
  const rec = isRecord(mat) ? mat : null;
  if (!rec) return mat;
  rec.transparent = false;
  rec.opacity = 1;
  rec.roughness = 0.18;
  rec.metalness = 0.06;
  rec.envMap = texture;
  rec.envMapIntensity = 0.72;
  rec.side = readFrontSide(THREE);
  rec.depthWrite = true;
  rec.__keepMaterial = true;
  rec.userData = isRecord(rec.userData) ? rec.userData : {};
  const userData = rec.userData as UnknownRecord;
  userData.__keepMaterial = true;
  userData.__wpAdhesiveGlassShaderWarmup = true;
  userData.__wpAdhesiveGlassWarmupProfile = ADHESIVE_GLASS_STANDARD_WARMUP_PROFILE;
  return mat;
}

function createWarmupMesh(THREE: unknown, material: unknown): { geometry: unknown; mesh: unknown } | null {
  const three = readThreeRecord(THREE);
  const BoxGeometry = readBoxGeometryConstructor(three?.BoxGeometry);
  const Mesh = readMeshConstructor(three?.Mesh);
  if (!BoxGeometry || !Mesh) return null;
  const geometry = new BoxGeometry(0.001, 0.001, 0.001);
  const mesh = new Mesh(geometry, material);
  const rec = isRecord(mesh) ? mesh : null;
  if (rec) {
    rec.name = '__wpAdhesiveGlassStandardShaderWarmupMesh';
    rec.visible = true;
    rec.frustumCulled = false;
    rec.renderOrder = -999999;
    rec.userData = isRecord(rec.userData) ? rec.userData : {};
    const userData = rec.userData as UnknownRecord;
    userData.__wpAdhesiveGlassShaderWarmup = true;
    const pos = isRecord(rec.position) ? rec.position : null;
    if (pos && typeof pos.set === 'function') call3(pos, pos.set, 0, -100000, 0);
  }
  return { geometry, mesh };
}

function withShaderErrorChecksDisabled<T>(renderer: UnknownRecord, run: () => T): T {
  const debug = isRecord(renderer.debug) ? renderer.debug : null;
  if (!debug || typeof debug.checkShaderErrors === 'undefined') {
    return run();
  }
  const prev = debug.checkShaderErrors;
  try {
    debug.checkShaderErrors = false;
    return run();
  } finally {
    debug.checkShaderErrors = prev;
  }
}

function removeWarmupMesh(scene: UnknownRecord, mesh: unknown): void {
  if (typeof scene.remove === 'function') {
    call1(scene, scene.remove, mesh);
    return;
  }
  const children = Array.isArray(scene.children) ? scene.children : null;
  if (!children) return;
  const index = children.indexOf(mesh);
  if (index >= 0) children.splice(index, 1);
}

export function warmAdhesiveGlassStandardShaderNow(App: unknown, THREE: unknown): boolean {
  const state = readWarmupState(App);

  if (state.inFlight) return true;

  const renderer = isRecord(getRenderer(App)) ? (getRenderer(App) as UnknownRecord) : null;
  const scene = isRecord(getScene(App)) ? (getScene(App) as UnknownRecord) : null;
  const camera = isRecord(getCamera(App)) ? (getCamera(App) as UnknownRecord) : null;
  const texture = readMirrorRenderTargetTexture(App);
  if (!renderer || !scene || !camera || !texture) {
    state.completed = false;
    state.scheduled = false;
    state.inFlight = null;
    state.lastSkippedReason = 'surface-incomplete';
    return false;
  }

  const existingMaterial = isRecord(state.material) ? state.material : null;
  if (state.completed && state.profile === ADHESIVE_GLASS_STANDARD_WARMUP_PROFILE) {
    if (existingMaterial && existingMaterial.envMap !== texture) existingMaterial.envMap = texture;
    state.lastSkippedReason = null;
    return true;
  }

  const material = createWarmupMaterial(THREE, texture);
  const warmupMesh = material ? createWarmupMesh(THREE, material) : null;
  if (!material || !warmupMesh) {
    state.completed = false;
    state.scheduled = false;
    state.inFlight = null;
    state.lastSkippedReason = 'three-capability-missing';
    return false;
  }

  state.attempts = Math.max(0, Math.floor(Number(state.attempts) || 0)) + 1;
  state.scheduled = false;
  state.completed = false;

  let added = false;
  try {
    call0(
      isRecord(warmupMesh.mesh) ? warmupMesh.mesh : null,
      isRecord(warmupMesh.mesh) ? warmupMesh.mesh.updateMatrixWorld : null
    );

    const compileAsync = renderer.compileAsync;
    const compile = renderer.compile;
    state.material = material;
    state.geometry = warmupMesh.geometry;
    state.mesh = warmupMesh.mesh;
    state.profile = ADHESIVE_GLASS_STANDARD_WARMUP_PROFILE;

    if (typeof compileAsync === 'function') {
      const result = withShaderErrorChecksDisabled(renderer, () =>
        call3(renderer, compileAsync, warmupMesh.mesh, camera, scene)
      );
      if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
        const completion = runPerfPhase(
          App as AppContainer,
          'boot.ui.shader-warmup.complete',
          'shader-warmup',
          () => Promise.resolve(result)
        );
        let inFlight: Promise<void>;
        inFlight = completion.then(
          () => {
            if (state.inFlight !== inFlight) return;
            state.inFlight = null;
            state.completed = true;
            state.lastSkippedReason = null;
          },
          () => {
            if (state.inFlight !== inFlight) return;
            state.inFlight = null;
            state.completed = false;
            state.lastSkippedReason = 'compile-failed';
          }
        );
        state.inFlight = inFlight;
        state.lastSkippedReason = null;
        return true;
      }
    } else if (typeof compile === 'function') {
      withShaderErrorChecksDisabled(renderer, () => call3(renderer, compile, warmupMesh.mesh, camera, scene));
    } else if (typeof renderer.render === 'function') {
      const add = scene.add;
      if (typeof add === 'function') {
        call1(scene, add, warmupMesh.mesh);
        added = true;
      }
      withShaderErrorChecksDisabled(renderer, () => call2(renderer, renderer.render, scene, camera));
    } else {
      state.lastSkippedReason = 'renderer-compile-unavailable';
      return false;
    }

    state.completed = true;
    state.inFlight = null;
    state.lastSkippedReason = null;
    return true;
  } catch {
    state.completed = false;
    state.scheduled = false;
    state.inFlight = null;
    state.lastSkippedReason = 'compile-failed';
    return false;
  } finally {
    if (added) removeWarmupMesh(scene, warmupMesh.mesh);
  }
}

export function scheduleAdhesiveGlassStandardShaderWarmup(App: unknown, THREE: unknown): void {
  const state = readWarmupState(App);
  if (state.completed || state.scheduled || state.inFlight) return;
  state.scheduled = true;
  state.profile = ADHESIVE_GLASS_STANDARD_WARMUP_PROFILE;

  const run = () => {
    try {
      runPerfPhase(App as AppContainer, 'boot.ui.shader-warmup.submit', 'shader-warmup', () =>
        warmAdhesiveGlassStandardShaderNow(App, THREE)
      );
    } catch {
      state.scheduled = false;
      state.completed = false;
      state.lastSkippedReason = 'schedule-run-failed';
    }
  };

  const idle = requestIdleCallbackMaybe(App);
  if (idle) {
    try {
      idle(() => run(), { timeout: 250 });
      return;
    } catch {
      // Continue with timer scheduling when idle scheduling is unavailable.
    }
  }

  try {
    getBrowserTimers(App).setTimeout(run, 0);
  } catch {
    state.scheduled = false;
    run();
  }
}
