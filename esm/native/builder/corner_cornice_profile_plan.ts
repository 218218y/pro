import { CARCASS_CORNICE_RENDER_POLICY } from '../../shared/dimensions/carcass_cornice_render_policy.js';
import type { CornerCornicePoint } from './corner_cornice_ir.js';

const COMMON = CARCASS_CORNICE_RENDER_POLICY.common;
const PROFILE = CARCASS_CORNICE_RENDER_POLICY.profile;

export function buildCornerCorniceProfile(overhang: number): CornerCornicePoint[] {
  const height = PROFILE.heightM;
  const insetOnRoof = Number(PROFILE.insetOnRoofM);
  const safeOverhang = Math.max(PROFILE.minOverhangM, overhang);
  const step1Base = Math.max(0, PROFILE.step1OutM);
  const slopeBase = Math.max(0, PROFILE.slopeOutM);
  const step2Base = Math.max(0, PROFILE.step2OutM);
  const capBase = Math.max(0, PROFILE.capOutM);
  const lipBase = Math.max(0, PROFILE.topLipOutM);
  let xMaxBase = step1Base + slopeBase + step2Base + capBase + lipBase;
  if (!Number.isFinite(xMaxBase) || xMaxBase < COMMON.epsilonM) xMaxBase = PROFILE.xMaxDefaultM;
  const sx = safeOverhang / xMaxBase;
  const y1 = Math.min(PROFILE.baseHeightM, height * PROFILE.baseHeightRatio);
  const y2 = Math.min(y1 + PROFILE.slopeHeightM, height * PROFILE.slopeHeightRatio);
  const y3 = Math.min(y2 + PROFILE.capRiseM, height * PROFILE.capHeightRatio);
  const x1 = step1Base * sx;
  const x2 = x1 + slopeBase * sx;
  const x3 = x2 + step2Base * sx;
  const x4 = x3 + capBase * sx;
  const xTopReturn = Math.max(0, safeOverhang - PROFILE.backStepM);
  return [
    { x: -insetOnRoof, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: y1 },
    { x: x1, y: y1 },
    { x: x2, y: y2 },
    { x: x3, y: y2 },
    { x: x4, y: y3 },
    { x: safeOverhang, y: y3 },
    { x: xTopReturn, y: height },
    { x: -insetOnRoof, y: height },
  ];
}

export function buildInternalCornerCorniceProfile(profile: CornerCornicePoint[]): CornerCornicePoint[] {
  return profile.map(point => ({ ...point, x: Math.max(0, point.x) }));
}

export function connectorProfileBaseBandY(): number {
  return Math.min(PROFILE.baseHeightM, PROFILE.heightM * PROFILE.baseHeightRatio) + PROFILE.baseBandEpsilonM;
}
