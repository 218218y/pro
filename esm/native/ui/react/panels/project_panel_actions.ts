import { useCallback, useMemo, useRef } from 'react';
import type { ChangeEvent, MutableRefObject } from 'react';

import { useApp, useUiFeedback } from '../hooks.js';
import { loadFromFileEvent, restoreLastSession, saveProject } from '../actions/project_actions.js';
import { createProjectUiActionController } from '../project_ui_action_controller_runtime.js';

export type ProjectPanelActionsState = {
  app: ReturnType<typeof useApp>;
  loadRef: MutableRefObject<HTMLInputElement | null>;
  handleRestore: () => void;
  handleLoadButtonClick: () => void;
  handleLoadInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSaveClick: () => void;
};

export function useProjectPanelActions(): ProjectPanelActionsState {
  const app = useApp();
  const fb = useUiFeedback();
  const loadRef = useRef<HTMLInputElement | null>(null);
  const projectUiController = useMemo(
    () =>
      createProjectUiActionController({
        app,
        fb,
        loadFromFileEvent,
        restoreLastSession,
        saveProject,
      }),
    [app, fb]
  );

  const handleRestore = useCallback(() => {
    void projectUiController.restoreLastSession();
  }, [projectUiController]);

  const handleLoadButtonClick = useCallback(() => {
    projectUiController.openLoadInput(loadRef);
  }, [projectUiController]);

  const handleLoadInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      await projectUiController.handleLoadInputChange(e);
    },
    [projectUiController]
  );

  const handleSaveClick = useCallback(() => {
    projectUiController.saveProject();
  }, [projectUiController]);

  return {
    app,
    loadRef,
    handleRestore,
    handleLoadButtonClick,
    handleLoadInputChange,
    handleSaveClick,
  };
}
