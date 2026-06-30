import type {
  ActionMetaLike,
  ConfigStateLike,
  ModulesActionsLike,
  ModulesRecomputeFromUiOptionsLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';

import { readCanonicalUiRawIntFromSnapshot } from '../runtime/ui_raw_selectors.js';
import {
  materializeTopModulesConfigurationForStructure,
  readModulesConfigurationListFromConfigSnapshot,
} from '../features/modules_configuration/modules_config_api.js';
import { calculateModuleStructure as calculateModuleStructurePure } from '../features/modules_configuration/calc_module_structure.js';
import { createLibraryTopModuleConfig } from '../features/library_preset/library_preset.js';
import { snapshotStoreValueEqual } from './kernel_snapshot_store_shared.js';
import {
  asModulesStructureList,
  asRecordOrEmpty,
  cloneJsonRecord,
  cloneModuleConfig,
  readDoorsCount,
  readLayout,
  type ModuleCfgItem,
} from './domain_api_modules_corner_shared.js';

export interface DomainApiModulesCornerRecomputeRuntime {
  modulesActions: ModulesActionsLike;
  cfg: UnknownRecord;
  ui: UnknownRecord;
  currentModules: UnknownRecord[];
  currentModulesStructure: number[];
  modulesStructure: { doors: number }[];
  doorsCount: number;
  wardrobeType: string;
  isLibraryMode: boolean;
  isNoMainWardrobe: boolean;
  options: ModulesRecomputeFromUiOptionsLike;
  meta: ActionMetaLike;
}

function readUiRawPreferredString(ui: UnknownRecord, key: string, defaultValue = ''): string {
  const raw = asRecordOrEmpty(ui.raw);
  if (Object.prototype.hasOwnProperty.call(raw, key)) {
    const value = raw[key];
    return value == null ? defaultValue : String(value);
  }
  const value = ui[key];
  return value == null ? defaultValue : String(value);
}

export function createDomainApiModulesCornerRecomputeRuntime(args: {
  modulesActions: ModulesActionsLike;
  _cfg: () => ConfigStateLike;
  _ui: () => UiStateLike;
  _isRecord: (v: unknown) => v is UnknownRecord;
  _meta: (meta: ActionMetaLike | UnknownRecord | null | undefined, source: string) => ActionMetaLike;
  uiOverride: unknown;
  meta: ActionMetaLike | undefined;
  opts?: ModulesRecomputeFromUiOptionsLike;
}): DomainApiModulesCornerRecomputeRuntime {
  const { modulesActions, _cfg, _ui, _isRecord, _meta, uiOverride, meta, opts } = args;
  const options: ModulesRecomputeFromUiOptionsLike = _isRecord(opts) ? opts : {};
  const cfg = asRecordOrEmpty(_cfg());
  const ui = asRecordOrEmpty(uiOverride ?? _ui());
  const doorsCount = readCanonicalUiRawIntFromSnapshot(ui, 'doors', 2);
  const singlePos = readUiRawPreferredString(ui, 'singleDoorPos');
  const structVal = readUiRawPreferredString(ui, 'structureSelect');
  const wardrobeType = cfg && cfg.wardrobeType ? String(cfg.wardrobeType) : 'hinged';
  const modulesStructure = asModulesStructureList(
    calculateModuleStructurePure(doorsCount, singlePos, structVal, wardrobeType) || []
  );
  const currentModules = readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration');
  return {
    modulesActions,
    cfg,
    ui,
    currentModules,
    currentModulesStructure: currentModules.map(mod => readDoorsCount(mod)),
    modulesStructure,
    doorsCount,
    wardrobeType,
    isLibraryMode: !!cfg.isLibraryMode,
    isNoMainWardrobe: wardrobeType !== 'sliding' && doorsCount === 0,
    options,
    meta: _meta(meta, 'actions:modules:recomputeFromUi'),
  };
}

export function needsModulesRecompute(runtime: DomainApiModulesCornerRecomputeRuntime): boolean {
  if (
    runtime.options.structureChanged ||
    runtime.currentModulesStructure.length !== runtime.modulesStructure.length
  ) {
    return true;
  }
  for (let i = 0; i < runtime.currentModulesStructure.length; i++) {
    if (
      runtime.currentModulesStructure[i] !==
      (runtime.modulesStructure[i] && runtime.modulesStructure[i].doors)
    ) {
      return true;
    }
  }
  return false;
}

export function didRecomputedModulesChange(
  runtime: Pick<DomainApiModulesCornerRecomputeRuntime, 'currentModules'>,
  nextModules: unknown
): boolean {
  return !snapshotStoreValueEqual(runtime.currentModules, nextModules);
}

export function createSeedModules(runtime: DomainApiModulesCornerRecomputeRuntime): ModuleCfgItem[] {
  if (runtime.isLibraryMode) {
    return runtime.modulesStructure.map(function (ms) {
      const doors = ms && typeof ms.doors === 'number' ? ms.doors : 2;
      return createLibraryTopModuleConfig(doors);
    });
  }

  return materializeTopModulesConfigurationForStructure([], runtime.modulesStructure) as ModuleCfgItem[];
}

export function clonePrevModuleOnto(
  dst: ModuleCfgItem,
  prev: UnknownRecord | null,
  index: number,
  doors: number
): ModuleCfgItem {
  if (!prev || typeof prev !== 'object') {
    return cloneModuleConfig(dst, null, index, doors);
  }
  const prevCloned = cloneJsonRecord(prev) || {};
  return cloneModuleConfig(dst, prevCloned, index, doors);
}

export function isHangingLayout(layout: unknown): boolean {
  const value = typeof layout === 'string' ? layout : '';
  return value.indexOf('hanging') >= 0;
}

export function flipDefaultLayout(layout: unknown): 'shelves' | 'hanging_top2' {
  return isHangingLayout(layout) ? 'shelves' : 'hanging_top2';
}

export function setDefaultModuleLayout(
  modules: ModuleCfgItem[],
  idx: number,
  layout: 'shelves' | 'hanging_top2'
): void {
  modules[idx] = cloneModuleConfig(
    modules[idx],
    {
      layout,
      isCustom: false,
    },
    idx
  );
}

export function readNeighborLayout(modules: ModuleCfgItem[], idx: number): unknown {
  return idx >= 0 && idx < modules.length ? readLayout(modules[idx]) : null;
}
