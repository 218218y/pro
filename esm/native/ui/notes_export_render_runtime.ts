import { getDocumentMaybe } from '../services/api.js';
import { asHTMLElement, getElementByIdHtml, queryHtmlElement } from './dom_helpers.js';
import {
  type ExportNotesTransform,
  getComputedStyleMaybe,
  queryAll,
  readExportTransform,
  requireNotesExportApp,
} from './notes_export_shared.js';
import { shouldIncludeNotesInExport } from './notes_export_visibility.js';
import { clampScale } from './notes_export_render_shared.js';
import { createMapPoint, createTransformRuntime } from './notes_export_render_transform.js';
import {
  drawEditorAsImageAxisAligned,
  drawEditorAsPlainTextAxisAligned,
} from './notes_export_render_draw.js';

export async function renderAllNotesToCanvas(
  App: unknown,
  ctx: CanvasRenderingContext2D | null | undefined,
  originalWidth: number,
  originalHeight: number,
  titleOffset = 0,
  exportTransform: ExportNotesTransform | null = null
): Promise<boolean | null> {
  const A = requireNotesExportApp(App);
  if (!ctx) return null;

  const doc = getDocumentMaybe(A);
  if (!doc) return null;
  if (!shouldIncludeNotesInExport(A)) return null;

  const container = getElementByIdHtml(doc, 'viewer-container');
  if (!container || !container.getBoundingClientRect) return null;

  const containerRect = container.getBoundingClientRect();
  if (!containerRect || !containerRect.width || !containerRect.height) return null;

  const scaleX =
    Number.isFinite(originalWidth) && originalWidth > 0 ? originalWidth / containerRect.width : 1;
  const scaleY =
    Number.isFinite(originalHeight) && originalHeight > 0 ? originalHeight / containerRect.height : 1;
  const transform = createTransformRuntime(exportTransform || readExportTransform(A) || null);
  const mapPoint = createMapPoint(transform, containerRect, originalWidth, originalHeight);
  const boxes = queryAll(A, '.annotation-box')
    .map(value => asHTMLElement(value))
    .filter((value): value is HTMLElement => !!value);

  for (const box of boxes) {
    const editor = queryHtmlElement(box, '.editor');
    if (!editor) continue;

    const editorRect = editor.getBoundingClientRect();
    if (!editorRect || editorRect.width < 2 || editorRect.height < 2) continue;

    try {
      const csBox = getComputedStyleMaybe(box);
      if (csBox && csBox.display === 'none') continue;
    } catch {
      // ignore hidden-box CSS lookup errors
    }

    const preLeft = editorRect.left - containerRect.left;
    const preTop = editorRect.top - containerRect.top;
    const preW = Math.max(1, editorRect.width);
    const preH = Math.max(1, editorRect.height);

    const tlPost = mapPoint(preLeft, preTop);
    const trPost = mapPoint(preLeft + preW, preTop);
    const blPost = mapPoint(preLeft, preTop + preH);

    let sX = 1;
    let sY = 1;
    const rawSX = (trPost.x - tlPost.x) / preW;
    const rawSY = (blPost.y - tlPost.y) / preH;
    if (Number.isFinite(rawSX) && Math.abs(rawSX) > 1e-6) sX = Math.abs(rawSX);
    if (Number.isFinite(rawSY) && Math.abs(rawSY) > 1e-6) sY = Math.abs(rawSY);

    if (!Number.isFinite(sX) || sX <= 1e-6 || !Number.isFinite(sY) || sY <= 1e-6) {
      if (transform.planeOk) {
        const cx = preLeft + preW * 0.5;
        const cy = preTop + preH * 0.5;
        const cPost = mapPoint(cx, cy);
        const dxSample = Math.min(24, Math.max(6, preW * 0.25));
        const dySample = Math.min(24, Math.max(6, preH * 0.25));
        const px = mapPoint(cx + dxSample, cy);
        const py = mapPoint(cx, cy + dySample);
        const kx = Math.hypot(px.x - cPost.x, px.y - cPost.y) / dxSample;
        const ky = Math.hypot(py.x - cPost.x, py.y - cPost.y) / dySample;
        if (Number.isFinite(kx) && kx > 1e-6) sX = Math.abs(kx);
        if (Number.isFinite(ky) && ky > 1e-6) sY = Math.abs(ky);
      } else if (transform.hasAffine) {
        const kx = Math.hypot(transform.affine.a, transform.affine.b);
        const ky = Math.hypot(transform.affine.c, transform.affine.d);
        if (Number.isFinite(kx) && kx > 1e-6) sX = Math.abs(kx);
        if (Number.isFinite(ky) && ky > 1e-6) sY = Math.abs(ky);
      } else {
        if (Number.isFinite(transform.scaleTranslate.sx) && transform.scaleTranslate.sx > 1e-6) {
          sX = Math.abs(transform.scaleTranslate.sx);
        }
        if (Number.isFinite(transform.scaleTranslate.sy) && transform.scaleTranslate.sy > 1e-6) {
          sY = Math.abs(transform.scaleTranslate.sy);
        }
      }
    }

    sX = clampScale(sX);
    sY = clampScale(sY);

    const dstWCss = preW * sX;
    const dstHCss = preH * sY;
    const dstLeftCss = Math.min(tlPost.x, trPost.x);
    const dstTopCss = Math.min(tlPost.y, blPost.y);

    let ok = false;
    try {
      ok = await drawEditorAsImageAxisAligned({
        doc,
        ctx,
        editor,
        dstLeftCss,
        dstTopCss,
        dstWCss,
        dstHCss,
        srcWCss: preW,
        srcHCss: preH,
        scaleX,
        scaleY,
        titleOffset,
      });
    } catch {
      ok = false;
    }
    if (!ok) {
      drawEditorAsPlainTextAxisAligned({
        ctx,
        boxEl: box,
        dstLeftCss,
        dstTopCss,
        dstWCss,
        dstHCss,
        scaleX,
        scaleY,
        titleOffset,
      });
    }
  }

  return true;
}
