import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { asRecord } from '../runtime/record.js';
import { reportError } from '../runtime/errors.js';
import type {
  AppContainer,
  BuilderAddFoldedClothesFn,
  BuilderCreateBoardFn,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderDoorVisualFrameStyle,
  BuilderInteriorSketchArgsLike,
  BuilderInteriorRodCreator,
  BuilderOutlineFn,
  BuilderPartColorResolver,
  BuilderPartMaterialResolver,
  RenderOpsLike,
} from '../../../types';
import {
  requireInteriorSketchConfigSnapshot,
  requireInteriorSketchDoorStyle,
} from './render_interior_sketch_input_contract.js';

export type ValueRecord = Record<string, unknown>;

export type InteriorLayoutConfig = ValueRecord & {
  isCustom?: boolean;
  customData?: unknown;
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
  effectiveBottomY?: number;
  effectiveTopY?: number;
  localGridStep?: number;
  innerW?: number;
  woodThick?: number;
  shelfThick?: number;
  internalDepth?: number;
  internalCenterX?: number;
  internalZ?: number;
  D?: number;
  currentShelfMat?: unknown;
  currentBraceShelfMat?: unknown;
  bodyMat?: unknown;
  whiteMat?: unknown;
  drawerBoxBaseMat?: unknown;
  moduleIndex?: number;
  modulesLength?: number;
  moduleKey?: string | number | null;
  frameSidePartIdPrefix?: string;
  startY?: number;
  startDoorId?: number;
  moduleDoors?: number;
  hingedDoorPivotMap?: unknown;
  externalW?: number;
  externalCenterX?: number;
  getPartMaterial?: BuilderPartMaterialResolver | null;
  getPartColorValue?: BuilderPartColorResolver | null;
  addOutlines?: BuilderOutlineFn | null;
  sketchMode?: boolean;
  showContentsEnabled?: boolean;
  isGroovesEnabled?: boolean;
  isInternalDrawersEnabled?: boolean;
  createDoorVisual?: BuilderCreateDoorVisualFn | null;
  doorStyle?: BuilderDoorVisualFrameStyle;
  createInternalDrawerBox?: BuilderCreateInternalDrawerBoxFn | null;
};

export type BuilderRenderOpsLocal = RenderOpsLike & {
  applyInteriorCustomOps?: (args: ValueRecord) => boolean;
  applyInteriorPresetOps?: (args: ValueRecord) => boolean;
  applyInteriorSketchExtras?: (args: BuilderInteriorSketchArgsLike) => unknown;
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
): BuilderInteriorSketchArgsLike {
  const App = requireApp(input.App, 'builder/interior_pipeline.sketchExtras');
  const cfgSnapshot = requireInteriorSketchConfigSnapshot(
    input.cfg,
    'builder/interior_pipeline.sketchExtras'
  );
  const doorStyle = requireInteriorSketchDoorStyle(input.doorStyle, 'builder/interior_pipeline.sketchExtras');
  const sketchExtras = asObject<BuilderInteriorSketchArgsLike['sketchExtras']>(config.sketchExtras);
  if (!sketchExtras) {
    throw new TypeError('[builder/interior_pipeline.sketchExtras] sketchExtras must be an object');
  }
  return {
    App,
    THREE: input.THREE,
    cfgSnapshot,
    wardrobeGroup: input.wardrobeGroup,
    createBoard: input.createBoard,
    createRod: input.createRod,
    currentShelfMat: input.currentShelfMat,
    currentBraceShelfMat: input.currentBraceShelfMat,
    bodyMat: input.bodyMat,
    whiteMat: input.whiteMat,
    drawerBoxBaseMat: input.drawerBoxBaseMat || input.whiteMat,
    effectiveBottomY: readNumber(input.effectiveBottomY, 0),
    effectiveTopY: readNumber(input.effectiveTopY, 0),
    localGridStep: readNumber(input.localGridStep, 0),
    innerW: readNumber(input.innerW, 0),
    woodThick: readNumber(input.woodThick, 0),
    shelfThick: readNumber(input.shelfThick, readNumber(input.woodThick, 0)),
    internalDepth: readNumber(input.internalDepth, 0),
    internalCenterX: readNumber(input.internalCenterX, 0),
    internalZ: readNumber(input.internalZ, 0),
    D: readNumber(input.D, 0),
    moduleIndex: readNumber(input.moduleIndex, -1),
    modulesLength: readNumber(input.modulesLength, -1),
    moduleKey: input.moduleKey,
    frameSidePartIdPrefix: input.frameSidePartIdPrefix,
    startY: readNumber(input.startY, 0),
    startDoorId: readNumber(input.startDoorId, 1),
    moduleDoors: readNumber(input.moduleDoors, 1),
    hingedDoorPivotMap: input.hingedDoorPivotMap,
    externalW: readNumber(input.externalW, 0),
    externalCenterX: readNumber(input.externalCenterX, 0),
    getPartMaterial: input.getPartMaterial,
    getPartColorValue: input.getPartColorValue,
    createDoorVisual: input.createDoorVisual,
    doorStyle,
    createInternalDrawerBox: input.createInternalDrawerBox,
    addOutlines: input.addOutlines ?? null,
    sketchMode: input.sketchMode === true,
    showContentsEnabled: input.showContentsEnabled,
    isGroovesEnabled: input.isGroovesEnabled === true,
    isInternalDrawersEnabled: input.isInternalDrawersEnabled === true,
    addFoldedClothes: input.addFoldedClothes,
    sketchExtras,
  };
}

export function reportInteriorLayoutError(
  App: AppContainer | undefined | null,
  error: unknown,
  ctx: ValueRecord
): void {
  try {
    if (App) {
      reportError(App, error, ctx);
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

export function resolveActiveDrawerSlots(_config: InteriorLayoutConfig): unknown[] {
  return [];
}
