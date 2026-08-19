// Project payload/schema typing (high-value boundary)
//
// Goal:
// - Give project load/save/schema code a stable typed surface.
// - Reuse named map types instead of ad-hoc loose bags.
// - Keep index signatures for future persisted fields without reintroducing legacy-load branches.

import type { UnknownRecord } from './common';
import type { SavedNote } from './notes';
import type { BoardMaterial, DoorMountMode, DrawerRunnerType, HandleType, WardrobeType } from './domain';
import type {
  CurtainMap,
  DoorSpecialMap,
  DoorStyleMap,
  GroovesMap,
  GrooveLinesCountMap,
  GrooveLayoutMap,
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
  width?: number | undefined;
  height?: number | undefined;
  depth?: number | undefined;
  doors?: number | undefined;

  wardrobeType?: WardrobeType | undefined;
  boardMaterial?: BoardMaterial | undefined;
  doorMountMode?: DoorMountMode | undefined;
  drawerRunnerType?: DrawerRunnerType | undefined;

  stackSplitEnabled?: boolean | undefined;
  stackSplitDecorativeSeparatorEnabled?: boolean | undefined;
  stackSplitLowerHeight?: number | undefined;
  stackSplitLowerWidth?: number | undefined;
  stackSplitLowerDepth?: number | undefined;
  stackSplitLowerDoors?: number | undefined;
  stackSplitLowerWidthManual?: boolean | undefined;
  stackSplitLowerDepthManual?: boolean | undefined;
  stackSplitLowerDoorsManual?: boolean | undefined;

  cornerWidth?: number | undefined;
  cornerHeight?: number | undefined;
  cornerDepth?: number | undefined;
  cornerDoors?: number | undefined;
  cornerSide?: 'left' | 'right' | undefined;

  baseType?: string | undefined;
  baseLegStyle?: string | undefined;
  baseLegColor?: string | undefined;
  baseLegPlatformMode?: string | undefined;
  baseLegPlatformSideMode?: string | undefined;
  baseLegPlatformSideOverhangCm?: number | undefined;
  baseLegPlatformFrontOverhangCm?: number | undefined;
  stackSplitDecorativeSeparatorSideOverhangCm?: number | undefined;
  stackSplitDecorativeSeparatorFrontOverhangCm?: number | undefined;
  basePlinthHeightCm?: number | undefined;
  baseLegHeightCm?: number | undefined;
  baseLegWidthCm?: number | undefined;
  slidingTracksColor?: string | undefined;
  structureSelection?: string | undefined;
  singleDoorPos?: string | undefined;
  doorStyle?: string | undefined;
  corniceType?: string | undefined;
  color?: string | undefined;
  customColor?: string | undefined;

  globalHandleType?: HandleType | undefined;
}

export interface ProjectTogglesLike extends UnknownRecord {
  showContents?: boolean | undefined;
  showHanger?: boolean | undefined;
  showDimensions?: boolean | undefined;
  globalClickMode?: boolean | undefined;
  internalDrawers?: boolean | undefined;
  notesEnabled?: boolean | undefined;
  multiColor?: boolean | undefined;
  grooves?: boolean | undefined;
  chestMode?: boolean | undefined;
  chestCommode?: boolean | undefined;
  splitDoors?: boolean | undefined;
  handleControl?: boolean | undefined;
  cornerMode?: boolean | undefined;
  removeDoors?: boolean | undefined;
  addCornice?: boolean | undefined;
  sketchMode?: boolean | undefined;
  hingeDirection?: boolean | undefined;
  lightingControl?: boolean | undefined;

  lightAmb?: number | string | undefined;
  lightDir?: number | string | undefined;
  lightX?: number | string | undefined;
  lightY?: number | string | undefined;
  lightZ?: number | string | undefined;
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
  grooveLayoutMap?: GrooveLayoutMap;
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
