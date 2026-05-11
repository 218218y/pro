import {
  formatError,
  getExistingController,
  hasDom,
  reportEntrySoft,
  safeText,
  setAttrIfPossible,
  setController,
  setHtmlOrText,
  setTextIfPossible,
  silentNoDom,
  stableStringify,
  type BootFatalFallbackController,
  type BootFatalFallbackOpts,
} from './entry_pro_shared.js';

async function copyText(win: Window | null, txt: unknown): Promise<boolean> {
  try {
    if (!win) return false;
    const nav = win.navigator;
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      await nav.clipboard.writeText(String(txt || ''));
      return true;
    }
  } catch (err) {
    reportEntrySoft(err, { area: 'entry_pro', op: 'copyText.clipboard', throttleMs: 1000 });
  }

  let ta: HTMLTextAreaElement | null = null;
  try {
    const doc = win && win.document;
    if (!doc || typeof doc.createElement !== 'function') return false;
    ta = doc.createElement('textarea');
    ta.value = String(txt || '');
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    const body = doc.body;
    if (!body) return false;
    body.appendChild(ta);
    ta.select();
    const copyResult = typeof doc.execCommand === 'function' ? doc.execCommand('copy') : false;
    return !!copyResult;
  } catch (err) {
    reportEntrySoft(err, { area: 'entry_pro', op: 'copyText.execCommand', throttleMs: 1000 });
    return false;
  } finally {
    try {
      if (ta) ta.remove();
    } catch (err) {
      reportEntrySoft(err, { area: 'entry_pro', op: 'copyText.cleanup', throttleMs: 1000 });
    }
  }
}

function makeCopyText(opts: BootFatalFallbackOpts | null | undefined): string {
  const title = opts && opts.title ? String(opts.title) : 'WardrobePro error';
  const description = opts && opts.description ? String(opts.description) : '';
  const ctx = opts && opts.context ? opts.context : null;
  const info = formatError(opts && opts.error ? opts.error : null);

  let out = '';
  out += title + '\n';
  if (description) out += description + '\n';
  if (ctx) out += '\nContext:\n' + stableStringify(ctx) + '\n';

  if (info.name || info.message) {
    out += '\nError:\n';
    if (info.name) out += info.name + ': ';
    out += info.message + '\n';
  }
  if (info.stack) out += '\nStack:\n' + info.stack + '\n';
  return out;
}

