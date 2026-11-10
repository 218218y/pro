// Builder core carcass cornice assembly.

import {
  CARCASS_CORNICE_ANGLE_POLICY,
  CARCASS_CORNICE_RENDER_POLICY,
  resolveCorniceDimensionsM,
} from '../../shared/dimensions/carcass_cornice_render_policy.js';
import type {
  CarcassCorniceMode,
  CarcassCornicePlan,
  CarcassCorniceSegment,
  CorniceProfileSegment,
  CorniceWaveFrontSegment,
  CorniceWaveSideSegment,
} from './carcass_cornice_ir.js';
import { CARCASS_BACK_INSET_Z, type PreparedCarcassInput } from './core_carcass_shared.js';
import { resolveHexCellGeometry, type HexCellGeometry } from '../features/hex_cell/index.js';
import {
  resolveRemovedFrameSideOuterBounds,
  type RemovedFrameSideConstructionPlan,
} from './removed_frame_side_construction_plan.js';
import {
  buildCornerCorniceProfile,
  buildInternalCornerCorniceProfile,
  buildStraightCorniceProfile,
  offsetWaveCornicePath,
} from './corner_cornice_profile_plan.js';
import { normalizeCorniceType, type CorniceType } from '../../../types/cornice_type.js';

const CORNICE_COMMON = CARCASS_CORNICE_RENDER_POLICY.common;
const CORNICE_WAVE = CARCASS_CORNICE_RENDER_POLICY.wave;
const CORNICE_PROFILE = CARCASS_CORNICE_RENDER_POLICY.profile;

const CORNICE_EPS = CORNICE_COMMON.epsilonM;
const CORNICE_Y_EPS = CORNICE_COMMON.yLiftM;
const CORNICE_THETA_CLAMP_RAD = CARCASS_CORNICE_ANGLE_POLICY.thetaClampRad;

const PROFILE_SEAM_EPS = CORNICE_PROFILE.seamEpsilonM;

type CorniceDimensions = ReturnType<typeof resolveCorniceDimensionsM>;

export function buildCarcassCornice(prepared: PreparedCarcassInput): CarcassCornicePlan | null {
  const { totalW, D, startY, cabinetBodyHeight, hasCornice, corniceType, baseLegTopPlatformHeight } =
    prepared;
  if (!hasCornice) return null;

  const topSurfaceY = startY + cabinetBodyHeight + baseLegTopPlatformHeight;
  const corniceTypeNorm = normalizeCorniceType(corniceType);
  const dimensions = resolveCorniceDimensionsM(corniceTypeNorm, prepared.corniceDimensions);
  if (shouldBuildSegmentedCornice(prepared)) {
    return buildSegmentedCornice(prepared, corniceTypeNorm, dimensions);
  }

  const corniceParams: CorniceParams = {
    totalW,
    D,
    dimensions,
    woodThick: prepared.woodThick,
    closedDoorFrontOffsetM: prepared.closedDoorFrontOffsetM,
    topY: topSurfaceY,
    removedFrameSidePlan: prepared.removedFrameSidePlan,
  };
  if (corniceTypeNorm === 'wave') {
    return buildWaveCornice(corniceParams);
  }
  return buildProfileCornice(corniceParams, corniceTypeNorm === 'straight');
}

type CorniceParams = {
  dimensions: CorniceDimensions;
  totalW: number;
  D: number;
  woodThick: number;
  closedDoorFrontOffsetM: number;
  topY: number;
  removedFrameSidePlan: RemovedFrameSideConstructionPlan;
};

type CorniceOuterBoundsInput = Pick<CorniceParams, 'totalW' | 'woodThick' | 'removedFrameSidePlan'>;

function resolveCorniceOuterBounds(input: CorniceOuterBoundsInput): { left: number; right: number } {
  return resolveRemovedFrameSideOuterBounds({
    constructionPlan: input.removedFrameSidePlan,
    totalW: input.totalW,
    woodThick: input.woodThick,
  });
}

type CorniceSideClosure = {
  startDepth: number;
  internal: boolean;
};

type CornicePathSegment = {
  ax: number;
  az: number;
  bx: number;
  bz: number;
};

type CorniceVector2 = { x: number; z: number };

type CorniceMiterExtension = {
  aEnd: number;
  bStart: number;
};

type ModuleCorniceFootprint = {
  path: CornicePathSegment[];
  edgeDepth: number;
  maxDepth: number;
};

type CorniceRun = {
  left: number;
  right: number;
  startIndex: number;
  endIndex: number;
  depth: number;
  maxDepth: number;
  topY: number;
  frontPath: CornicePathSegment[];
  leftSide: CorniceSideClosure | null;
  rightSide: CorniceSideClosure | null;
};

type CorniceSectionParams = {
  dimensions: CorniceDimensions;
  left: number;
  right: number;
  globalD: number;
  depth: number;
  woodThick: number;
  closedDoorFrontOffsetM: number;
  topY: number;
  frontPath: CornicePathSegment[];
  leftSide: CorniceSideClosure | null;
  rightSide: CorniceSideClosure | null;
};

