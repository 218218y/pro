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

function isDescendantOf(node: unknown, ancestor: unknown): boolean {
  let current = node && typeof node === 'object' ? node : null;
  for (let depth = 0; current && depth < 16; depth += 1) {
    if (current === ancestor) return true;
    const record = asMutableRecord(current);
    current = record?.parent && typeof record.parent === 'object' ? record.parent : null;
  }
  return false;
}

function localizeMotionVector(value: unknown, pivotX: number, pivotZ: number): void {
  const record = asMutableRecord(value);
  if (!record) return;
  if (typeof record.x === 'number' && Number.isFinite(record.x)) record.x -= pivotX;
  if (typeof record.z === 'number' && Number.isFinite(record.z)) record.z -= pivotZ;
}

function localizeWrappedDrawerMotion(args: {
  drawersArray?: unknown[] | null;
  wrapper: unknown;
  pivotX: number;
  pivotZ: number;
}): void {
  const drawersArray = Array.isArray(args.drawersArray) ? args.drawersArray : [];
  for (const drawer of drawersArray) {
    const record = asMutableRecord(drawer);
    if (!record || !isDescendantOf(record.group, args.wrapper)) continue;
    localizeMotionVector(record.closed, args.pivotX, args.pivotZ);
    localizeMotionVector(record.open, args.pivotX, args.pivotZ);
  }
}

export function wrapNewFreePlacementObjects(args: {
  renderArgs: RenderInteriorSketchBoxesArgs;
  startIndex: number;
  state: ResolvedSketchBoxState;
}): void {
  const { renderArgs, startIndex, state } = args;
  if (!state.isFreePlacement || Math.abs(state.rotationY) < 1e-8) return;

  const group = renderArgs.group;
  const groupRecord = asMutableRecord(group);
  const children = Array.isArray(groupRecord?.children) ? groupRecord.children : [];
  if (!children.length || startIndex >= children.length) return;

  const GroupCtor = renderArgs.THREE?.Group;
  if (typeof GroupCtor !== 'function') return;

  const pivotX = state.geometry.centerX;
  const pivotZ = state.geometry.centerZ;
  const along =
    typeof state.box.absX === 'number' && Number.isFinite(state.box.absX) ? state.box.absX : pivotZ;
  const wrapper = new GroupCtor();
  const wrapperRecord = asMutableRecord(wrapper);
  if (!wrapperRecord) return;

  wrapperRecord.name = `wpSketchFreePlacementFrame_${state.boxPid}`;
  const wrapperPosition = asMutableRecord(wrapperRecord.position);
  if (typeof wrapperPosition?.set === 'function') {
    Reflect.apply(wrapperPosition.set as (...args: unknown[]) => unknown, wrapperPosition, [
      pivotX,
      0,
      pivotZ,
    ]);
  } else if (wrapperPosition) {
    wrapperPosition.x = pivotX;
    wrapperPosition.y = 0;
    wrapperPosition.z = pivotZ;
  }
  const wrapperRotation = asMutableRecord(wrapperRecord.rotation);
  if (wrapperRotation && typeof wrapperRotation.y === 'number') wrapperRotation.y = state.rotationY;
  wrapperRecord.userData = {
    ...asMutableRecord(wrapperRecord.userData),
    __wpSketchFreePlacementWall: state.placementWall,
    __wpSketchFreePlacementRotationY: state.rotationY,
    __wpSketchFreePlacementPivotX: pivotX,
    __wpSketchFreePlacementPivotZ: pivotZ,
    __wpSketchFreePlacementAlong: along,
    __wpSketchFreePlacementLogicalCenterZ: state.geometry.outerD / 2,
  };

  const newChildren = children.slice(startIndex);
  for (const candidate of newChildren) {
    const child = asMutableRecord(candidate);
    if (!child) continue;
    const position = asMutableRecord(child.position);
    const x = typeof position?.x === 'number' && Number.isFinite(position.x) ? position.x : null;
    const z = typeof position?.z === 'number' && Number.isFinite(position.z) ? position.z : null;
    if (x != null && z != null) {
      if (typeof position?.set === 'function') {
        Reflect.apply(position.set as (...args: unknown[]) => unknown, position, [
          x - pivotX,
          position.y,
          z - pivotZ,
        ]);
      } else if (position) {
        position.x = x - pivotX;
        position.z = z - pivotZ;
      }
    }
    group.remove?.(candidate);
    wrapper.add?.(candidate);
  }
  group.add?.(wrapper);

  // Drawer bodies are animated after the build from the canonical `closed` / `open`
  // vectors stored in render state. Reparenting the geometry without localizing those
  // vectors makes the next motion tick write the old wardrobe-local coordinates back
  // onto the moving drawer. Fixed runner hardware stays correctly inside the wrapper,
  // which is why the bug visibly left only the rails in the side-wall box.
  localizeWrappedDrawerMotion({
    drawersArray: renderArgs.drawersArray,
    wrapper,
    pivotX,
    pivotZ,
  });

  if (typeof wrapperRecord.updateMatrixWorld === 'function') {
    try {
      Reflect.apply(wrapperRecord.updateMatrixWorld as (...args: unknown[]) => unknown, wrapperRecord, [
        true,
      ]);
    } catch (error) {
      renderArgs.renderOpsHandleCatch(
        renderArgs.App,
        'applyInteriorSketchExtras.wrapFreePlacement.updateMatrixWorld',
        error,
        { boxId: state.boxId, placementWall: state.placementWall },
        { failFast: false, throttleMs: 5000 }
      );
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

    wrapNewFreePlacementObjects({
      renderArgs: args,
      startIndex: startChildCount,
      state: shellResult.state,
    });
  }

  return boxAbs;
}
