// Material resolver (Pure ESM)
//
// Goal: centralize multi-color handling so Builder Core / pipelines
// don't carry a large blob of material logic.
//
// Behavior:
// - In non-multiColor mode, always returns globalFrontMat.
// - In multiColor mode, resolves per-part values.
//   If a door becomes split (top/bot) after the user painted the full door, segments inherit the _full color.
// - If 'mirror' is selected, RenderOps.getMirrorMaterial MUST exist (fail-fast).

import type {
  AppContainer,
  BuilderMaterialSnapshotLike,
  RenderOpsLike,
  ThreeLike,
  UnknownRecord,
} from '../../../types';
import type { IndividualColorsMap } from '../../../types/maps';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { getPlatformReportError } from '../runtime/platform_access.js';
import { isDrawerBoxPartId } from '../features/part_identity/api.js';
import { readPartColorEntry } from './material_color_lookup.js';
import { resolveSelectionFrontMaterial } from './material_selection.js';

type MaterialFactory = (
  color: string | null,
  kind: string,
  useTexture?: boolean,
  textureDataURL?: string | null
) => unknown;

type MaterialResolverArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  cfg?: UnknownRecord;
  materialSnapshot: BuilderMaterialSnapshotLike;
  getMaterial: MaterialFactory;
  globalFrontMat: unknown;
};

function _isRecord(x: unknown): x is UnknownRecord {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function _asObj(x: unknown): UnknownRecord | null {
  return _isRecord(x) ? x : null;
}

export function makeMaterialResolver(args: MaterialResolverArgs): {
  getPartColorValue: (partId: string) => string | null | undefined;
  getPartMaterial: (partId: string) => unknown;
} {
  const a = _asObj(args);
  if (!a) throw new Error('[builder/material_resolver] makeMaterialResolver: args missing');

  const App = args.App;
  const THREE = args.THREE;
  const cfg = _asObj(args.cfg) || {};
  const getMaterial = args.getMaterial;
  const globalFrontMat = args.globalFrontMat;
  const materialSnapshot = args.materialSnapshot;

  const toColorKey = (value: unknown, defaultValue = ''): string => String(value ?? defaultValue);

  if (!App || typeof App !== 'object')
    throw new Error('[builder/material_resolver] makeMaterialResolver: App missing');
  if (!THREE) throw new Error('[builder/material_resolver] makeMaterialResolver: THREE missing');
  if (typeof getMaterial !== 'function') {
    throw new Error('[builder/material_resolver] makeMaterialResolver: getMaterial missing');
  }
  if (!globalFrontMat) {
    throw new Error('[builder/material_resolver] makeMaterialResolver: globalFrontMat missing');
  }

  const reportError = getPlatformReportError(App);
  let drawerBoxBaseMat: unknown | undefined;
  const getDrawerBoxBaseMat = () => {
    if (!drawerBoxBaseMat) drawerBoxBaseMat = getMaterial('#ffffff', 'body', false);
    return drawerBoxBaseMat || globalFrontMat;
  };

  function getPartColorValue(partId: string): string | null | undefined {
    if (!cfg.isMultiColorMode) return null;
    const colors = _asObj(cfg.individualColors) as IndividualColorsMap | null;
    const value = readPartColorEntry({
      individualColors: colors,
      isMulti: !!cfg.isMultiColorMode,
      partId,
      stackKey: null,
    });
    if (value === null) return null;
    if (typeof value === 'undefined') return undefined;
    return String(value);
  }

  function getPartMaterial(partId: string): unknown {
    const specificColorVal = getPartColorValue(partId);
    if (
      isDrawerBoxPartId(partId) &&
      (!specificColorVal || specificColorVal === 'glass' || specificColorVal === 'mirror')
    ) {
      return getDrawerBoxBaseMat();
    }
    if (!cfg.isMultiColorMode || !specificColorVal) return globalFrontMat;

    if (specificColorVal === 'glass') return globalFrontMat;

    if (specificColorVal === 'mirror') {
      const ro = getBuilderRenderOps(App);
      const getMirrorMaterial: RenderOpsLike['getMirrorMaterial'] | null =
        ro && typeof ro.getMirrorMaterial === 'function' ? ro.getMirrorMaterial : null;
      if (!getMirrorMaterial) {
        const err = new Error('[WardrobePro] Mirror selected but RenderOps.getMirrorMaterial is missing');
        if (reportError) {
          try {
            reportError(err, { where: 'builder/material_resolver', partId });
          } catch (_) {}
        }
        throw err;
      }
      return getMirrorMaterial({ App, THREE, materialSnapshot });
    }

    return resolveSelectionFrontMaterial({
      selection: specificColorVal,
      cfg,
      getMaterial,
      toStr: toColorKey,
    });
  }

  return {
    getPartColorValue,
    getPartMaterial,
  };
}
