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
import { addOutlines, createAddOutlinesImpl } from './render_ops_extras_outlines.js';

import type { AppContainer } from '../../../types/index.js';
import type { RenderOpsExtrasSurface } from './render_ops_extras_shared.js';

type InstallableRenderOpsExtrasSurface = RenderOpsExtrasSurface & Record<string, unknown>;
type RenderOpsExtrasInstallContext = {
  App: AppContainer;
};

type RenderOpsExtrasCallableKey = 'addDimensionLine' | '__addOutlinesImpl' | 'addOutlines';

const RENDER_OPS_EXTRAS_CANONICAL_KEYS: Record<RenderOpsExtrasCallableKey, string> = {
  addDimensionLine: '__wpRenderOpsExtrasAddDimensionLine',
  __addOutlinesImpl: '__wpRenderOpsExtrasAddOutlinesImpl',
  addOutlines: '__wpRenderOpsExtrasAddOutlines',
};

const renderOpsExtrasInstallContexts = new WeakMap<object, RenderOpsExtrasInstallContext>();

export { getDimLabelEntry, addDimensionLine, addOutlines };

export const builderRenderOpsExtras = {
  getDimLabelEntry,
  addDimensionLine,
  addOutlines,
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

function clearLegacyInstalledRenderOpsExtrasDrift(renderOps: InstallableRenderOpsExtrasSurface): void {
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

  clearLegacyInstalledRenderOpsExtrasDrift(renderOps);

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
    '__addOutlinesImpl',
    RENDER_OPS_EXTRAS_CANONICAL_KEYS.__addOutlinesImpl,
    () => {
      return (mesh: unknown) => createAddOutlinesImpl(context.App)(mesh);
    }
  );

  installStableSurfaceMethod(renderOps, 'addOutlines', RENDER_OPS_EXTRAS_CANONICAL_KEYS.addOutlines, () => {
    return (mesh: unknown) => renderOps.__addOutlinesImpl?.(mesh);
  });

  renderOps.__esm_extras_v1 = true;
  return renderOps;
}
