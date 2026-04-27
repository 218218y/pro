import type {
  CorniceCtxLike,
  CorniceHelpersLike,
  CorniceLocalsLike,
  CorniceSegment,
  CornicePartId,
  CornicePoint,
  MeshLike,
} from './corner_wing_cornice_contracts.js';
import { asBufferAttr, getThreeCornice, readCornicePoints } from './corner_wing_cornice_contracts.js';

export function applyCornerWingProfileCornice(args: {
  ctx: CorniceCtxLike;
  locals: CorniceLocalsLike;
  helpers: CorniceHelpersLike;
}): void {
  const { ctx, locals, helpers } = args;
  const {
    THREE,
    startY,
    wingH,
    wingD,
    wingW,
    cornerConnectorEnabled,
    getCornerMat,
    bodyMat,
    addOutlines,
    __sketchMode,
    wingGroup,
  } = ctx;
  const { __wingBackPanelThick, __wingBackPanelCenterZ } = locals;
  const { readNumFrom } = helpers;
  // New cornice profile (matches the upgraded main wardrobe cornice in core_pure.ts):
  // - Multi-layer crown molding profile (single solid shape)
  // - Front + sides only (no back piece)
  // - Mitered ends so front/side meet cleanly (no overlap / no corner spikes)
  const cHeight = 0.08;

  const overhangX = 0.06; // side overhang (meters)
  const overhangZ = 0.04; // front overhang (meters)
  const insetOnRoof = 0.03; // sits inward on the roof (meters)
  const backStep = 0.02; // top return back (meters)

  // Tiny anti-z-fight seam bias for miter joins.
  const seamEps = 0.0005; // 0.5mm

  // Roof plane for the wing (cornice must start here).
  const topY = startY + wingH;
  const epsY = 0.0006; // tiny lift to avoid z-fighting with the roof boards
  const yPlace = topY + epsY;

  // Wing local Z is slightly shifted in this module (front is near z≈0.005).
  // Keep alignment consistent with the wing carcass/top boards:
  const zCenter = 0.005 - wingD / 2;
  const frontPlaneZ = zCenter + wingD / 2; // ≈ 0.005
  const backPlaneZ = zCenter - wingD / 2; // ≈ 0.005 - wingD

  // The masonite back panel sits a bit IN FRONT of backPlaneZ.
  // Trim the cornice depth so it doesn't extend past the masonite from the rear view.
  const backPanelOutsideZ = __wingBackPanelCenterZ - __wingBackPanelThick / 2;
  const backTrimZ = Math.max(backPlaneZ, backPanelOutsideZ);

  // Profile "knobs" (meters) – keep in sync with core_pure.ts
  const profBaseH = 0.022;
  const profStep1Out = 0.006;
  const profSlopeH = 0.03;
  const profSlopeOut = 0.018;
  const profStep2Out = 0.006;
  const profCapRise = 0.012;
  const profCapOut = 0.004;
  const profTopLipOut = 0.003;

  const makeCorniceProfile = (overhang: number): CornicePoint[] => {
    // Build profile in base units, then scale horizontally so outer-most point == overhang.
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
    const x5 = oh; // force exact outer-most

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

  // Material – classic corner cornice uses the same grouped fallback as the wave variant,
  // while still allowing the visible front/side segments to advertise their own part ids.
  const baseCorniceMat = getCornerMat('corner_cornice', bodyMat);
  const corniceMatFor = (pid: CornicePartId) => getCornerMat(pid, baseCorniceMat);

  // Build 3 segments (front + left + right), with mitered ends like the main wardrobe.
  const frontLen = Math.max(0.001, wingW + 2 * overhangX);
  const sideStartZ = backTrimZ;
  const sideEndZ = frontPlaneZ + overhangZ;
  const sideLen = Math.max(0.001, sideEndZ - sideStartZ);
  const sideCenterZ = (sideStartZ + sideEndZ) / 2;

  const segs: CorniceSegment[] = [
    {
      length: frontLen,
      profile: profileFront,
      partId: 'corner_cornice_front',
      rotationY: -Math.PI / 2, // extrude(Z)->X and profileX->+Z
      flipX: false,
      miterStartTrim: overhangX + seamEps,
      miterEndTrim: overhangX + seamEps,
      x: wingW / 2,
      y: yPlace,
      z: frontPlaneZ, // align profile x=0 to the wing FRONT plane
    },

    // Omit the "attach side" piece when the corner connector (pentagon) exists:
    // that side is not exposed and would clash with the connector cornice.
    ...(cornerConnectorEnabled
      ? []
      : ([
          {
            length: sideLen,
            profile: profileSide,
            partId: 'corner_cornice_side_left',
            rotationY: 0,
            flipX: true, // outward -> -X
            miterEndTrim: overhangZ + seamEps, // miter front end
            x: 0, // left side plane
            y: yPlace,
            z: sideCenterZ,
          },
        ] satisfies CorniceSegment[])),

    {
      length: sideLen,
      profile: profileSide,
      partId: 'corner_cornice_side_right',
      rotationY: 0,
      flipX: false, // outward -> +X
      miterEndTrim: overhangZ + seamEps, // miter front end
      x: wingW, // right side plane
      y: yPlace,
      z: sideCenterZ,
    },
  ];

  const threeCornice = getThreeCornice(THREE);
  if (!threeCornice) return;

  // Build meshes locally (we can't call render_ops.applyCarcassOps because the wingGroup is rotated).
  const buildProfileSegMesh = (seg: CorniceSegment): MeshLike | null => {
    const profile = readCornicePoints(seg.profile, readNumFrom);
    const segLen = Number(seg.length);
    if (profile.length < 3 || !Number.isFinite(segLen) || segLen <= 0) return null;

    const p0 = profile[0];
    if (!Number.isFinite(p0.x) || !Number.isFinite(p0.y)) return null;

    const shape = new threeCornice.Shape();
    shape.moveTo(p0.x, p0.y);
    for (let i = 1; i < profile.length; i++) {
      const point = profile[i];
      shape.lineTo(point.x, point.y);
    }
    shape.lineTo(p0.x, p0.y);

    const geo = new threeCornice.ExtrudeGeometry(shape, { depth: segLen, bevelEnabled: false, steps: 1 });
    // Center along segment length (extrude axis = +Z).
    geo.translate(0, 0, -segLen / 2);

    // Optional: miter-cut ends (same math as render_ops.ts)
    const miterStartTrim = Number(seg.miterStartTrim);
    const miterEndTrim = Number(seg.miterEndTrim);

    if (
      (Number.isFinite(miterStartTrim) && miterStartTrim > 0) ||
      (Number.isFinite(miterEndTrim) && miterEndTrim > 0)
    ) {
      let xOuter = -Infinity;
      for (let i = 0; i < profile.length; i++) {
        xOuter = Math.max(xOuter, profile[i].x);
      }
      if (!Number.isFinite(xOuter) || xOuter <= 0) xOuter = 0.001;

      const pos = asBufferAttr(geo.getAttribute('position'));
      if (!pos) return null;

      const zPos = segLen / 2;
      const zNeg = -segLen / 2;
      const epsZ = 5e-4; // 0.5mm

      for (let vi = 0; vi < pos.count; vi++) {
        const vx = Number(pos.getX(vi));
        const vz = Number(pos.getZ(vi));

        // Positive end (z = +segLen/2) -> trim inward (toward -Z).
        if (Number.isFinite(miterEndTrim) && miterEndTrim > 0 && Math.abs(vz - zPos) < epsZ) {
          const t = Math.min(1, Math.max(0, 1 - vx / xOuter)); // clamp so negative x doesn't over-trim
          pos.setZ(vi, vz - miterEndTrim * t);
        }

        // Negative end (z = -segLen/2) -> trim inward (toward +Z).
        if (Number.isFinite(miterStartTrim) && miterStartTrim > 0 && Math.abs(vz - zNeg) < epsZ) {
          const t = Math.min(1, Math.max(0, 1 - vx / xOuter));
          pos.setZ(vi, vz + miterStartTrim * t);
        }
      }

      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }

    geo.computeVertexNormals();

    const mesh = new threeCornice.Mesh(geo, corniceMatFor(seg.partId));
    if (seg.flipX) mesh.scale.x *= -1;
    if (Number.isFinite(seg.rotationY) && seg.rotationY !== 0) mesh.rotation.y = Number(seg.rotationY);

    mesh.position.set(Number(seg.x) || 0, Number(seg.y) || 0, Number(seg.z) || 0);
    mesh.userData = { partId: seg.partId };
    if (!__sketchMode) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    addOutlines(mesh);
    return mesh;
  };

  for (let i = 0; i < segs.length; i++) {
    const mesh = buildProfileSegMesh(segs[i]);
    if (mesh) wingGroup.add(mesh);
  }
}
