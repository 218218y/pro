import {
  CARCASS_CORNICE_DIMENSIONS,
  CARCASS_SHELL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { CornerCell } from './corner_geometry_plan.js';
import type { CorniceCtxLike, CorniceLocalsLike } from './corner_wing_cornice_contracts.js';
import { resolveCornerWingCorniceTopY } from './corner_wing_cornice_contracts.js';

const CORNICE_COMMON = CARCASS_CORNICE_DIMENSIONS.common;
const CORNICE_PROFILE = CARCASS_CORNICE_DIMENSIONS.profile;

export const CORNER_CORNICE_EPS = CORNICE_COMMON.epsilonM;
export const CORNER_CORNICE_MIN_SEGMENT_LENGTH = CORNICE_COMMON.minSegmentLengthM;
export const CORNER_CORNICE_PROFILE_SEAM_EPS = CORNICE_PROFILE.seamEpsilonM;

export type CornerCornicePathSegment = {
  ax: number;
  az: number;
  bx: number;
  bz: number;
};

export type CornerCorniceVector2 = { x: number; z: number };

export type CornerCorniceMiterExtension = {
  aEnd: number;
  bStart: number;
};

export type CornerCorniceSideClosure = {
  startZ: number;
  internal: boolean;
  connectorSeam?: boolean;
};

export type CornerCorniceRun = {
  left: number;
  right: number;
  startIndex: number;
  endIndex: number;
  depth: number;
  maxDepth: number;
  topY: number;
  frontPath: CornerCornicePathSegment[];
  leftSide: CornerCorniceSideClosure | null;
  rightSide: CornerCorniceSideClosure | null;
};

type CornerCorniceFootprint = {
  path: CornerCornicePathSegment[];
  edgeDepth: number;
  maxDepth: number;
};

type CornerCorniceModule = {
  index: number;
  left: number;
  right: number;
  depth: number;
  maxDepth: number;
  topY: number;
  cell: CornerCell | null;
};

export function shouldBuildSegmentedCornerWingCornice(
  ctx: CorniceCtxLike,
  locals: CorniceLocalsLike
): boolean {
  const cells = resolveCornerCorniceCells(locals);
  if (!cells.length) return false;

  for (const cell of cells) {
    if (
      cell.__hasActiveSpecialDims ||
      cell.__hasActiveDepth ||
      cell.__hasActiveHeight ||
      cell.__hexCellGeometry
    ) {
      return true;
    }
    if (Math.abs(positiveNumberOr(cell.depth, ctx.wingD) - ctx.wingD) > CORNER_CORNICE_EPS) return true;
    if (Math.abs(positiveNumberOr(cell.bodyHeight, ctx.wingH) - ctx.wingH) > CORNER_CORNICE_EPS) return true;
  }

  return false;
}

export function buildCornerWingCorniceRuns(
  ctx: CorniceCtxLike,
  locals: CorniceLocalsLike
): CornerCorniceRun[] {
  if (!shouldBuildSegmentedCornerWingCornice(ctx, locals)) return [];

  const modules = buildCornerCorniceModules(ctx, locals);
  if (!modules.length) return [];

  const backTrimZ = resolveCornerWingCorniceBackTrimZ(ctx, locals);
  const runs: CornerCorniceRun[] = [];

  for (const mod of modules) {
    const footprint = buildCornerModuleCorniceFootprint(ctx, mod);
    const depth = footprint.edgeDepth;
    const prev = runs[runs.length - 1];
    if (prev && sameCornerCornicePlane(prev, { depth, topY: mod.topY })) {
      prev.right = mod.right;
      prev.endIndex = mod.index;
      prev.maxDepth = Math.max(prev.maxDepth, footprint.maxDepth);
      prev.frontPath.push(...footprint.path);
    } else {
      runs.push({
        left: mod.left,
        right: mod.right,
        startIndex: mod.index,
        endIndex: mod.index,
        depth,
        maxDepth: footprint.maxDepth,
        topY: mod.topY,
        frontPath: footprint.path,
        leftSide: null,
        rightSide: null,
      });
    }
  }

  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i];
    run.leftSide = resolveCornerRunSideClosure(ctx, run, runs[i - 1], 'left', backTrimZ);
    run.rightSide = resolveCornerRunSideClosure(ctx, run, runs[i + 1], 'right', backTrimZ);
  }

  return runs.filter(run => run.right - run.left > CORNER_CORNICE_EPS && run.frontPath.length > 0);
}

