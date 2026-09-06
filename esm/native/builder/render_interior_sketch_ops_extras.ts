import { applySketchExternalDrawers, applySketchInternalDrawers } from './render_interior_sketch_drawers.js';
import { createSketchBoxLocator } from './render_interior_sketch_support.js';
import {
  resolveSketchBoxDividerPlacement,
  resolveSketchBoxHorizontalDividerPlacement,
  resolveSketchBoxHorizontalDividerScopeSegment,
  resolveSketchBoxVerticalDividerScopeSegment,
} from './render_interior_sketch_layout.js';
import {
  applySketchRods,
  applySketchShelves,
  applySketchStorageBarriers,
} from './render_interior_sketch_support.js';
import { resolveSketchPartitionShelfWidths } from './render_interior_sketch_support_shelves.js';

import { resolveInteriorSketchContentCells } from './render_interior_sketch_partition_content.js';
import { toFiniteNumber } from './render_interior_sketch_shared.js';
import type { SketchPartitionCell } from './render_interior_sketch_layout_dividers.js';

import type { RenderSketchBoxAbsEntry } from './render_interior_sketch_boxes.js';
import type {
  InteriorSketchExtrasInput,
  InteriorSketchPlacementPlan,
  InteriorSketchResolvedThree,
  RenderInteriorSketchOpsContext,
} from './render_interior_sketch_ops_types.js';

function resolveInteriorSketchModuleDividerMaterial(
  resolved: InteriorSketchExtrasInput,
  owner: RenderInteriorSketchOpsContext,
  partId: string
): unknown {
  if (resolved.getPartMaterial !== undefined && owner.isFn(resolved.getPartMaterial)) {
    const material = resolved.getPartMaterial(partId);
    if (material != null) return material;
  }
  return resolved.bodyMat;
}

export function applyInteriorSketchOwnedDividers(
  resolved: InteriorSketchExtrasInput,
  owner: RenderInteriorSketchOpsContext
): void {
  const verticalDividers = resolved.dividers;
  const horizontalDividers = resolved.horizontalDividers;
  if (!verticalDividers.length && !horizontalDividers.length) return;

  const centerY = (resolved.effectiveBottomY + resolved.effectiveTopY) / 2;
  const dividerDepth = Math.max(0.0001, resolved.internalDepth);
  const centerZ = resolved.internalZ;
  const hostPartPrefix = resolved.moduleKeyStr
    ? `sketch_module_${resolved.moduleKeyStr}`
    : `sketch_module_${resolved.moduleIndex}`;

  for (const [index, divider] of horizontalDividers.entries()) {
    const column =
      divider.xNorm != null
        ? resolveSketchBoxHorizontalDividerScopeSegment({
            divider,
            horizontalDividers,
            verticalDividers,
            boxCenterX: resolved.internalCenterX,
            innerW: resolved.innerW,
            boxCenterY: centerY,
            innerH: resolved.spanH,
            woodThick: resolved.woodThick,
          })
        : null;
    const placement = resolveSketchBoxHorizontalDividerPlacement({
      boxCenterY: centerY,
      innerH: resolved.spanH,
      woodThick: resolved.woodThick,
      dividerYNorm: divider.yNorm,
    });
    const partId = `${hostPartPrefix}_hdivider_${divider.id || index}`;
    resolved.createBoard(
      Math.max(0.0001, column ? column.width : resolved.innerW),
      Math.max(0.0001, resolved.woodThick),
      dividerDepth,
      column ? column.centerX : resolved.internalCenterX,
      placement.centerY,
      centerZ,
      resolveInteriorSketchModuleDividerMaterial(resolved, owner, partId),
      partId
    );
  }

  for (const [index, divider] of verticalDividers.entries()) {
    const placement = resolveSketchBoxDividerPlacement({
      boxCenterX: resolved.internalCenterX,
      innerW: resolved.innerW,
      woodThick: resolved.woodThick,
      dividerXNorm: divider.xNorm,
    });
    const row =
      divider.yNorm != null && horizontalDividers.length
        ? resolveSketchBoxVerticalDividerScopeSegment({
            divider,
            verticalDividers,
            horizontalDividers,
            boxCenterX: resolved.internalCenterX,
            innerW: resolved.innerW,
            boxCenterY: centerY,
            innerH: resolved.spanH,
            woodThick: resolved.woodThick,
          })
        : null;
    const partId = `${hostPartPrefix}_divider_${divider.id || index}`;
    resolved.createBoard(
      Math.max(0.0001, resolved.woodThick),
      Math.max(0.0001, row ? row.height : resolved.spanH),
      dividerDepth,
      placement.centerX,
      row ? row.centerY : centerY,
      centerZ,
      resolveInteriorSketchModuleDividerMaterial(resolved, owner, partId),
      partId
    );
  }
}

