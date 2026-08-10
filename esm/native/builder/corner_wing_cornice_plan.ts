import { CARCASS_CORNICE_RENDER_POLICY } from '../../shared/dimensions/carcass_cornice_render_policy.js';
import { CARCASS_SHELL_DIMENSIONS } from '../../shared/dimensions/carcass_shell_policy.js';
import type {
  CornerCornicePlan,
  CornerCorniceProfileOp,
  CornerCornicePoint,
  CornerCorniceBoxOp,
  CornerCorniceWaveOp,
} from './corner_cornice_ir.js';
import {
  buildCornerCorniceProfile,
  buildInternalCornerCorniceProfile,
} from './corner_cornice_profile_plan.js';
import type { CorniceCtxLike, CorniceLocalsLike } from './corner_wing_cornice_contracts.js';
import { resolveCornerWingCorniceTopY } from './corner_wing_cornice_contracts.js';
import {
  buildCornerWingCorniceRuns,
  clampCornerMiterTrimForSegment,
  cornerCornicePathSegmentLength,
  cornerExteriorSideNormal,
  cornerMiterExtensionForPathJoint,
  cornerMutualPathJointMiterTrim,
  cornerProfileRotationForPathSegment,
  cornerWaveRotationForPathSegment,
  extendCornerCornicePath,
  filterCornerCornicePath,
  inwardCornerWaveCenterForPathSegment,
  isStraightCornerFrontPathSegment,
  leftCornerExteriorMiterTrim,
  leftCornerSideConnectionPath,
  resolveCornerProfileSideEndZ,
  rightCornerExteriorMiterTrim,
  rightCornerSideConnectionPath,
  shouldExtendCornerExteriorProfilePath,
  shouldUseCornerOuterMiterForPath,
  trimCornerCornicePath,
  type CornerCorniceRun,
  type CornerCorniceSideClosure,
} from './corner_wing_cornice_path.js';

const CORNICE_COMMON = CARCASS_CORNICE_RENDER_POLICY.common;
const CORNICE_PROFILE = CARCASS_CORNICE_RENDER_POLICY.profile;
const CORNICE_WAVE = CARCASS_CORNICE_RENDER_POLICY.wave;

export function buildCornerWingProfileCornicePlan(
  ctx: CorniceCtxLike,
  locals: CorniceLocalsLike
): CornerCornicePlan {
  const profileFront = buildCornerCorniceProfile(CORNICE_PROFILE.overhangZM);
  const profileSide = buildCornerCorniceProfile(CORNICE_PROFILE.overhangXM);
  const profileSideInternal = buildInternalCornerCorniceProfile(profileSide);
  const topY = resolveCornerWingCorniceTopY(ctx, ctx.wingH);
  const zCenter = CARCASS_SHELL_DIMENSIONS.frontInsetZM - ctx.wingD / 2;
  const frontPlaneZ = zCenter + ctx.wingD / 2;
  const backPlaneZ = zCenter - ctx.wingD / 2;
  const backPanelOutsideZ = locals.__wingBackPanelCenterZ - locals.__wingBackPanelThick / 2;
  const backTrimZ = Math.max(backPlaneZ, backPanelOutsideZ);
  const runs = buildCornerWingCorniceRuns(ctx, locals);
  const operations = runs.length
    ? buildSegmentedProfileOperations({
        runs,
        profileFront,
        profileSide,
        profileSideInternal,
        backTrimZ,
      })
    : buildFlatProfileOperations({
        wingW: ctx.wingW,
        connectorActive: ctx.cornerConnectorActive,
        profileFront,
        profileSide,
        frontPlaneZ,
        backTrimZ,
        yPlace: topY + CORNICE_COMMON.yLiftM,
      });
  return { kind: 'corner_cornice', owner: 'wing', mode: 'profile', operations };
}

