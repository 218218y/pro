import {
  INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY,
  resolveSketchBoxGlassShelfRearClearanceM,
} from '../../shared/dimensions/interior_fittings_policy.js';
import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import {
  SKETCH_BOX_DOOR_PREVIEW_POLICY,
  SKETCH_BOX_SHELF_PREVIEW_POLICY,
} from '../../shared/dimensions/sketch_box_preview_policy.js';
import {
  SHELF_GROUP_PART_ID,
  markShelfBoardUserData,
  readSketchBoxRemovedSideShelfState,
  resolveShelfPartMaterial,
} from '../features/part_identity/api.js';
import type { BuilderCreateBoardOptions } from '../../../types';
import type { RenderSketchBoxStaticContentsArgs } from './render_interior_sketch_boxes_contents_parts_types.js';
import type { SketchShelfExtra } from './render_interior_sketch_shared.js';
import type {
  RemovedFrameSideShelfExposure,
  RemovedFrameSideShelfRounding,
} from './removed_frame_side_construction_plan.js';

import { asMesh, asRecordArray } from './render_interior_sketch_shared.js';
import { fitFoldedContentsAroundDesk, isShelfHiddenByDesk } from './built_in_desk_contents.js';
import {
  normalizeSketchShelfVariant,
  resolveSketchBoxSegmentForContent,
} from './render_interior_sketch_layout.js';
import { isCellBelowWinterBrace, resolveWinterBlanketSupport } from './winter_brace_contents_layout.js';
import {
  resolveSketchBoxUsableContentCenterZ,
  resolveSketchBoxUsableContentDepth,
  resolveSketchBoxBraceDepth,
} from './render_interior_sketch_boxes_contents_depth.js';

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
  const { addFoldedClothes: renderFoldedClothes, showContentsEnabled } = args.args.input;
  const addFoldedClothes =
    showContentsEnabled === true && isFn(renderFoldedClothes)
      ? fitFoldedContentsAroundDesk(args.desk ?? null, renderFoldedClothes)
      : null;
  const { box, boxPid, geometry, regularDepth } = shell;
  const usableContentDepth = resolveSketchBoxUsableContentDepth({
    shell,
    input: args.args.input,
    woodThick,
  });
  const usableRegularDepth = Math.min(regularDepth, usableContentDepth);
  const braceDepth = resolveSketchBoxBraceDepth({ shell, input: args.args.input, woodThick });
  const removedSideState = readSketchBoxRemovedSideShelfState(args.args.input.cfgSnapshot, boxPid);
  const innerLeftX = geometry.centerX - geometry.innerW / 2;
  const innerRightX = geometry.centerX + geometry.innerW / 2;
  const sideEdgeEpsilon = SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM;

  const boxShelves = asRecordArray<SketchShelfExtra>(box.shelves);

  function shelfHeightForVariant(variant: ReturnType<typeof normalizeSketchShelfVariant>): number {
    if (variant === 'glass') return MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM;
    if (variant === 'double' || !variant) return Math.max(woodThick, woodThick * 2);
    return woodThick;
  }

  function resolveNextShelfBottomY(currentY: number): number {
    let topLimitY = shell.innerTopY;
    for (const { y: nextY, height } of shelfPlacements) {
      if (!(nextY > currentY + INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM)) {
        continue;
      }
      const nextBottomY = nextY - height / 2;
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
        INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM
    );
  }

  const shelfPlacements = boxShelves.flatMap((shelf, si) => {
    if (!shelf) return [];
    const variant = normalizeSketchShelfVariant(shelf.variant);
    const height = shelfHeightForVariant(variant);
    const y = yFromBoxNorm(shelf.yNorm, height / 2);
    if (y == null || isShelfHiddenByDesk(args.desk?.plan.verticalRange, y, height)) return [];
    const segment = resolveSketchBoxSegmentForContent({
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
    return [
      {
        shelf,
        si,
        y,
        height,
        variant,
        segment,
        leftX: segment?.leftX ?? innerLeftX,
        rightX: segment?.rightX ?? innerRightX,
      },
    ];
  });

  for (const {
    shelf,
    si,
    y: shelfY,
    height: shelfH,
    variant,
    segment: shelfSegment,
    leftX: segmentLeftX,
    rightX: segmentRightX,
  } of shelfPlacements) {
    const touchesRemovedLeftSide =
      removedSideState.leftRemoved && Math.abs(segmentLeftX - innerLeftX) <= sideEdgeEpsilon;
    const touchesRemovedRightSide =
      removedSideState.rightRemoved && Math.abs(segmentRightX - innerRightX) <= sideEdgeEpsilon;
    const forceBraceByRemovedSide = touchesRemovedLeftSide || touchesRemovedRightSide;
    const isBrace = forceBraceByRemovedSide || variant === 'brace' || variant === 'winter_brace';
    const isGlass = variant === 'glass';
    const isDouble = variant === 'double' || !variant;
    const shelfExposedSide: RemovedFrameSideShelfExposure | null =
      touchesRemovedLeftSide && touchesRemovedRightSide
        ? 'both'
        : touchesRemovedLeftSide
          ? 'left'
          : touchesRemovedRightSide
            ? 'right'
            : null;
    const roundedLeft = forceBraceByRemovedSide && touchesRemovedLeftSide && removedSideState.leftRounded;
    const roundedRight = forceBraceByRemovedSide && touchesRemovedRightSide && removedSideState.rightRounded;
    const roundedShelfSide: RemovedFrameSideShelfRounding | null =
      roundedLeft && roundedRight ? 'both' : roundedLeft ? 'left' : roundedRight ? 'right' : null;

    const maxShelfDepth = isBrace ? braceDepth : usableContentDepth;
    let shelfDepth = isBrace ? braceDepth : usableRegularDepth;
    const depthM = readPositiveNumber(shelf.depthM);
    if (depthM != null) shelfDepth = Math.min(maxShelfDepth, Math.max(woodThick, depthM));
    const shelfPid = `${boxPid}_shelf_${String(shelf.id ?? si)}`;
    const shelfMat =
      isGlass && glassMat
        ? glassMat
        : resolveShelfPartMaterial({
            getPartMaterial,
            getPartColorValue,
            partId: shelfPid,
            currentShelfMat: isBrace ? currentBraceShelfMat || currentShelfMat : currentShelfMat,
          });
    const shelfInnerW = shelfSegment ? shelfSegment.width : geometry.innerW;
    const shelfCenterX = shelfSegment ? shelfSegment.centerX : geometry.centerX;
    const shelfW = Math.max(
      SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM,
      shelfInnerW -
        (isBrace
          ? SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfBraceClearanceM
          : SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRegularClearanceM)
    );
    const rearClearance = isGlass ? resolveSketchBoxGlassShelfRearClearanceM(shelfDepth) : 0;
    shelfDepth -= rearClearance;
    const shelfZ = resolveSketchBoxUsableContentCenterZ(shell, shelfDepth) + rearClearance;
    const shelfOptions: BuilderCreateBoardOptions | null =
      variant === 'winter_brace'
        ? { shape: 'winter_brace_shelf', shelfExposedSide }
        : isBrace && shelfExposedSide
          ? {
              shelfExposedSide,
              ...(roundedShelfSide ? { shape: 'rounded_shelf', roundedShelfSide } : {}),
            }
          : null;
    const mesh = asMesh(
      createBoard(shelfW, shelfH, shelfDepth, shelfCenterX, shelfY, shelfZ, shelfMat, shelfPid, shelfOptions)
    );
    if (mesh && typeof mesh === 'object') {
      mesh.userData = mesh.userData || {};
      markShelfBoardUserData(mesh.userData, {
        groupPartId: SHELF_GROUP_PART_ID,
        shelfIndex: si + 1,
        variant,
        isBrace,
        exposedSide: shelfOptions?.shelfExposedSide,
        roundedSide: shelfOptions?.roundedShelfSide,
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

    const cellPlacements = shelfPlacements.filter(
      shelf => shelf.leftX < segmentRightX - 0.0001 && shelf.rightX > segmentLeftX + 0.0001
    );
    if (variant === 'winter_brace' && addFoldedClothes) {
      const support = resolveWinterBlanketSupport({
        shelves: cellPlacements,
        winterY: shelfY,
        winterHeight: shelfH,
        bottomY: shell.innerBottomY,
        clearance: INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM,
      });
      const contentsWidth = shelfW - INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM;
      if (support && contentsWidth > 0) {
        addFoldedClothes(
          shelfCenterX,
          support.shelfTopY,
          shelfZ,
          contentsWidth,
          args.args.group,
          support.maxHeight,
          shelfDepth,
          {
            showContentsEnabled: true,
            sketchMode: args.args.input.sketchMode === true,
            addOutlines: args.args.input.addOutlines || null,
            cfgSnapshot: args.args.input.cfgSnapshot,
            roomArchitecturePlan: args.args.input.roomArchitecturePlan,
            contentKind: 'winter_blankets',
          }
        );
      }
    }
    if (variant !== 'winter_brace' && !isCellBelowWinterBrace(cellPlacements, shelfY) && addFoldedClothes) {
      const contentsWidth = shelfW - INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM;
      const maxHeight = resolveShelfContentsMaxHeight(shelfY, shelfH);
      if (contentsWidth > 0 && maxHeight > 0) {
        addFoldedClothes(
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
            roomArchitecturePlan: args.args.input.roomArchitecturePlan,
          }
        );
      }
    }
  }
}
