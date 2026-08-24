// Native ESM version of THREE group cleanup.
//
// Pure ESM: no install-on-import side effects.
// Use installThreeCleanup(app) to attach helpers onto the provided app container.

import { ensurePlatformUtil } from '../runtime/platform_access.js';

type UnknownRecord = Record<string, unknown>;

type DisposableLike = { dispose?: () => void };
type TextureLike = DisposableLike & UnknownRecord;
type MaterialUserData = UnknownRecord & { isCached?: boolean };
type MaterialLike = DisposableLike &
  UnknownRecord & {
    userData?: MaterialUserData;
  };

type GeometryLike = DisposableLike &
  UnknownRecord & {
    userData?: MaterialUserData;
  };

type Object3DLike = UnknownRecord & {
  children?: unknown[];
  geometry?: GeometryLike | null;
  material?: MaterialLike | MaterialLike[] | null;
  userData?: MaterialUserData;
};

type GroupLike = Object3DLike & {
  children: unknown[];
  remove?: (child: Object3DLike) => void;
};

export type CleanGroupDiagnostics = {
  materialReferences: number;
  materialsDisposed: number;
  uniqueMaterialsDisposed: number;
  cachedMaterialSkips: number;
  duplicateMaterialDisposeAttempts: number;
  geometryReferences: number;
  geometriesDisposed: number;
  uniqueGeometriesDisposed: number;
  cachedGeometrySkips: number;
  duplicateGeometryDisposeAttempts: number;
  textureReferences: number;
  texturesDisposed: number;
  uniqueTexturesDisposed: number;
  duplicateTextureDisposeAttempts: number;
  persistentCacheMaterialsDisposed: Record<string, number>;
  persistentCacheMaterialsReusedAfterDispose: Record<string, number>;
  persistentCacheHits: Record<string, number>;
};

type CleanGroupDiagnosticsContext = CleanGroupDiagnostics & {
  disposedMaterials: Set<MaterialLike>;
  disposedGeometries: Set<GeometryLike>;
  disposedTextures: Set<TextureLike>;
  persistentMaterialsObserved: Set<MaterialLike>;
};

type CleanGroupOptions = {
  getCustomTexture?: () => TextureLike | null;
  onDiagnostics?: (diagnostics: CleanGroupDiagnostics) => void;
} & UnknownRecord;

const TEXTURE_TYPES: readonly string[] = [
  'map',
  'lightMap',
  'bumpMap',
  'normalMap',
  'specularMap',
  'envMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'displacementMap',
];

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readObject3DLike(value: unknown): Object3DLike | null {
  return readRecord(value);
}

function readGroupLike(value: unknown): GroupLike | null {
  const rec = readRecord(value);
  if (!rec || !Array.isArray(rec.children)) return null;
  const remove = typeof rec.remove === 'function' ? rec.remove : null;
  return remove
    ? {
        ...rec,
        children: rec.children,
        remove: (child: Object3DLike) => Reflect.apply(remove, value, [child]),
      }
    : { ...rec, children: rec.children };
}

function isCachedResource(value: unknown): boolean {
  return readRecord(readObject3DLike(value)?.userData)?.isCached === true;
}

function createDiagnosticsContext(): CleanGroupDiagnosticsContext {
  return {
    materialReferences: 0,
    materialsDisposed: 0,
    uniqueMaterialsDisposed: 0,
    cachedMaterialSkips: 0,
    duplicateMaterialDisposeAttempts: 0,
    geometryReferences: 0,
    geometriesDisposed: 0,
    uniqueGeometriesDisposed: 0,
    cachedGeometrySkips: 0,
    duplicateGeometryDisposeAttempts: 0,
    textureReferences: 0,
    texturesDisposed: 0,
    uniqueTexturesDisposed: 0,
    duplicateTextureDisposeAttempts: 0,
    persistentCacheMaterialsDisposed: {},
    persistentCacheMaterialsReusedAfterDispose: {},
    persistentCacheHits: {},
    disposedMaterials: new Set(),
    disposedGeometries: new Set(),
    disposedTextures: new Set(),
    persistentMaterialsObserved: new Set(),
  };
}

function incrementOwnerCount(target: Record<string, number>, owner: unknown): void {
  if (typeof owner !== 'string' || !owner.trim()) return;
  const key = owner.trim();
  target[key] = (target[key] || 0) + 1;
}

