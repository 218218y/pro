import { resetInternalGridMaps } from '../runtime/cache_access.js';
import { captureLocalOpenStateBeforeBuild } from '../runtime/doors_access.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';
import { resolveBuilderDepsOrThrow } from './builder_deps_resolver.js';
import { resolveBuildStateOrThrow } from './build_state_resolver.js';
import { sanitizeBuildDimsAndSyncRuntime } from './state_sanitize_pipeline.js';
import { resetEdgeHandleDefaultNoneCacheMaps } from './edge_handle_default_none_runtime.js';

import type { AppContainer, BuilderDepsRootLike, BuildStateResolvedLike } from '../../../types';

function __builderGuardStrict<T>(
  _App: AppContainer,
  _op: string,
  fn: (() => T) | null | undefined
): T | undefined {
  if (typeof fn !== 'function') return undefined;
  return fn();
}

export type BuildWardrobeFlowArgs = {
  App: AppContainer;
  builderDeps: BuilderDepsRootLike;
  stateOrOverride: unknown;
  label?: string;
};

export type PreparedBuildWardrobeFlow = {
  App: AppContainer;
  label: string;
  deps: ReturnType<typeof resolveBuilderDepsOrThrow>;
  buildState: BuildStateResolvedLike;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  chestDrawersCount: number;
  sketchMode: boolean;
};

export function prepareBuildWardrobeFlow(
  args: BuildWardrobeFlowArgs | null | undefined
): PreparedBuildWardrobeFlow | null {
  if (!args || !args.App) throw new Error('[WardrobePro] buildWardrobeFlow requires args.App');

  const { App, builderDeps, stateOrOverride } = args;
  const label = args.label || 'native/builder/build_wardrobe_flow';
  const deps = resolveBuilderDepsOrThrow({ App, builderDeps, label });
  const buildState = resolveBuildStateOrThrow({ App, stateOrOverride });
  const { ui, runtime, globalClickMode, cfgSnapshot } = buildState;

  resetInternalGridMaps(App);

  resetEdgeHandleDefaultNoneCacheMaps(App);

  if (!globalClickMode) {
    captureLocalOpenStateBeforeBuild(App, { includeDrawers: true });
  }

  const handleControlEnabled = !!ui.handleControl;
  const showHangerEnabled = !!ui.showHanger;
  const showContentsEnabled = !!ui.showContents;
  __builderGuardStrict(App, 'builderService.buildUiSnapshot', () => {
    const builder = ensureBuilderService(App, 'native/builder/build_wardrobe_flow');
    builder.buildUi = Object.assign({}, ui || {}, {
      handleControl: handleControlEnabled,
      showHanger: showHangerEnabled,
      showContents: showContentsEnabled,
    });
  });

  const dims = sanitizeBuildDimsAndSyncRuntime({ App, ui, cfg: cfgSnapshot });
  if (dims && dims.skipBuild) return null;

  return {
    App,
    label,
    deps,
    buildState,
    widthCm: dims.widthCm,
    heightCm: dims.heightCm,
    depthCm: dims.depthCm,
    doorsCount: dims.doorsCount,
    chestDrawersCount: dims.chestDrawersCount,
    sketchMode: !!runtime.sketchMode,
  };
}
