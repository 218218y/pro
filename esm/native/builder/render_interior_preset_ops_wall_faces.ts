import type { AppContainer } from '../../../types';
import type { InteriorGroupLike, InteriorTHREESurface } from './render_interior_ops_contracts.js';
import {
  asMesh,
  asRecord,
  reportInteriorPresetSoft,
  type InteriorPresetHandleCatch,
  type InteriorWallMesh,
} from './render_interior_preset_ops_shared.js';

export function computePresetModuleInnerFaces(args: {
  App: AppContainer;
  group: InteriorGroupLike;
  threeSurface: InteriorTHREESurface | null;
  woodThick: number;
  moduleIndex: number;
  modulesLength: number;
  innerW: number;
  internalCenterX: number;
  renderOpsHandleCatch: InteriorPresetHandleCatch;
}): { leftX: number; rightX: number } | null {
  const {
    App,
    group,
    threeSurface,
    woodThick,
    moduleIndex,
    modulesLength,
    innerW,
    internalCenterX,
    renderOpsHandleCatch,
  } = args;

  const BRACE_SIDE_EPS = 0.00005;

  const findParts = (partId: string): InteriorWallMesh[] => {
    const out: InteriorWallMesh[] = [];
    try {
      const stack: unknown[] = [group];
      while (stack.length) {
        const node = stack.pop();
        if (!node) continue;
        const mesh = asMesh(node);
        if (mesh?.userData?.partId === partId) out.push(mesh);
        const children = asRecord(node)?.children;
        if (Array.isArray(children)) {
          for (let i = 0; i < children.length; i += 1) stack.push(children[i]);
        }
      }
    } catch (err) {
      reportInteriorPresetSoft(App, renderOpsHandleCatch, 'applyInteriorPresetOps.findParts.walk', err);
    }
    return out;
  };

  const pickBestWall = (list: InteriorWallMesh[]): InteriorWallMesh | null => {
    if (!Array.isArray(list) || list.length === 0) return null;
    if (list.length === 1) return list[0];

    let best = list[0];
    let bestScore = Infinity;
    for (let i = 0; i < list.length; i += 1) {
      const node = list[i];
      const isMesh = !!(node && node.isMesh && node.geometry);
      let width = NaN;
      try {
        const parameters = isMesh ? node.geometry?.parameters : null;
        width = parameters && Number.isFinite(parameters.width) ? Number(parameters.width) : NaN;
      } catch (err) {
        reportInteriorPresetSoft(
          App,
          renderOpsHandleCatch,
          'applyInteriorPresetOps.pickBestWall.widthParam',
          err
        );
      }
      const meshPenalty = isMesh ? 0 : 1000;
      const widthPenalty = Number.isFinite(width) ? Math.abs(width - woodThick) : 10;
      const score = meshPenalty + widthPenalty;
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    }
    return best;
  };

  const faceXFromMesh = (mesh: InteriorWallMesh | null, wantMaxX: boolean): number => {
    if (!mesh) return NaN;
    if (!threeSurface) {
      const x = Number(mesh.position?.x);
      if (!Number.isFinite(x)) return NaN;
      return wantMaxX ? x + woodThick / 2 : x - woodThick / 2;
    }

    try {
      group.updateMatrixWorld?.(true);
      mesh.updateMatrixWorld?.(true);

      let halfWidth = NaN;
      try {
        const parameters = mesh.geometry?.parameters;
        const widthParam = parameters && Number.isFinite(parameters.width) ? Number(parameters.width) : NaN;
        if (Number.isFinite(widthParam)) {
          const scale = new threeSurface.Vector3();
          mesh.getWorldScale?.(scale);
          halfWidth = (widthParam * Math.abs(Number(scale.x) || 1)) / 2;
        }
      } catch (err) {
        reportInteriorPresetSoft(
          App,
          renderOpsHandleCatch,
          'applyInteriorPresetOps.faceXFromMesh.widthParam',
          err
        );
      }

      const worldPosition = new threeSurface.Vector3();
      mesh.getWorldPosition?.(worldPosition);
      if (!Number.isFinite(halfWidth)) {
        const box = new threeSurface.Box3().setFromObject(mesh);
        return wantMaxX ? box.max.x : box.min.x;
      }
      return wantMaxX ? Number(worldPosition.x) + halfWidth : Number(worldPosition.x) - halfWidth;
    } catch (err) {
      reportInteriorPresetSoft(App, renderOpsHandleCatch, 'applyInteriorPresetOps.faceXFromMesh.main', err);
      return NaN;
    }
  };

  const collectWallMeshes = (): InteriorWallMesh[] => {
    const out: InteriorWallMesh[] = [];
    try {
      const stack: unknown[] = [group];
      while (stack.length) {
        const node = stack.pop();
        if (!node) continue;
        const mesh = asMesh(node);
        if (mesh?.isMesh && mesh.geometry) {
          const parameters = mesh.geometry.parameters;
          const width = parameters && Number.isFinite(parameters.width) ? Number(parameters.width) : NaN;
          const height = parameters && Number.isFinite(parameters.height) ? Number(parameters.height) : NaN;
          const depth = parameters && Number.isFinite(parameters.depth) ? Number(parameters.depth) : NaN;
          const looksLikeWall =
            Number.isFinite(width) && Number.isFinite(height) && Number.isFinite(depth) && width <= 0.05;
          if (looksLikeWall) out.push(mesh);
        }
        const children = asRecord(node)?.children;
        if (Array.isArray(children)) {
          for (let i = 0; i < children.length; i += 1) stack.push(children[i]);
        }
      }
    } catch (err) {
      reportInteriorPresetSoft(App, renderOpsHandleCatch, 'applyInteriorPresetOps.collectWallMeshes', err);
    }
    return out;
  };

  const expectedLeft = internalCenterX - innerW / 2;
  const expectedRight = internalCenterX + innerW / 2;

  let leftPartId = moduleIndex <= 0 ? 'body_left' : `divider_inter_${moduleIndex - 1}`;
  let rightPartId = moduleIndex >= modulesLength - 1 ? 'body_right' : `divider_inter_${moduleIndex}`;
  if (!(moduleIndex >= 0 && modulesLength > 0)) {
    leftPartId = 'body_left';
    rightPartId = 'body_right';
  }

  const leftMesh = pickBestWall(findParts(leftPartId));
  const rightMesh = pickBestWall(findParts(rightPartId));
  const preciseLeft = faceXFromMesh(leftMesh, true);
  const preciseRight = faceXFromMesh(rightMesh, false);

  if (Number.isFinite(preciseLeft) && Number.isFinite(preciseRight) && preciseRight > preciseLeft) {
    return { leftX: preciseLeft + BRACE_SIDE_EPS, rightX: preciseRight - BRACE_SIDE_EPS };
  }

  const walls = collectWallMeshes();
  if (!walls.length) return null;

  let bestLeft = NaN;
  let bestRight = NaN;
  let bestLeftDistance = Infinity;
  let bestRightDistance = Infinity;

  for (let i = 0; i < walls.length; i += 1) {
    const mesh = walls[i];
    const maxX = faceXFromMesh(mesh, true);
    const minX = faceXFromMesh(mesh, false);

    if (Number.isFinite(maxX)) {
      const distance = Math.abs(maxX - expectedLeft);
      if (maxX <= internalCenterX + 0.001 && distance < bestLeftDistance) {
        bestLeftDistance = distance;
        bestLeft = maxX;
      }
    }
    if (Number.isFinite(minX)) {
      const distance = Math.abs(minX - expectedRight);
      if (minX >= internalCenterX - 0.001 && distance < bestRightDistance) {
        bestRightDistance = distance;
        bestRight = minX;
      }
    }
  }

  if (Number.isFinite(bestLeft) && Number.isFinite(bestRight) && bestRight > bestLeft) {
    try {
      if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
        if (bestLeftDistance > 0.004 || bestRightDistance > 0.004) {
          console.warn('[WardrobePro] brace shelf wall-face fallback used (large mismatch)', {
            moduleIndex,
            expLeft: expectedLeft,
            expRight: expectedRight,
            bestLeftX: bestLeft,
            bestRightX: bestRight,
            bestLeftD: bestLeftDistance,
            bestRightD: bestRightDistance,
          });
        }
      }
    } catch (err) {
      reportInteriorPresetSoft(App, renderOpsHandleCatch, 'applyInteriorPresetOps.facesFallbackWarn', err);
    }
    return { leftX: bestLeft, rightX: bestRight };
  }

  return null;
}
