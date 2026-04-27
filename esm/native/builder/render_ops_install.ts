import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';

import type { AppContainer, BuilderHandleMeshOptionsLike, RenderOpsLike } from '../../../types';

type AnyMap = Record<string, unknown>;
type RenderOpsTarget = RenderOpsLike & AnyMap;
type RenderOpSource = Function;

type ArgsBoundRenderOpKey =
  | 'ensureSplitHoverMarker'
  | 'ensureDoorActionHoverMarker'
  | 'ensureDoorCutHoverMarker'
  | 'ensureInteriorLayoutHoverPreview'
  | 'setInteriorLayoutHoverPreview'
  | 'ensureSketchPlacementPreview'
  | 'setSketchPlacementPreview'
  | 'createBoard'
  | 'createModuleHitBox'
  | 'createDrawerShadowPlane'
  | 'applyDimensions'
  | 'applySlidingDoorsOps'
  | 'applyHingedDoorsOps'
  | 'applyExternalDrawersOps'
  | 'applyInternalDrawersOps'
  | 'applyInteriorPresetOps'
  | 'applyInteriorCustomOps'
  | 'applyInteriorSketchExtras'
  | 'createRodWithContents';

type MaybeArgsBoundRenderOpKey =
  | 'getCommonMats'
  | 'getMirrorMaterial'
  | 'hideInteriorLayoutHoverPreview'
  | 'hideSketchPlacementPreview';

type RenderOpsCallableKey =
  | ArgsBoundRenderOpKey
  | MaybeArgsBoundRenderOpKey
  | 'createHandleMesh'
  | 'applyCarcassOps';

const ARGS_BOUND_RENDER_OP_KEYS: readonly ArgsBoundRenderOpKey[] = [
  'ensureSplitHoverMarker',
  'ensureDoorActionHoverMarker',
  'ensureDoorCutHoverMarker',
  'ensureInteriorLayoutHoverPreview',
  'setInteriorLayoutHoverPreview',
  'ensureSketchPlacementPreview',
  'setSketchPlacementPreview',
  'createBoard',
  'createModuleHitBox',
  'createDrawerShadowPlane',
  'applyDimensions',
  'applySlidingDoorsOps',
  'applyHingedDoorsOps',
  'applyExternalDrawersOps',
  'applyInternalDrawersOps',
  'applyInteriorPresetOps',
  'applyInteriorCustomOps',
  'applyInteriorSketchExtras',
  'createRodWithContents',
];

const MAYBE_ARGS_BOUND_RENDER_OP_KEYS: readonly MaybeArgsBoundRenderOpKey[] = [
  'getCommonMats',
  'getMirrorMaterial',
  'hideInteriorLayoutHoverPreview',
  'hideSketchPlacementPreview',
];

const RENDER_OP_CALLABLE_KEYS: readonly RenderOpsCallableKey[] = [
  ...MAYBE_ARGS_BOUND_RENDER_OP_KEYS,
  ...ARGS_BOUND_RENDER_OP_KEYS,
  'createHandleMesh',
  'applyCarcassOps',
];

type RenderOpsInstallDeps = {
  assertApp: (value: unknown, where: string) => AppContainer;
  assertBrowserWindow: (app: AppContainer, where: string) => unknown;
  ensureBuilderService: (app: AppContainer, where: string) => AnyMap;
  getBuilderService: (app: unknown) => AnyMap | null;
  asMap: (value: unknown) => AnyMap | null;
  asObject: <T extends object = AnyMap>(value: unknown) => T | null;
  builderRenderOps: RenderOpsLike & AnyMap;
};

type RenderOpsInstallContext = {
  App: AppContainer;
};

const renderOpsInstallContexts = new WeakMap<object, RenderOpsInstallContext>();

function createRenderOpsInstallContext(App: AppContainer): RenderOpsInstallContext {
  return { App };
}

function refreshRenderOpsInstallContext(
  context: RenderOpsInstallContext,
  App: AppContainer
): RenderOpsInstallContext {
  context.App = App;
  return context;
}

function resolveRenderOpsInstallContext(target: RenderOpsTarget, App: AppContainer): RenderOpsInstallContext {
  let context = renderOpsInstallContexts.get(target);
  if (!context) {
    context = createRenderOpsInstallContext(App);
    renderOpsInstallContexts.set(target, context);
    return context;
  }
  return refreshRenderOpsInstallContext(context, App);
}

