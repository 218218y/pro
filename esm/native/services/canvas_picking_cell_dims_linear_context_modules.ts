import type { CanvasLinearCellDimsArgs } from './canvas_picking_cell_dims_contracts.js';

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
  wardrobeType: string;
  doorsPerModule: number[];
  sumDoors: number;
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
  const { App, ui, cfg, raw } = args;

  const doorsCount = __asInt(raw.doors, __asInt(ui.doors, 0));
  const wardrobeType = readString(cfg, 'wardrobeType', 'hinged');
  const singleDoorPos = readString(ui, 'singleDoorPos', 'left');
  const structureSelect = ui.structureSelect;

  let modules: unknown[] = [];
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

  if (!Array.isArray(modules) || !modules.length) {
    const buildStruct = readBuildModulesStructure(App);
    const cfgStruct = readModulesStructureFromCfg(cfg);
    modules =
      Array.isArray(buildStruct) && buildStruct.length
        ? buildStruct
        : Array.isArray(cfgStruct)
          ? cfgStruct
          : [];
  }

  let moduleCount = Array.isArray(modules) ? modules.length : 0;
  if (!moduleCount) {
    moduleCount = readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration').length;
  }
  if (!moduleCount) return null;

  let { doorsPerModule, sumDoors } = syncDoorsPerModule(modules, moduleCount);

  if (wardrobeType !== 'sliding' && doorsCount > 0 && sumDoors !== doorsCount) {
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

  return { modules, moduleCount, wardrobeType, doorsPerModule, sumDoors };
}
