import {
  CARCASS_CORNICE_DIMENSIONS,
  CARCASS_SHELL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  CorniceCtxLike,
  CorniceHelpersLike,
  CorniceLocalsLike,
  CorniceSegment,
  CornicePartId,
  CornicePoint,
  MeshLike,
} from './corner_wing_cornice_contracts.js';
import {
  asBufferAttr,
  getThreeCornice,
  readCornicePoints,
  readCorniceRuntimeNumber,
  resolveCornerWingCorniceTopY,
} from './corner_wing_cornice_contracts.js';
import {
  buildCornerWingCorniceRuns,
  clampCornerMiterTrimForSegment,
  cornerCornicePathSegmentLength,
  cornerExteriorSideNormal,
  cornerMiterExtensionForPathJoint,
  cornerMutualPathJointMiterTrim,
  cornerProfileRotationForPathSegment,
  extendCornerCornicePath,
  filterCornerCornicePath,
  leftCornerExteriorMiterTrim,
  leftCornerSideConnectionPath,
  resolveCornerProfileSideEndZ,
  rightCornerExteriorMiterTrim,
  rightCornerSideConnectionPath,
  shouldExtendCornerExteriorProfilePath,
  shouldUseCornerOuterMiterForPath,
  type CornerCorniceRun,
} from './corner_wing_cornice_path.js';

