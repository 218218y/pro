import { asHTMLElement, queryHtmlElement, serializeDetachedHtmlNode } from './dom_helpers.js';
import { getComputedStyleMaybe } from './notes_export_shared.js';
import { type NoteImageDrawArgs, type NotePlainTextDrawArgs } from './notes_export_render_shared.js';

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
      const fontSizeCss = cs ? parseFloat(cs.getPropertyValue('font-size') || '14') : 14;
      const fontFamily = cs ? cs.getPropertyValue('font-family') || 'sans-serif' : 'sans-serif';
      const fontWeight = cs ? cs.getPropertyValue('font-weight') || 'normal' : 'normal';
      const fontStyle = cs ? cs.getPropertyValue('font-style') || 'normal' : 'normal';

      const fontSizePx = Math.max(10, fontSizeCss * Math.max(0.0001, scaleY));
      ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
      ctx.textBaseline = 'top';

      const dir = cs && cs.getPropertyValue('direction') ? cs.getPropertyValue('direction') : 'rtl';
      const canvasDir: CanvasDirection = dir === 'ltr' || dir === 'rtl' ? dir : 'inherit';
      ctx.direction = canvasDir;

      const isRtl =
        String(dir || '')
          .trim()
          .toLowerCase() === 'rtl';
      ctx.textAlign = isRtl ? 'right' : 'left';
      ctx.fillStyle = cs && cs.getPropertyValue('color') ? cs.getPropertyValue('color') : '#000';

      const maxW = Math.max(10, dw);
      const words = text.split(/\s+/);
      const x = isRtl ? dw : 0;
      const lineH = Math.max(12, fontSizePx * 1.35);
      let line = '';
      let y = 0;

      for (let i = 0; i < words.length; i += 1) {
        const next = line ? `${line} ${words[i]}` : words[i];
        if (ctx.measureText(next).width > maxW && line) {
          ctx.fillText(line, ax + x, ay + y);
          line = words[i];
          y += lineH;
        } else {
          line = next;
        }
      }
      if (line) ctx.fillText(line, ax + x, ay + y);
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

      const isRtl =
        String(cloned.dir || getComputedStyleMaybe(editor)?.direction || 'rtl').toLowerCase() === 'rtl';
      cloned.style.margin = '0';
      cloned.style.width = `${srcWCss}px`;
      cloned.style.height = `${srcHCss}px`;
      cloned.style.boxSizing = 'border-box';
      if (!cloned.style.background) cloned.style.background = 'transparent';
      if (!cloned.style.color) cloned.style.color = '#000';
      if (!cloned.style.direction) cloned.style.direction = isRtl ? 'rtl' : 'ltr';
      if (!cloned.style.textAlign) cloned.style.textAlign = isRtl ? 'right' : 'left';

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
        : '';
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
