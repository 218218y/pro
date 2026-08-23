import type {
  ConfigStateLike,
  RootSliceKey,
  RuntimeStateLike,
  StoreChangeDomainKey,
  UiRawInputsLike,
  UiState,
} from '../../../types';

import { asRecordOrEmpty, hasOwn, storeValueEqual } from './store_shared.js';

export type StoreChangedKeys = Readonly<Partial<Record<RootSliceKey, readonly string[]>>>;

export type StoreDomainClassification = Readonly<{
  domains: readonly StoreChangeDomainKey[];
  broad: boolean;
  changedKeys: readonly string[];
}>;

type DomainList = readonly StoreChangeDomainKey[];
type ChangeCompareMode = 'reference' | 'semantic';

const STRUCTURE: DomainList = ['structure'];
const INTERIOR: DomainList = ['interior'];
const APPEARANCE: DomainList = ['appearance'];
const ROOM: DomainList = ['room'];
const VISIBILITY: DomainList = ['visibility'];
const INTERACTION: DomainList = ['interaction'];
const NAVIGATION: DomainList = ['navigation'];
const PROJECT_DATA: DomainList = ['project-data'];
const RUNTIME_LIFECYCLE: DomainList = ['runtime-lifecycle'];
const META: DomainList = ['meta'];

const STRUCTURE_INTERIOR: DomainList = ['structure', 'interior'];
const STRUCTURE_APPEARANCE: DomainList = ['structure', 'appearance'];
const INTERIOR_APPEARANCE: DomainList = ['interior', 'appearance'];
const APPEARANCE_VISIBILITY: DomainList = ['appearance', 'visibility'];
const PROJECT_VISIBILITY: DomainList = ['project-data', 'visibility'];
const ROOM_APPEARANCE: DomainList = ['room', 'appearance'];

const UI_DOMAIN_BY_KEY = {
  raw: STRUCTURE,
  activeTab: NAVIGATION,
  projectName: PROJECT_DATA,
  selectedModelId: PROJECT_DATA,
  width: STRUCTURE,
  height: STRUCTURE,
  depth: STRUCTURE,
  doors: STRUCTURE,
  color: APPEARANCE,
  site2TabsGateOpen: NAVIGATION,
  site2TabsGateUntil: NAVIGATION,
  site2TabsGateBy: NAVIGATION,
  doorStyle: APPEARANCE,
  colorChoice: APPEARANCE,
  frontColorShelfInheritanceMode: APPEARANCE,
  customColor: APPEARANCE,
  groovesEnabled: APPEARANCE,
  splitDoors: APPEARANCE,
  removeDoorsEnabled: APPEARANCE,
  hasCornice: APPEARANCE,
  corniceType: APPEARANCE,
  currentCurtainChoice: APPEARANCE,
  grooveManualEnabled: APPEARANCE,
  currentGrooveDraftHeightCm: APPEARANCE,
  currentGrooveDraftWidthCm: APPEARANCE,
  currentGrooveOrientation: APPEARANCE,
  currentMirrorDraftHeightCm: APPEARANCE,
  currentMirrorDraftWidthCm: APPEARANCE,
  currentLayoutType: INTERIOR,
  currentGridDivisions: INTERIOR,
  currentGridShelfVariant: INTERIOR,
  currentExtDrawerType: INTERIOR,
  currentExtDrawerCount: INTERIOR,
  internalDrawersEnabled: INTERIOR,
  handleControl: INTERIOR,
  currentHandleToolType: INTERIOR_APPEARANCE,
  currentHandleToolColor: INTERIOR_APPEARANCE,
  currentHandleToolEdgeVariant: INTERIOR_APPEARANCE,
  perCellGridMap: INTERIOR,
  activeGridCellId: INTERACTION,
  notesEnabled: PROJECT_VISIBILITY,
  showHanger: VISIBILITY,
  showContents: VISIBILITY,
  showDimensions: VISIBILITY,
  autosaveInfo: PROJECT_DATA,
  noMainSketchRestoreSnapshot: PROJECT_DATA,
  noMainSketchFreeExtrasSnapshot: PROJECT_DATA,
  baseType: STRUCTURE,
  shoeDrawerAutoBasePreviousType: STRUCTURE,
  baseLegStyle: STRUCTURE_APPEARANCE,
  baseLegColor: STRUCTURE_APPEARANCE,
  baseLegPlatformMode: STRUCTURE,
  baseLegPlatformSideMode: STRUCTURE,
  baseLegPlatformSideOverhangCm: STRUCTURE,
  baseLegPlatformFrontOverhangCm: STRUCTURE,
  basePlinthHeightCm: STRUCTURE,
  baseLegHeightCm: STRUCTURE,
  baseLegWidthCm: STRUCTURE,
  slidingTracksColor: STRUCTURE_APPEARANCE,
  structureSelect: STRUCTURE,
  singleDoorPos: STRUCTURE,
  hingeDirection: STRUCTURE,
  isChestMode: STRUCTURE_INTERIOR,
  chestCommodeEnabled: STRUCTURE,
  chestCommodeMirrorWidthManual: STRUCTURE,
  libraryUpperDoorsHidden: STRUCTURE,
  cornerMode: STRUCTURE,
  cornerSide: STRUCTURE,
  cornerWidth: STRUCTURE,
  cornerDoors: STRUCTURE,
  cornerHeight: STRUCTURE,
  cornerDepth: STRUCTURE,
  cornerCabinetWallLenCm: STRUCTURE,
  stackSplitEnabled: STRUCTURE,
  stackSplitDecorativeSeparatorEnabled: STRUCTURE_APPEARANCE,
  stackSplitDecorativeSeparatorSideOverhangCm: STRUCTURE,
  stackSplitDecorativeSeparatorFrontOverhangCm: STRUCTURE,
  cellDimsPanelOpen: STRUCTURE_INTERIOR,
  cellDimsHexPanelOpen: STRUCTURE_INTERIOR,
  sketchMode: INTERACTION,
  globalClickMode: INTERACTION,
  darkMode: APPEARANCE,
  multiColorEnabled: APPEARANCE,
  lightingControl: ROOM,
  currentFloorType: ROOM_APPEARANCE,
  lastSelectedFloorStyleIdByType: ROOM_APPEARANCE,
  lastSelectedWallColor: ROOM_APPEARANCE,
  lastLightPreset: ROOM_APPEARANCE,
  lightAmb: ROOM_APPEARANCE,
  lightDir: ROOM_APPEARANCE,
  lightX: ROOM,
  lightY: ROOM,
  lightZ: ROOM,
  orderPdfEditorOpen: NAVIGATION,
  orderPdfEditorZoom: PROJECT_DATA,
  orderPdfEditorDraft: PROJECT_DATA,
} satisfies Record<keyof UiState, DomainList>;

