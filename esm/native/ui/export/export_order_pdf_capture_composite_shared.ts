import type { AppContainer } from '../../../../types/app.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import { readRendererDomSource } from './export_order_pdf_shared.js';

export type OrderPdfCompositeBase = {
  renderer: unknown;
  scene: unknown;
  camera: { position: { clone: () => { x: number; y: number; z: number } } };
  controls: { target: { clone: () => { x: number; y: number; z: number } } };
  rendererSurface: { domElement: unknown };
  originalWidth: number;
  originalHeight: number;
  originalCamPos: { x: number; y: number; z: number };
  originalTarget: { x: number; y: number; z: number };
  notesEnabled: boolean;
  titleHeight: number;
  gap: number;
  containerRect: DOMRect | null;
};

export function readOrderPdfCompositeBase(
  App: AppContainer,
  deps: ExportOrderPdfDeps
): OrderPdfCompositeBase {
  App = deps._requireApp(App);
  if (!deps.hasDom(App)) throw new Error('no dom');

  const cc = deps.getCameraControlsOrNull(App);
  if (!cc) throw new Error('no camera/controls');
  const { camera, controls } = cc;

  const rc = deps._getRenderCore(App);
  if (!rc) throw new Error('no render core');
  const { renderer, scene } = rc;
  const rendererSurface = readRendererDomSource(renderer);
  if (!rendererSurface) throw new Error('no renderer surface');

  const { width: originalWidth, height: originalHeight } = deps._getRendererSize(rendererSurface);
  const $ = deps.get$(App);
  const container = $('viewer-container');

  return {
    renderer,
    scene,
    camera,
    controls,
    rendererSurface,
    originalWidth,
    originalHeight,
    originalCamPos: camera.position.clone(),
    originalTarget: controls.target.clone(),
    notesEnabled: deps._isNotesEnabled(App),
    titleHeight: 120,
    gap: 20,
    containerRect: container ? container.getBoundingClientRect() : null,
  };
}

export function buildOrderPdfNotesTransform(
  App: AppContainer,
  deps: ExportOrderPdfDeps,
  base: OrderPdfCompositeBase
) {
  deps._snapCameraToFrontPreset(App);
  try {
    deps._renderSceneForExport(App, base.renderer, base.scene, base.camera);
  } catch (e) {
    deps._exportReportThrottled(App, 'captureComposite.baselineRender', e, { throttleMs: 1000 });
  }

  const refTarget = deps._cloneRefTargetLike(base.controls.target);
  const planeZ = deps._computeNotesRefZ(App, base.camera, refTarget);
  const planePoint = deps._planePointFromRefTarget(refTarget, planeZ);
  const planeNormal = { x: 0, y: 0, z: 1 };

  const preRef = base.containerRect
    ? deps._captureExportRefPoints(
        App,
        base.containerRect,
        base.originalWidth,
        base.originalHeight,
        refTarget
      )
    : null;
  const prePv = deps._captureCameraPvInfo(App, base.camera);

  deps.autoZoomCamera(App);
  deps.scaleViewportCameraDistance(App, 1.05);

  const postPv = deps._captureCameraPvInfo(App, base.camera);
  const postRef = base.containerRect
    ? deps._captureExportRefPoints(
        App,
        base.containerRect,
        base.originalWidth,
        base.originalHeight,
        refTarget
      )
    : null;

  return (
    deps._buildNotesExportTransform({
      preRef,
      postRef,
      prePvInv: prePv.pvInv,
      postPv: postPv.pv,
      preCamPos: prePv.camPos,
      planePoint,
      planeNormal,
    }) || null
  );
}

export function createOrderPdfCompositeCanvas(
  App: AppContainer,
  deps: ExportOrderPdfDeps,
  base: OrderPdfCompositeBase,
  includeLogo: boolean
): HTMLCanvasElement {
  const compositeCanvas = deps._createDomCanvas(
    App,
    base.originalWidth,
    base.originalHeight * 2 + base.gap + base.titleHeight
  );
  const ctx = compositeCanvas.getContext('2d');
  if (!ctx) throw new Error('[WardrobePro][ESM] 2d canvas context unavailable');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);

  const logoImg = deps.getExportLogoImage(App, includeLogo);
  if (logoImg) deps.drawExportLogo(App, ctx, compositeCanvas.width, logoImg, 'export.dualImage');

  const pName = deps._getProjectName(App);
  if (pName) {
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pName, compositeCanvas.width / 2, base.titleHeight / 2);
  }

  return compositeCanvas;
}

export async function captureCompositeWithLogoFallback(
  App: AppContainer,
  deps: ExportOrderPdfDeps,
  opBase: string,
  createComposite: (includeLogo: boolean) => Promise<HTMLCanvasElement>,
  canvasToPngBytes: (canvas: HTMLCanvasElement) => Promise<Uint8Array>
): Promise<Uint8Array> {
  try {
    const withLogo = await createComposite(true);
    withLogo.toDataURL();
    return canvasToPngBytes(withLogo);
  } catch (e) {
    deps._exportReportThrottled(App, `${opBase}.withLogo`, e, { throttleMs: 1000 });
    const withoutLogo = await createComposite(false);
    withoutLogo.toDataURL();
    return canvasToPngBytes(withoutLogo);
  }
}

export function restoreOrderPdfCompositeCamera(
  App: AppContainer,
  deps: ExportOrderPdfDeps,
  base: OrderPdfCompositeBase
): void {
  deps.restoreViewportCameraPose(App, {
    position: { x: base.originalCamPos.x, y: base.originalCamPos.y, z: base.originalCamPos.z },
    target: { x: base.originalTarget.x, y: base.originalTarget.y, z: base.originalTarget.z },
  });
  deps._renderSceneForExport(App, base.renderer, base.scene, base.camera);
}
