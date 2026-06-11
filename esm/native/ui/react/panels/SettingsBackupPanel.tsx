import { useCallback, useId, useMemo, useRef } from 'react';
import type { ChangeEvent, ReactElement } from 'react';

import { InlineNotice } from '../components/index.js';
import { useApp, useUiFeedback } from '../hooks.js';
import { exportSystemSettings, importSystemSettings } from '../actions/settings_backup_actions.js';
import { reportSettingsBackupActionResult } from '../../settings_backup_action_feedback.js';
import type { SettingsBackupActionResult } from '../../settings_backup_contracts.js';

export function SettingsBackupPanel(): ReactElement {
  const app = useApp();
  const fb = useUiFeedback();
  const importRef = useRef<HTMLInputElement | null>(null);
  const reactId = useId();
  const importInputId = useMemo(
    () => `wp-r-settings-import-${String(reactId).replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    [reactId]
  );

  const handleResult = useCallback(
    (result: SettingsBackupActionResult | null | undefined) => {
      reportSettingsBackupActionResult(fb, result);
    },
    [fb]
  );

  const handleExportClick = useCallback(() => {
    void exportSystemSettings(app).then(handleResult);
  }, [app, handleResult]);

  const handleImportClick = useCallback(() => {
    if (importRef.current) importRef.current.click();
  }, []);

  const handleImportChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.currentTarget.files && e.currentTarget.files[0] ? e.currentTarget.files[0] : null;
      void importSystemSettings(app, file || e).then(handleResult);
      // allow selecting same file again (module snapshots the File synchronously)
      e.currentTarget.value = '';
    },
    [app, handleResult]
  );

  return (
    <div className="control-section" data-testid="settings-backup-panel">
      <span className="section-title">גיבוי הגדרות</span>

      <div className="wp-r-btn-row wp-r-wrap">
        <button
          type="button"
          className="btn btn-primary btn-inline btn-sm"
          onClick={handleExportClick}
          data-testid="settings-backup-export-button"
        >
          <i className="fas fa-file-export" /> ייצוא
        </button>

        <button
          type="button"
          className="btn btn-accent btn-inline btn-sm"
          onClick={handleImportClick}
          data-testid="settings-backup-import-button"
        >
          <i className="fas fa-file-import" /> ייבוא
        </button>
      </div>

      <input
        ref={importRef}
        id={importInputId}
        name="settingsImport"
        aria-label="ייבוא גיבוי הגדרות"
        type="file"
        className="hidden"
        accept=".json,application/json"
        onChange={handleImportChange}
        data-testid="settings-backup-import-input"
      />

      <InlineNotice>זה מייצא/מייבא דגמים שמורים + פלטת צבעים + העדפות מערכת.</InlineNotice>
    </div>
  );
}
