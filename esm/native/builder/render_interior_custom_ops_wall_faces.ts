import type { AppContainer } from '../../../types';
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
  moduleIndex: number;
  modulesLength: number;
  renderOpsHandleCatch: InteriorCustomHandleCatch;
}): InteriorCustomModuleFaces | null {
  const { App, group, woodThick, moduleIndex, modulesLength, renderOpsHandleCatch } = args;

  const readMeshWidth = (mesh: unknown): number => {
    const geometry = asGeometry(asMesh(mesh)?.geometry);
    const parameters = geometry?.parameters;
    if (parameters && typeof parameters.width === 'number' && Number.isFinite(parameters.width)) {
      return parameters.width;
    }
    try {
      if (geometry) {
        geometry.computeBoundingBox?.();
        const bb = geometry.boundingBox;
        if (bb?.max && bb?.min) {
          const maxX = Number(bb.max.x);
          const minX = Number(bb.min.x);
          if (Number.isFinite(maxX) && Number.isFinite(minX)) return Math.abs(maxX - minX);
        }
      }
    } catch (err) {
      reportInteriorCustomSoft(App, renderOpsHandleCatch, 'applyInteriorCustomOps.getMeshW.boundingBox', err);
    }
    return woodThick;
  };

  const findPart = (partId: string) => {
    const children = group.children;
    if (!Array.isArray(children)) return null;
    for (let i = 0; i < children.length; i += 1) {
      const child = asMesh(children[i]);
      if (child?.userData?.partId === partId) return child;
    }
    return null;
  };

  if (!(moduleIndex >= 0) || !(modulesLength > 0)) return null;
  const leftPartId = moduleIndex === 0 ? 'body_left' : `divider_inter_${moduleIndex - 1}`;
  const rightPartId = moduleIndex === modulesLength - 1 ? 'body_right' : `divider_inter_${moduleIndex}`;
  const leftMesh = findPart(leftPartId);
  const rightMesh = findPart(rightPartId);
  if (!leftMesh || !rightMesh) return null;

  const leftWidth = readMeshWidth(leftMesh);
  const rightWidth = readMeshWidth(rightMesh);
  const leftX = Number(leftMesh.position?.x);
  const rightX = Number(rightMesh.position?.x);
  if (!Number.isFinite(leftX) || !Number.isFinite(rightX) || !(leftWidth > 0) || !(rightWidth > 0))
    return null;

  const leftInner = leftX + leftWidth / 2;
  const rightInner = rightX - rightWidth / 2;
  if (!Number.isFinite(leftInner) || !Number.isFinite(rightInner) || !(rightInner > leftInner)) return null;

  return { leftX: leftInner, rightX: rightInner };
}
