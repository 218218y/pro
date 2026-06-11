import { getInternalGridMap } from '../runtime/cache_access.js';
import { assertApp, assertTHREE } from '../runtime/api.js';
import { getStackKeyFromFlags, getStackHeightOffsetCm } from '../features/stack_split/index.js';
import {
  getActiveHeightCmFromConfig,
  moduleHasAnyActiveSpecialDims,
} from '../features/special_dims/index.js';

import {
  asDims,
  asFlags,
  asLayout,
  asModuleConfigList,
  asModuleList,
  asNumberList,
  asStrings,
  asValueRecord,
} from './module_loop_pipeline_shared.js';
import { reqNumber } from './module_loop_pipeline_runtime_shared.js';

import type { BuildContextLike, ConfigStateLike, UiStateLike } from '../../../types/index.js';
import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime_contracts.js';

function asConfigState(value: unknown): ConfigStateLike {
  return asValueRecord(value);
}

function asUiState(value: unknown): UiStateLike {
  return asValueRecord(value);
}

export type ModuleLoopRuntimeBase = Pick<
  ModuleLoopRuntime,
  | 'App'
  | 'THREE'
  | 'cfg'
  | 'ui'
  | 'flags'
  | 'modules'
  | 'moduleCfgList'
  | 'moduleInternalWidthsList'
  | 'moduleIsCustom'
  | 'moduleBodyHeights'
  | 'totalW'
  | 'singleUnitWidth'
  | 'woodThick'
  | 'cabinetBodyHeight'
  | 'startY'
  | 'D'
  | 'totalH'
  | 'internalDepth'
  | 'depthReduction'
  | 'stackKey'
  | 'drawerKeyPrefix'
  | 'doorStyle'
  | 'splitDoors'
  | 'hingedDoorPivotMap'
  | 'internalGridMap'
>;

export function resolveModuleLoopRuntimeBase(ctx: BuildContextLike): ModuleLoopRuntimeBase {
  const App = assertApp(ctx.App, 'builder/module_loop.runtime');
  const THREE = ctx.THREE || assertTHREE(App, 'builder/module_loop.runtime');
  const cfg = asConfigState(ctx.cfg);
  const ui = asUiState(ctx.ui);

  const layout = asLayout(ctx.layout);
  const dims = asDims(ctx.dims);
  const modules = asModuleList(layout.modules);
  const moduleCfgList = asModuleConfigList(layout.moduleCfgList);
  const moduleInternalWidthsList = asNumberList(layout.moduleInternalWidths);

  const totalW = reqNumber(dims.totalW, 'dims.totalW');
  const singleUnitWidth = reqNumber(layout.singleUnitWidth, 'layout.singleUnitWidth');
  const woodThick = reqNumber(dims.woodThick, 'dims.woodThick');
  const cabinetBodyHeight = reqNumber(dims.cabinetBodyHeight, 'dims.cabinetBodyHeight');
  const startY = reqNumber(dims.startY, 'dims.startY');
  const D = reqNumber(dims.D, 'dims.D');

  const defaultH = typeof dims.defaultH === 'number' && Number.isFinite(dims.defaultH) ? dims.defaultH : NaN;
  const totalH = Number.isFinite(defaultH)
    ? defaultH
    : typeof dims.H === 'number' && Number.isFinite(dims.H)
      ? dims.H
      : startY + cabinetBodyHeight;

  const flags = asFlags(ctx.flags);
  const stackKey = getStackKeyFromFlags(flags);
  const drawerKeyPrefix = stackKey === 'bottom' ? 'lower_' : '';
  const heightOffsetCm = getStackHeightOffsetCm(flags, stackKey);

  const moduleIsCustom = modules.map((_m, i) => {
    const cfgMod = moduleCfgList[i] || {};
    return moduleHasAnyActiveSpecialDims(cfgMod, heightOffsetCm);
  });

  const moduleBodyHeights = modules.map((_m, i) => {
    const cfgMod = moduleCfgList[i] || {};
    const hCmActive = getActiveHeightCmFromConfig(cfgMod, heightOffsetCm);
    const moduleTotalH =
      typeof hCmActive === 'number' && Number.isFinite(hCmActive) && hCmActive > 0 ? hCmActive / 100 : totalH;
    return Math.max(woodThick * 2, moduleTotalH - startY);
  });

  const internalDepth = reqNumber(dims.internalDepth, 'dims.internalDepth');
  reqNumber(dims.internalZ, 'dims.internalZ');
  const depthReduction = Math.max(0, D - internalDepth);

  const strings = asStrings(ctx.strings);
  const doorStyle = String(strings.doorStyle || '');
  const splitDoors = !!flags.splitDoors;

  const hingedDoorPivotMap = layout.hingedDoorPivotMap || null;

  let internalGridMap = {};
  try {
    internalGridMap = getInternalGridMap(App, stackKey === 'bottom');
  } catch {
    internalGridMap = {};
  }

  return {
    App,
    THREE,
    cfg,
    ui,
    flags,
    modules,
    moduleCfgList,
    moduleInternalWidthsList,
    moduleIsCustom,
    moduleBodyHeights,
    totalW,
    singleUnitWidth,
    woodThick,
    cabinetBodyHeight,
    startY,
    D,
    totalH,
    internalDepth,
    depthReduction,
    stackKey,
    drawerKeyPrefix,
    doorStyle,
    splitDoors,
    hingedDoorPivotMap,
    internalGridMap,
  };
}
