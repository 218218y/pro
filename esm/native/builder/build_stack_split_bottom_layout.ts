import { cloneViaPlatform } from '../runtime/platform_access.js';
import { readModuleConfig, readRecord, readStringProp, readUiState } from './build_flow_readers.js';
import { createDefaultLowerModuleConfig, normalizeLowerModuleConfig } from '../features/stack_split/index.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';

import type {
  AppContainer,
  BuilderCalculateModuleStructureFn,
  ModuleConfigLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';
import { toStr } from './build_stack_split_contracts.js';

export function makeBottomUi(args: {
  ui: UiStateLike | null;
  bottomDoorsCount: number;
  topDoorsCount: number;
}): UiStateLike {
  const u0: UiStateLike = readUiState(args.ui) || {};
  const needs = args.bottomDoorsCount !== args.topDoorsCount;
  const hasSingle = !!u0.singleDoorPos;
  const hasStruct = !!u0.structureSelect;

  if (needs || !hasSingle) {
    const u1: UiStateLike = Object.assign({}, u0);
    if (!hasSingle) u1.singleDoorPos = 'center';
    if (needs && hasStruct) u1.structureSelect = '';
    return u1;
  }
  return u0;
}

export function computeBottomModulesCount(args: {
  cfg: UnknownRecord;
  uiBottom: UiStateLike;
  bottomDoorsCount: number;
  calculateModuleStructure: BuilderCalculateModuleStructureFn | null;
}): number {
  let bottomModulesCount = 0;
  if (args.calculateModuleStructure) {
    const singleDoorPosB = toStr(args.uiBottom.singleDoorPos, 'center');
    const structSelB = toStr(args.uiBottom.structureSelect, '');
    const wardTypeB = toStr(readStringProp(readRecord(args.cfg), 'wardrobeType'), '');
    const ms = args.calculateModuleStructure(args.bottomDoorsCount, singleDoorPosB, structSelB, wardTypeB);
    if (Array.isArray(ms) && ms.length) bottomModulesCount = ms.length;
  }
  if (!bottomModulesCount && args.bottomDoorsCount > 0) {
    bottomModulesCount = Math.max(1, Math.round(args.bottomDoorsCount / 2) || 1);
  }
  return bottomModulesCount;
}

export function buildBottomModuleConfigSeed(args: {
  App: AppContainer;
  cfg: UnknownRecord;
  bottomModulesCount: number;
}): ModuleConfigLike[] {
  const rawLowerCfg = readModulesConfigurationListFromConfigSnapshot(
    args.cfg,
    'stackSplitLowerModulesConfiguration'
  );
  const out: ModuleConfigLike[] = [];
  for (let i = 0; i < args.bottomModulesCount; i++) {
    const lower0 = rawLowerCfg[i];
    const clonedLower = (() => {
      if (lower0 == null || typeof lower0 !== 'object') return lower0;
      const seed = Array.isArray(lower0) ? [] : {};
      const cloned = cloneViaPlatform(args.App, lower0, seed);
      return cloned !== lower0 ? cloned : JSON.parse(JSON.stringify(lower0));
    })();
    const base = readModuleConfig(clonedLower) || createDefaultLowerModuleConfig(i);
    out.push(normalizeLowerModuleConfig(base, i));
  }
  return out;
}
