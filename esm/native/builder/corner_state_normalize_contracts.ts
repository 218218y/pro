import type {
  BuilderContentsRenderPolicy,
  ConfigStateLike,
  RemovedDoorsMap,
  UnknownRecord,
} from '../../../types/index.js';
import type {
  BaseLegColor,
  BaseLegPlatformMode,
  BaseLegPlatformSideMode,
  BaseLegStyle,
} from '../features/base_leg_support.js';

export type CornerBuildMeta = {
  stackKey?: 'top' | 'bottom';
  baseType?: unknown;
  baseLegStyle?: unknown;
  baseLegColor?: unknown;
  basePlinthHeightCm?: unknown;
  baseLegHeightCm?: unknown;
  baseLegWidthCm?: unknown;
  baseLegPlatformMode?: unknown;
  baseLegPlatformSideMode?: unknown;
  baseLegPlatformSideOverhangCm?: unknown;
  baseLegPlatformFrontOverhangCm?: unknown;
  stackSplitEnabled?: boolean;
  stackSplitUnifiedFrame?: boolean;
  stackOffsetZ?: number;
  shelfThick?: unknown;
  snapshot: {
    ui: UnknownRecord;
    cfg: ConfigStateLike | UnknownRecord;
    primaryMode: string;
    renderPolicy: BuilderContentsRenderPolicy;
  };
  [k: string]: unknown;
};

export type CornerBuildUI = UnknownRecord & {
  cornerConnectorAsStandaloneCabinet?: boolean;
  cornerCabinetFrontPanel?: boolean;
  cornerCabinetOffsetXcm?: number;
  cornerCabinetOffsetZcm?: number;
  cornerCabinetWallLenCm?: number;
  cornerWidth?: unknown;
  cornerSide?: 'left' | 'right';
  cornerDoors?: unknown;
  cornerHeight?: unknown;
  cornerDepth?: unknown;
  removeDoorsEnabled?: boolean;
  corniceType?: string;
  baseType?: unknown;
  baseLegStyle?: unknown;
  baseLegColor?: unknown;
  basePlinthHeightCm?: unknown;
  baseLegHeightCm?: unknown;
  baseLegWidthCm?: unknown;
  baseLegPlatformMode?: unknown;
  baseLegPlatformSideMode?: unknown;
  baseLegPlatformSideOverhangCm?: unknown;
  baseLegPlatformFrontOverhangCm?: unknown;
  layout?: unknown;
  doorStyle?: string;
  splitDoors?: boolean;
  groovesEnabled?: boolean;
  internalDrawersEnabled?: boolean;
  showHanger?: boolean;
  showContents?: boolean;
  hasCornice?: boolean;
};

export type CornerConfigRecord = UnknownRecord & {
  customData?: UnknownRecord & {
    shelves?: unknown[];
    rods?: unknown[];
    storage?: boolean;
  };
  stackSplitLower?: UnknownRecord | null;
};

export type NormalizedCornerWingState = {
  uiAny: CornerBuildUI;
  __sketchMode: boolean;
  __primaryMode: string;
  __stackKey: 'top' | 'bottom';
  __stackSplitEnabled: boolean;
  __stackSplitUnifiedFrame: boolean;
  __stackOffsetZ: number;
  __mirrorX: 1 | -1;
  cornerSide: 'left' | 'right';
  cornerConnectorEnabled: boolean;
  wingLengthCM: number;
  wingW: number;
  wingH: number;
  wingD: number;
  shelfThick: number;
  blindWidth: number;
  activeWidth: number;
  activeFaceCenter: number;
  removeDoorsEnabled: boolean;
  doorStyle: string;
  splitDoors: boolean;
  groovesEnabled: boolean;
  internalDrawersEnabled: boolean;
  showHangerEnabled: boolean;
  showContentsEnabled: boolean;
  hasCorniceEnabled: boolean;
  __corniceAllowedForThisStack: boolean;
  __corniceTypeNorm: string;
  __cfg: ConfigStateLike;
  config: CornerConfigRecord;
  __removedDoorsMap: RemovedDoorsMap;
  __stackScopePartKey: (partId: unknown) => string;
  __isDoorRemoved: (partId: unknown) => boolean;
  baseType: string;
  baseLegStyle: BaseLegStyle;
  baseLegColor: BaseLegColor;
  basePlinthHeightCm: number;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  baseLegHeightM: number;
  baseLegPlatformMode: BaseLegPlatformMode;
  baseLegPlatformSideMode: BaseLegPlatformSideMode;
  baseLegPlatformSideOverhangM: number;
  baseLegPlatformFrontOverhangM: number;
  baseLegBottomPlatformHeightM: number;
  baseLegTopPlatformHeightM: number;
  baseH: number;
  stackOffsetY: number;
  cabinetBodyHeight: number;
  cornerWallL: number;
  cornerOX: number;
  cornerOZ: number;
  roomCornerX: number;
  roomCornerZ: number;
  wingStartX: number;
  wingStartZ: number;
  wingRotationY: number;
  wingScaleX: number;
};