function shouldBuildSegmentedCornice(prepared: PreparedCarcassInput): boolean {
  const { moduleWidths, moduleHeightsRaw, moduleDepths, isStepped, isDepthStepped } = prepared;
  if (!moduleWidths || moduleWidths.length < 1) return false;
  if (hasHexCorniceFootprint(prepared)) return true;
  if (moduleWidths.length <= 1) return false;
  if (!isStepped && !isDepthStepped) return false;
  if (isStepped && (!moduleHeightsRaw || moduleHeightsRaw.length !== moduleWidths.length)) return false;
  if (isDepthStepped && (!moduleDepths || moduleDepths.length !== moduleWidths.length)) return false;
  return true;
}

function hasHexCorniceFootprint(prepared: PreparedCarcassInput): boolean {
  const { moduleWidths, moduleConfigs } = prepared;
  if (!moduleWidths || !moduleConfigs || moduleWidths.length !== moduleConfigs.length) return false;
  for (const [i, moduleWidth] of moduleWidths.entries()) {
    if (resolveHexCellForModule(prepared, i, moduleWidth)) return true;
  }
  return false;
}

function buildSegmentedCornice(
  prepared: PreparedCarcassInput,
  corniceTypeNorm: CorniceType,
  dimensions: CorniceDimensions
): CarcassCornicePlan | null {
  const runs = buildCorniceRuns(prepared);
  if (!runs.length) return null;

  const segments: CarcassCorniceSegment[] = [];
  for (const run of runs) {
    const section: CorniceSectionParams = {
      dimensions,
      left: run.left,
      right: run.right,
      globalD: prepared.D,
      depth: run.depth,
      woodThick: prepared.woodThick,
      closedDoorFrontOffsetM: prepared.closedDoorFrontOffsetM,
      topY: run.topY,
      frontPath: run.frontPath,
      leftSide: run.leftSide,
      rightSide: run.rightSide,
    };
    if (corniceTypeNorm === 'wave') {
      segments.push(...buildWaveCorniceSection(section));
    } else {
      segments.push(...buildProfileCorniceSection(section, corniceTypeNorm === 'straight'));
    }
  }

  const isWave = corniceTypeNorm === 'wave';
  return buildCorniceEnvelope({
    mode: isWave
      ? 'wave_frame_segmented'
      : corniceTypeNorm === 'straight'
        ? 'straight_open_back_segmented'
        : 'profile_open_back_segmented',
    segments,
  });
}

function buildCorniceRuns(prepared: PreparedCarcassInput): CorniceRun[] {
  const { totalW, D, H, woodThick, startY, cabinetBodyHeight, moduleWidths, moduleHeightsRaw, moduleDepths } =
    prepared;
  if (!moduleWidths || !moduleWidths.length) return [];

  const runs: CorniceRun[] = [];
  let internalLeft = -totalW / 2 + woodThick;
  const outerBounds = resolveCorniceOuterBounds(prepared);

  for (const [i, moduleWidth] of moduleWidths.entries()) {
    const left = i === 0 ? outerBounds.left : internalLeft;
    const right = i === moduleWidths.length - 1 ? outerBounds.right : internalLeft + moduleWidth + woodThick;
    const moduleDepth = moduleDepths ? moduleDepths[i] : D;
    const fallbackDepth = Math.max(woodThick, typeof moduleDepth === 'number' ? moduleDepth : D);
    const footprint = buildModuleCorniceFootprint(prepared, i, left, right, fallbackDepth);
    const depth = footprint.edgeDepth;
    const rawHeight = moduleHeightsRaw ? moduleHeightsRaw[i] : H;
    const totalHeight = typeof rawHeight === 'number' && Number.isFinite(rawHeight) ? rawHeight : H;
    const bodyHeight = Math.min(cabinetBodyHeight, Math.max(woodThick * 2, totalHeight - startY));
    const topY = startY + bodyHeight + prepared.baseLegTopPlatformHeight;

    const prev = runs[runs.length - 1];
    if (prev && sameCornicePlane(prev, { depth, topY })) {
      prev.right = right;
      prev.endIndex = i;
      prev.maxDepth = Math.max(prev.maxDepth, footprint.maxDepth);
      prev.frontPath.push(...footprint.path);
    } else {
      runs.push({
        left,
        right,
        startIndex: i,
        endIndex: i,
        depth,
        maxDepth: footprint.maxDepth,
        topY,
        frontPath: footprint.path,
        leftSide: null,
        rightSide: null,
      });
    }

    internalLeft += moduleWidth + (i < moduleWidths.length - 1 ? woodThick : 0);
  }

  for (const [i, run] of runs.entries()) {
    run.leftSide = resolveRunSideClosure(run, runs[i - 1]);
    run.rightSide = resolveRunSideClosure(run, runs[i + 1]);
  }

  return runs.filter(run => run.right - run.left > CORNICE_EPS);
}

