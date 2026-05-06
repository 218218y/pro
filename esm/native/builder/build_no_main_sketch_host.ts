import { getCacheBag } from '../runtime/cache_access.js';
import { NO_MAIN_SKETCH_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getWardrobeGroup } from '../runtime/render_access.js';
import { makeRodCreator } from './contents_pipeline.js';
import { makeInternalDrawerCreator } from './internal_drawers_pipeline.js';
import { applyInteriorLayout } from './interior_pipeline.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import type {
  AppContainer,
  BuilderContentsSurfaceLike,
  BuilderCreateInternalDrawerBoxFn,
  BuilderOutlineFn,
  BuilderPartMaterialResolver,
  BuilderSketchBoxLike,
  BuilderSketchDrawerLike,
  BuilderSketchExtrasLike,
  BuilderSketchRodLike,
  BuilderSketchShelfLike,
  BuilderSketchStorageBarrierLike,
  ModuleConfigLike,
  UnknownRecord,
} from '../../../types';
import {
  readFunction,
  readModuleConfig,
  readRecord,
  readRecordArray,
  readStringProp,
  readThreeLike,
} from './build_flow_readers.js';

function isFreePlacementSketchBox(value: unknown): value is BuilderSketchBoxLike {
  const rec = readRecord(value);
  return !!rec && rec.freePlacement === true;
}

function cloneSketchExtrasForNoMain(source: unknown): BuilderSketchExtrasLike {
  const extra = readRecord(source);
  if (!extra) return { boxes: [] };

  const cloneList = <T extends UnknownRecord>(value: unknown): T[] => readRecordArray<T>(value).slice();

  return {
    boxes: readRecordArray<BuilderSketchBoxLike>(extra.boxes).filter(isFreePlacementSketchBox),
    shelves: cloneList<BuilderSketchShelfLike>(extra.shelves),
    storageBarriers: cloneList<BuilderSketchStorageBarrierLike>(extra.storageBarriers),
    rods: cloneList<BuilderSketchRodLike>(extra.rods),
    drawers: cloneList<BuilderSketchDrawerLike>(extra.drawers),
  };
}

export function createNoMainSketchModuleConfig(source: unknown): ModuleConfigLike {
  const base = readModuleConfig(source);

  // IMPORTANT:
  // no-main mode is a dedicated sketch workspace, not a hidden version of the old main wardrobe.
  // Reusing the prior module preset/layout here would resurrect floating shelves/rods/drawers from
  // the regular cabinet as soon as sketchExtras exist. Preserve only explicit sketch content.
  return {
    layout: 'shelves',
    isCustom: true,
    gridDivisions: NO_MAIN_SKETCH_DIMENSIONS.defaultGridDivisions,
    extDrawersCount: 0,
    hasShoeDrawer: false,
    drawersPerCell: {},
    shelvesPerCell: {},
    shelvesColumnWidths: {},
    shelvesColumnOffsets: {},
    shelvesColumnDepthReducers: {},
    shelvesRemoveVerticals: false,
    cellHeights: [],
    cellDepthReducers: [],
    rodCells: [],
    storageCells: [],
    customTopRowHeights: null,
    hasDrawersInside: false,
    drawersCount: 0,
    drawersHeight: null,
    drawersColumnWidths: {},
    drawersColumnOffsets: {},
    drawersColumnDepthReducers: {},
    drawersCellHeights: [],
    drawersCellDepthReducers: [],
    sketchExtras: cloneSketchExtrasForNoMain(base?.sketchExtras),
  };
}

function hasSketchExtrasContent(value: unknown): boolean {
  const extra = readRecord(value);
  if (!extra) return false;

  const hasItems = (entry: unknown): boolean => Array.isArray(entry) && entry.length > 0;

  return !!(
    hasItems(extra.boxes) ||
    hasItems(extra.shelves) ||
    hasItems(extra.storageBarriers) ||
    hasItems(extra.rods) ||
    hasItems(extra.drawers)
  );
}

function hasMeaningfulNoMainModuleContent(config: ModuleConfigLike | null | undefined): boolean {
  const cfg = readModuleConfig(config);
  if (!cfg) return false;
  return hasSketchExtrasContent(cfg.sketchExtras);
}

