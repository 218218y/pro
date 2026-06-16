// Builder core carcass cornice assembly.

import { CARCASS_CORNICE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { MutableRecord } from './core_pure_shared.js';
import { __asNum } from './core_pure_shared.js';
import { CARCASS_BACK_INSET_Z, type PreparedCarcassInput } from './core_carcass_shared.js';
import { resolveHexCellGeometry, type HexCellGeometry } from '../features/hex_cell/index.js';

const CORNICE_COMMON = CARCASS_CORNICE_DIMENSIONS.common;
const CORNICE_WAVE = CARCASS_CORNICE_DIMENSIONS.wave;
const CORNICE_PROFILE = CARCASS_CORNICE_DIMENSIONS.profile;

const CORNICE_EPS = CORNICE_COMMON.epsilonM;
const CORNICE_Y_EPS = CORNICE_COMMON.yLiftM;

const WAVE_MAX_HEIGHT = CORNICE_WAVE.maxHeightM;
const WAVE_CYCLES = CORNICE_WAVE.cycles;

const PROFILE_HEIGHT = CORNICE_PROFILE.heightM;
const PROFILE_OVERHANG_X = CORNICE_PROFILE.overhangXM;
const PROFILE_OVERHANG_Z = CORNICE_PROFILE.overhangZM;
const PROFILE_INSET_ON_ROOF = CORNICE_PROFILE.insetOnRoofM;
const PROFILE_BACK_STEP = CORNICE_PROFILE.backStepM;
const PROFILE_SEAM_EPS = CORNICE_PROFILE.seamEpsilonM;

const PROFILE_BASE_H = CORNICE_PROFILE.baseHeightM;
const PROFILE_STEP1_OUT = CORNICE_PROFILE.step1OutM;
const PROFILE_SLOPE_H = CORNICE_PROFILE.slopeHeightM;
const PROFILE_SLOPE_OUT = CORNICE_PROFILE.slopeOutM;
const PROFILE_STEP2_OUT = CORNICE_PROFILE.step2OutM;
const PROFILE_CAP_RISE = CORNICE_PROFILE.capRiseM;
const PROFILE_CAP_OUT = CORNICE_PROFILE.capOutM;
const PROFILE_TOP_LIP_OUT = CORNICE_PROFILE.topLipOutM;

export function buildCarcassCornice(prepared: PreparedCarcassInput): MutableRecord | null {
  const { totalW, D, startY, cabinetBodyHeight, hasCornice, corniceType } = prepared;
  if (!hasCornice) return null;

  const corniceTypeNorm = String(corniceType || 'classic').toLowerCase();
  if (shouldBuildSegmentedCornice(prepared)) {
    return buildSegmentedCornice(prepared, corniceTypeNorm);
  }

  if (corniceTypeNorm === 'wave') {
    return buildWaveCornice({ totalW, D, woodThick: prepared.woodThick, topY: startY + cabinetBodyHeight });
  }
  return buildProfileCornice({ totalW, D, woodThick: prepared.woodThick, topY: startY + cabinetBodyHeight });
}

type CorniceParams = {
  totalW: number;
  D: number;
  woodThick: number;
  topY: number;
};

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
  left: number;
  right: number;
  globalD: number;
  depth: number;
  woodThick: number;
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
  for (let i = 0; i < moduleWidths.length; i++) {
    if (resolveHexCellForModule(prepared, i, moduleWidths[i])) return true;
  }
  return false;
}

function buildSegmentedCornice(
  prepared: PreparedCarcassInput,
  corniceTypeNorm: string
): MutableRecord | null {
  const runs = buildCorniceRuns(prepared);
  if (!runs.length) return null;

  const segments: MutableRecord[] = [];
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const section: CorniceSectionParams = {
      left: run.left,
      right: run.right,
      globalD: prepared.D,
      depth: run.depth,
      woodThick: prepared.woodThick,
      topY: run.topY,
      frontPath: run.frontPath,
      leftSide: run.leftSide,
      rightSide: run.rightSide,
    };
    if (corniceTypeNorm === 'wave') {
      segments.push(...buildWaveCorniceSection(section));
    } else {
      segments.push(...buildProfileCorniceSection(section));
    }
  }

  const isWave = corniceTypeNorm === 'wave';
  return buildCorniceEnvelope({
    mode: isWave ? 'wave_frame_segmented' : 'profile_open_back_segmented',
    segments,
  });
}

