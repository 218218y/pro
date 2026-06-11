import {
  extractTextPartsFromHtmlMarkers,
  locateAutoRegionByAnchors,
} from './order_pdf_overlay_text_regions.js';
import { normalizeForCompare, normalizeNewlines } from './order_pdf_overlay_text_shared.js';
import {
  mergeDetectedAutoRegion,
  type AutoDetailsMergeKind,
} from './order_pdf_overlay_text_details_merge_support.js';

export type AutoDetailsMergeResult = {
  kind: AutoDetailsMergeKind;
  cleanText: string;
  keepText: string;
  cleanAutoRegion: string;
  keepAutoRegion: string;
  preview: string;
};

export function mergeAutoDetailsWithInlineManual(opts: {
  prevText: string;
  prevHtml: string;
  doc: Document | null;
  prevAuto: string;
  prevSeed: string;
  newAuto: string;
}): AutoDetailsMergeResult {
  const prevText = normalizeNewlines(opts.prevText || '');
  const prevHtml = String(opts.prevHtml || '');
  const newAuto = normalizeNewlines(opts.newAuto || '');
  const prevAuto = normalizeNewlines(opts.prevAuto || '');
  const prevSeed = normalizeNewlines(opts.prevSeed || '');
  const base = prevAuto || prevSeed;

  if (!prevText) {
    return {
      kind: 'none',
      cleanText: newAuto,
      keepText: newAuto,
      cleanAutoRegion: newAuto,
      keepAutoRegion: newAuto,
      preview: '',
    };
  }

  if (base && normalizeForCompare(prevText) === normalizeForCompare(base)) {
    return {
      kind: 'none',
      cleanText: newAuto,
      keepText: newAuto,
      cleanAutoRegion: newAuto,
      keepAutoRegion: newAuto,
      preview: '',
    };
  }

  const partsFromMarkers = extractTextPartsFromHtmlMarkers(opts.doc, prevHtml);
  if (partsFromMarkers) {
    let autoLike = partsFromMarkers.auto;

    if (base && autoLike) {
      const baseFirst =
        normalizeNewlines(base)
          .split('\n')
          .map(l => (l || '').trim())
          .find(l => l.length > 0) || '';
      if (baseFirst) {
        const stripped = autoLike.replace(/^(?:[ \t]*\n)+/, '');
        if (stripped.startsWith(baseFirst)) autoLike = stripped;
      }
    }

    if (!base) {
      const nextText = partsFromMarkers.prefix + newAuto + partsFromMarkers.suffix;
      return {
        kind: 'none',
        cleanText: nextText,
        keepText: nextText,
        cleanAutoRegion: newAuto,
        keepAutoRegion: newAuto,
        preview: '',
      };
    }

    return mergeDetectedAutoRegion({
      base,
      detected: {
        prefix: partsFromMarkers.prefix,
        autoLike,
        suffix: partsFromMarkers.suffix,
      },
      newAuto,
    });
  }

  if (base) {
    const idx = prevText.indexOf(base);
    if (idx >= 0) {
      const clean = prevText.slice(0, idx) + newAuto + prevText.slice(idx + base.length);
      return {
        kind: 'none',
        cleanText: clean,
        keepText: clean,
        cleanAutoRegion: newAuto,
        keepAutoRegion: newAuto,
        preview: '',
      };
    }
  }

  if (base) {
    const region = locateAutoRegionByAnchors(prevText, base);
    if (region) {
      return mergeDetectedAutoRegion({ base, detected: region, newAuto });
    }
  }

  return {
    kind: 'ambiguous',
    cleanText: newAuto,
    keepText: prevText,
    cleanAutoRegion: newAuto,
    keepAutoRegion: prevText,
    preview: '',
  };
}
