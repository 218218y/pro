import { useCallback, useMemo } from 'react';

import { getDocumentMaybe, getWindowMaybe } from '../../../services/api.js';
import pdfJsRealWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { OrderPdfOverlayControllerEnv } from './order_pdf_overlay_controller_shared.js';

export function useOrderPdfOverlayComponentEnv(args: {
  app: OrderPdfOverlayControllerEnv['app'];
  fb: OrderPdfOverlayControllerEnv['fb'];
}): OrderPdfOverlayControllerEnv {
  const { app, fb } = args;
  const docMaybe = useMemo(() => getDocumentMaybe(app), [app]);
  const winMaybe = useMemo(() => getWindowMaybe(app), [app]);

  const assetV = useMemo(() => {
    try {
      const v =
        winMaybe && typeof winMaybe.__WP_ASSET_VERSION__ === 'string'
          ? String(winMaybe.__WP_ASSET_VERSION__)
          : '';
      return v && v.trim().length ? v.trim() : '';
    } catch {
      return '';
    }
  }, [winMaybe]);

  const withV = useCallback(
    (urls: string[]) => {
      try {
        if (!assetV) return urls;
        return urls.map(u => {
          if (!u || typeof u !== 'string') return u;
          if (u.includes('?')) return u;
          return `${u}?v=${encodeURIComponent(assetV)}`;
        });
      } catch {
        return urls;
      }
    },
    [assetV]
  );

  return {
    app,
    fb,
    docMaybe,
    winMaybe,
    withV,
    pdfJsRealWorkerUrl,
  };
}
