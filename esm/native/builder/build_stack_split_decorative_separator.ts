import { WARDROBE_DEFAULTS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { appendSubtleDoorAccentBorder } from './visuals_and_contents_door_visual_accent.js';

import type {
  BuildStackSplitLowerUnitArgs,
  PreparedStackSplitLowerSetup,
} from './build_stack_split_contracts.js';
import type { UnknownRecord } from '../../../types';

const STACK_SPLIT_DECORATIVE_SEPARATOR_PART_ID = 'stack_split_separator';

type CreateBoardFn = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: unknown,
  partId?: string | null
) => unknown;

function readCreateBoard(value: unknown): CreateBoardFn | null {
  return typeof value === 'function' ? (value as CreateBoardFn) : null;
}

function readRecord(value: unknown): UnknownRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function resolveSeparatorMaterial(args: BuildStackSplitLowerUnitArgs): unknown {
  const cfg = readRecord(args.cfg);
  if (
    cfg?.isMultiColorMode &&
    typeof args.getPartColorValue === 'function' &&
    args.getPartColorValue(STACK_SPLIT_DECORATIVE_SEPARATOR_PART_ID) &&
    typeof args.getPartMaterial === 'function'
  ) {
    return args.getPartMaterial(STACK_SPLIT_DECORATIVE_SEPARATOR_PART_ID) || args.bodyMat;
  }
  return args.bodyMat;
}

function readPositive(value: unknown, defaultValue: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

type AddChildObject = UnknownRecord & { add?: (child: unknown) => unknown };

function asAddChildObject(value: unknown): AddChildObject | null {
  const obj = readRecord(value) as AddChildObject | null;
  return obj && typeof obj.add === 'function' ? obj : null;
}

function tagSeparatorAccentPart(value: unknown): void {
  const obj = readRecord(value);
  if (!obj) return;
  const userData = readRecord(obj.userData) || {};
  obj.userData = {
    ...userData,
    partId: STACK_SPLIT_DECORATIVE_SEPARATOR_PART_ID,
    __wpStackSplitSeparatorAccent: true,
    __keepMaterial: true,
  };
}

function appendSeparatorFrontAccent(args: {
  buildArgs: BuildStackSplitLowerUnitArgs;
  apronObject: unknown;
  width: number;
  apronHeight: number;
  apronDepth: number;
}): void {
  const { buildArgs, apronObject, width, apronHeight, apronDepth } = args;
  const apron = asAddChildObject(apronObject);
  if (!apron) return;

  const lineT = Math.max(0.0014, Math.min(0.0022, apronHeight * 0.08));

  appendSubtleDoorAccentBorder({
    App: buildArgs.App,
    THREE: buildArgs.THREE,
    visualGroup: apron as never,
    tagDoorVisualPart: tagSeparatorAccentPart as never,
    isSketch: !!buildArgs.sketchMode,
    zSign: 1,
    targetW: width,
    targetH: apronHeight,
    faceZ: apronDepth / 2,
    inset: 0,
    lineT,
    opacity: 0.2,
  });
}

export function addStackSplitDecorativeSeparatorIfNeeded(args: {
  buildArgs: BuildStackSplitLowerUnitArgs;
  prepared: PreparedStackSplitLowerSetup;
}): void {
  const { buildArgs, prepared } = args;
  if (!buildArgs.stackSplitDecorativeSeparatorEnabled) return;

  const createBoard = readCreateBoard(buildArgs.createBoard);
  if (!createBoard) {
    throw new Error('[WardrobePro] Stack split decorative separator requires createBoard');
  }

  const dims = WARDROBE_DEFAULTS.stackSplit.decorativeSeparator;
  const topW = readPositive(buildArgs.widthCm, 0) / 100;
  const bottomW = readPositive(prepared.bottomWidthCm, buildArgs.lowerWidthCm) / 100;
  const totalW = Math.max(topW, bottomW, dims.minWidthM);

  const topD = readPositive(buildArgs.carcassDepthM, readPositive(buildArgs.depthCm, 0) / 100);
  const bottomD = readPositive(prepared.bottomD, readPositive(buildArgs.lowerDepthCm, 0) / 100);
  const totalD = Math.max(topD, bottomD, dims.minDepthM);

  const slabHeight = Math.max(dims.zFightLiftM, dims.slabHeightM);
  const apronHeight = Math.max(dims.zFightLiftM, dims.frontApronHeightM);
  const apronDepth = Math.max(dims.zFightLiftM, dims.apronDepthM);
  const frontOverhang = Math.max(0, dims.frontOverhangM);
  const sideOverhang = Math.max(0, dims.sideOverhangM);

  const width = Math.max(dims.minWidthM, totalW + sideOverhang * 2);
  const depth = Math.max(dims.minDepthM, totalD + frontOverhang);
  const seamY = prepared.bottomH + Math.max(0, Number(buildArgs.splitSeamGapM) || 0) / 2;
  const slabY = seamY + slabHeight / 2 - Math.max(0, dims.seamCoverDropM);
  const slabZ = frontOverhang / 2;

  createBoard(
    width,
    slabHeight,
    depth,
    0,
    slabY,
    slabZ,
    resolveSeparatorMaterial(buildArgs),
    STACK_SPLIT_DECORATIVE_SEPARATOR_PART_ID
  );

  const frontZ = -totalD / 2 + depth - apronDepth / 2 + dims.zFightLiftM;
  const apronY = slabY + slabHeight / 2 - apronHeight / 2;

  const apronObject = createBoard(
    width,
    apronHeight,
    apronDepth,
    0,
    apronY,
    frontZ,
    resolveSeparatorMaterial(buildArgs),
    STACK_SPLIT_DECORATIVE_SEPARATOR_PART_ID
  );

  appendSeparatorFrontAccent({
    buildArgs,
    apronObject,
    width,
    apronHeight,
    apronDepth,
  });
}
