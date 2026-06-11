import {
  buildPreviewFromInsertions,
  applyInsertionsToNewAuto,
  extractInsertionsGreedy,
} from './order_pdf_overlay_text_insertions.js';
import { normalizeForCompare, normalizeNewlines } from './order_pdf_overlay_text_shared.js';
import {
  appendInlineExtra,
  applyLineSuffixesToNewAuto,
  collectDetailsLines,
  extractManualTailFromValue,
  injectExtraLinesPreservingPositions,
  parseDetailsLine,
  rehydrateLineBreaksUsingLabels,
  splitInlineTailsIntoExtraLines,
} from './order_pdf_overlay_text_details_lines.js';

export type AutoDetailsMergeKind = 'none' | 'inline' | 'ambiguous';

export type DetectedAutoRegion = {
  prefix: string;
  autoLike: string;
  suffix: string;
};

export type AutoDetailsMergeResolvedResult = {
  kind: Exclude<AutoDetailsMergeKind, 'ambiguous'>;
  cleanText: string;
  keepText: string;
  cleanAutoRegion: string;
  keepAutoRegion: string;
  preview: string;
};

export function mergeAutoRegionByDetailsLinesBestEffort(
  baseAuto: string,
  modifiedAuto: string,
  newAuto: string
): { mergedAuto: string; preview: string } | null {
  const base = normalizeNewlines(baseAuto || '').trim();
  if (!base) return null;

  const baseCollected = collectDetailsLines(base);
  if (baseCollected.order.length < 1) return null;

  let modified = normalizeNewlines(modifiedAuto || '');
  const modifiedHadNewlines = modified.indexOf('\n') >= 0;
  modified = rehydrateLineBreaksUsingLabels(modified, baseCollected.labelsInOrder);
  modified = splitInlineTailsIntoExtraLines({
    text: modified,
    baseCollected,
    aggressive: !modifiedHadNewlines,
  });

  const modCollected = collectDetailsLines(modified);
  const extraByKey: Record<string, string> = {};
  const changedKeys: string[] = [];

  for (const k of baseCollected.order) {
    const b = baseCollected.byKey[k];
    const m = modCollected.byKey[k];
    if (!b || !m) continue;

    const bVal = b.value || '';
    const mVal = m.value || '';
    if (normalizeForCompare(mVal) === normalizeForCompare(bVal)) continue;

    const extra = extractManualTailFromValue(bVal, mVal);
    if (extra) {
      extraByKey[k] = extra;
      changedKeys.push(k);
    }
  }

  const outLines = normalizeNewlines(newAuto || '')
    .split('\n')
    .map(ln => {
      const info = parseDetailsLine(ln);
      if (!info) return ln;

      const extra = extraByKey[info.key];
      if (!extra || info.value.endsWith(extra)) return ln;
      return info.prefix + appendInlineExtra(info.value, extra);
    });

  let mergedAuto = outLines.join('\n');
  const injected = injectExtraLinesPreservingPositions({
    mergedAuto,
    baseCollected,
    modifiedText: modified,
    newAuto,
  });
  mergedAuto = injected.mergedAuto;

  const previewParts: string[] = [];
  if (changedKeys.length) previewParts.push(`שורות ששונו: ${changedKeys.join(', ')}`);

  const snippet = changedKeys
    .slice(0, 2)
    .map(k => {
      const b = baseCollected.byKey[k];
      const extra = extraByKey[k] || '';
      const label = b ? b.label : k;
      const s = extra.trim().replace(/\s+/g, ' ').slice(0, 70);
      return s ? `${label}: ${s}` : label;
    })
    .filter(Boolean)
    .join(' | ');
  if (snippet) previewParts.push(snippet);

  const extraPreview = injected.extrasList
    .map(s => (s || '').trim())
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s.replace(/\s+/g, ' ').slice(0, 70))
    .filter(Boolean)
    .join(' | ');
  if (extraPreview) previewParts.push(`תוספות: ${extraPreview}`);

  return { mergedAuto, preview: previewParts.join('\n').slice(0, 220) };
}