function sameCornicePlane(
  run: Pick<CorniceRun, 'depth' | 'topY'>,
  metrics: { depth: number; topY: number }
): boolean {
  return (
    Math.abs(run.depth - metrics.depth) <= CORNICE_EPS && Math.abs(run.topY - metrics.topY) <= CORNICE_EPS
  );
}

function resolveRunSideClosure(run: CorniceRun, neighbor: CorniceRun | undefined): CorniceSideClosure | null {
  if (!neighbor) {
    return { startDepth: CARCASS_BACK_INSET_Z, internal: false };
  }
  if (Math.abs(run.topY - neighbor.topY) > CORNICE_EPS) {
    return {
      startDepth: CARCASS_BACK_INSET_Z,
      internal: run.topY < neighbor.topY - CORNICE_EPS,
    };
  }
  if (run.depth > neighbor.depth + CORNICE_EPS) {
    return {
      startDepth: Math.min(
        run.depth - CORNICE_COMMON.minSegmentLengthM,
        Math.max(CARCASS_BACK_INSET_Z, neighbor.depth)
      ),
      internal: true,
    };
  }
  return null;
}

function resolveHexCellForModule(
  prepared: PreparedCarcassInput,
  index: number,
  moduleWidth: number
): HexCellGeometry | null {
  const cfgMod = prepared.moduleConfigs?.[index];
  if (!cfgMod) return null;
  return resolveHexCellGeometry({
    cfgMod,
    moduleWidthM: Math.max(prepared.woodThick * 2, moduleWidth),
    defaultDepthM: prepared.D,
    woodThickM: prepared.woodThick,
  });
}

function buildModuleCorniceFootprint(
  prepared: PreparedCarcassInput,
  index: number,
  left: number,
  right: number,
  fallbackDepth: number
): ModuleCorniceFootprint {
  const backZ = -prepared.D / 2;
  const edgeDepth = Math.max(prepared.woodThick, fallbackDepth);
  const fallbackZ = backZ + edgeDepth;
  const hex = resolveHexCellForModule(prepared, index, Math.max(0, right - left));
  if (!hex) {
    return {
      edgeDepth,
      maxDepth: edgeDepth,
      path: [{ ax: left, az: fallbackZ, bx: right, bz: fallbackZ }],
    };
  }

  const sideDepth = Math.max(prepared.woodThick, hex.sideDepthM);
  const doorDepth = Math.max(sideDepth, hex.doorDepthM);
  const sideFrontZ = backZ + sideDepth;
  const doorZ = backZ + doorDepth;
  const centerX = (left + right) / 2;
  const halfDoorW = Math.max(prepared.woodThick, hex.doorWidthM) / 2;
  const doorLeftX = Math.max(left + prepared.woodThick, centerX - halfDoorW);
  const doorRightX = Math.min(right - prepared.woodThick, centerX + halfDoorW);
  const path = filterCornicePath([
    { ax: left, az: sideFrontZ, bx: doorLeftX, bz: doorZ },
    { ax: doorLeftX, az: doorZ, bx: doorRightX, bz: doorZ },
    { ax: doorRightX, az: doorZ, bx: right, bz: sideFrontZ },
  ]);

  return {
    edgeDepth: sideDepth,
    maxDepth: doorDepth,
    path: path.length ? path : [{ ax: left, az: fallbackZ, bx: right, bz: fallbackZ }],
  };
}

function cornicePathSegmentLength(seg: CornicePathSegment): number {
  const dx = seg.bx - seg.ax;
  const dz = seg.bz - seg.az;
  const len = Math.sqrt(dx * dx + dz * dz);
  return Number.isFinite(len) ? len : 0;
}

function filterCornicePath(path: CornicePathSegment[]): CornicePathSegment[] {
  return path.filter(seg => cornicePathSegmentLength(seg) > CORNICE_EPS);
}

function shiftPathStart(seg: CornicePathSegment, amount: number): CornicePathSegment {
  const len = cornicePathSegmentLength(seg);
  if (len <= CORNICE_EPS || amount <= 0) return seg;
  const t = Math.min(1, amount / len);
  return {
    ...seg,
    ax: seg.ax + (seg.bx - seg.ax) * t,
    az: seg.az + (seg.bz - seg.az) * t,
  };
}

function shiftPathEnd(seg: CornicePathSegment, amount: number): CornicePathSegment {
  const len = cornicePathSegmentLength(seg);
  if (len <= CORNICE_EPS || amount <= 0) return seg;
  const t = Math.min(1, amount / len);
  return {
    ...seg,
    bx: seg.bx - (seg.bx - seg.ax) * t,
    bz: seg.bz - (seg.bz - seg.az) * t,
  };
}

