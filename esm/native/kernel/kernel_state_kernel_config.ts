// Canonical kernel state-kernel config snapshot/map surface installer.
//
// Why this exists:
// - kernel.ts should remain the owner entrypoint for installKernel()
// - config snapshot/map semantics remain on the state-kernel service
// - stack-aware module/corner ensure and patch ownership lives exclusively in state_api_stack_router

import {
  createKernelStateKernelConfigHelpers,
  type KernelStateKernelConfigContext,
} from './kernel_state_kernel_config_shared.js';
import { installKernelStateKernelConfigMapsSurface } from './kernel_state_kernel_config_maps.js';

export type { KernelStateKernelConfigContext } from './kernel_state_kernel_config_shared.js';

export function installKernelStateKernelConfigSurface(ctx: KernelStateKernelConfigContext): void {
  const helpers = createKernelStateKernelConfigHelpers(ctx);
  installKernelStateKernelConfigMapsSurface(helpers);
}
