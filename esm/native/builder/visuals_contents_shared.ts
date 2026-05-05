import { assertApp } from '../runtime/api.js';
import { getBuildUIFromPlatform } from '../runtime/platform_access.js';
import { ensureBuilderService, getBuilderAddOutlines } from '../runtime/builder_service_access.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { assertThreeViaDeps } from '../runtime/three_access.js';
import { getCfg, getUi } from './store_access.js';

import type {
  AppContainer,
  BuilderOutlineFn,
  BuilderAddFoldedClothesFn,
  BuilderAddHangingClothesFn,
  BuilderAddRealisticHangerFn,
  ThreeLike,
  UnknownRecord,
} from '../../../types/index.js';

export type AppAwareAddHangingClothesFn = (
  App: AppContainer,
  ...args: Parameters<BuilderAddHangingClothesFn>
) => ReturnType<BuilderAddHangingClothesFn>;

export type AppAwareAddFoldedClothesFn = (
  App: AppContainer,
  ...args: Parameters<BuilderAddFoldedClothesFn>
) => ReturnType<BuilderAddFoldedClothesFn>;

export type AppAwareAddRealisticHangerFn = (
  App: AppContainer,
  ...args: Parameters<BuilderAddRealisticHangerFn>
) => ReturnType<BuilderAddRealisticHangerFn>;

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asObject(value: unknown): UnknownRecord | null {
  return readRecord(value);
}

export function ensureVisualsContentsApp(passed: unknown): AppContainer {
  const App = assertApp(passed, 'native/builder/visuals_contents.app');
  const builder = ensureBuilderService(App, 'native/builder/visuals_contents');
  builder.modules = asObject(builder.modules) || {};
  builder.contents = asObject(builder.contents) || {};
  return App;
}

export function ensureVisualsContentsTHREE(passedApp: unknown): ThreeLike {
  const App = ensureVisualsContentsApp(passedApp);
  return assertThreeViaDeps(App, 'native/builder/visuals_contents.THREE');
}

export function getVisualsContentsBuildUI(passedApp: unknown): UnknownRecord {
  try {
    const App = asObject(passedApp) ? ensureVisualsContentsApp(passedApp) : null;
    if (!App) return {};
    return getBuildUIFromPlatform(App);
  } catch {
    return {};
  }
}

export function getVisualsContentsAddOutlines(passedApp: unknown): BuilderOutlineFn | null {
  try {
    const App = asObject(passedApp) ? ensureVisualsContentsApp(passedApp) : null;
    return App ? getBuilderAddOutlines(App) : null;
  } catch {
    return null;
  }
}

export function addVisualsContentsOutlines(mesh: unknown, passedApp: unknown) {
  const fn = getVisualsContentsAddOutlines(passedApp);
  if (fn) return fn(mesh);
}

export function readVisualsContentsSketchMode(App: AppContainer): boolean {
  return !!readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false);
}

export function resolveShowContents(buildUI: UnknownRecord, showContentsOverride?: unknown): boolean {
  if (typeof showContentsOverride !== 'undefined') return !!showContentsOverride;
  if (buildUI && typeof buildUI.showContents !== 'undefined') return !!buildUI.showContents;
  return false;
}

export function resolveLibraryContents(buildUI: UnknownRecord, passedApp: unknown): boolean {
  if (buildUI && typeof buildUI.isLibraryMode !== 'undefined') return !!buildUI.isLibraryMode;
  try {
    const App = asObject(passedApp) ? ensureVisualsContentsApp(passedApp) : null;
    if (!App) return false;
    const cfg = getCfg(App) || {};
    return !!cfg.isLibraryMode;
  } catch {
    return false;
  }
}

export function resolveShowHanger(App: AppContainer): boolean {
  try {
    const ui = getUi(App) || {};
    if (typeof ui.showHanger !== 'undefined') return !!ui.showHanger;
    const buildUI = getVisualsContentsBuildUI(App);
    return buildUI && typeof buildUI.showHanger !== 'undefined' ? !!buildUI.showHanger : false;
  } catch {
    return false;
  }
}

export const seededRandom = (function () {
  let _seed = 1234;
  return {
    setSeed(s: number) {
      _seed = s % 2147483647;
      if (_seed <= 0) _seed += 2147483646;
    },
    random() {
      _seed = (_seed * 16807) % 2147483647;
      return (_seed - 1) / 2147483646;
    },
  };
})();

export const CLOTH_COLORS = [
  0x2c3e50, 0x8e44ad, 0x27ae60, 0xc0392b, 0xd35400, 0x7f8c8d, 0xbdc3c7, 0xf5f5dc, 0x1abc9c, 0x34495e,
  0xecf0f1,
];

export function getRandomClothColor() {
  const r = typeof seededRandom.random === 'function' ? seededRandom.random() : Math.random();
  return CLOTH_COLORS[Math.floor(r * CLOTH_COLORS.length)];
}

export const BOOK_COLORS = [
  0x7a3e2e, 0x2f5d7c, 0x476a34, 0x8a6f2a, 0x5a3f7a, 0x8c3d4b, 0x36454f, 0xb08d57, 0x6b4e31, 0x1f4e5f,
  0x9a4f2f, 0x3f6f5f,
];

export function getRandomBookColor() {
  const r = typeof seededRandom.random === 'function' ? seededRandom.random() : Math.random();
  return BOOK_COLORS[Math.floor(r * BOOK_COLORS.length)];
}