export function showBootFatalOverlayFallback(
  opts: BootFatalFallbackOpts = {}
): BootFatalFallbackController | null {
  try {
    const doc = opts.document || null;
    const win = opts.window || null;

    if (!hasDom(doc)) {
      if (!silentNoDom(opts)) {
        console.error('[WardrobePro][Boot] fatal:', opts && opts.error ? opts.error : opts);
      }
      return null;
    }

    const existing = getExistingController(win);
    if (existing) {
      try {
        const titleEl = existing.el.querySelector('[data-wp="title"]');
        const descEl = existing.el.querySelector('[data-wp="desc"]');
        const detailsEl = existing.el.querySelector('[data-wp="details"]');
        if (opts.title) setTextIfPossible(titleEl, String(opts.title));
        if (opts.description) setTextIfPossible(descEl, String(opts.description));
        setTextIfPossible(detailsEl, makeCopyText(opts));
      } catch (err) {
        reportEntrySoft(err, {
          area: 'entry_pro',
          op: 'showBootFatalOverlayFallback.updateExisting',
          throttleMs: 1000,
        });
      }
      existing.show();
      return existing;
    }

    const root = doc.createElement('div');
    root.id = 'wpBootFatalOverlayFallback';
    try {
      root.role = 'dialog';
    } catch (err) {
      reportEntrySoft(err, {
        area: 'entry_pro',
        op: 'showBootFatalOverlayFallback.root.roleProp',
        throttleMs: 1000,
      });
    }
    try {
      setAttrIfPossible(root, 'role', 'dialog');
      setAttrIfPossible(root, 'aria-modal', 'true');
    } catch (err) {
      reportEntrySoft(err, {
        area: 'entry_pro',
        op: 'showBootFatalOverlayFallback.root.roleAttrs',
        throttleMs: 1000,
      });
    }
    root.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.85);' +
      'color:#fff;font:14px/1.4 system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;';

    const inner = doc.createElement('div');
    inner.style.cssText =
      'max-width:920px;margin:40px auto;padding:24px;border:1px solid rgba(255,255,255,0.2);border-radius:12px;background:rgba(20,20,20,0.95);';

    const h = doc.createElement('h1');
    try {
      setAttrIfPossible(h, 'data-wp', 'title');
    } catch (err) {
      reportEntrySoft(err, {
        area: 'entry_pro',
        op: 'showBootFatalOverlayFallback.titleAttr',
        throttleMs: 1000,
      });
    }
    h.style.cssText = 'font-size:20px;margin:0 0 10px 0;';
    h.textContent = opts.title ? String(opts.title) : 'WardrobePro error';

    const p = doc.createElement('p');
    try {
      setAttrIfPossible(p, 'data-wp', 'desc');
    } catch (err) {
      reportEntrySoft(err, {
        area: 'entry_pro',
        op: 'showBootFatalOverlayFallback.descAttr',
        throttleMs: 1000,
      });
    }
    p.style.cssText = 'margin:0 0 16px 0;opacity:0.9;';
    p.textContent = opts.description ? String(opts.description) : 'An unexpected error occurred.';

    const details = doc.createElement('pre');
    try {
      setAttrIfPossible(details, 'data-wp', 'details');
    } catch (err) {
      reportEntrySoft(err, {
        area: 'entry_pro',
        op: 'showBootFatalOverlayFallback.detailsAttr',
        throttleMs: 1000,
      });
    }
    details.style.cssText =
      'white-space:pre-wrap;word-break:break-word;background:rgba(0,0,0,0.35);padding:12px;border-radius:8px;max-height:45vh;overflow:auto;';
    details.textContent = makeCopyText(opts);

    const actions = doc.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;';

    const btnCopy = doc.createElement('button');
    btnCopy.type = 'button';
    btnCopy.textContent = 'Copy details';
    btnCopy.style.cssText =
      'cursor:pointer;padding:10px 12px;border:0;border-radius:8px;background:#2d6cdf;color:#fff;';
    btnCopy.onclick = async () => {
      try {
        const ok = await copyText(win, details.textContent || '');
        btnCopy.textContent = ok ? 'Copied!' : 'Copy failed';
        setTimeout(() => {
          btnCopy.textContent = 'Copy details';
        }, 1200);
      } catch (err) {
        reportEntrySoft(err, {
          area: 'entry_pro',
          op: 'showBootFatalOverlayFallback.copyButton',
          throttleMs: 1000,
        });
      }
    };

    const btnClose = doc.createElement('button');
    btnClose.type = 'button';
    btnClose.textContent = 'Close';
    btnClose.style.cssText =
      'cursor:pointer;padding:10px 12px;border:0;border-radius:8px;background:#444;color:#fff;';

    actions.appendChild(btnCopy);
    actions.appendChild(btnClose);

    if (opts.helpHtml) {
      const help = doc.createElement('div');
      help.style.cssText = 'margin-top:14px;opacity:0.95;';
      try {
        setHtmlOrText(help, String(opts.helpHtml || ''));
      } catch (err) {
        reportEntrySoft(err, {
          area: 'entry_pro',
          op: 'showBootFatalOverlayFallback.helpHtml',
          throttleMs: 1000,
        });
      }
      inner.appendChild(help);
    }

    inner.appendChild(h);
    inner.appendChild(p);
    inner.appendChild(details);
    inner.appendChild(actions);
    root.appendChild(inner);

    const body = doc.body;
    if (!body) return null;
    body.appendChild(root);

    const ctrl: BootFatalFallbackController = {
      el: root,
      show: () => {
        try {
          root.style.display = 'block';
        } catch (err) {
          reportEntrySoft(err, {
            area: 'entry_pro',
            op: 'showBootFatalOverlayFallback.ctrl.show',
            throttleMs: 1000,
          });
        }
      },
      hide: () => {
        try {
          root.style.display = 'none';
        } catch (err) {
          reportEntrySoft(err, {
            area: 'entry_pro',
            op: 'showBootFatalOverlayFallback.ctrl.hide',
            throttleMs: 1000,
          });
        }
      },
    };

    btnClose.onclick = () => ctrl.hide();
    setController(win, ctrl);
    return ctrl;
  } catch (_e) {
    console.error('[WardrobePro][Boot] fatal overlay recovery failed');
    return null;
  }
}

export function hasAnyOverlay(win: Window): boolean {
  try {
    const existing = getExistingController(win);
    if (existing) return true;

    const getById =
      win.document && win.document.getElementById ? win.document.getElementById.bind(win.document) : null;
    if (!getById) return false;
    return !!(getById('wpBootFatalOverlayFallback') || getById('wp-fatal-overlay'));
  } catch (err) {
    reportEntrySoft(err, { area: 'entry_pro', op: 'hasAnyOverlay', throttleMs: 1000 });
    return false;
  }
}

export { safeText };
