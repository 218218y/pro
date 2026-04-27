// Builder core carcass cornice assembly.

import type { MutableRecord } from './core_pure_shared.js';
import { CARCASS_BACK_INSET_Z, type PreparedCarcassInput } from './core_carcass_shared.js';

export function buildCarcassCornice(prepared: PreparedCarcassInput): MutableRecord | null {
  const { totalW, D, startY, cabinetBodyHeight, hasCornice, corniceType } = prepared;
  if (!hasCornice) return null;

  const corniceTypeNorm = String(corniceType || 'classic').toLowerCase();
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

function buildWaveCornice(params: CorniceParams): MutableRecord {
  const { totalW, D, woodThick, topY } = params;
  const epsY = 0.0006;
  const yPlace = topY + epsY;
  const frameT = Math.max(0.01, Math.min(0.028, woodThick || 0.018));
  const maxH = 0.095;
  const waveAmp = Math.min(Math.max(totalW * 0.03, 0.03), 0.06);
  const waveCycles = 2;

  const frontSeg: MutableRecord = {
    kind: 'cornice_wave_front',
    width: Math.max(0.02, totalW - 2 * frameT),
    depth: frameT,
    heightMax: maxH,
    waveAmp,
    waveCycles,
    x: 0,
    y: yPlace + maxH / 2,
    z: D / 2 - frameT,
    partId: 'cornice_wave_front',
  };

  const sideH = maxH;
  const sideDepth = Math.max(0.02, D - CARCASS_BACK_INSET_Z);
  const sideZ = CARCASS_BACK_INSET_Z / 2;

  const leftSeg: MutableRecord = {
    kind: 'cornice_wave_side',
    width: frameT,
    height: sideH,
    depth: sideDepth,
    x: -totalW / 2 + frameT / 2,
    y: yPlace + sideH / 2,
    z: sideZ,
    partId: 'cornice_wave_side_left',
  };

  const rightSeg: MutableRecord = {
    kind: 'cornice_wave_side',
    width: frameT,
    height: sideH,
    depth: sideDepth,
    x: totalW / 2 - frameT / 2,
    y: yPlace + sideH / 2,
    z: sideZ,
    partId: 'cornice_wave_side_right',
  };

  return buildLegacyCorniceEnvelope({
    totalW,
    D,
    topY,
    height: maxH,
    mode: 'wave_frame',
    z: 0,
    segments: [frontSeg, leftSeg, rightSeg],
  });
}

function buildProfileCornice(params: CorniceParams): MutableRecord {
  const { totalW, D, topY } = params;
  const cHeight = 0.08;
  const overhangX = 0.06;
  const overhangZ = 0.04;
  const insetOnRoof = 0.03;
  const backStep = 0.02;
  const seamEps = 0.0;
  const epsY = 0.0006;
  const yPlace = topY + epsY;

  const profBaseH = 0.022;
  const profStep1Out = 0.006;
  const profSlopeH = 0.03;
  const profSlopeOut = 0.018;
  const profStep2Out = 0.006;
  const profCapRise = 0.012;
  const profCapOut = 0.004;
  const profTopLipOut = 0.003;

  const makeCorniceProfile = (overhang: number): MutableRecord[] => {
    const oh = Math.max(0.001, overhang);
    const step1Base = Math.max(0, profStep1Out);
    const slopeBase = Math.max(0, profSlopeOut);
    const step2Base = Math.max(0, profStep2Out);
    const capBase = Math.max(0, profCapOut);
    const lipBase = Math.max(0, profTopLipOut);

    let xMaxBase = step1Base + slopeBase + step2Base + capBase + lipBase;
    if (!Number.isFinite(xMaxBase) || xMaxBase < 1e-6) xMaxBase = 1;
    const sx = oh / xMaxBase;

    const step1 = step1Base * sx;
    const slopeOut = slopeBase * sx;
    const step2 = step2Base * sx;
    const capOut = capBase * sx;

    const y1 = Math.min(profBaseH, cHeight * 0.6);
    const y2 = Math.min(y1 + profSlopeH, cHeight * 0.92);
    const y3 = Math.min(y2 + profCapRise, cHeight * 0.96);

    const x1 = step1;
    const x2 = x1 + slopeOut;
    const x3 = x2 + step2;
    const x4 = x3 + capOut;
    const x5 = oh;
    const xTopReturn = Math.max(0, oh - backStep);

    return [
      { x: -insetOnRoof, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: y1 },
      { x: x1, y: y1 },
      { x: x2, y: y2 },
      { x: x3, y: y2 },
      { x: x4, y: y3 },
      { x: x5, y: y3 },
      { x: xTopReturn, y: cHeight },
      { x: -insetOnRoof, y: cHeight },
    ];
  };

  const profileFront = makeCorniceProfile(overhangZ);
  const profileSide = makeCorniceProfile(overhangX);

  const frontSeg: MutableRecord = {
    kind: 'cornice_profile_seg',
    length: Math.max(0.001, totalW + 2 * overhangX),
    profile: profileFront,
    rotationY: -Math.PI / 2,
    flipX: false,
    miterStartTrim: overhangX + seamEps,
    miterEndTrim: overhangX + seamEps,
    x: 0,
    y: yPlace,
    z: D / 2,
  };

  const sideStartZ = -D / 2 + CARCASS_BACK_INSET_Z;
  const sideEndZ = D / 2 + overhangZ;
  const sideLen = Math.max(0.001, sideEndZ - sideStartZ);
  const sideCenterZ = (sideStartZ + sideEndZ) / 2;

  const leftSeg: MutableRecord = {
    kind: 'cornice_profile_seg',
    length: sideLen,
    profile: profileSide,
    rotationY: 0,
    flipX: true,
    miterEndTrim: overhangZ + seamEps,
    x: -totalW / 2,
    y: yPlace,
    z: sideCenterZ,
  };

  const rightSeg: MutableRecord = {
    kind: 'cornice_profile_seg',
    length: sideLen,
    profile: profileSide,
    rotationY: 0,
    flipX: false,
    miterEndTrim: overhangZ + seamEps,
    x: totalW / 2,
    y: yPlace,
    z: sideCenterZ,
  };

  return buildLegacyCorniceEnvelope({
    totalW,
    D,
    topY,
    height: cHeight,
    mode: 'profile_open_back',
    z: 0.02,
    segments: [frontSeg, leftSeg, rightSeg],
  });
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
  const topRadius = (baseSize + 0.12) / Math.sqrt(2);
  const bottomRadius = baseSize / Math.sqrt(2);
  const scaleX = (totalW + 0.12) / (baseSize + 0.12);
  const scaleZ = (D + 0.08) / (baseSize + 0.12);

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
