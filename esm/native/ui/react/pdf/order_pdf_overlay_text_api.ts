export type OrderPdfTextApi = {
  safeStr: (value: unknown) => string;
  textToHtml: (text: string) => string;
  htmlToTextPreserveNewlines: (doc: Document | null, html: string) => string;
  buildDetailsHtmlWithMarkers: (manualText: string, autoText: string) => string;
  normalizeForCompare: (text: string) => string;
};
