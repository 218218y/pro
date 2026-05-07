import { asHTMLElement, queryHtmlElement, serializeDetachedHtmlNode } from './dom_helpers.js';
import { getComputedStyleMaybe } from './notes_export_shared.js';
import { type NoteImageDrawArgs, type NotePlainTextDrawArgs } from './notes_export_render_shared.js';

const NOTE_EDITOR_EXPORT_STYLE_PROPS = [
  'color',
  'direction',
  'font-family',
  'font-size',
  'font-style',
  'font-variant',
  'font-weight',
  'letter-spacing',
  'line-height',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'text-align',
  'text-decoration',
  'text-transform',
  'unicode-bidi',
  'white-space',
  'word-break',
  'overflow-wrap',
  'word-wrap',
  'box-sizing',
] as const;

type StyleWritable = CSSStyleDeclaration & Record<string, unknown>;

function readCssValue(style: CSSStyleDeclaration | null | undefined, prop: string): string {
  try {
    const value = style && typeof style.getPropertyValue === 'function' ? style.getPropertyValue(prop) : '';
    return typeof value === 'string' ? value.trim() : '';
  } catch {
    return '';
  }
}

function setStyleValue(el: HTMLElement, prop: string, value: string): void {
  if (!value) return;
  try {
    const style = el.style as StyleWritable;
    if (style && typeof style.setProperty === 'function') {
      style.setProperty(prop, value);
      return;
    }
    Reflect.set(style, prop, value);
  } catch {
    // Keep export rendering best-effort; the caller still has the plain-text path.
  }
}

function parseCssPx(value: string): number | null {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (!raw || raw === 'auto' || raw === 'normal') return null;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, n);
}

function readPaddingPx(
  style: CSSStyleDeclaration | null | undefined,
  side: 'top' | 'right' | 'bottom' | 'left'
): number {
  return parseCssPx(readCssValue(style, `padding-${side}`)) ?? 0;
}

function readFontSizePx(style: CSSStyleDeclaration | null | undefined): number {
  return parseCssPx(readCssValue(style, 'font-size')) ?? 14;
}

function readLineHeightPx(style: CSSStyleDeclaration | null | undefined, fontSizePx: number): number {
  const raw = readCssValue(style, 'line-height');
  const px = parseCssPx(raw);
  if (px !== null) return Math.max(1, px);
  const ratio = parseFloat(raw);
  if (Number.isFinite(ratio) && ratio > 0 && !raw.toLowerCase().endsWith('px')) {
    return Math.max(1, fontSizePx * ratio);
  }
  return Math.max(1, fontSizePx * 1.2);
}

function applyEditorComputedExportStyle(
  source: HTMLElement,
  cloned: HTMLElement
): CSSStyleDeclaration | null {
  const cs = getComputedStyleMaybe(source);

  for (const prop of NOTE_EDITOR_EXPORT_STYLE_PROPS) {
    const value = readCssValue(cs, prop);
    if (value) setStyleValue(cloned, prop, value);
  }

  const isRtl = String(cloned.dir || readCssValue(cs, 'direction') || 'rtl').toLowerCase() === 'rtl';
  setStyleValue(cloned, 'display', 'block');
  setStyleValue(cloned, 'margin', '0');
  setStyleValue(cloned, 'background', readCssValue(cs, 'background-color') || 'transparent');
  setStyleValue(cloned, 'box-sizing', readCssValue(cs, 'box-sizing') || 'border-box');
  setStyleValue(cloned, 'white-space', readCssValue(cs, 'white-space') || 'pre-wrap');
  setStyleValue(cloned, 'word-wrap', readCssValue(cs, 'word-wrap') || 'break-word');
  setStyleValue(cloned, 'overflow-wrap', readCssValue(cs, 'overflow-wrap') || 'break-word');
  setStyleValue(cloned, 'direction', isRtl ? 'rtl' : 'ltr');
  setStyleValue(cloned, 'text-align', readCssValue(cs, 'text-align') || (isRtl ? 'right' : 'left'));
  setStyleValue(cloned, 'color', readCssValue(cs, 'color') || '#000');
  if (!readCssValue(cs, 'font-family')) setStyleValue(cloned, 'font-family', 'Heebo, sans-serif');
  if (!readCssValue(cs, 'font-size')) setStyleValue(cloned, 'font-size', '14px');

  return cs;
}

function wrapLineByCanvas(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  const words = String(text || '')
    .split(/(\s+)/)
    .filter(part => part.length > 0);
  let line = '';

  const pushLongToken = (token: string): void => {
    let chunk = '';
    for (const ch of Array.from(token)) {
      const next = `${chunk}${ch}`;
      if (chunk && ctx.measureText(next).width > maxWidth) {
        out.push(chunk);
        chunk = ch;
      } else {
        chunk = next;
      }
    }
    line = chunk;
  };

  for (const part of words) {
    const isSpace = /^\s+$/.test(part);
    const normalized = isSpace ? ' ' : part;
    const next = line ? `${line}${normalized}` : isSpace ? '' : normalized;
    if (!next) continue;

    if (ctx.measureText(next).width <= maxWidth || !line) {
      if (!line && ctx.measureText(next).width > maxWidth) pushLongToken(next);
      else line = next;
      continue;
    }

    out.push(line.trimEnd());
    line = isSpace ? '' : normalized;
    if (line && ctx.measureText(line).width > maxWidth) pushLongToken(line);
  }

  if (line) out.push(line.trimEnd());
  return out;
}

function wrapPreWrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const normalized = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const paragraphs = normalized.split('\n');
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push('');
      continue;
    }
    lines.push(...wrapLineByCanvas(ctx, paragraph, maxWidth));
  }
  return lines;
}

