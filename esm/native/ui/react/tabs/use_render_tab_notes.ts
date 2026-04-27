import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import { setUiNotesEnabled } from '../actions/store_actions.js';
import {
  getUiNotesControls,
  isNotesDrawMode,
  subscribeToNotesDrawMode,
} from './render_tab_shared_interactions.js';
import { runPerfAction } from '../../../services/api.js';

export type RenderTabNotesModel = {
  notesEnabled: boolean;
  notesDrawMode: boolean;
  toggleNotes: (checked: boolean) => void;
  toggleNotesDrawMode: () => void;
};

type UseRenderTabNotesArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  notesEnabled: boolean;
  savedNotesCount: number;
};

export function useRenderTabNotes(args: UseRenderTabNotesArgs): RenderTabNotesModel {
  const { app, meta, notesEnabled, savedNotesCount } = args;
  const [notesDrawMode, setNotesDrawMode] = useState<boolean>(false);

  useEffect(() => {
    if (!notesEnabled) {
      setNotesDrawMode(false);
      return;
    }

    const sync = (next: boolean) => {
      setNotesDrawMode(prev => (prev === next ? prev : next));
    };

    sync(isNotesDrawMode(app));
    const unsubscribe = subscribeToNotesDrawMode(app, sync);

    return unsubscribe;
  }, [app, notesEnabled]);

  const toggleNotes = useCallback(
    (checked: boolean) => {
      const on = !!checked;
      runPerfAction(
        app,
        'render.notes.toggle',
        () => {
          setUiNotesEnabled(app, on, meta.uiOnlyImmediate('react:renderTab:notesEnabled'));

          try {
            const ui = getUiNotesControls(app);
            if (!ui) return;
            if (!on && typeof ui.exitScreenDrawMode === 'function') ui.exitScreenDrawMode();
            if (on && savedNotesCount === 0 && typeof ui.enterScreenDrawMode === 'function')
              ui.enterScreenDrawMode();
          } catch {
            // ignore
          }
        },
        {
          detail: { checked: on },
        }
      );
    },
    [app, meta, savedNotesCount]
  );

  const toggleNotesDrawMode = useCallback(() => {
    try {
      runPerfAction(
        app,
        'render.notes.drawMode.toggle',
        () => {
          const ui = getUiNotesControls(app);
          if (!ui) return;
          if (notesDrawMode && typeof ui.exitScreenDrawMode === 'function') {
            ui.exitScreenDrawMode();
            return;
          }
          if (typeof ui.enterScreenDrawMode === 'function') ui.enterScreenDrawMode();
        },
        {
          detail: { checked: !notesDrawMode },
        }
      );
    } catch {
      // ignore
    }
  }, [app, notesDrawMode]);

  return useMemo(
    () => ({
      notesEnabled,
      notesDrawMode,
      toggleNotes,
      toggleNotesDrawMode,
    }),
    [notesEnabled, notesDrawMode, toggleNotes, toggleNotesDrawMode]
  );
}
