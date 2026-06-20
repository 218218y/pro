// Shared corner-ops helpers.
//
// Keep tiny shared runtime seams here so the heavy connector/wing emitters can
// stay focused on geometry/material policy rather than mode-store probing.

import type { AppContainer, Object3DLike, ThreeLike, UnknownCallable, UnknownRecord } from '../../../types';

type CornerWingMaterialsResult = ReturnType<typeof import('./corner_materials.js').createCornerWingMaterials>;

type ShadowNodeLike = Object3DLike & {
  castShadow?: boolean;
  receiveShadow?: boolean;
  isMesh?: boolean;
  material?: { transparent?: boolean; opacity?: number } | null | undefined;
  traverse?: (fn: (obj: ShadowNodeLike) => void) => void;
};

export interface CornerOpsEmitContext extends UnknownRecord {
  App: AppContainer;
  THREE: ThreeLike;
  mainW: number;
  mainH: number;
  mainD: number;
  woodThick: number;
  shelfThick: number;
  startY: number;
  wingH: number;
  wingD: number;
  wingW: number;
  activeWidth: number;
  blindWidth: number;
  uiAny: UnknownRecord;
  cornerWallL: number;
  roomCornerX: number;
  roomCornerZ: number;
  __mirrorX: number;
  __stackKey: string;
  __stackSplitEnabled: boolean;
  __stackSplitUnifiedFrame: boolean;
  __stackOffsetZ: number;
  stackOffsetY: number;
  baseType: string;
  baseLegStyle: string;
  baseLegColor: string;
  basePlinthHeightCm: number;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  baseH: number;
  cabinetBodyHeight: number;
  cornerConnectorEnabled: boolean;
  __corniceAllowedForThisStack: boolean;
  __corniceTypeNorm: string;
  __cfg: unknown;
  config: unknown;
  __stackScopePartKey: (partId: unknown) => string;
  __handlesMap: unknown;
  __doorSpecialMap: unknown;
  __individualColors: Record<string, unknown>;
  doorStyle: string;
  getMap: (name: string) => unknown;
  getGroove: (partId: string) => unknown;
  getCurtain: (partId: string) => unknown;
  backPanelMaterialArray: unknown[];
  bodyMat: unknown;
  frontMat: unknown;
  wingGroup: Object3DLike;
  __isDoorRemoved: (partId: unknown) => boolean;
  __readScopedMapVal: CornerWingMaterialsResult['readScopedMapVal'];
  __readScopedReader: CornerWingMaterialsResult['readScopedReader'];
  __getMirrorMat: CornerWingMaterialsResult['getMirrorMat'];
  __resolveSpecial: CornerWingMaterialsResult['resolveSpecial'];
  getCornerMat: CornerWingMaterialsResult['getCornerMat'];
  getCornerShelfMat: CornerWingMaterialsResult['getCornerShelfMat'];
  defaultShelfMat: CornerWingMaterialsResult['defaultShelfMat'];
  braceShelfMat: CornerWingMaterialsResult['braceShelfMat'];
  addOutlines: (obj: unknown) => unknown;
  getMaterial: UnknownCallable;
  __applyStableShadowsToModule: (obj: ShadowNodeLike | null | undefined) => void;
  __sketchMode: boolean;
  __primaryMode: string;
  [k: string]: unknown;
}
