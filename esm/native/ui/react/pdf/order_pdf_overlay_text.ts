export {
  escapeHtml,
  htmlToTextPreserveNewlines,
  makeEmptyDraft,
  normalizeForCompare,
  normalizeNewlines,
  richEditorToText,
  safeStr,
  textToHtml,
} from './order_pdf_overlay_text_shared.js';

export {
  buildDetailsHtmlWithMarkers,
  extractTextPartsFromHtmlMarkers,
  locateAutoRegionByAnchors,
} from './order_pdf_overlay_text_regions.js';

export {
  applyInsertionsToNewAuto,
  buildPreviewFromInsertions,
  extractInsertionsGreedy,
} from './order_pdf_overlay_text_insertions.js';

export type { AutoDetailsMergeResult } from './order_pdf_overlay_text_details_merge.js';
export { mergeAutoDetailsWithInlineManual } from './order_pdf_overlay_text_details_merge.js';
