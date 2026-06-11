import type { ModulesConfigurationLike, UnknownRecord } from '../../../types';

import { getState, getRuntime } from './store_access.js';
import { hasEssentialUiDimsFromSnapshot, readUiRawIntFromSnapshot } from '../runtime/ui_raw_selectors.js';
import { calculateModuleStructure } from '../features/modules_configuration/calc_module_structure.js';
import {
  cloneModulesConfigurationSnapshot,
  materializeTopModulesConfigurationFromUiConfig,
} from '../features/modules_configuration/modules_config_api.js';
import {
  cloneCornerConfigurationListsSnapshot,
  cloneCornerConfigurationSnapshot,
  type CornerConfigurationLike,
} from '../features/modules_configuration/corner_cells_api.js';

import type {
  CreateKernelSnapshotStoreSystemArgs,
  KernelBuildStateLike,
} from './kernel_snapshot_store_contracts.js';
import { ensureUiSnapshot, mergeUiOverride } from './kernel_snapshot_store_shared.js';

type ModulesStructureItem = { doors: number };

export interface KernelSnapshotBuildStateArgs extends Pick<
  CreateKernelSnapshotStoreSystemArgs,
  'App' | 'asRecord' | 'asRecordOrNull' | 'isRecord' | 'reportNonFatal'
> {
  captureConfig: (() => unknown) | null;
}

function hasEssentialUi(uIn: unknown): boolean {
  return hasEssentialUiDimsFromSnapshot(uIn);
}

function looksLikeBuildStateOptions(
  asRecord: CreateKernelSnapshotStoreSystemArgs['asRecord'],
  override: unknown
): boolean {
  const rec = asRecord(override, {});
  const keys = Object.keys(rec);
  if (!keys.length) return false;
  const hasUiKeys =
    Object.prototype.hasOwnProperty.call(rec, 'raw') ||
    Object.prototype.hasOwnProperty.call(rec, 'width') ||
    Object.prototype.hasOwnProperty.call(rec, 'height') ||
    Object.prototype.hasOwnProperty.call(rec, 'depth') ||
    Object.prototype.hasOwnProperty.call(rec, 'doors');
  if (hasUiKeys) return false;
  return (
    Object.prototype.hasOwnProperty.call(rec, 'source') ||
    Object.prototype.hasOwnProperty.call(rec, 'reason') ||
    Object.prototype.hasOwnProperty.call(rec, 'immediate') ||
    Object.prototype.hasOwnProperty.call(rec, 'force') ||
    Object.prototype.hasOwnProperty.call(rec, 'noBuild') ||
    Object.prototype.hasOwnProperty.call(rec, 'silent')
  );
}

function readModulesStructure(
  args: Pick<KernelSnapshotBuildStateArgs, 'asRecord' | 'isRecord' | 'reportNonFatal'>,
  ui: UnknownRecord,
  cfg: UnknownRecord
): {
  doorsCount: number;
  wardrobeType: string;
  modulesStructure: ModulesStructureItem[] | null;
  signature: number[] | null;
} {
  let doorsCount = readUiRawIntFromSnapshot(ui, 'doors', 4);
  if (!Number.isFinite(doorsCount) || doorsCount < 0) doorsCount = 4;
  const wardrobeType = cfg && cfg.wardrobeType != null ? String(cfg.wardrobeType) : 'hinged';
  const singleDoorPos = ui.singleDoorPos != null ? String(ui.singleDoorPos) : '';
  const structureSelect = ui.structureSelect != null ? String(ui.structureSelect) : '';

  let ms: ModulesStructureItem[] | null = null;
  try {
    const out = calculateModuleStructure(doorsCount, singleDoorPos, structureSelect, wardrobeType);
    if (Array.isArray(out)) {
      ms = out.map((m: unknown): ModulesStructureItem => {
        const doors = args.isRecord(m) ? parseInt(String(args.asRecord(m).doors ?? ''), 10) || 1 : 1;
        return { doors };
      });
    }
  } catch (_eCalc) {
    args.reportNonFatal('getBuildState.modulesStructure.calc', _eCalc, { throttleMs: 12000 });
    ms = null;
  }

  return {
    doorsCount,
    wardrobeType,
    modulesStructure: ms,
    signature: Array.isArray(ms) ? ms.map(m => m.doors) : null,
  };
}