function toCellLocalNorm(
  value: unknown,
  resolved: InteriorSketchExtrasInput,
  cell: SketchPartitionCell
): number | null {
  const norm = toFiniteNumber(value);
  if (norm == null || !(cell.height > 0) || !(resolved.spanH > 0)) return null;
  const absoluteY = resolved.effectiveBottomY + Math.max(0, Math.min(1, norm)) * resolved.spanH;
  return Math.max(0, Math.min(1, (absoluteY - cell.bottomY) / cell.height));
}

function localizeVerticalItem<T extends Record<string, unknown>>(
  item: T,
  resolved: InteriorSketchExtrasInput,
  cell: SketchPartitionCell
): T {
  const out = { ...item } as Record<string, unknown>;
  const yNorm = toCellLocalNorm(item.yNorm, resolved, cell);
  const yNormC = toCellLocalNorm(item.yNormC, resolved, cell);
  if (yNorm != null) out.yNorm = yNorm;
  if (yNormC != null) out.yNormC = yNormC;
  return out as T;
}

function resolveCellDoorFaceSpan(
  resolved: InteriorSketchExtrasInput,
  cell: SketchPartitionCell
): InteriorSketchExtrasInput['moduleDoorFaceSpan'] {
  const full = resolved.moduleDoorFaceSpan;
  if (!full || !(full.spanW > 0)) return { spanW: cell.width, centerX: cell.centerX };
  const left = full.centerX - full.spanW / 2 + cell.normLeft * full.spanW;
  const right = full.centerX - full.spanW / 2 + cell.normRight * full.spanW;
  return right > left ? { spanW: right - left, centerX: (left + right) / 2 } : null;
}

export function applyInteriorSketchOwnedStorageBarriers(
  resolved: InteriorSketchExtrasInput,
  owner: RenderInteriorSketchOpsContext
): void {
  for (const barrier of resolved.storageBarriers) {
    if (!barrier) continue;
    for (const cell of resolveInteriorSketchContentCells(resolved, barrier)) {
      const localized = localizeVerticalItem(barrier, resolved, cell);
      applySketchStorageBarriers({
        storageBarriers: [localized],
        effectiveBottomY: cell.bottomY,
        effectiveTopY: cell.topY,
        spanH: cell.height,
        woodThick: resolved.woodThick,
        innerW: cell.width,
        internalCenterX: cell.centerX,
        internalDepth: resolved.internalDepth,
        internalZ: resolved.internalZ,
        moduleKeyStr: resolved.moduleKeyStr,
        bodyMat: resolved.bodyMat,
        ...(resolved.getPartMaterial !== undefined ? { getPartMaterial: resolved.getPartMaterial } : {}),
        isFn: owner.isFn,
        createBoard: resolved.createBoard,
      });
    }
  }
}