export function resolveCornerWingCorniceBackTrimZ(
  ctx: Pick<CorniceCtxLike, 'wingD'>,
  locals: Pick<CorniceLocalsLike, '__wingBackPanelThick' | '__wingBackPanelCenterZ'>
): number {
  const frontInsetZ = CARCASS_SHELL_DIMENSIONS.frontInsetZM;
  const backPlaneZ = frontInsetZ - ctx.wingD;
  const backPanelOutsideZ = locals.__wingBackPanelCenterZ - locals.__wingBackPanelThick / 2;
  return Math.max(backPlaneZ, backPanelOutsideZ);
}

export function cornerWingCorniceFrontZ(ctx: Pick<CorniceCtxLike, 'wingD'>, depth: number): number {
  const safeDepth = Math.max(CORNER_CORNICE_MIN_SEGMENT_LENGTH, depth);
  return -ctx.wingD + safeDepth + CARCASS_SHELL_DIMENSIONS.frontInsetZM;
}

function resolveCornerCorniceCells(locals: CorniceLocalsLike): CornerCell[] {
  return Array.isArray(locals.cornerCells) ? locals.cornerCells : [];
}

function buildCornerCorniceModules(ctx: CorniceCtxLike, locals: CorniceLocalsLike): CornerCorniceModule[] {
  const cells = resolveCornerCorniceCells(locals);
  const modules: CornerCorniceModule[] = [];
  let index = 0;

  const blindWidth = Math.max(0, ctx.blindWidth || 0);
  if (blindWidth > CORNER_CORNICE_MIN_SEGMENT_LENGTH) {
    modules.push({
      index,
      left: 0,
      right: blindWidth,
      depth: Math.max(ctx.woodThick, ctx.wingD),
      maxDepth: Math.max(ctx.woodThick, ctx.wingD),
      topY: resolveCornerWingCorniceTopY(ctx, ctx.wingH),
      cell: null,
    });
    index += 1;
  }

  for (const cell of cells) {
    const left = finiteNumberOr(cell.startX, blindWidth);
    const width = Math.max(CORNER_CORNICE_MIN_SEGMENT_LENGTH, finiteNumberOr(cell.width, 0));
    const depth = Math.max(ctx.woodThick, positiveNumberOr(cell.depth, ctx.wingD));
    const hexDepth = cell.__hexCellGeometry
      ? Math.max(depth, positiveNumberOr(cell.__hexCellGeometry.doorDepthM, depth))
      : depth;
    modules.push({
      index,
      left,
      right: left + width,
      depth,
      maxDepth: hexDepth,
      topY: resolveCornerWingCorniceTopY(
        ctx,
        Math.max(ctx.woodThick * 2, positiveNumberOr(cell.bodyHeight, ctx.wingH))
      ),
      cell,
    });
    index += 1;
  }

  return modules;
}

function buildCornerModuleCorniceFootprint(
  ctx: CorniceCtxLike,
  mod: CornerCorniceModule
): CornerCorniceFootprint {
  const edgeDepth = Math.max(ctx.woodThick, mod.depth);
  const defaultFrontZ = cornerWingCorniceFrontZ(ctx, edgeDepth);
  const hex = mod.cell?.__hexCellGeometry || null;
  if (!hex) {
    return {
      edgeDepth,
      maxDepth: edgeDepth,
      path: [{ ax: mod.left, az: defaultFrontZ, bx: mod.right, bz: defaultFrontZ }],
    };
  }

  const sideDepth = Math.max(ctx.woodThick, positiveNumberOr(hex.sideDepthM, edgeDepth));
  const doorDepth = Math.max(sideDepth, positiveNumberOr(hex.doorDepthM, sideDepth));
  const sideFrontZ = cornerWingCorniceFrontZ(ctx, sideDepth);
  const doorZ = cornerWingCorniceFrontZ(ctx, doorDepth);
  const centerX = (mod.left + mod.right) / 2;
  const halfDoorW = Math.max(ctx.woodThick, positiveNumberOr(hex.doorWidthM, mod.right - mod.left)) / 2;
  const doorLeftX = Math.max(mod.left + ctx.woodThick, centerX - halfDoorW);
  const doorRightX = Math.min(mod.right - ctx.woodThick, centerX + halfDoorW);
  const path = filterCornerCornicePath([
    { ax: mod.left, az: sideFrontZ, bx: doorLeftX, bz: doorZ },
    { ax: doorLeftX, az: doorZ, bx: doorRightX, bz: doorZ },
    { ax: doorRightX, az: doorZ, bx: mod.right, bz: sideFrontZ },
  ]);

  return {
    edgeDepth: sideDepth,
    maxDepth: doorDepth,
    path: path.length ? path : [{ ax: mod.left, az: defaultFrontZ, bx: mod.right, bz: defaultFrontZ }],
  };
}

