import type { ReactElement } from 'react';

import { Section, TabPanel } from '../components/index.js';
import { useApp, useExportActions, useMeta } from '../hooks.js';
import { setUiOrderPdfEditorOpen } from '../actions/store_actions.js';
import { CloudSyncPanel } from '../panels/CloudSyncPanel.js';
import { runPerfAction } from '../../../services/api.js';
import { SettingsBackupPanel } from '../panels/SettingsBackupPanel.js';
import {
  SettingsVisualDisplaySection,
  SettingsVisualLightingSection,
  SettingsVisualRoomSection,
} from './settings_visual_sections.js';
import { useSettingsVisualController } from './use_settings_visual_controller.js';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type SettingsActionProps = {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  variant?: 'primary' | 'accent' | 'default';
  titleAttr?: string;
  testId?: string;
};

function SettingsAction(props: SettingsActionProps): ReactElement {
  const { icon, title, subtitle, onClick, variant = 'default', titleAttr, testId } = props;

  return (
    <button
      type="button"
      className={cx(
        'wp-r-settings-action',
        titleAttr && 'wp-r-styled-tooltip hint-bottom',
        variant === 'primary' && 'wp-r-settings-action--primary',
        variant === 'accent' && 'wp-r-settings-action--accent'
      )}
      onClick={onClick}
      data-tooltip={titleAttr}
      data-testid={testId}
    >
      <span className="wp-r-settings-action-icon" aria-hidden="true">
        <i className={icon} />
      </span>

      <span className="wp-r-settings-action-text">
        <span className="wp-r-settings-action-title">{title}</span>
        <span className="wp-r-settings-action-sub">{subtitle}</span>
      </span>
    </button>
  );
}

export function SettingsTab(props: { active: boolean }): ReactElement {
  const app = useApp();
  const meta = useMeta();
  const exp = useExportActions();
  const visualController = useSettingsVisualController();
  const settingsMeta =
    typeof meta.uiOnly === 'function'
      ? meta.uiOnly(undefined, 'react:settings')
      : {
          source: 'react:settings',
          immediate: true,
          noBuild: true,
          noHistory: true,
          noPersist: true,
          noCapture: true,
        };

  return (
    <TabPanel tabId="settings" active={props.active}>
      {/*
        Important performance note:
        This tab contains panels with live subscriptions (e.g. CloudSyncPanel cloud snapshot updates).
        We render the heavy content only when the tab is active, so background tabs stay quiet.
      */}
      {props.active ? (
        <div className="wp-r-settings-layout">
          <Section title="ייצוא תמונות" className="wp-r-settings-images">
            <div className="wp-r-settings-grid">
              <SettingsAction
                icon="fas fa-camera"
                title="צילום"
                subtitle="תמונה תצוגה נוכחית להורדה למחשב"
                variant="primary"
                testId="export-snapshot-button"
                onClick={() => {
                  void exp.exportTakeSnapshot();
                }}
              />

              <SettingsAction
                icon="fas fa-copy"
                title="העתק ללוח"
                subtitle="תמונה תצוגה נוכחית - להעתקה ללוח"
                variant="accent"
                testId="export-copy-button"
                onClick={() => {
                  void exp.exportCopyToClipboard();
                }}
              />

              <SettingsAction
                icon="fas fa-images"
                title="סקיצה/הדמיה"
                subtitle="תמונה מזווית קבועה משולבת משתי תמונות"
                titleAttr="ייצוא הדמיה + סקיצה"
                testId="export-render-sketch-button"
                onClick={() => {
                  void exp.exportRenderAndSketch();
                }}
              />

              <SettingsAction
                icon="fas fa-columns"
                title="פתוח/סגור"
                subtitle="תמונה מזווית קבועה משולבת משתי תמונות"
                titleAttr="פתוח סגור"
                testId="export-dual-image-button"
                onClick={() => {
                  void exp.exportDualImage();
                }}
              />

              <SettingsAction
                icon="fas fa-file-pdf"
                title="PDF עריכה"
                subtitle="פתח טופס בדפדפן ואז ייצא"
                titleAttr="עורך PDF להזמנה"
                testId="export-open-pdf-button"
                onClick={() =>
                  runPerfAction(
                    app,
                    'orderPdf.open',
                    () => setUiOrderPdfEditorOpen(app, true, settingsMeta),
                    {
                      detail: { source: 'settings' },
                    }
                  )
                }
              />
            </div>
          </Section>

          <SettingsVisualDisplaySection model={visualController.displaySection} />

          <SettingsVisualRoomSection model={visualController.roomSection} />
          <SettingsVisualLightingSection model={visualController.lightingSection} />
          <CloudSyncPanel />
          <SettingsBackupPanel />
        </div>
      ) : null}
    </TabPanel>
  );
}
