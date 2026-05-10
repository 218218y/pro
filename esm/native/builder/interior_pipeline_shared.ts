import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { asRecord } from '../runtime/record.js';
import { reportErrorViaPlatform } from '../runtime/platform_access.js';
import type {
  AppContainer,
  BuilderAddFoldedClothesFn,
  BuilderCreateBoardFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderInternalDrawerCreator,
  BuilderInteriorRodCreator,
  BuilderOutlineFn,
  BuilderPartColorResolver,
  BuilderPartMaterialResolver,
  RenderOpsLike,
} from '../../../types';

export type ValueRecord = Record<string, unknown>;

export type InteriorLayoutConfig = ValueRecord & {
  isCustom?: boolean;
  customData?: unknown;
  intDrawersList?: unknown[];
  intDrawersSlot?: unknown;
  braceShelves?: unknown[];
  sketchExtras?: unknown;
  layout?: unknown;
};

export type InteriorLayoutParams = ValueRecord & {
  App?: AppContainer;
  THREE?: unknown;
  cfg?: unknown;
  config?: unknown;
  gridDivisions?: number;
  wardrobeGroup?: unknown;
  createBoard?: BuilderCreateBoardFn;
  createRod?: BuilderInteriorRodCreator | null;
  addFoldedClothes?: BuilderAddFoldedClothesFn | null;
  checkAndCreateInternalDrawer?: BuilderInternalDrawerCreator | null;
  effectiveBottomY?: number;
  effectiveTopY?: number;
  localGridStep?: number;
  innerW?: number;
  woodThick?: number;
  internalDepth?: number;
  internalCenterX?: number;
  internalZ?: number;
  D?: number;
  currentShelfMat?: unknown;
  bodyMat?: unknown;
  isInternalDrawersEnabled?: boolean;
  moduleIndex?: number;
  modulesLength?: number;
  moduleKey?: unknown;
  startY?: number;
  startDoorId?: number;
  moduleDoors?: number;
  hingedDoorPivotMap?: unknown;
  externalW?: number;
  externalCenterX?: number;
  getPartMaterial?: BuilderPartMaterialResolver | null;
  getPartColorValue?: BuilderPartColorResolver | null;
  createInternalDrawerBox?: BuilderCreateInternalDrawerBoxFn | null;
  addOutlines?: BuilderOutlineFn | null;
  showContentsEnabled?: unknown;
  createDoorVisual?: unknown;
  doorStyle?: unknown;
};

export type BuilderRenderOpsLocal = RenderOpsLike & {
  applyInteriorCustomOps?: (args: ValueRecord) => boolean;
  applyInteriorPresetOps?: (args: ValueRecord) => boolean;
  applyInteriorSketchExtras?: (args: ValueRecord) => unknown;
};

export function asObject<T extends object>(value: unknown): T | null {
  return asRecord<T>(value);
}

export function readParams(params: unknown): InteriorLayoutParams {
  return asObject<InteriorLayoutParams>(params) ?? {};
}

export function readConfig(config: unknown): InteriorLayoutConfig {
  return asObject<InteriorLayoutConfig>(config) ?? {};
}

export function readNumber(value: unknown, defaultValue: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

export function readBraceShelves(config: InteriorLayoutConfig): unknown[] {
  return Array.isArray(config.braceShelves) ? config.braceShelves : [];
}

export function readRenderOps(App: AppContainer | undefined | null): BuilderRenderOpsLocal | null {
  if (!App) return null;
  return asObject<BuilderRenderOpsLocal>(getBuilderRenderOps(App));
}

export function requireApp(App: AppContainer | undefined, where: string): AppContainer {
  if (!App) throw new Error(`[WardrobePro] missing App in ${where}`);
  return App;
}

export function getInteriorSketchExtrasFn(App: AppContainer | undefined | null) {
  const renderOps = readRenderOps(App);
  return renderOps && typeof renderOps.applyInteriorSketchExtras === 'function'
    ? renderOps.applyInteriorSketchExtras
    : null;
}

export function buildSketchExtrasArgs(
  input: InteriorLayoutParams,
  config: InteriorLayoutConfig
): ValueRecord {
  return {
    App: input.App,
    THREE: input.THREE,
    cfg: input.cfg,
    config: input.config,
    wardrobeGroup: input.wardrobeGroup,
    createBoard: input.createBoard,
    createRod: input.createRod,
    currentShelfMat: input.currentShelfMat,
    bodyMat: input.bodyMat,
    effectiveBottomY: readNumber(input.effectiveBottomY, 0),
    effectiveTopY: readNumber(input.effectiveTopY, 0),
    localGridStep: readNumber(input.localGridStep, 0),
    innerW: readNumber(input.innerW, 0),
    woodThick: readNumber(input.woodThick, 0),
    internalDepth: readNumber(input.internalDepth, 0),
    internalCenterX: readNumber(input.internalCenterX, 0),
    internalZ: readNumber(input.internalZ, 0),
    D: readNumber(input.D, 0),
    moduleIndex: readNumber(input.moduleIndex, -1),
    modulesLength: readNumber(input.modulesLength, -1),
    moduleKey: input.moduleKey,
    startY: readNumber(input.startY, 0),
    startDoorId: readNumber(input.startDoorId, 1),
    moduleDoors: readNumber(input.moduleDoors, 1),
    hingedDoorPivotMap: input.hingedDoorPivotMap,
    externalW: readNumber(input.externalW, 0),
    externalCenterX: readNumber(input.externalCenterX, 0),
    getPartMaterial: input.getPartMaterial,
    getPartColorValue: input.getPartColorValue,
    createDoorVisual: input.createDoorVisual,
    doorStyle: input.doorStyle,
    createInternalDrawerBox: input.createInternalDrawerBox,
    addOutlines: input.addOutlines,
    showContentsEnabled: input.showContentsEnabled,
    sketchExtras: config.sketchExtras,
  };
}

export function reportInteriorLayoutError(
  App: AppContainer | undefined | null,
  error: unknown,
  ctx: ValueRecord
): void {
  try {
    if (App) {
      reportErrorViaPlatform(App, error, ctx);
    }
  } catch {
    // ignore
  }
}

export function maybeApplySketchExtras(
  App: AppContainer | undefined | null,
  input: InteriorLayoutParams,
  config: InteriorLayoutConfig,
  where: string
): void {
  if (!config.sketchExtras) return;
  const applySketchExtras = getInteriorSketchExtrasFn(App);
  if (!applySketchExtras) return;

  try {
    applySketchExtras(buildSketchExtrasArgs(input, config));
  } catch (error) {
    reportInteriorLayoutError(App, error, { where });
  }
}

export function resolveActiveDrawerSlots(config: InteriorLayoutConfig): unknown[] {
  if (Array.isArray(config.intDrawersList)) return config.intDrawersList;
  return config.intDrawersSlot != null ? [config.intDrawersSlot] : [];
}
