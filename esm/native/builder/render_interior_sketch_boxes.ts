import { SKETCH_BOX_SHELL_GEOMETRY_POLICY } from '../../shared/dimensions/sketch_box_geometry_policy.js';
import { SKETCH_BOX_DOOR_PREVIEW_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';
import type {
  RenderInteriorSketchBoxesArgs,
  RenderSketchBoxAbsEntry,
  ResolveSketchBoxDrawerSpan,
  ResolvedSketchBoxState,
  SketchBoxYFromNorm,
} from './render_interior_sketch_boxes_shared.js';
import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
} from './render_interior_sketch_layout.js';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

import { renderSketchBoxShell } from './render_interior_sketch_boxes_shell.js';
import { renderSketchBoxContents } from './render_interior_sketch_boxes_contents.js';
import { renderSketchBoxFronts } from './render_interior_sketch_boxes_fronts.js';
import {
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
  resolveSketchBoxSegmentForContent,
} from './render_interior_sketch_layout.js';

function asMutableRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function rotateNewFreePlacementObjects(args: {
  renderArgs: RenderInteriorSketchBoxesArgs;
  startIndex: number;
  state: ResolvedSketchBoxState;
}): void {
  const { renderArgs, startIndex, state } = args;
  const group = renderArgs.group;
  if (!state.isFreePlacement || Math.abs(state.rotationY) < 1e-8) return;
  const groupRecord = asMutableRecord(group);
  const children = Array.isArray(groupRecord?.children) ? groupRecord.children : [];
  if (!children.length || startIndex >= children.length) return;

  const pivotX = state.geometry.centerX;
  const pivotZ = state.geometry.centerZ;
  const along =
    typeof state.box.absX === 'number' && Number.isFinite(state.box.absX) ? state.box.absX : pivotZ;
  const c = Math.cos(state.rotationY);
  const sin = Math.sin(state.rotationY);
  for (let i = startIndex; i < children.length; i += 1) {
    const child = asMutableRecord(children[i]);
    if (!child) continue;
    const position = asMutableRecord(child.position);
    const x = typeof position?.x === 'number' && Number.isFinite(position.x) ? position.x : null;
    const z = typeof position?.z === 'number' && Number.isFinite(position.z) ? position.z : null;
    if (x != null && z != null) {
      const dx = x - pivotX;
      const dz = z - pivotZ;
      const nextX = pivotX + c * dx + sin * dz;
      const nextZ = pivotZ - sin * dx + c * dz;
      if (typeof position?.set === 'function') {
        Reflect.apply(position.set as (...args: unknown[]) => unknown, position, [nextX, position.y, nextZ]);
      } else if (position) {
        position.x = nextX;
        position.z = nextZ;
      }
    }

    const rotation = asMutableRecord(child.rotation);
    if (rotation && typeof rotation.y === 'number') rotation.y += state.rotationY;

    const userData = asMutableRecord(child.userData) || {};
    child.userData = {
      ...userData,
      __wpSketchFreePlacementWall: state.placementWall,
      __wpSketchFreePlacementRotationY: state.rotationY,
      __wpSketchFreePlacementPivotX: pivotX,
      __wpSketchFreePlacementPivotZ: pivotZ,
      __wpSketchFreePlacementAlong: along,
      __wpSketchFreePlacementLogicalCenterZ: state.geometry.outerD / 2,
    };
    if (typeof child.updateMatrixWorld === 'function') {
      try {
        Reflect.apply(child.updateMatrixWorld as (...args: unknown[]) => unknown, child, [true]);
      } catch (error) {
        renderArgs.renderOpsHandleCatch(
          renderArgs.App,
          'applyInteriorSketchExtras.rotateFreePlacement.updateMatrixWorld',
          error,
          { boxId: state.boxId, placementWall: state.placementWall },
          { failFast: false, throttleMs: 5000 }
        );
      }
    }
  }
}

function createSketchBoxYFromNorm(state: ResolvedSketchBoxState): SketchBoxYFromNorm {
  return (rawNorm: unknown, itemHalfH: number) => {
    const norm = typeof rawNorm === 'number' && Number.isFinite(rawNorm) ? rawNorm : null;
    if (norm == null) return null;
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
  boxHorizontalDividers: SketchBoxHorizontalDividerState[];
  woodThick: number;
}): ResolveSketchBoxDrawerSpan {
  const { shell, boxDividers, boxHorizontalDividers, woodThick } = args;
  return (item: InteriorValueRecord | null) => {
    const segment = resolveSketchBoxSegmentForContent({
      dividers: boxDividers,
      boxCenterX: shell.geometry.centerX,
      innerW: shell.geometry.innerW,
      woodThick,
      xNorm: item?.xNorm,
      horizontalDividers: boxHorizontalDividers,
      boxCenterY: shell.centerY,
      innerH: shell.sideH,
      yNorm: item?.yNormC ?? item?.yNorm,
    });
    const innerLeft = shell.geometry.centerX - shell.geometry.innerW / 2;
    const innerRight = shell.geometry.centerX + shell.geometry.innerW / 2;
    const segmentLeft = segment ? segment.leftX : innerLeft;
    const segmentRight = segment ? segment.rightX : innerRight;
    const edgeEpsilon = SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM;
    const leftExt = Math.abs(segmentLeft - innerLeft) <= edgeEpsilon ? woodThick : woodThick / 2;
    const rightExt = Math.abs(segmentRight - innerRight) <= edgeEpsilon ? woodThick : woodThick / 2;
    const outerLeft = segmentLeft - leftExt;
    const outerRight = segmentRight + rightExt;
    return {
      segment,
      innerW: segment ? segment.width : shell.geometry.innerW,
      innerCenterX: segment ? segment.centerX : shell.geometry.centerX,
      outerW: Math.max(SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterWidthM, outerRight - outerLeft),
      outerCenterX: (outerLeft + outerRight) / 2,
      faceW: Math.max(SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterWidthM, outerRight - outerLeft),
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
    const groupRecord = asMutableRecord(args.group);
    const startChildCount = Array.isArray(groupRecord?.children) ? groupRecord.children.length : 0;
    const shellResult = renderSketchBoxShell({
      box: args.boxes[boxIndex] || null,
      boxIndex,
      renderArgs: args,
      freeWardrobeBox,
    });
    if (!shellResult) continue;

    if (shellResult.absEntry) boxAbs.push(shellResult.absEntry);

    const boxDividers = readSketchBoxDividers(shellResult.state.box);
    const boxHorizontalDividers = readSketchBoxHorizontalDividers(shellResult.state.box);
    const yFromBoxNorm = createSketchBoxYFromNorm(shellResult.state);
    const resolveBoxDrawerSpan = createSketchBoxDrawerSpanResolver({
      shell: shellResult.state,
      boxDividers,
      boxHorizontalDividers,
      woodThick: args.woodThick,
    });

    renderSketchBoxContents({
      shell: shellResult.state,
      boxDividers,
      boxHorizontalDividers,
      yFromBoxNorm,
      resolveBoxDrawerSpan,
      args,
    });
    renderSketchBoxFronts({
      shell: shellResult.state,
      boxDividers,
      boxHorizontalDividers,
      yFromBoxNorm,
      resolveBoxDrawerSpan,
      args,
    });

    rotateNewFreePlacementObjects({
      renderArgs: args,
      startIndex: startChildCount,
      state: shellResult.state,
    });
  }

  return boxAbs;
}
