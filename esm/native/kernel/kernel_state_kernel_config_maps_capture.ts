import { getCfg } from './store_access.js';
import type { KernelStateKernelConfigHelpers } from './kernel_state_kernel_config_shared.js';
import type { KernelStateKernelConfigMapsTools } from './kernel_state_kernel_config_maps_shared.js';

export function installKernelStateKernelConfigCaptureSurface(
  helpers: KernelStateKernelConfigHelpers,
  tools: KernelStateKernelConfigMapsTools
): void {
  const { __sk, asRecord } = helpers;

  __sk.__captureConfigFromObject = function (obj: unknown) {
    return tools.captureConfigFromObject(obj);
  };

  __sk.captureConfig = function () {
    const cfg = getCfg(helpers.App);
    return __sk && typeof __sk.__captureConfigFromObject === 'function'
      ? __sk.__captureConfigFromObject(cfg || {})
      : asRecord(cfg, {});
  };
}
