import type { AppContainer, CameraLike, ControlsLike, Object3DLike, RendererLike } from '../../../../types';
import type {
  ExportCanvasWorkflowDeps,
  ExportFrontNotesTransformCapture,
} from './export_canvas_workflow_contracts.js';
import {
  attachNotesSourceRectMaybe,
  readCanvasImageSourceRect,
} from './export_canvas_workflow_notes_rect.js';

export function captureFrontNotesTransform(
  App: AppContainer,
  deps: Pick<
    ExportCanvasWorkflowDeps,
    | 'get$'
    | '_snapCameraToFrontPreset'
    | '_guard'
    | '_renderSceneForExport'
    | '_cloneRefTargetLike'
    | '_computeNotesRefZ'
    | '_planePointFromRefTarget'
    | '_captureExportRefPoints'
    | '_captureCameraPvInfo'
    | '_getRendererCanvasSource'
    | 'autoZoomCamera'
    | 'scaleViewportCameraDistance'
    | '_buildNotesExportTransform'
  >,
  input: {
    camera: CameraLike;
    controls: ControlsLike;
    renderer: RendererLike;
    scene: Object3DLike;
    width: number;
    height: number;
  }
): ExportFrontNotesTransformCapture {
  const $ = deps.get$(App);
  const container = $('viewer-container');
  const containerRect = container ? container.getBoundingClientRect() : null;
  const rendererSourceRect = readCanvasImageSourceRect(deps._getRendererCanvasSource(input.renderer));
  const captureRect = rendererSourceRect || containerRect;

  // The notes are authored in the currently visible viewport, so the pre-export
  // side of the transform must be captured before any export-only camera move.
  deps._guard(App, 'export.prerenderCurrentForNotes', () => {
    deps._renderSceneForExport(App, input.renderer, input.scene, input.camera);
  });

  const refTarget = deps._cloneRefTargetLike(input.controls.target);
  const planeZ = deps._computeNotesRefZ(App, input.camera, refTarget);
  const planePoint = deps._planePointFromRefTarget(refTarget, planeZ);
  const planeNormal = { x: 0, y: 0, z: 1 };

  const preRef = captureRect
    ? deps._captureExportRefPoints(App, captureRect, input.width, input.height, refTarget)
    : null;
  const prePv = deps._captureCameraPvInfo(App, input.camera);

  deps._snapCameraToFrontPreset(App);
  deps._guard(App, 'export.prerenderFrontForNotes', () => {
    deps._renderSceneForExport(App, input.renderer, input.scene, input.camera);
  });
  deps.autoZoomCamera(App);
  deps.scaleViewportCameraDistance(App, 1.05);

  const postPv = deps._captureCameraPvInfo(App, input.camera);
  const postRef = captureRect
    ? deps._captureExportRefPoints(App, captureRect, input.width, input.height, refTarget)
    : null;

  const notesTransform =
    deps._buildNotesExportTransform({
      preRef,
      postRef,
      prePvInv: prePv.pvInv,
      postPv: postPv.pv,
      preCamPos: prePv.camPos,
      planePoint,
      planeNormal,
    }) || null;

  return {
    preRef,
    postRef,
    notesTransform: attachNotesSourceRectMaybe(notesTransform, rendererSourceRect),
  };
}
