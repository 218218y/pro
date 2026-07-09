import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactElement } from 'react';

import { getCloudSyncServiceMaybe, getDocumentMaybe, runPerfAction } from '../../services/api.js';
import { createCloudSyncUiActionController } from './cloud_sync_ui_action_controller_runtime.js';
import { IconButton } from './components/IconButton.js';
import {
  createQuickActionsDockController,
  type QuickActionsDockController,
} from './overlay_quick_actions_dock_controller_runtime.js';
import { useApp, useExportActions, useUiFeedback } from './hooks.js';
import { reportOverlayAppNonFatal } from './overlay_app_shared.js';

const QUICK_ACTION_EXPORT_TOOLTIPS = {
  snapshot: {
    title: 'צילום',
    detail: 'תמונת תצוגה נוכחית להורדה למחשב',
  },
  copy: {
    title: 'העתק ללוח',
    detail: 'תמונת תצוגה נוכחית בהעתקה ללוח',
  },
  renderAndSketch: {
    title: 'סקיצה/הדמיה',
    detail: 'תמונה מזווית קבועה משולבת משתי תמונות בהעתקה ללוח',
  },
  dualImage: {
    title: 'פתוח/סגור',
    detail: 'תמונה מזווית קבועה משולבת משתי תמונות בהעתקה ללוח',
  },
} as const;

type QuickActionExportTooltipConfig =
  (typeof QUICK_ACTION_EXPORT_TOOLTIPS)[keyof typeof QUICK_ACTION_EXPORT_TOOLTIPS];

type QuickActionBooleanRef = {
  current: boolean;
};

type QuickActionExportButtonProps = {
  action: () => unknown;
  closeMenu: () => void;
  iconClassName: string;
  keepOpenRef: QuickActionBooleanRef;
  op: string;
  runAction: QuickActionsDockController['runAction'];
  tooltip: QuickActionExportTooltipConfig;
};

function formatQuickActionExportTooltipLabel(tooltip: QuickActionExportTooltipConfig): string {
  return `${tooltip.title}, ${tooltip.detail}`;
}

function QuickActionExportButton({
  action,
  closeMenu,
  iconClassName,
  keepOpenRef,
  op,
  runAction,
  tooltip,
}: QuickActionExportButtonProps): ReactElement {
  return (
    <button
      type="button"
      className="wp-qa-btn wp-r-styled-tooltip"
      data-tooltip-title={tooltip.title}
      data-tooltip-detail={tooltip.detail}
      aria-label={formatQuickActionExportTooltipLabel(tooltip)}
      onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
        runAction({
          action,
          closeMenu,
          event,
          keepOpen: keepOpenRef.current,
          op,
        });
      }}
    >
      <i className={iconClassName} />
    </button>
  );
}

