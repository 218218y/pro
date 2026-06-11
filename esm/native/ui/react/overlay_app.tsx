import { useMemo } from 'react';

import { ensureToastContainerMaybe, getDocumentMaybe } from '../../services/api.js';

import { useApp, useUiSelector } from './hooks.js';
import { ReactNotesOverlay } from './notes/NotesOverlay.js';
import { ReactFeedbackHost, type OverlayFeedbackHostBridge } from './overlay_feedback_host.js';
import { OverlayPdfHost } from './overlay_pdf_host.js';
import { QuickActionsDock } from './overlay_quick_actions_dock.js';
import { OverlayTopControls } from './overlay_top_controls.js';

function useOverlayFeedbackBridge(): OverlayFeedbackHostBridge {
  const app = useApp();
  const doc = getDocumentMaybe(app);
  const toastContainer = ensureToastContainerMaybe(app);

  return useMemo(
    () => ({
      app,
      doc,
      toastContainer,
    }),
    [app, doc, toastContainer]
  );
}

export function ReactOverlayApp() {
  const pdfOpen = useUiSelector(ui => !!ui.orderPdfEditorOpen);
  const feedbackBridge = useOverlayFeedbackBridge();

  return (
    <>
      <div className="wp-react-overlay">
        <OverlayTopControls />
        <QuickActionsDock />
        <ReactFeedbackHost bridge={feedbackBridge} />
      </div>
      <ReactNotesOverlay />

      {pdfOpen ? <OverlayPdfHost /> : null}
    </>
  );
}
