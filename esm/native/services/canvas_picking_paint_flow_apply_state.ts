import type {
  AppContainer,
  CurtainMap,
  DoorSpecialMap,
  IndividualColorsMap,
  MirrorLayoutMap,
} from '../../../types';

import {
  cloneCurtainMap,
  cloneDoorSpecialMap,
  cloneIndividualColorsMap,
  cloneMirrorLayoutConfigMap,
  hasLiveMaterialRefresh,
  readCurtainMap,
  readDoorSpecialMap,
  readIndividualColorsMap,
  readMirrorLayoutConfigMap,
  sameFlatMap,
  sameMirrorLayoutMap,
} from './canvas_picking_paint_flow_shared.js';

export type PaintFlowMutableState = {
  App: AppContainer;
  colors0: IndividualColorsMap;
  curtains0: CurtainMap;
  special0: DoorSpecialMap;
  mirror0: MirrorLayoutMap;
  colors: IndividualColorsMap;
  curtains: CurtainMap;
  special: DoorSpecialMap;
  mirrorLayout: MirrorLayoutMap;
  ensureColors: () => IndividualColorsMap;
  ensureCurtains: () => CurtainMap;
  ensureSpecial: () => DoorSpecialMap;
  ensureMirrorLayout: () => MirrorLayoutMap;
};

export type PaintFlowChangeSummary = {
  colorsChanged: boolean;
  curtainsChanged: boolean;
  specialChanged: boolean;
  mirrorLayoutChanged: boolean;
  didChange: boolean;
  useNoBuildMaterialRefresh: boolean;
};

export function createPaintFlowMutableState(App: AppContainer): PaintFlowMutableState {
  const colors0 = readIndividualColorsMap(App);
  const curtains0 = readCurtainMap(App);
  const special0 = readDoorSpecialMap(App);
  const mirror0 = readMirrorLayoutConfigMap(App);

  let colors = colors0;
  let curtains = curtains0;
  let special = special0;
  let mirrorLayout = mirror0;

  return {
    App,
    colors0,
    curtains0,
    special0,
    mirror0,
    get colors() {
      return colors;
    },
    get curtains() {
      return curtains;
    },
    get special() {
      return special;
    },
    get mirrorLayout() {
      return mirrorLayout;
    },
    ensureColors: () => {
      if (Object.is(colors, colors0)) colors = cloneIndividualColorsMap(colors0);
      return colors;
    },
    ensureCurtains: () => {
      if (Object.is(curtains, curtains0)) curtains = cloneCurtainMap(curtains0);
      return curtains;
    },
    ensureSpecial: () => {
      if (Object.is(special, special0)) special = cloneDoorSpecialMap(special0);
      return special;
    },
    ensureMirrorLayout: () => {
      if (Object.is(mirrorLayout, mirror0)) mirrorLayout = cloneMirrorLayoutConfigMap(mirror0);
      return mirrorLayout;
    },
  };
}

export function summarizePaintFlowChanges(state: PaintFlowMutableState): PaintFlowChangeSummary {
  const colorsChanged = !sameFlatMap(state.colors0, state.colors);
  const curtainsChanged = !sameFlatMap(state.curtains0, state.curtains);
  const specialChanged = !sameFlatMap(state.special0, state.special);
  const mirrorLayoutChanged = !sameMirrorLayoutMap(state.mirror0, state.mirrorLayout);
  const didChange = colorsChanged || curtainsChanged || specialChanged || mirrorLayoutChanged;
  return {
    colorsChanged,
    curtainsChanged,
    specialChanged,
    mirrorLayoutChanged,
    didChange,
    useNoBuildMaterialRefresh:
      colorsChanged &&
      !curtainsChanged &&
      !specialChanged &&
      !mirrorLayoutChanged &&
      hasLiveMaterialRefresh(state.App),
  };
}
