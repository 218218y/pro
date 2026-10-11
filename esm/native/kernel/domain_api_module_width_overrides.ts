import { stripWidthOverridesFromConfig } from '../features/special_dims/index.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';

/**
 * A change to the physical cell topology (or a return to automatic width)
 * invalidates per-cell width overrides. Keep the rest of each module's
 * authoring data intact and preserve the input array.
 */
export function stripModuleWidthOverrides<T extends Record<string, unknown>>(modules: readonly T[]): T[] {
  return modules.map(module => stripWidthOverridesFromConfig(module) as T);
}

/** Read the canonical top-module list and remove overrides as one domain operation. */
export function readModulesWithoutWidthOverrides(config: unknown): Record<string, unknown>[] {
  return stripModuleWidthOverrides(
    readModulesConfigurationListFromConfigSnapshot(config, 'modulesConfiguration')
  );
}
