// Fatal / runtime error overlay (Pure ESM)
//
// Goals:
// - Provide a single, consistent crash UI for boot/runtime errors.
// - Never rely on implicit globals: callers must pass { document, window }.
// - Be safe: escape all dynamic text.
// - Be resilient: if DOM isn't available, fall back to console logging.
import { sanitizeHtmlByPolicy } from './html_sanitize_runtime.js';
import {
  copyFatalOverlayText,
  downloadFatalOverlayJson,
  formatFatalOverlayError,
  hasFatalOverlayDomDocument,
  makeFatalOverlayCopyText,
  readFatalOverlayButton,
  readFatalOverlayExistingController,
  safeFatalOverlayText,
  setFatalOverlayController,
  shouldSilenceFatalOverlayConsole,
  stableFatalOverlayStringify,
} from './error_overlay_support.js';

import type {
  FatalOverlayHideOptionsLike,
  FatalOverlayShowOptionsLike,
  WardrobeProFatalOverlayController,
} from '../../../types';

type FatalOverlayOpts = FatalOverlayShowOptionsLike;

export type FatalOverlayController = WardrobeProFatalOverlayController;

/**
 * Show (or update) a fatal error overlay.
 *
 * Compatibility note: some callers still pass `opts.doc` / `opts.win`.
 */
