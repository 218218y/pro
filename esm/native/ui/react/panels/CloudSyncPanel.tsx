import type { ReactElement } from 'react';

import { InlineNotice } from '../components/index.js';
import { useCloudSyncPanelActions } from './cloud_sync_panel_actions.js';

export function CloudSyncPanel(): ReactElement {
  const {
    status,
    isPublic,
    floatingSync,
    handleToggleRoomMode,
    handleCopy,
    handleSyncSketch,
    handleDeleteModels,
    handleDeleteColors,
    handleFloatingSyncChange,
  } = useCloudSyncPanelActions();

  return (
    <div className="control-section" data-testid="cloud-sync-panel">
      <span className="section-title">סנכרון ענן</span>

      <div className="wp-r-cloudsync-status" data-testid="cloud-sync-status">
        {status}
      </div>

      <div className="wp-r-btn-row wp-r-wrap">
        <button
          type="button"
          className="btn btn-primary btn-inline btn-sm"
          data-testid="cloud-sync-room-mode-button"
          onClick={handleToggleRoomMode}
        >
          <i className="fas fa-lock" /> {isPublic ? 'עבור לפרטי' : 'עבור לציבורי'}
        </button>

        <button
          type="button"
          className="btn btn-accent btn-inline btn-sm"
          data-testid="cloud-sync-copy-link-button"
          onClick={handleCopy}
        >
          <i className="fas fa-link" /> קישור
        </button>

        <button
          type="button"
          className="btn btn-inline btn-sm"
          data-testid="cloud-sync-sync-sketch-button"
          onClick={handleSyncSketch}
        >
          <i className="fas fa-sync" /> סנכרן סקיצה
        </button>
      </div>

      <div className="wp-r-btn-row wp-r-wrap">
        <button
          type="button"
          className="btn btn-danger btn-inline btn-sm"
          data-testid="cloud-sync-delete-models-button"
          onClick={handleDeleteModels}
        >
          <i className="fas fa-trash" /> מחק דגמים זמניים
        </button>

        <button
          type="button"
          className="btn btn-danger btn-inline btn-sm"
          data-testid="cloud-sync-delete-colors-button"
          onClick={handleDeleteColors}
        >
          <i className="fas fa-trash" /> מחק צבעים זמניים
        </button>
      </div>

      <div className="wp-r-toggle-row">
        <label>
          <input
            type="checkbox"
            data-testid="cloud-sync-floating-pin-toggle"
            checked={!!floatingSync}
            onChange={async (e: import('react').ChangeEvent<HTMLInputElement>) => {
              await handleFloatingSyncChange(!!e.target.checked);
            }}
          />
          סנכרון סקיצה "צף" (רקע)
        </label>
      </div>

      <InlineNotice>
        מצב ציבורי מאפשר שיתוף קישור. מצב פרטי מבודד חדר סנכרון. מחיקת זמניים היא ניקוי נתונים temporary.
      </InlineNotice>
    </div>
  );
}