export function tryMergeAutoRegionByLines(
  baseAuto: string,
  modifiedAuto: string,
  newAuto: string
): { unsafe: boolean; mergedAuto: string; preview: string } | null {
  const base = normalizeNewlines(baseAuto || '').trim();
  if (!base) return null;

  const baseCollected = collectDetailsLines(base);
  if (baseCollected.order.length < 2) return null;

  let modified = normalizeNewlines(modifiedAuto || '');
  const modifiedHadNewlines = modified.indexOf('\n') >= 0;
  modified = rehydrateLineBreaksUsingLabels(modified, baseCollected.labelsInOrder);
  modified = splitInlineTailsIntoExtraLines({
    text: modified,
    baseCollected,
    aggressive: !modifiedHadNewlines,
  });

  const modCollected = collectDetailsLines(modified);
  const suffixByKey: Record<string, string> = {};
  const unsafeKeys: string[] = [];
  let unsafe = false;

  const extraKeys = Object.keys(modCollected.byKey).filter(k => !baseCollected.byKey[k]);
  if (extraKeys.length) unsafe = true;

  for (const k of baseCollected.order) {
    const b = baseCollected.byKey[k];
    const m = modCollected.byKey[k];
    if (!b || !m) continue;

    const bVal = b.value || '';
    const mVal = m.value || '';
    if (normalizeForCompare(mVal) === normalizeForCompare(bVal)) continue;

    if (mVal.startsWith(bVal)) {
      const suffix = mVal.slice(bVal.length);
      if (suffix) {
        if (suffix.indexOf('\n') >= 0) {
          unsafe = true;
          unsafeKeys.push(k);
        } else {
          suffixByKey[k] = suffix;
        }
      }
      continue;
    }

    unsafe = true;
    unsafeKeys.push(k);
  }

  if (unsafe) {
    const parts: string[] = [];
    if (unsafeKeys.length) parts.push(`שורות בעייתיות: ${unsafeKeys.join(', ')}`);
    if (extraKeys.length) parts.push(`שורות חדשות: ${extraKeys.join(', ')}`);
    const nonKeyPreview = modCollected.nonKeyLines
      .map(l => (l || '').trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(' | ');
    if (nonKeyPreview) parts.push(`תוספות: ${nonKeyPreview}`);

    const preview = parts.join('\n').slice(0, 220);
    return { unsafe: true, mergedAuto: normalizeNewlines(newAuto || ''), preview };
  }

  let mergedAuto = applyLineSuffixesToNewAuto(newAuto, suffixByKey);
  mergedAuto = injectExtraLinesPreservingPositions({
    mergedAuto,
    baseCollected,
    modifiedText: modified,
    newAuto,
  }).mergedAuto;
  return { unsafe: false, mergedAuto, preview: '' };
}

function finalizeInlineMergeResult(
  base: string,
  detectedAuto: string,
  newAuto: string,
  prefix: string,
  suffix: string,
  byLines: { unsafe: boolean; mergedAuto: string; preview: string } | null,
  lineWise: { mergedAuto: string; preview: string } | null,
  preview: string
): AutoDetailsMergeResolvedResult {
  const differs = normalizeForCompare(detectedAuto) !== normalizeForCompare(base);
  const hasInlineManual = byLines && byLines.unsafe ? true : !!preview || differs;

  const cleanAutoRegion = newAuto;
  const keepAutoRegion = hasInlineManual
    ? byLines && byLines.unsafe && lineWise
      ? lineWise.mergedAuto
      : applyInsertionsToNewAuto(base, extractInsertionsGreedy(base, detectedAuto), newAuto)
    : newAuto;

  const cleanText = prefix + cleanAutoRegion + suffix;
  const keepText = prefix + keepAutoRegion + suffix;

  return {
    kind: hasInlineManual ? 'inline' : 'none',
    cleanText,
    keepText,
    cleanAutoRegion,
    keepAutoRegion,
    preview: preview ? `${preview}${preview.length >= 220 ? '…' : ''}` : '',
  };
}

export function mergeDetectedAutoRegion(args: {
  base: string;
  detected: DetectedAutoRegion;
  newAuto: string;
}): AutoDetailsMergeResolvedResult {
  const { base, detected } = args;
  const newAuto = normalizeNewlines(args.newAuto || '');
  const normalizedBase = normalizeNewlines(base || '');
  const detectedAuto = normalizeNewlines(detected.autoLike || '');
  const byLines = tryMergeAutoRegionByLines(normalizedBase, detectedAuto, newAuto);
  if (byLines && !byLines.unsafe) {
    const autoRegion = byLines.mergedAuto;
    const nextText = detected.prefix + autoRegion + detected.suffix;
    return {
      kind: 'none',
      cleanText: nextText,
      keepText: nextText,
      cleanAutoRegion: autoRegion,
      keepAutoRegion: autoRegion,
      preview: '',
    };
  }

  const lineWise = mergeAutoRegionByDetailsLinesBestEffort(normalizedBase, detectedAuto, newAuto);
  const insertions = extractInsertionsGreedy(normalizedBase, detectedAuto);
  const preview =
    (lineWise && lineWise.preview) ||
    (byLines && byLines.unsafe && byLines.preview ? byLines.preview : '') ||
    buildPreviewFromInsertions(insertions);

  return finalizeInlineMergeResult(
    normalizedBase,
    detectedAuto,
    newAuto,
    detected.prefix,
    detected.suffix,
    byLines,
    lineWise,
    preview
  );
}