const UI_RAW_DOMAIN_BY_KEY = {
  width: STRUCTURE,
  height: STRUCTURE,
  depth: STRUCTURE,
  doors: STRUCTURE,
  structureSelect: STRUCTURE,
  singleDoorPos: STRUCTURE,
  chestDrawersCount: STRUCTURE,
  chestCommodeMirrorHeightCm: STRUCTURE,
  chestCommodeMirrorWidthCm: STRUCTURE,
  chestCommodeMirrorWidthManual: STRUCTURE,
  stackSplitLowerHeight: STRUCTURE,
  stackSplitLowerDepth: STRUCTURE,
  stackSplitLowerWidth: STRUCTURE,
  stackSplitLowerDoors: STRUCTURE,
  stackSplitLowerDepthManual: STRUCTURE,
  stackSplitLowerWidthManual: STRUCTURE,
  stackSplitLowerDoorsManual: STRUCTURE,
  cornerWidth: STRUCTURE,
  cornerHeight: STRUCTURE,
  cornerDepth: STRUCTURE,
  cornerDoors: STRUCTURE,
  cellDimsWidth: STRUCTURE_INTERIOR,
  cellDimsHeight: STRUCTURE_INTERIOR,
  cellDimsDepth: STRUCTURE_INTERIOR,
  cellDimsHexMode: STRUCTURE_INTERIOR,
  cellDimsHexProtrusion: STRUCTURE_INTERIOR,
  cellDimsHexDoorWidth: STRUCTURE_INTERIOR,
} satisfies Record<keyof UiRawInputsLike, DomainList>;