function sameCornerCornicePlane(
  run: Pick<CornerCorniceRun, 'depth' | 'topY'>,
  metrics: { depth: number; topY: number }
): boolean {
  return (
    Math.abs(run.depth - metrics.depth) <= CORNER_CORNICE_EPS &&
    Math.abs(run.topY - metrics.topY) <= CORNER_CORNICE_EPS
  );
}

function resolveCornerRunSideClosure(
  ctx: CorniceCtxLike,
  run: CornerCorniceRun,
  neighbor: CornerCorniceRun | undefined,
  side: 'left' | 'right',
  backTrimZ: number
): CornerCorniceSideClosure | null {
  if (!neighbor) {
    if (side === 'left' && ctx.cornerConnectorActive) {
      const connectorTopY = resolveCornerWingCorniceTopY(ctx, ctx.wingH);
      if (run.topY > connectorTopY + CORNER_CORNICE_EPS) {
        return { startZ: backTrimZ, internal: false };
      }

      const firstFrontZ = firstCornerRunFrontZ(run, side);
      const connectorFrontZ = CARCASS_SHELL_DIMENSIONS.frontInsetZM;
      if (Math.abs(firstFrontZ - connectorFrontZ) > CORNER_CORNICE_EPS) {
        return { startZ: connectorFrontZ, internal: true, connectorSeam: true };
      }
      return null;
    }
    return { startZ: backTrimZ, internal: false };
  }

  if (Math.abs(run.topY - neighbor.topY) > CORNER_CORNICE_EPS) {
    return {
      startZ: backTrimZ,
      internal: run.topY < neighbor.topY - CORNER_CORNICE_EPS,
    };
  }

  if (run.depth > neighbor.depth + CORNER_CORNICE_EPS) {
    const runFrontZ = cornerWingCorniceFrontZ(ctx, run.depth);
    const neighborFrontZ = cornerWingCorniceFrontZ(ctx, neighbor.depth);
    return {
      startZ: Math.min(runFrontZ - CORNER_CORNICE_MIN_SEGMENT_LENGTH, Math.max(backTrimZ, neighborFrontZ)),
      internal: true,
    };
  }

  return null;
}

function firstCornerRunFrontZ(run: CornerCorniceRun, side: 'left' | 'right'): number {
  const seg = side === 'left' ? run.frontPath[0] : run.frontPath[run.frontPath.length - 1];
  if (!seg) return CARCASS_SHELL_DIMENSIONS.frontInsetZM;
  const z = side === 'left' ? seg.az : seg.bz;
  return Number.isFinite(z) ? z : CARCASS_SHELL_DIMENSIONS.frontInsetZM;
}

export function cornerCornicePathSegmentLength(seg: CornerCornicePathSegment): number {
  const dx = seg.bx - seg.ax;
  const dz = seg.bz - seg.az;
  const len = Math.sqrt(dx * dx + dz * dz);
  return Number.isFinite(len) ? len : 0;
}

export function filterCornerCornicePath(path: CornerCornicePathSegment[]): CornerCornicePathSegment[] {
  return path.filter(seg => cornerCornicePathSegmentLength(seg) > CORNER_CORNICE_EPS);
}

