import { assertApp } from '../runtime/api.js';
import { getBuildUIFromPlatform } from '../runtime/platform_access.js';
import {
  ensureBuilderService,
  getBuilderAddOutlines,
  requireBuilderGetMaterial,
  resolveBuilderMirrorMaterial,
} from '../runtime/builder_service_access.js';
import { assertThreeViaDeps } from '../runtime/three_access.js';

import type {
  AppContainer,
  BuilderGetMaterialFn,
  BuilderOutlineFn,
  ConfigStateLike,
  ControlsLike,
  IndividualColorsMap,
  Object3DLike,
  RendererLike,
  SavedColorLike,
  ThreeLike,
  UnknownRecord,
} from '../../../types/index.js';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asChestModeObject(value: unknown): UnknownRecord | null {
  return readRecord(value);
}

function isObject3DLike(value: unknown): value is Object3DLike {
  const rec = readRecord(value);
  return !!(
    rec &&
    Array.isArray(rec.children) &&
    readRecord(rec.position) &&
    readRecord(rec.rotation) &&
    readRecord(rec.scale) &&
    readRecord(rec.userData) &&
    typeof rec.add === 'function' &&
    typeof rec.remove === 'function'
  );
}

export function asChestModeObject3D(value: unknown): Object3DLike | null {
  return isObject3DLike(value) ? value : null;
}

function isRendererLike(value: unknown): value is RendererLike {
  const rec = readRecord(value);
  return !!rec && typeof rec.render === 'function';
}

export function asChestModeRenderer(value: unknown): RendererLike | null {
  return isRendererLike(value) ? value : null;
}

function isControlsLike(value: unknown): value is ControlsLike {
  const rec = readRecord(value);
  return !!rec && typeof rec.update === 'function';
}

export function asChestModeControls(value: unknown): ControlsLike | null {
  return isControlsLike(value) ? value : null;
}

export function ensureChestModeApp(passed: unknown): AppContainer {
  const App = assertApp(passed, 'native/builder/visuals_chest_mode.app');
  const builder = ensureBuilderService(App, 'native/builder/visuals_chest_mode');
  builder.modules = asChestModeObject(builder.modules) || {};
  builder.contents = asChestModeObject(builder.contents) || {};
  return App;
}

export function ensureChestModeTHREE(passedApp: unknown): ThreeLike {
  const App = ensureChestModeApp(passedApp);
  return assertThreeViaDeps(App, 'native/builder/visuals_chest_mode.THREE');
}

export function getChestModeBuildUI(passedApp: unknown): UnknownRecord {
  try {
    const App = asChestModeObject(passedApp) ? ensureChestModeApp(passedApp) : null;
    if (!App) return {};
    return getBuildUIFromPlatform(App);
  } catch {
    return {};
  }
}

export function getChestModeAddOutlines(passedApp: unknown): BuilderOutlineFn | null {
  try {
    const App = asChestModeObject(passedApp) ? ensureChestModeApp(passedApp) : null;
    return App ? getBuilderAddOutlines(App) : null;
  } catch {
    return null;
  }
}

export function addChestModeOutlines(mesh: unknown, passedApp: unknown): unknown {
  const fn = getChestModeAddOutlines(passedApp);
  if (fn) return fn(mesh);
  return undefined;
}

export function getChestModeMaterial(
  passedApp: AppContainer,
  ...args: Parameters<BuilderGetMaterialFn>
): ReturnType<BuilderGetMaterialFn> {
  const App = ensureChestModeApp(passedApp);
  return requireBuilderGetMaterial(App, 'native/builder/visuals_chest_mode.materials.getMaterial')(...args);
}

export function findSavedColorById(cfg: ConfigStateLike, id: string): SavedColorLike | null {
  const savedColors = Array.isArray(cfg.savedColors) ? cfg.savedColors : [];
  for (const entry of savedColors) {
    if (entry && entry.id === id) return entry;
  }
  return null;
}

export function getMirrorMaterialFromServices(App: AppContainer, THREE: ThreeLike): unknown {
  return resolveBuilderMirrorMaterial(
    App,
    THREE,
    () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.01 })
  );
}

function readStringMap(value: unknown): Record<string, string | null | undefined> | null {
  const rec = asChestModeObject(value);
  if (!rec) return null;
  const out: Record<string, string | null | undefined> = {};
  for (const [key, entry] of Object.entries(rec)) {
    if (typeof entry === 'string') out[key] = entry;
    else if (entry === null) out[key] = null;
    else if (typeof entry === 'undefined') out[key] = undefined;
  }
  return out;
}

export function readChestModeIndividualColorsMap(value: unknown): IndividualColorsMap | null {
  return readStringMap(value);
}
