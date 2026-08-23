// Closed runtime key registries for the public state mutation boundary.
//
// These arrays are intentionally runtime values (not documentation snapshots):
// the kernel public PATCH decoder consumes them, while the type assertions below
// make key drift a compile error.

import type { ConfigStateLike, RuntimeStateLike } from './build';
import type { KnownMapName } from './maps';
import type { UiState } from './ui_state';
import type { UiRawInputsLike } from './ui_raw';

export type PublicConfigDataKey = Exclude<
  keyof ConfigStateLike,
  KnownMapName | '__snapshot' | '__capturedAt'
>;

export const PUBLIC_ROOT_PATCH_KEYS = ['ui', 'config', 'runtime', 'mode', 'meta'] as const;

export const PUBLIC_UI_PATCH_KEYS = [
  'raw',
  'activeTab',
  'projectName',
  'selectedModelId',
  'width',
  'height',
  'depth',
  'doors',
  'color',
  'site2TabsGateOpen',
  'site2TabsGateUntil',
  'site2TabsGateBy',
  'doorStyle',
  'colorChoice',
  'frontColorShelfInheritanceMode',
  'customColor',
  'groovesEnabled',
  'splitDoors',
  'removeDoorsEnabled',
  'hasCornice',
  'corniceType',
  'currentCurtainChoice',
  'grooveManualEnabled',
  'currentGrooveDraftHeightCm',
  'currentGrooveDraftWidthCm',
  'currentGrooveOrientation',
  'currentMirrorDraftHeightCm',
  'currentMirrorDraftWidthCm',
  'currentLayoutType',
  'currentGridDivisions',
  'currentGridShelfVariant',
  'currentExtDrawerType',
  'currentExtDrawerCount',
  'internalDrawersEnabled',
  'handleControl',
  'currentHandleToolType',
  'currentHandleToolColor',
  'currentHandleToolEdgeVariant',
  'perCellGridMap',
  'activeGridCellId',
  'notesEnabled',
  'showHanger',
  'showContents',
  'showDimensions',
  'autosaveInfo',
  'noMainSketchRestoreSnapshot',
  'noMainSketchFreeExtrasSnapshot',
  'baseType',
  'shoeDrawerAutoBasePreviousType',
  'baseLegStyle',
  'baseLegColor',
  'baseLegPlatformMode',
  'baseLegPlatformSideMode',
  'baseLegPlatformSideOverhangCm',
  'baseLegPlatformFrontOverhangCm',
  'basePlinthHeightCm',
  'baseLegHeightCm',
  'baseLegWidthCm',
  'slidingTracksColor',
  'structureSelect',
  'singleDoorPos',
  'hingeDirection',
  'isChestMode',
  'chestCommodeEnabled',
  'chestCommodeMirrorWidthManual',
  'libraryUpperDoorsHidden',
  'cornerMode',
  'cornerSide',
  'cornerWidth',
  'cornerDoors',
  'cornerHeight',
  'cornerDepth',
  'cornerCabinetWallLenCm',
  'stackSplitEnabled',
  'stackSplitDecorativeSeparatorEnabled',
  'stackSplitDecorativeSeparatorSideOverhangCm',
  'stackSplitDecorativeSeparatorFrontOverhangCm',
  'cellDimsPanelOpen',
  'cellDimsHexPanelOpen',
  'sketchMode',
  'globalClickMode',
  'darkMode',
  'multiColorEnabled',
  'lightingControl',
  'currentFloorType',
  'lastSelectedFloorStyleIdByType',
  'lastSelectedWallColor',
  'lastLightPreset',
  'lightAmb',
  'lightDir',
  'lightX',
  'lightY',
  'lightZ',
  'orderPdfEditorOpen',
  'orderPdfEditorZoom',
  'orderPdfEditorDraft',
] as const satisfies readonly (keyof UiState)[];

const PUBLIC_UI_PATCH_KEY_SET = new Set<string>(PUBLIC_UI_PATCH_KEYS);

export function isPublicUiPatchKey(key: unknown): key is keyof UiState {
  return typeof key === 'string' && PUBLIC_UI_PATCH_KEY_SET.has(key);
}