export function applyCornerWingProfileCornice(args: {
  ctx: CorniceCtxLike;
  locals: CorniceLocalsLike;
  helpers: CorniceHelpersLike;
}): void {
  const { ctx, locals, helpers } = args;
  const {
    THREE,
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
  const corniceCommon = CARCASS_CORNICE_DIMENSIONS.common;
  const corniceProfile = CARCASS_CORNICE_DIMENSIONS.profile;
  // New cornice profile (matches the upgraded main wardrobe cornice in core_pure.ts):
  // - Multi-layer crown molding profile (single solid shape)
  // - Front + sides only (no back piece)
  // - Mitered ends so front/side meet cleanly (no overlap / no corner spikes)
  const cHeight = corniceProfile.heightM;

  const overhangX = corniceProfile.overhangXM;
  const overhangZ = corniceProfile.overhangZM;
  const insetOnRoof = corniceProfile.insetOnRoofM;
  const backStep = corniceProfile.backStepM;

  // Tiny anti-z-fight seam bias for miter joins.
  const seamEps = corniceProfile.miterEpsilonZM;

  // Roof plane for the wing (cornice must start here).
  const topY = resolveCornerWingCorniceTopY(ctx, wingH);
  const epsY = corniceCommon.yLiftM; // tiny lift to avoid z-fighting with the roof boards
  const yPlace = topY + epsY;

  // Wing local Z is slightly shifted in this module (front follows CARCASS_SHELL_DIMENSIONS.frontInsetZM).
  // Keep alignment consistent with the wing carcass/top boards:
  const zCenter = CARCASS_SHELL_DIMENSIONS.frontInsetZM - wingD / 2;
  const frontPlaneZ = zCenter + wingD / 2; // aligned with the carcass front inset
  const backPlaneZ = zCenter - wingD / 2;

  // The masonite back panel sits a bit IN FRONT of backPlaneZ.
  // Trim the cornice depth so it doesn't extend past the masonite from the rear view.
  const backPanelOutsideZ = __wingBackPanelCenterZ - __wingBackPanelThick / 2;
  const backTrimZ = Math.max(backPlaneZ, backPanelOutsideZ);

  // Profile "knobs" (meters) – keep in sync with core_pure.ts
  const profBaseH = corniceProfile.baseHeightM;
  const profStep1Out = corniceProfile.step1OutM;
  const profSlopeH = corniceProfile.slopeHeightM;
  const profSlopeOut = corniceProfile.slopeOutM;
  const profStep2Out = corniceProfile.step2OutM;
  const profCapRise = corniceProfile.capRiseM;
  const profCapOut = corniceProfile.capOutM;
  const profTopLipOut = corniceProfile.topLipOutM;

  const makeCorniceProfile = (overhang: number): CornicePoint[] => {
    // Build profile in base units, then scale horizontally so outer-most point == overhang.
    const oh = Math.max(corniceProfile.minOverhangM, overhang);

    const step1Base = Math.max(0, profStep1Out);
    const slopeBase = Math.max(0, profSlopeOut);
    const step2Base = Math.max(0, profStep2Out);
    const capBase = Math.max(0, profCapOut);
    const lipBase = Math.max(0, profTopLipOut);

    let xMaxBase = step1Base + slopeBase + step2Base + capBase + lipBase;
    if (!Number.isFinite(xMaxBase) || xMaxBase < corniceCommon.epsilonM)
      xMaxBase = corniceProfile.xMaxDefaultM;
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
  const profileSideInternal = makeInternalBoundaryCorniceProfile(profileSide);

  // Material - classic corner cornice uses the same grouped base material as the wave variant,
  // while still allowing the visible front/side segments to advertise their own part ids.
  const baseCorniceMat = getCornerMat('corner_cornice', bodyMat);
  const corniceMatFor = (pid: CornicePartId) => getCornerMat(pid, baseCorniceMat);

  const segmentedRuns = buildCornerWingCorniceRuns(ctx, locals);
  const segs: CorniceSegment[] = segmentedRuns.length
    ? buildSegmentedCornerWingProfileSegments({
        runs: segmentedRuns,
        profileFront,
        profileSide,
        profileSideInternal,
        backTrimZ,
        overhangX,
        overhangZ,
        seamEps,
        minBoxDimension: corniceCommon.minBoxDimensionM,
      })
    : buildFlatCornerWingProfileSegments({
        wingW,
        cornerConnectorEnabled,
        profileFront,
        profileSide,
        frontPlaneZ,
        backTrimZ,
        yPlace,
        overhangX,
        overhangZ,
        seamEps,
        minBoxDimension: corniceCommon.minBoxDimensionM,
      });

  const threeCornice = getThreeCornice(THREE);
  if (!threeCornice) return;

  // Build meshes locally (we can't call render_ops.applyCarcassOps because the wingGroup is rotated).
  const buildProfileSegMesh = (seg: CorniceSegment): MeshLike | null => {
    const profile = readCornicePoints(seg.profile, readNumFrom);
    const segLen = readCorniceRuntimeNumber(seg.length);
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
    const miterStartTrim = readCorniceRuntimeNumber(seg.miterStartTrim);
    const miterEndTrim = readCorniceRuntimeNumber(seg.miterEndTrim);

    if (
      (Number.isFinite(miterStartTrim) && miterStartTrim > 0) ||
      (Number.isFinite(miterEndTrim) && miterEndTrim > 0)
    ) {
      let xOuter = -Infinity;
      for (let i = 0; i < profile.length; i++) {
        xOuter = Math.max(xOuter, profile[i].x);
      }
      if (!Number.isFinite(xOuter) || xOuter <= 0) xOuter = corniceProfile.minOverhangM;

      const pos = asBufferAttr(geo.getAttribute('position'));
      if (!pos) return null;

      const zPos = segLen / 2;
      const zNeg = -segLen / 2;
      const epsZ = corniceProfile.miterEpsilonZM;

      const miterMode = seg.miterMode === 'outer_extend' ? 'outer_extend' : 'inner_trim';
      const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
      const profileBaseY = (() => {
        let minPositiveY = Infinity;
        for (let pi = 0; pi < profile.length; pi += 1) {
          const py = readCorniceRuntimeNumber(profile[pi].y);
          if (Number.isFinite(py) && py > 0) minPositiveY = Math.min(minPositiveY, py);
        }
        return Number.isFinite(minPositiveY) ? minPositiveY + corniceProfile.baseBandEpsilonM : 1e-6;
      })();

      for (let vi = 0; vi < pos.count; vi++) {
        const vx = readCorniceRuntimeNumber(pos.getX(vi));
        const vy = typeof pos.getY === 'function' ? readCorniceRuntimeNumber(pos.getY(vi)) : NaN;
        const vz = readCorniceRuntimeNumber(pos.getZ(vi));
        if (!Number.isFinite(vx) || !Number.isFinite(vz)) continue;
        const innerTrimT = clamp01(1 - vx / xOuter);
        const outerExtendT = clamp01(vx / xOuter);
        const sealBase = Number.isFinite(vy) && vy <= profileBaseY && Number.isFinite(vx) && vx <= 0;

        if (Number.isFinite(miterEndTrim) && miterEndTrim > 0 && Math.abs(vz - zPos) < epsZ) {
          if (miterMode === 'outer_extend') {
            pos.setZ(vi, vz + miterEndTrim * outerExtendT);
          } else {
            let zNew = vz - miterEndTrim * innerTrimT;
            if (sealBase) zNew = Math.min(zPos, zNew + corniceProfile.baseSealEpsilonM);
            pos.setZ(vi, zNew);
          }
        }

        if (Number.isFinite(miterStartTrim) && miterStartTrim > 0 && Math.abs(vz - zNeg) < epsZ) {
          if (miterMode === 'outer_extend') {
            pos.setZ(vi, vz - miterStartTrim * outerExtendT);
          } else {
            let zNew = vz + miterStartTrim * innerTrimT;
            if (sealBase) zNew = Math.max(zNeg, zNew - corniceProfile.baseSealEpsilonM);
            pos.setZ(vi, zNew);
          }
        }
      }

      pos.needsUpdate = true;
    }

    geo.computeVertexNormals();

    const mesh = new threeCornice.Mesh(geo, corniceMatFor(seg.partId));
    if (seg.flipX) mesh.scale.x *= -1;
    const rotationY = readCorniceRuntimeNumber(seg.rotationY, 0);
    if (rotationY !== 0) mesh.rotation.y = rotationY;

    mesh.position.set(
      readCorniceRuntimeNumber(seg.x, 0),
      readCorniceRuntimeNumber(seg.y, 0),
      readCorniceRuntimeNumber(seg.z, 0)
    );
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

type FlatCornerWingProfileSegmentsArgs = {
  wingW: number;
  cornerConnectorEnabled: boolean;
  profileFront: CornicePoint[];
  profileSide: CornicePoint[];
  frontPlaneZ: number;
  backTrimZ: number;
  yPlace: number;
  overhangX: number;
  overhangZ: number;
  seamEps: number;
  minBoxDimension: number;
};

function buildFlatCornerWingProfileSegments(args: FlatCornerWingProfileSegmentsArgs): CorniceSegment[] {
  const frontLen = Math.max(args.minBoxDimension, args.wingW + 2 * args.overhangX);
  const sideStartZ = args.backTrimZ;
  const sideEndZ = args.frontPlaneZ + args.overhangZ;
  const sideLen = Math.max(args.minBoxDimension, sideEndZ - sideStartZ);
  const sideCenterZ = (sideStartZ + sideEndZ) / 2;

  return [
    {
      length: frontLen,
      profile: args.profileFront,
      partId: 'corner_cornice_front',
      rotationY: -Math.PI / 2,
      flipX: false,
      miterStartTrim: args.overhangX + args.seamEps,
      miterEndTrim: args.overhangX + args.seamEps,
      x: args.wingW / 2,
      y: args.yPlace,
      z: args.frontPlaneZ,
    },
    ...(args.cornerConnectorEnabled
      ? []
      : ([
          {
            length: sideLen,
            profile: args.profileSide,
            partId: 'corner_cornice_side_left',
            rotationY: 0,
            flipX: true,
            miterEndTrim: args.overhangZ + args.seamEps,
            x: 0,
            y: args.yPlace,
            z: sideCenterZ,
          },
        ] satisfies CorniceSegment[])),
    {
      length: sideLen,
      profile: args.profileSide,
      partId: 'corner_cornice_side_right',
      rotationY: 0,
      flipX: false,
      miterEndTrim: args.overhangZ + args.seamEps,
      x: args.wingW,
      y: args.yPlace,
      z: sideCenterZ,
    },
  ];
}

type SegmentedCornerWingProfileSegmentsArgs = {
  runs: CornerCorniceRun[];
  profileFront: CornicePoint[];
  profileSide: CornicePoint[];
  profileSideInternal: CornicePoint[];
  backTrimZ: number;
  overhangX: number;
  overhangZ: number;
  seamEps: number;
  minBoxDimension: number;
};

function buildSegmentedCornerWingProfileSegments(
  args: SegmentedCornerWingProfileSegmentsArgs
): CorniceSegment[] {
  const segments: CorniceSegment[] = [];

  for (const run of args.runs) {
    const defaultSideEndZ = run.frontPath.reduce((max, seg) => Math.max(max, seg.az, seg.bz), -Infinity);
    const sourcePath = filterCornerCornicePath(run.frontPath.map(seg => ({ ...seg })));
    const startExtension = shouldExtendCornerExteriorProfilePath(sourcePath[0])
      ? run.leftSide != null && !run.leftSide.internal
        ? args.overhangX
        : 0
      : 0;
    const endExtension = shouldExtendCornerExteriorProfilePath(sourcePath[sourcePath.length - 1])
      ? run.rightSide != null && !run.rightSide.internal
        ? args.overhangX
        : 0
      : 0;
    const renderPath = extendCornerCornicePath(sourcePath, startExtension, endExtension);
    const useOuterMiter = shouldUseCornerOuterMiterForPath(renderPath);

    for (let i = 0; i < renderPath.length; i += 1) {
      const pathSeg = renderPath[i];
      const len = cornerCornicePathSegmentLength(pathSeg);
      if (len <= args.minBoxDimension) continue;

      const startJointTrim =
        i > 0
          ? useOuterMiter
            ? cornerMiterExtensionForPathJoint(renderPath[i - 1], pathSeg, args.overhangZ, args.overhangZ)
                .bStart
            : cornerMutualPathJointMiterTrim(renderPath[i - 1], pathSeg, args.overhangZ)
          : 0;
      const endJointTrim =
        i < renderPath.length - 1
          ? useOuterMiter
            ? cornerMiterExtensionForPathJoint(pathSeg, renderPath[i + 1], args.overhangZ, args.overhangZ)
                .aEnd
            : cornerMutualPathJointMiterTrim(pathSeg, renderPath[i + 1], args.overhangZ)
          : 0;
      const leftExteriorTrim =
        run.leftSide != null && !run.leftSide.internal
          ? useOuterMiter
            ? cornerMiterExtensionForPathJoint(
                leftCornerSideConnectionPath(pathSeg),
                pathSeg,
                args.overhangX,
                args.overhangZ,
                cornerExteriorSideNormal('left')
              ).bStart
            : leftCornerExteriorMiterTrim(pathSeg, args.overhangX)
          : 0;
      const rightExteriorTrim =
        run.rightSide != null && !run.rightSide.internal
          ? useOuterMiter
            ? cornerMiterExtensionForPathJoint(
                pathSeg,
                rightCornerSideConnectionPath(pathSeg),
                args.overhangZ,
                args.overhangX,
                null,
                cornerExteriorSideNormal('right')
              ).aEnd
            : rightCornerExteriorMiterTrim(pathSeg, args.overhangX)
          : 0;

      segments.push({
        length: Math.max(args.minBoxDimension, len),
        profile: args.profileFront,
        partId: 'corner_cornice_front',
        rotationY: cornerProfileRotationForPathSegment(pathSeg),
        flipX: false,
        miterStartTrim:
          i < renderPath.length - 1
            ? clampCornerMiterTrimForSegment(endJointTrim, len)
            : run.rightSide != null && !run.rightSide.internal
              ? clampCornerMiterTrimForSegment(rightExteriorTrim, len)
              : 0,
        miterEndTrim:
          i > 0
            ? clampCornerMiterTrimForSegment(startJointTrim, len)
            : run.leftSide != null && !run.leftSide.internal
              ? clampCornerMiterTrimForSegment(leftExteriorTrim, len)
              : 0,
        ...(useOuterMiter ? { miterMode: 'outer_extend' as const } : null),
        x: (pathSeg.ax + pathSeg.bx) / 2,
        y: run.topY + CARCASS_CORNICE_DIMENSIONS.common.yLiftM,
        z: (pathSeg.az + pathSeg.bz) / 2,
      });
    }

    if (run.leftSide != null && renderPath.length) {
      const sideStartZ = run.leftSide.startZ;
      const sideEndZ = run.leftSide.connectorSeam
        ? renderPath[0].az
        : resolveCornerProfileSideEndZ({
            pathSeg: renderPath[0],
            end: 'start',
            defaultEndZ: defaultSideEndZ + args.overhangZ,
            useOuterMiter,
            profileOverhangZ: args.overhangZ,
          });
      const sideLen = Math.max(args.minBoxDimension, Math.abs(sideEndZ - sideStartZ));
      const sideCenterZ = (sideStartZ + sideEndZ) / 2;
      const sideMiterTrim = run.leftSide.connectorSeam
        ? 0
        : !run.leftSide.internal && renderPath.length
          ? clampCornerMiterTrimForSegment(
              useOuterMiter
                ? cornerMiterExtensionForPathJoint(
                    leftCornerSideConnectionPath(renderPath[0]),
                    renderPath[0],
                    args.overhangX,
                    args.overhangZ,
                    cornerExteriorSideNormal('left')
                  ).aEnd
                : leftCornerExteriorMiterTrim(renderPath[0], args.overhangZ),
              sideLen
            )
          : args.overhangZ + args.seamEps;
      segments.push({
        length: sideLen,
        profile: run.leftSide.internal ? args.profileSideInternal : args.profileSide,
        partId: run.leftSide.internal ? 'corner_cornice_front' : 'corner_cornice_side_left',
        rotationY: 0,
        flipX: !run.leftSide.internal,
        ...(sideEndZ >= sideStartZ ? { miterEndTrim: sideMiterTrim } : { miterStartTrim: sideMiterTrim }),
        ...(useOuterMiter && sideMiterTrim > 0 ? { miterMode: 'outer_extend' as const } : null),
        x: run.left,
        y: run.topY + CARCASS_CORNICE_DIMENSIONS.common.yLiftM,
        z: sideCenterZ,
      });
    }

    if (run.rightSide != null && renderPath.length) {
      const sideStartZ = run.rightSide.startZ;
      const sideEndZ = run.rightSide.connectorSeam
        ? renderPath[renderPath.length - 1].bz
        : resolveCornerProfileSideEndZ({
            pathSeg: renderPath[renderPath.length - 1],
            end: 'end',
            defaultEndZ: defaultSideEndZ + args.overhangZ,
            useOuterMiter,
            profileOverhangZ: args.overhangZ,
          });
      const sideLen = Math.max(args.minBoxDimension, Math.abs(sideEndZ - sideStartZ));
      const sideCenterZ = (sideStartZ + sideEndZ) / 2;
      const sideMiterTrim = run.rightSide.connectorSeam
        ? 0
        : !run.rightSide.internal && renderPath.length
          ? clampCornerMiterTrimForSegment(
              useOuterMiter
                ? cornerMiterExtensionForPathJoint(
                    renderPath[renderPath.length - 1],
                    rightCornerSideConnectionPath(renderPath[renderPath.length - 1]),
                    args.overhangZ,
                    args.overhangX,
                    null,
                    cornerExteriorSideNormal('right')
                  ).bStart
                : rightCornerExteriorMiterTrim(renderPath[renderPath.length - 1], args.overhangZ),
              sideLen
            )
          : args.overhangZ + args.seamEps;
      segments.push({
        length: sideLen,
        profile: run.rightSide.internal ? args.profileSideInternal : args.profileSide,
        partId: run.rightSide.internal ? 'corner_cornice_front' : 'corner_cornice_side_right',
        rotationY: 0,
        flipX: run.rightSide.internal,
        ...(sideEndZ >= sideStartZ ? { miterEndTrim: sideMiterTrim } : { miterStartTrim: sideMiterTrim }),
        ...(useOuterMiter && sideMiterTrim > 0 ? { miterMode: 'outer_extend' as const } : null),
        x: run.right,
        y: run.topY + CARCASS_CORNICE_DIMENSIONS.common.yLiftM,
        z: sideCenterZ,
      });
    }
  }

  return segments;
}

function makeInternalBoundaryCorniceProfile(profile: CornicePoint[]): CornicePoint[] {
  return profile.map(point => ({
    ...point,
    x: Math.max(0, point.x),
  }));
}