export function shiftCornerPathStart(
  seg: CornerCornicePathSegment,
  amount: number
): CornerCornicePathSegment {
  const len = cornerCornicePathSegmentLength(seg);
  if (len <= CORNER_CORNICE_EPS || amount <= 0) return seg;
  const t = Math.min(1, amount / len);
  return {
    ...seg,
    ax: seg.ax + (seg.bx - seg.ax) * t,
    az: seg.az + (seg.bz - seg.az) * t,
  };
}

export function shiftCornerPathEnd(seg: CornerCornicePathSegment, amount: number): CornerCornicePathSegment {
  const len = cornerCornicePathSegmentLength(seg);
  if (len <= CORNER_CORNICE_EPS || amount <= 0) return seg;
  const t = Math.min(1, amount / len);
  return {
    ...seg,
    bx: seg.bx - (seg.bx - seg.ax) * t,
    bz: seg.bz - (seg.bz - seg.az) * t,
  };
}

export function trimCornerPathStart(
  path: CornerCornicePathSegment[],
  amount: number
): CornerCornicePathSegment[] {
  if (amount <= 0 || !path.length) return path;
  const out = path.map(seg => ({ ...seg }));
  let remaining = amount;
  while (out.length && remaining > CORNER_CORNICE_EPS) {
    const len = cornerCornicePathSegmentLength(out[0]);
    if (len <= remaining + CORNER_CORNICE_EPS) {
      remaining -= len;
      out.shift();
    } else {
      out[0] = shiftCornerPathStart(out[0], remaining);
      remaining = 0;
    }
  }
  return filterCornerCornicePath(out);
}

export function trimCornerPathEnd(
  path: CornerCornicePathSegment[],
  amount: number
): CornerCornicePathSegment[] {
  if (amount <= 0 || !path.length) return path;
  const out = path.map(seg => ({ ...seg }));
  let remaining = amount;
  while (out.length && remaining > CORNER_CORNICE_EPS) {
    const lastIndex = out.length - 1;
    const len = cornerCornicePathSegmentLength(out[lastIndex]);
    if (len <= remaining + CORNER_CORNICE_EPS) {
      remaining -= len;
      out.pop();
    } else {
      out[lastIndex] = shiftCornerPathEnd(out[lastIndex], remaining);
      remaining = 0;
    }
  }
  return filterCornerCornicePath(out);
}

export function trimCornerCornicePath(
  path: CornerCornicePathSegment[],
  startTrim: number,
  endTrim: number
): CornerCornicePathSegment[] {
  return trimCornerPathEnd(trimCornerPathStart(path, Math.max(0, startTrim)), Math.max(0, endTrim));
}

export function extendCornerPathStart(
  seg: CornerCornicePathSegment,
  amount: number
): CornerCornicePathSegment {
  const len = cornerCornicePathSegmentLength(seg);
  if (len <= CORNER_CORNICE_EPS || amount <= 0) return seg;
  const ux = (seg.bx - seg.ax) / len;
  const uz = (seg.bz - seg.az) / len;
  return { ...seg, ax: seg.ax - ux * amount, az: seg.az - uz * amount };
}

export function extendCornerPathEnd(seg: CornerCornicePathSegment, amount: number): CornerCornicePathSegment {
  const len = cornerCornicePathSegmentLength(seg);
  if (len <= CORNER_CORNICE_EPS || amount <= 0) return seg;
  const ux = (seg.bx - seg.ax) / len;
  const uz = (seg.bz - seg.az) / len;
  return { ...seg, bx: seg.bx + ux * amount, bz: seg.bz + uz * amount };
}

export function extendCornerCornicePath(
  path: CornerCornicePathSegment[],
  startExtension: number,
  endExtension: number
): CornerCornicePathSegment[] {
  const out = filterCornerCornicePath(path.map(seg => ({ ...seg })));
  if (!out.length) return out;
  out[0] = extendCornerPathStart(out[0], Math.max(0, startExtension));
  const lastIndex = out.length - 1;
  out[lastIndex] = extendCornerPathEnd(out[lastIndex], Math.max(0, endExtension));
  return filterCornerCornicePath(out);
}

export function cornerWaveRotationForPathSegment(seg: CornerCornicePathSegment): number {
  return Math.atan2(-(seg.bz - seg.az), seg.bx - seg.ax);
}

