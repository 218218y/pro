// Builder core carcass cornice assembly.

import { CARCASS_CORNICE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { MutableRecord } from './core_pure_shared.js';
import { __asNum } from './core_pure_shared.js';
import { CARCASS_BACK_INSET_Z, type PreparedCarcassInput } from './core_carcass_shared.js';

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

type CorniceRun = {
  left: number;
  right: number;
  startIndex: number;
  endIndex: number;
  depth: number;
  topY: number;
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
  leftSide: CorniceSideClosure | null;
  rightSide: CorniceSideClosure | null;
};

function shouldBuildSegmentedCornice(prepared: PreparedCarcassInput): boolean {
  const { moduleWidths, moduleHeightsRaw, moduleDepths, isStepped, isDepthStepped } = prepared;
  if (!moduleWidths || moduleWidths.length <= 1) return false;
  if (!isStepped && !isDepthStepped) return false;
  if (isStepped && (!moduleHeightsRaw || moduleHeightsRaw.length !== moduleWidths.length)) return false;
  if (isDepthStepped && (!moduleDepths || moduleDepths.length !== moduleWidths.length)) return false;
  return true;
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
      leftSide: run.leftSide,
      rightSide: run.rightSide,
    };
    if (corniceTypeNorm === 'wave') {
      segments.push(...buildWaveCorniceSection(section));
    } else {
      segments.push(...buildProfileCorniceSection(section));
    }
  }

  const maxTopY = runs.reduce(
    (max, run) => Math.max(max, run.topY),
    prepared.startY + prepared.cabinetBodyHeight
  );
  const maxDepth = runs.reduce((max, run) => Math.max(max, run.depth), prepared.D);
  const isWave = corniceTypeNorm === 'wave';
  return buildLegacyCorniceEnvelope({
    totalW: prepared.totalW,
    D: maxDepth,
    topY: maxTopY,
    height: isWave ? WAVE_MAX_HEIGHT : PROFILE_HEIGHT,
    mode: isWave ? 'wave_frame_segmented' : 'profile_open_back_segmented',
    z: isWave ? 0 : CORNICE_PROFILE.legacyEnvelopeProfileZM,
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
    const depth = Math.max(woodThick, moduleDepths ? __asNum(moduleDepths[i], D) : D);
    const rawHeight = moduleHeightsRaw ? moduleHeightsRaw[i] : H;
    const totalHeight = __asNum(rawHeight, H);
    const bodyHeight = Math.min(cabinetBodyHeight, Math.max(woodThick * 2, totalHeight - startY));
    const topY = startY + bodyHeight;

    const prev = runs[runs.length - 1];
    if (prev && sameCornicePlane(prev, { depth, topY })) {
      prev.right = right;
      prev.endIndex = i;
    } else {
      runs.push({
        left,
        right,
        startIndex: i,
        endIndex: i,
        depth,
        topY,
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

function buildWaveCornice(params: CorniceParams): MutableRecord {
  const { totalW, D, woodThick, topY } = params;
  const segments = buildWaveCorniceSection({
    left: -totalW / 2,
    right: totalW / 2,
    globalD: D,
    depth: D,
    woodThick,
    topY,
    leftSide: { startDepth: CARCASS_BACK_INSET_Z, internal: false },
    rightSide: { startDepth: CARCASS_BACK_INSET_Z, internal: false },
  });

  return buildLegacyCorniceEnvelope({
    totalW,
    D,
    topY,
    height: WAVE_MAX_HEIGHT,
    mode: 'wave_frame',
    z: 0,
    segments,
  });
}

function buildWaveCorniceSection(params: CorniceSectionParams): MutableRecord[] {
  const { left, right, globalD, depth, woodThick, topY, leftSide, rightSide } = params;
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
  const frontW = Math.max(CORNICE_COMMON.minSegmentLengthM, sectionW - leftInset - rightInset);
  const frontLeft = left + leftInset;
  const frontRight = right - rightInset;
  const frontZ = -globalD / 2 + depth - frameT;

  const segments: MutableRecord[] = [
    {
      kind: 'cornice_wave_front',
      width: frontW,
      depth: frameT,
      heightMax: WAVE_MAX_HEIGHT,
      waveAmp,
      waveCycles: WAVE_CYCLES,
      x: (frontLeft + frontRight) / 2,
      y: yPlace + WAVE_MAX_HEIGHT / 2,
      z: frontZ,
      partId: 'cornice_wave_front',
    },
  ];

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
      partId: 'cornice_wave_side_left',
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
      partId: 'cornice_wave_side_right',
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
    leftSide: { startDepth: CARCASS_BACK_INSET_Z, internal: false },
    rightSide: { startDepth: CARCASS_BACK_INSET_Z, internal: false },
  });

  return buildLegacyCorniceEnvelope({
    totalW,
    D,
    topY,
    height: PROFILE_HEIGHT,
    mode: 'profile_open_back',
    z: CORNICE_PROFILE.legacyEnvelopeProfileZM,
    segments,
  });
}

function buildProfileCorniceSection(params: CorniceSectionParams): MutableRecord[] {
  const { left, right, globalD, depth, topY, leftSide, rightSide } = params;
  const yPlace = topY + CORNICE_Y_EPS;
  const sectionW = Math.max(CORNICE_COMMON.minBoxDimensionM, right - left);
  const leftOverhang = leftSide != null && !leftSide.internal ? PROFILE_OVERHANG_X : 0;
  const rightOverhang = rightSide != null && !rightSide.internal ? PROFILE_OVERHANG_X : 0;
  const profileFront = makeCorniceProfile(PROFILE_OVERHANG_Z);
  const profileSide = makeCorniceProfile(PROFILE_OVERHANG_X);
  const profileSideInternal = makeInternalBoundaryCorniceProfile(PROFILE_OVERHANG_X);
  const sideEndZ = -globalD / 2 + depth + PROFILE_OVERHANG_Z;

  const segments: MutableRecord[] = [
    {
      kind: 'cornice_profile_seg',
      length: Math.max(CORNICE_COMMON.minBoxDimensionM, sectionW + leftOverhang + rightOverhang),
      profile: profileFront,
      rotationY: -Math.PI / 2,
      flipX: false,
      miterStartTrim: rightSide != null && !rightSide.internal ? PROFILE_OVERHANG_X + PROFILE_SEAM_EPS : 0,
      miterEndTrim: leftSide != null && !leftSide.internal ? PROFILE_OVERHANG_X + PROFILE_SEAM_EPS : 0,
      x: (left - leftOverhang + right + rightOverhang) / 2,
      y: yPlace,
      z: -globalD / 2 + depth,
    },
  ];

  if (leftSide != null) {
    const sideStartZ = -globalD / 2 + leftSide.startDepth;
    const sideLen = Math.max(CORNICE_COMMON.minBoxDimensionM, sideEndZ - sideStartZ);
    const sideCenterZ = (sideStartZ + sideEndZ) / 2;
    segments.push({
      kind: 'cornice_profile_seg',
      length: sideLen,
      profile: leftSide.internal ? profileSideInternal : profileSide,
      rotationY: 0,
      flipX: !leftSide.internal,
      miterEndTrim: PROFILE_OVERHANG_Z + PROFILE_SEAM_EPS,
      x: left,
      y: yPlace,
      z: sideCenterZ,
    });
  }

  if (rightSide != null) {
    const sideStartZ = -globalD / 2 + rightSide.startDepth;
    const sideLen = Math.max(CORNICE_COMMON.minBoxDimensionM, sideEndZ - sideStartZ);
    const sideCenterZ = (sideStartZ + sideEndZ) / 2;
    segments.push({
      kind: 'cornice_profile_seg',
      length: sideLen,
      profile: rightSide.internal ? profileSideInternal : profileSide,
      rotationY: 0,
      flipX: rightSide.internal,
      miterEndTrim: PROFILE_OVERHANG_Z + PROFILE_SEAM_EPS,
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

type LegacyCorniceEnvelopeParams = {
  totalW: number;
  D: number;
  topY: number;
  height: number;
  mode: string;
  z: number;
  segments: MutableRecord[];
};

function buildLegacyCorniceEnvelope(params: LegacyCorniceEnvelopeParams): MutableRecord {
  const { totalW, D, topY, height, mode, z, segments } = params;
  const baseSize = Math.max(totalW, D);
  const topRadius = (baseSize + CORNICE_PROFILE.legacyEnvelopeTopRadiusPadM) / Math.sqrt(2);
  const bottomRadius = baseSize / Math.sqrt(2);
  const scaleX =
    (totalW + CORNICE_PROFILE.legacyEnvelopeTopRadiusPadM) /
    (baseSize + CORNICE_PROFILE.legacyEnvelopeTopRadiusPadM);
  const scaleZ =
    (D + CORNICE_PROFILE.legacyEnvelopeDepthPadM) / (baseSize + CORNICE_PROFILE.legacyEnvelopeTopRadiusPadM);

  return {
    kind: 'cornice',
    mode,
    height,
    baseSize,
    topRadius,
    bottomRadius,
    radialSegments: 4,
    scaleX,
    scaleZ,
    x: 0,
    y: topY + height / 2,
    z,
    rotationY: Math.PI / 4,
    partId: 'cornice_color',
    segments,
  };
}
