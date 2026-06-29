import {
  CARCASS_CORNICE_DIMENSIONS,
  CARCASS_SHELL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { CorniceCtxLike, CorniceLocalsLike } from './corner_wing_cornice_contracts.js';
import { getThreeCornice, resolveCornerWingCorniceTopY } from './corner_wing_cornice_contracts.js';
import {
  buildCornerWingCorniceRuns,
  cornerCornicePathSegmentLength,
  cornerProfileRotationForPathSegment,
  cornerWaveRotationForPathSegment,
  inwardCornerWaveCenterForPathSegment,
  isStraightCornerFrontPathSegment,
  trimCornerCornicePath,
  type CornerCorniceRun,
  type CornerCorniceSideClosure,
} from './corner_wing_cornice_path.js';

export function applyCornerWingWaveCornice(args: { ctx: CorniceCtxLike; locals: CorniceLocalsLike }): void {
  const { ctx, locals } = args;
  const {
    THREE,
    woodThick,
    wingH,
    wingD,
    wingW,
    cornerConnectorActive,
    getCornerMat,
    bodyMat,
    addOutlines,
    __sketchMode,
    wingGroup,
  } = ctx;
  const { __wingBackPanelThick, __wingBackPanelCenterZ } = locals;
  // WAVE frame (same intent as core_pure.ts wave_frame):
  // - Front: vertical strip on the roof front edge, TOP is a wave cut (peaks at ends + center).
  // - Sides: vertical strips, straight top, run from front to back (NO back strip).
  // - No top cover (open from above).
  const corniceCommon = CARCASS_CORNICE_DIMENSIONS.common;
  const corniceWave = CARCASS_CORNICE_DIMENSIONS.wave;
  const topY = resolveCornerWingCorniceTopY(ctx, wingH);
  const epsY = corniceCommon.yLiftM; // tiny lift to avoid z-fighting with the roof boards
  const yPlace = topY + epsY;

  // Wing local Z is slightly shifted in this module (front follows CARCASS_SHELL_DIMENSIONS.frontInsetZM).
  const zCenter = CARCASS_SHELL_DIMENSIONS.frontInsetZM - wingD / 2;
  const frontPlaneZ = zCenter + wingD / 2;
  const backPlaneZ = zCenter - wingD / 2;
  // The masonite back panel sits a bit IN FRONT of backPlaneZ.
  // Trim the cornice depth so it doesn't extend past the masonite from the rear view.
  const backPanelOutsideZ = __wingBackPanelCenterZ - __wingBackPanelThick / 2;
  const backTrimZ = Math.max(backPlaneZ, backPanelOutsideZ);

  // Frame thickness (meters): use panel thickness, clamped.
  const frameT = Math.max(
    corniceWave.frameThicknessMinM,
    Math.min(corniceWave.frameThicknessMaxM, woodThick || corniceWave.fallbackWoodThicknessM)
  );

  // Heights (meters)
  const maxH = corniceWave.maxHeightM; // peak height
  const waveAmp = Math.min(
    Math.max(wingW * corniceWave.amplitudeRatio, corniceWave.amplitudeMinM),
    corniceWave.amplitudeMaxM
  );
  const waveCycles = corniceWave.cycles; // peaks at ends + center

  // Material: allow both whole-cornice coloring ('corner_cornice') and per-part coloring
  // ('corner_cornice_front' / 'corner_cornice_side_left' / 'corner_cornice_side_right').
  const baseCorniceMat = getCornerMat('corner_cornice', bodyMat);
  const corniceMatFor = (pid: string) => getCornerMat(pid, baseCorniceMat);
  const threeCornice = getThreeCornice(THREE);
  const segmentedRuns = buildCornerWingCorniceRuns(ctx, locals);
  if (segmentedRuns.length) {
    applySegmentedCornerWingWaveCornice({
      runs: segmentedRuns,
      threeCornice,
      wingGroup,
      corniceMatFor,
      addOutlines,
      frameT,
      maxH,
      waveCycles,
      yPlace,
      minBoxDimension: corniceCommon.minBoxDimensionM,
      minSegmentLength: corniceCommon.minSegmentLengthM,
      sampleSpacing: corniceWave.sampleSpacingM,
      sampleCountMin: corniceWave.sampleCountMin,
      sampleCountMax: corniceWave.sampleCountMax,
      amplitudeRatio: corniceWave.amplitudeRatio,
      amplitudeMin: corniceWave.amplitudeMinM,
      amplitudeMax: corniceWave.amplitudeMaxM,
      __sketchMode,
    });
    return;
  }

  // FRONT wavy strip (extrusion ends at the front plane; thickness goes inward)
  if (threeCornice) {
    // Avoid overlap with side strips so "paint by part" can treat each piece separately.
    // When the corner connector exists, the attach-side strip is omitted.
    const hasLeftSide = !cornerConnectorActive;
    const leftInset = hasLeftSide ? frameT : 0;
    const rightInset = frameT; // right outer side always exists

    const w = Math.max(corniceCommon.minSegmentLengthM, wingW - leftInset - rightInset);
    const halfW = w / 2;

    // Sampling resolution: ~2cm, clamped.
    const samples = Math.max(
      corniceWave.sampleCountMin,
      Math.min(corniceWave.sampleCountMax, Math.round(w / corniceWave.sampleSpacingM))
    );

    const shape = new threeCornice.Shape();
    shape.moveTo(-halfW, 0);
    shape.lineTo(halfW, 0);

    // Trace the top edge back to the left with a smooth cosine wave.
    for (let i = samples; i >= 0; i--) {
      const u = i / samples; // 0..1
      const xPos = -halfW + u * w;
      const theta = 2 * Math.PI * waveCycles * u;
      const dip = (waveAmp * (1 - Math.cos(theta))) / 2; // 0 at peaks, amp at trough
      const yTop = maxH - dip;
      shape.lineTo(xPos, yTop);
    }

    shape.lineTo(-halfW, 0);

    const geo = new threeCornice.ExtrudeGeometry(shape, { depth: frameT, bevelEnabled: false, steps: 1 });
    geo.computeVertexNormals();

    const mesh = new threeCornice.Mesh(geo, corniceMatFor('corner_cornice_front'));
    const xCenter = leftInset + w / 2;
    mesh.position.set(xCenter, yPlace, frontPlaneZ - frameT);
    mesh.userData = { partId: 'corner_cornice_front' };
    if (!__sketchMode) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    addOutlines(mesh);
    wingGroup.add(mesh);
  }

  // SIDE strips (straight top), run full depth, no back strip.
  const sideH = maxH;
  const sideStartZ = backTrimZ;
  const sideEndZ = frontPlaneZ;
  const sideDepth = Math.max(corniceCommon.minBoxDimensionM, sideEndZ - sideStartZ);
  const sideZ = (sideStartZ + sideEndZ) / 2;
  const sideY = yPlace + sideH / 2;

  const addSide = (xCenter: number, pid: string) => {
    if (!threeCornice) return;
    const geo = new threeCornice.BoxGeometry(frameT, sideH, sideDepth);
    const mesh = new threeCornice.Mesh(geo, corniceMatFor(pid));
    mesh.position.set(xCenter, sideY, sideZ);
    mesh.userData = { partId: pid };
    if (!__sketchMode) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    addOutlines(mesh);
    wingGroup.add(mesh);
  };

  // Omit the "attach side" piece when the corner connector (pentagon) exists.
  if (!cornerConnectorActive) addSide(frameT / 2, 'corner_cornice_side_left');
  addSide(wingW - frameT / 2, 'corner_cornice_side_right');
}

type CornerWingWaveThree = ReturnType<typeof getThreeCornice>;

type SegmentedCornerWingWaveArgs = {
  runs: CornerCorniceRun[];
  threeCornice: CornerWingWaveThree;
  wingGroup: CorniceCtxLike['wingGroup'];
  corniceMatFor: (partId: string) => unknown;
  addOutlines: (mesh: unknown) => void;
  frameT: number;
  maxH: number;
  waveCycles: number;
  yPlace: number;
  minBoxDimension: number;
  minSegmentLength: number;
  sampleSpacing: number;
  sampleCountMin: number;
  sampleCountMax: number;
  amplitudeRatio: number;
  amplitudeMin: number;
  amplitudeMax: number;
  __sketchMode: boolean;
};

function applySegmentedCornerWingWaveCornice(args: SegmentedCornerWingWaveArgs): void {
  const threeCornice = args.threeCornice;
  if (!threeCornice) return;

  const addMesh = (mesh: {
    userData: Record<string, unknown>;
    castShadow?: boolean;
    receiveShadow?: boolean;
  }): void => {
    if (!args.__sketchMode) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    args.addOutlines(mesh);
    args.wingGroup.add(mesh);
  };

  for (const run of args.runs) {
    const sectionW = Math.max(args.minBoxDimension, run.right - run.left);
    const waveAmp = Math.min(Math.max(sectionW * args.amplitudeRatio, args.amplitudeMin), args.amplitudeMax);
    const leftInset = run.leftSide == null ? 0 : args.frameT;
    const rightInset = run.rightSide == null ? 0 : args.frameT;
    const renderPath = trimCornerCornicePath(run.frontPath, leftInset, rightInset);

    for (const pathSeg of renderPath) {
      const len = cornerCornicePathSegmentLength(pathSeg);
      if (len <= args.minSegmentLength) continue;
      if (isStraightCornerFrontPathSegment(pathSeg)) {
        const halfW = len / 2;
        const samples = Math.max(
          args.sampleCountMin,
          Math.min(args.sampleCountMax, Math.round(len / args.sampleSpacing))
        );
        const shape = new threeCornice.Shape();
        shape.moveTo(-halfW, 0);
        shape.lineTo(halfW, 0);
        for (let i = samples; i >= 0; i -= 1) {
          const u = i / samples;
          const xPos = -halfW + u * len;
          const theta = 2 * Math.PI * args.waveCycles * u;
          const dip = (waveAmp * (1 - Math.cos(theta))) / 2;
          shape.lineTo(xPos, args.maxH - dip);
        }
        shape.lineTo(-halfW, 0);

        const geo = new threeCornice.ExtrudeGeometry(shape, {
          depth: args.frameT,
          bevelEnabled: false,
          steps: 1,
        });
        geo.computeVertexNormals();
        const mesh = new threeCornice.Mesh(geo, args.corniceMatFor('corner_cornice_front'));
        const center = inwardCornerWaveCenterForPathSegment(pathSeg, args.frameT);
        mesh.rotation.y = cornerWaveRotationForPathSegment(pathSeg);
        mesh.position.set(center.x, run.topY + CARCASS_CORNICE_DIMENSIONS.common.yLiftM, center.z);
        mesh.userData = { partId: 'corner_cornice_front' };
        addMesh(mesh);
        continue;
      }

      const center = inwardCornerWaveCenterForPathSegment(pathSeg, args.frameT / 2);
      const geo = new threeCornice.BoxGeometry(args.frameT, args.maxH, len);
      const mesh = new threeCornice.Mesh(geo, args.corniceMatFor('corner_cornice_front'));
      mesh.rotation.y = cornerProfileRotationForPathSegment(pathSeg);
      mesh.position.set(
        center.x,
        run.topY + CARCASS_CORNICE_DIMENSIONS.common.yLiftM + args.maxH / 2,
        center.z
      );
      mesh.userData = { partId: 'corner_cornice_front' };
      addMesh(mesh);
    }

    addSegmentedCornerWaveSide({ args, run, side: 'left', sideClosure: run.leftSide });
    addSegmentedCornerWaveSide({ args, run, side: 'right', sideClosure: run.rightSide });
  }
}

function addSegmentedCornerWaveSide(params: {
  args: SegmentedCornerWingWaveArgs;
  run: CornerCorniceRun;
  side: 'left' | 'right';
  sideClosure: CornerCorniceSideClosure | null;
}): void {
  const { args, run, side, sideClosure } = params;
  const threeCornice = args.threeCornice;
  if (!threeCornice || sideClosure == null || !run.frontPath.length) return;

  const frontSeg = side === 'left' ? run.frontPath[0] : run.frontPath[run.frontPath.length - 1];
  const sideEndZ = side === 'left' ? frontSeg.az : frontSeg.bz;
  const sideDepth = Math.max(args.minSegmentLength, Math.abs(sideEndZ - sideClosure.startZ));
  const sideZ = (sideClosure.startZ + sideEndZ) / 2;
  const x = side === 'left' ? run.left + args.frameT / 2 : run.right - args.frameT / 2;
  const partId = sideClosure.internal
    ? 'corner_cornice_front'
    : side === 'left'
      ? 'corner_cornice_side_left'
      : 'corner_cornice_side_right';
  const geo = new threeCornice.BoxGeometry(args.frameT, args.maxH, sideDepth);
  const mesh = new threeCornice.Mesh(geo, args.corniceMatFor(partId));
  mesh.position.set(x, run.topY + CARCASS_CORNICE_DIMENSIONS.common.yLiftM + args.maxH / 2, sideZ);
  mesh.userData = { partId };
  if (!args.__sketchMode) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  args.addOutlines(mesh);
  args.wingGroup.add(mesh);
}