export function cornerProfileRotationForPathSegment(seg: CornerCornicePathSegment): number {
  return Math.atan2(-(seg.bx - seg.ax), -(seg.bz - seg.az));
}

export function isStraightCornerFrontPathSegment(seg: CornerCornicePathSegment): boolean {
  return Math.abs(seg.bz - seg.az) <= CORNER_CORNICE_EPS;
}

export function cornerOutwardNormalForPathSegment(seg: CornerCornicePathSegment): CornerCorniceVector2 {
  const len = cornerCornicePathSegmentLength(seg);
  if (len <= CORNER_CORNICE_EPS) return { x: 0, z: 1 };
  return {
    x: -(seg.bz - seg.az) / len,
    z: (seg.bx - seg.ax) / len,
  };
}

export function inwardCornerWaveCenterForPathSegment(
  seg: CornerCornicePathSegment,
  inset: number
): { x: number; z: number } {
  const midX = (seg.ax + seg.bx) / 2;
  const midZ = (seg.az + seg.bz) / 2;
  if (inset <= 0) return { x: midX, z: midZ };
  const outward = cornerOutwardNormalForPathSegment(seg);
  return { x: midX - outward.x * inset, z: midZ - outward.z * inset };
}

export function cornerPathDirection(seg: CornerCornicePathSegment): CornerCorniceVector2 | null {
  const len = cornerCornicePathSegmentLength(seg);
  if (len <= CORNER_CORNICE_EPS) return null;
  return { x: (seg.bx - seg.ax) / len, z: (seg.bz - seg.az) / len };
}

function positiveFiniteOrZero(value: number): number {
  return Number.isFinite(value) && value > CORNER_CORNICE_EPS ? value : 0;
}

export function cornerMiterExtensionForPathJoint(
  a: CornerCornicePathSegment,
  b: CornerCornicePathSegment,
  aOverhang: number,
  bOverhang: number,
  aNormalOverride?: CornerCorniceVector2 | null,
  bNormalOverride?: CornerCorniceVector2 | null
): CornerCorniceMiterExtension {
  const aDir = cornerPathDirection(a);
  const bDir = cornerPathDirection(b);
  if (!aDir || !bDir) return { aEnd: 0, bStart: 0 };

  const aNormal = aNormalOverride || cornerOutwardNormalForPathSegment(a);
  const bNormal = bNormalOverride || cornerOutwardNormalForPathSegment(b);
  const rhsX = bNormal.x * Math.max(0, bOverhang) - aNormal.x * Math.max(0, aOverhang);
  const rhsZ = bNormal.z * Math.max(0, bOverhang) - aNormal.z * Math.max(0, aOverhang);

  const bCoeffX = -bDir.x;
  const bCoeffZ = -bDir.z;
  const det = aDir.x * bCoeffZ - aDir.z * bCoeffX;
  if (!Number.isFinite(det) || Math.abs(det) <= CORNICE_COMMON.thetaClampM * CORNICE_COMMON.thetaClampM) {
    const mutualTrim = cornerMutualPathJointMiterTrim(a, b, Math.min(aOverhang, bOverhang));
    return { aEnd: mutualTrim, bStart: mutualTrim };
  }

  const s = (rhsX * bCoeffZ - rhsZ * bCoeffX) / det;
  const t = (aDir.x * rhsZ - aDir.z * rhsX) / det;
  return { aEnd: positiveFiniteOrZero(s), bStart: positiveFiniteOrZero(-t) };
}

export function cornerExteriorSideNormal(side: 'left' | 'right'): CornerCorniceVector2 {
  return side === 'left' ? { x: -1, z: 0 } : { x: 1, z: 0 };
}

export function cornerPathTurnAngle(a: CornerCornicePathSegment, b: CornerCornicePathSegment): number {
  const lenA = cornerCornicePathSegmentLength(a);
  const lenB = cornerCornicePathSegmentLength(b);
  if (lenA <= CORNER_CORNICE_EPS || lenB <= CORNER_CORNICE_EPS) return 0;
  const uxA = (a.bx - a.ax) / lenA;
  const uzA = (a.bz - a.az) / lenA;
  const uxB = (b.bx - b.ax) / lenB;
  const uzB = (b.bz - b.az) / lenB;
  const dot = Math.max(-1, Math.min(1, uxA * uxB + uzA * uzB));
  const angle = Math.acos(dot);
  return Number.isFinite(angle) ? angle : 0;
}

