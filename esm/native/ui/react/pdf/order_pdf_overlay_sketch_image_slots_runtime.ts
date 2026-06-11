import type { OrderPdfDraft, OrderPdfSketchAnnotationPageKey } from './order_pdf_overlay_contracts.js';

export type OrderPdfSketchImageSlotKey = OrderPdfSketchAnnotationPageKey;
export type OrderPdfSketchImageDraftFlag = 'includeRenderSketch' | 'includeOpenClosed';
export type OrderPdfSketchImageDraftFlags = Pick<OrderPdfDraft, OrderPdfSketchImageDraftFlag>;

type OrderPdfSketchImageSlotSpec = {
  key: OrderPdfSketchImageSlotKey;
  draftFlag: OrderPdfSketchImageDraftFlag;
  previewLabel: string;
  toolbarLabel: string;
};

export type OrderPdfImportedImageFlags = {
  hasImportedPdfImages: boolean;
  hasImportedPdfRenderImage: boolean;
  hasImportedPdfOpenImage: boolean;
};

export type OrderPdfSketchImageToolbarState = {
  title: string;
  suffix: '' | ' (סקיצה)' | ' (PDF)';
};

export type OrderPdfSketchImageAppendPlanEntry = {
  key: OrderPdfSketchImageSlotKey | null;
  source: 'built' | 'imported';
  pageIndex: number;
};

const ORDER_PDF_SKETCH_IMAGE_SLOT_SPECS: readonly OrderPdfSketchImageSlotSpec[] = Object.freeze([
  {
    key: 'renderSketch',
    draftFlag: 'includeRenderSketch',
    previewLabel: 'הדמיה / סקיצה',
    toolbarLabel: 'הדמיה/סקיצה',
  },
  {
    key: 'openClosed',
    draftFlag: 'includeOpenClosed',
    previewLabel: 'פתוח / סגור',
    toolbarLabel: 'פתוח/סגור',
  },
]);

function normalizePageIndexes(pageIndexes: readonly number[] | null | undefined): number[] {
  return Array.isArray(pageIndexes) ? pageIndexes.filter(idx => Number.isInteger(idx) && idx >= 0) : [];
}

export function listOrderPdfSketchImageSlotSpecs(): readonly OrderPdfSketchImageSlotSpec[] {
  return ORDER_PDF_SKETCH_IMAGE_SLOT_SPECS;
}

export function readOrderPdfSketchImageSlotSpec(
  key: OrderPdfSketchImageSlotKey
): OrderPdfSketchImageSlotSpec {
  return (
    ORDER_PDF_SKETCH_IMAGE_SLOT_SPECS.find(spec => spec.key === key) || ORDER_PDF_SKETCH_IMAGE_SLOT_SPECS[0]!
  );
}

export function readOrderPdfSketchImageDraftFlagValue(args: {
  value: unknown;
  preserveUndefined?: boolean;
}): boolean | undefined {
  if (typeof args.value === 'boolean') return args.value;
  return args.preserveUndefined ? undefined : true;
}

export function readOrderPdfSketchImageDraftFlags(args: {
  source: Partial<Record<OrderPdfSketchImageDraftFlag, unknown>> | null | undefined;
  preserveUndefinedFlags?: boolean;
}): OrderPdfSketchImageDraftFlags {
  const source = args.source || {};
  const preserveUndefined = !!args.preserveUndefinedFlags;
  return {
    includeRenderSketch: readOrderPdfSketchImageDraftFlagValue({
      value: source.includeRenderSketch,
      preserveUndefined,
    }),
    includeOpenClosed: readOrderPdfSketchImageDraftFlagValue({
      value: source.includeOpenClosed,
      preserveUndefined,
    }),
  };
}

export function resolveOrderPdfSketchImageDraftFlags(
  source: Partial<Record<OrderPdfSketchImageDraftFlag, unknown>> | null | undefined
): Required<OrderPdfSketchImageDraftFlags> {
  const flags = readOrderPdfSketchImageDraftFlags({ source, preserveUndefinedFlags: false });
  return {
    includeRenderSketch: flags.includeRenderSketch !== false,
    includeOpenClosed: flags.includeOpenClosed !== false,
  };
}

export function readOrderPdfSketchImageSlotEnabled(
  draft: Pick<OrderPdfDraft, OrderPdfSketchImageDraftFlag> | null | undefined,
  key: OrderPdfSketchImageSlotKey
): boolean {
  const spec = readOrderPdfSketchImageSlotSpec(key);
  return resolveOrderPdfSketchImageDraftFlags(draft)[spec.draftFlag];
}

export function resolveOrderPdfImportedImageFlags(
  importedPdfImagePageCount: number
): OrderPdfImportedImageFlags {
  const count = Math.max(0, Number(importedPdfImagePageCount) || 0);
  return {
    hasImportedPdfImages: count > 0,
    hasImportedPdfRenderImage: count >= 1,
    hasImportedPdfOpenImage: count >= 2,
  };
}

