import { CARCASS_CORNICE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  CornerConnectorCorniceCtx,
  CornerConnectorCorniceHelpers,
  CornerConnectorCorniceLocals,
} from './corner_connector_cornice_shared.js';
import { hasCorniceExtrusionSupport, readBufferAttribute } from './corner_connector_cornice_shared.js';

export function applyCornerConnectorProfileCornice(args: {
  ctx: CornerConnectorCorniceCtx;
  locals: CornerConnectorCorniceLocals;
  helpers: CornerConnectorCorniceHelpers;
}): void {
  const { ctx, locals, helpers } = args;
  const { THREE, startY, wingH, bodyMat, addOutlines, getCornerMat, __sketchMode } = ctx;
  const { pts, cornerGroup, interiorX, interiorZ, mx } = locals;
  const { readNumFrom, asRecord } = helpers;
  const corniceCommon = CARCASS_CORNICE_DIMENSIONS.common;
  const corniceProfile = CARCASS_CORNICE_DIMENSIONS.profile;
  const cHeight = corniceProfile.heightM;

  const overhang = corniceProfile.overhangZM;
  const insetOnRoof = corniceProfile.insetOnRoofM;
  const backStep = corniceProfile.backStepM;

  const topY = startY + wingH;
  const epsY = corniceCommon.yLiftM;
  const yPlace = topY + epsY;

  // Profile knobs (meters) – same as the upgraded main/wing cornice.
  const profBaseH = corniceProfile.baseHeightM;
  const profStep1Out = corniceProfile.step1OutM;
  const profSlopeH = corniceProfile.slopeHeightM;
  const profSlopeOut = corniceProfile.slopeOutM;
  const profStep2Out = corniceProfile.step2OutM;
  const profCapRise = corniceProfile.capRiseM;
  const profCapOut = corniceProfile.capOutM;
  const profTopLipOut = corniceProfile.topLipOutM;

  const makeCorniceProfile = (ohIn: number) => {
    const oh = Math.max(corniceProfile.minOverhangM, ohIn);

    const step1Base = Math.max(0, profStep1Out);
    const slopeBase = Math.max(0, profSlopeOut);
    const step2Base = Math.max(0, profStep2Out);
    const capBase = Math.max(0, profCapOut);
    const lipBase = Math.max(0, profTopLipOut);

    let xMaxBase = step1Base + slopeBase + step2Base + capBase + lipBase;
    if (!Number.isFinite(xMaxBase) || xMaxBase < corniceCommon.epsilonM)
      xMaxBase = corniceProfile.xMaxFallbackM;
    const sx = oh / xMaxBase;

    const step1 = step1Base * sx;
    const slopeOut = slopeBase * sx;
    const step2 = step2Base * sx;
    const capOut = capBase * sx;

    const y1 = Math.min(profBaseH, cHeight * corniceProfile.baseHeightRatio);
    const y2 = Math.min(y1 + profSlopeH, cHeight * corniceProfile.slopeHeightRatio);
    const y3 = Math.min(y2 + profCapRise, cHeight * corniceProfile.capHeightRatio);

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

  const profile = makeCorniceProfile(overhang);

  // Visible diagonal edge (doors face): pts[2] -> pts[3]
  const a = pts[2];
  const b = pts[3];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const segLen = Math.sqrt(dx * dx + dz * dz);
  if (Number.isFinite(segLen) && segLen > corniceCommon.minSegmentLengthM) {
    const ux = dx / segLen;
    const uz = dz / segLen;

    // Outward normal (away from interior) – choose based on a known interior point.
    let nx = -uz;
    let nz = ux;
    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    const toInteriorX = interiorX - midX;
    const toInteriorZ = interiorZ - midZ;
    if (nx * toInteriorX + nz * toInteriorZ > 0) {
      nx = -nx;
      nz = -nz;
    }

    // Rotation so local +Z aligns with the diagonal direction.
    const yaw = Math.atan2(dx, dz);

    // Decide whether to flip profile X so +X points outward.
    const localXWorldX = Math.cos(yaw);
    const localXWorldZ = -Math.sin(yaw);
    const flipX = localXWorldX * nx + localXWorldZ * nz < 0;

    // Compute generalized miter trims against the wing-front (+Z) and main-front (along mirrored X).
    let xOuter = -Infinity;
    for (let i = 0; i < profile.length; i++) {
      const px = readNumFrom(profile[i], 'x', NaN);
      if (Number.isFinite(px)) xOuter = Math.max(xOuter, px);
    }
    if (!Number.isFinite(xOuter) || xOuter <= 0) xOuter = corniceProfile.minOverhangM;

    const clamp01 = (v: number) => Math.max(-1, Math.min(1, v));
    const safeCotHalf = (theta: number) => {
      const t = Math.max(corniceCommon.thetaClampM, Math.min(Math.PI - corniceCommon.thetaClampM, theta));
      const h = Math.tan(t / 2);
      return h !== 0 ? 1 / h : 0;
    };

    const wingDirX = 0;
    const wingDirZ = 1;
    const dotA = clamp01(wingDirX * ux + wingDirZ * uz);
    const thetaA = Math.acos(dotA);

    const mainDirX = mx(-1);
    const mainDirZ = 0;
    const dotB = clamp01(mainDirX * -ux + mainDirZ * -uz);
    const thetaB = Math.acos(dotB);

    const miterStartTrim = xOuter * safeCotHalf(thetaA);
    const miterEndTrim = xOuter * safeCotHalf(thetaB);

    // Build the extruded profile segment.
    const buildProfileSegMesh = () => {
      if (!hasCorniceExtrusionSupport(THREE)) return null;

      const p0 = asRecord(profile[0]);
      const x0 = readNumFrom(p0, 'x', NaN);
      const y0 = readNumFrom(p0, 'y', NaN);
      if (!Number.isFinite(x0) || !Number.isFinite(y0)) return null;

      const shape = new THREE.Shape();
      shape.moveTo(x0, y0);
      for (let i = 1; i < profile.length; i++) {
        const p = asRecord(profile[i]);
        const px = readNumFrom(p, 'x', NaN);
        const py = readNumFrom(p, 'y', NaN);
        if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
        shape.lineTo(px, py);
      }
      shape.lineTo(x0, y0);

      const geo = new THREE.ExtrudeGeometry(shape, { depth: segLen, bevelEnabled: false, steps: 1 });
      if (typeof geo.translate === 'function') geo.translate(0, 0, -segLen / 2);

      // Miter-cut ends (generalized): trim amount grows as we go inward (x decreases).
      const pos =
        typeof geo.getAttribute === 'function' ? readBufferAttribute(geo.getAttribute('position')) : null;
      if (!pos) return null;
      const zPos = segLen / 2;
      const zNeg = -segLen / 2;
      const epsZ = corniceProfile.miterEpsilonZM;

      // Seal the *base band* join against adjacent cornice pieces.
      // In some builds, the neighboring module cornice strips its miter end-caps (to avoid Z-fighting).
      // If the pentagon diagonal miter trims the inner (x<=0) base band too aggressively, it can leave a
      // visible hole from the front near the bottom band. We keep the visible outer profile unchanged,
      // and only relax the trim by a few millimeters for the inner/base region to close the seam.
      const baseBandY =
        Math.min(profBaseH, cHeight * corniceProfile.baseHeightRatio) + corniceProfile.baseBandEpsilonM;
      const baseSealEps = corniceProfile.baseSealEpsilonM;

      for (let vi = 0; vi < pos.count; vi++) {
        const vx = Number(pos.getX(vi));
        const vy = Number(pos.getY(vi));
        const vz = Number(pos.getZ(vi));
        const t = Math.min(1, Math.max(0, 1 - vx / xOuter)); // clamp; negative x doesn't over-trim

        const sealBase = Number.isFinite(vy) && vy <= baseBandY && Number.isFinite(vx) && vx <= 0;

        if (Number.isFinite(miterEndTrim) && miterEndTrim > 0 && Math.abs(vz - zPos) < epsZ) {
          let zNew = vz - miterEndTrim * t;
          if (sealBase) zNew = Math.min(zPos, zNew + baseSealEps);
          pos.setZ(vi, zNew);
        }
        if (Number.isFinite(miterStartTrim) && miterStartTrim > 0 && Math.abs(vz - zNeg) < epsZ) {
          let zNew = vz + miterStartTrim * t;
          if (sealBase) zNew = Math.max(zNeg, zNew - baseSealEps);
          pos.setZ(vi, zNew);
        }
      }
      pos.needsUpdate = true;
      if (typeof geo.computeVertexNormals === 'function') geo.computeVertexNormals();

      const baseCorniceMat = getCornerMat('corner_cornice', bodyMat);
      const corniceMat = getCornerMat('corner_cornice_front', baseCorniceMat);
      const m = new THREE.Mesh(geo, corniceMat);
      if (flipX) m.scale.x *= -1;
      m.rotation.y = yaw;
      m.position.set(midX, yPlace, midZ);
      m.userData = { partId: 'corner_cornice_front' };
      if (!__sketchMode) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
      addOutlines(m);
      return m;
    };

    const m = buildProfileSegMesh();
    if (m) cornerGroup.add(m);
  }
}
