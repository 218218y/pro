import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SavedModelId, SavedModelLike } from '../../../../../types';
import { useApp, useMeta, useUiFeedback, useUiSelector } from '../hooks.js';
import { setUiSelectedModelId } from '../actions/store_actions.js';
import { selectSelectedModelId } from '../selectors/ui_selectors.js';
import { getModelsService } from './structure_tab_shared.js';
import { isPresetModel, type SavedModelsFeedbackLike } from './structure_tab_saved_models_shared.js';
import { syncSelectedSavedModelId } from './structure_tab_saved_models_controller_runtime.js';
import type { SavedModelsCommandHookState } from './use_structure_tab_saved_models_commands_contracts.js';

export type SavedModelsCommandSelectionApi = {
  selectedId: SavedModelId;
  setSelected: (id: SavedModelId) => void;
};

export function useStructureTabSavedModelsCommandState(): SavedModelsCommandHookState &
  SavedModelsCommandSelectionApi {
  const app = useApp();
  const meta = useMeta();
  const fb: SavedModelsFeedbackLike = useUiFeedback();
  const modelsApi = useMemo(() => getModelsService(app), [app]);
  const selectedId = useUiSelector(selectSelectedModelId);

  const [models, setModels] = useState<SavedModelLike[]>([]);
  const [presetModelsOpen, setPresetModelsOpen] = useState(false);
  const [savedModelsOpen, setSavedModelsOpen] = useState(false);

  const refresh = useCallback(() => {
    try {
      modelsApi.ensureLoaded({ forceRebuild: true, silent: true });
      setModels(modelsApi.getAll());
    } catch {
      setModels([]);
    }
  }, [modelsApi]);

  useEffect(() => {
    refresh();
    const unsub = modelsApi.onChange(refresh);
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [modelsApi, refresh]);

  useEffect(() => {
    const nextSelectedId = syncSelectedSavedModelId(models, selectedId);
    if (nextSelectedId === String(selectedId || '')) return;
    setUiSelectedModelId(app, nextSelectedId, meta.uiOnlyImmediate('react:models:selection:clear'));
  }, [app, meta, models, selectedId]);

  const presetModels = useMemo(() => models.filter(model => isPresetModel(model)), [models]);
  const savedModels = useMemo(() => models.filter(model => !isPresetModel(model)), [models]);

  const setSelected = useCallback(
    (id: string) => {
      setUiSelectedModelId(app, id, meta.uiOnlyImmediate('react:models:select'));
    },
    [app, meta]
  );

  return {
    modelsApi,
    fb,
    models,
    presetModels,
    savedModels,
    selectedId,
    presetModelsOpen,
    savedModelsOpen,
    setPresetModelsOpen,
    setSavedModelsOpen,
    refresh,
    setSelected,
  };
}
