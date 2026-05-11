import { useCallback, useEffect, useState } from 'react';

import {
  getHistoryStatusMaybe,
  moveCameraViaService,
  runHistoryRedoMaybe,
  runHistoryUndoMaybe,
  subscribeHistoryStatusMaybe,
  type HistoryStatusLike,
} from '../../services/api.js';

import { useApp, useUiFeedback } from './hooks.js';
import { reportOverlayAppNonFatal } from './overlay_app_shared.js';

type HistoryStatus = Pick<HistoryStatusLike, 'canUndo' | 'canRedo'>;

function useHistoryStatus(): {
  status: HistoryStatus;
  undo: () => void;
  redo: () => void;
} {
  const app = useApp();
  const [status, setStatus] = useState<HistoryStatus>({ canUndo: false, canRedo: false });

  const applyStatus = useCallback((next: HistoryStatusLike) => {
    setStatus({ canUndo: !!next.canUndo, canRedo: !!next.canRedo });
  }, []);

  useEffect(() => {
    try {
      applyStatus(getHistoryStatusMaybe(app));
    } catch (err) {
      reportOverlayAppNonFatal(app, 'overlay-history:init-status', err);
    }

    return subscribeHistoryStatusMaybe(app, (next: HistoryStatusLike) => {
      try {
        applyStatus(next);
      } catch (err) {
        reportOverlayAppNonFatal(app, 'overlay-history:apply-status', err);
      }
    });
  }, [app, applyStatus]);

  const undo = useCallback(() => {
    try {
      runHistoryUndoMaybe(app);
    } catch (err) {
      reportOverlayAppNonFatal(app, 'overlay-history:undo', err);
    }
  }, [app]);

  const redo = useCallback(() => {
    try {
      runHistoryRedoMaybe(app);
    } catch (err) {
      reportOverlayAppNonFatal(app, 'overlay-history:redo', err);
    }
  }, [app]);

  return { status, undo, redo };
}

function UndoRedoControls() {
  const { status, undo, redo } = useHistoryStatus();

  return (
    <div className="undo-redo-container">
      <button
        type="button"
        className="cam-btn hint-bottom"
        data-tooltip="בטל (Ctrl+Z)"
        disabled={!status.canUndo}
        onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
          try {
            event.preventDefault();
          } catch (err) {
            reportOverlayAppNonFatal('overlay-history:undo-click', err);
          }
          undo();
        }}
      >
        <i className="fas fa-undo" />
      </button>

      <button
        type="button"
        className="cam-btn hint-bottom"
        data-tooltip="החזר (Ctrl+Y)"
        disabled={!status.canRedo}
        onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
          try {
            event.preventDefault();
          } catch (err) {
            reportOverlayAppNonFatal('overlay-history:redo-click', err);
          }
          redo();
        }}
      >
        <i className="fas fa-redo" />
      </button>
    </div>
  );
}

function CameraControls() {
  const app = useApp();
  const fb = useUiFeedback();

  const move = useCallback(
    (view: string) => {
      try {
        if (moveCameraViaService(app, view)) return;
      } catch (err) {
        reportOverlayAppNonFatal(app, 'overlay-camera:move', err);
      }

      fb.toast('שליטת מצלמה לא זמינה כרגע', 'error');
    },
    [app, fb]
  );

  return (
    <div className="camera-controls">
      <button
        type="button"
        className="cam-btn"
        role="button"
        tabIndex={0}
        data-tooltip="חזית מלאה"
        onClick={() => move('front')}
      >
        <i className="fas fa-border-all" />
      </button>

      <button
        type="button"
        className="cam-btn"
        role="button"
        tabIndex={0}
        data-tooltip="תקריב"
        onClick={() => move('front-zoom')}
      >
        <i className="fas fa-search-plus" />
      </button>

      <button
        type="button"
        className="cam-btn"
        role="button"
        tabIndex={0}
        data-tooltip="מבט מימין"
        onClick={() => move('perspective')}
      >
        <i className="fas fa-cube" style={{ transform: 'scaleX(-1)' }} />
      </button>

      <button
        type="button"
        className="cam-btn"
        role="button"
        tabIndex={0}
        data-tooltip="מבט משמאל"
        onClick={() => move('perspective-left')}
      >
        <i className="fas fa-cube" />
      </button>
    </div>
  );
}

export function OverlayTopControls() {
  return (
    <>
      <UndoRedoControls />
      <CameraControls />
    </>
  );
}