export function resolveOrderPdfSketchImageOptionsTitle(hasImportedPdfImages: boolean): string {
  return hasImportedPdfImages
    ? 'בחירת תמונות לייצוא: כבוי = לשמור את התמונה שהגיעה מה-PDF, דלוק = ליצור תמונה חדשה מהסקיצה'
    : 'בחירת תמונות לייצוא';
}

export function resolveOrderPdfSketchImageToolbarState(args: {
  key: OrderPdfSketchImageSlotKey;
  hasImportedPdfImage: boolean;
  enabled: boolean;
}): OrderPdfSketchImageToolbarState {
  const spec = readOrderPdfSketchImageSlotSpec(args.key);
  if (!args.hasImportedPdfImage) {
    return {
      title: `${spec.toolbarLabel} מהסקיצה הנוכחית`,
      suffix: '',
    };
  }
  return args.enabled
    ? {
        title: `ישתמש בתמונה חדשה מהסקיצה (${spec.toolbarLabel})`,
        suffix: ' (סקיצה)',
      }
    : {
        title: `ישמור את התמונה שהגיעה מה-PDF (${spec.toolbarLabel})`,
        suffix: ' (PDF)',
      };
}

export function resolveOrderPdfSketchImageTailPageMap(
  tailPageIndexes: readonly number[] | null | undefined
): Partial<Record<OrderPdfSketchImageSlotKey, number>> {
  const queue = normalizePageIndexes(tailPageIndexes);
  const out: Partial<Record<OrderPdfSketchImageSlotKey, number>> = {};
  ORDER_PDF_SKETCH_IMAGE_SLOT_SPECS.forEach((spec, index) => {
    if (typeof queue[index] === 'number') out[spec.key] = queue[index];
  });
  return out;
}

export function applyOrderPdfImportedImageDefaultsToDraft(args: {
  draft: OrderPdfDraft;
  importedTailPageIndexes: readonly number[] | null | undefined;
}): OrderPdfDraft {
  const tailMap = resolveOrderPdfSketchImageTailPageMap(args.importedTailPageIndexes);
  let next: OrderPdfDraft | null = null;
  for (const spec of ORDER_PDF_SKETCH_IMAGE_SLOT_SPECS) {
    if (typeof tailMap[spec.key] !== 'number') continue;
    if (args.draft[spec.draftFlag] === false) continue;
    if (!next) next = { ...args.draft };
    next[spec.draftFlag] = false;
  }
  return next || args.draft;
}

export function buildOrderPdfSketchImageSelectionSignature(
  draft: Pick<OrderPdfDraft, OrderPdfSketchImageDraftFlag> | null | undefined,
  pdfSourceTick: number
): string {
  const flags = resolveOrderPdfSketchImageDraftFlags(draft);
  const parts: string[] = ORDER_PDF_SKETCH_IMAGE_SLOT_SPECS.map(spec => (flags[spec.draftFlag] ? '1' : '0'));
  parts.push(String(Number.isFinite(pdfSourceTick) ? pdfSourceTick : 0));
  return parts.join(':');
}

export function resolveOrderPdfSketchImageAppendPlan(args: {
  draft: Pick<OrderPdfDraft, OrderPdfSketchImageDraftFlag> | null | undefined;
  builtTailPageIndexes: readonly number[] | null | undefined;
  importedTailPageIndexes: readonly number[] | null | undefined;
}): OrderPdfSketchImageAppendPlanEntry[] {
  const builtQueue = normalizePageIndexes(args.builtTailPageIndexes);
  const importedQueue = normalizePageIndexes(args.importedTailPageIndexes);
  const out: OrderPdfSketchImageAppendPlanEntry[] = [];

  ORDER_PDF_SKETCH_IMAGE_SLOT_SPECS.forEach((spec, index) => {
    const builtPageIndex = builtQueue[index];
    const importedPageIndex = importedQueue[index];
    const enabled = readOrderPdfSketchImageSlotEnabled(args.draft, spec.key);
    if (enabled && typeof builtPageIndex === 'number') {
      out.push({ key: spec.key, source: 'built', pageIndex: builtPageIndex });
      return;
    }
    if (typeof importedPageIndex === 'number') {
      out.push({ key: spec.key, source: 'imported', pageIndex: importedPageIndex });
      return;
    }
    if (typeof builtPageIndex === 'number') {
      out.push({ key: spec.key, source: 'built', pageIndex: builtPageIndex });
    }
  });

  for (let index = ORDER_PDF_SKETCH_IMAGE_SLOT_SPECS.length; index < importedQueue.length; index += 1) {
    const pageIndex = importedQueue[index];
    if (typeof pageIndex === 'number') out.push({ key: null, source: 'imported', pageIndex });
  }

  for (let index = ORDER_PDF_SKETCH_IMAGE_SLOT_SPECS.length; index < builtQueue.length; index += 1) {
    const pageIndex = builtQueue[index];
    if (typeof pageIndex === 'number') out.push({ key: null, source: 'built', pageIndex });
  }

  return out;
}
