import { getStandardCabinetTextureKind } from '../../shared/standard_cabinet_textures_shared.js';
import {
  ensureMaterialsFactoryApp,
  ensureMaterialsRuntime,
  getMaterialsTHREE,
  touchMaterialsCacheMeta,
  type AppLike,
  type MaterialLike,
  type TextureLike,
} from './materials_factory_shared.js';
import { generateTexture } from './materials_factory_texture_runtime.js';
import { resolveFrontTexture } from './materials_factory_texture_policy.js';
import type {
  BuilderGetMaterialFactoryFn,
  BuilderGetMaterialFn,
  BuilderMaterialSnapshotLike,
} from '../../../types';

export function requireMaterialSnapshot(value: unknown): BuilderMaterialSnapshotLike {
  if (!value || typeof value !== 'object') {
    throw new TypeError('[materials_factory] materialSnapshot is required');
  }
  const snapshot = value as BuilderMaterialSnapshotLike;
  if (!snapshot.cfgSnapshot || typeof snapshot.cfgSnapshot !== 'object') {
    throw new TypeError('[materials_factory] materialSnapshot.cfgSnapshot is required');
  }
  if (typeof snapshot.sketchMode !== 'boolean') {
    throw new TypeError('[materials_factory] materialSnapshot.sketchMode is required');
  }
  return snapshot;
}

export function createMaterialSnapshotBinding(
  factory: BuilderGetMaterialFactoryFn,
  materialSnapshot: BuilderMaterialSnapshotLike
): BuilderGetMaterialFn {
  const snapshot = requireMaterialSnapshot(materialSnapshot);
  return (color, type, useCustomTexture, customTextureDataURL) =>
    factory(color, type, useCustomTexture, customTextureDataURL, snapshot);
}

function markCachedMaterialLifetime<T>(material: T): T {
  if (!material || typeof material !== 'object') return material;
  const cachedMaterial = material as MaterialLike;
  try {
    const userData =
      cachedMaterial.userData && typeof cachedMaterial.userData === 'object' ? cachedMaterial.userData : {};
    userData.isCached = true;
    cachedMaterial.userData = userData;
  } catch {
    // render-metadata best-effort: cache metadata is secondary to the material instance.
  }
  return material;
}

function getSketchMaterial(App: AppLike, cacheKey: string) {
  const runtime = ensureMaterialsRuntime(App);
  const { renderCache, renderMeta } = runtime;
  const THREE = getMaterialsTHREE(App);
  let material = renderCache.materialCache.get(cacheKey);
  if (!material) {
    material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    renderCache.materialCache.set(cacheKey, material);
  }
  markCachedMaterialLifetime(material);
  touchMaterialsCacheMeta(App, renderMeta.material, cacheKey);
  return material;
}

function resolveMetalColor(color: unknown): string | number {
  return typeof color === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(color) ? color : 0x888888;
}

function createFrontMaterial(
  App: AppLike,
  color: unknown,
  useCustomTexture: unknown,
  tex: TextureLike | null,
  THREE: ReturnType<typeof getMaterialsTHREE>
): MaterialLike {
  if (useCustomTexture && tex) {
    return new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.6 });
  }

  const safeColor = typeof color === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(color) ? color : '#ffffff';
  const textureKind = getStandardCabinetTextureKind(safeColor);
  if (textureKind) {
    const texture = generateTexture(App, safeColor, textureKind);
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texture || null,
      roughness: textureKind === 'melamine' ? 0.55 : 0.7,
      metalness: textureKind === 'melamine' ? 0.03 : 0.05,
    });
  }

  return new THREE.MeshStandardMaterial({
    color: safeColor,
    roughness: 0.45,
    metalness: 0.02,
  });
}

export function getMaterial(
  appIn: unknown,
  color: unknown,
  type: unknown,
  useCustomTexture: unknown,
  customTextureDataURL: unknown,
  materialSnapshot: BuilderMaterialSnapshotLike
) {
  const runtime = ensureMaterialsRuntime(ensureMaterialsFactoryApp(appIn));
  const { App, renderCache, renderMeta } = runtime;
  const THREE = getMaterialsTHREE(App);

  const snapshot = requireMaterialSnapshot(materialSnapshot);
  if (snapshot.sketchMode) return getSketchMaterial(App, 'sketch_white');

  const tex = resolveFrontTexture(App, snapshot, useCustomTexture, customTextureDataURL);
  const texSig = tex && typeof tex.uuid === 'string' ? tex.uuid : '';
  const cacheKey =
    'mat_' + String(type) + '_' + String(color) + '_' + String(!!useCustomTexture) + '_' + texSig;

  const cachedMat = renderCache.materialCache.get(cacheKey);
  if (cachedMat) {
    markCachedMaterialLifetime(cachedMat);
    touchMaterialsCacheMeta(App, renderMeta.material, cacheKey);
    return cachedMat;
  }

  let newMat: MaterialLike;
  if (type === 'body') {
    newMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  } else if (type === 'metal') {
    newMat = new THREE.MeshStandardMaterial({
      color: resolveMetalColor(color),
      metalness: 0.8,
      roughness: 0.2,
    });
  } else if (type === 'front') {
    newMat = createFrontMaterial(App, color, useCustomTexture, tex, THREE);
  } else {
    newMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  }

  markCachedMaterialLifetime(newMat);

  touchMaterialsCacheMeta(App, renderMeta.material, cacheKey);
  renderCache.materialCache.set(cacheKey, newMat);
  return newMat;
}