const CONFIG_DOMAIN_BY_KEY = {
  __snapshot: PROJECT_DATA,
  __capturedAt: PROJECT_DATA,
  modulesConfiguration: STRUCTURE_INTERIOR,
  stackSplitLowerModulesConfiguration: STRUCTURE_INTERIOR,
  savedColors: APPEARANCE,
  colorSwatchesOrder: APPEARANCE,
  savedNotes: PROJECT_DATA,
  individualColors: APPEARANCE,
  doorSpecialMap: STRUCTURE_APPEARANCE,
  doorStyleMap: APPEARANCE,
  mirrorLayoutMap: APPEARANCE,
  cornerConfiguration: STRUCTURE_INTERIOR,
  isLibraryMode: STRUCTURE,
  wardrobeType: ['structure', 'interior', 'appearance'],
  globalHandleType: INTERIOR_APPEARANCE,
  isMultiColorMode: APPEARANCE,
  showDimensions: VISIBILITY,
  MIRROR_REFLECTOR_ENABLED: APPEARANCE_VISIBILITY,
  isManualWidth: STRUCTURE,
  boardMaterial: STRUCTURE_APPEARANCE,
  doorMountMode: STRUCTURE_APPEARANCE,
  drawerRunnerType: INTERIOR,
  overlayFrameThicknessCm: STRUCTURE_APPEARANCE,
  overlayShelfThicknessCm: STRUCTURE_INTERIOR,
  insetFrameThicknessCm: STRUCTURE_APPEARANCE,
  insetShelfThicknessCm: STRUCTURE_INTERIOR,
  customUploadedDataURL: APPEARANCE,
  grooveLinesCount: APPEARANCE,
  preChestState: STRUCTURE,
  groovesMap: APPEARANCE,
  grooveLinesCountMap: APPEARANCE,
  grooveLayoutMap: APPEARANCE,
  splitDoorsMap: APPEARANCE,
  splitDoorsBottomMap: APPEARANCE,
  removedDoorsMap: STRUCTURE_APPEARANCE,
  roundedFrameSideShelvesMap: STRUCTURE_INTERIOR,
  drawerDividersMap: INTERIOR,
  handlesMap: INTERIOR_APPEARANCE,
  hingeMap: STRUCTURE,
  curtainMap: APPEARANCE,
  doorTrimMap: INTERIOR_APPEARANCE,
  roomArchitecture: ROOM,
} satisfies Record<keyof ConfigStateLike, DomainList>;

const RUNTIME_DOMAIN_BY_KEY = {
  sketchMode: INTERACTION,
  globalClickMode: INTERACTION,
  doorsOpen: VISIBILITY,
  doorsLastToggleTime: INTERACTION,
  drawersOpenId: VISIBILITY,
  restoring: RUNTIME_LIFECYCLE,
  systemReady: RUNTIME_LIFECYCLE,
  roomDesignActive: ROOM,
  notesPicking: INTERACTION,
  failFast: RUNTIME_LIFECYCLE,
  verboseConsoleErrors: RUNTIME_LIFECYCLE,
  verboseConsoleErrorsDedupeMs: RUNTIME_LIFECYCLE,
  debug: RUNTIME_LIFECYCLE,
  paintColor: APPEARANCE,
  handlesType: INTERIOR_APPEARANCE,
  interiorManualTool: ['interior', 'interaction'],
  pendingGrooveLinesCountMap: APPEARANCE,
  wardrobeWidthM: STRUCTURE,
  wardrobeHeightM: STRUCTURE,
  wardrobeDepthM: STRUCTURE,
  wardrobeDoorsCount: STRUCTURE,
  wardrobeTypeProfiles: ['structure', 'project-data'],
} satisfies Record<keyof RuntimeStateLike, DomainList>;

const META_EPHEMERAL_KEYS = new Set(['version', 'updatedAt', 'lastAction']);

function valuesEqual(left: unknown, right: unknown, mode: ChangeCompareMode): boolean {
  return mode === 'reference' ? Object.is(left, right) : storeValueEqual(left, right);
}

