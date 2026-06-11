import type { AppContainer } from '../../../types';
import type { SettingsBackupActionResult } from './settings_backup_contracts.js';
import { downloadJsonObjectResultViaBrowser } from './browser_file_download.js';
import {
  buildSettingsBackupActionErrorResult,
  buildSettingsBackupExportFailureResult,
  buildSettingsBackupExportSuccessResult,
} from './settings_backup_action_result.js';
import { countItems, SettingsBackupActionError } from './settings_backup_shared.js';
import {
  buildExportBackupData,
  requireSettingsBackupApp,
  settingsBackupReport,
} from './settings_backup_support.js';
import { runSettingsBackupFlight, runSettingsBackupPerfAction } from './settings_backup_runtime.js';

export async function exportSystemSettings(App: AppContainer): Promise<SettingsBackupActionResult> {
  App = requireSettingsBackupApp(App);

  return runSettingsBackupFlight(App, 'export', async () => {
    return await runSettingsBackupPerfAction(App, 'settingsBackup.export', async () => {
      try {
        const settingsData = buildExportBackupData(App);
        const fileName = `wardrobe_system_backup_${new Date().toISOString().slice(0, 10)}.json`;
        const downloadResult = downloadJsonObjectResultViaBrowser(App, fileName, settingsData, {
          spacing: 2,
        });
        if (downloadResult.ok === false) {
          return buildSettingsBackupExportFailureResult(downloadResult.reason, downloadResult.message);
        }
        return buildSettingsBackupExportSuccessResult(
          countItems(settingsData.savedModels),
          countItems(settingsData.savedColors)
        );
      } catch (error) {
        if (!(error instanceof SettingsBackupActionError)) settingsBackupReport(App, 'export', error);
        return buildSettingsBackupActionErrorResult(
          'export',
          error,
          '[WardrobePro] Settings backup export failed.'
        );
      }
    });
  });
}
