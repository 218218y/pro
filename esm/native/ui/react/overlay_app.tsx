import { Suspense, lazy, useEffect, useMemo, useState } from 'react';

import { ensureToastContainerMaybe, getDocumentMaybe } from '../../services/api.js';

import { useApp, useUiSelector } from './hooks.js';
import { LazyErrorBoundary } from './components/LazyErrorBoundary.js';
import { ReactFeedbackHost, type OverlayFeedbackHostBridge } from './overlay_feedback_host.js';
import { OverlayPdfHost } from './overlay_pdf_host.js';
import { QuickActionsDock } from './overlay_quick_actions_dock.js';
import { OverlayTopControls } from './overlay_top_controls.js';

const NotesOverlayLazy = lazy(() =>
  import('./notes/NotesOverlay.js').then(module => ({ default: module.ReactNotesOverlay }))
);

function NotesOverlayHost() {
  const app = useApp();
  const notesEnabled = useUiSelector(ui => !!ui.notesEnabled, undefined, ['project-data', 'visibility']);
  const [everEnabled, setEverEnabled] = useState(notesEnabled);

  useEffect(() => {
    if (notesEnabled) setEverEnabled(true);
  }, [notesEnabled]);

  // The notes service owns draw-mode state even before this component is loaded.
  // Keep the editor mounted after first activation so edits and exit hooks survive visibility changes.
  if (!notesEnabled && !everEnabled) return null;

  return (
    <LazyErrorBoundary label="הערות" app={app} errorTestId="notes-overlay-load-error">
      <Suspense fallback={null}>
        <NotesOverlayLazy />
      </Suspense>
    </LazyErrorBoundary>
  );
}

function useOverlayFeedbackBridge(pdfOpen: boolean): OverlayFeedbackHostBridge {
  const app = useApp();
  const doc = getDocumentMaybe(app);
  const toastContainer = ensureToastContainerMaybe(app, { preferBody: pdfOpen });

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
  const pdfOpen = useUiSelector(ui => !!ui.orderPdfEditorOpen, undefined, 'navigation');
  const feedbackBridge = useOverlayFeedbackBridge(pdfOpen);

  return (
    <>
      <div className="wp-react-overlay">
        <OverlayTopControls />
        <QuickActionsDock />
        <ReactFeedbackHost bridge={feedbackBridge} />
      </div>
      <NotesOverlayHost />

      {pdfOpen ? <OverlayPdfHost /> : null}
    </>
  );
}
