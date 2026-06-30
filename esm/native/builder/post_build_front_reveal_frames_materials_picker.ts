// Front reveal frame adaptive material picker helpers (Pure ESM)
//
// Owns front-panel candidate traversal/scoring and adaptive reveal-line material selection.

import type { Object3DLike, ThreeLike } from '../../../types/index.js';

import {
  getGeometry,
  hasMultiplyMatrices,
  isRecord,
  readKey,
  type LineMaterialLike,
  type ValueRecord,
} from './post_build_extras_shared.js';
import { readGeometryRuntimeNumber } from './geometry_runtime_contracts.js';
import { analyzeFrontColor, lumaFromHex } from './post_build_front_reveal_frames_materials_shared.js';

export type FrontRevealMaterialPicker = {
  pickRevealLineMaterial: (root: Object3DLike | null) => LineMaterialLike | null;
};

export type CreateFrontRevealMaterialPickerArgs = {
  THREE: ThreeLike;
  baseLineMaterial: LineMaterialLike;
  ensureAdaptiveRevealLineMaterial: (darkness: number) => LineMaterialLike;
  sampleTextureToneHex: (tex: ValueRecord | null) => number | null;
};

export function createFrontRevealMaterialPicker(
  args: CreateFrontRevealMaterialPickerArgs
): FrontRevealMaterialPicker {
  const { THREE, baseLineMaterial, ensureAdaptiveRevealLineMaterial, sampleTextureToneHex } = args;

  const PREFERRED_REVEAL_ROLES = new Set([
    'door_flat_center_panel',
    'door_profile_center_panel',
    'door_double_profile_center_panel',
    'door_glass_center_panel',
    'door_mirror_center_panel',
  ]);

  function readPreferredRevealHex(
    root: Object3DLike | null,
    sampleTextureToneHex: (tex: ValueRecord | null) => number | null
  ): number | null {
    if (!root) return null;

    const rootRec = root as Object3DLike & ValueRecord;
    const rootUd = toValueRecord(rootRec.userData);
    if (rootUd && PREFERRED_REVEAL_ROLES.has(String(rootUd.__doorVisualRole || ''))) {
      const rootHex = pickMaterialHex(
        Array.isArray(rootRec.material) ? rootRec.material : [rootRec.material],
        sampleTextureToneHex
      );
      if (rootHex != null) return rootHex;
    }

    const queue: Array<Object3DLike & ValueRecord> = [];
    const children = Array.isArray(rootRec.children) ? rootRec.children : [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as Object3DLike & ValueRecord;
      if (child && typeof child === 'object') queue.push(child);
    }

    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      const currentUd = toValueRecord(current.userData);
      if (currentUd && PREFERRED_REVEAL_ROLES.has(String(currentUd.__doorVisualRole || ''))) {
        const directHex = pickMaterialHex(
          Array.isArray(current.material) ? current.material : [current.material],
          sampleTextureToneHex
        );
        if (directHex != null) return directHex;
      }
      const currentChildren = Array.isArray(current.children) ? current.children : [];
      for (let i = 0; i < currentChildren.length; i++) {
        const child = currentChildren[i] as Object3DLike & ValueRecord;
        if (child && typeof child === 'object') queue.push(child);
      }
    }

    return null;
  }

  const pickRevealLineMaterial = (root: Object3DLike | null): LineMaterialLike | null => {
    if (!root) return baseLineMaterial;
    try {
      const preferredHex = readPreferredRevealHex(root, sampleTextureToneHex);
      if (preferredHex != null) {
        const metrics = analyzeFrontColor(preferredHex);
        return ensureAdaptiveRevealLineMaterial(metrics.darkness);
      }

      if (typeof root.updateMatrixWorld === 'function') root.updateMatrixWorld(true);
      const inv: { copy: (matrix: unknown) => { invert: () => unknown }; invert: () => unknown } =
        new THREE.Matrix4();
      inv.copy(root.matrixWorld).invert();

      if (typeof root.traverse !== 'function') return baseLineMaterial;

      const candidates: Array<{
        hex: number;
        area: number;
        zDepth: number;
        frontness: number;
        thin: boolean;
      }> = [];

      root.traverse((obj: Object3DLike & ValueRecord) => {
        const geom = getGeometry(obj);
        if (!geom || !obj || !obj.material) return;
        if (!geom.boundingBox && typeof geom.computeBoundingBox === 'function') geom.computeBoundingBox();
        if (!geom.boundingBox) return;

        const m = new THREE.Matrix4();
        if (!hasMultiplyMatrices(m)) return;
        m.multiplyMatrices(inv, obj.matrixWorld);
        const bb = geom.boundingBox.clone();
        bb.applyMatrix4(m);

        const size = new THREE.Vector3();
        bb.getSize(size);
        const sizeX = readGeometryRuntimeNumber(size.x);
        const sizeY = readGeometryRuntimeNumber(size.y);
        const sizeZ = readGeometryRuntimeNumber(size.z);
        const minZ = readGeometryRuntimeNumber(bb.min && bb.min.z);
        const maxZ = readGeometryRuntimeNumber(bb.max && bb.max.z);
        if (sizeX == null || sizeY == null || sizeZ == null || minZ == null || maxZ == null) return;

        const area = Math.max(0, sizeX) * Math.max(0, sizeY);
        if (!(area > 1e-4)) return;

        const zDepth = Math.max(0, sizeZ);
        const frontness = Math.max(Math.abs(minZ), Math.abs(maxZ));
        const thin = zDepth <= Math.max(0.03, Math.min(sizeX, sizeY) * 0.45);

        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        const hex = pickMaterialHex(mats, sampleTextureToneHex);
        if (hex == null) return;

        candidates.push({ hex, area, zDepth, frontness, thin });
      });

      if (!candidates.length) return baseLineMaterial;

      let thinPool = candidates.filter(candidate => candidate.thin);
      if (!thinPool.length) thinPool = candidates.slice();

      let maxArea = 0;
      for (let i = 0; i < thinPool.length; i++) {
        if (thinPool[i].area > maxArea) maxArea = thinPool[i].area;
      }
      let pool = thinPool.filter(candidate => candidate.area >= maxArea * 0.35);
      if (!pool.length) pool = thinPool;

      let maxFrontness = 0;
      for (let i = 0; i < pool.length; i++) {
        if (pool[i].frontness > maxFrontness) maxFrontness = pool[i].frontness;
      }
      const frontTol = 0.025;
      const frontPool = pool.filter(candidate => candidate.frontness >= maxFrontness - frontTol);
      if (frontPool.length) pool = frontPool;

      pool.sort((a, b) => {
        if (b.area !== a.area) return b.area - a.area;
        if (a.zDepth !== b.zDepth) return a.zDepth - b.zDepth;
        return b.frontness - a.frontness;
      });

      const bestHex = pool[0]?.hex;
      if (bestHex == null) return baseLineMaterial;

      const metrics = analyzeFrontColor(bestHex);
      return ensureAdaptiveRevealLineMaterial(metrics.darkness);
    } catch (_error) {
      return baseLineMaterial;
    }
  };

  return { pickRevealLineMaterial };
}

