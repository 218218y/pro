import type { ReactElement } from 'react';

import { Button, InlineNotice } from '../components/index.js';
import { useCloudSyncPanelActions } from './cloud_sync_panel_actions.js';

export function CloudSyncPanel(): ReactElement {
  const {
    status,
    isPublic,
    conflict,
    handleToggleRoomMode,
    handleCopy,
    handleSyncSketch,
    handleDeleteModels,
    handleDeleteColors,
    handleResolveConflict,
  } = useCloudSyncPanelActions();
  const conflictResolving = conflict?.state === 'resolving';
  const conflictLimitationMessage =
    conflict?.limitationReason === 'projection-too-large'
      ? 'ההתנגשות גדולה מכדי לשחזר אוטומטית את הגרסה המקומית. ניתן להשתמש בגרסת הענן או לייצא תחילה את המצב המקומי.'
      : conflict?.limitationReason === 'projection-corrupt'
        ? 'פרטי הגרסה המקומית של ההתנגשות אינם תקינים. ניתן להשתמש בגרסת הענן או לייצא תחילה את המצב המקומי.'
        : '';

  return (
    <div className="control-section" data-testid="cloud-sync-panel">
      <span className="section-title">סנכרון ענן</span>

      <div className="wp-r-cloudsync-status" data-testid="cloud-sync-status">
        {status}
      </div>

      {conflict ? (
        <div data-testid="cloud-sync-conflict-resolution">
          <InlineNotice>
            הסנכרון מושהה בגלל התנגשות ב־{conflict.keys.join(', ') || 'נתונים משותפים'}. יש לבחור איזו גרסה
            לשמור.
          </InlineNotice>
          {conflictLimitationMessage ? (
            <div data-testid="cloud-sync-conflict-limitation">
              <InlineNotice>{conflictLimitationMessage}</InlineNotice>
            </div>
          ) : null}
          <div className="wp-r-btn-row wp-r-wrap">
            <Button
              variant="primary"
              inline
              size="sm"
              disabled={conflictResolving || !conflict.canKeepLocal}
              data-testid="cloud-sync-conflict-keep-local"
              onClick={() => handleResolveConflict('keep-local')}
            >
              שמור את השינויים שלי
            </Button>
            <Button
              inline
              size="sm"
              disabled={conflictResolving || !conflict.canUseRemote}
              data-testid="cloud-sync-conflict-use-remote"
              onClick={() => handleResolveConflict('use-remote')}
            >
              השתמש בגרסת הענן
            </Button>
          </div>
        </div>
      ) : null}

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