export const PUBLIC_UI_RAW_PATCH_KEYS = [
  'width',
  'height',
  'depth',
  'doors',
  'structureSelect',
  'singleDoorPos',
  'chestDrawersCount',
  'chestCommodeMirrorHeightCm',
  'chestCommodeMirrorWidthCm',
  'chestCommodeMirrorWidthManual',
  'stackSplitLowerHeight',
  'stackSplitLowerDepth',
  'stackSplitLowerWidth',
  'stackSplitLowerDoors',
  'stackSplitLowerDepthManual',
  'stackSplitLowerWidthManual',
  'stackSplitLowerDoorsManual',
  'cornerWidth',
  'cornerHeight',
  'cornerDepth',
  'cornerDoors',
  'cellDimsWidth',
  'cellDimsHeight',
  'cellDimsDepth',
  'cellDimsHexMode',
  'cellDimsHexProtrusion',
  'cellDimsHexDoorWidth',
] as const satisfies readonly (keyof UiRawInputsLike)[];

export const PUBLIC_RUNTIME_PATCH_KEYS = [
  'sketchMode',
  'globalClickMode',
  'doorsOpen',
  'doorsLastToggleTime',
  'drawersOpenId',
  'restoring',
  'systemReady',
  'roomDesignActive',
  'notesPicking',
  'failFast',
  'verboseConsoleErrors',
  'verboseConsoleErrorsDedupeMs',
  'debug',
  'paintColor',
  'handlesType',
  'interiorManualTool',
  'pendingGrooveLinesCountMap',
  'wardrobeWidthM',
  'wardrobeHeightM',
  'wardrobeDepthM',
  'wardrobeDoorsCount',
  'wardrobeTypeProfiles',
] as const satisfies readonly (keyof RuntimeStateLike)[];

export const PUBLIC_CONFIG_PATCH_KEYS = [
  'modulesConfiguration',
  'stackSplitLowerModulesConfiguration',
  'savedColors',
  'colorSwatchesOrder',
  'savedNotes',
  'cornerConfiguration',
  'isLibraryMode',
  'wardrobeType',
  'globalHandleType',
  'isMultiColorMode',
  'showDimensions',
  'MIRROR_REFLECTOR_ENABLED',
  'isManualWidth',
  'boardMaterial',
  'doorMountMode',
  'drawerRunnerType',
  'overlayFrameThicknessCm',
  'overlayShelfThicknessCm',
  'insetFrameThicknessCm',
  'insetShelfThicknessCm',
  'customUploadedDataURL',
  'grooveLinesCount',
  'preChestState',
  'roomArchitecture',
] as const satisfies readonly PublicConfigDataKey[];

export const PUBLIC_MODE_PATCH_KEYS = ['primary', 'opts'] as const;
export const PUBLIC_META_PATCH_KEYS = ['dirty'] as const;

type AssertNoMissing<T> = [T] extends [never] ? true : never;
const UI_PATCH_KEYS_COMPLETE: AssertNoMissing<Exclude<keyof UiState, (typeof PUBLIC_UI_PATCH_KEYS)[number]>> =
  true;
const UI_RAW_PATCH_KEYS_COMPLETE: AssertNoMissing<
  Exclude<keyof UiRawInputsLike, (typeof PUBLIC_UI_RAW_PATCH_KEYS)[number]>
> = true;
const RUNTIME_PATCH_KEYS_COMPLETE: AssertNoMissing<
  Exclude<keyof RuntimeStateLike, (typeof PUBLIC_RUNTIME_PATCH_KEYS)[number]>
> = true;
const CONFIG_PATCH_KEYS_COMPLETE: AssertNoMissing<
  Exclude<PublicConfigDataKey, (typeof PUBLIC_CONFIG_PATCH_KEYS)[number]>
> = true;

void UI_PATCH_KEYS_COMPLETE;
void UI_RAW_PATCH_KEYS_COMPLETE;
void RUNTIME_PATCH_KEYS_COMPLETE;
void CONFIG_PATCH_KEYS_COMPLETE;
