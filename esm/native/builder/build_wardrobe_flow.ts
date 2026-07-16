import { prepareBuildWardrobeFlow, type BuildWardrobeFlowArgs } from './build_wardrobe_flow_prepare.js';
import { executeBuildWardrobeFlow } from './build_wardrobe_flow_execute.js';
import { runPreparedBuildWardrobeFlow } from './build_wardrobe_flow_runtime.js';

import type { BuildContextLike } from '../../../types';

export type { BuildWardrobeFlowArgs } from './build_wardrobe_flow_prepare.js';

export function buildWardrobeFlow(
  args: BuildWardrobeFlowArgs | null | undefined
): BuildContextLike | null | undefined {
  const prepared = prepareBuildWardrobeFlow(args);
  if (!prepared) return;
  return runPreparedBuildWardrobeFlow(prepared, { execute: executeBuildWardrobeFlow });
}
