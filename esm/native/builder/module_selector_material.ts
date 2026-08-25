import {
  ensureMaterialsFactoryApp,
  ensureMaterialsRuntime,
  touchMaterialsCacheMeta,
} from './materials_factory_shared.js';

import type { UnknownRecord } from '../../../types';

export type ModuleSelectorMaterialVariant = 'standard' | 'picking-only';

type ModuleSelectorMaterialLike = UnknownRecord & {
  userData?: UnknownRecord | null;
};

const MODULE_SELECTOR_MATERIAL_CACHE_KEYS: Record<ModuleSelectorMaterialVariant, string> = {
  standard: 'module-selector:standard:v1',
  'picking-only': 'module-selector:picking-only:v1',
};

function markModuleSelectorMaterialLifetime(
  material: ModuleSelectorMaterialLike,
  variant: ModuleSelectorMaterialVariant,
  cacheKey: string
): void {
  try {
    const userData = material.userData && typeof material.userData === 'object' ? material.userData : {};
    userData.isCached = true;
    userData.__wpModuleSelectorMaterialVariant = variant;
    userData.__wpModuleSelectorMaterialCacheKey = cacheKey;
    material.userData = userData;
  } catch {
    // render-metadata best-effort: cache ownership must not block selector creation.
  }
}

/**
 * Return the App-owned immutable material used by module-selector hitboxes.
 *
 * Selector meshes are rebuilt frequently, but their render state is stable. Keeping
 * the material in the canonical render material cache prevents scene cleanup from
 * disposing the material (and its WebGL program) between rebuild and first render.
 */
export function getModuleSelectorMaterial<T extends ModuleSelectorMaterialLike>(
  appIn: unknown,
  variant: ModuleSelectorMaterialVariant,
  create: () => T
): T {
  const App = ensureMaterialsFactoryApp(appIn, 'native/builder/module_selector_material');
  const { renderCache, renderMeta } = ensureMaterialsRuntime(App);
  const cacheKey = MODULE_SELECTOR_MATERIAL_CACHE_KEYS[variant];

  let material = renderCache.materialCache.get(cacheKey) as T | undefined;
  if (!material) {
    material = create();
    renderCache.materialCache.set(cacheKey, material);
  }

  markModuleSelectorMaterialLifetime(material, variant, cacheKey);
  touchMaterialsCacheMeta(App, renderMeta.material, cacheKey);
  return material;
}
