import type {
  AppContainer,
  CurtainMap,
  DoorSpecialMap,
  DoorStyleMap,
  IndividualColorsMap,
  MirrorLayoutMap,
} from '../../../types';

import {
  cloneCurtainMap,
  cloneDoorSpecialMap,
  cloneDoorStyleMap,
  cloneIndividualColorsMap,
  cloneMirrorLayoutConfigMap,
  hasLiveMaterialRefresh,
  readCurtainMap,
  readDoorSpecialMap,
  readDoorStyleConfigMap,
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
  style0: DoorStyleMap;
  mirror0: MirrorLayoutMap;
  colors: IndividualColorsMap;
  curtains: CurtainMap;
  special: DoorSpecialMap;
  style: DoorStyleMap;
  mirrorLayout: MirrorLayoutMap;
  ensureColors: () => IndividualColorsMap;
  ensureCurtains: () => CurtainMap;
  ensureSpecial: () => DoorSpecialMap;
  ensureStyle: () => DoorStyleMap;
  ensureMirrorLayout: () => MirrorLayoutMap;
};

export type PaintFlowChangeSummary = {
  colorsChanged: boolean;
  curtainsChanged: boolean;
  specialChanged: boolean;
  styleChanged: boolean;
  mirrorLayoutChanged: boolean;
  didChange: boolean;
  useNoBuildMaterialRefresh: boolean;
};

export function createPaintFlowMutableState(App: AppContainer): PaintFlowMutableState {
  const colors0 = readIndividualColorsMap(App);
  const curtains0 = readCurtainMap(App);
  const special0 = readDoorSpecialMap(App);
  const style0 = readDoorStyleConfigMap(App);
  const mirror0 = readMirrorLayoutConfigMap(App);

  let colors = colors0;
  let curtains = curtains0;
  let special = special0;
  let style = style0;
  let mirrorLayout = mirror0;

  return {
    App,
    colors0,
    curtains0,
    special0,
    style0,
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
    get style() {
      return style;
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
    ensureStyle: () => {
      if (Object.is(style, style0)) style = cloneDoorStyleMap(style0);
      return style;
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
  const styleChanged = !sameFlatMap(state.style0, state.style);
  const mirrorLayoutChanged = !sameMirrorLayoutMap(state.mirror0, state.mirrorLayout);
  const didChange = colorsChanged || curtainsChanged || specialChanged || styleChanged || mirrorLayoutChanged;
  return {
    colorsChanged,
    curtainsChanged,
    specialChanged,
    styleChanged,
    mirrorLayoutChanged,
    didChange,
    useNoBuildMaterialRefresh:
      colorsChanged &&
      !curtainsChanged &&
      !specialChanged &&
      !styleChanged &&
      !mirrorLayoutChanged &&
      hasLiveMaterialRefresh(state.App),
  };
}
