// Project payload/schema typing (high-value boundary)
//
// Goal:
// - Give project load/save/schema code a stable typed surface.
// - Reuse named map types instead of ad-hoc loose bags.
// - Keep index signatures for future persisted fields without reintroducing legacy-load branches.

import type { UnknownRecord } from './common';
import type { SavedNote } from './notes';
import type { BoardMaterial, DoorMountMode, HandleType, WardrobeType } from './domain';
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
  doorMountMode?: DoorMountMode;

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

  baseType?: string;
  baseLegStyle?: string;
  baseLegColor?: string;
  basePlinthHeightCm?: number | string;
  baseLegHeightCm?: number | string;
  baseLegWidthCm?: number | string;
  slidingTracksColor?: 'black' | 'nickel' | string;
  structureSelection?: string;
  singleDoorPos?: string;
  doorStyle?: string;
  corniceType?: string;
  color?: string;
  customColor?: string;

  globalHandleType?: HandleType;
}

export interface ProjectTogglesLike extends UnknownRecord {
  showContents?: boolean;
  showHanger?: boolean;
  showDimensions?: boolean;
  globalClickMode?: boolean;
  internalDrawers?: boolean;
  notesEnabled?: boolean;
  multiColor?: boolean;
  grooves?: boolean;
  chestMode?: boolean;
  chestCommode?: boolean;
  splitDoors?: boolean;
  handleControl?: boolean;
  cornerMode?: boolean;
  removeDoors?: boolean;
  addCornice?: boolean;
  sketchMode?: boolean;
  hingeDirection?: boolean;
  lightingControl?: boolean;

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
