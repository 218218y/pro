import {
  CARCASS_CORNICE_ANGLE_POLICY,
  CARCASS_CORNICE_RENDER_POLICY,
} from '../../shared/dimensions/carcass_cornice_render_policy.js';
import type {
  CornerCorniceBoxOp,
  CornerCornicePlan,
  CornerCorniceProfileOp,
  CornerCorniceWaveOp,
} from './corner_cornice_ir.js';
import { buildCornerCorniceProfile, connectorProfileBaseBandY } from './corner_cornice_profile_plan.js';
import type {
  CornerConnectorCorniceCtx,
  CornerConnectorCorniceLocals,
  CornerConnectorCorniceSideReturn,
} from './corner_connector_cornice_shared.js';
import {
  resolveCornerConnectorCorniceSideReturns,
  resolveCornerConnectorCorniceTopY,
} from './corner_connector_cornice_shared.js';

const COMMON = CARCASS_CORNICE_RENDER_POLICY.common;
const PROFILE = CARCASS_CORNICE_RENDER_POLICY.profile;
const WAVE = CARCASS_CORNICE_RENDER_POLICY.wave;

type XzPoint = { x: number; z: number };

function pathLength(a: XzPoint, b: XzPoint): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  return Number.isFinite(length) ? length : 0;
}

function outwardNormal(a: XzPoint, b: XzPoint, interiorX: number, interiorZ: number): XzPoint {
  const length = pathLength(a, b);
  if (!(length > 0)) return { x: 0, z: 1 };
  let x = -(b.z - a.z) / length;
  let z = (b.x - a.x) / length;
  const midX = (a.x + b.x) / 2;
  const midZ = (a.z + b.z) / 2;
  if (x * (interiorX - midX) + z * (interiorZ - midZ) > 0) {
    x = -x;
    z = -z;
  }
  return { x, z };
}

function profilePlacement(args: {
  a: XzPoint;
  b: XzPoint;
  interiorX: number;
  interiorZ: number;
}): { length: number; x: number; z: number; rotationY: number; flipX: boolean } | null {
  const { a, b } = args;
  const length = pathLength(a, b);
  if (!(length > COMMON.minSegmentLengthM)) return null;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const rotationY = Math.atan2(dx, dz);
  const outward = outwardNormal(a, b, args.interiorX, args.interiorZ);
  const localXWorldX = Math.cos(rotationY);
  const localXWorldZ = -Math.sin(rotationY);
  return {
    length,
    x: (a.x + b.x) / 2,
    z: (a.z + b.z) / 2,
    rotationY,
    flipX: localXWorldX * outward.x + localXWorldZ * outward.z < 0,
  };
}

function sideProfileOperation(args: {
  side: CornerConnectorCorniceSideReturn;
  profile: ReturnType<typeof buildCornerCorniceProfile>;
  y: number;
  interiorX: number;
  interiorZ: number;
}): CornerCorniceProfileOp | null {
  const placement = profilePlacement({
    a: args.side.a,
    b: args.side.b,
    interiorX: args.interiorX,
    interiorZ: args.interiorZ,
  });
  if (!placement) return null;
  return {
    kind: 'corner_profile',
    partId: args.side.partId,
    length: placement.length,
    profile: args.profile,
    rotationY: placement.rotationY,
    flipX: placement.flipX,
    x: placement.x,
    y: args.y,
    z: placement.z,
  };
}

export function buildCornerConnectorProfileCornicePlan(
  ctx: CornerConnectorCorniceCtx,
  locals: CornerConnectorCorniceLocals
): CornerCornicePlan {
  const operations: CornerCorniceProfileOp[] = [];
  const profile = buildCornerCorniceProfile(PROFILE.overhangZM);
  const sideProfile = buildCornerCorniceProfile(PROFILE.overhangXM);
  const yPlace = resolveCornerConnectorCorniceTopY(ctx) + COMMON.yLiftM;
  const a = locals.pts[2];
  const b = locals.pts[3];
  if (a && b) {
    const placement = profilePlacement({
      a,
      b,
      interiorX: locals.interiorX,
      interiorZ: locals.interiorZ,
    });
    if (placement) {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const ux = dx / placement.length;
      const uz = dz / placement.length;
      let xOuter = -Infinity;
      for (const point of profile) xOuter = Math.max(xOuter, point.x);
      if (!(Number.isFinite(xOuter) && xOuter > 0)) xOuter = PROFILE.minOverhangM;
      const clampDot = (value: number) => Math.max(-1, Math.min(1, value));
      const safeCotHalf = (theta: number) => {
        const clamped = Math.max(
          CARCASS_CORNICE_ANGLE_POLICY.thetaClampRad,
          Math.min(Math.PI - CARCASS_CORNICE_ANGLE_POLICY.thetaClampRad, theta)
        );
        const halfTan = Math.tan(clamped / 2);
        return halfTan !== 0 ? 1 / halfTan : 0;
      };
      const thetaA = Math.acos(clampDot(uz));
      const mainDirX = locals.mx(-1);
      const thetaB = Math.acos(clampDot(mainDirX * -ux));
      operations.push({
        kind: 'corner_profile',
        partId: 'corner_cornice_front',
        length: placement.length,
        profile,
        rotationY: placement.rotationY,
        flipX: placement.flipX,
        miterStartTrim: xOuter * safeCotHalf(thetaA),
        miterEndTrim: xOuter * safeCotHalf(thetaB),
        miterMode: 'inner_trim',
        miterProfileBaseY: connectorProfileBaseBandY(),
        miterBaseSealEpsilon: PROFILE.baseSealEpsilonM,
        x: placement.x,
        y: yPlace,
        z: placement.z,
      });
    }
  }
  for (const side of resolveCornerConnectorCorniceSideReturns({ ctx, locals })) {
    const operation = sideProfileOperation({
      side,
      profile: sideProfile,
      y: yPlace,
      interiorX: locals.interiorX,
      interiorZ: locals.interiorZ,
    });
    if (operation) operations.push(operation);
  }
  return { kind: 'corner_cornice', owner: 'connector', mode: 'profile', operations };
}