function pickMaterialHex(
  mats: unknown[],
  sampleTextureToneHex: (tex: ValueRecord | null) => number | null
): number | null {
  for (let j = 0; j < mats.length; j++) {
    const mm = toValueRecord(mats[j]);
    if (!mm) continue;

    let directHex: number | null = null;
    try {
      const color = toValueRecord(readKey(mm, 'color'));
      if (color && typeof color.getHex === 'function') {
        const rawHex = color.getHex();
        directHex = typeof rawHex === 'number' && Number.isFinite(rawHex) ? rawHex : null;
      } else if (color && typeof color.getHexString === 'function') {
        const sHex = String(color.getHexString()).trim();
        if (/^[0-9a-fA-F]{1,6}$/.test(sHex)) {
          const n = Number.parseInt(sHex, 16);
          if (Number.isFinite(n)) directHex = n;
        }
      }
    } catch (_error) {
      directHex = null;
    }

    const mapRecord = toValueRecord(readKey(mm, 'map'));
    const texHex = mapRecord ? sampleTextureToneHex(mapRecord) : null;
    const shouldPreferTexture = texHex != null && (directHex == null || lumaFromHex(directHex) >= 0.9);
    const chosenHex = shouldPreferTexture ? texHex : directHex != null ? directHex : texHex;
    if (chosenHex != null) return chosenHex;
  }
  return null;
}

function toValueRecord(value: unknown): ValueRecord | null {
  return isRecord(value) ? (value as ValueRecord) : null;
}