export function readKernelSnapshotBuildState(
  args: KernelSnapshotBuildStateArgs,
  override?: unknown
): KernelBuildStateLike {
  const ov = args.asRecord(override, {});
  const isState = args.isRecord(override) && ('ui' in ov || 'config' in ov);
  const uiOverride = isState ? args.asRecord(ov.ui, {}) : args.asRecord(override, {});

  let ui: UnknownRecord | null = null;
  if (uiOverride && typeof uiOverride === 'object') {
    const baseUi = isState ? {} : args.asRecord(getState(args.App)?.ui, {});

    if (looksLikeBuildStateOptions(args.asRecord, uiOverride)) {
      throw new Error(
        '[WardrobePro] getBuildState(uiOverride) received an options-like object. ' +
          'Pass a UI snapshot/patch, or pass { ui, config } if you intend to override state slices.'
      );
    }

    ui = ensureUiSnapshot(
      args.asRecord,
      mergeUiOverride(args.asRecord, args.asRecordOrNull, baseUi, uiOverride)
    );

    if (!hasEssentialUi(ui)) {
      throw new Error(
        '[WardrobePro] Missing essential UI fields in getBuildState(uiOverride). ' +
          'Pass a full ui snapshot/patch with width/height/depth/doors.'
      );
    }
  } else {
    const st = getState(args.App);
    if (st && st.ui && typeof st.ui === 'object') ui = ensureUiSnapshot(args.asRecord, st.ui);

    if (!hasEssentialUi(ui)) {
      throw new Error(
        '[WardrobePro] Missing essential UI fields in store.ui (width/height/depth/doors). ' +
          'DOM fallback (legacy UI reader) has been removed; ensure store.ui is seeded before building.'
      );
    }

    if (!ui) ui = { __snapshot: true, __capturedAt: Date.now() };
  }

  const baseCfg: UnknownRecord = args.captureConfig ? args.asRecord(args.captureConfig(), {}) : {};
  const cfg: UnknownRecord = isState ? Object.assign({}, baseCfg, args.asRecord(ov.config, {})) : baseCfg;

  const mode = (() => {
    const st = getState(args.App);
    if (st && st.mode) return st.mode;
    return { primary: 'none', opts: {} };
  })();

  const runtime = (() => {
    const rt = args.asRecord(getRuntime(args.App), {});
    if (Object.keys(rt).length) return rt;
    return { doorsOpen: false, sketchMode: false, restoring: false, systemReady: false };
  })();

  const build = readModulesStructure(args, args.asRecord(ui, {}), cfg);
  const prevModules: ModulesConfigurationLike = cloneModulesConfigurationSnapshot(
    cfg,
    'modulesConfiguration'
  );
  const isNoMainWardrobe = build.wardrobeType !== 'sliding' && build.doorsCount === 0;

  cfg.modulesConfiguration = isNoMainWardrobe
    ? prevModules.slice()
    : materializeTopModulesConfigurationFromUiConfig(cfg.modulesConfiguration, ui, cfg);

  cfg.stackSplitLowerModulesConfiguration = cloneModulesConfigurationSnapshot(
    cfg,
    'stackSplitLowerModulesConfiguration'
  );
  const rawCorner = args.asRecord(cfg.cornerConfiguration, {});
  const cornerConfiguration: CornerConfigurationLike = Object.keys(rawCorner).length
    ? cloneCornerConfigurationSnapshot(rawCorner)
    : cloneCornerConfigurationListsSnapshot(rawCorner);
  cfg.cornerConfiguration = cornerConfiguration;

  return { ui, config: cfg || {}, mode, runtime, build };
}
