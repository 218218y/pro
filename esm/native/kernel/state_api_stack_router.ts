import type { StateApiStackRouterContext } from './state_api_stack_router_shared.js';

import { installStateApiStackRouterEnsure } from './state_api_stack_router_ensure.js';
import { installStateApiStackRouterPatch } from './state_api_stack_router_patch.js';

export {
  seedLowerCornerSnapshotForSplit,
  type StateApiStackRouterContext,
} from './state_api_stack_router_shared.js';

export function installStateApiStackRouter(ctx: StateApiStackRouterContext): void {
  installStateApiStackRouterEnsure(ctx);
  installStateApiStackRouterPatch(ctx);
}
