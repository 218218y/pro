import {
  asBuildFns,
  asCreateFns,
  asDoorState,
  asFlags,
  asHinged,
  asMaterials,
  asResolvers,
  readAddFoldedClothes,
  readAddHangingClothes,
  readAddRealisticHanger,
  readCreateDoorVisual,
  readCreateInternalDrawerBox,
  readDoorRemovedResolver,
  readGetPartColorValue,
  readGetPartMaterial,
  readOutlineFn,
} from './module_loop_pipeline_shared.js';
import { readCreateBoard } from './module_loop_pipeline_runtime_shared.js';

import type { BuildContextLike } from '../../../types/index.js';
import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime_contracts.js';

export type ModuleLoopRuntimeResolvers = Pick<
  ModuleLoopRuntime,
  | 'bodyMat'
  | 'globalFrontMat'
  | 'shadowMat'
  | 'legMat'
  | 'isGroovesEnabled'
  | 'isInternalDrawersEnabled'
  | 'showHangerEnabled'
  | 'showContentsEnabled'
  | 'removeDoorsEnabled'
  | 'getPartMaterial'
  | 'getPartColorValue'
  | 'createDoorVisual'
  | 'createInternalDrawerBox'
  | 'createBoard'
  | 'addOutlines'
  | 'addRealisticHanger'
  | 'addHangingClothes'
  | 'addFoldedClothes'
  | 'hingedDoorOpsList'
  | 'globalHandleAbsY'
  | 'isDoorRemoved'
  | 'getHingeDir'
  | 'isDoorSplit'
  | 'isDoorSplitBottom'
  | 'curtainVal'
  | 'grooveVal'
>;

export function resolveModuleLoopRuntimeResolvers(ctx: BuildContextLike): ModuleLoopRuntimeResolvers {
  const resolvers = asResolvers(ctx.resolvers);
  const doorState = asDoorState(resolvers.doorState);
  if (!doorState) throw new Error('[builder/module_loop] Missing doorState resolver');

  const getPartMaterial = readGetPartMaterial(resolvers.getPartMaterial);
  if (!getPartMaterial) throw new Error('[builder/module_loop] Missing getPartMaterial');
  const getPartColorValue = readGetPartColorValue(resolvers.getPartColorValue);

  const create = asCreateFns(ctx.create);
  const createDoorVisual = readCreateDoorVisual(create.createDoorVisual);
  const createInternalDrawerBox = readCreateInternalDrawerBox(create.createInternalDrawerBox);
  const createBoard = readCreateBoard(create.createBoard);
  if (typeof createBoard !== 'function') throw new Error('[builder/module_loop] Missing createBoard');

  const fns = asBuildFns(ctx.fns);
  const addOutlines = readOutlineFn(fns.addOutlines);
  const addRealisticHanger = readAddRealisticHanger(fns.addRealisticHanger);
  const addHangingClothes = readAddHangingClothes(fns.addHangingClothes);
  const addFoldedClothes = readAddFoldedClothes(fns.addFoldedClothes);

  const materials = asMaterials(ctx.materials);
  const flags = asFlags(ctx.flags);

  const removeDoorsEnabled = !!resolvers.removeDoorsEnabled;
  const isDoorRemoved = readDoorRemovedResolver(resolvers.isDoorRemoved);

  const hinged = asHinged(ctx.hinged);

  return {
    bodyMat: materials.bodyMat,
    globalFrontMat: materials.globalFrontMat,
    shadowMat: materials.shadowMat,
    legMat: materials.legMat,
    isGroovesEnabled: !!flags.isGroovesEnabled,
    isInternalDrawersEnabled: !!flags.isInternalDrawersEnabled,
    showHangerEnabled: !!flags.showHangerEnabled,
    showContentsEnabled: !!flags.showContentsEnabled,
    removeDoorsEnabled,
    getPartMaterial,
    getPartColorValue,
    createDoorVisual,
    createInternalDrawerBox,
    createBoard,
    addOutlines,
    addRealisticHanger,
    addHangingClothes,
    addFoldedClothes,
    hingedDoorOpsList: Array.isArray(hinged.opsList) ? hinged.opsList : [],
    globalHandleAbsY:
      typeof hinged.globalHandleAbsY === 'number' && Number.isFinite(hinged.globalHandleAbsY)
        ? hinged.globalHandleAbsY
        : 0,
    isDoorRemoved,
    getHingeDir: doorState.getHingeDir,
    isDoorSplit: doorState.isDoorSplit,
    isDoorSplitBottom: doorState.isDoorSplitBottom,
    curtainVal: doorState.curtainVal,
    grooveVal: doorState.grooveVal,
  };
}
