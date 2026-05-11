import type { normalizeCornerWingState } from './corner_state_normalize.js';
import type { createCornerWingMaterials } from './corner_materials.js';
import type { resolveCornerWingServices } from './corner_wing_runtime.js';
import type { CornerOpsEmitContext } from './corner_ops_emit_common.js';

export function createCornerWingEmitContext(args: {
  App: CornerOpsEmitContext['App'];
  THREE: CornerOpsEmitContext['THREE'];
  mainW: number;
  mainH: number;
  mainD: number;
  woodThick: number;
  startY: number;
  state: ReturnType<typeof normalizeCornerWingState>;
  mats: ReturnType<typeof createCornerWingMaterials>;
  services: ReturnType<typeof resolveCornerWingServices> & {
    __applyStableShadowsToModule: CornerOpsEmitContext['__applyStableShadowsToModule'];
  };
  readers: {
    getMap: CornerOpsEmitContext['getMap'];
    getGroove: CornerOpsEmitContext['getGroove'];
    getCurtain: CornerOpsEmitContext['getCurtain'];
  };
  wingGroup: CornerOpsEmitContext['wingGroup'];
}): CornerOpsEmitContext {
  const { App, THREE, mainW, mainH, mainD, woodThick, startY, state, mats, services, readers, wingGroup } =
    args;

  return {
    App,
    THREE,
    mainW,
    mainH,
    mainD,
    woodThick,
    startY,

    uiAny: state.uiAny,
    __sketchMode: state.__sketchMode,
    __stackKey: state.__stackKey,
    __stackSplitEnabled: state.__stackSplitEnabled,
    __stackOffsetZ: state.__stackOffsetZ,
    __mirrorX: state.__mirrorX,
    cornerSide: state.cornerSide,
    cornerConnectorEnabled: state.cornerConnectorEnabled,
    wingLengthCM: state.wingLengthCM,
    wingW: state.wingW,
    wingH: state.wingH,
    wingD: state.wingD,
    blindWidth: state.blindWidth,
    activeWidth: state.activeWidth,
    activeFaceCenter: state.activeFaceCenter,
    removeDoorsEnabled: state.removeDoorsEnabled,
    doorStyle: state.doorStyle,
    splitDoors: state.splitDoors,
    groovesEnabled: state.groovesEnabled,
    internalDrawersEnabled: state.internalDrawersEnabled,
    showHangerEnabled: state.showHangerEnabled,
    showContentsEnabled: state.showContentsEnabled,
    hasCorniceEnabled: state.hasCorniceEnabled,
    __corniceAllowedForThisStack: state.__corniceAllowedForThisStack,
    __corniceTypeNorm: state.__corniceTypeNorm,
    __cfg: state.__cfg,
    config: state.config,
    __removedDoorsMap: state.__removedDoorsMap,
    __stackScopePartKey: state.__stackScopePartKey,
    __isDoorRemoved: state.__isDoorRemoved,
    baseType: state.baseType,
    baseLegStyle: state.baseLegStyle,
    baseLegColor: state.baseLegColor,
    basePlinthHeightCm: state.basePlinthHeightCm,
    baseLegHeightCm: state.baseLegHeightCm,
    baseLegWidthCm: state.baseLegWidthCm,
    baseH: state.baseH,
    stackOffsetY: state.stackOffsetY,
    cabinetBodyHeight: state.cabinetBodyHeight,
    cornerWallL: state.cornerWallL,
    cornerOX: state.cornerOX,
    cornerOZ: state.cornerOZ,
    roomCornerX: state.roomCornerX,
    roomCornerZ: state.roomCornerZ,

    getMap: readers.getMap,
    getGroove: readers.getGroove,
    getCurtain: readers.getCurtain,

    masoniteMat: mats.masoniteMat,
    whiteMat: mats.whiteMat,
    shadowMat: mats.shadowMat,
    backPanelMaterialArray: mats.backPanelMaterialArray,
    ghostDoorMat: mats.ghostDoorMat,
    __individualColors: mats.individualColors,
    __handlesMap: mats.handlesMap,
    __doorSpecialMap: mats.doorSpecialMap,
    __readScopedMapVal: mats.readScopedMapVal,
    __readScopedReader: mats.readScopedReader,
    __getMirrorMat: mats.getMirrorMat,
    __resolveSpecial: mats.resolveSpecial,
    getCornerMat: mats.getCornerMat,
    bodyMat: mats.bodyMat,
    frontMat: mats.frontMat,

    addOutlines: services.addOutlines,
    createDoorVisual: services.createDoorVisual,
    getMaterial: services.getMaterial,
    createInternalDrawerBox: services.createInternalDrawerBox,
    addRealisticHanger: services.addRealisticHanger,
    addHangingClothes: services.addHangingClothes,
    addFoldedClothes: services.addFoldedClothes,
    __applyStableShadowsToModule: services.__applyStableShadowsToModule,

    wingGroup,
  };
}
