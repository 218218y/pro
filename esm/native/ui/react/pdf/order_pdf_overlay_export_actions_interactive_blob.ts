import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import type { PdfImportApi } from './order_pdf_overlay_controller_shared.js';
import type { OrderPdfOverlayInteractivePdfBlobBuilder } from './order_pdf_overlay_export_actions_types.js';
import {
  buildOrderPdfSketchPreviewBlobCacheSignature,
  clearOrderPdfSketchPreviewBlobCache,
  readOrderPdfSketchPreviewBlobCache,
  writeOrderPdfSketchPreviewBlobCache,
} from './order_pdf_overlay_sketch_preview_blob_cache.js';

export function useOrderPdfOverlayInteractivePdfBlobBuilder(args: {
  app: unknown;
  winMaybe: Window | null;
  draft: OrderPdfDraft | null;
  pdfSourceTick: number;
  loadedPdfOriginalBytesRef: MutableRefObject<Uint8Array | null>;
  loadedPdfTailNonFormPageIndexesRef: MutableRefObject<number[]>;
  pdfImportApi: Pick<PdfImportApi, 'buildInteractivePdfBlobForEditorDraft'>;
}): OrderPdfOverlayInteractivePdfBlobBuilder {
  const {
    app,
    winMaybe,
    draft,
    pdfSourceTick,
    loadedPdfOriginalBytesRef,
    loadedPdfTailNonFormPageIndexesRef,
    pdfImportApi,
  } = args;

  const previewBlobCacheRef = useRef<{
    signature: string;
    blob: Blob;
    fileName: string;
    projectName: string;
  } | null>(null);

  useEffect(() => {
    if (draft) return;
    clearOrderPdfSketchPreviewBlobCache(previewBlobCacheRef);
  }, [draft]);

  return useCallback(
    async (nextDraft: OrderPdfDraft) => {
      const signature = buildOrderPdfSketchPreviewBlobCacheSignature({
        draft: nextDraft,
        pdfSourceTick,
        importedTailIndexes: loadedPdfTailNonFormPageIndexesRef.current || [],
        loadedPdfOriginalBytes: loadedPdfOriginalBytesRef.current,
      });
      const cached = readOrderPdfSketchPreviewBlobCache(previewBlobCacheRef, signature);
      if (cached) {
        return { blob: cached.blob, fileName: cached.fileName, projectName: cached.projectName };
      }

      const built = await pdfImportApi.buildInteractivePdfBlobForEditorDraft({
        app,
        winMaybe,
        draft: nextDraft,
        loadedPdfOriginalBytes: loadedPdfOriginalBytesRef.current,
        importedTailIndexes: loadedPdfTailNonFormPageIndexesRef.current || [],
      });

      writeOrderPdfSketchPreviewBlobCache(previewBlobCacheRef, {
        signature,
        blob: built.blob,
        fileName: built.fileName,
        projectName: built.projectName,
      });
      return built;
    },
    [
      app,
      winMaybe,
      pdfSourceTick,
      loadedPdfOriginalBytesRef,
      loadedPdfTailNonFormPageIndexesRef,
      pdfImportApi,
    ]
  );
}