function buildCorniceRuns(prepared: PreparedCarcassInput): CorniceRun[] {
  const { totalW, D, H, woodThick, startY, cabinetBodyHeight, moduleWidths, moduleHeightsRaw, moduleDepths } =
    prepared;
  if (!moduleWidths || !moduleWidths.length) return [];

  const runs: CorniceRun[] = [];
  let internalLeft = -totalW / 2 + woodThick;

  for (let i = 0; i < moduleWidths.length; i++) {
    const moduleWidth = moduleWidths[i];
    const left = i === 0 ? -totalW / 2 : internalLeft;
    const right = i === moduleWidths.length - 1 ? totalW / 2 : internalLeft + moduleWidth + woodThick;
    const fallbackDepth = Math.max(woodThick, moduleDepths ? __asNum(moduleDepths[i], D) : D);
    const footprint = buildModuleCorniceFootprint(prepared, i, left, right, fallbackDepth);
    const depth = footprint.edgeDepth;
    const rawHeight = moduleHeightsRaw ? moduleHeightsRaw[i] : H;
    const totalHeight = __asNum(rawHeight, H);
    const bodyHeight = Math.min(cabinetBodyHeight, Math.max(woodThick * 2, totalHeight - startY));
    const topY = startY + bodyHeight;

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

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
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
    const len = cornicePathSegmentLength(out[0]);
    if (len <= remaining + CORNICE_EPS) {
      remaining -= len;
      out.shift();
    } else {
      out[0] = shiftPathStart(out[0], remaining);
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
    const len = cornicePathSegmentLength(out[lastIndex]);
    if (len <= remaining + CORNICE_EPS) {
      remaining -= len;
      out.pop();
    } else {
      out[lastIndex] = shiftPathEnd(out[lastIndex], remaining);
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
  if (!out.length) return out;
  out[0] = extendPathStart(out[0], Math.max(0, startExtension));
  const lastIndex = out.length - 1;
  out[lastIndex] = extendPathEnd(out[lastIndex], Math.max(0, endExtension));
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
  if (!Number.isFinite(det) || Math.abs(det) <= CORNICE_COMMON.thetaClampM * CORNICE_COMMON.thetaClampM) {
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
  if (angle <= CORNICE_COMMON.thetaClampM) return 0;
  const trim =
    Math.max(0, profileOverhang) * Math.tan(Math.min(Math.PI - CORNICE_COMMON.thetaClampM, angle) / 2);
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
  fallbackZ: number
): number {
  if (!seg) return fallbackZ;
  const baseZ = end === 'start' ? seg.az : seg.bz;
  const outward = outwardNormalForPathSegment(seg);
  const z = baseZ + Math.max(0, PROFILE_OVERHANG_Z) * Math.max(0, outward.z);
  return Number.isFinite(z) ? z : fallbackZ;
}

function resolveProfileSideEndZ(args: {
  pathSeg: CornicePathSegment | undefined;
  end: 'start' | 'end';
  defaultEndZ: number;
  useOuterMiter?: boolean;
}): number {
  if (args.useOuterMiter && args.pathSeg && !isStraightFrontPathSegment(args.pathSeg)) {
    return args.end === 'start' ? args.pathSeg.az : args.pathSeg.bz;
  }
  const z = profileOuterEndZ(args.pathSeg, args.end, args.defaultEndZ);
  return Math.max(args.defaultEndZ - PROFILE_OVERHANG_Z, z);
}

function buildWaveCornice(params: CorniceParams): MutableRecord {
  const { totalW, D, woodThick, topY } = params;
  const segments = buildWaveCorniceSection({
    left: -totalW / 2,
    right: totalW / 2,
    globalD: D,
    depth: D,
    woodThick,
    topY,
    frontPath: [{ ax: -totalW / 2, az: D / 2, bx: totalW / 2, bz: D / 2 }],
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

function buildWaveCorniceSection(params: CorniceSectionParams): MutableRecord[] {
  const { left, right, globalD, depth, woodThick, topY, frontPath, leftSide, rightSide } = params;
  const sectionW = Math.max(CORNICE_COMMON.minBoxDimensionM, right - left);
  const yPlace = topY + CORNICE_Y_EPS;
  const frameT = Math.max(
    CORNICE_WAVE.frameThicknessMinM,
    Math.min(CORNICE_WAVE.frameThicknessMaxM, woodThick || CORNICE_WAVE.fallbackWoodThicknessM)
  );
  const waveAmp = Math.min(
    Math.max(sectionW * CORNICE_WAVE.amplitudeRatio, CORNICE_WAVE.amplitudeMinM),
    CORNICE_WAVE.amplitudeMaxM
  );
  const leftInset = leftSide == null ? 0 : frameT;
  const rightInset = rightSide == null ? 0 : frameT;
  const renderPath = trimCornicePath(frontPath, leftInset, rightInset);

  const segments: MutableRecord[] = [];
  for (let i = 0; i < renderPath.length; i++) {
    const pathSeg = renderPath[i];
    const len = cornicePathSegmentLength(pathSeg);
    if (len <= CORNICE_COMMON.minSegmentLengthM) continue;
    if (isStraightFrontPathSegment(pathSeg)) {
      const center = inwardWaveCenterForPathSegment(pathSeg, frameT);
      segments.push({
        kind: 'cornice_wave_front',
        width: len,
        depth: frameT,
        heightMax: WAVE_MAX_HEIGHT,
        waveAmp,
        waveCycles: WAVE_CYCLES,
        rotationY: waveRotationForPathSegment(pathSeg),
        x: center.x,
        y: yPlace + WAVE_MAX_HEIGHT / 2,
        z: center.z,
        partId: 'cornice_wave_front',
      });
      continue;
    }

    const center = inwardWaveCenterForPathSegment(pathSeg, frameT / 2);
    segments.push({
      kind: 'cornice_wave_side',
      width: frameT,
      height: WAVE_MAX_HEIGHT,
      depth: len,
      rotationY: profileRotationForPathSegment(pathSeg),
      x: center.x,
      y: yPlace + WAVE_MAX_HEIGHT / 2,
      z: center.z,
      partId: 'cornice_wave_front',
    });
  }

  if (leftSide != null) {
    const sideDepth = Math.max(CORNICE_COMMON.minSegmentLengthM, depth - leftSide.startDepth);
    const sideZ = -globalD / 2 + leftSide.startDepth + sideDepth / 2;
    segments.push({
      kind: 'cornice_wave_side',
      width: frameT,
      height: WAVE_MAX_HEIGHT,
      depth: sideDepth,
      x: left + frameT / 2,
      y: yPlace + WAVE_MAX_HEIGHT / 2,
      z: sideZ,
      partId: waveSidePaintPart(leftSide, 'cornice_wave_side_left'),
    });
  }

  if (rightSide != null) {
    const sideDepth = Math.max(CORNICE_COMMON.minSegmentLengthM, depth - rightSide.startDepth);
    const sideZ = -globalD / 2 + rightSide.startDepth + sideDepth / 2;
    segments.push({
      kind: 'cornice_wave_side',
      width: frameT,
      height: WAVE_MAX_HEIGHT,
      depth: sideDepth,
      x: right - frameT / 2,
      y: yPlace + WAVE_MAX_HEIGHT / 2,
      z: sideZ,
      partId: waveSidePaintPart(rightSide, 'cornice_wave_side_right'),
    });
  }

  return segments;
}

function buildProfileCornice(params: CorniceParams): MutableRecord {
  const { totalW, D, topY, woodThick } = params;
  const segments = buildProfileCorniceSection({
    left: -totalW / 2,
    right: totalW / 2,
    globalD: D,
    depth: D,
    woodThick,
    topY,
    frontPath: [{ ax: -totalW / 2, az: D / 2, bx: totalW / 2, bz: D / 2 }],
    leftSide: { startDepth: CARCASS_BACK_INSET_Z, internal: false },
    rightSide: { startDepth: CARCASS_BACK_INSET_Z, internal: false },
  });

  return buildCorniceEnvelope({
    mode: 'profile_open_back',
    segments,
  });
}

function buildProfileCorniceSection(params: CorniceSectionParams): MutableRecord[] {
  const { left, right, globalD, depth, topY, frontPath, leftSide, rightSide } = params;
  const yPlace = topY + CORNICE_Y_EPS;
  const leftOverhang = leftSide != null && !leftSide.internal ? PROFILE_OVERHANG_X : 0;
  const rightOverhang = rightSide != null && !rightSide.internal ? PROFILE_OVERHANG_X : 0;
  const profileFront = makeCorniceProfile(PROFILE_OVERHANG_Z);
  const profileSide = makeCorniceProfile(PROFILE_OVERHANG_X);
  const profileSideInternal = makeInternalBoundaryCorniceProfile(PROFILE_OVERHANG_X);
  const defaultSideEndZ = -globalD / 2 + depth + PROFILE_OVERHANG_Z;
  const sourcePath = filterCornicePath(frontPath.map(seg => ({ ...seg })));
  const startExtension = shouldExtendExteriorProfilePath(sourcePath[0]) ? leftOverhang : 0;
  const endExtension = shouldExtendExteriorProfilePath(sourcePath[sourcePath.length - 1]) ? rightOverhang : 0;

  const renderPath = extendCornicePath(sourcePath, startExtension, endExtension);
  const useOuterMiter = shouldUseOuterMiterForPath(renderPath);
  const segments: MutableRecord[] = [];
  for (let i = 0; i < renderPath.length; i++) {
    const pathSeg = renderPath[i];
    const len = cornicePathSegmentLength(pathSeg);
    if (len <= CORNICE_COMMON.minSegmentLengthM) continue;

    const startJointTrim =
      i > 0
        ? useOuterMiter
          ? miterExtensionForPathJoint(renderPath[i - 1], pathSeg, PROFILE_OVERHANG_Z, PROFILE_OVERHANG_Z)
              .bStart
          : mutualPathJointMiterTrim(renderPath[i - 1], pathSeg, PROFILE_OVERHANG_Z)
        : 0;
    const endJointTrim =
      i < renderPath.length - 1
        ? useOuterMiter
          ? miterExtensionForPathJoint(pathSeg, renderPath[i + 1], PROFILE_OVERHANG_Z, PROFILE_OVERHANG_Z)
              .aEnd
          : mutualPathJointMiterTrim(pathSeg, renderPath[i + 1], PROFILE_OVERHANG_Z)
        : 0;
    const leftExteriorTrim =
      leftSide != null && !leftSide.internal
        ? useOuterMiter
          ? miterExtensionForPathJoint(
              leftSideConnectionPath(pathSeg),
              pathSeg,
              PROFILE_OVERHANG_X,
              PROFILE_OVERHANG_Z,
              exteriorSideNormal('left')
            ).bStart
          : leftExteriorMiterTrim(pathSeg, PROFILE_OVERHANG_X)
        : 0;
    const rightExteriorTrim =
      rightSide != null && !rightSide.internal
        ? useOuterMiter
          ? miterExtensionForPathJoint(
              pathSeg,
              rightSideConnectionPath(pathSeg),
              PROFILE_OVERHANG_Z,
              PROFILE_OVERHANG_X,
              null,
              exteriorSideNormal('right')
            ).aEnd
          : rightExteriorMiterTrim(pathSeg, PROFILE_OVERHANG_X)
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
      ...(useOuterMiter ? { miterMode: 'outer_extend' } : null),
      x: (pathSeg.ax + pathSeg.bx) / 2,
      y: yPlace,
      z: (pathSeg.az + pathSeg.bz) / 2,
    });
  }

  if (leftSide != null) {
    const sideStartZ = -globalD / 2 + leftSide.startDepth;
    const sideEndZ = resolveProfileSideEndZ({
      pathSeg: renderPath[0],
      end: 'start',
      defaultEndZ: defaultSideEndZ,
      useOuterMiter,
    });
    const sideLen = Math.max(CORNICE_COMMON.minBoxDimensionM, sideEndZ - sideStartZ);
    const sideCenterZ = (sideStartZ + sideEndZ) / 2;
    const sideMiterTrim =
      !leftSide.internal && renderPath.length
        ? clampMiterTrimForSegment(
            useOuterMiter
              ? miterExtensionForPathJoint(
                  leftSideConnectionPath(renderPath[0]),
                  renderPath[0],
                  PROFILE_OVERHANG_X,
                  PROFILE_OVERHANG_Z,
                  exteriorSideNormal('left')
                ).aEnd
              : leftExteriorMiterTrim(renderPath[0], PROFILE_OVERHANG_Z),
            sideLen
          )
        : PROFILE_OVERHANG_Z + PROFILE_SEAM_EPS;
    segments.push({
      kind: 'cornice_profile_seg',
      length: sideLen,
      profile: leftSide.internal ? profileSideInternal : profileSide,
      rotationY: 0,
      flipX: !leftSide.internal,
      miterEndTrim: sideMiterTrim,
      ...(useOuterMiter ? { miterMode: 'outer_extend' } : null),
      x: left,
      y: yPlace,
      z: sideCenterZ,
    });
  }

  if (rightSide != null) {
    const sideStartZ = -globalD / 2 + rightSide.startDepth;
    const sideEndZ = resolveProfileSideEndZ({
      pathSeg: renderPath[renderPath.length - 1],
      end: 'end',
      defaultEndZ: defaultSideEndZ,
      useOuterMiter,
    });
    const sideLen = Math.max(CORNICE_COMMON.minBoxDimensionM, sideEndZ - sideStartZ);
    const sideCenterZ = (sideStartZ + sideEndZ) / 2;
    const sideMiterTrim =
      !rightSide.internal && renderPath.length
        ? clampMiterTrimForSegment(
            useOuterMiter
              ? miterExtensionForPathJoint(
                  renderPath[renderPath.length - 1],
                  rightSideConnectionPath(renderPath[renderPath.length - 1]),
                  PROFILE_OVERHANG_Z,
                  PROFILE_OVERHANG_X,
                  null,
                  exteriorSideNormal('right')
                ).bStart
              : rightExteriorMiterTrim(renderPath[renderPath.length - 1], PROFILE_OVERHANG_Z),
            sideLen
          )
        : PROFILE_OVERHANG_Z + PROFILE_SEAM_EPS;
    segments.push({
      kind: 'cornice_profile_seg',
      length: sideLen,
      profile: rightSide.internal ? profileSideInternal : profileSide,
      rotationY: 0,
      flipX: rightSide.internal,
      miterEndTrim: sideMiterTrim,
      ...(useOuterMiter ? { miterMode: 'outer_extend' } : null),
      x: right,
      y: yPlace,
      z: sideCenterZ,
    });
  }

  return segments;
}

function makeInternalBoundaryCorniceProfile(overhang: number): MutableRecord[] {
  return makeCorniceProfile(overhang).map(point => ({
    ...point,
    x: Math.max(0, __asNum(point.x, 0)),
  }));
}

function makeCorniceProfile(overhang: number): MutableRecord[] {
  const oh = Math.max(CORNICE_PROFILE.minOverhangM, overhang);
  const step1Base = Math.max(0, PROFILE_STEP1_OUT);
  const slopeBase = Math.max(0, PROFILE_SLOPE_OUT);
  const step2Base = Math.max(0, PROFILE_STEP2_OUT);
  const capBase = Math.max(0, PROFILE_CAP_OUT);
  const lipBase = Math.max(0, PROFILE_TOP_LIP_OUT);

  let xMaxBase = step1Base + slopeBase + step2Base + capBase + lipBase;
  if (!Number.isFinite(xMaxBase) || xMaxBase < CORNICE_COMMON.epsilonM)
    xMaxBase = CORNICE_PROFILE.xMaxFallbackM;
  const sx = oh / xMaxBase;

  const step1 = step1Base * sx;
  const slopeOut = slopeBase * sx;
  const step2 = step2Base * sx;
  const capOut = capBase * sx;

  const y1 = Math.min(PROFILE_BASE_H, PROFILE_HEIGHT * CORNICE_PROFILE.baseHeightRatio);
  const y2 = Math.min(y1 + PROFILE_SLOPE_H, PROFILE_HEIGHT * CORNICE_PROFILE.slopeHeightRatio);
  const y3 = Math.min(y2 + PROFILE_CAP_RISE, PROFILE_HEIGHT * CORNICE_PROFILE.capHeightRatio);

  const x1 = step1;
  const x2 = x1 + slopeOut;
  const x3 = x2 + step2;
  const x4 = x3 + capOut;
  const x5 = oh;
  const xTopReturn = Math.max(0, oh - PROFILE_BACK_STEP);

  return [
    { x: -PROFILE_INSET_ON_ROOF, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: y1 },
    { x: x1, y: y1 },
    { x: x2, y: y2 },
    { x: x3, y: y2 },
    { x: x4, y: y3 },
    { x: x5, y: y3 },
    { x: xTopReturn, y: PROFILE_HEIGHT },
    { x: -PROFILE_INSET_ON_ROOF, y: PROFILE_HEIGHT },
  ];
}

type CorniceEnvelopeParams = {
  mode: string;
  segments: MutableRecord[];
};

function buildCorniceEnvelope(params: CorniceEnvelopeParams): MutableRecord {
  const { mode, segments } = params;
  return {
    kind: 'cornice',
    mode,
    partId: 'cornice_color',
    segments,
  };
}