export function cornerMiterTrimForPathJoint(
  a: CornerCornicePathSegment,
  b: CornerCornicePathSegment,
  profileOverhang: number
): number {
  const angle = cornerPathTurnAngle(a, b);
  if (angle <= CORNICE_COMMON.thetaClampM) return 0;
  const trim =
    Math.max(0, profileOverhang) * Math.tan(Math.min(Math.PI - CORNICE_COMMON.thetaClampM, angle) / 2);
  return Number.isFinite(trim) ? trim + CORNER_CORNICE_PROFILE_SEAM_EPS : 0;
}

export function cornerMutualPathJointMiterTrim(
  a: CornerCornicePathSegment,
  b: CornerCornicePathSegment,
  profileOverhang: number
): number {
  const trim = cornerMiterTrimForPathJoint(a, b, profileOverhang);
  if (!(Number.isFinite(trim) && trim > 0)) return 0;
  return trim;
}

export function clampCornerMiterTrimForSegment(trim: number, segLen: number): number {
  if (!Number.isFinite(trim) || trim <= 0 || !Number.isFinite(segLen) || segLen <= CORNER_CORNICE_EPS)
    return 0;
  return Math.min(trim, Math.max(0, segLen * 0.45));
}

export function leftCornerSideConnectionPath(seg: CornerCornicePathSegment): CornerCornicePathSegment {
  return { ax: seg.ax, az: seg.az - 1, bx: seg.ax, bz: seg.az };
}

export function rightCornerSideConnectionPath(seg: CornerCornicePathSegment): CornerCornicePathSegment {
  return { ax: seg.bx, az: seg.bz, bx: seg.bx, bz: seg.bz - 1 };
}

export function leftCornerExteriorMiterTrim(seg: CornerCornicePathSegment, profileOverhang: number): number {
  return cornerMiterTrimForPathJoint(leftCornerSideConnectionPath(seg), seg, profileOverhang);
}

export function rightCornerExteriorMiterTrim(seg: CornerCornicePathSegment, profileOverhang: number): number {
  return cornerMiterTrimForPathJoint(seg, rightCornerSideConnectionPath(seg), profileOverhang);
}

export function shouldExtendCornerExteriorProfilePath(seg: CornerCornicePathSegment | undefined): boolean {
  return !!seg && isStraightCornerFrontPathSegment(seg);
}

export function shouldUseCornerOuterMiterForPath(renderPath: CornerCornicePathSegment[]): boolean {
  return renderPath.length > 1;
}

export function cornerProfileOuterEndZ(
  seg: CornerCornicePathSegment | undefined,
  end: 'start' | 'end',
  defaultFrontZ: number,
  profileOverhangZ: number
): number {
  if (!seg) return defaultFrontZ;
  const baseZ = end === 'start' ? seg.az : seg.bz;
  const outward = cornerOutwardNormalForPathSegment(seg);
  const z = baseZ + Math.max(0, profileOverhangZ) * Math.max(0, outward.z);
  return Number.isFinite(z) ? z : defaultFrontZ;
}

export function resolveCornerProfileSideEndZ(args: {
  pathSeg: CornerCornicePathSegment | undefined;
  end: 'start' | 'end';
  defaultEndZ: number;
  useOuterMiter?: boolean;
  profileOverhangZ: number;
}): number {
  if (args.useOuterMiter && args.pathSeg && !isStraightCornerFrontPathSegment(args.pathSeg)) {
    return args.end === 'start' ? args.pathSeg.az : args.pathSeg.bz;
  }
  const z = cornerProfileOuterEndZ(args.pathSeg, args.end, args.defaultEndZ, args.profileOverhangZ);
  return Math.max(args.defaultEndZ - args.profileOverhangZ, z);
}

function finiteNumberOr(value: unknown, defaultValue: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

function positiveNumberOr(value: unknown, defaultValue: number): number {
  const n = finiteNumberOr(value, defaultValue);
  return Number.isFinite(n) && n > 0 ? n : defaultValue;
}
