// Canvas picking hover flow.
//
// Extracted from canvas_picking_core.ts to keep the owner file thin while
// preserving the canonical exported hover entrypoint there.
import type { AppContainer } from '../../../types';
import { getModeId } from '../runtime/api.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { getTools } from '../runtime/service_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import {
  __wp_reportPickingIssue,
  __wp_primaryMode,
  __wp_ensurePickingRefs,
} from './canvas_picking_core_helpers.js';
import {
  asHoverRenderOps,
  asPreviewCallback,
  createPreviewOpsArgs,
  readSplitVariant,
} from './canvas_picking_hover_flow_shared.js';
import { tryHandleCanvasNonSplitHover } from './canvas_picking_hover_flow_nonsplit.js';
import { tryHandleCanvasSplitHover } from './canvas_picking_hover_flow_split.js';
import { syncCanvasPickingViewportMatrices } from './canvas_picking_viewport_matrices.js';
import { resolveCanvasPickingClickHitState } from './canvas_picking_click_hit_flow.js';
import { tryHandleViewerMeasurementHover, VIEWER_MEASUREMENT_MODE_ID } from './viewer_measurement_tool.js';

const CANVAS_HOVER_CURSOR_PRESERVE = '__wp_canvas_hover_cursor_preserve';

function ensureSplitHoverMarker(App: AppContainer) {
  try {
    const ro = getBuilderRenderOps(App);
    if (ro && typeof ro.ensureSplitHoverMarker === 'function') {
      return ro.ensureSplitHoverMarker({
        App,
        THREE: getThreeMaybe(App),
      });
    }
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking',
      op: 'hover.ensureSplitHoverMarker',
      throttleMs: 1000,
    });
  }
  return null;
}

function ensureDoorActionHoverMarker(App: AppContainer) {
  try {
    const ro = asHoverRenderOps(getBuilderRenderOps(App));
    if (typeof ro?.ensureDoorActionHoverMarker === 'function') {
      return ro.ensureDoorActionHoverMarker(createPreviewOpsArgs(App));
    }
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking',
      op: 'hover.ensureDoorActionHoverMarker',
      throttleMs: 1000,
    });
  }
  return null;
}

function ensureDoorCutHoverMarker(App: AppContainer) {
  try {
    const ro = asHoverRenderOps(getBuilderRenderOps(App));
    if (typeof ro?.ensureDoorCutHoverMarker === 'function') {
      return ro.ensureDoorCutHoverMarker(createPreviewOpsArgs(App));
    }
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking',
      op: 'hover.ensureDoorCutHoverMarker',
      throttleMs: 1000,
    });
  }
  return null;
}

function readPaintSelection(App: AppContainer, primaryMode: string): string | null {
  if (primaryMode !== (getModeId('PAINT') || 'paint')) return null;
  try {
    const tools = getTools(App);
    const paint = typeof tools.getPaintColor === 'function' ? tools.getPaintColor() : null;
    return typeof paint === 'string' && paint ? paint : null;
  } catch {
    return null;
  }
}