function trimPathStart(path: CornicePathSegment[], amount: number): CornicePathSegment[] {
  if (amount <= 0 || !path.length) return path;
  const out = path.map(seg => ({ ...seg }));
  let remaining = amount;
  while (out.length && remaining > CORNICE_EPS) {
    const first = out[0];
    if (!first) break;
    const len = cornicePathSegmentLength(first);
    if (len <= remaining + CORNICE_EPS) {
      remaining -= len;
      out.shift();
    } else {
      out[0] = shiftPathStart(first, remaining);
      remaining = 0;
    }
  }
  return filterCornicePath(out);
}

function trimPathEnd(path: CornicePathSegment[], amount: number): CornicePathSegment[] {
  if (amount <= 0 || !path.length) return path;
  const out = path.map(seg => ({ ...seg }));
  let remaining = amount;
  while (out.length && remaining > CORNICE_EPS) {
    const lastIndex = out.length - 1;
    const last = out[lastIndex];
    if (!last) break;
    const len = cornicePathSegmentLength(last);
    if (len <= remaining + CORNICE_EPS) {
      remaining -= len;
      out.pop();
    } else {
      out[lastIndex] = shiftPathEnd(last, remaining);
      remaining = 0;
    }
  }
  return filterCornicePath(out);
}

function trimCornicePath(
  path: CornicePathSegment[],
  startTrim: number,
  endTrim: number
): CornicePathSegment[] {
  return trimPathEnd(trimPathStart(path, Math.max(0, startTrim)), Math.max(0, endTrim));
}

function extendPathStart(seg: CornicePathSegment, amount: number): CornicePathSegment {
  const len = cornicePathSegmentLength(seg);
  if (len <= CORNICE_EPS || amount <= 0) return seg;
  const ux = (seg.bx - seg.ax) / len;
  const uz = (seg.bz - seg.az) / len;
  return { ...seg, ax: seg.ax - ux * amount, az: seg.az - uz * amount };
}

function extendPathEnd(seg: CornicePathSegment, amount: number): CornicePathSegment {
  const len = cornicePathSegmentLength(seg);
  if (len <= CORNICE_EPS || amount <= 0) return seg;
  const ux = (seg.bx - seg.ax) / len;
  const uz = (seg.bz - seg.az) / len;
  return { ...seg, bx: seg.bx + ux * amount, bz: seg.bz + uz * amount };
}

function extendCornicePath(
  path: CornicePathSegment[],
  startExtension: number,
  endExtension: number
): CornicePathSegment[] {
  const out = filterCornicePath(path.map(seg => ({ ...seg })));
  const first = out[0];
  if (!first) return out;
  out[0] = extendPathStart(first, Math.max(0, startExtension));
  const lastIndex = out.length - 1;
  const last = out[lastIndex];
  if (!last) return filterCornicePath(out);
  out[lastIndex] = extendPathEnd(last, Math.max(0, endExtension));
  return filterCornicePath(out);
}

function waveRotationForPathSegment(seg: CornicePathSegment): number {
  return Math.atan2(-(seg.bz - seg.az), seg.bx - seg.ax);
}

function outwardNormalForPathSegment(seg: CornicePathSegment): { x: number; z: number } {
  const len = cornicePathSegmentLength(seg);
  if (len <= CORNICE_EPS) return { x: 0, z: 1 };
  return {
    x: -(seg.bz - seg.az) / len,
    z: (seg.bx - seg.ax) / len,
  };
}

function inwardWaveCenterForPathSegment(seg: CornicePathSegment, inset: number): { x: number; z: number } {
  const midX = (seg.ax + seg.bx) / 2;
  const midZ = (seg.az + seg.bz) / 2;
  if (inset <= 0) return { x: midX, z: midZ };
  const outward = outwardNormalForPathSegment(seg);
  return { x: midX - outward.x * inset, z: midZ - outward.z * inset };
}

function profileRotationForPathSegment(seg: CornicePathSegment): number {
  return Math.atan2(-(seg.bx - seg.ax), -(seg.bz - seg.az));
}

function isStraightFrontPathSegment(seg: CornicePathSegment): boolean {
  return Math.abs(seg.bz - seg.az) <= CORNICE_EPS;
}

function pathTurnAngle(a: CornicePathSegment, b: CornicePathSegment): number {
  const lenA = cornicePathSegmentLength(a);
  const lenB = cornicePathSegmentLength(b);
  if (lenA <= CORNICE_EPS || lenB <= CORNICE_EPS) return 0;
  const uxA = (a.bx - a.ax) / lenA;
  const uzA = (a.bz - a.az) / lenA;
  const uxB = (b.bx - b.ax) / lenB;
  const uzB = (b.bz - b.az) / lenB;
  const dot = Math.max(-1, Math.min(1, uxA * uxB + uzA * uzB));
  const angle = Math.acos(dot);
  return Number.isFinite(angle) ? angle : 0;
}

function pathDirection(seg: CornicePathSegment): CorniceVector2 | null {
  const len = cornicePathSegmentLength(seg);
  if (len <= CORNICE_EPS) return null;
  return { x: (seg.bx - seg.ax) / len, z: (seg.bz - seg.az) / len };
}

