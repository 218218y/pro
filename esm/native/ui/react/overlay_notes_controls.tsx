import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';

import {
  VIEWER_MEASUREMENT_MODE_ID,
  clearViewerMeasurementOverlay,
  getUiNotesServiceMaybe,
  getModeId,
  isNotesScreenDrawMode,
  runPerfAction,
  subscribeNotesDrawMode,
} from '../../services/api.js';

import { enterPrimaryMode, exitPrimaryMode } from './actions/modes_actions.js';
import { setUiNotesEnabled, setUiShowContents } from './actions/store_actions.js';
import { useApp, useMeta, useModeSelector, useUiFeedback, useUiSelector } from './hooks.js';
import { reportOverlayAppNonFatal } from './overlay_app_shared.js';

type UiNotesControlsLike = {
  enterScreenDrawMode?: () => void;
  exitScreenDrawMode?: () => void;
};

function readUiNotesControls(app: unknown): UiNotesControlsLike | null {
  try {
    const controls = getUiNotesServiceMaybe(app);
    return controls && typeof controls === 'object' ? controls : null;
  } catch (err) {
    reportOverlayAppNonFatal('viewer-notes-controls:read-service', err);
    return null;
  }
}

function stopViewerNotesControlEvent(event: ReactMouseEvent<HTMLButtonElement>): void {
  try {
    event.preventDefault();
    event.stopPropagation();
  } catch (err) {
    reportOverlayAppNonFatal('viewer-notes-controls:stop-event', err);
  }
}

function useViewerNotesDrawMode(): boolean {
  const app = useApp();
  const [notesDrawMode, setNotesDrawMode] = useState<boolean>(false);

  useEffect(() => {
    try {
      setNotesDrawMode(isNotesScreenDrawMode(app));
    } catch (err) {
      reportOverlayAppNonFatal(app, 'viewer-notes-controls:init-draw-mode', err);
    }

    try {
      return subscribeNotesDrawMode(app, active => {
        setNotesDrawMode(!!active);
      });
    } catch (err) {
      reportOverlayAppNonFatal(app, 'viewer-notes-controls:subscribe-draw-mode', err);
      return () => {};
    }
  }, [app]);

  return notesDrawMode;
}

