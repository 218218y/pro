import type { KernelStateKernelConfigHelpers } from './kernel_state_kernel_config_shared.js';
import { installKernelStateKernelConfigModulesCornerEnsureSurface } from './kernel_state_kernel_config_modules_corner_ensure.js';
import { installKernelStateKernelConfigModulesCornerPatchSurface } from './kernel_state_kernel_config_modules_corner_patch.js';

export function installKernelStateKernelConfigModulesCornerSurface(
  helpers: KernelStateKernelConfigHelpers
): void {
  installKernelStateKernelConfigModulesCornerEnsureSurface(helpers);
  installKernelStateKernelConfigModulesCornerPatchSurface(helpers);
}
