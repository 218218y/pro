import type { ReactElement } from 'react';

import { Section, TabPanel } from '../components/index.js';
import { useApp, useExportActions, useMeta } from '../hooks.js';
import { setUiOrderPdfEditorOpen } from '../actions/store_actions.js';
import { ProjectPanel } from '../panels/ProjectPanel.js';
import { CloudSyncPanel } from '../panels/CloudSyncPanel.js';
import { runPerfAction } from '../../../services/api.js';
import { SettingsBackupPanel } from '../panels/SettingsBackupPanel.js';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type ExportActionProps = {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  variant?: 'primary' | 'accent' | 'default';
  titleAttr?: string;
  testId?: string;
};

function ExportAction(props: ExportActionProps): ReactElement {
  const { icon, title, subtitle, onClick, variant = 'default', titleAttr, testId } = props;

  return (
    <button
      type="button"
      className={cx(
        'wp-r-export-action',
        variant === 'primary' && 'wp-r-export-action--primary',
        variant === 'accent' && 'wp-r-export-action--accent'
      )}
      onClick={onClick}
      title={titleAttr}
      data-testid={testId}
    >
      <span className="wp-r-export-action-icon" aria-hidden="true">
        <i className={icon} />
      </span>

      <span className="wp-r-export-action-text">
        <span className="wp-r-export-action-title">{title}</span>
        <span className="wp-r-export-action-sub">{subtitle}</span>
      </span>
    </button>
  );
}

export function ExportTab(props: { active: boolean }): ReactElement {
  const app = useApp();
  const meta = useMeta();
  const exp = useExportActions();
  const exportMeta =
    typeof meta.uiOnly === 'function'
      ? meta.uiOnly(undefined, 'react:export')
      : {
          source: 'react:export',
          immediate: true,
          noBuild: true,
          noHistory: true,
          noPersist: true,
          noCapture: true,
        };

  return (
    <TabPanel tabId="export" active={props.active}>
      {/*
        Important performance note:
        This tab contains panels with live subscriptions (e.g. CloudSyncPanel cloud snapshot updates).
        We render the heavy content only when the tab is active, so background tabs stay quiet.
      */}
      {props.active ? (
        <div className="wp-r-export-layout">
          <Section title="ייצוא תמונות" className="wp-r-export-images">
            <div className="wp-r-export-grid">
              <ExportAction
                icon="fas fa-camera"
                title="צילום"
                subtitle="תמונה אחת להורדה"
                variant="primary"
                testId="export-snapshot-button"
                onClick={() => {
                  void exp.exportTakeSnapshot();
                }}
              />

              <ExportAction
                icon="fas fa-copy"
                title="העתק ללוח"
                subtitle="תמונה אחת העתקה ללוח"
                variant="accent"
                testId="export-copy-button"
                onClick={() => {
                  void exp.exportCopyToClipboard();
                }}
              />

              <ExportAction
                icon="fas fa-images"
                title="סקיצה/הדמיה"
                subtitle="תמונה משולבת אחת"
                titleAttr="ייצוא הדמיה + סקיצה"
                testId="export-render-sketch-button"
                onClick={() => {
                  void exp.exportRenderAndSketch();
                }}
              />

              <ExportAction
                icon="fas fa-columns"
                title="פתוח/סגור"
                subtitle="תמונה משולבת אחת"
                titleAttr="פתוח סגור"
                testId="export-dual-image-button"
                onClick={() => {
                  void exp.exportDualImage();
                }}
              />

              <ExportAction
                icon="fas fa-file-pdf"
                title="PDF עריכה"
                subtitle="פתח טופס בדפדפן ואז ייצא"
                titleAttr="עורך PDF להזמנה"
                testId="export-open-pdf-button"
                onClick={() =>
                  runPerfAction(app, 'orderPdf.open', () => setUiOrderPdfEditorOpen(app, true, exportMeta), {
                    detail: { source: 'export' },
                  })
                }
              />
            </div>
          </Section>

          <ProjectPanel />
          <CloudSyncPanel />
          <SettingsBackupPanel />
        </div>
      ) : null}
    </TabPanel>
  );
}