function toStableRenderOpKey(key: RenderOpsCallableKey): string {
  return `__wpRenderOps${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function clearLegacyInstalledRenderOpDrift(target: RenderOpsTarget): void {
  if (target.__esm_v1 !== true) return;
  for (let i = 0; i < RENDER_OP_CALLABLE_KEYS.length; i += 1) {
    const key = RENDER_OP_CALLABLE_KEYS[i];
    const stableKey = toStableRenderOpKey(key);
    if (typeof target[stableKey] !== 'function') {
      delete target[key];
    }
  }
}

export function createBuilderRenderOpsInstall(deps: RenderOpsInstallDeps) {
  const {
    assertApp,
    assertBrowserWindow,
    ensureBuilderService,
    getBuilderService,
    asMap,
    asObject,
    builderRenderOps,
  } = deps;

  function getBuilderRenderOps(App: unknown): RenderOpsLike | typeof builderRenderOps {
    const B = getBuilderService(App);
    const cur = asObject<RenderOpsLike>(B?.renderOps);
    return cur || builderRenderOps;
  }

  function installBuilderRenderOps(appIn: unknown) {
    const App = assertApp(appIn, 'native/builder/render_ops.install');
    assertBrowserWindow(App, 'native/builder/render_ops.install');

    const B = ensureBuilderService(App, 'native/builder/render_ops.install');
    const current = asObject<RenderOpsTarget>(B.renderOps);
    const target: RenderOpsTarget = current || {};
    const context = resolveRenderOpsInstallContext(target, App);
    B.renderOps = target;

    clearLegacyInstalledRenderOpDrift(target);

    function withBoundApp(value?: unknown): AnyMap {
      const next = asMap(value) || {};
      if (!next.App) next.App = context.App;
      return next;
    }

    function withBoundCarcassContext(
      value?: Parameters<NonNullable<RenderOpsLike['applyCarcassOps']>>[1]
    ): Parameters<NonNullable<RenderOpsLike['applyCarcassOps']>>[1] {
      const next = asMap(value) || {};
      const appValue = asMap(next.App) || context.App;
      return { ...next, App: appValue };
    }

    function readSource<K extends keyof RenderOpsLike>(key: K): RenderOpSource | null {
      const source = builderRenderOps[key];
      return typeof source === 'function' ? source : null;
    }

    function installArgsRenderOp(key: ArgsBoundRenderOpKey | MaybeArgsBoundRenderOpKey): void {
      const source = readSource(key);
      if (!source) return;
      installStableSurfaceMethod(target, key, toStableRenderOpKey(key), () => {
        return (args?: unknown) => Reflect.apply(source, builderRenderOps, [withBoundApp(args)]);
      });
    }

    function bindHandleMesh(fn: NonNullable<RenderOpsLike['createHandleMesh']>) {
      return function bound(
        type: string,
        w: number,
        h: number,
        isLeftHinge: boolean,
        opts?: BuilderHandleMeshOptionsLike
      ) {
        return fn(type, w, h, isLeftHinge, withBoundApp(opts));
      };
    }

    function installHandleMesh(fn: NonNullable<RenderOpsLike['createHandleMesh']>) {
      installStableSurfaceMethod(target, 'createHandleMesh', toStableRenderOpKey('createHandleMesh'), () => {
        return bindHandleMesh(fn);
      });
    }

    function installCarcass(fn: NonNullable<RenderOpsLike['applyCarcassOps']>) {
      installStableSurfaceMethod(target, 'applyCarcassOps', toStableRenderOpKey('applyCarcassOps'), () => {
        return function bound(
          ops: Parameters<NonNullable<RenderOpsLike['applyCarcassOps']>>[0],
          ctx?: Parameters<NonNullable<RenderOpsLike['applyCarcassOps']>>[1]
        ) {
          return fn(ops, withBoundCarcassContext(ctx));
        };
      });
    }

    for (let i = 0; i < MAYBE_ARGS_BOUND_RENDER_OP_KEYS.length; i += 1) {
      installArgsRenderOp(MAYBE_ARGS_BOUND_RENDER_OP_KEYS[i]);
    }
    for (let i = 0; i < ARGS_BOUND_RENDER_OP_KEYS.length; i += 1) {
      installArgsRenderOp(ARGS_BOUND_RENDER_OP_KEYS[i]);
    }

    if (typeof builderRenderOps.createHandleMesh === 'function') {
      installHandleMesh(builderRenderOps.createHandleMesh);
    }

    if (typeof builderRenderOps.applyCarcassOps === 'function') {
      installCarcass(builderRenderOps.applyCarcassOps);
    }

    target.__esm_v1 = true;
    return target;
  }

  return {
    getBuilderRenderOps,
    installBuilderRenderOps,
  };
}
