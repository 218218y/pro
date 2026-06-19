// Native Builder RenderOps Extras (ESM)
//
// Responsibilities:
// - Install canonical render-ops extra seams onto App.services.builder.renderOps
// - Keep dimension-label, dimension-line, and outline helpers on focused owners
// - Avoid re-forming another mixed hotspot for runtime/cache setup + dimension overlays + outline mutation

import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import { assertBrowserWindow } from '../runtime/api.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';

import {
  ensureRenderOpsExtrasApp,
  ensureRenderOpsExtrasRuntime,
  readRenderOpsSurface,
} from './render_ops_extras_shared.js';
import {
  addDimensionLine,
  createAddDimensionLine,
  getDimLabelEntry,
} from './render_ops_extras_dimensions.js';
import { addOutlines, createOutlineBinding } from './render_ops_extras_outlines.js';

import type { AppContainer } from '../../../types/index.js';
import type { RenderOpsExtrasSurface } from './render_ops_extras_shared.js';

type InstallableRenderOpsExtrasSurface = RenderOpsExtrasSurface & Record<string, unknown>;
type RenderOpsExtrasInstallContext = {
  App: AppContainer;
};

type RenderOpsExtrasCallableKey = 'addDimensionLine' | 'createOutlineBinding';

const RENDER_OPS_EXTRAS_CANONICAL_KEYS: Record<RenderOpsExtrasCallableKey, string> = {
  addDimensionLine: '__wpRenderOpsExtrasAddDimensionLine',
  createOutlineBinding: '__wpRenderOpsExtrasCreateOutlineBinding',
};

const renderOpsExtrasInstallContexts = new WeakMap<object, RenderOpsExtrasInstallContext>();

export { getDimLabelEntry, addDimensionLine, addOutlines, createOutlineBinding };

export const builderRenderOpsExtras = {
  getDimLabelEntry,
  addDimensionLine,
  createOutlineBinding,
};

function createRenderOpsExtrasInstallContext(App: AppContainer): RenderOpsExtrasInstallContext {
  return { App };
}

function refreshRenderOpsExtrasInstallContext(
  context: RenderOpsExtrasInstallContext,
  App: AppContainer
): RenderOpsExtrasInstallContext {
  context.App = App;
  return context;
}

function resolveRenderOpsExtrasInstallContext(
  renderOps: InstallableRenderOpsExtrasSurface,
  App: AppContainer
): RenderOpsExtrasInstallContext {
  let context = renderOpsExtrasInstallContexts.get(renderOps);
  if (!context) {
    context = createRenderOpsExtrasInstallContext(App);
    renderOpsExtrasInstallContexts.set(renderOps, context);
    return context;
  }
  return refreshRenderOpsExtrasInstallContext(context, App);
}

function clearDeprecatedInstalledRenderOpsExtrasDrift(renderOps: InstallableRenderOpsExtrasSurface): void {
  delete renderOps.__addOutlinesImpl;
  delete renderOps.addOutlines;
  delete renderOps.__wpRenderOpsExtrasAddOutlinesImpl;
  delete renderOps.__wpRenderOpsExtrasAddOutlines;
  if (renderOps.__esm_extras_v1 !== true) return;
  const keys = Object.keys(RENDER_OPS_EXTRAS_CANONICAL_KEYS) as RenderOpsExtrasCallableKey[];
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const stableKey = RENDER_OPS_EXTRAS_CANONICAL_KEYS[key];
    if (typeof renderOps[stableKey] !== 'function') {
      delete renderOps[key];
    }
  }
}

export function installBuilderRenderOpsExtras(appIn: unknown): RenderOpsExtrasSurface {
  const App = ensureRenderOpsExtrasApp(appIn);
  assertBrowserWindow(App, 'native/builder/render_ops_extras.install');

  ensureRenderOpsExtrasRuntime(App);
  const builder = ensureBuilderService(App, 'native/builder/render_ops_extras.install');
  const renderOps: InstallableRenderOpsExtrasSurface = readRenderOpsSurface(builder.renderOps) || {};
  const context = resolveRenderOpsExtrasInstallContext(renderOps, App);
  builder.renderOps = renderOps;

  clearDeprecatedInstalledRenderOpsExtrasDrift(renderOps);

  installStableSurfaceMethod(
    renderOps,
    'addDimensionLine',
    RENDER_OPS_EXTRAS_CANONICAL_KEYS.addDimensionLine,
    () => {
      return (...args: Parameters<NonNullable<RenderOpsExtrasSurface['addDimensionLine']>>) => {
        return createAddDimensionLine(context.App)(...args);
      };
    }
  );

  installStableSurfaceMethod(
    renderOps,
    'createOutlineBinding',
    RENDER_OPS_EXTRAS_CANONICAL_KEYS.createOutlineBinding,
    () => snapshot => createOutlineBinding(context.App, snapshot)
  );

  renderOps.__esm_extras_v1 = true;
  return renderOps;
}