function estimateNoMainWorkspaceWidthM(config: ModuleConfigLike | null | undefined): number | null {
  const cfg = readModuleConfig(config);
  const extra = readRecord(cfg?.sketchExtras);
  const boxes = Array.isArray(extra?.boxes) ? extra.boxes : null;
  if (!boxes || boxes.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let hasFreeBox = false;

  for (const entry of boxes) {
    const box = readRecord(entry);
    if (!box || box.freePlacement !== true) continue;

    const centerX = Number(box.absX);
    const widthM = Number(box.widthM);
    if (!Number.isFinite(centerX) || !Number.isFinite(widthM) || !(widthM > 0)) continue;

    const halfW = widthM / 2;
    minX = Math.min(minX, centerX - halfW);
    maxX = Math.max(maxX, centerX + halfW);
    hasFreeBox = true;
  }

  if (!hasFreeBox || !Number.isFinite(minX) || !Number.isFinite(maxX) || !(maxX > minX)) return null;
  return Math.max(0, maxX - minX + NO_MAIN_SKETCH_DIMENSIONS.workspacePaddingM);
}

export function syncNoMainSketchWorkspaceMetrics(args: {
  App: AppContainer;
  enabled: boolean;
  cfg: UnknownRecord | null | undefined;
  totalW: number;
  H: number;
  woodThick: number;
  internalDepth: number;
  internalZ: number;
}): void {
  try {
    const cache = getCacheBag(args.App);
    if (!args.enabled) {
      cache.noMainSketchWorkspaceMetrics = null;
      return;
    }

    const cfg = readRecord(args.cfg);
    const list = cfg ? readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration') : [];
    const moduleCfg = createNoMainSketchModuleConfig(list[0]);
    const workspaceWidthM = Math.max(
      Number(args.totalW) || 0,
      estimateNoMainWorkspaceWidthM(moduleCfg) || 0,
      NO_MAIN_SKETCH_DIMENSIONS.defaultWorkspaceWidthM
    );
    const outerH = Math.max(NO_MAIN_SKETCH_DIMENSIONS.minHostHeightM, Number(args.H) || 0);
    const depth = Math.max(Number(args.woodThick) || 0, Number(args.internalDepth) || 0);
    const centerZ = Number(args.internalZ) || 0;
    cache.noMainSketchWorkspaceMetrics = {
      centerX: 0,
      centerY: outerH / 2,
      centerZ,
      width: workspaceWidthM,
      height: outerH,
      depth,
      backZ: centerZ - depth / 2,
    };
  } catch {
    // ignore cache sync failures
  }
}

export function maybeRenderNoMainSketchHost(args: {
  App: AppContainer;
  THREE: unknown;
  cfg: UnknownRecord | null | undefined;
  ui: UnknownRecord | null | undefined;
  totalW: number;
  H: number;
  D: number;
  woodThick: number;
  depthReduction: number;
  internalDepth: number;
  internalZ: number;
  bodyMat: unknown;
  legMat: unknown;
  createBoard: unknown;
  getPartMaterial: unknown;
  getPartColorValue: unknown;
  createInternalDrawerBox: unknown;
  addOutlines: unknown;
  addHangingClothes: unknown;
  addFoldedClothes: unknown;
  addRealisticHanger: unknown;
  isInternalDrawersEnabled: boolean;
  showHangerEnabled: boolean;
  showContentsEnabled: boolean;
}): boolean {
  const cfg = readRecord(args.cfg);
  const list = cfg ? readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration') : [];
  const moduleCfg = createNoMainSketchModuleConfig(list[0]);

  const hostHasAnything = hasMeaningfulNoMainModuleContent(moduleCfg);
  if (!hostHasAnything) return false;

  const workspaceWidthM = Math.max(
    Number(args.totalW) || 0,
    estimateNoMainWorkspaceWidthM(moduleCfg) || 0,
    NO_MAIN_SKETCH_DIMENSIONS.defaultWorkspaceWidthM
  );
  const innerW = Math.max(
    NO_MAIN_SKETCH_DIMENSIONS.minInnerWidthM,
    workspaceWidthM - 2 * Number(args.woodThick)
  );
  const effectiveBottomY = Number(args.woodThick);
  const effectiveTopY = Math.max(
    effectiveBottomY + NO_MAIN_SKETCH_DIMENSIONS.minGridSpanM,
    Number(args.H) - Number(args.woodThick)
  );
  const localGridStep = Math.max(
    NO_MAIN_SKETCH_DIMENSIONS.minGridSpanM,
    (effectiveTopY - effectiveBottomY) / NO_MAIN_SKETCH_DIMENSIONS.defaultGridDivisions
  );
  const wardrobeGroup = getWardrobeGroup(args.App);
  const three = readThreeLike(args.THREE);
  if (!three) return false;

  const createRod = makeRodCreator({
    App: args.App,
    THREE: three,
    cfg: cfg || {},
    config: moduleCfg,
    moduleIndex: 0,
    effectiveBottomY,
    localGridStep,
    isInternalDrawersEnabled: !!args.isInternalDrawersEnabled,
    innerW,
    internalCenterX: 0,
    internalZ: Number(args.internalZ),
    internalDepth: Math.max(Number(args.woodThick), Number(args.internalDepth)),
    doorFrontZ: Number(args.D) / 2,
    legMat: args.legMat,
    wardrobeGroup,
    addOutlines: readFunction<BuilderOutlineFn>(args.addOutlines) || null,
    showHangerEnabled: !!args.showHangerEnabled,
    addRealisticHanger:
      readFunction<NonNullable<BuilderContentsSurfaceLike['addRealisticHanger']>>(args.addRealisticHanger) ||
      undefined,
    showContentsEnabled: !!args.showContentsEnabled,
    addHangingClothes:
      readFunction<NonNullable<BuilderContentsSurfaceLike['addHangingClothes']>>(args.addHangingClothes) ||
      undefined,
    doorStyle: readStringProp(readRecord(args.ui), 'doorStyle') || '',
  });
  const checkAndCreateInternalDrawer = makeInternalDrawerCreator({
    App: args.App,
    THREE: three,
    cfg: cfg || {},
    config: moduleCfg,
    moduleIndex: 0,
    keyPrefix: 'no_main_',
    effectiveBottomY,
    localGridStep,
    drawerSizingGridStep: localGridStep,
    internalCenterX: 0,
    internalZ: Number(args.internalZ),
    internalDepth: Math.max(Number(args.woodThick), Number(args.internalDepth)),
    innerW,
    isInternalDrawersEnabled: !!args.isInternalDrawersEnabled,
    wardrobeGroup,
    createInternalDrawerBox:
      readFunction<BuilderCreateInternalDrawerBoxFn>(args.createInternalDrawerBox) || null,
    addOutlines: readFunction<BuilderOutlineFn>(args.addOutlines) || null,
    getPartMaterial: readFunction<BuilderPartMaterialResolver>(args.getPartMaterial) || null,
    bodyMat: args.bodyMat,
    showContentsEnabled: !!args.showContentsEnabled,
    addFoldedClothes:
      readFunction<NonNullable<BuilderContentsSurfaceLike['addFoldedClothes']>>(args.addFoldedClothes) ||
      undefined,
  });

  return applyInteriorLayout({
    App: args.App,
    THREE: args.THREE,
    cfg: cfg || {},
    config: moduleCfg,
    gridDivisions: NO_MAIN_SKETCH_DIMENSIONS.defaultGridDivisions,
    wardrobeGroup,
    createBoard: args.createBoard,
    createRod,
    addFoldedClothes:
      readFunction<NonNullable<BuilderContentsSurfaceLike['addFoldedClothes']>>(args.addFoldedClothes) ||
      null,
    checkAndCreateInternalDrawer,
    effectiveBottomY,
    effectiveTopY,
    localGridStep,
    innerW,
    woodThick: args.woodThick,
    internalDepth: Math.max(Number(args.woodThick), Number(args.internalDepth)),
    internalCenterX: 0,
    internalZ: Number(args.internalZ),
    D: Number(args.D),
    moduleIndex: 0,
    modulesLength: 1,
    currentShelfMat: args.bodyMat,
    bodyMat: args.bodyMat,
    isInternalDrawersEnabled: false,
    getPartMaterial: args.getPartMaterial,
    getPartColorValue: args.getPartColorValue,
    doorStyle: readStringProp(readRecord(args.ui), 'doorStyle') || '',
    createInternalDrawerBox: args.createInternalDrawerBox,
    addOutlines: args.addOutlines,
    showContentsEnabled: !!args.showContentsEnabled,
  });
}
