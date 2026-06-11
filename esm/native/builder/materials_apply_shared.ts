import { assertApp, assertTHREE, reportError, shouldFailFast } from '../runtime/api.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';
import { asRecord } from '../runtime/record.js';
import { getBuildStateMaybe, getCfg as getCfgSlice, getUi as getUiSlice } from './store_access.js';
import type {
  AppContainer,
  BuilderMaterialsServiceLike,
  Object3DLike,
  RenderOpsLike,
  SavedColorLike,
  ThreeLike,
} from '../../../types';
import type { IndividualColorsMap } from '../../../types/maps';

export type ValueRecord = Record<string, unknown>;
export type PartStackKey = 'top' | 'bottom' | null;

export type BuildUiLike = ValueRecord & {
  raw?: ValueRecord;
  colorChoice?: unknown;
  customColor?: unknown;
};

export type MaterialsCfgLike = ValueRecord & {
  customUploadedDataURL?: string | null;
  savedColors?: SavedColorLike[];
  isMultiColorMode?: boolean;
  individualColors?: IndividualColorsMap;
};

export type MirrorMaterialLike = ValueRecord & {
  envMap?: unknown;
  needsUpdate?: boolean;
  userData?: ValueRecord;
};

export type MirrorMaterialOpts = {
  THREE?: ThreeLike | null;
};

export type WardrobeMeshLike = Object3DLike & {
  material?: unknown | unknown[];
};

export type MaterialsCacheLike = ValueRecord & {
  realMirrorMat?: MirrorMaterialLike | null;
};

export type MaterialsApplyService = BuilderMaterialsServiceLike & {
  __cache?: MaterialsCacheLike;
  __esm_materials_apply_v1?: boolean;
  getMirrorMaterial?: (opts?: MirrorMaterialOpts) => unknown;
  applyMaterials?: () => unknown;
};

export type MaterialsApplyRenderOpsLike = Partial<RenderOpsLike> &
  ValueRecord & {
    getMirrorMaterial?: (args?: MirrorMaterialOpts) => unknown;
    applyMaterials?: () => unknown;
  };

export function asObject<T extends object>(value: unknown): T | null {
  return asRecord<T>(value);
}

export function maybeMaterialsApplyApp(app: unknown): AppContainer | null {
  return asObject<AppContainer>(app) || null;
}

export function pickMaterialsApplyApp(app: unknown, label = 'native/builder/materials_apply'): AppContainer {
  return assertApp(maybeMaterialsApplyApp(app), label);
}

export function ensureMaterialsApplySurface(App: AppContainer): AppContainer {
  const builder = ensureBuilderService(App, 'native/builder/materials_apply');
  builder.materials = asObject<MaterialsApplyService>(builder.materials) || {};
  builder.renderOps = asObject<MaterialsApplyRenderOpsLike>(builder.renderOps) || {};
  return App;
}

function readStateUi(state: unknown): BuildUiLike | null {
  const rec = asObject<{ ui?: unknown }>(state);
  return asObject<BuildUiLike>(rec?.ui) || null;
}

export function getBuildUi(App: AppContainer): BuildUiLike {
  try {
    const stateUi = readStateUi(getBuildStateMaybe(App));
    if (stateUi) return stateUi;
  } catch (error) {
    reportMaterialsApplySoft(App, 'getBuildUi.buildState', error);
  }
  try {
    return asObject<BuildUiLike>(getUiSlice(App)) || {};
  } catch (error) {
    reportMaterialsApplySoft(App, 'getBuildUi.storeSlice', error);
  }
  return {};
}

export function getUiVal<T>(ui: BuildUiLike, id: string, fallback: T): unknown {
  const raw = asObject<ValueRecord>(ui.raw) || {};
  if (Object.prototype.hasOwnProperty.call(raw, id)) return raw[id];

  const valMap: Record<string, string> = { color: 'colorChoice', customColorPicker: 'customColor' };
  const mapped = valMap[id];
  if (mapped && Object.prototype.hasOwnProperty.call(ui, mapped)) return ui[mapped];
  if (Object.prototype.hasOwnProperty.call(ui, id)) return ui[id];
  return fallback;
}

export function getMaterialsCfg(App: AppContainer): MaterialsCfgLike {
  return asObject<MaterialsCfgLike>(getCfgSlice(App)) || {};
}

export function getMaterialsTHREE(App: AppContainer, preferred?: ThreeLike | null): ThreeLike {
  if (preferred) return preferred;
  return assertTHREE(App, 'native/builder/materials_apply.THREE');
}

export function reportMaterialsApplySoft(
  App: AppContainer,
  op: string,
  error: unknown,
  extra?: ValueRecord
): void {
  reportError(App, error, {
    where: 'native/builder/materials_apply',
    op,
    fatal: false,
    ...(extra || {}),
  });
  if (shouldFailFast(App)) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}