export function QuickActionsDock(): ReactElement {
  const app = useApp();
  const fb = useUiFeedback();
  const exp = useExportActions();
  const api = getCloudSyncServiceMaybe(app);
  const cloudSyncUiController = useMemo(() => createCloudSyncUiActionController({ app, fb }), [app, fb]);
  const quickActionsController = useMemo(
    () => createQuickActionsDockController({ api, reportNonFatal: reportOverlayAppNonFatal }),
    [api]
  );

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [menuPinnedOpen, setMenuPinnedOpen] = useState<boolean>(false);
  const [pinnedSync, setPinnedSync] = useState<boolean>(false);

  const menuPinnedOpenRefState = useRef<boolean>(false);
  useEffect(() => {
    menuPinnedOpenRefState.current = !!menuPinnedOpen;
  }, [menuPinnedOpen]);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const menuPinRef = useRef<HTMLButtonElement | null>(null);
  const syncDockRef = useRef<HTMLDivElement | null>(null);

  const syncSketch = useCallback(async () => {
    await cloudSyncUiController.syncSketch();
  }, [cloudSyncUiController]);

  const togglePinnedSync = useCallback(async () => {
    await runPerfAction(
      app,
      'cloudSync.floatingSync.toggle',
      () => cloudSyncUiController.toggleFloatingSyncEnabled(),
      { detail: { source: 'quick-actions' } }
    );
  }, [app, cloudSyncUiController]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    setPinnedSync(quickActionsController.readPinnedSync());
    return quickActionsController.subscribePinnedSync(setPinnedSync);
  }, [quickActionsController]);

  useEffect(() => {
    if (!menuOpen) return;

    const doc = anchorRef.current?.ownerDocument || getDocumentMaybe(app);
    if (!doc) return;

    const onPointerDown = (event: PointerEvent) => {
      const refs: import('./overlay_quick_actions_dock_controller_runtime.js').QuickActionsDockRefs = {
        anchor: anchorRef.current,
        menu: menuRef.current,
        menuPin: menuPinRef.current,
        syncDock: syncDockRef.current,
        toggle: toggleRef.current,
      };
      quickActionsController.handleOutsidePointerDown(event, {
        closeMenu: () => setMenuOpen(false),
        menuPinnedOpen: menuPinnedOpenRefState.current,
        refs,
      });
    };

    try {
      doc.addEventListener('pointerdown', onPointerDown, true);
    } catch (err) {
      reportOverlayAppNonFatal(app, 'quick-actions:add-pointerdown', err);
    }
    return () => {
      try {
        doc.removeEventListener('pointerdown', onPointerDown, true);
      } catch (err) {
        reportOverlayAppNonFatal(app, 'quick-actions:remove-pointerdown', err);
      }
    };
  }, [app, menuOpen, quickActionsController]);

  const dockStyle: CSSProperties = {
    position: 'fixed',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10000,
    pointerEvents: 'none',
  };

  return (
    <div className="wp-qa-dock" style={dockStyle}>
      <div ref={anchorRef} className="wp-qa-anchor" style={{ pointerEvents: 'auto' }}>
        <IconButton
          ref={toggleRef}
          variant="camera"
          className="wp-qa-toggle wp-r-styled-tooltip hint-bottom"
          data-testid="quick-actions-toggle-button"
          data-tooltip={menuOpen ? 'סגור תפריט' : 'פתח תפריט'}
          aria-label={menuOpen ? 'סגור תפריט' : 'פתח תפריט'}
          onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
            quickActionsController.toggleMenu({
              event,
              op: 'quick-actions:toggle-menu',
              setMenuOpen,
            });
          }}
        >
          <i className={menuOpen ? 'fas fa-times' : 'fas fa-arrow-right'} />
        </IconButton>

        {menuOpen ? (
          <button
            ref={menuPinRef}
            type="button"
            className={'wp-qa-toggle-pin wp-r-styled-tooltip hint-bottom' + (menuPinnedOpen ? ' is-on' : '')}
            data-tooltip={menuPinnedOpen ? 'בטל הצמדה של התפריט' : 'הצמד תפריט פתוח'}
            aria-label={menuPinnedOpen ? 'בטל הצמדה של התפריט' : 'הצמד תפריט פתוח'}
            aria-pressed={menuPinnedOpen}
            onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
              const next = quickActionsController.toggleMenuPinned({
                event,
                menuPinnedOpen: menuPinnedOpenRefState.current,
                op: 'quick-actions:pin-menu',
                setMenuPinnedOpen,
              });
              menuPinnedOpenRefState.current = next;
            }}
          >
            <i className="fas fa-thumbtack" />
          </button>
        ) : null}

        {menuOpen ? (
          <div
            ref={menuRef}
            className="wp-qa-menu"
            onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
              quickActionsController.stopSurfaceEvent(event, 'quick-actions:menu-click');
            }}
          >
            <div className="wp-qa-grid">
              <QuickActionExportButton
                action={() => exp.exportTakeSnapshot()}
                closeMenu={closeMenu}
                iconClassName="fas fa-camera"
                keepOpenRef={menuPinnedOpenRefState}
                op="quick-actions:snapshot"
                runAction={quickActionsController.runAction}
                tooltip={QUICK_ACTION_EXPORT_TOOLTIPS.snapshot}
              />

              <QuickActionExportButton
                action={() => exp.exportCopyToClipboard()}
                closeMenu={closeMenu}
                iconClassName="fas fa-copy"
                keepOpenRef={menuPinnedOpenRefState}
                op="quick-actions:copy"
                runAction={quickActionsController.runAction}
                tooltip={QUICK_ACTION_EXPORT_TOOLTIPS.copy}
              />

              <QuickActionExportButton
                action={() => exp.exportRenderAndSketch()}
                closeMenu={closeMenu}
                iconClassName="fas fa-images"
                keepOpenRef={menuPinnedOpenRefState}
                op="quick-actions:render-and-sketch"
                runAction={quickActionsController.runAction}
                tooltip={QUICK_ACTION_EXPORT_TOOLTIPS.renderAndSketch}
              />

              <QuickActionExportButton
                action={() => exp.exportDualImage()}
                closeMenu={closeMenu}
                iconClassName="fas fa-columns"
                keepOpenRef={menuPinnedOpenRefState}
                op="quick-actions:dual-image"
                runAction={quickActionsController.runAction}
                tooltip={QUICK_ACTION_EXPORT_TOOLTIPS.dualImage}
              />
            </div>
          </div>
        ) : null}

        {menuOpen || pinnedSync ? (
          <div
            ref={syncDockRef}
            className="wp-qa-sync-dock"
            onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
              quickActionsController.stopSurfaceEvent(event, 'quick-actions:sync-dock-click');
            }}
          >
            <div className="wp-qa-sync-wrap">
              <button
                type="button"
                className="wp-qa-sync wp-r-styled-tooltip hint-bottom"
                data-testid="quick-actions-sync-button"
                data-tooltip="סנכרן סקיצה"
                aria-label="סנכרן סקיצה"
                onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
                  quickActionsController.runAction({
                    action: () => syncSketch(),
                    closeMenu: () => setMenuOpen(false),
                    event,
                    keepOpen: menuPinnedOpenRefState.current,
                    op: 'quick-actions:sync-click',
                  });
                }}
              >
                <i className="fas fa-sync-alt" />
              </button>

              <button
                type="button"
                className={'wp-qa-sync-pin wp-r-styled-tooltip hint-bottom' + (pinnedSync ? ' is-on' : '')}
                data-testid="quick-actions-sync-pin-button"
                data-tooltip={pinnedSync ? 'בטל הצמדה' : 'הצמד כפתור סנכרון'}
                aria-label={pinnedSync ? 'בטל הצמדה' : 'הצמד כפתור סנכרון'}
                aria-pressed={pinnedSync}
                onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
                  quickActionsController.runAction({
                    action: () => togglePinnedSync(),
                    event,
                    keepOpen: true,
                    op: 'quick-actions:sync-pin-click',
                  });
                }}
              >
                <i className="fas fa-thumbtack" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
