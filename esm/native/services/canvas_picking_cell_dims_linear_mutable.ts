import type { UnknownRecord } from '../../../types';
import type {
  EnsureOwnLinearModule,
  LinearCellDimsContext,
  ModuleShape,
} from './canvas_picking_cell_dims_linear_shared.js';

import { sanitizeModulesConfigurationListLight } from '../features/modules_configuration/modules_config_api.js';
import { __asInt } from './canvas_picking_core_helpers.js';
import { asModuleShape, cloneModuleRecord } from './canvas_picking_cell_dims_linear_shared.js';

export function buildMutableLinearModules(ctx: LinearCellDimsContext): {
  nextModsCfg: UnknownRecord[];
  ensureOwnModule: EnsureOwnLinearModule;
} {
  const prevModsList: unknown[] = Array.isArray(ctx.prevModsCfg) ? ctx.prevModsCfg : [];
  let hasBadEntry = false;
  for (let i = 0; i < ctx.moduleCount; i++) {
    const value = prevModsList[i];
    if (!(value && typeof value === 'object' && !Array.isArray(value))) {
      hasBadEntry = true;
      break;
    }
  }

  const nextModsCfg: UnknownRecord[] = (
    hasBadEntry
      ? sanitizeModulesConfigurationListLight(ctx.configBucket, prevModsList, prevModsList)
      : prevModsList.slice(0, ctx.moduleCount)
  ).map(item => cloneModuleRecord(item));
  while (nextModsCfg.length < ctx.moduleCount) nextModsCfg.push({});

  const ensureOwnModule = (i: number): ModuleShape => {
    const out = cloneModuleRecord(nextModsCfg[i]);
    nextModsCfg[i] = out;
    return out;
  };

  for (let i = 0; i < ctx.moduleCount; i++) {
    const cur = asModuleShape(nextModsCfg[i]);
    const wantDoors = ctx.doorsPerModule[i] ?? 1;
    const curDoors = __asInt(cur.doors, wantDoors);
    if (curDoors !== wantDoors) ensureOwnModule(i).doors = wantDoors;
  }

  return { nextModsCfg, ensureOwnModule };
}
