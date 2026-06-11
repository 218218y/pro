// Canonical kernel state-kernel config/module/corner surface installer.
//
// Why this exists:
// - kernel.ts should remain the owner entrypoint for installKernel()
// - config-map semantics and module/corner patching are still canonical,
//   but they now live behind focused installers instead of one 1000+ line owner

import {
  createKernelStateKernelConfigHelpers,
  type KernelStateKernelConfigContext,
} from './kernel_state_kernel_config_shared.js';
import { installKernelStateKernelConfigMapsSurface } from './kernel_state_kernel_config_maps.js';
import { installKernelStateKernelConfigModulesCornerSurface } from './kernel_state_kernel_config_modules_corner.js';

export type { KernelStateKernelConfigContext } from './kernel_state_kernel_config_shared.js';

export function installKernelStateKernelConfigSurface(ctx: KernelStateKernelConfigContext): void {
  const helpers = createKernelStateKernelConfigHelpers(ctx);
  installKernelStateKernelConfigMapsSurface(helpers);
  installKernelStateKernelConfigModulesCornerSurface(helpers);
}