function positiveFiniteOrZero(value: number): number {
  return Number.isFinite(value) && value > CORNICE_EPS ? value : 0;
}

function miterExtensionForPathJoint(
  a: CornicePathSegment,
  b: CornicePathSegment,
  aOverhang: number,
  bOverhang: number,
  aNormalOverride?: CorniceVector2 | null,
  bNormalOverride?: CorniceVector2 | null
): CorniceMiterExtension {
  const aDir = pathDirection(a);
  const bDir = pathDirection(b);
  if (!aDir || !bDir) return { aEnd: 0, bStart: 0 };

  const aNormal = aNormalOverride || outwardNormalForPathSegment(a);
  const bNormal = bNormalOverride || outwardNormalForPathSegment(b);
  const rhsX = bNormal.x * Math.max(0, bOverhang) - aNormal.x * Math.max(0, aOverhang);
  const rhsZ = bNormal.z * Math.max(0, bOverhang) - aNormal.z * Math.max(0, aOverhang);

  // Solve: aOuterJoint + s*aDir == bOuterJoint + t*bDir.
  // s > 0 extends A beyond its end. t < 0 means B must extend backwards before its start.
  const bCoeffX = -bDir.x;
  const bCoeffZ = -bDir.z;
  const det = aDir.x * bCoeffZ - aDir.z * bCoeffX;
  if (!Number.isFinite(det) || Math.abs(det) <= CORNICE_THETA_CLAMP_RAD * CORNICE_THETA_CLAMP_RAD) {
    const mutualTrim = mutualPathJointMiterTrim(a, b, Math.min(aOverhang, bOverhang));
    return { aEnd: mutualTrim, bStart: mutualTrim };
  }

  const s = (rhsX * bCoeffZ - rhsZ * bCoeffX) / det;
  const t = (aDir.x * rhsZ - aDir.z * rhsX) / det;
  return { aEnd: positiveFiniteOrZero(s), bStart: positiveFiniteOrZero(-t) };
}

function exteriorSideNormal(side: 'left' | 'right'): CorniceVector2 {
  return side === 'left' ? { x: -1, z: 0 } : { x: 1, z: 0 };
}

function miterTrimForPathJoint(
  a: CornicePathSegment,
  b: CornicePathSegment,
  profileOverhang: number
): number {
  const angle = pathTurnAngle(a, b);
  if (angle <= CORNICE_THETA_CLAMP_RAD) return 0;
  const trim =
    Math.max(0, profileOverhang) * Math.tan(Math.min(Math.PI - CORNICE_THETA_CLAMP_RAD, angle) / 2);
  return Number.isFinite(trim) ? trim + PROFILE_SEAM_EPS : 0;
}

function mutualPathJointMiterTrim(
  a: CornicePathSegment,
  b: CornicePathSegment,
  profileOverhang: number
): number {
  const trim = miterTrimForPathJoint(a, b, profileOverhang);
  if (!(Number.isFinite(trim) && trim > 0)) return 0;
  return trim;
}

function clampMiterTrimForSegment(trim: number, segLen: number): number {
  if (!Number.isFinite(trim) || trim <= 0 || !Number.isFinite(segLen) || segLen <= CORNICE_EPS) return 0;
  return Math.min(trim, Math.max(0, segLen * 0.45));
}

function leftSideConnectionPath(seg: CornicePathSegment): CornicePathSegment {
  return { ax: seg.ax, az: seg.az - 1, bx: seg.ax, bz: seg.az };
}

function rightSideConnectionPath(seg: CornicePathSegment): CornicePathSegment {
  return { ax: seg.bx, az: seg.bz, bx: seg.bx, bz: seg.bz - 1 };
}

function leftExteriorMiterTrim(seg: CornicePathSegment, profileOverhang: number): number {
  return miterTrimForPathJoint(leftSideConnectionPath(seg), seg, profileOverhang);
}

function rightExteriorMiterTrim(seg: CornicePathSegment, profileOverhang: number): number {
  return miterTrimForPathJoint(seg, rightSideConnectionPath(seg), profileOverhang);
}

function shouldExtendExteriorProfilePath(seg: CornicePathSegment | undefined): boolean {
  return !!seg && isStraightFrontPathSegment(seg);
}

function shouldUseOuterMiterForPath(renderPath: CornicePathSegment[]): boolean {
  return renderPath.length > 1;
}

function profileOuterEndZ(
  seg: CornicePathSegment | undefined,
  end: 'start' | 'end',
  fallbackZ: number,
  overhangZ: number
): number {
  if (!seg) return fallbackZ;
  const baseZ = end === 'start' ? seg.az : seg.bz;
  const outward = outwardNormalForPathSegment(seg);
  const z = baseZ + Math.max(0, overhangZ) * Math.max(0, outward.z);
  return Number.isFinite(z) ? z : fallbackZ;
}

