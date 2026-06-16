// Project payload/schema typing (high-value boundary)
//
// Goal:
// - Give project load/save/schema code a stable typed surface.
// - Reuse named map types instead of ad-hoc loose bags.
// - Keep index signatures for future persisted fields without reintroducing legacy-load branches.

import type { UnknownRecord } from './common';
import type { SavedNote } from './notes';
import type { BoardMaterial, DoorMountMode, HandleType, WardrobeType } from './domain';
import type { ToggleValue } from './maps';
import type {
  CurtainMap,
  DoorSpecialMap,
  DoorStyleMap,
  GroovesMap,
  GrooveLinesCountMap,
  HandlesMap,
  HingeMap,
  IndividualColorsMap,
  MirrorLayoutMap,
  DoorTrimMap,
  RemovedDoorsMap,
  RoundedFrameSideShelvesMap,
  SplitDoorsBottomMap,
  SplitDoorsMap,
} from './maps';

export type ProjectJsonScalarLike = string | number | boolean | null;
export type ProjectJsonLike = ProjectJsonScalarLike | ProjectJsonLike[] | { [key: string]: ProjectJsonLike };

export type ProjectSavedNotesLike = SavedNote[];
export type ProjectPreChestStateLike = UnknownRecord | null;
export type ProjectPdfDraftLike = ProjectJsonLike;

export interface ProjectFileLike extends Blob {
  name?: string;
}

export interface ProjectFileInputTargetLike extends UnknownRecord {
  files?: ArrayLike<ProjectFileLike> | null;
  value?: string;
}

export interface ProjectFileLoadEventLike extends UnknownRecord {
  target?: ProjectFileInputTargetLike | null;
}

export interface ProjectFileReaderTargetLike extends UnknownRecord {
  result?: string | ArrayBuffer | null;
}

export interface ProjectFileReaderEventLike extends UnknownRecord {
  target?: ProjectFileReaderTargetLike | null;
}

export interface ProjectSettingsLike extends UnknownRecord {
  width?: number;
  height?: number;
  depth?: number;
  doors?: number;

  wardrobeType?: WardrobeType;
  boardMaterial?: BoardMaterial;
  doorMountMode?: DoorMountMode | string;
  overlayFrameThicknessCm?: number | null;
  overlayShelfThicknessCm?: number | null;
  insetFrameThicknessCm?: number | null;
  insetShelfThicknessCm?: number | null;

  stackSplitEnabled?: boolean;
  stackSplitDecorativeSeparatorEnabled?: boolean;
  stackSplitLowerHeight?: number;
  stackSplitLowerWidth?: number;
  stackSplitLowerDepth?: number;
  stackSplitLowerDoors?: number;
  stackSplitLowerWidthManual?: boolean;
  stackSplitLowerDepthManual?: boolean;
  stackSplitLowerDoorsManual?: boolean;

  cornerWidth?: number;
  cornerHeight?: number;
  cornerDepth?: number;
  cornerDoors?: number;
  cornerSide?: 'left' | 'right';

  projectName?: string;
  baseType?: string;
  baseLegStyle?: string;
  baseLegColor?: string;
  basePlinthHeightCm?: number | string;
  baseLegHeightCm?: number | string;
  slidingTracksColor?: 'black' | 'nickel' | string;
  structureSelection?: string;
  singleDoorPos?: string;
  doorStyle?: string;
  corniceType?: string;
  color?: string;
  customColor?: string;

  lightAmb?: number | string;
  lightDir?: number | string;
  lightX?: number | string;
  lightY?: number | string;
  lightZ?: number | string;

  chestDrawersCount?: number | string;
  chestCommodeMirrorHeightCm?: number | string;
  chestCommodeMirrorWidthCm?: number | string;
  chestCommodeMirrorWidthManual?: boolean;

  globalHandleType?: HandleType | string | null;
  isLibraryMode?: boolean;
  preChestState?: ProjectPreChestStateLike;
  grooveLinesCount?: number | null;
}

export interface ProjectTogglesLike extends UnknownRecord {
  showContents?: ToggleValue;
  showHanger?: ToggleValue;
  showDimensions?: ToggleValue;
  globalClickMode?: ToggleValue;
  internalDrawers?: ToggleValue;
  notesEnabled?: ToggleValue;
  multiColor?: ToggleValue;
  grooves?: ToggleValue;
  chestMode?: ToggleValue;
  chestCommode?: ToggleValue;
  splitDoors?: ToggleValue;
  handleControl?: ToggleValue;
  cornerMode?: ToggleValue;
  removeDoors?: ToggleValue;
  addCornice?: ToggleValue;
  sketchMode?: ToggleValue;
  hingeDirection?: ToggleValue;
  lightingControl?: ToggleValue;

  lightAmb?: number | string;
  lightDir?: number | string;
  lightX?: number | string;
  lightY?: number | string;
  lightZ?: number | string;
}

export interface ProjectPdfStateLike extends UnknownRecord {
  orderPdfEditorDraft?: ProjectPdfDraftLike | null;
  orderPdfEditorZoom?: number;
}

export interface ProjectMapsLike extends UnknownRecord {
  splitDoorsMap?: SplitDoorsMap;
  splitDoorsBottomMap?: SplitDoorsBottomMap;
  handlesMap?: HandlesMap;
  hingeMap?: HingeMap;
  removedDoorsMap?: RemovedDoorsMap;
  roundedFrameSideShelvesMap?: RoundedFrameSideShelvesMap;
  curtainMap?: CurtainMap;
  groovesMap?: GroovesMap;
  grooveLinesCountMap?: GrooveLinesCountMap;
  individualColors?: IndividualColorsMap;
  doorSpecialMap?: DoorSpecialMap;
  doorStyleMap?: DoorStyleMap;
  mirrorLayoutMap?: MirrorLayoutMap;
  doorTrimMap?: DoorTrimMap;
}

export interface ProjectSchemaValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
