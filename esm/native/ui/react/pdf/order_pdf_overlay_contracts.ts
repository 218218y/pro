export type OrderPdfSketchAnnotationPageKey = 'renderSketch' | 'openClosed';

export type OrderPdfSketchStrokeTool = 'pen' | 'marker' | 'eraser' | 'line' | 'square' | 'circle' | 'ellipse';
export type OrderPdfSketchTool = OrderPdfSketchStrokeTool | 'text';

export type OrderPdfSketchPoint = {
  x: number;
  y: number;
};

export type OrderPdfSketchStroke = {
  id?: string;
  createdAt?: number;
  tool: OrderPdfSketchStrokeTool;
  color: string;
  width: number;
  points: OrderPdfSketchPoint[];
};

export type OrderPdfSketchTextBox = {
  id: string;
  createdAt: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fontSize: number;
  bold?: boolean;
  text: string;
};

export type OrderPdfSketchAnnotationLayer = {
  strokes: OrderPdfSketchStroke[];
  textBoxes?: OrderPdfSketchTextBox[];
};

export type OrderPdfSketchAnnotations = Partial<
  Record<OrderPdfSketchAnnotationPageKey, OrderPdfSketchAnnotationLayer>
>;

export type OrderPdfSketchPreviewEntry = {
  key: OrderPdfSketchAnnotationPageKey;
  label: string;
  url: string;
  width: number;
  height: number;
  pageIndex: number;
};

export type OrderPdfDraft = {
  projectName: string;
  orderNumber: string;
  orderDate: string;

  // Customer details (template fields)
  deliveryAddress: string; // כתובת מלאה לאספקה
  phone: string; // טלפון
  mobile: string; // נייד

  autoDetails: string;
  // "Details" (פרוט הזמנה) is now fully user-editable.
  // For backward compatibility we keep the old field names (manualDetails/manualDetailsHtml)
  // but they now represent the *entire* details box content.
  manualDetails: string;
  manualDetailsHtml?: string;

  // When true, manualDetails contains the full details text (not just additions).
  // Older drafts without this flag are treated as the previous "auto + additions" mode.
  detailsFull?: boolean;

  // Used to avoid overwriting the user's edits when refreshing auto data.
  detailsTouched?: boolean;
  detailsSeed?: string;

  // Kept for compatibility with older UI/state, but no longer required.
  manualEnabled: boolean;

  notes: string; // הערות
  // Rich HTML for notes (optional). `notes` stays as plain text.
  notesHtml?: string;

  // Which image sets to include in export (default: both).
  includeRenderSketch?: boolean; // הדמיה/סקיצה
  includeOpenClosed?: boolean; // פתוח/סגור

  // Lightweight freehand annotations painted on the sketch preview pages.
  sketchAnnotations?: OrderPdfSketchAnnotations;
};

export type InlineDetailsConfirmState = {
  open: boolean;
  title: string;
  message: string;
  preview: string;
  okLabel?: string;
  cancelLabel?: string;
  nextOk: OrderPdfDraft | null;
  nextCancel: OrderPdfDraft | null;
  toastOk?: { text: string; kind?: 'success' | 'error' | 'info' };
  toastCancel?: { text: string; kind?: 'success' | 'error' | 'info' };
};

export type OrderPdfOverlayDraftActionKind =
  | 'initial-load'
  | 'refresh-auto'
  | 'confirm-inline-ok'
  | 'confirm-inline-cancel';

export type OrderPdfOverlayDraftActionReason = 'not-ready' | 'cancelled' | 'error';

export type OrderPdfOverlayDraftActionResult = {
  ok: boolean;
  kind: OrderPdfOverlayDraftActionKind;
  reason?: OrderPdfOverlayDraftActionReason;
  detail?: string;
  next?: OrderPdfDraft | null;
  detailsDirty?: boolean;
  confirm?: InlineDetailsConfirmState | null;
  closeRequested?: boolean;
};

export type PdfJsVerbosityLevelLike = { ERRORS?: number; WARNINGS?: number };

export type PdfJsGlobalWorkerOptionsLike = { workerSrc?: string };

export type PdfJsViewportLike = Record<string, unknown> & {
  width: number;
  height: number;
};

