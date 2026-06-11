// Material resolver (Pure ESM)
//
// Goal: centralize multi-color + saved texture handling so Builder Core / pipelines
// don't carry a large blob of material logic.
//
// Behavior:
// - In non-multiColor mode, always returns globalFrontMat.
// - In multiColor mode, resolves per-part values.
//   If a door becomes split (top/bot) after the user painted the full door, segments inherit the _full color.
// - If 'mirror' is selected, RenderOps.getMirrorMaterial MUST exist (fail-fast).

import type { AppContainer, RenderOpsLike, ThreeLike, UnknownRecord } from '../../../types';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { getPlatformReportError } from '../runtime/platform_access.js';

type SavedColorItemLike = UnknownRecord & {
  id?: string;
  type?: string;
  value?: unknown;
  textureData?: unknown;
};

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

  const toColorKey = (v: unknown): string | null => {
    if (v == null) return null;
    return typeof v === 'string' ? v : String(v);
  };

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

  function getPartColorValue(partId: string): string | null | undefined {
    if (!cfg.isMultiColorMode) return null;
    const colors = _asObj(cfg.individualColors) || {};
    let value = colors[partId];
    // Inherit full-door paint when a door is split but only the *_full key exists.
    if (typeof value === 'undefined' && /_(top|bot)$/.test(partId)) {
      const fullKey = String(partId).replace(/_(top|bot)$/, '_full');
      if (Object.prototype.hasOwnProperty.call(colors, fullKey)) value = colors[fullKey];
    }
    if (value === null) return null;
    if (typeof value === 'undefined') return undefined;
    return String(value);
  }

  function getPartMaterial(partId: string): unknown {
    const specificColorVal = getPartColorValue(partId);
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
      return getMirrorMaterial({ App, THREE });
    }

    if (specificColorVal.startsWith('saved_')) {
      const savedList = Array.isArray(cfg.savedColors) ? cfg.savedColors : [];
      const savedItem = savedList.find(
        (entry: SavedColorItemLike | null | undefined) => entry && entry.id === specificColorVal
      );
      if (savedItem) {
        if (savedItem.type === 'texture' && savedItem.textureData) {
          return getMaterial(specificColorVal, 'front', true, String(savedItem.textureData));
        }
        return getMaterial(toColorKey(savedItem.value), 'front', false);
      }
    }

    return getMaterial(toColorKey(specificColorVal), 'front', false);
  }

  return {
    getPartColorValue,
    getPartMaterial,
  };
}

/**
 * Resolve the UI color choice into global material inputs.
 *
 * This keeps builder/core orchestration clean and avoids repeating
 * the "custom / saved_* / texture" branching across files.
 */
export function resolveGlobalColorChoice(args: {
  ui: UnknownRecord;
  cfg: UnknownRecord;
  toStr?: (v: unknown, fb?: string) => string;
}): { colorKey: string; useTexture: boolean; textureDataURL: string | null } {
  const ui = args.ui;
  const cfg = args.cfg || {};
  const toStr =
    (typeof args.toStr === 'function' && args.toStr) ||
    ((v: unknown, fb?: string) => (v == null ? fb || '' : String(v)));

  let colorKey = toStr(ui && ui.colorChoice, '');
  let useTexture = false;
  let textureDataURL: string | null = null;

  if (colorKey === 'custom') {
    textureDataURL =
      typeof cfg.customUploadedDataURL === 'string' && cfg.customUploadedDataURL
        ? cfg.customUploadedDataURL
        : null;
    if (textureDataURL) {
      useTexture = true;
    } else {
      colorKey = toStr(ui && ui.customColor, '');
    }
  } else if (String(colorKey || '').startsWith('saved_')) {
    const savedList = Array.isArray(cfg.savedColors) ? cfg.savedColors : [];
    const saved = savedList.find(
      (entry: SavedColorItemLike | null | undefined) => entry && entry.id === colorKey
    );
    if (saved && saved.type === 'texture' && saved.textureData) {
      useTexture = true;
      textureDataURL = String(saved.textureData);
    } else if (saved) {
      colorKey = String(saved.value);
    }
  }

  return { colorKey: String(colorKey || ''), useTexture: !!useTexture, textureDataURL };
}
