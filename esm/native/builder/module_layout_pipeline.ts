// Module structure + layout pipeline (Pure ESM)
// Centralizes module structure resolution (store-driven), width math, and optional pure-core normalization.
// This keeps builder/core.js focused on orchestration and rendering.

import { computeHingedDoorPivotMap, computeModuleLayout } from './pure_api.js';
import {
  stripWidthOverridesFromConfig,
  moduleHasAnyActiveSpecialDims,
} from '../features/special_dims/index.js';
import { asRecord } from '../runtime/record.js';

import type {
  AppContainer,
  BuilderCalculateModuleStructureFn,
  BuildHingedDoorPivotEntryLike,
  BuildModuleStructureItemLike,
  BuildStateLike,
  ConfigStateLike,
  ModuleConfigLike,
  ModulesConfigurationLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';
import type { HingeMap } from '../../../types/maps.js';

import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { createLibraryTopModuleConfig } from '../features/library_preset/module_defaults.js';
import { reportErrorViaPlatform } from '../runtime/platform_access.js';

type ModuleLike = BuildModuleStructureItemLike;
type HingedDoorPivotMapLike = Record<number, BuildHingedDoorPivotEntryLike>;
type BuildStateShape = BuildStateLike & {
  build?: (UnknownRecord & { modulesStructure?: ModuleLike[] }) | null;
};
type CoreLayoutLike = {
  modules?: ModuleLike[];
  moduleConfigs?: ModulesConfigurationLike;
  totalDividersWidth?: number;
  netInternalWidth?: number;
  singleUnitWidth?: number;
  moduleInternalWidths?: number[] | null;
};

type ComputeModulesAndLayoutArgs = {
  App: AppContainer;
  state?: BuildStateShape | null;
  cfg?: ConfigStateLike | null;
  ui?: UiStateLike | null;
  totalW: number;
  woodThick: number;
  doorsCount: number;
  calculateModuleStructure?: BuilderCalculateModuleStructureFn | null;
};

type ComputeModulesAndLayoutResult = {
  modules: ModuleLike[];
  moduleCfgList: ModuleConfigLike[];
  totalDividersWidth: number;
  netInternalWidth: number;
  singleUnitWidth: number;
  moduleInternalWidths: number[] | null;
  hingedDoorPivotMap: HingedDoorPivotMapLike | null;
};

function toStr(x: unknown, def = ''): string {
  return typeof x === 'string' ? x : x == null ? def : String(x);
}

function toDoorCount(m: ModuleLike | null | undefined): number {
  if (!m) return 0;
  const raw = m.doors;
  return typeof raw === 'number' ? raw : Number(raw) || 0;
}

function reportError(App: AppContainer | null | undefined, err: unknown, where: string): void {
  try {
    reportErrorViaPlatform(App, err, { where, fatal: true });
  } catch (_) {}
}

function isCoreLayoutLike(value: unknown): value is CoreLayoutLike {
  const rec = asRecord<CoreLayoutLike>(value);
  if (!rec) return false;
  const modules = rec.modules;
  const moduleConfigs = rec.moduleConfigs;
  const moduleInternalWidths = rec.moduleInternalWidths;
  return (
    (modules == null || Array.isArray(modules)) &&
    (moduleConfigs == null || Array.isArray(moduleConfigs)) &&
    (moduleInternalWidths == null || Array.isArray(moduleInternalWidths))
  );
}

function readModuleConfigList(cfg: ConfigStateLike | null | undefined): ModulesConfigurationLike {
  return readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration');
}

function ensureLibraryMissingTopModuleConfigs(
  cfg: ConfigStateLike | null | undefined,
  modules: ModuleLike[],
  moduleCfgList: ModulesConfigurationLike,
  sourceModuleCfgList: ModulesConfigurationLike
): ModulesConfigurationLike {
  const cfgRec = asRecord<UnknownRecord>(cfg);
  if (!cfgRec?.isLibraryMode || !Array.isArray(modules) || !modules.length) return moduleCfgList;

  let nextList: ModulesConfigurationLike | null = null;
  const readNext = (): ModulesConfigurationLike => {
    if (!nextList) nextList = Array.isArray(moduleCfgList) ? moduleCfgList.slice() : [];
    return nextList;
  };

  for (let i = 0; i < modules.length; i += 1) {
    if (i < sourceModuleCfgList.length && sourceModuleCfgList[i]) continue;
    const doors = Math.max(1, Math.round(toDoorCount(modules[i]) || 2));
    readNext()[i] = createLibraryTopModuleConfig(doors);
  }

  return nextList || moduleCfgList;
}

function readHingeMap(value: unknown): HingeMap {
  const rec = asRecord<UnknownRecord>(value);
  const out: HingeMap = {};
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const entry = rec[key];
    if (entry === null) {
      out[key] = null;
      continue;
    }
    if (typeof entry === 'string') {
      out[key] = entry;
      continue;
    }
    const obj = asRecord<UnknownRecord>(entry);
    if (obj) out[key] = { ...obj };
  }
  return out;
}

function readFiniteNumberList(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const out = new Array<number>(value.length);
  for (let i = 0; i < value.length; i++) {
    const n = typeof value[i] === 'number' ? value[i] : Number(value[i]);
    if (!Number.isFinite(n)) return null;
    out[i] = n;
  }
  return out;
}

function readHingedDoorPivotMap(value: unknown): HingedDoorPivotMapLike | null {
  const rec = asRecord<UnknownRecord>(value);
  if (!rec) return null;
  const out: HingedDoorPivotMapLike = {};
  for (const key of Object.keys(rec)) {
    const entry = asRecord<BuildHingedDoorPivotEntryLike>(rec[key]);
    if (!entry) continue;
    const doorId = Number(key);
    if (!Number.isFinite(doorId)) continue;
    out[doorId] = { ...entry };
  }
  return out;
}