function buildFlatProfileOperations(args: {
  wingW: number;
  connectorActive: boolean;
  profileFront: CornerCornicePoint[];
  profileSide: CornerCornicePoint[];
  frontPlaneZ: number;
  backTrimZ: number;
  yPlace: number;
}): CornerCorniceProfileOp[] {
  const overhangX = CORNICE_PROFILE.overhangXM;
  const overhangZ = CORNICE_PROFILE.overhangZM;
  const seam = CORNICE_PROFILE.miterEpsilonZM;
  const frontLen = Math.max(CORNICE_COMMON.minBoxDimensionM, args.wingW + 2 * overhangX);
  const sideEndZ = args.frontPlaneZ + overhangZ;
  const sideLen = Math.max(CORNICE_COMMON.minBoxDimensionM, sideEndZ - args.backTrimZ);
  const sideCenterZ = (args.backTrimZ + sideEndZ) / 2;
  const operations: CornerCorniceProfileOp[] = [
    {
      kind: 'corner_profile',
      length: frontLen,
      profile: args.profileFront,
      partId: 'corner_cornice_front',
      rotationY: -Math.PI / 2,
      flipX: false,
      miterStartTrim: overhangX + seam,
      miterEndTrim: overhangX + seam,
      x: args.wingW / 2,
      y: args.yPlace,
      z: args.frontPlaneZ,
    },
  ];
  if (!args.connectorActive) {
    operations.push({
      kind: 'corner_profile',
      length: sideLen,
      profile: args.profileSide,
      partId: 'corner_cornice_side_left',
      rotationY: 0,
      flipX: true,
      miterEndTrim: overhangZ + seam,
      x: 0,
      y: args.yPlace,
      z: sideCenterZ,
    });
  }
  operations.push({
    kind: 'corner_profile',
    length: sideLen,
    profile: args.profileSide,
    partId: 'corner_cornice_side_right',
    rotationY: 0,
    flipX: false,
    miterEndTrim: overhangZ + seam,
    x: args.wingW,
    y: args.yPlace,
    z: sideCenterZ,
  });
  return operations;
}

function buildSegmentedProfileOperations(args: {
  runs: CornerCorniceRun[];
  profileFront: CornerCornicePoint[];
  profileSide: CornerCornicePoint[];
  profileSideInternal: CornerCornicePoint[];
  backTrimZ: number;
}): CornerCorniceProfileOp[] {
  const operations: CornerCorniceProfileOp[] = [];
  const overhangX = CORNICE_PROFILE.overhangXM;
  const overhangZ = CORNICE_PROFILE.overhangZM;
  const minDimension = CORNICE_COMMON.minBoxDimensionM;

  for (const run of args.runs) {
    const defaultSideEndZ = run.frontPath.reduce((max, seg) => Math.max(max, seg.az, seg.bz), -Infinity);
    const sourcePath = filterCornerCornicePath(run.frontPath.map(seg => ({ ...seg })));
    const startExtension = shouldExtendCornerExteriorProfilePath(sourcePath[0])
      ? run.leftSide != null && !run.leftSide.internal
        ? overhangX
        : 0
      : 0;
    const endExtension = shouldExtendCornerExteriorProfilePath(sourcePath[sourcePath.length - 1])
      ? run.rightSide != null && !run.rightSide.internal
        ? overhangX
        : 0
      : 0;
    const renderPath = extendCornerCornicePath(sourcePath, startExtension, endExtension);
    const useOuterMiter = shouldUseCornerOuterMiterForPath(renderPath);

    for (let i = 0; i < renderPath.length; i += 1) {
      const pathSeg = renderPath[i];
      const len = cornerCornicePathSegmentLength(pathSeg);
      if (len <= minDimension) continue;
      const startJointTrim =
        i > 0
          ? useOuterMiter
            ? cornerMiterExtensionForPathJoint(renderPath[i - 1], pathSeg, overhangZ, overhangZ).bStart
            : cornerMutualPathJointMiterTrim(renderPath[i - 1], pathSeg, overhangZ)
          : 0;
      const endJointTrim =
        i < renderPath.length - 1
          ? useOuterMiter
            ? cornerMiterExtensionForPathJoint(pathSeg, renderPath[i + 1], overhangZ, overhangZ).aEnd
            : cornerMutualPathJointMiterTrim(pathSeg, renderPath[i + 1], overhangZ)
          : 0;
      const leftExteriorTrim =
        run.leftSide != null && !run.leftSide.internal
          ? useOuterMiter
            ? cornerMiterExtensionForPathJoint(
                leftCornerSideConnectionPath(pathSeg),
                pathSeg,
                overhangX,
                overhangZ,
                cornerExteriorSideNormal('left')
              ).bStart
            : leftCornerExteriorMiterTrim(pathSeg, overhangX)
          : 0;
      const rightExteriorTrim =
        run.rightSide != null && !run.rightSide.internal
          ? useOuterMiter
            ? cornerMiterExtensionForPathJoint(
                pathSeg,
                rightCornerSideConnectionPath(pathSeg),
                overhangZ,
                overhangX,
                null,
                cornerExteriorSideNormal('right')
              ).aEnd
            : rightCornerExteriorMiterTrim(pathSeg, overhangX)
          : 0;
      operations.push({
        kind: 'corner_profile',
        length: Math.max(minDimension, len),
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
        y: run.topY + CORNICE_COMMON.yLiftM,
        z: (pathSeg.az + pathSeg.bz) / 2,
      });
    }

    appendProfileSide({ operations, run, side: 'left', renderPath, defaultSideEndZ, profiles: args });
    appendProfileSide({ operations, run, side: 'right', renderPath, defaultSideEndZ, profiles: args });
  }
  return operations;
}

