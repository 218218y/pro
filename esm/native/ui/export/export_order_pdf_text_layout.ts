import type { PdfWidthFontLike } from './export_order_pdf_contracts_shared.js';

export function createOrderPdfTextLayoutOps() {
  function wrapTextToWidth(text: string, font: PdfWidthFontLike, size: number, maxWidth: number): string[] {
    if (text === null || text === undefined) return [''];
    const out: string[] = [];
    const paragraphs = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

    for (const p of paragraphs) {
      const line = String(p);
      if (!line.trim()) {
        out.push('');
        continue;
      }

      const words = line.split(/\s+/g);
      let cur = '';
      const flush = () => {
        if (cur !== '') out.push(cur);
        cur = '';
      };

      for (const w of words) {
        if (!w) continue;
        const candidate = cur ? `${cur} ${w}` : w;
        const width = font.widthOfTextAtSize(candidate, size);
        if (width <= maxWidth) {
          cur = candidate;
          continue;
        }

        if (!cur && font.widthOfTextAtSize(w, size) > maxWidth) {
          let chunk = '';
          for (const ch of w) {
            const cand2 = chunk + ch;
            if (font.widthOfTextAtSize(cand2, size) <= maxWidth || !chunk) chunk = cand2;
            else {
              out.push(chunk);
              chunk = ch;
            }
          }
          if (chunk) out.push(chunk);
          continue;
        }

        flush();
        cur = w;
      }

      flush();
    }

    return out;
  }

  function sanitizeFileNameForDownload(name: string): string {
    let s = String(name || '');
    s = s.replace(/[\u0000-\u001F\u007F]/g, '');
    s = s.replace(/[\\/:*?"<>|]/g, '');
    s = s.trim();
    s = s.replace(/[. ]+$/g, '');
    return s || 'order';
  }

  function buildOrderPdfFileName(opts: { orderNumber: string; projectName: string }): string {
    const order = String(opts.orderNumber || '').trim();
    const proj = String(opts.projectName || '').trim();
    const base = sanitizeFileNameForDownload(`${order}${proj}`);
    return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  }

  return {
    wrapTextToWidth,
    sanitizeFileNameForDownload,
    buildOrderPdfFileName,
  };
}
