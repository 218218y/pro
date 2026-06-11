import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import type { ActionMetaLike, MetaActionsNamespaceLike } from '../../../../../types';
import { Button } from '../components/index.js';
import { useApp, useMeta, useUiSelector } from '../hooks.js';
import { selectAutosaveInfo, selectProjectName } from '../selectors/ui_selectors.js';
import { setUiProjectName } from '../actions/store_actions.js';
import { readAutosaveInfoFromStorage } from '../../../services/api.js';
import { useProjectPanelActions } from './project_panel_actions.js';

// Canonical structure-tab project header: restore + project name + project file I/O.
export function ProjectPanel(): ReactElement {
  const app = useApp();
  const meta: MetaActionsNamespaceLike = useMeta();
  const projectName = useUiSelector(selectProjectName);
  const [draft, setDraft] = useState<string>(projectName);
  const isFocused = useRef(false);
  const reactId = useId();
  const nameInputId = useMemo(
    () => `wp-r-project-name-${String(reactId).replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    [reactId]
  );
  const loadInputId = useMemo(
    () => `wp-r-project-load-${String(reactId).replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    [reactId]
  );
  const { loadRef, handleRestore, handleLoadButtonClick, handleLoadInputChange, handleSaveClick } =
    useProjectPanelActions();

  useEffect(() => {
    if (!isFocused.current) setDraft(projectName);
  }, [projectName]);

  const commitName = (v: string) => {
    const next = String(v || '');
    const m: ActionMetaLike =
      typeof meta.uiOnly === 'function'
        ? meta.uiOnly(undefined, 'react:project:name')
        : { source: 'react:project:name' };
    setUiProjectName(app, next, m);
    return next;
  };

  const handleSaveDraft = (value: string) => {
    const next = commitName(value);
    setDraft(next);
    handleSaveClick();
  };

  // Canonical autosave: stored under App.services.storage and surfaced into ui.autosaveInfo by the autosave service.
  const autosaveInfoFromUi = useUiSelector(selectAutosaveInfo);
  const [autosaveInfoFromStorage, setAutosaveInfoFromStorage] = useState<{
    timestamp?: number;
    dateString?: string;
  } | null>(null);

  // One-time bootstrap: if we have an autosave from a previous session but UI hasn't been stamped yet,
  // still enable the restore button immediately through the canonical runtime helper.
  useEffect(() => {
    setAutosaveInfoFromStorage(readAutosaveInfoFromStorage(app));
  }, [app]);

  const autosaveInfo = autosaveInfoFromUi || autosaveInfoFromStorage;
  const canRestore = !!autosaveInfo;
  const restoreTime = autosaveInfo && autosaveInfo.dateString ? String(autosaveInfo.dateString) : '';
  const restoreTooltip = canRestore ? 'טען את העריכה האחרונה שנשמרה אוטומטית' : 'אין עריכה אחרונה לשחזור';

  return (
    <div className="wp-r-structure-head">
      <button
        type="button"
        data-testid="project-restore-button"
        className="wp-r-restore-pill wp-r-styled-tooltip hint-bottom"
        disabled={!canRestore}
        onClick={handleRestore}
        data-tooltip={restoreTooltip}
        aria-label={restoreTooltip}
      >
        <span className="wp-r-restore-pill-inner">
          <i className="fas fa-history" />
          <span className="wp-r-restore-text">טען עריכה אחרונה</span>
          {restoreTime ? <span className="wp-r-restore-time">({restoreTime})</span> : null}
        </span>
      </button>

      <label className="wp-r-project-name-title" htmlFor={nameInputId}>
        שם הפרויקט:
      </label>

      <div className="wp-r-project-name-row">
        <input
          id={nameInputId}
          name="projectName"
          aria-label="שם הפרויקט"
          type="text"
          data-testid="project-name-input"
          className="project-input wp-r-project-input wp-r-project-input--compact"
          value={draft}
          onFocus={() => {
            isFocused.current = true;
          }}
          onChange={(e: import('react').ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
          onKeyDown={(e: import('react').KeyboardEvent<HTMLInputElement>) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            handleSaveDraft(e.currentTarget.value);
          }}
          onBlur={() => {
            isFocused.current = false;
            commitName(draft);
          }}
          placeholder="לדוגמה: ארון חדר ילדים…"
        />

        <div className="wp-r-project-io wp-r-project-io--structure" aria-label="פעולות קובץ פרויקט">
          <Button
            variant="header"
            data-testid="project-load-button"
            className="btn-header-export-load wp-r-project-icon-btn"
            onClick={handleLoadButtonClick}
            title="טען קובץ"
            aria-label="טען קובץ"
          >
            <i className="fas fa-folder-open" aria-hidden="true" />
          </Button>

          <Button
            variant="header"
            data-testid="project-save-button"
            className="btn-save btn-header-save wp-r-project-icon-btn"
            onClick={() => handleSaveDraft(draft)}
            title="שמור"
            aria-label="שמור"
          >
            <i className="fas fa-save" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <input
        ref={loadRef}
        id={loadInputId}
        name="projectFile"
        aria-label="טען קובץ פרויקט"
        data-testid="project-load-input"
        type="file"
        className="hidden"
        accept=".json,application/json"
        onChange={handleLoadInputChange}
      />
    </div>
  );
}