function waveSamples(length: number): number {
  return Math.max(
    WAVE.sampleCountMin,
    Math.min(WAVE.sampleCountMax, Math.round(length / WAVE.sampleSpacingM))
  );
}

function sideWaveBox(args: {
  side: CornerConnectorCorniceSideReturn;
  frameT: number;
  maxH: number;
  yPlace: number;
  interiorX: number;
  interiorZ: number;
}): CornerCorniceBoxOp | null {
  const { a, b } = args.side;
  const length = pathLength(a, b);
  if (!(length > COMMON.minSegmentLengthM)) return null;
  const outward = outwardNormal(a, b, args.interiorX, args.interiorZ);
  const centerX = (a.x + b.x) / 2 - outward.x * (args.frameT / 2);
  const centerZ = (a.z + b.z) / 2 - outward.z * (args.frameT / 2);
  return {
    kind: 'corner_box',
    partId: args.side.partId,
    width: args.frameT,
    height: args.maxH,
    depth: length,
    rotationY: Math.atan2(-(b.x - a.x), -(b.z - a.z)),
    x: centerX,
    y: args.yPlace + args.maxH / 2,
    z: centerZ,
  };
}

export function buildCornerConnectorWaveCornicePlan(
  ctx: CornerConnectorCorniceCtx,
  locals: CornerConnectorCorniceLocals
): CornerCornicePlan {
  const operations: Array<CornerCorniceWaveOp | CornerCorniceBoxOp> = [];
  const yPlace = resolveCornerConnectorCorniceTopY(ctx) + COMMON.yLiftM;
  const frameT = Math.max(
    WAVE.frameThicknessMinM,
    Math.min(WAVE.frameThicknessMaxM, ctx.woodThick || WAVE.fallbackWoodThicknessM)
  );
  const a = locals.pts[2];
  const b = locals.pts[3];
  if (a && b) {
    const length = pathLength(a, b);
    if (length > COMMON.minSegmentLengthM) {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const ang = Math.atan2(dz, dx);
      const midX = (a.x + b.x) / 2;
      const midZ = (a.z + b.z) / 2;
      const plusLocalZ = { x: -dz / length, z: dx / length };
      const outward = outwardNormal(a, b, locals.interiorX, locals.interiorZ);
      const localZIsOutward = plusLocalZ.x * outward.x + plusLocalZ.z * outward.z >= 0;
      const localShift = localZIsOutward ? -frameT - WAVE.connectorInsetM : WAVE.connectorInsetM;
      operations.push({
        kind: 'corner_wave',
        partId: 'corner_cornice_front',
        length,
        depth: frameT,
        heightMax: WAVE.maxHeightM,
        waveAmp: Math.min(Math.max(length * WAVE.amplitudeRatio, WAVE.amplitudeMinM), WAVE.amplitudeMaxM),
        waveCycles: WAVE.cycles,
        samples: waveSamples(length),
        rotationY: -ang,
        x: midX + plusLocalZ.x * localShift,
        y: yPlace,
        z: midZ + plusLocalZ.z * localShift,
      });
    }
  }
  for (const side of resolveCornerConnectorCorniceSideReturns({ ctx, locals })) {
    const operation = sideWaveBox({
      side,
      frameT,
      maxH: WAVE.maxHeightM,
      yPlace,
      interiorX: locals.interiorX,
      interiorZ: locals.interiorZ,
    });
    if (operation) operations.push(operation);
  }
  return { kind: 'corner_cornice', owner: 'connector', mode: 'wave', operations };
}