function appendProfileSide(args: {
  operations: CornerCorniceProfileOp[];
  run: CornerCorniceRun;
  side: 'left' | 'right';
  renderPath: CornerCorniceRun['frontPath'];
  defaultSideEndZ: number;
  profiles: {
    profileSide: CornerCornicePoint[];
    profileSideInternal: CornerCornicePoint[];
  };
}): void {
  const closure = args.side === 'left' ? args.run.leftSide : args.run.rightSide;
  if (closure == null || !args.renderPath.length) return;
  const overhangX = CORNICE_PROFILE.overhangXM;
  const overhangZ = CORNICE_PROFILE.overhangZM;
  const useOuterMiter = shouldUseCornerOuterMiterForPath(args.renderPath);
  const pathSeg = args.side === 'left' ? args.renderPath[0] : args.renderPath[args.renderPath.length - 1];
  const sideStartZ = closure.startZ;
  const sideEndZ = closure.connectorSeam
    ? args.side === 'left'
      ? pathSeg.az
      : pathSeg.bz
    : resolveCornerProfileSideEndZ({
        pathSeg,
        end: args.side === 'left' ? 'start' : 'end',
        defaultEndZ: args.defaultSideEndZ + overhangZ,
        useOuterMiter,
        profileOverhangZ: overhangZ,
      });
  const sideLen = Math.max(CORNICE_COMMON.minBoxDimensionM, Math.abs(sideEndZ - sideStartZ));
  const sideMiterTrim = closure.connectorSeam
    ? 0
    : !closure.internal
      ? clampCornerMiterTrimForSegment(
          useOuterMiter
            ? args.side === 'left'
              ? cornerMiterExtensionForPathJoint(
                  leftCornerSideConnectionPath(pathSeg),
                  pathSeg,
                  overhangX,
                  overhangZ,
                  cornerExteriorSideNormal('left')
                ).aEnd
              : cornerMiterExtensionForPathJoint(
                  pathSeg,
                  rightCornerSideConnectionPath(pathSeg),
                  overhangZ,
                  overhangX,
                  null,
                  cornerExteriorSideNormal('right')
                ).bStart
            : args.side === 'left'
              ? leftCornerExteriorMiterTrim(pathSeg, overhangZ)
              : rightCornerExteriorMiterTrim(pathSeg, overhangZ),
          sideLen
        )
      : overhangZ + CORNICE_PROFILE.miterEpsilonZM;
  args.operations.push({
    kind: 'corner_profile',
    length: sideLen,
    profile: closure.internal ? args.profiles.profileSideInternal : args.profiles.profileSide,
    partId: closure.internal
      ? 'corner_cornice_front'
      : args.side === 'left'
        ? 'corner_cornice_side_left'
        : 'corner_cornice_side_right',
    rotationY: 0,
    flipX: args.side === 'left' ? !closure.internal : closure.internal,
    ...(sideEndZ >= sideStartZ ? { miterEndTrim: sideMiterTrim } : { miterStartTrim: sideMiterTrim }),
    ...(useOuterMiter && sideMiterTrim > 0 ? { miterMode: 'outer_extend' as const } : null),
    x: args.side === 'left' ? args.run.left : args.run.right,
    y: args.run.topY + CORNICE_COMMON.yLiftM,
    z: (sideStartZ + sideEndZ) / 2,
  });
}