function collectChangedRecordKeys(
  previous: unknown,
  next: unknown,
  mode: ChangeCompareMode,
  ignoredKeys?: ReadonlySet<string>
): string[] {
  const prevRec = asRecordOrEmpty(previous);
  const nextRec = asRecordOrEmpty(next);
  const keys = new Set([...Object.keys(prevRec), ...Object.keys(nextRec)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (ignoredKeys?.has(key)) continue;
    if (!hasOwn(prevRec, key) || !hasOwn(nextRec, key) || !valuesEqual(prevRec[key], nextRec[key], mode)) {
      changed.push(key);
    }
  }
  changed.sort();
  return changed;
}

function pushDomains(target: Set<StoreChangeDomainKey>, domains: DomainList): void {
  for (const domain of domains) target.add(domain);
}

function classifyMappedKeys(
  changedKeys: readonly string[],
  domainByKey: Readonly<Record<string, DomainList>>
): { domains: Set<StoreChangeDomainKey>; broad: boolean } {
  const domains = new Set<StoreChangeDomainKey>();
  let broad = false;
  for (const key of changedKeys) {
    const mapped = domainByKey[key];
    if (!mapped) {
      broad = true;
      continue;
    }
    pushDomains(domains, mapped);
  }
  return { domains, broad };
}

function classifyUi(previous: unknown, next: unknown, mode: ChangeCompareMode): StoreDomainClassification {
  const changedTopLevel = collectChangedRecordKeys(previous, next, mode);
  const mapped = classifyMappedKeys(
    changedTopLevel.filter(key => key !== 'raw'),
    UI_DOMAIN_BY_KEY
  );
  const changedKeys = changedTopLevel.filter(key => key !== 'raw');

  if (changedTopLevel.includes('raw')) {
    const prevRaw = asRecordOrEmpty(asRecordOrEmpty(previous).raw);
    const nextRaw = asRecordOrEmpty(asRecordOrEmpty(next).raw);
    const rawChanged = collectChangedRecordKeys(prevRaw, nextRaw, mode);
    const rawMapped = classifyMappedKeys(rawChanged, UI_RAW_DOMAIN_BY_KEY);
    for (const domain of rawMapped.domains) mapped.domains.add(domain);
    if (rawMapped.broad) mapped.broad = true;
    for (const key of rawChanged) changedKeys.push(`raw.${key}`);
    if (!rawChanged.length) changedKeys.push('raw');
  }

  changedKeys.sort();
  return { domains: [...mapped.domains], broad: mapped.broad, changedKeys };
}

function classifyConfig(
  previous: unknown,
  next: unknown,
  mode: ChangeCompareMode
): StoreDomainClassification {
  const changedKeys = collectChangedRecordKeys(previous, next, mode);
  const mapped = classifyMappedKeys(changedKeys, CONFIG_DOMAIN_BY_KEY);
  return { domains: [...mapped.domains], broad: mapped.broad, changedKeys };
}

function classifyRuntime(
  previous: unknown,
  next: unknown,
  mode: ChangeCompareMode
): StoreDomainClassification {
  const changedKeys = collectChangedRecordKeys(previous, next, mode);
  const mapped = classifyMappedKeys(changedKeys, RUNTIME_DOMAIN_BY_KEY);
  return { domains: [...mapped.domains], broad: mapped.broad, changedKeys };
}

function classifyMode(previous: unknown, next: unknown, mode: ChangeCompareMode): StoreDomainClassification {
  const changedKeys = collectChangedRecordKeys(previous, next, mode);
  return { domains: changedKeys.length ? INTERACTION : [], broad: false, changedKeys };
}

function classifyMeta(previous: unknown, next: unknown, mode: ChangeCompareMode): StoreDomainClassification {
  const changedKeys = collectChangedRecordKeys(previous, next, mode, META_EPHEMERAL_KEYS);
  return { domains: changedKeys.length ? META : [], broad: false, changedKeys };
}

export function classifyStoreSliceChange(
  slice: RootSliceKey,
  previous: unknown,
  next: unknown,
  mode: ChangeCompareMode
): StoreDomainClassification {
  if (slice === 'ui') return classifyUi(previous, next, mode);
  if (slice === 'config') return classifyConfig(previous, next, mode);
  if (slice === 'runtime') return classifyRuntime(previous, next, mode);
  if (slice === 'mode') return classifyMode(previous, next, mode);
  return classifyMeta(previous, next, mode);
}

export function appendUniqueStoreDomains(
  existing: readonly StoreChangeDomainKey[],
  domains: readonly StoreChangeDomainKey[]
): readonly StoreChangeDomainKey[] {
  const next = new Set<StoreChangeDomainKey>(existing);
  for (const domain of domains) next.add(domain);
  return [...next];
}

export function mergeChangedKeys(
  changedKeys: StoreChangedKeys,
  slice: RootSliceKey,
  keys: readonly string[]
): StoreChangedKeys {
  const existing = changedKeys[slice] || [];
  return { ...changedKeys, [slice]: [...new Set([...existing, ...keys])] };
}
