import type { AppContainer } from '../../../types';
import { readGeometryRuntimeNumber } from './geometry_runtime_contracts.js';
import { pickMatchingModuleWallFace } from './render_interior_module_wall_face_selection.js';
import type { InteriorGroupLike } from './render_interior_ops_contracts.js';
import {
  asGeometry,
  asMesh,
  reportInteriorCustomSoft,
  type InteriorCustomHandleCatch,
  type InteriorCustomModuleFaces,
} from './render_interior_custom_ops_shared.js';

export function computeCustomModuleInnerFaces(args: {
  App: AppContainer;
  group: InteriorGroupLike;
  woodThick: number;
  innerW: number;
  internalCenterX: number;
  moduleIndex: number;
  modulesLength: number;
  renderOpsHandleCatch: InteriorCustomHandleCatch;
}): InteriorCustomModuleFaces | null {
  const { App, group, woodThick, innerW, internalCenterX, moduleIndex, modulesLength, renderOpsHandleCatch } =
    args;

  const readMeshWidth = (mesh: unknown): number => {
    const geometry = asGeometry(asMesh(mesh)?.geometry);
    const parameters = geometry?.parameters;
    const parameterWidth = readGeometryRuntimeNumber(parameters?.width);
    if (parameterWidth != null) return parameterWidth;
    try {
      if (geometry) {
        geometry.computeBoundingBox?.();
        const bb = geometry.boundingBox;
        if (bb?.max && bb?.min) {
          const maxX = readGeometryRuntimeNumber(bb.max.x);
          const minX = readGeometryRuntimeNumber(bb.min.x);
          if (maxX != null && minX != null) return Math.abs(maxX - minX);
        }
      }
    } catch (err) {
      reportInteriorCustomSoft(App, renderOpsHandleCatch, 'applyInteriorCustomOps.getMeshW.boundingBox', err);
    }
    return woodThick;
  };

  const findMatchingFace = (partId: string, wantRightFace: boolean, expectedX: number): number | null => {
    const children = group.children;
    if (!Array.isArray(children)) return null;
    const matches = [];
    for (const child of children) {
      const mesh = asMesh(child);
      if (mesh?.userData?.partId === partId) matches.push(mesh);
    }
    return pickMatchingModuleWallFace(matches, expectedX, mesh => {
      const width = readMeshWidth(mesh);
      const x = readGeometryRuntimeNumber(mesh?.position?.x);
      return x != null && width > 0 ? x + (wantRightFace ? width / 2 : -width / 2) : NaN;
    });
  };

  if (!(moduleIndex >= 0) || !(modulesLength > 0)) return null;
  const leftPartId = moduleIndex === 0 ? 'body_left' : `divider_inter_${moduleIndex - 1}`;
  const rightPartId = moduleIndex === modulesLength - 1 ? 'body_right' : `divider_inter_${moduleIndex}`;
  const expectedLeft = internalCenterX - innerW / 2;
  const expectedRight = internalCenterX + innerW / 2;
  const leftInner = findMatchingFace(leftPartId, true, expectedLeft);
  const rightInner = findMatchingFace(rightPartId, false, expectedRight);
  if (leftInner == null || rightInner == null || !(rightInner > leftInner)) return null;

  return { leftX: leftInner, rightX: rightInner };
}