export function buildCornerWingWaveCornicePlan(
  ctx: CorniceCtxLike,
  locals: CorniceLocalsLike
): CornerCornicePlan {
  const topY = resolveCornerWingCorniceTopY(ctx, ctx.wingH);
  const zCenter = CARCASS_SHELL_DIMENSIONS.frontInsetZM - ctx.wingD / 2;
  const frontPlaneZ = zCenter + ctx.wingD / 2;
  const backPlaneZ = zCenter - ctx.wingD / 2;
  const backPanelOutsideZ = locals.__wingBackPanelCenterZ - locals.__wingBackPanelThick / 2;
  const backTrimZ = Math.max(backPlaneZ, backPanelOutsideZ);
  const frameT = Math.max(
    CORNICE_WAVE.frameThicknessMinM,
    Math.min(CORNICE_WAVE.frameThicknessMaxM, ctx.woodThick || CORNICE_WAVE.fallbackWoodThicknessM)
  );
  const runs = buildCornerWingCorniceRuns(ctx, locals);
  const operations = runs.length
    ? buildSegmentedWaveOperations({ runs, frameT })
    : buildFlatWaveOperations({
        ctx,
        frameT,
        topY,
        frontPlaneZ,
        backTrimZ,
      });
  return { kind: 'corner_cornice', owner: 'wing', mode: 'wave', operations };
}

function waveSamples(length: number): number {
  return Math.max(
    CORNICE_WAVE.sampleCountMin,
    Math.min(CORNICE_WAVE.sampleCountMax, Math.round(length / CORNICE_WAVE.sampleSpacingM))
  );
}

function buildFlatWaveOperations(args: {
  ctx: CorniceCtxLike;
  frameT: number;
  topY: number;
  frontPlaneZ: number;
  backTrimZ: number;
}): Array<CornerCorniceWaveOp | CornerCorniceBoxOp> {
  const leftInset = args.ctx.cornerConnectorActive ? 0 : args.frameT;
  const rightInset = args.frameT;
  const length = Math.max(CORNICE_COMMON.minSegmentLengthM, args.ctx.wingW - leftInset - rightInset);
  const waveAmp = Math.min(
    Math.max(args.ctx.wingW * CORNICE_WAVE.amplitudeRatio, CORNICE_WAVE.amplitudeMinM),
    CORNICE_WAVE.amplitudeMaxM
  );
  const operations: Array<CornerCorniceWaveOp | CornerCorniceBoxOp> = [
    {
      kind: 'corner_wave',
      partId: 'corner_cornice_front',
      length,
      depth: args.frameT,
      heightMax: CORNICE_WAVE.maxHeightM,
      waveAmp,
      waveCycles: CORNICE_WAVE.cycles,
      samples: waveSamples(length),
      x: leftInset + length / 2,
      y: args.topY + CORNICE_COMMON.yLiftM,
      z: args.frontPlaneZ - args.frameT,
      rotationY: 0,
    },
  ];
  const sideDepth = Math.max(CORNICE_COMMON.minBoxDimensionM, args.frontPlaneZ - args.backTrimZ);
  const sideZ = (args.backTrimZ + args.frontPlaneZ) / 2;
  const sideY = args.topY + CORNICE_COMMON.yLiftM + CORNICE_WAVE.maxHeightM / 2;
  if (!args.ctx.cornerConnectorActive) {
    operations.push({
      kind: 'corner_box',
      partId: 'corner_cornice_side_left',
      width: args.frameT,
      height: CORNICE_WAVE.maxHeightM,
      depth: sideDepth,
      x: args.frameT / 2,
      y: sideY,
      z: sideZ,
      rotationY: 0,
    });
  }
  operations.push({
    kind: 'corner_box',
    partId: 'corner_cornice_side_right',
    width: args.frameT,
    height: CORNICE_WAVE.maxHeightM,
    depth: sideDepth,
    x: args.ctx.wingW - args.frameT / 2,
    y: sideY,
    z: sideZ,
    rotationY: 0,
  });
  return operations;
}