export function ViewerNotesControls(): ReactElement {
  const app = useApp();
  const meta = useMeta();
  const fb = useUiFeedback();
  const notesEnabled = useUiSelector(ui => !!ui.notesEnabled);
  const showContents = useUiSelector(ui => !!ui.showContents);
  const measurementModeId = getModeId('MEASURE') || VIEWER_MEASUREMENT_MODE_ID;
  const primaryMode = useModeSelector(mode => String(mode.primary || 'none'));
  const measurementMode = primaryMode === measurementModeId;
  const notesDrawMode = useViewerNotesDrawMode();

  useEffect(() => {
    if (!measurementMode) clearViewerMeasurementOverlay(app, true);
  }, [app, measurementMode]);

  const setNotesVisible = useCallback(
    (on: boolean) => {
      setUiNotesEnabled(app, on, meta.uiOnlyImmediate('react:viewerNotesControls:visibility'));
    },
    [app, meta]
  );

  const toggleNoteEditMode = useCallback(() => {
    runPerfAction(
      app,
      'viewer.notes.drawMode.toggle',
      () => {
        const controls = readUiNotesControls(app);
        if (!controls) {
          fb.toast('מצב הערות לא זמין כרגע', 'error');
          return;
        }

        if (notesDrawMode) {
          if (typeof controls.exitScreenDrawMode === 'function') controls.exitScreenDrawMode();
          return;
        }

        if (!notesEnabled) setNotesVisible(true);
        if (typeof controls.enterScreenDrawMode === 'function') controls.enterScreenDrawMode();
      },
      { detail: { checked: !notesDrawMode } }
    );
  }, [app, fb, notesDrawMode, notesEnabled, setNotesVisible]);

  const toggleContentsVisibility = useCallback(() => {
    const next = !showContents;
    runPerfAction(
      app,
      'viewer.contents.visibility.toggle',
      () => {
        setUiShowContents(app, next, { source: 'react:viewerContentsControls:visibility', immediate: true });
      },
      { detail: { checked: next } }
    );
  }, [app, showContents]);

  const toggleMeasurementMode = useCallback(() => {
    const next = !measurementMode;
    runPerfAction(
      app,
      'viewer.measurement.mode.toggle',
      () => {
        if (next) {
          enterPrimaryMode(app, measurementModeId, {
            preserveDoors: true,
            cursor: 'crosshair',
            toast: 'מצב מדידה: לחץ על חלק או חלל בארון כדי לראות רוחב וגובה',
            source: 'react:viewerMeasurementControls:enter',
            immediate: true,
          });
          return;
        }

        exitPrimaryMode(app, measurementModeId, {
          preserveDoors: true,
          source: 'react:viewerMeasurementControls:exit',
          immediate: true,
        });
        clearViewerMeasurementOverlay(app, true);
      },
      { detail: { checked: next } }
    );
  }, [app, measurementMode, measurementModeId]);

  const toggleNotesVisibility = useCallback(() => {
    const next = !notesEnabled;
    runPerfAction(
      app,
      'viewer.notes.visibility.toggle',
      () => {
        setNotesVisible(next);
        if (!next) {
          const controls = readUiNotesControls(app);
          if (controls && typeof controls.exitScreenDrawMode === 'function') controls.exitScreenDrawMode();
        }
      },
      { detail: { checked: next } }
    );
  }, [app, notesEnabled, setNotesVisible]);

  return (
    <div className="wp-viewer-notes-controls">
      <div className="wp-viewer-notes-controls-row">
        <div className="wp-viewer-notes-wrap">
          <button
            type="button"
            className={`cam-btn wp-viewer-note-btn hint-bottom${notesDrawMode ? ' is-on' : ''}`}
            data-tooltip={notesDrawMode ? 'סיום עריכת הערות' : 'הערה'}
            aria-label={notesDrawMode ? 'סיום עריכת הערות' : 'הערה'}
            aria-pressed={notesDrawMode}
            data-testid="viewer-note-draw-mode-button"
            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
              stopViewerNotesControlEvent(event);
              toggleNoteEditMode();
            }}
          >
            <span className="wp-viewer-note-btn-letter" aria-hidden="true">
              A
            </span>
          </button>

          <button
            type="button"
            className={`wp-viewer-note-eye hint-bottom${notesEnabled ? ' is-on' : ''}`}
            data-tooltip={notesEnabled ? 'הסתר הערות' : 'הצג הערות'}
            aria-label={notesEnabled ? 'הסתר הערות' : 'הצג הערות'}
            aria-pressed={notesEnabled}
            data-testid="viewer-notes-visibility-button"
            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
              stopViewerNotesControlEvent(event);
              toggleNotesVisibility();
            }}
          >
            <i className={`fas ${notesEnabled ? 'fa-eye' : 'fa-eye-slash'}`} />
          </button>
        </div>

        <button
          type="button"
          className={`cam-btn wp-viewer-contents-btn hint-bottom${showContents ? ' is-on' : ''}`}
          data-tooltip={showContents ? 'הסתר תכולה' : 'הצג תכולה'}
          aria-label={showContents ? 'הסתר תכולה' : 'הצג תכולה'}
          aria-pressed={showContents}
          data-testid="viewer-contents-toggle-button"
          onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
            stopViewerNotesControlEvent(event);
            toggleContentsVisibility();
          }}
        >
          <i className="fas fa-tshirt" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`cam-btn wp-viewer-measurement-btn hint-bottom${measurementMode ? ' is-on' : ''}`}
          data-tooltip={measurementMode ? 'סיום סרגל מדידה' : 'סרגל מדידה'}
          aria-label={measurementMode ? 'סיום סרגל מדידה' : 'סרגל מדידה'}
          aria-pressed={measurementMode}
          data-testid="viewer-measurement-toggle-button"
          onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
            stopViewerNotesControlEvent(event);
            toggleMeasurementMode();
          }}
        >
          <i className="fas fa-ruler-combined" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