export function showFatalOverlay(opts: FatalOverlayOpts): FatalOverlayController | null {
  const doc = (opts.document || opts.doc) ?? null;
  const win = (opts.window || opts.win) ?? null;

  const title = safeFatalOverlayText((opts && opts.title) || 'שגיאה');
  const description = safeFatalOverlayText((opts && opts.description) || '');
  const helpHtml = sanitizeHtmlByPolicy(doc, (opts && opts.helpHtml) || '', 'overlay-help');
  const allowClose = !!(opts && opts.allowClose);

  const info = formatFatalOverlayError(opts && opts.error ? opts.error : null);
  const stackText = safeFatalOverlayText(info.stack || '');
  const errText = safeFatalOverlayText(info.name ? info.name + ': ' + info.message : info.message);

  if (!hasFatalOverlayDomDocument(doc)) {
    if (shouldSilenceFatalOverlayConsole(opts)) return null;
    try {
      console.error(
        '[WardrobePro][fatal]',
        title,
        description,
        info,
        opts && opts.context ? opts.context : ''
      );
    } catch (_e) {}
    return null;
  }

  const domDoc = doc;
  const existing = readFatalOverlayExistingController(win);
  const overlay = existing && existing.el ? existing.el : domDoc.createElement('div');

  if (!existing) {
    overlay.id = 'wpFatalOverlay';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:999999',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:#0b1220',
      'color:#fff',
      'padding:24px',
      'font-family:Heebo,Arial,sans-serif',
      'text-align:center',
    ].join(';');
  }

  try {
    if (overlay.parentNode !== domDoc.body) {
      domDoc.body.appendChild(overlay);
    }
  } catch (_e) {}

  try {
    overlay.style.display = 'flex';
  } catch (_e) {}

  const detailsId = 'wpFatalOverlayDetails';
  const actionsId = 'wpFatalOverlayActions';

  overlay.innerHTML = `
    <div style="max-width:980px;line-height:1.65;width:100%">
      <div style="font-size:22px;font-weight:900;margin-bottom:10px">${title}</div>
      ${description ? `<div style="opacity:.92;margin-bottom:14px">${description}</div>` : ''}

      ${helpHtml ? `<div style="margin:12px auto 16px auto;text-align:right">${helpHtml}</div>` : ''}

      <div id="${actionsId}" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:10px 0 12px 0">
        <button data-wp-action="reload" style="cursor:pointer;border:0;border-radius:12px;padding:10px 14px;font-weight:800">רענן</button>
        <button data-wp-action="copy" style="cursor:pointer;border:0;border-radius:12px;padding:10px 14px;font-weight:800">העתק פרטים</button>
        <button data-wp-action="download" style="cursor:pointer;border:0;border-radius:12px;padding:10px 14px;font-weight:800">הורד debug.json</button>
        ${allowClose ? `<button data-wp-action="close" style="cursor:pointer;border:0;border-radius:12px;padding:10px 14px;font-weight:800">סגור</button>` : ''}
      </div>

      <div style="text-align:right;background:rgba(255,255,255,.08);padding:14px 16px;border-radius:14px">
        <div style="font-weight:900;margin-bottom:6px">פרטים טכניים</div>
        ${errText ? `<div style="opacity:.9;margin-bottom:8px" dir="ltr">${errText}</div>` : ''}
        <details id="${detailsId}" style="text-align:right">
          <summary style="cursor:pointer;font-weight:800;opacity:.95">הצג Stack / Context</summary>
          <div style="margin-top:10px">
            ${stackText ? `<pre dir="ltr" style="white-space:pre-wrap;word-break:break-word;background:rgba(0,0,0,.35);padding:10px 12px;border-radius:12px;max-height:320px;overflow:auto">${stackText}</pre>` : ''}
            <pre dir="ltr" style="white-space:pre-wrap;word-break:break-word;background:rgba(0,0,0,.35);padding:10px 12px;border-radius:12px;max-height:260px;overflow:auto">${safeFatalOverlayText(stableFatalOverlayStringify(opts && opts.context ? opts.context : null))}</pre>
          </div>
        </details>
        <div style="margin-top:10px;opacity:.8;font-size:13px">
          טיפ: פתח DevTools (F12) כדי לראות שגיאות נוספות ולוגים.
        </div>
      </div>

      <div style="margin-top:12px;opacity:.7;font-size:12px" dir="ltr">WardrobePro • fatal overlay</div>
    </div>
  `;

  const copyTxt = makeFatalOverlayCopyText(opts);
  const snapshot = opts && opts.snapshot ? opts.snapshot : null;

  function q(sel: string): Element | null {
    try {
      return overlay.querySelector(sel);
    } catch (_e) {
      return null;
    }
  }

  const btnReload = readFatalOverlayButton(q('button[data-wp-action="reload"]'));
  const btnCopy = readFatalOverlayButton(q('button[data-wp-action="copy"]'));
  const btnDownload = readFatalOverlayButton(q('button[data-wp-action="download"]'));
  const btnClose = readFatalOverlayButton(q('button[data-wp-action="close"]'));

  if (btnReload && win && win.location && typeof win.location.reload === 'function') {
    btnReload.onclick = () => {
      try {
        win.location.reload();
      } catch (_e) {}
    };
  }

  if (btnCopy && win) {
    btnCopy.onclick = () => {
      const ok = copyFatalOverlayText(win, copyTxt);
      try {
        btnCopy.textContent = ok ? 'הועתק ✅' : 'לא ניתן להעתיק';
        const st = win && typeof win.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
        st(() => {
          try {
            btnCopy.textContent = 'העתק פרטים';
          } catch (_e) {}
        }, 1200);
      } catch (_e2) {}
    };
  }

  if (btnDownload && win) {
    btnDownload.onclick = () => {
      const ok = downloadFatalOverlayJson(win, 'wardrobepro_debug.json', snapshot || { note: 'No snapshot' });
      try {
        btnDownload.textContent = ok ? 'ירד ✅' : 'לא ניתן להוריד';
        const st = win && typeof win.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
        st(() => {
          try {
            btnDownload.textContent = 'הורד debug.json';
          } catch (_e) {}
        }, 1200);
      } catch (_e2) {}
    };
  }

  if (btnClose) {
    btnClose.onclick = () => {
      try {
        overlay.style.display = 'none';
      } catch (_e) {}
    };
  }

  const ctrl: FatalOverlayController = {
    el: overlay,
    show(_opts?: FatalOverlayShowOptionsLike) {
      try {
        overlay.style.display = 'flex';
      } catch (_e) {}
    },
    hide(_opts?: FatalOverlayHideOptionsLike) {
      try {
        overlay.style.display = 'none';
      } catch (_e) {}
    },
  };

  setFatalOverlayController(win, ctrl);
  return ctrl;
}
