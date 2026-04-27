import { createDetachedHtmlRoot, readInnerHtml } from '../../dom_helpers.js';
import { orderPdfOverlayReportNonFatal } from './order_pdf_overlay_runtime.js';
import {
  htmlToTextPreserveNewlines,
  normalizeNewlines,
  textToHtml,
} from './order_pdf_overlay_text_shared.js';

export function buildDetailsHtmlWithMarkers(fullText: string, autoRegionText: string): string {
  const full = normalizeNewlines(fullText || '');
  const auto = normalizeNewlines(autoRegionText || '');
  if (!auto) return textToHtml(full);

  const idx = full.indexOf(auto);
  if (idx < 0) {
    const region = locateAutoRegionByAnchors(full, auto);
    if (!region) return textToHtml(full);
    return (
      textToHtml(region.prefix) +
      '<span data-wp-auto="start" contenteditable="false"></span>' +
      textToHtml(region.autoLike) +
      '<span data-wp-auto="end" contenteditable="false"></span>' +
      textToHtml(region.suffix)
    );
  }

  const prefix = full.slice(0, idx);
  const suffix = full.slice(idx + auto.length);

  return (
    textToHtml(prefix) +
    '<span data-wp-auto="start" contenteditable="false"></span>' +
    textToHtml(auto) +
    '<span data-wp-auto="end" contenteditable="false"></span>' +
    textToHtml(suffix)
  );
}

export function extractTextPartsFromHtmlMarkers(
  doc: Document | null,
  html: string
): { prefix: string; auto: string; suffix: string } | null {
  if (!doc) return null;
  const h = (html || '').trim();
  if (!h) return null;

  let root: HTMLDivElement | null = null;
  try {
    root = createDetachedHtmlRoot(doc, h);
  } catch {
    return null;
  }
  if (!root) return null;

  const start = root.querySelector('span[data-wp-auto="start"]');
  const end = root.querySelector('span[data-wp-auto="end"]');
  if (!start || !end) return null;

  try {
    const moveChildrenAfter = (markerEl: Element) => {
      try {
        const parent = markerEl.parentNode;
        if (!parent) return;
        const next = markerEl.nextSibling;
        const kids = Array.from(markerEl.childNodes || []);
        for (const k of kids) parent.insertBefore(k, next);
      } catch (__wpErr) {
        orderPdfOverlayReportNonFatal('L748', __wpErr);
      }
    };

    if (start.childNodes && start.childNodes.length) moveChildrenAfter(start);
    if (end.childNodes && end.childNodes.length) moveChildrenAfter(end);

    const prefixRange = doc.createRange();
    prefixRange.setStart(root, 0);
    prefixRange.setEndBefore(start);
    const prefixWrap = doc.createElement('div');
    prefixWrap.appendChild(prefixRange.cloneContents());
    const prefix = htmlToTextPreserveNewlines(doc, readInnerHtml(prefixWrap));

    const autoRange = doc.createRange();
    autoRange.setStartAfter(start);
    autoRange.setEndBefore(end);
    const autoWrap = doc.createElement('div');
    autoWrap.appendChild(autoRange.cloneContents());
    const auto = htmlToTextPreserveNewlines(doc, readInnerHtml(autoWrap));

    const suffixRange = doc.createRange();
    suffixRange.setStartAfter(end);
    suffixRange.setEnd(root, root.childNodes.length);
    const suffixWrap = doc.createElement('div');
    suffixWrap.appendChild(suffixRange.cloneContents());
    const suffixHtml = readInnerHtml(suffixWrap);
    let suffix = htmlToTextPreserveNewlines(doc, suffixHtml);

    const startsWithBlock =
      /^\s*<(div|p|li|tr|table|ul|ol)\b/i.test(suffixHtml) || /^\s*<br\b/i.test(suffixHtml);
    const prevEndsWithNl = (prefix + auto).endsWith('\n');
    if (suffix && startsWithBlock && !prevEndsWithNl && !suffix.startsWith('\n')) {
      suffix = '\n' + suffix;
    }

    const prefixClean = prefix.trim().length === 0 ? '' : prefix;
    return { prefix: prefixClean, auto, suffix };
  } catch {
    return null;
  }
}

export function locateAutoRegionByAnchors(
  prevText: string,
  base: string
): { prefix: string; autoLike: string; suffix: string } | null {
  const t = normalizeNewlines(prevText || '');
  const b = normalizeNewlines(base || '');
  if (!t || !b) return null;

  const linesRaw = b.split('\n').filter(l => l.trim().length >= 6);
  const startCandidates = linesRaw.slice(0, 6);
  const endCandidates = linesRaw.slice(Math.max(0, linesRaw.length - 6));

  let startIdx = -1;
  for (const ln of startCandidates) {
    const idx = t.indexOf(ln);
    if (idx >= 0 && (startIdx < 0 || idx < startIdx)) startIdx = idx;
  }

  let endIdx = -1;
  let endLine = '';
  for (const ln of endCandidates) {
    const idx = t.lastIndexOf(ln);
    if (idx >= 0 && (endIdx < 0 || idx > endIdx)) {
      endIdx = idx;
      endLine = ln;
    }
  }

  if (startIdx >= 0 && endIdx >= 0) {
    const autoStart = startIdx;
    const autoEnd = endIdx + endLine.length;
    if (autoStart < autoEnd) {
      return {
        prefix: t.slice(0, autoStart),
        autoLike: t.slice(autoStart, autoEnd),
        suffix: t.slice(autoEnd),
      };
    }
  }

  const anchorLen = Math.min(60, Math.max(20, Math.floor(b.length / 6) || 20));
  const startAnchor = b.slice(0, anchorLen);
  const endAnchor = b.slice(Math.max(0, b.length - anchorLen));

  const sIdx = t.indexOf(startAnchor);
  const eIdx = t.lastIndexOf(endAnchor);
  if (sIdx < 0 || eIdx < 0) return null;

  const aStart = sIdx;
  const aEnd = eIdx + endAnchor.length;
  if (aStart > aEnd) return null;

  return {
    prefix: t.slice(0, aStart),
    autoLike: t.slice(aStart, aEnd),
    suffix: t.slice(aEnd),
  };
}
