import type { ReactElement } from 'react';

import { Button, InlineNotice } from '../components/index.js';
import { useCloudSyncPanelActions } from './cloud_sync_panel_actions.js';

export function CloudSyncPanel(): ReactElement {
  const {
    status,
    isPublic,
    handleToggleRoomMode,
    handleCopy,
    handleSyncSketch,
    handleDeleteModels,
    handleDeleteColors,
  } = useCloudSyncPanelActions();

  return (
    <div className="control-section" data-testid="cloud-sync-panel">
      <span className="section-title">סנכרון ענן</span>

      <div className="wp-r-cloudsync-status" data-testid="cloud-sync-status">
        {status}
      </div>

      <div className="wp-r-btn-row wp-r-wrap">
        <Button
          variant="primary"
          inline
          size="sm"
          data-testid="cloud-sync-room-mode-button"
          onClick={handleToggleRoomMode}
        >
          <i className="fas fa-lock" /> {isPublic ? 'עבור לפרטי' : 'עבור לציבורי'}
        </Button>

        <Button
          variant="accent"
          inline
          size="sm"
          data-testid="cloud-sync-copy-link-button"
          onClick={handleCopy}
        >
          <i className="fas fa-link" /> קישור
        </Button>

        <Button inline size="sm" data-testid="cloud-sync-sync-sketch-button" onClick={handleSyncSketch}>
          <i className="fas fa-sync" /> סנכרן סקיצה
        </Button>
      </div>

      <div className="wp-r-btn-row wp-r-wrap">
        <Button
          variant="danger"
          inline
          size="sm"
          data-testid="cloud-sync-delete-models-button"
          onClick={handleDeleteModels}
        >
          <i className="fas fa-trash" /> מחק דגמים זמניים
        </Button>

        <Button
          variant="danger"
          inline
          size="sm"
          data-testid="cloud-sync-delete-colors-button"
          onClick={handleDeleteColors}
        >
          <i className="fas fa-trash" /> מחק צבעים זמניים
        </Button>
      </div>

      <InlineNotice>
        מצב ציבורי מאפשר שיתוף קישור. מצב פרטי מבודד חדר סנכרון. מחיקת זמניים היא ניקוי נתונים temporary.
      </InlineNotice>
    </div>
  );
}