/**
 * Resolve module structure + normalized layout values.
 */
export function computeModulesAndLayout(args: ComputeModulesAndLayoutArgs): ComputeModulesAndLayoutResult {
  const App = args.App;
  const state = args.state || null;
  const cfg = args.cfg || {};
  const ui = args.ui || {};
  const totalW = typeof args.totalW === 'number' ? args.totalW : 0;
  const woodThick = typeof args.woodThick === 'number' ? args.woodThick : 0;
  const doorsCount = typeof args.doorsCount === 'number' ? args.doorsCount : 0;
  const calculateModuleStructure = args.calculateModuleStructure;

  const wardrobeType = toStr(cfg.wardrobeType, 'hinged');

  let modules: ModuleLike[] = [];

  // Prefer store-derived, precomputed structure.
  try {
    const stBuild = state?.build;
    if (stBuild && Array.isArray(stBuild.modulesStructure)) {
      modules = stBuild.modulesStructure;
    }
  } catch (_) {}

  // Compute structure using builder module helper when needed.
  if (!Array.isArray(modules) || modules.length === 0) {
    if (typeof calculateModuleStructure !== 'function') {
      throw new Error('Builder tools missing: modules.calculateModuleStructure');
    }

    const singleDoorPos = toStr(ui.singleDoorPos, '');
    if (doorsCount > 0 && !singleDoorPos) {
      // Fail-fast: this is required for odd doors.
      throw new Error('[WardrobePro] Missing ui.singleDoorPos (required for odd door counts)');
    }

    modules = calculateModuleStructure(
      doorsCount,
      singleDoorPos,
      toStr(ui.structureSelect, ''),
      wardrobeType
    ).map(item => ({
      doors: item?.doors,
    }));
  }

  if (!Array.isArray(modules)) {
    throw new Error('[WardrobePro] Invalid modulesStructure: expected an array');
  }

  let moduleCfgList = readModuleConfigList(cfg);
  const sourceModuleCfgList = moduleCfgList;

  // Guard: width overrides (specialDims.widthCm) are only meaningful when manual width is enabled.
  // If manual width is OFF, ignore leftover width overrides (often residue from older buggy flows)
  // so door-count changes keep auto-resizing the overall wardrobe width correctly.
  const isManualWidth = !!cfg.isManualWidth;
  if (!isManualWidth && moduleCfgList.length) {
    moduleCfgList = moduleCfgList.map((moduleCfg: ModuleConfigLike) =>
      stripWidthOverridesFromConfig(moduleCfg)
    );
  }

  const sumDoors = modules.reduce((sum, m) => sum + toDoorCount(m), 0);

  let totalDividersWidth = Math.max(0, modules.length - 1) * woodThick;
  let netInternalWidth = totalW - 2 * woodThick - totalDividersWidth;
  let singleUnitWidth = sumDoors > 0 ? netInternalWidth / sumDoors : 0;

  // Optional pure-core normalization (preferred). If it fails, keep the local math fallback.
  let coreLayout: CoreLayoutLike | null = null;
  try {
    const computedLayout = computeModuleLayout({
      totalW,
      woodThick,
      modulesStructure: modules,
      modulesConfiguration: moduleCfgList,
    });
    coreLayout = isCoreLayoutLike(computedLayout) ? computedLayout : null;

    if (coreLayout && Array.isArray(coreLayout.modules) && Array.isArray(coreLayout.moduleConfigs)) {
      modules = coreLayout.modules;
      moduleCfgList = coreLayout.moduleConfigs;
      totalDividersWidth = Number(coreLayout.totalDividersWidth) || totalDividersWidth;
      netInternalWidth = Number(coreLayout.netInternalWidth) || netInternalWidth;
      singleUnitWidth = Number(coreLayout.singleUnitWidth) || singleUnitWidth;
    }
  } catch (e) {
    reportError(App, e, 'native/builder/module_layout_pipeline.computeModuleLayout');
    coreLayout = null;
  }

  moduleCfgList = ensureLibraryMissingTopModuleConfigs(cfg, modules, moduleCfgList, sourceModuleCfgList);

  const moduleInternalWidths = readFiniteNumberList(coreLayout?.moduleInternalWidths);

  // Optional deterministic hinged door pivot map (pure). Best-effort (non-fatal).
  let hingedDoorPivotMap: HingedDoorPivotMapLike | null = null;
  if (wardrobeType === 'hinged') {
    try {
      // Detect which modules actually deviated from their captured base size.
      // This is used by the pure door pivot map to optionally apply an overlay-style extension
      // on boundaries where we add special full-depth partitions.
      const moduleIsCustom: boolean[] = modules.map((_m, i) => {
        const cfgMod = moduleCfgList[i] || {};
        return moduleHasAnyActiveSpecialDims(cfgMod, 0);
      });

      hingedDoorPivotMap = readHingedDoorPivotMap(
        computeHingedDoorPivotMap({
          modulesStructure: modules,
          totalW,
          woodThick,
          singleUnitWidth,
          hingeMap: readHingeMap(cfg.hingeMap),
          moduleInternalWidths,
          moduleIsCustom,
        })
      );
    } catch (e) {
      reportError(App, e, 'native/builder/module_layout_pipeline.computeHingedDoorPivotMap');
      hingedDoorPivotMap = null;
    }
  }

  return {
    modules,
    moduleCfgList,
    totalDividersWidth,
    netInternalWidth,
    singleUnitWidth,
    moduleInternalWidths,
    hingedDoorPivotMap,
  };
}
