import type {
  RenderInteriorSketchBoxesArgs,
  RenderSketchBoxAbsEntry,
  ResolveSketchBoxDrawerSpan,
  ResolvedSketchBoxState,
  SketchBoxYFromNorm,
} from './render_interior_sketch_boxes_shared.js';
import type { SketchBoxDividerState } from './render_interior_sketch_layout.js';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

import { renderSketchBoxShell } from './render_interior_sketch_boxes_shell.js';
import { renderSketchBoxContents } from './render_interior_sketch_boxes_contents.js';
import { renderSketchBoxFronts } from './render_interior_sketch_boxes_fronts.js';
import { readSketchBoxDividers, resolveSketchBoxSegmentForContent } from './render_interior_sketch_layout.js';

function createSketchBoxYFromNorm(state: ResolvedSketchBoxState): SketchBoxYFromNorm {
  return (rawNorm: unknown, itemHalfH: number) => {
    const norm = typeof rawNorm === 'number' ? rawNorm : Number(rawNorm);
    if (!Number.isFinite(norm)) return null;
    const y0 = state.centerY - state.halfH + Math.max(0, Math.min(1, norm)) * state.height;
    const lo = state.innerBottomY + itemHalfH;
    const hi = state.innerTopY - itemHalfH;
    if (!(hi > lo)) return state.centerY;
    return Math.max(lo, Math.min(hi, y0));
  };
}

function createSketchBoxDrawerSpanResolver(args: {
  shell: ResolvedSketchBoxState;
  boxDividers: SketchBoxDividerState[];
  woodThick: number;
}): ResolveSketchBoxDrawerSpan {
  const { shell, boxDividers, woodThick } = args;
  return (item: InteriorValueRecord | null) => {
    const segment = resolveSketchBoxSegmentForContent({
      dividers: boxDividers,
      boxCenterX: shell.geometry.centerX,
      innerW: shell.geometry.innerW,
      woodThick,
      xNorm: item?.xNorm,
    });
    const innerLeft = shell.geometry.centerX - shell.geometry.innerW / 2;
    const innerRight = shell.geometry.centerX + shell.geometry.innerW / 2;
    const segmentLeft = segment ? segment.leftX : innerLeft;
    const segmentRight = segment ? segment.rightX : innerRight;
    const leftExt = Math.abs(segmentLeft - innerLeft) <= 0.001 ? woodThick : woodThick / 2;
    const rightExt = Math.abs(segmentRight - innerRight) <= 0.001 ? woodThick : woodThick / 2;
    const outerLeft = segmentLeft - leftExt;
    const outerRight = segmentRight + rightExt;
    return {
      segment,
      innerW: segment ? segment.width : shell.geometry.innerW,
      innerCenterX: segment ? segment.centerX : shell.geometry.centerX,
      outerW: Math.max(0.05, outerRight - outerLeft),
      outerCenterX: (outerLeft + outerRight) / 2,
      faceW: Math.max(0.05, outerRight - outerLeft),
      faceCenterX: (outerLeft + outerRight) / 2,
    };
  };
}

export type {
  RenderInteriorSketchBoxesArgs,
  RenderSketchBoxAbsEntry,
  RenderSketchFreeWardrobeBox,
} from './render_interior_sketch_boxes_shared.js';

export function renderInteriorSketchBoxes(args: RenderInteriorSketchBoxesArgs): RenderSketchBoxAbsEntry[] {
  const boxAbs: RenderSketchBoxAbsEntry[] = [];
  const freeWardrobeBox = args.boxes.some(box => box.freePlacement === true)
    ? args.measureWardrobeLocalBox(args.App)
    : null;

  for (let boxIndex = 0; boxIndex < args.boxes.length; boxIndex++) {
    const shellResult = renderSketchBoxShell({
      box: args.boxes[boxIndex] || null,
      boxIndex,
      renderArgs: args,
      freeWardrobeBox,
    });
    if (!shellResult) continue;

    if (shellResult.absEntry) boxAbs.push(shellResult.absEntry);

    const boxDividers = readSketchBoxDividers(shellResult.state.box);
    const yFromBoxNorm = createSketchBoxYFromNorm(shellResult.state);
    const resolveBoxDrawerSpan = createSketchBoxDrawerSpanResolver({
      shell: shellResult.state,
      boxDividers,
      woodThick: args.woodThick,
    });

    renderSketchBoxContents({
      shell: shellResult.state,
      boxDividers,
      yFromBoxNorm,
      resolveBoxDrawerSpan,
      args,
    });
    renderSketchBoxFronts({
      shell: shellResult.state,
      boxDividers,
      yFromBoxNorm,
      resolveBoxDrawerSpan,
      args,
    });
  }

  return boxAbs;
}
