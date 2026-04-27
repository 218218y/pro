// WardrobePro — Export canvas delivery logo helpers (Native ESM)

import type { AppContainer } from '../../../../types/app.js';
import { getHeaderLogoImageMaybe } from '../../services/api.js';
import { _exportReportThrottled } from './export_canvas_core_feedback.js';
import { getProp, isObjectLike } from './export_canvas_core_shared.js';

function isReadyLogoImage(v: unknown): v is HTMLImageElement {
  if (!isObjectLike(v)) return false;
  return (
    typeof getProp(v, 'complete') === 'boolean' &&
    typeof getProp(v, 'naturalWidth') === 'number' &&
    typeof getProp(v, 'naturalHeight') === 'number'
  );
}

export function getExportLogoImage(App: AppContainer, includeLogo: boolean): HTMLImageElement | null {
  if (!includeLogo) return null;
  const logo = getHeaderLogoImageMaybe(App);
  return isReadyLogoImage(logo) && logo.complete && logo.naturalHeight !== 0 ? logo : null;
}

export function drawExportLogo(
  App: AppContainer,
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  logoImg: HTMLImageElement,
  op: string,
  logoY = 15
): void {
  try {
    logoImg.crossOrigin = 'Anonymous';
  } catch (e) {
    _exportReportThrottled(App, `${op}.logoCrossOrigin`, e, { throttleMs: 2000 });
  }

  const logoH = 90;
  const ratio = logoImg.naturalWidth / logoImg.naturalHeight;
  const logoW = logoH * ratio;
  const logoX = canvasWidth - logoW - 40;
  ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
}
