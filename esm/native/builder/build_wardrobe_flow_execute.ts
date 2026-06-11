import { prepareBuildWardrobeExecution } from './build_wardrobe_flow_context.js';
import {
  completePreparedBuildWardrobeExecution,
  runPreparedBuildWardrobePlan,
} from './build_wardrobe_flow_execute_runtime.js';

import type { BuildContextLike } from '../../../types';
import type { PreparedBuildWardrobeFlow } from './build_wardrobe_flow_prepare.js';

export function executeBuildWardrobeFlow(prepared: PreparedBuildWardrobeFlow): BuildContextLike | null {
  const execution = prepareBuildWardrobeExecution(prepared);
  if (!execution) return null;

  runPreparedBuildWardrobePlan(prepared, execution);
  return completePreparedBuildWardrobeExecution(prepared, execution);
}
