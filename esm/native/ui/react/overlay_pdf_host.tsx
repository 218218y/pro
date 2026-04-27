import { Suspense, lazy } from 'react';
import type { ComponentType } from 'react';

import { createPortal } from 'react-dom';

import { getDocumentMaybe } from '../../services/api.js';

import { useApp } from './hooks.js';
import { LazyErrorBoundary } from './components/index.js';

type OrderPdfOverlayModule = {
  OrderPdfInPlaceEditorOverlay: ComponentType<Record<string, never>>;
};

const OrderPdfOverlayLazy = lazy(() =>
  import('./pdf/OrderPdfInPlaceEditorOverlay.js').then((module: OrderPdfOverlayModule) => ({
    default: module.OrderPdfInPlaceEditorOverlay,
  }))
);

function PdfEditorLoadingOverlay() {
  try {
    const app = useApp();
    const doc = getDocumentMaybe(app);
    if (!doc || !doc.body) return null;
    return createPortal(
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.08)',
          zIndex: 999999,
          pointerEvents: 'none',
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        טוען עורך PDF…
      </div>,
      doc.body
    );
  } catch {
    return null;
  }
}

export function OverlayPdfHost() {
  const app = useApp();

  return (
    <LazyErrorBoundary label="עורך PDF" app={app}>
      <Suspense fallback={<PdfEditorLoadingOverlay />}>
        <OrderPdfOverlayLazy />
      </Suspense>
    </LazyErrorBoundary>
  );
}
