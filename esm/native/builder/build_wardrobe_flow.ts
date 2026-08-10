import { prepareBuildWardrobeFlow, type BuildWardrobeFlowArgs } from './build_wardrobe_flow_prepare.js';
import { executeBuildWardrobeFlow } from './build_wardrobe_flow_execute.js';
import { runPreparedBuildWardrobeFlow } from './build_wardrobe_flow_runtime.js';
import { notifyStackSplitFrameTopologyTransition } from './stack_split_frame_feedback.js';

import type { BuildContextLike } from '../../../types';

export type { BuildWardrobeFlowArgs } from './build_wardrobe_flow_prepare.js';

export function buildWardrobeFlow(
  args: BuildWardrobeFlowArgs | null | undefined
): BuildContextLike | null | undefined {
  const prepared = prepareBuildWardrobeFlow(args);
  if (!prepared) return;
  const buildCtx = runPreparedBuildWardrobeFlow(prepared, { execute: executeBuildWardrobeFlow });
  if (buildCtx) {
    notifyStackSplitFrameTopologyTransition({
      App: prepared.App,
      stackSplitActive: !!buildCtx.flags?.stackSplitActive,
      stackSplitUnifiedFrame: !!buildCtx.flags?.stackSplitUnifiedFrame,
      removablePartInteractionActive: !!buildCtx.resolvers?.isRemoveDoorMode,
      showToast: prepared.deps.showToast,
    });
  }
  return buildCtx;
}
