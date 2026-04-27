import { prepareBuildWardrobeFlow, type BuildWardrobeFlowArgs } from './build_wardrobe_flow_prepare.js';
import { executeBuildWardrobeFlow } from './build_wardrobe_flow_execute.js';
import { runPreparedBuildWardrobeFlow } from './build_wardrobe_flow_runtime.js';

export type { BuildWardrobeFlowArgs } from './build_wardrobe_flow_prepare.js';

export function buildWardrobeFlow(args: BuildWardrobeFlowArgs | null | undefined): unknown {
  const prepared = prepareBuildWardrobeFlow(args);
  if (!prepared) return;
  return runPreparedBuildWardrobeFlow(prepared, { execute: executeBuildWardrobeFlow });
}
