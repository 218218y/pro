import type { KernelStateKernelConfigHelpers } from './kernel_state_kernel_config_shared.js';
import type { KernelStateKernelConfigMapsTools } from './kernel_state_kernel_config_maps_shared.js';

import { installKernelStateKernelConfigPatchSurfaceRuntime } from './kernel_state_kernel_config_maps_patch_ops.js';

export function installKernelStateKernelConfigPatchSurface(
  helpers: KernelStateKernelConfigHelpers,
  tools: KernelStateKernelConfigMapsTools
): void {
  installKernelStateKernelConfigPatchSurfaceRuntime(helpers, tools);
}