function resolveProfileSideEndZ(args: {
  pathSeg: CornicePathSegment | undefined;
  end: 'start' | 'end';
  defaultEndZ: number;
  useOuterMiter?: boolean;
  overhangZ: number;
}): number {
  if (args.useOuterMiter && args.pathSeg && !isStraightFrontPathSegment(args.pathSeg)) {
    return args.end === 'start' ? args.pathSeg.az : args.pathSeg.bz;
  }
  const z = profileOuterEndZ(args.pathSeg, args.end, args.defaultEndZ, args.overhangZ);
  return Math.max(args.defaultEndZ - args.overhangZ, z);
}

function buildWaveCornice(params: CorniceParams): CarcassCornicePlan {
  const { D, woodThick, topY } = params;
  const { left, right } = resolveCorniceOuterBounds(params);
  const segments = buildWaveCorniceSection({
    left,
    right,
    dimensions: params.dimensions,
    globalD: D,
    depth: D,
    woodThick,
    closedDoorFrontOffsetM: params.closedDoorFrontOffsetM,
    topY,
    frontPath: [{ ax: left, az: D / 2, bx: right, bz: D / 2 }],
    leftSide: { startDepth: CARCASS_BACK_INSET_Z, internal: false },
    rightSide: { startDepth: CARCASS_BACK_INSET_Z, internal: false },
  });

  return buildCorniceEnvelope({
    mode: 'wave_frame',
    segments,
  });
}

function waveSidePaintPart(side: CorniceSideClosure, exteriorPartId: string): string {
  return side.internal ? 'cornice_wave_front' : exteriorPartId;
}

function buildWaveCorniceSection(
  params: CorniceSectionParams
): Array<CorniceWaveFrontSegment | CorniceWaveSideSegment> {
  const { left, right, globalD, depth, woodThick, topY, frontPath, leftSide, rightSide } = params;
  const sectionW = Math.max(CORNICE_COMMON.minBoxDimensionM, right - left);
  const yPlace = topY + CORNICE_Y_EPS;
  const frameT = Math.max(
    CORNICE_WAVE.frameThicknessMinM,
    Math.min(CORNICE_WAVE.frameThicknessMaxM, woodThick || CORNICE_WAVE.fallbackWoodThicknessM)
  );
  const waveAmp =
    Math.min(
      Math.max(sectionW * CORNICE_WAVE.amplitudeRatio, CORNICE_WAVE.amplitudeMinM),
      CORNICE_WAVE.amplitudeMaxM
    ) *
    (params.dimensions.heightM / CORNICE_WAVE.maxHeightM);
  const { sideM, frontM, heightM } = params.dimensions;
  const leftExtension = leftSide && !leftSide.internal ? sideM : 0;
  const rightExtension = rightSide && !rightSide.internal ? sideM : 0;
  const leftWidth = frameT + leftExtension;
  const rightWidth = frameT + rightExtension;
  // Extending the outer faces leaves the original bearing on the roof.
  const frontThickness = frontM > 0 ? frameT * 1.5 + frontM : frameT;
  const wavePath = offsetWaveCornicePath(frontPath, frontM, leftExtension, rightExtension);
  const renderPath = trimCornicePath(
    wavePath,
    leftSide == null ? 0 : leftWidth,
    rightSide == null ? 0 : rightWidth
  );
  const endZ = -globalD / 2 + depth + frontM;

  const segments: Array<CorniceWaveFrontSegment | CorniceWaveSideSegment> = [];
  for (const pathSeg of renderPath) {
    const len = cornicePathSegmentLength(pathSeg);
    if (len <= CORNICE_COMMON.minSegmentLengthM) continue;
    if (isStraightFrontPathSegment(pathSeg)) {
      const center = inwardWaveCenterForPathSegment(pathSeg, frontM > 0 ? frontThickness / 2 : frameT);
      segments.push({
        kind: 'cornice_wave_front',
        width: len,
        depth: frontThickness,
        heightMax: heightM,
        waveAmp,
        waveCycles: CORNICE_WAVE.cycles,
        rotationY: waveRotationForPathSegment(pathSeg),
        x: center.x,
        y: yPlace + heightM / 2,
        z: center.z,
        partId: 'cornice_wave_front',
      });
      continue;
    }

    const center = inwardWaveCenterForPathSegment(pathSeg, (frameT + frontM) / 2);
    segments.push({
      kind: 'cornice_wave_side',
      width: frameT + frontM,
      height: heightM,
      depth: len,
      rotationY: profileRotationForPathSegment(pathSeg),
      x: center.x,
      y: yPlace + heightM / 2,
      z: center.z,
      partId: 'cornice_wave_front',
    });
  }

  if (leftSide != null) {
    const sideDepth = Math.max(CORNICE_COMMON.minSegmentLengthM, endZ - (-globalD / 2 + leftSide.startDepth));
    const sideZ = -globalD / 2 + leftSide.startDepth + sideDepth / 2;
    segments.push({
      kind: 'cornice_wave_side',
      width: leftWidth,
      height: heightM,
      depth: sideDepth,
      x: left - leftExtension + leftWidth / 2,
      y: yPlace + heightM / 2,
      z: sideZ,
      partId: waveSidePaintPart(leftSide, 'cornice_wave_side_left'),
    });
  }

  if (rightSide != null) {
    const sideDepth = Math.max(
      CORNICE_COMMON.minSegmentLengthM,
      endZ - (-globalD / 2 + rightSide.startDepth)
    );
    const sideZ = -globalD / 2 + rightSide.startDepth + sideDepth / 2;
    segments.push({
      kind: 'cornice_wave_side',
      width: rightWidth,
      height: heightM,
      depth: sideDepth,
      x: right + rightExtension - rightWidth / 2,
      y: yPlace + heightM / 2,
      z: sideZ,
      partId: waveSidePaintPart(rightSide, 'cornice_wave_side_right'),
    });
  }

  return segments;
}

