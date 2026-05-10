import type {
  RootStateLike,
  SceneNamespaceLike,
  ThreeLike,
  UiSnapshotLike,
  UnknownRecord,
} from '../../../types';

import { getNormalizedErrorHead } from '../runtime/error_normalization.js';
import { reportError } from '../runtime/errors.js';

const __sceneViewReportNonFatalSeen = new Map<string, number>();

export type SceneViewSyncSnapshot = {
  sketchMode: boolean;
  lightingControl: boolean;
  lightAmb: string;
  lightDir: string;
  lightX: string;
  lightY: string;
  lightZ: string;
  cornerKey: string;
};

export type SceneViewStoreSyncState = {
  installed: boolean;
  unsub: (() => void) | null;
  modeUnsub: (() => void) | null;
  lightsUnsub: (() => void) | null;
  lastSnapshot: SceneViewSyncSnapshot | null;
  flushPending: boolean;
  queuedUpdateShadows: boolean;
  queuedForce: boolean;
  queuedReason: string | null;
  flushToken: number;
};

export type SceneViewServiceLike = SceneNamespaceLike &
  UnknownRecord & { __storeSyncState?: SceneViewStoreSyncState };
export type SceneLightingPositionLike = { set: (x: number, y: number, z: number) => void };
export type SceneObjectByNameLike = { visible?: boolean };
export type SceneGraphLike = {
  add?: (obj: unknown) => void;
  getObjectByName?: (name: string) => SceneObjectByNameLike | null;
};
export type SceneShadowLike = {
  mapSize: { width: number; height: number };
  camera: { near: number; far: number; left: number; right: number; top: number; bottom: number };
  bias?: number;
  normalBias?: number;
  radius?: number;
};
export type AmbientLightLike = { name?: string; intensity: number };
export type DirectionalLightLike = AmbientLightLike & {
  visible?: boolean;
  position?: SceneLightingPositionLike;
  castShadow?: boolean;
  shadow?: SceneShadowLike | null;
};
export type SceneRendererCompatLike = UnknownRecord & {
  outputColorSpace?: unknown;
  toneMapping?: unknown;
  toneMappingExposure?: number;
  useLegacyLights?: boolean;
};
export type SceneThreeLightingLike = ThreeLike & {
  AmbientLight: new (color?: number, intensity?: number) => AmbientLightLike;
  DirectionalLight: new (color?: number, intensity?: number) => DirectionalLightLike;
  SRGBColorSpace?: unknown;
  NeutralToneMapping?: unknown;
};

export type SceneViewCompatDefaults = {
  outputColorSpace?: unknown;
  toneMapping?: unknown;
  toneMappingExposure?: number;
  useLegacyLights?: boolean;
};

export type RootStateWithStoreUi = RootStateLike & { storeUi?: unknown };

export function reportSceneViewNonFatal(App: unknown, op: string, err: unknown, throttleMs = 4000): void {
  const now = Date.now();
  const msg = getNormalizedErrorHead(err, 'Unexpected error');
  const key = `${op}::${msg}`;
  const prev = __sceneViewReportNonFatalSeen.get(key) || 0;
  if (throttleMs > 0 && prev && now - prev < throttleMs) return;
  __sceneViewReportNonFatalSeen.set(key, now);
  if (__sceneViewReportNonFatalSeen.size > 600) {
    const pruneOlderThan = Math.max(10000, throttleMs * 4);
    for (const [k, ts] of __sceneViewReportNonFatalSeen) {
      if (now - ts > pruneOlderThan) __sceneViewReportNonFatalSeen.delete(k);
    }
  }
  reportError(App, err, { where: 'native/services/scene_view', op, fatal: false });
}

export function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object';
}

export function asUiSnapshot(value: unknown): UiSnapshotLike {
  return isRecord(value) ? { ...value } : {};
}

export function asRuntimeRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

export function asSceneNamespace(value: unknown): SceneNamespaceLike | null {
  return isRecord(value) ? value : null;
}

export function asSceneViewService(value: unknown): SceneViewServiceLike | null {
  return isRecord(value) ? value : null;
}

export function asSceneGraph(value: unknown): SceneGraphLike | null {
  const graph = isRecord(value) ? value : null;
  if (!graph) return null;
  return typeof graph.add === 'function' || typeof graph.getObjectByName === 'function' ? graph : null;
}

export function isSceneThreeLighting(value: unknown): value is SceneThreeLightingLike {
  return (
    !!value &&
    isRecord(value) &&
    typeof value.AmbientLight === 'function' &&
    typeof value.DirectionalLight === 'function'
  );
}

export function asSceneThreeLighting(value: unknown): SceneThreeLightingLike | null {
  return isSceneThreeLighting(value) ? value : null;
}

export function isAmbientLightLike(value: unknown): value is AmbientLightLike {
  const rec = isRecord(value) ? value : null;
  return !!rec && typeof rec.intensity === 'number';
}

export function asAmbientLight(value: unknown): AmbientLightLike | null {
  return isAmbientLightLike(value) ? value : null;
}

export function isDirectionalLightLike(value: unknown): value is DirectionalLightLike {
  const rec = isRecord(value) ? value : null;
  return !!rec && typeof rec.intensity === 'number';
}

export function asDirectionalLight(value: unknown): DirectionalLightLike | null {
  return isDirectionalLightLike(value) ? value : null;
}

export function asSceneRendererCompat(value: unknown): SceneRendererCompatLike | null {
  return isRecord(value) ? value : null;
}

export function asCompatDefaults(value: unknown): SceneViewCompatDefaults | undefined {
  return isRecord(value) ? value : undefined;
}

export function isRootStateWithStoreUi(value: unknown): value is RootStateWithStoreUi {
  return isRecord(value);
}

export function readRootStateWithStoreUi(value: unknown): RootStateWithStoreUi | null {
  return isRootStateWithStoreUi(value) ? value : null;
}

export function asFiniteNumber(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
}

export function asKeyPart(v: unknown): string {
  return v == null ? '' : String(v);
}

export function asRootStateLike(state: unknown): RootStateLike {
  const rec = isRecord(state) ? state : null;
  const meta = isRecord(rec?.meta) ? rec.meta : {};
  return {
    ui: isRecord(rec?.ui) ? rec.ui : {},
    runtime: isRecord(rec?.runtime) ? rec.runtime : {},
    config: isRecord(rec?.config) ? rec.config : {},
    mode: isRecord(rec?.mode) ? rec.mode : {},
    meta: {
      version: typeof meta.version === 'number' ? meta.version : 0,
      updatedAt: typeof meta.updatedAt === 'number' ? meta.updatedAt : 0,
      dirty: typeof meta.dirty === 'boolean' ? meta.dirty : false,
    },
  };
}
