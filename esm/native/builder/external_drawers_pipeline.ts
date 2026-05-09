// Native Builder: external drawers pipeline (ESM)
//
// Extracted from `builder/core.js` to keep the core loop smaller and to ensure
// external drawers render through deterministic ops only (no DOM/readUI drift).
//
// Responsibilities:
// - (Optional) Create the internal board above the drawer stack
// - Compute deterministic external drawers ops via builderCorePure
// - Apply ops via builderRenderOps
// - Strict fail-fast behavior (no silent try/catch)

import { computeExternalDrawersOpsForModule } from './pure_api.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { requireBuilderRenderOps } from '../runtime/builder_service_access.js';
import { reportErrorViaPlatform } from '../runtime/platform_access.js';
import { asRecord } from '../runtime/record.js';
import type {
  UnknownRecord,
  AppContainer,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderCreateBoardFn,
  ExternalDrawerOpLike,
  ExternalDrawersOpsLike,
  ThreeLike,
} from '../../../types';

type BuilderVisualFactory = BuilderCreateBoardFn;

type MutableExternalDrawerOpLike = ExternalDrawerOpLike & {
  faceW?: number;
  faceOffsetX?: number;
  frontZ?: number;
};

type ApplyExternalDrawersForModuleParams = {
  App?: AppContainer;
  THREE?: ThreeLike;
  cfg?: UnknownRecord | null;
  config?: UnknownRecord | null;
  moduleIndex?: number;
  startDoorId?: number;
  externalCenterX?: number;
  externalW?: number;
  drawerFaceW?: number;
  drawerFaceOffsetX?: number;
  depth?: number;
  frontZ?: number;
  startY?: number;
  woodThick?: number;
  keyPrefix?: string;
  __wpStack?: string;
  hasShoe?: boolean;
  regCount?: number;
  doorStyle?: string;
  globalFrontMat?: unknown;
  isGroovesEnabled?: boolean;
  bodyMat?: unknown;
  addOutlines?: unknown;
  getPartMaterial?: (partId: string) => unknown;
  getPartColorValue?: (partId: string) => string | null | undefined;
  createDoorVisual?: BuilderCreateDoorVisualFn;
  createInternalDrawerBox?: BuilderCreateInternalDrawerBoxFn;
  createBoard?: BuilderVisualFactory;
  innerW?: number;
  internalDepth?: number;
  internalCenterX?: number;
  internalZ?: number;
  effectiveBottomY?: number;
};

function readFiniteNumber(value: unknown, defaultValue: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

function readOptionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown, defaultValue = ''): string {
  return typeof value === 'string' ? value : defaultValue;
}

function isObjectRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function safeReportError(
  App: AppContainer | null | undefined,
  error: unknown,
  meta: Record<string, unknown>
): void {
  try {
    if (App && reportErrorViaPlatform(App, error, meta)) return;
  } catch {
    // ignore platform reporting errors
  }
  try {
    console.warn('[WardrobePro][builder] external drawers pipeline warning:', meta, error);
  } catch {
    // ignore console failures in hostile runtimes
  }
}

function asMutableDrawerOpList(ops: ExternalDrawersOpsLike): MutableExternalDrawerOpLike[] {
  const drawers = Array.isArray(ops.drawers) ? ops.drawers : [];
  const out: MutableExternalDrawerOpLike[] = [];
  for (let i = 0; i < drawers.length; i++) {
    const drawer = asRecord<MutableExternalDrawerOpLike>(drawers[i]);
    if (drawer) out.push(drawer);
  }
  return out;
}

function readExternalDrawersOps(value: unknown): ExternalDrawersOpsLike | null {
  const ops = asRecord<ExternalDrawersOpsLike>(value);
  return ops && Array.isArray(ops.drawers) ? ops : null;
}

