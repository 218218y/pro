import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type {
  InlineDetailsConfirmState,
  OrderPdfDraft,
  PdfJsDocumentLike,
  PdfJsLibLike,
  PdfJsLoadingTaskLike,
} from './order_pdf_overlay_contracts.js';
import type { PdfJsPageReadyLike, PdfJsRenderTaskLike } from './order_pdf_overlay_pdf_render.js';
import type {
  DraftStateApi,
  ExportFactoryApi,
  GmailApi,
  InteractionApi,
  PdfImportApi,
  PdfRenderApi,
  RichEditorApi,
  RichProgrammaticApi,
  RuntimeApi,
  TextApi,
  UiFeedbackLike,
} from './order_pdf_overlay_controller_shared_domain.js';

export type OrderPdfOverlayControllerEnv = {
  app: unknown;
  fb: UiFeedbackLike;
  docMaybe: Document | null;
  winMaybe: Window | null;
  withV: (urls: string[]) => string[];
  pdfJsRealWorkerUrl: string;
};

export type OrderPdfOverlayControllerUi = {
  open: boolean;
  draftFromUi: unknown;
  zoomFromUi: number;
  draft: OrderPdfDraft | null;
  setDraft: Dispatch<SetStateAction<OrderPdfDraft | null>>;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  gmailBusy: boolean;
  setGmailBusy: Dispatch<SetStateAction<boolean>>;
  imagePdfBusy: boolean;
  setImagePdfBusy: Dispatch<SetStateAction<boolean>>;
  inlineConfirm: InlineDetailsConfirmState | null;
  setInlineConfirm: Dispatch<SetStateAction<InlineDetailsConfirmState | null>>;
  dragOver: boolean;
  setDragOver: Dispatch<SetStateAction<boolean>>;
  importedPdfImagePageCount: number;
  setImportedPdfImagePageCount: Dispatch<SetStateAction<number>>;
  pdfPageReadyTick: number;
  setPdfPageReadyTick: Dispatch<SetStateAction<number>>;
  pdfSourceTick: number;
  setPdfSourceTick: Dispatch<SetStateAction<number>>;
};

export type OrderPdfOverlayControllerRefs = {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  detailsRichRef: MutableRefObject<HTMLDivElement | null>;
  notesRichRef: MutableRefObject<HTMLDivElement | null>;
  orderNoInputRef: MutableRefObject<HTMLInputElement | null>;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  overlayRef: MutableRefObject<HTMLDivElement | null>;
  pdfFileInputRef: MutableRefObject<HTMLInputElement | null>;
  pdfJsRef: MutableRefObject<PdfJsLibLike | null>;
  pdfBytesRef: MutableRefObject<Uint8Array | null>;
  pdfTemplateBytesRef: MutableRefObject<Uint8Array | null>;
  loadedPdfOriginalBytesRef: MutableRefObject<Uint8Array | null>;
  loadedPdfTailNonFormPageIndexesRef: MutableRefObject<number[]>;
  pdfDocRef: MutableRefObject<PdfJsDocumentLike | null>;
  pdfDocTaskRef: MutableRefObject<PdfJsLoadingTaskLike | null>;
  pageRef: MutableRefObject<PdfJsPageReadyLike | null>;
  pageSizeRef: MutableRefObject<{ w: number; h: number } | null>;
  pdfRenderTaskRef: MutableRefObject<PdfJsRenderTaskLike | null>;
  pdfRenderQueueRef: MutableRefObject<Promise<void>>;
  pdfRenderReqIdRef: MutableRefObject<number>;
  lastLoadedPdfTickRef: MutableRefObject<number>;
  detailsDirtyRef: MutableRefObject<boolean>;
  detailsUserIntentRef: MutableRefObject<boolean>;
};

export type OrderPdfOverlayControllerActions = {
  close: () => void;
  persistDraft: (next: OrderPdfDraft) => void;
  seedInitialDraft: (next: OrderPdfDraft) => void;
};

export type OrderPdfOverlayControllerApis = {
  runtimeApi: RuntimeApi;
  textApi: TextApi;
  draftStateApi: DraftStateApi;
  pdfImportApi: PdfImportApi;
  interactionApi: InteractionApi;
  pdfRenderApi: PdfRenderApi;
  richEditorApi: RichEditorApi;
  exportFactoryApi: ExportFactoryApi;
  gmailApi: GmailApi;
  richProgrammaticApi: RichProgrammaticApi;
};

export type OrderPdfOverlayControllerArgs = {
  env: OrderPdfOverlayControllerEnv;
  ui: OrderPdfOverlayControllerUi;
  refs: OrderPdfOverlayControllerRefs;
  actions: OrderPdfOverlayControllerActions;
  apis: OrderPdfOverlayControllerApis;
};
