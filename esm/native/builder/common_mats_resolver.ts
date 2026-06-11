// Common mats resolver (Pure ESM)
//
// Centralizes access to the RenderOps "common materials" bundle.
// Builder core/pipelines must not instantiate raw THREE materials directly.

import type { AppContainer, ThreeLike } from '../../../types';

import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { asRecord } from '../runtime/record.js';

type CommonMatsResult = {
  masoniteMat: unknown;
  whiteMat: unknown;
  shadowMat: unknown;
};

function isAppContainer(value: unknown): value is AppContainer {
  const rec = asRecord<AppContainer>(value);
  return !!(rec && typeof rec.deps === 'object');
}

function isThreeLike(value: unknown): value is ThreeLike {
  const rec = asRecord<ThreeLike>(value);
  return !!(
    rec &&
    typeof rec.Group === 'function' &&
    typeof rec.Mesh === 'function' &&
    typeof rec.Vector3 === 'function' &&
    typeof rec.BoxGeometry === 'function'
  );
}

function isCommonMatsResult(value: unknown): value is CommonMatsResult {
  const rec = asRecord<CommonMatsResult>(value);
  return !!(rec && rec.masoniteMat && rec.whiteMat && rec.shadowMat);
}

/**
 * @param {{ App: unknown, THREE: unknown }} args
 * @returns {{ masoniteMat: unknown, whiteMat: unknown, shadowMat: unknown }}
 */
export function getCommonMatsOrThrow(args: { App?: unknown; THREE?: unknown } | null | undefined) {
  const app = args && isAppContainer(args.App) ? args.App : null;
  const THREE = args && isThreeLike(args.THREE) ? args.THREE : null;
  if (!app) throw new Error('[builder/common_mats_resolver] App is required');
  if (!THREE) throw new Error('[builder/common_mats_resolver] THREE is required');

  const ro = getBuilderRenderOps(app);
  const getCommonMats = ro && typeof ro.getCommonMats === 'function' ? ro.getCommonMats : null;
  if (!getCommonMats) {
    throw new Error('[WardrobePro] Render ops missing: getCommonMats');
  }

  const mats = getCommonMats({ App: app, THREE });
  if (!isCommonMatsResult(mats)) {
    throw new Error('[WardrobePro] Render ops getCommonMats returned incomplete mats');
  }

  return {
    masoniteMat: mats.masoniteMat,
    whiteMat: mats.whiteMat,
    shadowMat: mats.shadowMat,
  };
}