function buildSegmentedWaveOperations(args: {
  runs: CornerCorniceRun[];
  frameT: number;
}): Array<CornerCorniceWaveOp | CornerCorniceBoxOp> {
  const operations: Array<CornerCorniceWaveOp | CornerCorniceBoxOp> = [];
  for (const run of args.runs) {
    const sectionW = Math.max(CORNICE_COMMON.minBoxDimensionM, run.right - run.left);
    const waveAmp = Math.min(
      Math.max(sectionW * CORNICE_WAVE.amplitudeRatio, CORNICE_WAVE.amplitudeMinM),
      CORNICE_WAVE.amplitudeMaxM
    );
    const renderPath = trimCornerCornicePath(
      run.frontPath,
      run.leftSide == null ? 0 : args.frameT,
      run.rightSide == null ? 0 : args.frameT
    );
    for (const pathSeg of renderPath) {
      const len = cornerCornicePathSegmentLength(pathSeg);
      if (len <= CORNICE_COMMON.minSegmentLengthM) continue;
      if (isStraightCornerFrontPathSegment(pathSeg)) {
        const center = inwardCornerWaveCenterForPathSegment(pathSeg, args.frameT);
        operations.push({
          kind: 'corner_wave',
          partId: 'corner_cornice_front',
          length: len,
          depth: args.frameT,
          heightMax: CORNICE_WAVE.maxHeightM,
          waveAmp,
          waveCycles: CORNICE_WAVE.cycles,
          samples: waveSamples(len),
          x: center.x,
          y: run.topY + CORNICE_COMMON.yLiftM,
          z: center.z,
          rotationY: cornerWaveRotationForPathSegment(pathSeg),
        });
      } else {
        const center = inwardCornerWaveCenterForPathSegment(pathSeg, args.frameT / 2);
        operations.push({
          kind: 'corner_box',
          partId: 'corner_cornice_front',
          width: args.frameT,
          height: CORNICE_WAVE.maxHeightM,
          depth: len,
          x: center.x,
          y: run.topY + CORNICE_COMMON.yLiftM + CORNICE_WAVE.maxHeightM / 2,
          z: center.z,
          rotationY: cornerProfileRotationForPathSegment(pathSeg),
        });
      }
    }
    appendWaveSide(operations, run, 'left', run.leftSide, args.frameT);
    appendWaveSide(operations, run, 'right', run.rightSide, args.frameT);
  }
  return operations;
}

function appendWaveSide(
  operations: Array<CornerCorniceWaveOp | CornerCorniceBoxOp>,
  run: CornerCorniceRun,
  side: 'left' | 'right',
  closure: CornerCorniceSideClosure | null,
  frameT: number
): void {
  if (closure == null || !run.frontPath.length) return;
  const frontSeg = side === 'left' ? run.frontPath[0] : run.frontPath[run.frontPath.length - 1];
  const sideEndZ = side === 'left' ? frontSeg.az : frontSeg.bz;
  const depth = Math.max(CORNICE_COMMON.minSegmentLengthM, Math.abs(sideEndZ - closure.startZ));
  operations.push({
    kind: 'corner_box',
    partId: closure.internal
      ? 'corner_cornice_front'
      : side === 'left'
        ? 'corner_cornice_side_left'
        : 'corner_cornice_side_right',
    width: frameT,
    height: CORNICE_WAVE.maxHeightM,
    depth,
    x: side === 'left' ? run.left + frameT / 2 : run.right - frameT / 2,
    y: run.topY + CORNICE_COMMON.yLiftM + CORNICE_WAVE.maxHeightM / 2,
    z: (closure.startZ + sideEndZ) / 2,
    rotationY: 0,
  });
}