function markPerfDisposedMaterial(material: MaterialLike, context: CleanGroupDiagnosticsContext): void {
  if (typeof __WP_BUILD_PERF__ === 'undefined' || __WP_BUILD_PERF__ !== true) return;
  const userData = readRecord(material.userData) || {};
  const owner = userData.__wpPerfPersistentCacheOwner;
  incrementOwnerCount(context.persistentCacheMaterialsDisposed, owner);
  const reuseCount = Number(userData.__wpPerfReturnedAfterDisposeCount) || 0;
  const observedReuseCount = Number(userData.__wpPerfObservedReturnedAfterDisposeCount) || 0;
  const newReuseCount = Math.max(0, reuseCount - observedReuseCount);
  if (newReuseCount > 0 && typeof owner === 'string' && owner.trim()) {
    context.persistentCacheMaterialsReusedAfterDispose[owner.trim()] =
      (context.persistentCacheMaterialsReusedAfterDispose[owner.trim()] || 0) + newReuseCount;
  }
  userData.__wpPerfObservedReturnedAfterDisposeCount = reuseCount;
  userData.__wpPerfDisposedByCleanGroup = true;
  material.userData = userData;
}

function observePerfPersistentMaterial(material: MaterialLike, context: CleanGroupDiagnosticsContext): void {
  if (context.persistentMaterialsObserved.has(material)) return;
  context.persistentMaterialsObserved.add(material);
  const userData = readRecord(material.userData);
  const owner = userData?.__wpPerfPersistentCacheOwner;
  const hitCount = Number(userData?.__wpPerfPersistentCacheHitCount) || 0;
  const observedHitCount = Number(userData?.__wpPerfObservedPersistentCacheHitCount) || 0;
  const newHitCount = Math.max(0, hitCount - observedHitCount);
  if (newHitCount > 0 && typeof owner === 'string' && owner.trim()) {
    context.persistentCacheHits[owner.trim()] =
      (context.persistentCacheHits[owner.trim()] || 0) + newHitCount;
  }
  if (userData) userData.__wpPerfObservedPersistentCacheHitCount = hitCount;
}

function publishDiagnostics(context: CleanGroupDiagnosticsContext, options?: CleanGroupOptions): void {
  if (typeof options?.onDiagnostics !== 'function') return;
  options.onDiagnostics({
    materialReferences: context.materialReferences,
    materialsDisposed: context.materialsDisposed,
    uniqueMaterialsDisposed: context.disposedMaterials.size,
    cachedMaterialSkips: context.cachedMaterialSkips,
    duplicateMaterialDisposeAttempts: context.duplicateMaterialDisposeAttempts,
    geometryReferences: context.geometryReferences,
    geometriesDisposed: context.geometriesDisposed,
    uniqueGeometriesDisposed: context.disposedGeometries.size,
    cachedGeometrySkips: context.cachedGeometrySkips,
    duplicateGeometryDisposeAttempts: context.duplicateGeometryDisposeAttempts,
    textureReferences: context.textureReferences,
    texturesDisposed: context.texturesDisposed,
    uniqueTexturesDisposed: context.disposedTextures.size,
    duplicateTextureDisposeAttempts: context.duplicateTextureDisposeAttempts,
    persistentCacheMaterialsDisposed: { ...context.persistentCacheMaterialsDisposed },
    persistentCacheMaterialsReusedAfterDispose: {
      ...context.persistentCacheMaterialsReusedAfterDispose,
    },
    persistentCacheHits: { ...context.persistentCacheHits },
  });
}

function readTextureLike(value: unknown): TextureLike | null {
  return readRecord(value);
}

function readMaterialLike(value: unknown): MaterialLike | null {
  return readRecord(value);
}

function readMaterialList(value: unknown): MaterialLike[] {
  if (Array.isArray(value)) {
    const out: MaterialLike[] = [];
    for (let i = 0; i < value.length; i++) {
      const material = readMaterialLike(value[i]);
      if (material) out.push(material);
    }
    return out;
  }
  const material = readMaterialLike(value);
  return material ? [material] : [];
}

function readObjectChildren(value: unknown): Object3DLike[] {
  const children = readObject3DLike(value)?.children;
  if (!Array.isArray(children) || children.length === 0) return [];
  const out: Object3DLike[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = readObject3DLike(children[i]);
    if (child) out.push(child);
  }
  return out;
}