export function handleCanvasHoverNDCImpl(App: AppContainer, ndcX: number, ndcY: number): boolean {
  const { raycaster: __wpRaycaster, mouse: __wpMouse } = __wp_ensurePickingRefs(App);
  if (!__wpRaycaster || !__wpMouse) return false;
  syncCanvasPickingViewportMatrices(App);
  try {
    const __pm = __wp_primaryMode(App);
    const __isSplitEditMode = __pm === (getModeId('SPLIT') || 'split');
    const __isGrooveEditMode = __pm === (getModeId('GROOVE') || 'groove');
    const __isRemoveDoorMode = __pm === (getModeId('REMOVE_DOOR') || 'remove_door');
    const __isDoorTrimMode = __pm === (getModeId('DOOR_TRIM') || 'door_trim');
    const __isHandleEditMode = __pm === (getModeId('HANDLE') || 'handle');
    const __isHingeEditMode = __pm === (getModeId('HINGE') || 'hinge');
    const __isExtDrawerEditMode = __pm === (getModeId('EXT_DRAWER') || 'ext_drawer');
    const __isDividerEditMode = __pm === (getModeId('DIVIDER') || 'divider');
    const __isCellDimsMode = __pm === (getModeId('CELL_DIMS') || 'cell_dims');
    const __isMeasureMode = __pm === (getModeId('MEASURE') || VIEWER_MEASUREMENT_MODE_ID);
    const __splitVariant = readSplitVariant(App);
    const __paintSelection = readPaintSelection(App, __pm);
    const __isMirrorPaintMode = __paintSelection === 'mirror';

    if (__isMeasureMode) {
      const hitState = resolveCanvasPickingClickHitState({
        App,
        ndcX,
        ndcY,
        isRemoveDoorMode: false,
        raycaster: __wpRaycaster,
        mouse: __wpMouse,
      });
      tryHandleViewerMeasurementHover({ App, hitState });
      return CANVAS_HOVER_CURSOR_PRESERVE as unknown as boolean;
    }

    const marker = ensureSplitHoverMarker(App);
    const doorMarker = ensureDoorActionHoverMarker(App);
    const cutMarker = ensureDoorCutHoverMarker(App);

    const __previewRo = asHoverRenderOps(getBuilderRenderOps(App));
    const __hideSketchPreview = asPreviewCallback(__previewRo?.hideSketchPlacementPreview);
    const __setSketchPreview = asPreviewCallback(__previewRo?.setSketchPlacementPreview);
    const __setLayoutPreview = asPreviewCallback(__previewRo?.setInteriorLayoutHoverPreview);
    const __hideLayoutPreview = asPreviewCallback(__previewRo?.hideInteriorLayoutHoverPreview);

    try {
      const hide0 = asHoverRenderOps(getBuilderRenderOps(App))?.hideSketchPlacementPreview;
      if (__isSplitEditMode && hide0) {
        hide0(createPreviewOpsArgs(App, { __reason: 'split.hideSketchPlacementPreview' }));
      }
      if (__isSplitEditMode && __hideLayoutPreview) __hideLayoutPreview(createPreviewOpsArgs(App));
    } catch {
      // ignore
    }

    if (!__isSplitEditMode) {
      if (marker) marker.visible = false;
      return tryHandleCanvasNonSplitHover({
        App,
        ndcX,
        ndcY,
        primaryMode: __pm,
        paintSelection: __paintSelection,
        isGrooveEditMode: __isGrooveEditMode,
        isRemoveDoorMode: __isRemoveDoorMode,
        isHandleEditMode: __isHandleEditMode,
        isHingeEditMode: __isHingeEditMode,
        isMirrorPaintMode: __isMirrorPaintMode,
        isDoorTrimMode: __isDoorTrimMode,
        isExtDrawerEditMode: __isExtDrawerEditMode,
        isDividerEditMode: __isDividerEditMode,
        isCellDimsMode: __isCellDimsMode,
        raycaster: __wpRaycaster,
        mouse: __wpMouse,
        doorMarker: doorMarker || null,
        cutMarker: cutMarker || null,
        previewRo: __previewRo || null,
        hideLayoutPreview: __hideLayoutPreview,
        hideSketchPreview: __hideSketchPreview,
        setSketchPreview: __setSketchPreview,
        setLayoutPreview: __setLayoutPreview,
      });
    }

    return tryHandleCanvasSplitHover({
      App,
      ndcX,
      ndcY,
      raycaster: __wpRaycaster,
      mouse: __wpMouse,
      marker: marker || null,
      cutMarker: cutMarker || null,
      setSketchPreview: __setSketchPreview,
      splitVariant: __splitVariant,
    });
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking', op: 'hover', throttleMs: 750 });
  }
  return false;
}
