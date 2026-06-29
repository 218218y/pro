import type { AppContainer } from '../../../types';

import type {
  InteriorGroupLike,
  InteriorMeshLike,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';

import type { RenderInteriorSketchInput } from './render_interior_sketch_shared.js';
import type { RenderSketchFreeWardrobeBox } from './render_interior_sketch_boxes_shared.js';

import { readGeometryRuntimeNumber } from './geometry_runtime_contracts.js';
import {
  asGeometryUserData,
  readGeometryUserDataNumberKey,
  readGeometryUserDataPositiveNumberKey,
} from './geometry_user_data_contracts.js';
import { asMesh, asValueRecord, readObject, toFiniteNumber } from './render_interior_sketch_shared.js';

export type SketchModuleInnerFaces = {
  leftX: number;
  rightX: number;
};

export type SketchModuleDoorFaceSpan = {
  spanW: number;
  centerX: number;
};

export type ResolveSketchModuleGeometryArgs = {
  group: InteriorGroupLike;
  input: RenderInteriorSketchInput;
  moduleIndex: number;
  moduleKeyStr: string;
  modulesLength: number;
  innerW: number;
  internalCenterX: number;
  woodThick: number;
};

export type CreateMeasureWardrobeLocalBoxArgs = {
  wardrobeGroup: (App: AppContainer) => InteriorGroupLike | null;
  asObject: <T extends object = InteriorValueRecord>(value: unknown) => T | null;
  assertTHREE: (App: AppContainer, where: string) => unknown;
};

export function createMeasureWardrobeLocalBox(args: CreateMeasureWardrobeLocalBoxArgs) {
  const { wardrobeGroup, asObject, assertTHREE } = args;

  return (App: AppContainer): RenderSketchFreeWardrobeBox | null => {
    try {
      const root = wardrobeGroup(App);
      if (!root) return null;
      const THREE = asObject<InteriorTHREESurface>(
        assertTHREE(App, 'native/builder/render_interior_sketch_module_geometry.measureWardrobeLocalBox')
      );
      if (!THREE || typeof THREE.Box3 !== 'function' || typeof THREE.Vector3 !== 'function') return null;
      const shouldExclude = (node: unknown): boolean => {
        let cur = asMesh(node) || (asObject<InteriorGroupLike>(node) ?? null);
        while (cur) {
          if (cur.visible === false) return true;
          const ud = asValueRecord(cur.userData);
          if (ud) {
            if (ud.__ignoreRaycast === true || ud.__wpExcludeWardrobeBounds === true) return true;
            const partId = typeof ud.partId === 'string' ? String(ud.partId) : '';
            if (partId.startsWith('sketch_box_free_')) return true;
          }
          cur = asObject<InteriorGroupLike>(cur.parent) ?? null;
        }
        return false;
      };
      const box = new THREE.Box3();
      const tmp = new THREE.Box3();
      let hasAny = false;
      root.updateWorldMatrix?.(true, true);
      root.traverse?.((node: unknown) => {
        const rec = asMesh(node) || (asObject<InteriorGroupLike>(node) ?? null);
        if (!rec || rec === root || shouldExclude(rec)) return;
        if (!(rec.isMesh || rec.isLine || rec.isLineSegments)) return;
        if (!rec.geometry) return;
        try {
          tmp.makeEmpty?.();
          tmp.setFromObject(rec);
          const min = tmp.min;
          const max = tmp.max;
          if (
            readGeometryRuntimeNumber(min.x) == null ||
            readGeometryRuntimeNumber(min.y) == null ||
            readGeometryRuntimeNumber(min.z) == null ||
            readGeometryRuntimeNumber(max.x) == null ||
            readGeometryRuntimeNumber(max.y) == null ||
            readGeometryRuntimeNumber(max.z) == null
          ) {
            return;
          }
          if (!hasAny) {
            box.copy?.(tmp);
            hasAny = true;
          } else {
            box.union?.(tmp);
          }
        } catch {
          // ignore
        }
      });
      if (!hasAny) return null;
      const min = box.min;
      const max = box.max;
      const minX = readGeometryRuntimeNumber(min.x);
      const minY = readGeometryRuntimeNumber(min.y);
      const minZ = readGeometryRuntimeNumber(min.z);
      const maxX = readGeometryRuntimeNumber(max.x);
      const maxY = readGeometryRuntimeNumber(max.y);
      const maxZ = readGeometryRuntimeNumber(max.z);
      if (minX == null || minY == null || minZ == null || maxX == null || maxY == null || maxZ == null) {
        return null;
      }
      const center = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      root.worldToLocal?.(center);
      const centerX = readGeometryRuntimeNumber(center.x);
      const centerY = readGeometryRuntimeNumber(center.y);
      const centerZ = readGeometryRuntimeNumber(center.z);
      const width = Math.abs(maxX - minX);
      const height = Math.abs(maxY - minY);
      const depth = Math.abs(maxZ - minZ);
      if (
        centerX == null ||
        centerY == null ||
        centerZ == null ||
        !(width > 0) ||
        !(height > 0) ||
        !(depth > 0)
      ) {
        return null;
      }
      return { centerX, centerY, centerZ, width, height, depth };
    } catch {
      return null;
    }
  };
}

export function resolveSketchModuleInnerFaces(
  args: ResolveSketchModuleGeometryArgs
): SketchModuleInnerFaces | null {
  const { group, moduleIndex, modulesLength, woodThick } = args;

  const getMeshW = (mesh: InteriorMeshLike | null): number => {
    const geometry = mesh?.geometry;
    const p = geometry?.parameters;
    if (p && typeof p.width === 'number' && Number.isFinite(p.width)) return p.width;
    try {
      geometry?.computeBoundingBox?.();
      const bb = geometry?.boundingBox;
      if (bb?.max && bb?.min) {
        const maxX = readGeometryRuntimeNumber(bb.max.x);
        const minX = readGeometryRuntimeNumber(bb.min.x);
        if (maxX != null && minX != null) return Math.abs(maxX - minX);
      }
    } catch {
      // ignore
    }
    return woodThick;
  };

  const findPart = (partId: string): InteriorMeshLike | null => {
    const children = group.children;
    if (!Array.isArray(children)) return null;
    for (let i = 0; i < children.length; i++) {
      const child = asMesh(children[i]);
      if (child?.userData?.partId === partId) return child;
    }
    return null;
  };

  if (!(moduleIndex >= 0) || !(modulesLength > 0)) return null;
  const leftPid = moduleIndex === 0 ? 'body_left' : `divider_inter_${moduleIndex - 1}`;
  const rightPid = moduleIndex === modulesLength - 1 ? 'body_right' : `divider_inter_${moduleIndex}`;
  const leftMesh = findPart(leftPid);
  const rightMesh = findPart(rightPid);
  if (!leftMesh || !rightMesh) return null;
  const leftW = getMeshW(leftMesh);
  const rightW = getMeshW(rightMesh);
  const leftX = readGeometryRuntimeNumber(leftMesh.position?.x);
  const rightX = readGeometryRuntimeNumber(rightMesh.position?.x);
  if (leftX == null || rightX == null || !(leftW > 0) || !(rightW > 0)) return null;
  const leftInner = leftX + leftW / 2;
  const rightInner = rightX - rightW / 2;
  if (!Number.isFinite(leftInner) || !Number.isFinite(rightInner) || !(rightInner > leftInner)) return null;
  return { leftX: leftInner, rightX: rightInner };
}

export function resolveSketchModuleDoorFaceSpan(
  args: ResolveSketchModuleGeometryArgs
): SketchModuleDoorFaceSpan | null {
  const { group, input, moduleIndex, moduleKeyStr, internalCenterX, innerW } = args;
  const fallbackCenterX = toFiniteNumber(input.externalCenterX) ?? internalCenterX;
  const fallbackW = Math.max(0.02, toFiniteNumber(input.externalW) ?? innerW);
  const startDoorId = Math.max(1, Math.floor(toFiniteNumber(input.startDoorId) ?? 1));
  const moduleDoors = Math.max(1, Math.floor(toFiniteNumber(input.moduleDoors) ?? 1));
  const pivotMap = readObject<InteriorValueRecord>(input.hingedDoorPivotMap);
  if (pivotMap && moduleDoors > 0) {
    let minX = fallbackCenterX - fallbackW / 2;
    let maxX = fallbackCenterX + fallbackW / 2;
    let found = false;
    for (let di = 0; di < moduleDoors; di++) {
      const entry = readObject<InteriorValueRecord>(pivotMap[startDoorId + di]);
      if (!entry) continue;
      const width = toFiniteNumber(entry.doorWidth);
      const pivotX = toFiniteNumber(entry.pivotX);
      const hingeLeft = entry.isLeftHinge === true;
      if (width == null || !(width > 0) || pivotX == null) continue;
      const leftX = hingeLeft ? pivotX : pivotX - width;
      const rightX = hingeLeft ? pivotX + width : pivotX;
      if (!Number.isFinite(leftX) || !Number.isFinite(rightX) || !(rightX > leftX)) continue;
      minX = found ? Math.min(minX, leftX) : leftX;
      maxX = found ? Math.max(maxX, rightX) : rightX;
      found = true;
    }
    if (found) {
      const spanW = maxX - minX;
      const centerX = (minX + maxX) / 2;
      if (Number.isFinite(spanW) && spanW > 0 && Number.isFinite(centerX)) return { spanW, centerX };
    }
  }

  const children = Array.isArray(group.children) ? group.children : null;
  if (!children) return null;
  const stackKeyRaw =
    typeof input.stackKey === 'string'
      ? String(input.stackKey)
      : typeof moduleKeyStr === 'string' && moduleKeyStr.startsWith('lower_')
        ? 'bottom'
        : 'top';
  const stackKey = stackKeyRaw === 'bottom' ? 'bottom' : 'top';
  const wantModuleKey = moduleKeyStr ? String(moduleKeyStr) : '';
  let minX = 0;
  let maxX = 0;
  let found = false;
  for (let i = 0; i < children.length; i++) {
    const child = readObject<InteriorGroupLike>(children[i]);
    if (!child) continue;
    const ud = asGeometryUserData(child.userData);
    if (!ud) continue;
    const childModuleIndex = readGeometryUserDataNumberKey(ud, 'moduleIndex');
    const childModuleKey = ud.moduleIndex != null ? String(ud.moduleIndex) : '';
    const matchesNumericModule =
      moduleIndex >= 0 && childModuleIndex != null && Math.floor(childModuleIndex) === moduleIndex;
    const matchesScopedModuleKey = !!wantModuleKey && childModuleKey === wantModuleKey;
    if (!matchesNumericModule && !matchesScopedModuleKey) continue;
    const partId = ud.partId != null ? String(ud.partId) : '';
    const doorId = readGeometryUserDataNumberKey(ud, '__wpDoorId');
    if (doorId == null && !/^d\d+/.test(partId)) continue;
    const childStackRaw = ud.__wpStack;
    const childStack = typeof childStackRaw === 'string' ? String(childStackRaw) : '';
    if (childStack && childStack !== stackKey) continue;
    const doorWidth = readGeometryUserDataPositiveNumberKey(ud, '__doorWidth');
    const pivotX = readGeometryRuntimeNumber(readObject<InteriorValueRecord>(child.position)?.x);
    const meshOffsetX = readGeometryUserDataNumberKey(ud, '__doorMeshOffsetX') ?? 0;
    if (doorWidth == null || !(doorWidth > 0) || pivotX == null) continue;
    const leftX = pivotX + meshOffsetX - doorWidth / 2;
    const rightX = pivotX + meshOffsetX + doorWidth / 2;
    if (!Number.isFinite(leftX) || !Number.isFinite(rightX) || !(rightX > leftX)) continue;
    minX = found ? Math.min(minX, leftX) : leftX;
    maxX = found ? Math.max(maxX, rightX) : rightX;
    found = true;
  }
  if (!found) return null;
  const spanW = maxX - minX;
  const centerX = (minX + maxX) / 2;
  if (!Number.isFinite(spanW) || !(spanW > 0) || !Number.isFinite(centerX)) return null;
  return { spanW, centerX };
}