function disposeGeometry(geometry: unknown, context: CleanGroupDiagnosticsContext | null): void {
  const geo = readRecord(geometry);
  if (!geo) return;
  if (context) context.geometryReferences += 1;
  if (isCachedResource(geo)) {
    if (context) context.cachedGeometrySkips += 1;
    return;
  }
  if (typeof geo.dispose !== 'function') return;
  if (context) {
    if (context.disposedGeometries.has(geo)) context.duplicateGeometryDisposeAttempts += 1;
    else context.disposedGeometries.add(geo);
    context.geometriesDisposed += 1;
  }
  try {
    geo.dispose();
  } catch {
    // resource-disposal-best-effort: third-party geometry disposal may reject during cleanup.
  }
}

function disposeMaterialTextures(
  material: MaterialLike,
  customTexture: TextureLike | null,
  context: CleanGroupDiagnosticsContext | null
): void {
  for (const textureType of TEXTURE_TYPES) {
    const texture = readTextureLike(material[textureType]);
    if (!texture || texture === customTexture || typeof texture.dispose !== 'function') continue;
    if (context) {
      context.textureReferences += 1;
      if (context.disposedTextures.has(texture)) context.duplicateTextureDisposeAttempts += 1;
      else context.disposedTextures.add(texture);
      context.texturesDisposed += 1;
    }
    try {
      texture.dispose();
    } catch {
      // resource-disposal-best-effort: third-party texture disposal may reject during cleanup.
    }
  }
}

function disposeMaterial(
  material: MaterialLike,
  customTexture: TextureLike | null,
  context: CleanGroupDiagnosticsContext | null
): void {
  if (context) context.materialReferences += 1;
  if (context) observePerfPersistentMaterial(material, context);
  if (isCachedResource(material)) {
    if (context) context.cachedMaterialSkips += 1;
    return;
  }
  disposeMaterialTextures(material, customTexture, context);
  if (typeof material.dispose !== 'function') return;
  if (context) {
    const duplicateDispose = context.disposedMaterials.has(material);
    if (duplicateDispose) context.duplicateMaterialDisposeAttempts += 1;
    else context.disposedMaterials.add(material);
    context.materialsDisposed += 1;
    if (!duplicateDispose) markPerfDisposedMaterial(material, context);
  }
  try {
    material.dispose();
  } catch {
    // resource-disposal-best-effort: third-party material disposal may reject during cleanup.
  }
}

function disposeNodeResources(
  node: Object3DLike,
  customTexture: TextureLike | null,
  context: CleanGroupDiagnosticsContext | null
): void {
  disposeGeometry(node.geometry, context);
  const materials = readMaterialList(node.material);
  for (const material of materials) {
    disposeMaterial(material, customTexture, context);
  }
}

function removeChild(root: GroupLike, child: Object3DLike): void {
  if (typeof root.remove !== 'function') return;
  try {
    root.remove(child);
  } catch {
    // scene-cleanup-best-effort: detached or foreign scene nodes may reject removal.
  }
}

function assertApp(app: unknown): void {
  if (!app || typeof app !== 'object') {
    throw new Error('[WardrobePro][ESM] installThreeCleanup(app) requires an app object');
  }
}

/**
 * Dispose all non-cached geometries/materials/textures inside a THREE.Group recursively,
 * then remove children from the group.
 */
function cleanGroupRecursive(
  root: GroupLike,
  customTexture: TextureLike | null,
  context: CleanGroupDiagnosticsContext | null
): void {
  for (let i = root.children.length - 1; i >= 0; i--) {
    const child = readObject3DLike(root.children[i]);
    if (!child) continue;

    const childGroup = readGroupLike(child);
    if (childGroup && readObjectChildren(childGroup).length > 0) {
      cleanGroupRecursive(childGroup, customTexture, context);
    }

    disposeNodeResources(child, customTexture, context);
    removeChild(root, child);
  }
}

export function cleanGroup(group: unknown, options?: CleanGroupOptions): void {
  const root = readGroupLike(group);
  if (!root) return;

  const customTexture = typeof options?.getCustomTexture === 'function' ? options.getCustomTexture() : null;
  const context = typeof options?.onDiagnostics === 'function' ? createDiagnosticsContext() : null;
  cleanGroupRecursive(root, customTexture, context);
  if (context) publishDiagnostics(context, options);
}

/**
 * Install cleanup helpers onto the app container.
 *
 * Canonical surface:
 * - app.platform.util.cleanGroup(group)
 */
export function installThreeCleanup(app: unknown): void {
  assertApp(app);
  const util = ensurePlatformUtil(app);
  if (util.cleanGroup !== cleanGroup) {
    util.cleanGroup = cleanGroup as NonNullable<typeof util.cleanGroup>;
  }
}