export function applyInteriorSketchOwnedShelves(args: {
  resolved: InteriorSketchExtrasInput;
  resolvedThree: InteriorSketchResolvedThree;
  placementPlan: InteriorSketchPlacementPlan;
  boxAbs: RenderSketchBoxAbsEntry[];
}): void {
  const { resolved, resolvedThree, placementPlan, boxAbs } = args;
  const placementSupport = placementPlan.placementSupport;
  const findBoxAtY = createSketchBoxLocator(boxAbs);
  const cellGroups = new Map<string, { cell: SketchPartitionCell; shelves: typeof resolved.shelves }>();

  for (const shelf of resolved.shelves) {
    if (!shelf) continue;
    for (const cell of resolveInteriorSketchContentCells(resolved, shelf)) {
      const key = `${cell.normLeft}:${cell.normRight}:${cell.normBottom}:${cell.normTop}`;
      const group = cellGroups.get(key) ?? { cell, shelves: [] };
      group.shelves.push(shelf);
      cellGroups.set(key, group);
    }
  }

  for (const { cell, shelves } of cellGroups.values()) {
    const { braceShelfWidth, regularShelfWidth } = resolveSketchPartitionShelfWidths(cell.width);
    applySketchShelves({
      shelves,
      yFromNorm: placementSupport.yFromNorm,
      findBoxAtY(y) {
        const box = findBoxAtY(y);
        if (!box) return null;
        const boxLeft = box.centerX - box.innerW / 2;
        const boxRight = box.centerX + box.innerW / 2;
        return boxRight > cell.leftX && boxLeft < cell.rightX ? box : null;
      },
      braceCenterX: cell.centerX,
      braceShelfWidth,
      regularShelfWidth,
      internalCenterX: cell.centerX,
      internalDepth: resolved.internalDepth,
      internalZ: resolved.internalZ,
      regularDepth: resolved.regularDepth,
      backZ: resolved.backZ,
      forceBraceShelves: resolved.forceBraceShelves,
      shelfExposedSide: resolved.shelfExposedSide,
      roundedShelfSide: resolved.roundedShelfSide,
      woodThick: resolved.woodThick,
      shelfThick: resolved.shelfThick,
      effectiveTopY: cell.topY,
      showContentsEnabled: resolved.input.showContentsEnabled === true,
      ...(resolved.input.addFoldedClothes !== undefined
        ? { addFoldedClothes: resolved.input.addFoldedClothes }
        : {}),
      contentsPolicy: {
        showContentsEnabled: resolved.input.showContentsEnabled === true,
        sketchMode: resolved.input.sketchMode === true,
        addOutlines: resolved.input.addOutlines || null,
        cfgSnapshot: resolved.input.cfgSnapshot,
      },
      currentShelfMat: resolved.currentShelfMat,
      currentBraceShelfMat: resolved.currentBraceShelfMat,
      moduleKeyStr: resolved.moduleKeyStr,
      ...(resolved.getPartMaterial !== undefined ? { getPartMaterial: resolved.getPartMaterial } : {}),
      ...(resolved.getPartColorValue !== undefined ? { getPartColorValue: resolved.getPartColorValue } : {}),
      glassMat: placementSupport.glassMat,
      createBoard: resolved.createBoard,
      group: resolved.group,
      THREE: resolvedThree.THREE,
      addBraceDarkSeams: placementSupport.addBraceDarkSeams,
      addShelfPins: placementSupport.addShelfPins,
    });
  }
}

export function applyInteriorSketchOwnedRods(args: {
  owner: RenderInteriorSketchOpsContext;
  resolved: InteriorSketchExtrasInput;
  resolvedThree: InteriorSketchResolvedThree;
  placementPlan: InteriorSketchPlacementPlan;
}): void {
  const { owner, resolved, resolvedThree, placementPlan } = args;

  for (const rod of resolved.rods) {
    if (!rod) continue;
    for (const cell of resolveInteriorSketchContentCells(resolved, rod)) {
      const y = placementPlan.placementSupport.yFromNorm(rod.yNorm);
      if (y == null) continue;
      if (resolved.input.createRod !== undefined && owner.isFn(resolved.input.createRod)) {
        try {
          resolved.input.createRod(y, true, true, null, {
            innerW: cell.width,
            internalCenterX: cell.centerX,
            effectiveBottomY: cell.bottomY,
            effectiveTopY: cell.topY,
          });
          continue;
        } catch (error) {
          owner.renderOpsHandleCatch(
            resolved.App,
            'applyInteriorSketchExtras.rods.installedOwnerRejected',
            error,
            undefined,
            { failFast: false, throttleMs: 5000 }
          );
        }
      }
      applySketchRods({
        rods: [rod],
        yFromNorm: placementPlan.placementSupport.yFromNorm,
        isFn: owner.isFn,
        THREE: resolvedThree.THREE,
        App: resolved.App,
        assertTHREE: owner.assertTHREE,
        asObject: owner.asObject,
        innerW: cell.width,
        internalCenterX: cell.centerX,
        internalZ: resolved.internalZ,
        group: resolved.group,
        reportSoft(op, error) {
          owner.renderOpsHandleCatch(resolved.App, op, error, undefined, {
            failFast: false,
            throttleMs: 5000,
          });
        },
      });
    }
  }
}

