import type { AppContainer, CameraLike, ControlsLike, Object3DLike, RendererLike } from '../../../../types';
import type {
  ExportCanvasWorkflowDeps,
  ExportFrontNotesTransformCapture,
} from './export_canvas_workflow_contracts.js';

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

  deps._snapCameraToFrontPreset(App);
  deps._guard(App, 'export.prerenderFront', () => {
    deps._renderSceneForExport(App, input.renderer, input.scene, input.camera);
  });

  const refTarget = deps._cloneRefTargetLike(input.controls.target);
  const planeZ = deps._computeNotesRefZ(App, input.camera, refTarget);
  const planePoint = deps._planePointFromRefTarget(refTarget, planeZ);
  const planeNormal = { x: 0, y: 0, z: 1 };

  const preRef = containerRect
    ? deps._captureExportRefPoints(App, containerRect, input.width, input.height, refTarget)
    : null;
  const prePv = deps._captureCameraPvInfo(App, input.camera);

  deps.autoZoomCamera(App);
  deps.scaleViewportCameraDistance(App, 1.05);

  const postPv = deps._captureCameraPvInfo(App, input.camera);
  const postRef = containerRect
    ? deps._captureExportRefPoints(App, containerRect, input.width, input.height, refTarget)
    : null;

  return {
    preRef,
    postRef,
    notesTransform:
      deps._buildNotesExportTransform({
        preRef,
        postRef,
        prePvInv: prePv.pvInv,
        postPv: postPv.pv,
        preCamPos: prePv.camPos,
        planePoint,
        planeNormal,
      }) || null,
  };
}