function buildProfileCornice(params: CorniceParams, straight = false): CarcassCornicePlan {
  const { D, topY, woodThick } = params;
  const { left, right } = resolveCorniceOuterBounds(params);
  const segments = buildProfileCorniceSection(
    {
      left,
      right,
      dimensions: params.dimensions,
      globalD: D,
      depth: D,
      woodThick,
      closedDoorFrontOffsetM: params.closedDoorFrontOffsetM,
      topY,
      frontPath: [{ ax: left, az: D / 2, bx: right, bz: D / 2 }],
      leftSide: { startDepth: CARCASS_BACK_INSET_Z, internal: false },
      rightSide: { startDepth: CARCASS_BACK_INSET_Z, internal: false },
    },
    straight
  );

  return buildCorniceEnvelope({
    mode: straight ? 'straight_open_back' : 'profile_open_back',
    segments,
  });
}

function buildProfileCorniceSection(params: CorniceSectionParams, straight = false): CorniceProfileSegment[] {
  const { left, right, globalD, depth, topY, frontPath, leftSide, rightSide } = params;
  const yPlace = topY + CORNICE_Y_EPS;
  const { sideM: overhangX, frontM, heightM } = params.dimensions;
  const requestedStraightFrontOverhang = frontM + params.closedDoorFrontOffsetM;
  // A single sliding leaf can sit behind the roof.
  const overhangZ = straight && requestedStraightFrontOverhang > 0 ? requestedStraightFrontOverhang : frontM;
  const leftOverhang = leftSide != null && !leftSide.internal ? overhangX : 0;
  const rightOverhang = rightSide != null && !rightSide.internal ? overhangX : 0;
  const buildProfile = straight ? buildStraightCorniceProfile : buildCornerCorniceProfile;
  const profileFront = buildProfile(overhangZ, heightM);
  const profileSide = buildProfile(overhangX, heightM);
  const profileSideInternal = buildInternalCornerCorniceProfile(profileSide);
  const defaultSideEndZ = -globalD / 2 + depth + overhangZ;
  const sourcePath = filterCornicePath(frontPath.map(seg => ({ ...seg })));
  const sourceFirst = sourcePath[0];
  const sourceLast = sourcePath[sourcePath.length - 1];
  const startExtension = shouldExtendExteriorProfilePath(sourceFirst) ? leftOverhang : 0;
  const endExtension = shouldExtendExteriorProfilePath(sourceLast) ? rightOverhang : 0;

  const renderPath = extendCornicePath(sourcePath, startExtension, endExtension);
  const useOuterMiter = shouldUseOuterMiterForPath(renderPath);
  const firstPathSeg = renderPath[0];
  const lastPathSeg = renderPath[renderPath.length - 1];
  const segments: CorniceProfileSegment[] = [];
  for (const [i, pathSeg] of renderPath.entries()) {
    const len = cornicePathSegmentLength(pathSeg);
    if (len <= CORNICE_COMMON.minSegmentLengthM) continue;
    const previousPathSeg = i > 0 ? renderPath[i - 1] : undefined;
    const nextPathSeg = i + 1 < renderPath.length ? renderPath[i + 1] : undefined;

    const startJointTrim = previousPathSeg
      ? useOuterMiter
        ? miterExtensionForPathJoint(previousPathSeg, pathSeg, overhangZ, overhangZ).bStart
        : mutualPathJointMiterTrim(previousPathSeg, pathSeg, overhangZ)
      : 0;
    const endJointTrim = nextPathSeg
      ? useOuterMiter
        ? miterExtensionForPathJoint(pathSeg, nextPathSeg, overhangZ, overhangZ).aEnd
        : mutualPathJointMiterTrim(pathSeg, nextPathSeg, overhangZ)
      : 0;
    const leftExteriorTrim =
      leftSide != null && !leftSide.internal
        ? useOuterMiter
          ? miterExtensionForPathJoint(
              leftSideConnectionPath(pathSeg),
              pathSeg,
              overhangX,
              overhangZ,
              exteriorSideNormal('left')
            ).bStart
          : leftExteriorMiterTrim(pathSeg, overhangX)
        : 0;
    const rightExteriorTrim =
      rightSide != null && !rightSide.internal
        ? useOuterMiter
          ? miterExtensionForPathJoint(
              pathSeg,
              rightSideConnectionPath(pathSeg),
              overhangZ,
              overhangX,
              null,
              exteriorSideNormal('right')
            ).aEnd
          : rightExteriorMiterTrim(pathSeg, overhangX)
        : 0;

    segments.push({
      kind: 'cornice_profile_seg',
      length: Math.max(CORNICE_COMMON.minBoxDimensionM, len),
      profile: profileFront,
      rotationY: profileRotationForPathSegment(pathSeg),
      flipX: false,
      miterStartTrim:
        i < renderPath.length - 1
          ? clampMiterTrimForSegment(endJointTrim, len)
          : rightSide != null && !rightSide.internal
            ? clampMiterTrimForSegment(rightExteriorTrim, len)
            : 0,
      miterEndTrim:
        i > 0
          ? clampMiterTrimForSegment(startJointTrim, len)
          : leftSide != null && !leftSide.internal
            ? clampMiterTrimForSegment(leftExteriorTrim, len)
            : 0,
      ...(straight
        ? { miterMode: 'full_depth_miter' as const }
        : useOuterMiter
          ? { miterMode: 'outer_extend' as const }
          : null),
      x: (pathSeg.ax + pathSeg.bx) / 2,
      y: yPlace,
      z: (pathSeg.az + pathSeg.bz) / 2,
    });
  }

  if (leftSide != null) {
    const sideStartZ = -globalD / 2 + leftSide.startDepth;
    const sideEndZ = resolveProfileSideEndZ({
      pathSeg: firstPathSeg,
      end: 'start',
      defaultEndZ: defaultSideEndZ,
      useOuterMiter,
      overhangZ,
    });
    const sideLen = Math.max(CORNICE_COMMON.minBoxDimensionM, sideEndZ - sideStartZ);
    const sideCenterZ = (sideStartZ + sideEndZ) / 2;
    const sideMiterTrim =
      !leftSide.internal && firstPathSeg
        ? clampMiterTrimForSegment(
            useOuterMiter
              ? miterExtensionForPathJoint(
                  leftSideConnectionPath(firstPathSeg),
                  firstPathSeg,
                  overhangX,
                  overhangZ,
                  exteriorSideNormal('left')
                ).aEnd
              : leftExteriorMiterTrim(firstPathSeg, overhangZ),
            sideLen
          )
        : overhangZ + PROFILE_SEAM_EPS;
    segments.push({
      kind: 'cornice_profile_seg',
      length: sideLen,
      profile: leftSide.internal ? profileSideInternal : profileSide,
      rotationY: 0,
      flipX: !leftSide.internal,
      miterEndTrim: sideMiterTrim,
      ...(straight
        ? { miterMode: 'full_depth_miter' as const }
        : useOuterMiter
          ? { miterMode: 'outer_extend' as const }
          : null),
      x: left,
      y: yPlace,
      z: sideCenterZ,
    });
  }

  if (rightSide != null) {
    const sideStartZ = -globalD / 2 + rightSide.startDepth;
    const sideEndZ = resolveProfileSideEndZ({
      pathSeg: lastPathSeg,
      end: 'end',
      defaultEndZ: defaultSideEndZ,
      useOuterMiter,
      overhangZ,
    });
    const sideLen = Math.max(CORNICE_COMMON.minBoxDimensionM, sideEndZ - sideStartZ);
    const sideCenterZ = (sideStartZ + sideEndZ) / 2;
    const sideMiterTrim =
      !rightSide.internal && lastPathSeg
        ? clampMiterTrimForSegment(
            useOuterMiter
              ? miterExtensionForPathJoint(
                  lastPathSeg,
                  rightSideConnectionPath(lastPathSeg),
                  overhangZ,
                  overhangX,
                  null,
                  exteriorSideNormal('right')
                ).bStart
              : rightExteriorMiterTrim(lastPathSeg, overhangZ),
            sideLen
          )
        : overhangZ + PROFILE_SEAM_EPS;
    segments.push({
      kind: 'cornice_profile_seg',
      length: sideLen,
      profile: rightSide.internal ? profileSideInternal : profileSide,
      rotationY: 0,
      flipX: rightSide.internal,
      miterEndTrim: sideMiterTrim,
      ...(straight
        ? { miterMode: 'full_depth_miter' as const }
        : useOuterMiter
          ? { miterMode: 'outer_extend' as const }
          : null),
      x: right,
      y: yPlace,
      z: sideCenterZ,
    });
  }

  return segments;
}

type CorniceEnvelopeParams = {
  mode: CarcassCorniceMode;
  segments: CarcassCorniceSegment[];
};

function buildCorniceEnvelope(params: CorniceEnvelopeParams): CarcassCornicePlan {
  const { mode, segments } = params;
  return {
    kind: 'cornice',
    mode,
    partId: 'cornice_color',
    segments,
  };
}
