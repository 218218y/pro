import type { RenderSketchBoxStaticContentsArgs } from './render_interior_sketch_boxes_contents_parts_types.js';
import { toFiniteNumber } from './render_interior_sketch_shared.js';
import {
  pickSketchBoxVerticalSegment,
  resolveSketchBoxDividerPlacement,
  resolveSketchBoxHorizontalDividerPlacement,
  resolveSketchBoxSegmentForContent,
  resolveSketchBoxVerticalSegments,
} from './render_interior_sketch_layout.js';
import { resolveSketchBoxContentPartMaterial } from './render_interior_sketch_boxes_contents_parts_materials.js';

function resolveDividerCenterZ(args: {
  defaultCenterZ: number;
  dividerDepth: number;
  frontZ?: unknown;
}): number {
  const frontZ = toFiniteNumber(args.frontZ);
  if (frontZ == null) return args.defaultCenterZ;
  const dividerDepth = toFiniteNumber(args.dividerDepth);
  if (dividerDepth == null || !(dividerDepth > 0)) return args.defaultCenterZ;
  return frontZ - dividerDepth / 2;
}

export function renderSketchBoxContentDividers(args: RenderSketchBoxStaticContentsArgs): void {
  const { shell } = args;
  const boxDividers = Array.isArray(args.boxDividers) ? args.boxDividers : [];
  const boxHorizontalDividers = Array.isArray(args.boxHorizontalDividers) ? args.boxHorizontalDividers : [];
  const { createBoard, woodThick, getPartMaterial, isFn } = args.args;
  const { boxPid, centerY, sideH, boxMat, geometry } = shell;
  const dividerDepth = Math.max(0.0001, geometry.innerD);
  const defaultCenterZ = geometry.innerBackZ + geometry.innerD / 2;
  const verticalSegments = boxHorizontalDividers.length
    ? resolveSketchBoxVerticalSegments({
        dividers: boxHorizontalDividers,
        boxCenterY: centerY,
        innerH: sideH,
        woodThick,
        verticalDividers: boxDividers,
        boxCenterX: geometry.centerX,
        innerW: geometry.innerW,
      })
    : [];

  for (let hi = 0; hi < boxHorizontalDividers.length; hi++) {
    const divider = boxHorizontalDividers[hi];
    const column =
      divider.xNorm != null
        ? resolveSketchBoxSegmentForContent({
            dividers: boxDividers,
            horizontalDividers: boxHorizontalDividers,
            boxCenterX: geometry.centerX,
            innerW: geometry.innerW,
            boxCenterY: centerY,
            innerH: sideH,
            woodThick,
            xNorm: divider.xNorm,
            yNorm: divider.yNorm,
          })
        : null;
    const placement = resolveSketchBoxHorizontalDividerPlacement({
      boxCenterY: centerY,
      innerH: sideH,
      woodThick,
      dividerYNorm: divider.yNorm,
    });
    const dividerPid = `${boxPid}_hdivider_${String(divider.id || hi)}`;
    const dividerMat = resolveSketchBoxContentPartMaterial({
      getPartMaterial,
      isFn,
      partId: dividerPid,
      defaultMaterial: boxMat,
    });
    const dividerCenterZ = resolveDividerCenterZ({
      defaultCenterZ,
      dividerDepth,
      frontZ: shell.isFreePlacement ? divider.frontZ : undefined,
    });
    createBoard(
      Math.max(0.0001, column ? column.width : geometry.innerW),
      Math.max(0.0001, woodThick),
      dividerDepth,
      column ? column.centerX : geometry.centerX,
      placement.centerY,
      dividerCenterZ,
      dividerMat,
      dividerPid
    );
  }

  for (let di = 0; di < boxDividers.length; di++) {
    const divider = boxDividers[di];
    const placement = resolveSketchBoxDividerPlacement({
      boxCenterX: geometry.centerX,
      innerW: geometry.innerW,
      woodThick,
      dividerXNorm: divider.xNorm,
    });
    const dividerPid = `${boxPid}_divider_${String(divider.id || di)}`;
    const dividerMat = resolveSketchBoxContentPartMaterial({
      getPartMaterial,
      isFn,
      partId: dividerPid,
      defaultMaterial: boxMat,
    });
    const dividerCenterZ = resolveDividerCenterZ({
      defaultCenterZ,
      dividerDepth,
      frontZ: shell.isFreePlacement ? divider.frontZ : undefined,
    });
    const row =
      divider.yNorm != null && verticalSegments.length
        ? pickSketchBoxVerticalSegment({
            segments: resolveSketchBoxVerticalSegments({
              dividers: boxHorizontalDividers,
              boxCenterY: centerY,
              innerH: sideH,
              woodThick,
              verticalDividers: boxDividers,
              boxCenterX: geometry.centerX,
              innerW: geometry.innerW,
              xNorm: divider.xNorm,
            }),
            boxCenterY: centerY,
            innerH: sideH,
            yNorm: divider.yNorm,
          })
        : null;
    createBoard(
      Math.max(0.0001, woodThick),
      Math.max(0.0001, row ? row.height : sideH),
      dividerDepth,
      placement.centerX,
      row ? row.centerY : centerY,
      dividerCenterZ,
      dividerMat,
      dividerPid
    );
  }
}