export function applyExternalDrawersForModule(
  params: ApplyExternalDrawersForModuleParams | null | undefined
): boolean {
  const safeParams = params || null;
  const App = safeParams?.App;
  const THREE = safeParams?.THREE;
  const cfg = isObjectRecord(safeParams?.cfg) ? safeParams.cfg : null;
  const config = isObjectRecord(safeParams?.config) ? safeParams.config : {};

  if (!App) throw new Error('[WardrobePro] external drawers pipeline missing: App');
  if (!THREE) throw new Error('[WardrobePro] external drawers pipeline missing: THREE');

  const moduleIndex = readFiniteNumber(params?.moduleIndex, -1);
  const startDoorId = readFiniteNumber(params?.startDoorId, 0);

  const externalCenterX = readFiniteNumber(params?.externalCenterX, 0);
  const externalW = readFiniteNumber(params?.externalW, 0);
  const drawerFaceW = readFiniteNumber(params?.drawerFaceW, Number.NaN);
  const drawerFaceOffsetX = readFiniteNumber(params?.drawerFaceOffsetX, 0);
  const depth = readFiniteNumber(params?.depth, 0);
  const frontZ = readOptionalFiniteNumber(params?.frontZ);
  const startY = readFiniteNumber(params?.startY, 0);
  const keyPrefix = readString(params?.keyPrefix, '');
  const woodThick = readFiniteNumber(params?.woodThick, 0);

  const hasShoe = !!params?.hasShoe;
  const regCount = readFiniteNumber(params?.regCount, 0);

  // Guard: external drawers are supported only for hinged wardrobes.
  if (!cfg || cfg.wardrobeType !== 'hinged') return false;
  if (!hasShoe && !(regCount > 0)) return false;

  // Create the internal board above the drawer stack (visual separation / shelf).
  const createBoard = params?.createBoard;
  const innerW = readFiniteNumber(params?.innerW, 0);
  const internalDepth = readFiniteNumber(params?.internalDepth, 0);
  const internalCenterX = readFiniteNumber(params?.internalCenterX, 0);
  const internalZ = readFiniteNumber(params?.internalZ, 0);
  const effectiveBottomY = readFiniteNumber(params?.effectiveBottomY, 0);
  const bodyMat = params?.bodyMat;

  if (typeof createBoard !== 'function') {
    throw new Error('[WardrobePro] external drawers pipeline missing: createBoard');
  }

  // Keep the separator board width clearance centralized with external drawer dimensions.
  createBoard(
    innerW - DRAWER_DIMENSIONS.external.separatorBoardWidthClearanceM,
    woodThick,
    internalDepth,
    internalCenterX,
    effectiveBottomY - woodThick / 2,
    internalZ,
    bodyMat
  );

  let ops: ExternalDrawersOpsLike | null = null;
  try {
    ops = readExternalDrawersOps(
      computeExternalDrawersOpsForModule({
        wardrobeType: cfg.wardrobeType,
        moduleIndex,
        startDoorId,
        externalCenterX,
        externalW,
        depth,
        frontZ,
        startY,
        woodThick,
        keyPrefix,
        hasShoe,
        regCount,
      })
    );
  } catch (e) {
    safeReportError(App, e, {
      where: 'native/builder/external_drawers_pipeline.computeExternalDrawersOpsForModule',
      moduleIndex,
      fatal: true,
    });
    throw e;
  }

  if (!ops || !Array.isArray(ops.drawers) || ops.drawers.length <= 0) {
    throw new Error('[WardrobePro] external drawers ops empty/invalid for module ' + String(moduleIndex));
  }

  // Augment ops with visual-only drawer face width/offset, so the front can match the door span
  // without changing the internal drawer box dimensions.
  // Fail-fast on malformed ops/drawers data here (this is deterministic builder data, not optional IO).
  const faceW = Number(drawerFaceW);
  const faceOffsetX = Number(drawerFaceOffsetX);
  const fz = typeof frontZ === 'number' && Number.isFinite(frontZ) ? frontZ : null;
  const drawers = asMutableDrawerOpList(ops);

  if (Number.isFinite(faceW) && faceW > 0) {
    for (let i = 0; i < drawers.length; i++) {
      const d = drawers[i];
      if (!d || typeof d !== 'object') continue;
      d.faceW = faceW;
      if (Number.isFinite(faceOffsetX)) d.faceOffsetX = faceOffsetX;
      if (fz != null) d.frontZ = fz;
    }
  } else if (fz != null) {
    for (let i = 0; i < drawers.length; i++) {
      const d = drawers[i];
      if (!d || typeof d !== 'object') continue;
      d.frontZ = fz;
      if (Number.isFinite(faceOffsetX)) d.faceOffsetX = faceOffsetX;
    }
  }

  const ro = requireBuilderRenderOps(App, 'builder/external_drawers');
  if (typeof ro.applyExternalDrawersOps !== 'function') {
    throw new Error('[WardrobePro] external drawers ops missing: applyExternalDrawersOps');
  }

  try {
    ro.applyExternalDrawersOps({
      THREE,
      cfg,
      config,
      ops,
      __wpStack: params?.__wpStack ? String(params.__wpStack) : undefined,
      doorStyle: params?.doorStyle,
      globalFrontMat: params?.globalFrontMat,
      isGroovesEnabled: !!params?.isGroovesEnabled,
      bodyMat,
      addOutlines: params?.addOutlines,
      getPartMaterial: params?.getPartMaterial,
      getPartColorValue: params?.getPartColorValue,
      createDoorVisual: params?.createDoorVisual,
      createInternalDrawerBox: params?.createInternalDrawerBox,
    });
    return true;
  } catch (e) {
    safeReportError(App, e, {
      where: 'native/builder/external_drawers_pipeline.applyExternalDrawersOps',
      moduleIndex,
      fatal: true,
    });
    throw e;
  }
}