export type PdfJsGetViewportOptionsLike = {
  scale: number;
  rotation?: number;
  dontFlip?: boolean;
};

export type PdfJsRenderTaskLike = Record<string, unknown> & {
  promise: Promise<unknown>;
  cancel?: () => void;
};

export type PdfJsRenderOptionsLike = Record<string, unknown> & {
  canvasContext: unknown;
  viewport: PdfJsViewportLike;
};

export type PdfJsGetDocumentOptionsLike = Record<string, unknown> & {
  data?: Uint8Array | ArrayBuffer | null;
  url?: string;
  disableWorker?: boolean;
  verbosity?: number;
};

export type PdfJsPageLike = Record<string, unknown> & {
  view?: number[];
  getViewport?: (opts: PdfJsGetViewportOptionsLike) => PdfJsViewportLike;
  render?: (opts: PdfJsRenderOptionsLike) => PdfJsRenderTaskLike;
};

export type PdfJsDocumentLike = Record<string, unknown> & {
  getPage: (pageNumber: number) => Promise<PdfJsPageLike>;
  destroy?: () => void;
};

export type PdfJsLoadingTaskLike = Record<string, unknown> & {
  promise: Promise<PdfJsDocumentLike>;
  destroy?: () => void;
};

export type PdfJsPageViewportFn = NonNullable<PdfJsPageLike['getViewport']>;
export type PdfJsPageRenderFn = NonNullable<PdfJsPageLike['render']>;

export type PdfLibTextSetter = (text: string) => unknown;
export type PdfLibRemovePageFn = (pageIndex: number) => unknown;
export type PdfLibCopyPagesFn = (fromDoc: unknown, pageIndexes: number[]) => Promise<unknown[]> | unknown[];

export type PdfJsLibLike = {
  getDocument: (opts: PdfJsGetDocumentOptionsLike) => PdfJsLoadingTaskLike;
  GlobalWorkerOptions?: PdfJsGlobalWorkerOptionsLike;
  VerbosityLevel?: PdfJsVerbosityLevelLike;
  setVerbosityLevel?: (lvl: number) => void;
  verbosity?: number;
  PDFJS?: { verbosity?: number };
};

export type InteractivePdfBuildResult = { blob: Blob; fileName: string; projectName: string };

export type OrderPdfOverlayActionKind =
  | 'load-pdf'
  | 'export-interactive'
  | 'export-image-pdf'
  | 'export-gmail'
  | 'export-download-gmail';

export type OrderPdfOverlayActionReason = 'not-ready' | 'busy' | 'invalid-file' | 'error';

export type LoadPdfActionResult =
  | { ok: true; kind: 'load-pdf'; fieldsFound: boolean }
  | { ok: false; kind: 'load-pdf'; reason: 'busy' | 'invalid-file' | 'error'; detail?: string };

export type ExportInteractiveActionResult =
  | { ok: true; kind: 'export-interactive'; downloadStarted: boolean }
  | { ok: false; kind: 'export-interactive'; reason: 'busy' | 'not-ready' | 'error'; detail?: string };

export type ExportImagePdfActionResult =
  | { ok: true; kind: 'export-image-pdf'; downloadStarted: boolean }
  | { ok: false; kind: 'export-image-pdf'; reason: 'busy' | 'not-ready' | 'error'; detail?: string };

export type ExportGmailActionResult =
  | { ok: true; kind: 'export-gmail'; gmailOpened: boolean; downloadStarted?: boolean }
  | { ok: false; kind: 'export-gmail'; reason: 'busy' | 'not-ready' | 'error'; detail?: string };

export type ExportDownloadGmailActionResult =
  | { ok: true; kind: 'export-download-gmail'; gmailOpened: boolean; downloadStarted?: boolean }
  | { ok: false; kind: 'export-download-gmail'; reason: 'busy' | 'not-ready' | 'error'; detail?: string };

export type OrderPdfOverlayActionResult =
  | LoadPdfActionResult
  | ExportInteractiveActionResult
  | ExportImagePdfActionResult
  | ExportGmailActionResult
  | ExportDownloadGmailActionResult;
