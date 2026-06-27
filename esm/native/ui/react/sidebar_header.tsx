import { Button } from './components/index.js';
import { useSidebarHeaderActions } from './sidebar_header_actions.js';

export function SidebarHeader() {
  const {
    isSite2,
    site2GateOpen,
    site2GateMinutesLeft,
    hasAnyTabsConfigured,
    sketch,
    logoSrc,
    headerLoadInputId,
    headerLoadRef,
    handleSite2GateToggle,
    handleResetDefault,
    handleOpenPdf,
    handleWarmPdf,
    handleOpenLoad,
    handleLoadInputChange,
    handleToggleSketch,
    handleSaveProject,
  } = useSidebarHeaderActions();

  const site2GateTooltip = hasAnyTabsConfigured
    ? site2GateOpen
      ? site2GateMinutesLeft
        ? `סגור טאבים באתר 2 (נותרו ~${site2GateMinutesLeft} דק׳)`
        : 'סגור טאבים באתר 2'
      : 'פתח טאבים באתר 2 (90 דקות)'
    : 'פתיחה/סגירה של טאבים באתר 2';
  const sketchTooltip = sketch ? 'תצוגת סקיצה פעילה' : 'תצוגת סקיצה';

  return (
    <div className="header wp-r-header">
      <img src={logoSrc} alt="WardrobePro" className="header-logo wp-r-header-logo" data-wp-logo="1" />

      <div
        className={`header-actions wp-r-header-actions ${!isSite2 ? 'wp-r-header-actions--has-gate' : ''}`}
      >
        {!isSite2 ? (
          <div className="wp-r-header-actions-col wp-r-header-actions-col--gate">
            <Button
              variant="header"
              className={`btn-header-tabs-toggle wp-r-header-hint hint-bottom ${site2GateOpen ? 'wp-r-btn-active' : ''}`}
              data-testid="header-site2-gate-button"
              aria-pressed={site2GateOpen}
              onClick={handleSite2GateToggle}
              data-tooltip={site2GateTooltip}
              aria-label={site2GateTooltip}
            >
              <i className={`fas ${site2GateOpen ? 'fa-eye' : 'fa-eye-slash'}`} aria-hidden="true" />
            </Button>

            <Button
              variant="header"
              className="btn-header-reset-default wp-r-header-hint hint-bottom"
              data-testid="header-reset-default-button"
              onClick={handleResetDefault}
              data-tooltip="איפוס לארון ברירת מחדל"
              aria-label="איפוס לארון ברירת מחדל"
            >
              <i className="fas fa-trash" aria-hidden="true" />
            </Button>
          </div>
        ) : null}

        <div className="wp-r-header-actions-col wp-r-header-actions-col--export">
          <Button
            variant="header"
            className="btn-header-export-pdf wp-r-header-hint hint-bottom"
            data-testid="header-open-pdf-button"
            onClick={handleOpenPdf}
            onMouseEnter={handleWarmPdf}
            data-tooltip="עורך PDF"
            aria-label="עורך PDF"
          >
            <i className="fas fa-file-pdf" aria-hidden="true" />
          </Button>

          <Button
            variant="header"
            className="btn-header-export-load wp-r-header-hint hint-bottom"
            data-testid="header-project-load-button"
            onClick={handleOpenLoad}
            data-tooltip="טען פרויקט"
            aria-label="טען פרויקט"
          >
            <i className="fas fa-folder-open" aria-hidden="true" />
          </Button>
        </div>

        <div className="wp-r-header-actions-col wp-r-header-actions-col--main">
          <Button
            variant="header"
            className={`btn-header-sketch wp-r-header-hint hint-bottom ${sketch ? 'wp-r-btn-active' : ''}`}
            data-testid="header-sketch-toggle-button"
            aria-pressed={sketch}
            onClick={handleToggleSketch}
            data-tooltip={sketchTooltip}
            aria-label={sketchTooltip}
          >
            <i className="fas fa-pencil-alt" aria-hidden="true" />
          </Button>

          <Button
            variant="header"
            className="btn-save btn-header-save wp-r-header-hint hint-bottom"
            data-testid="header-project-save-button"
            onClick={handleSaveProject}
            data-tooltip="שמור פרויקט"
            aria-label="שמור פרויקט"
          >
            <i className="fas fa-save" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <input
        ref={headerLoadRef}
        id={headerLoadInputId}
        name="projectFile"
        data-testid="header-project-load-input"
        aria-label="טען קובץ פרויקט"
        type="file"
        className="hidden"
        accept=".json,application/json"
        onChange={handleLoadInputChange}
      />
    </div>
  );
}
