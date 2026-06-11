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

type CleanGroupOptions = {
  getCustomTexture?: () => TextureLike | null;
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

function disposeGeometry(geometry: unknown): void {
  const geo = readRecord(geometry);
  if (!geo || isCachedResource(geo) || typeof geo.dispose !== 'function') return;
  try {
    geo.dispose();
  } catch {
    // ignore
  }
}

function disposeMaterialTextures(material: MaterialLike, customTexture: TextureLike | null): void {
  for (let i = 0; i < TEXTURE_TYPES.length; i++) {
    const texture = readTextureLike(material[TEXTURE_TYPES[i]]);
    if (!texture || texture === customTexture || typeof texture.dispose !== 'function') continue;
    try {
      texture.dispose();
    } catch {
      // ignore
    }
  }
}

function disposeMaterial(material: MaterialLike, customTexture: TextureLike | null): void {
  if (isCachedResource(material)) return;
  disposeMaterialTextures(material, customTexture);
  if (typeof material.dispose !== 'function') return;
  try {
    material.dispose();
  } catch {
    // ignore
  }
}

function disposeNodeResources(node: Object3DLike, customTexture: TextureLike | null): void {
  disposeGeometry(node.geometry);
  const materials = readMaterialList(node.material);
  for (let i = 0; i < materials.length; i++) {
    disposeMaterial(materials[i], customTexture);
  }
}

function removeChild(root: GroupLike, child: Object3DLike): void {
  if (typeof root.remove !== 'function') return;
  try {
    root.remove(child);
  } catch {
    // ignore
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
export function cleanGroup(group: unknown, options?: CleanGroupOptions): void {
  const root = readGroupLike(group);
  if (!root) return;

  const customTexture = typeof options?.getCustomTexture === 'function' ? options.getCustomTexture() : null;

  for (let i = root.children.length - 1; i >= 0; i--) {
    const child = readObject3DLike(root.children[i]);
    if (!child) continue;

    const childGroup = readGroupLike(child);
    if (childGroup && readObjectChildren(childGroup).length > 0) {
      cleanGroup(childGroup, options);
    }

    disposeNodeResources(child, customTexture);
    removeChild(root, child);
  }
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
    util.cleanGroup = cleanGroup;
  }
}
