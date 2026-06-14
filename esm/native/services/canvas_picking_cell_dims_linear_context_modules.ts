import type { CanvasLinearCellDimsArgs } from './canvas_picking_cell_dims_contracts.js';
import type { ModulesConfigBucketKey } from '../features/modules_configuration/modules_config_api.js';

import { calculateModuleStructure } from '../features/modules_configuration/calc_module_structure.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';

import { __asInt, __wp_reportPickingIssue } from './canvas_picking_core_helpers.js';
import {
  asModuleShape,
  readString,
  readBuildModulesStructure,
  readModulesStructureFromCfg,
} from './canvas_picking_cell_dims_linear_shared.js';

export interface ResolvedLinearModules {
  modules: unknown[];
  moduleCount: number;
  configBucket: ModulesConfigBucketKey;
  wardrobeType: string;
  doorsPerModule: number[];
  sumDoors: number;
}

function readPositiveNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function readBottomScalar(
  raw: Record<string, unknown>,
  valueKey: string,
  manualKey: string,
  fallback: number
): number {
  return raw[manualKey] ? readPositiveNumber(raw[valueKey], fallback) : fallback;
}

export function readLinearCellDimsTotals(args: CanvasLinearCellDimsArgs): {
  totalW: number;
  totalH: number;
  totalD: number;
} {
  const raw = (args.raw || {}) as Record<string, unknown>;
  const totalWTop = Number(args.raw.width) || 0;
  const totalHTop = Number(args.raw.height) || 0;
  const totalDTop = Number(args.raw.depth) || 0;
  if (!args.isBottomStack) return { totalW: totalWTop, totalH: totalHTop, totalD: totalDTop };

  return {
    totalW: readBottomScalar(raw, 'stackSplitLowerWidth', 'stackSplitLowerWidthManual', totalWTop),
    totalH: readPositiveNumber(raw.stackSplitLowerHeight, totalHTop),
    totalD: readBottomScalar(raw, 'stackSplitLowerDepth', 'stackSplitLowerDepthManual', totalDTop),
  };
}

function resolveDoorsCount(args: CanvasLinearCellDimsArgs): number {
  const { ui, raw } = args;
  const topDoors = __asInt(raw.doors, __asInt(ui.doors, 0));
  if (!args.isBottomStack) return topDoors;
  return raw.stackSplitLowerDoorsManual ? __asInt(raw.stackSplitLowerDoors, topDoors) : topDoors;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function readRawPreferredValue(
  ui: Record<string, unknown>,
  raw: Record<string, unknown>,
  key: string
): unknown {
  return hasOwn(raw, key) ? raw[key] : ui[key];
}

function resolveSingleDoorPos(args: CanvasLinearCellDimsArgs): string {
  const value = String(
    readRawPreferredValue(args.ui, args.raw, 'singleDoorPos') ?? (args.isBottomStack ? 'center' : 'left')
  );
  if (!args.isBottomStack) return value;
  return value || 'center';
}

function resolveStructureSelect(args: CanvasLinearCellDimsArgs, doorsCount: number): unknown {
  const structureSelect = readRawPreferredValue(args.ui, args.raw, 'structureSelect');
  if (!args.isBottomStack) return structureSelect;
  const topDoors = __asInt(args.raw.doors, __asInt(args.ui.doors, doorsCount));
  return doorsCount !== topDoors ? '' : structureSelect;
}

function readModulesFromConfigBucket(
  args: CanvasLinearCellDimsArgs,
  bucket: ModulesConfigBucketKey
): unknown[] {
  const list = readModulesConfigurationListFromConfigSnapshot(args.cfg, bucket);
  if (!Array.isArray(list) || !list.length) return [];
  return list.map((entry, index) => {
    const mod = asModuleShape(entry);
    return { doors: __asInt(mod.doors, 1), __configIndex: index };
  });
}

export function syncDoorsPerModule(
  modules: unknown[],
  moduleCount: number
): { doorsPerModule: number[]; sumDoors: number } {
  let sumDoors = 0;
  const doorsPerModule: number[] = [];
  for (let i = 0; i < moduleCount; i++) {
    const md = asModuleShape(modules[i]);
    let d = __asInt(md.doors, 1);
    if (d < 1) d = 1;
    doorsPerModule.push(d);
    sumDoors += d;
  }
  if (sumDoors < 1) sumDoors = 1;
  return { doorsPerModule, sumDoors };
}

export function resolveLinearModules(args: CanvasLinearCellDimsArgs): ResolvedLinearModules | null {
  const { App, cfg } = args;
  const configBucket: ModulesConfigBucketKey = args.isBottomStack
    ? 'stackSplitLowerModulesConfiguration'
    : 'modulesConfiguration';

  const doorsCount = resolveDoorsCount(args);
  const wardrobeType = readString(cfg, 'wardrobeType', 'hinged');
  const singleDoorPos = resolveSingleDoorPos(args);
  const structureSelect = resolveStructureSelect(args, doorsCount);

  const cfgModules = readModulesFromConfigBucket(args, configBucket);
  let modules: unknown[] = args.isBottomStack && cfgModules.length ? cfgModules : [];

  if (!Array.isArray(modules) || !modules.length) {
    try {
      modules = calculateModuleStructure(doorsCount, singleDoorPos, structureSelect, wardrobeType);
    } catch (err) {
      __wp_reportPickingIssue(App, err, {
        where: 'canvasPicking',
        op: 'splitDoors.calcModules',
        throttleMs: 1000,
      });
      modules = [];
    }
  }

  if (!Array.isArray(modules) || !modules.length) {
    const buildStruct = args.isBottomStack ? null : readBuildModulesStructure(App);
    const cfgStruct = args.isBottomStack ? null : readModulesStructureFromCfg(cfg);
    modules = cfgModules.length
      ? cfgModules
      : Array.isArray(buildStruct) && buildStruct.length
        ? buildStruct
        : Array.isArray(cfgStruct)
          ? cfgStruct
          : [];
  }

  let moduleCount = Array.isArray(modules) ? modules.length : 0;
  if (!moduleCount) {
    moduleCount = readModulesConfigurationListFromConfigSnapshot(cfg, configBucket).length;
  }
  if (!moduleCount) return null;

  let { doorsPerModule, sumDoors } = syncDoorsPerModule(modules, moduleCount);

  if (!args.isBottomStack && wardrobeType !== 'sliding' && doorsCount > 0 && sumDoors !== doorsCount) {
    try {
      const nextStruct = calculateModuleStructure(doorsCount, singleDoorPos, '', wardrobeType);
      if (Array.isArray(nextStruct) && nextStruct.length) {
        modules = nextStruct;
        moduleCount = modules.length;
        ({ doorsPerModule, sumDoors } = syncDoorsPerModule(modules, moduleCount));
      }
    } catch (err) {
      __wp_reportPickingIssue(App, err, { where: 'canvasPicking', op: 'cellDims.syncUiRaw' });
    }
  }

  return { modules, moduleCount, configBucket, wardrobeType, doorsPerModule, sumDoors };
}
