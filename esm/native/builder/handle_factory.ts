// Handle factory (Pure ESM)
//
// Centralizes handle mesh creation behind RenderOps, with fail-fast behavior.

import type {
  AppContainer,
  BuilderHandleMeshOptionsLike,
  BuilderOutlineFn,
  RenderOpsLike,
  ThreeLike,
} from '../../../types';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { getPlatformReportError } from '../runtime/platform_access.js';

type HandleCreatorArgs = {
  App?: AppContainer;
  THREE?: ThreeLike;
  addOutlines?: BuilderOutlineFn | null;
};

type HandleMeshFactory = NonNullable<RenderOpsLike['createHandleMesh']>;

export function makeHandleCreator(args: HandleCreatorArgs | null | undefined) {
  if (!args || typeof args !== 'object') {
    throw new Error('[builder/handle_factory] makeHandleCreator: args missing');
  }

  const { App, THREE, addOutlines } = args;

  if (!App || typeof App !== 'object') {
    throw new Error('[builder/handle_factory] makeHandleCreator: App missing');
  }
  if (!THREE) throw new Error('[builder/handle_factory] makeHandleCreator: THREE missing');

  const reportError = getPlatformReportError(App);

  return function createHandleMesh(
    type: string,
    w: number,
    h: number,
    isLeftHinge: boolean,
    extraOpts?: { handleColor?: string | null; edgeHandleVariant?: string | null }
  ): unknown | null {
    if (!type || type === 'none') return null;

    const ro = getBuilderRenderOps(App);
    const fn: HandleMeshFactory | null =
      ro && typeof ro.createHandleMesh === 'function' ? ro.createHandleMesh : null;

    if (!fn) {
      const err = new Error('[WardrobePro] Render ops missing: createHandleMesh');
      if (reportError) {
        try {
          reportError(err, { where: 'builder/handle_factory', type });
        } catch (_) {}
      }
      throw err;
    }

    const W = Number.isFinite(w) ? w : Number(w);
    const H = Number.isFinite(h) ? h : Number(h);

    const handleOpts: BuilderHandleMeshOptionsLike = { THREE, addOutlines, ...extraOpts };
    const mesh = fn(type, W, H, !!isLeftHinge, handleOpts);

    if (!mesh) {
      const err = new Error(`[WardrobePro] createHandleMesh returned null/undefined (type="${type}")`);
      if (reportError) {
        try {
          reportError(err, { where: 'builder/handle_factory', type });
        } catch (_) {}
      }
      throw err;
    }
    return mesh;
  };
}
