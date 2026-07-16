import { resolveBuilderDepsOrThrow } from './builder_deps_resolver.js';
import { bindDoorVisualRenderPolicy } from './door_visual_render_policy.js';

import type {
  AppContainer,
  BuilderContentsRenderPolicy,
  BuilderCreateDoorVisualFn,
  BuilderDepsRootLike,
  BuilderOutlineFn,
  BuildStateResolvedLike,
} from '../../../types';
import type { BuildFlowOrchestrationContext } from './build_flow_orchestration.js';

export type BuildWardrobeFlowArgs = {
  App: AppContainer;
  builderDeps: BuilderDepsRootLike;
  orchestration: BuildFlowOrchestrationContext;
  stateOrOverride: unknown;
  label?: string;
};

type PreparedBuildRenderPolicy = BuilderContentsRenderPolicy &
  Readonly<{
    addOutlines: BuilderOutlineFn;
  }>;

export type PreparedBuildWardrobeFlow = {
  App: AppContainer;
  orchestration: BuildFlowOrchestrationContext;
  label: string;
  deps: ReturnType<typeof resolveBuilderDepsOrThrow>;
  buildState: BuildStateResolvedLike;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  chestDrawersCount: number;
  sketchMode: boolean;
  renderPolicy: PreparedBuildRenderPolicy;
  createDoorVisual: BuilderCreateDoorVisualFn;
};

export function prepareBuildWardrobeFlow(
  args: BuildWardrobeFlowArgs | null | undefined
): PreparedBuildWardrobeFlow | null {
  if (!args || !args.App) throw new Error('[WardrobePro] buildWardrobeFlow requires args.App');

  const { App, builderDeps, orchestration, stateOrOverride } = args;
  if (!orchestration) {
    throw new Error('[WardrobePro] buildWardrobeFlow requires an orchestration context');
  }
  const label = args.label || 'native/builder/build_wardrobe_flow';
  const deps = resolveBuilderDepsOrThrow({ App, builderDeps, label });
  const buildState = orchestration.resolveState(stateOrOverride);
  const { ui, runtime, cfgSnapshot } = buildState;

  orchestration.resetCaches();
  orchestration.captureOpenState();
  orchestration.publishBuildUi(ui);

  const dims = orchestration.sanitizeDimensions(ui, cfgSnapshot);
  if (dims && dims.skipBuild) return null;

  const sketchMode = !!runtime.sketchMode;
  const addOutlines = deps.createOutlineBinding({ sketchMode });
  if (typeof addOutlines !== 'function') {
    throw new Error('[WardrobePro] materials.createOutlineBinding must return an outline function');
  }
  const renderPolicy: PreparedBuildRenderPolicy = Object.freeze({ sketchMode, addOutlines });

  return {
    App,
    orchestration,
    label,
    deps,
    buildState,
    widthCm: dims.widthCm,
    heightCm: dims.heightCm,
    depthCm: dims.depthCm,
    doorsCount: dims.doorsCount,
    chestDrawersCount: dims.chestDrawersCount,
    sketchMode,
    renderPolicy,
    createDoorVisual: bindDoorVisualRenderPolicy(deps.createDoorVisual, renderPolicy),
  };
}
