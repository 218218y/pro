import type { KernelStateKernelConfigHelpers } from './kernel_state_kernel_config_shared.js';

import { createKernelStateKernelConfigMapsTools } from './kernel_state_kernel_config_maps_shared.js';
import { installKernelStateKernelConfigCaptureSurface } from './kernel_state_kernel_config_maps_capture.js';
import { installKernelStateKernelConfigApplySurface } from './kernel_state_kernel_config_maps_apply.js';
import { installKernelStateKernelConfigPatchSurface } from './kernel_state_kernel_config_maps_patch.js';

export function installKernelStateKernelConfigMapsSurface(helpers: KernelStateKernelConfigHelpers): void {
  const tools = createKernelStateKernelConfigMapsTools(helpers);
  installKernelStateKernelConfigCaptureSurface(helpers, tools);
  installKernelStateKernelConfigApplySurface(helpers, tools);
  installKernelStateKernelConfigPatchSurface(helpers, tools);
}