export function drawEditorAsPlainTextAxisAligned({
  ctx,
  boxEl,
  dstLeftCss,
  dstTopCss,
  dstWCss,
  dstHCss,
  scaleX,
  scaleY,
  titleOffset,
}: NotePlainTextDrawArgs): void {
  try {
    const editor = queryHtmlElement(boxEl, '.editor');
    if (!editor) return;

    const text = String(editor.innerText || editor.textContent || '').trim();
    if (!text) return;

    const ax = dstLeftCss * scaleX;
    const ay = dstTopCss * scaleY + titleOffset;
    const dw = Math.max(0, dstWCss * scaleX);
    const dh = Math.max(0, dstHCss * scaleY);
    if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(dw) || !Number.isFinite(dh)) return;
    if (dw < 2 || dh < 2) return;

    ctx.save();
    try {
      ctx.beginPath();
      ctx.rect(ax, ay, dw, dh);
      ctx.clip();

      const cs = getComputedStyleMaybe(editor);
      const fontSizeCss = readFontSizePx(cs);
      const fontFamily = readCssValue(cs, 'font-family') || 'Heebo, sans-serif';
      const fontWeight = readCssValue(cs, 'font-weight') || 'normal';
      const fontStyle = readCssValue(cs, 'font-style') || 'normal';

      const fontSizePx = Math.max(10, fontSizeCss * Math.max(0.0001, scaleY));
      ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
      ctx.textBaseline = 'top';

      const dir = readCssValue(cs, 'direction') || 'rtl';
      const canvasDir: CanvasDirection = dir === 'ltr' || dir === 'rtl' ? dir : 'inherit';
      ctx.direction = canvasDir;

      const isRtl =
        String(dir || '')
          .trim()
          .toLowerCase() === 'rtl';
      ctx.textAlign = isRtl ? 'right' : 'left';
      ctx.fillStyle = readCssValue(cs, 'color') || '#000';

      const padTop = readPaddingPx(cs, 'top') * scaleY;
      const padRight = readPaddingPx(cs, 'right') * scaleX;
      const padBottom = readPaddingPx(cs, 'bottom') * scaleY;
      const padLeft = readPaddingPx(cs, 'left') * scaleX;
      const maxW = Math.max(1, dw - padLeft - padRight);
      const maxH = Math.max(1, dh - padTop - padBottom);
      const x = isRtl ? dw - padRight : padLeft;
      const lineH = readLineHeightPx(cs, fontSizeCss) * Math.max(0.0001, scaleY);
      let y = padTop;

      for (const line of wrapPreWrapText(ctx, text, maxW)) {
        if (y > padTop + maxH) break;
        ctx.fillText(line, ax + x, ay + y);
        y += lineH;
      }
    } finally {
      ctx.restore();
    }
  } catch {
    // no-op
  }
}

export function drawEditorAsImageAxisAligned({
  doc,
  ctx,
  editor,
  dstLeftCss,
  dstTopCss,
  dstWCss,
  dstHCss,
  srcWCss,
  srcHCss,
  scaleX,
  scaleY,
  titleOffset,
}: NoteImageDrawArgs): Promise<boolean> {
  return new Promise(resolve => {
    try {
      const clonedNode = editor.cloneNode(true);
      const cloned = asHTMLElement(clonedNode);
      if (!cloned) {
        resolve(false);
        return;
      }

      const cs = applyEditorComputedExportStyle(editor, cloned);
      const isRtl = String(cloned.dir || readCssValue(cs, 'direction') || 'rtl').toLowerCase() === 'rtl';
      cloned.style.width = `${srcWCss}px`;
      cloned.style.height = `${srcHCss}px`;
      cloned.style.overflow = 'hidden';

      const wrapper = doc.createElement('div');
      wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      wrapper.style.width = `${srcWCss}px`;
      wrapper.style.height = `${srcHCss}px`;
      wrapper.style.overflow = 'hidden';
      wrapper.style.background = 'transparent';
      wrapper.style.boxSizing = 'border-box';
      wrapper.style.margin = '0';
      wrapper.style.padding = '0';
      wrapper.appendChild(cloned);

      let xhtml = '';
      try {
        xhtml = serializeDetachedHtmlNode(doc, wrapper);
      } catch {
        xhtml = '';
      }
      if (!xhtml) {
        try {
          xhtml = serializeDetachedHtmlNode(doc, wrapper);
        } catch {
          xhtml = '';
        }
      }

      const ax = dstLeftCss * scaleX;
      const ay = dstTopCss * scaleY + titleOffset;
      const dw = Math.max(0, dstWCss * scaleX);
      const dh = Math.max(0, dstHCss * scaleY);
      if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(dw) || !Number.isFinite(dh)) {
        resolve(false);
        return;
      }

      const hiW = Math.max(1, Math.round(dw));
      const hiH = Math.max(1, Math.round(dh));
      const forceCss = isRtl
        ? '<style><![CDATA[*{direction:rtl;unicode-bidi:plaintext;} .editor,div,p,span{direction:rtl;unicode-bidi:plaintext;text-align:right;}]]></style>'
        : '<style><![CDATA[.editor,div,p,span{unicode-bidi:plaintext;}]]></style>';
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${hiW}" height="${hiH}" viewBox="0 0 ${srcWCss} ${srcHCss}" preserveAspectRatio="none">` +
        forceCss +
        `<foreignObject width="${srcWCss}" height="${srcHCss}">${xhtml}</foreignObject>` +
        '</svg>';

      const img = new Image();
      img.onload = () => {
        try {
          ctx.drawImage(img, ax, ay, dw, dh);
          resolve(true);
        } catch {
          resolve(false);
        }
      };
      img.onerror = () => resolve(false);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch {
      resolve(false);
    }
  });
}