export function applyInteriorSketchOwnedDrawers(args: {
  owner: RenderInteriorSketchOpsContext;
  resolved: InteriorSketchExtrasInput;
  resolvedThree: InteriorSketchResolvedThree;
}): void {
  const { owner, resolved, resolvedThree } = args;

  for (const extDrawer of resolved.extDrawers) {
    if (!extDrawer) continue;
    for (const cell of resolveInteriorSketchContentCells(resolved, extDrawer)) {
      const localized = localizeVerticalItem(extDrawer, resolved, cell);
      applySketchExternalDrawers({
        App: resolved.App,
        input: resolved.input,
        drawers: [],
        extDrawers: [localized],
        THREE: resolvedThree.THREE,
        group: resolved.group,
        effectiveBottomY: cell.bottomY,
        effectiveTopY: cell.topY,
        spanH: cell.height,
        innerW: cell.width,
        moduleDepth: resolved.moduleDepth,
        internalDepth: resolved.internalDepth,
        internalCenterX: cell.centerX,
        internalZ: resolved.internalZ,
        moduleIndex: resolved.moduleIndex,
        moduleKeyStr: resolved.moduleKeyStr,
        woodThick: resolved.woodThick,
        shelfThick: resolved.shelfThick,
        bodyMat: resolved.bodyMat,
        currentBraceShelfMat: resolved.currentBraceShelfMat,
        createBoard: resolved.createBoard,
        ...(resolved.getPartMaterial !== undefined ? { getPartMaterial: resolved.getPartMaterial } : {}),
        ...(resolved.getPartColorValue !== undefined
          ? { getPartColorValue: resolved.getPartColorValue }
          : {}),
        moduleDoorFaceSpan: resolveCellDoorFaceSpan(resolved, cell),
        isFn: owner.isFn,
        renderOpsHandleCatch: owner.renderOpsHandleCatch,
      });
    }
  }

  for (const drawer of resolved.drawers) {
    if (!drawer) continue;
    for (const cell of resolveInteriorSketchContentCells(resolved, drawer)) {
      const localized = localizeVerticalItem(drawer, resolved, cell);
      const scopedExternal = resolved.extDrawers
        .filter(item =>
          resolveInteriorSketchContentCells(resolved, item).some(
            candidate =>
              candidate.normLeft === cell.normLeft &&
              candidate.normRight === cell.normRight &&
              candidate.normBottom === cell.normBottom &&
              candidate.normTop === cell.normTop
          )
        )
        .map(item => localizeVerticalItem(item, resolved, cell));
      applySketchInternalDrawers({
        App: resolved.App,
        input: resolved.input,
        drawers: [localized],
        extDrawers: scopedExternal,
        THREE: resolvedThree.THREE,
        group: resolved.group,
        effectiveBottomY: cell.bottomY,
        effectiveTopY: cell.topY,
        spanH: cell.height,
        woodThick: resolved.woodThick,
        innerW: cell.width,
        internalDepth: resolved.internalDepth,
        internalCenterX: cell.centerX,
        internalZ: resolved.internalZ,
        moduleIndex: resolved.moduleIndex,
        moduleKeyStr: resolved.moduleKeyStr,
        bodyMat: resolved.bodyMat,
        currentShelfMat: resolved.currentShelfMat,
        createBoard: resolved.createBoard,
        ...(resolved.getPartMaterial !== undefined ? { getPartMaterial: resolved.getPartMaterial } : {}),
        ...(resolved.getPartColorValue !== undefined
          ? { getPartColorValue: resolved.getPartColorValue }
          : {}),
        applyInternalDrawersOps: owner.applyInternalDrawersOps,
        renderOpsHandleCatch: owner.renderOpsHandleCatch,
      });
    }
  }
}
