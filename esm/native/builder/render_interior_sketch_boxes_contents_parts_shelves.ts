import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { SHELF_GROUP_PART_ID, markShelfBoardUserData } from '../features/shelf_part_identity.js';
import type { RenderSketchBoxStaticContentsArgs } from './render_interior_sketch_boxes_contents_parts_types.js';
import type { SketchShelfExtra } from './render_interior_sketch_shared.js';
import { readSketchBoxRemovedSideShelfState } from '../features/removable_parts.js';
import type { RemovedFrameSideShelfRounding } from './removed_frame_side_brace_shelves.js';

import { asMesh, asRecordArray } from './render_interior_sketch_shared.js';
import {
  normalizeSketchShelfVariant,
  resolveSketchBoxSegmentForContent,
} from './render_interior_sketch_layout.js';
import { resolveSketchBoxShelfMaterial } from './render_interior_sketch_boxes_contents_parts_materials.js';
import {
  resolveSketchBoxUsableContentCenterZ,
  resolveSketchBoxUsableContentDepth,
} from './render_interior_sketch_boxes_contents_depth.js';

type RoundedShelfBoardOptions = {
  shape: 'rounded_shelf';
  roundedShelfSide: RemovedFrameSideShelfRounding;
};

function readPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function renderSketchBoxContentShelves(args: RenderSketchBoxStaticContentsArgs): void {
  const { shell, boxDividers, boxHorizontalDividers, yFromBoxNorm } = args;
  const {
    createBoard,
    woodThick,
    currentShelfMat,
    currentBraceShelfMat,
    getPartMaterial,
    getPartColorValue,
    glassMat,
    addShelfPins,
    isFn,
  } = args.args;
  const { box, boxPid, geometry, regularDepth } = shell;
  const usableContentDepth = resolveSketchBoxUsableContentDepth({
    shell,
    input: args.args.input,
    woodThick,
  });
  const usableRegularDepth = Math.min(regularDepth, usableContentDepth);
  const removedSideState = readSketchBoxRemovedSideShelfState(args.args.input.cfgSnapshot, boxPid);
  const innerLeftX = geometry.centerX - geometry.innerW / 2;
  const innerRightX = geometry.centerX + geometry.innerW / 2;
  const sideEdgeEpsilon = SKETCH_BOX_DIMENSIONS.preview.doorEdgeEpsilonM;

  const boxShelves = asRecordArray<SketchShelfExtra>(box.shelves);

  function shelfHeightForVariant(variant: ReturnType<typeof normalizeSketchShelfVariant>): number {
    if (variant === 'glass') return MATERIAL_DIMENSIONS.glassShelf.thicknessM;
    if (variant === 'double' || !variant) return Math.max(woodThick, woodThick * 2);
    return woodThick;
  }

  function resolveNextShelfBottomY(currentY: number): number {
    let topLimitY = shell.innerTopY;
    for (let j = 0; j < boxShelves.length; j++) {
      const nextShelf = boxShelves[j] || null;
      if (!nextShelf) continue;
      const nextVariant = normalizeSketchShelfVariant(nextShelf.variant);
      const nextShelfH = shelfHeightForVariant(nextVariant);
      const nextY = yFromBoxNorm(nextShelf.yNorm, nextShelfH / 2);
      if (
        nextY == null ||
        !(nextY > currentY + INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsHeightClearanceM)
      ) {
        continue;
      }
      const nextBottomY = nextY - nextShelfH / 2;
      if (nextBottomY < topLimitY) topLimitY = nextBottomY;
    }
    return topLimitY;
  }

  function resolveShelfContentsMaxHeight(shelfY: number, shelfH: number): number {
    const shelfTopY = shelfY + shelfH / 2;
    return Math.max(
      0,
      resolveNextShelfBottomY(shelfY) -
        shelfTopY -
        INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsHeightClearanceM
    );
  }

  for (let si = 0; si < boxShelves.length; si++) {
    const shelf = boxShelves[si] || null;
    if (!shelf) continue;
    const rawVariant = normalizeSketchShelfVariant(shelf.variant);
    const shelfH = shelfHeightForVariant(rawVariant);
    const shelfY = yFromBoxNorm(shelf.yNorm, shelfH / 2);
    if (shelfY == null) continue;
    const shelfSegment = resolveSketchBoxSegmentForContent({
      dividers: boxDividers,
      boxCenterX: geometry.centerX,
      innerW: geometry.innerW,
      woodThick,
      xNorm: shelf.xNorm,
      horizontalDividers: boxHorizontalDividers,
      boxCenterY: shell.centerY,
      innerH: shell.sideH,
      yNorm: shelf.yNorm,
    });
    const segmentLeftX = shelfSegment ? shelfSegment.leftX : innerLeftX;
    const segmentRightX = shelfSegment ? shelfSegment.rightX : innerRightX;
    const touchesRemovedLeftSide =
      removedSideState.leftRemoved && Math.abs(segmentLeftX - innerLeftX) <= sideEdgeEpsilon;
    const touchesRemovedRightSide =
      removedSideState.rightRemoved && Math.abs(segmentRightX - innerRightX) <= sideEdgeEpsilon;
    const forceBraceByRemovedSide = touchesRemovedLeftSide || touchesRemovedRightSide;
    const variant = rawVariant;
    const isBrace = forceBraceByRemovedSide || variant === 'brace';
    const isGlass = variant === 'glass';
    const isDouble = variant === 'double' || !variant;
    const roundedLeft = forceBraceByRemovedSide && touchesRemovedLeftSide && removedSideState.leftRounded;
    const roundedRight = forceBraceByRemovedSide && touchesRemovedRightSide && removedSideState.rightRounded;
    const roundedShelfSide: RemovedFrameSideShelfRounding | null =
      roundedLeft && roundedRight ? 'both' : roundedLeft ? 'left' : roundedRight ? 'right' : null;

    let shelfDepth = isBrace ? usableContentDepth : usableRegularDepth;
    const depthM = readPositiveNumber(shelf.depthM);
    if (depthM != null) shelfDepth = Math.min(usableContentDepth, Math.max(woodThick, depthM));
    const shelfPid = `${boxPid}_shelf_${String(shelf.id ?? si)}`;
    const shelfMat = resolveSketchBoxShelfMaterial({
      getPartMaterial,
      getPartColorValue,
      isFn,
      partId: shelfPid,
      isGlass,
      glassMat,
      currentShelfMat: isBrace ? currentBraceShelfMat || currentShelfMat : currentShelfMat,
    });
    const shelfInnerW = shelfSegment ? shelfSegment.width : geometry.innerW;
    const shelfCenterX = shelfSegment ? shelfSegment.centerX : geometry.centerX;
    const previewDims = SKETCH_BOX_DIMENSIONS.preview;
    const shelfW = Math.max(
      previewDims.shelfMinWidthM,
      shelfInnerW - (isBrace ? previewDims.shelfBraceClearanceM : previewDims.shelfRegularClearanceM)
    );
    const shelfZ = resolveSketchBoxUsableContentCenterZ(shell, shelfDepth);
    const roundedOptions: RoundedShelfBoardOptions | null =
      isBrace && roundedShelfSide ? { shape: 'rounded_shelf', roundedShelfSide } : null;
    const mesh = asMesh(
      createBoard(
        shelfW,
        shelfH,
        shelfDepth,
        shelfCenterX,
        shelfY,
        shelfZ,
        shelfMat,
        shelfPid,
        roundedOptions
      )
    );
    if (mesh && typeof mesh === 'object') {
      mesh.userData = mesh.userData || {};
      markShelfBoardUserData(mesh.userData, {
        groupPartId: SHELF_GROUP_PART_ID,
        shelfIndex: si + 1,
        variant,
        isBrace,
        roundedSide: roundedOptions?.roundedShelfSide,
      });
    }
    if (isGlass && mesh && typeof mesh === 'object') {
      mesh.userData = mesh.userData || {};
      mesh.userData.__keepMaterial = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = 2;
    }
    addShelfPins(
      shelfCenterX,
      shelfY,
      shelfZ,
      shelfW,
      shelfH,
      shelfDepth,
      !isBrace && (isDouble || isGlass || variant === 'regular')
    );

    if (args.args.input.showContentsEnabled === true && isFn(args.args.input.addFoldedClothes)) {
      const contentsWidth = shelfW - INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsWidthClearanceM;
      const maxHeight = resolveShelfContentsMaxHeight(shelfY, shelfH);
      if (contentsWidth > 0 && maxHeight > 0) {
        args.args.input.addFoldedClothes(
          shelfCenterX,
          shelfY + shelfH / 2,
          shelfZ,
          contentsWidth,
          args.args.group,
          maxHeight,
          shelfDepth,
          {
            showContentsEnabled: args.args.input.showContentsEnabled === true,
            sketchMode: args.args.input.sketchMode === true,
            addOutlines: args.args.input.addOutlines || null,
            cfgSnapshot: args.args.input.cfgSnapshot,
          }
        );
      }
    }
  }
}
