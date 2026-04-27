export type OrderPdfPreparedTextLayout = {
  lines: string[];
  drawLines: string[];
  maxLines: number;
  maxW: number;
  maxH: number;
  pad: number;
  lineGap: number;
  lineH: number;
};

export function getOrderPdfTextBoxMetrics(boxPx: { w: number; h: number }, fontPx: number) {
  const pad = Math.max(1, Math.round(fontPx * 0.25));
  const lineGap = Math.max(2, Math.round(fontPx * 0.25));
  const lineH = fontPx + lineGap;
  const maxW = Math.max(1, boxPx.w - pad * 2);
  const maxH = Math.max(1, boxPx.h - pad * 2);
  const maxLines = Math.max(1, Math.floor(maxH / lineH));
  return { pad, lineGap, lineH, maxW, maxH, maxLines };
}

export function wrapOrderPdfCanvasText(
  ctx: Pick<CanvasRenderingContext2D, 'measureText'>,
  text: string,
  maxW: number
): string[] {
  const out: string[] = [];
  const widthCache = new Map<string, number>();
  const measureWidth = (value: string) => {
    const cached = widthCache.get(value);
    if (typeof cached === 'number') return cached;
    const width = ctx.measureText(value).width;
    widthCache.set(value, width);
    return width;
  };
  const normalized = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const paragraphs = normalized.split('\n');

  const pushWrappedLine = (line: string) => {
    if (!line) {
      out.push('');
      return;
    }
    const words = line.split(/[ \t\u00A0]+/g);
    let current = '';
    const flush = () => {
      if (current !== '') out.push(current);
      current = '';
    };

    for (const word of words) {
      if (!word) continue;
      const next = current ? `${current} ${word}` : word;
      const width = measureWidth(next);
      if (width <= maxW) {
        current = next;
        continue;
      }
      if (!current) {
        let acc = '';
        for (const ch of word) {
          const nextAcc = acc + ch;
          if (measureWidth(nextAcc) <= maxW || !acc) {
            acc = nextAcc;
          } else {
            out.push(acc);
            acc = ch;
          }
        }
        if (acc) out.push(acc);
        current = '';
        continue;
      }
      flush();
      current = word;
    }
    flush();
  };

  for (const paragraph of paragraphs) {
    const line = String(paragraph || '');
    if (!line.trim()) {
      out.push('');
      continue;
    }
    pushWrappedLine(line);
  }

  return out;
}

export function prepareOrderPdfTextLayout(args: {
  ctx: Pick<CanvasRenderingContext2D, 'measureText'>;
  boxPx: { w: number; h: number };
  text: string;
  fontPx: number;
  multiline?: boolean;
}): OrderPdfPreparedTextLayout {
  const { ctx, boxPx, text, fontPx, multiline } = args;
  const metrics = getOrderPdfTextBoxMetrics(boxPx, fontPx);
  const lines = multiline ? wrapOrderPdfCanvasText(ctx, text, metrics.maxW) : [String(text || '')];
  return {
    ...metrics,
    lines,
    drawLines: lines.slice(0, metrics.maxLines),
  };
}
