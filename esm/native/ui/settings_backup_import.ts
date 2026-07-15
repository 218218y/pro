import type { AppContainer } from '../../../types';
import { normalizeUnknownError } from '../services/api.js';
import type { SettingsBackupActionResult } from './settings_backup_contracts.js';
import {
  buildSettingsBackupActionErrorResult,
  buildSettingsBackupImportFailureResult,
  buildSettingsBackupImportSuccessResult,
} from './settings_backup_action_result.js';
import { clearInputValue, getImportFile, SettingsBackupActionError } from './settings_backup_shared.js';
import { requireSettingsBackupApp, settingsBackupReport } from './settings_backup_support.js';
import {
  buildSettingsImportPlan,
  commitSettingsImportPlan,
  parseSettingsBackupSafe,
  readBackupFileTextSafe,
} from './settings_backup_import_support.js';
import {
  runConfirmedSettingsBackupImportFlight,
  runSettingsBackupPerfAction,
} from './settings_backup_runtime.js';

export async function importSystemSettings(
  App: AppContainer,
  event: unknown
): Promise<SettingsBackupActionResult> {
  App = requireSettingsBackupApp(App);
  const file = getImportFile(event);

  if (!file) {
    clearInputValue(event);
    return buildSettingsBackupImportFailureResult('cancelled');
  }

  try {
    return await runSettingsBackupPerfAction(
      App,
      'settingsBackup.import',
      async () =>
        await runConfirmedSettingsBackupImportFlight({
          App,
          event,
          onRequestError: message =>
            buildSettingsBackupActionErrorResult('import', message, 'ייבוא הגדרות נכשל'),
          runConfirmed: async () => {
            const readResult = await runSettingsBackupPerfAction(App, 'settingsBackup.import.readFile', () =>
              readBackupFileTextSafe(App, file)
            );
            if (readResult.ok === false) {
              return buildSettingsBackupImportFailureResult(readResult.reason, readResult.message);
            }

            const parsed = await runSettingsBackupPerfAction(App, 'settingsBackup.import.parse', () =>
              parseSettingsBackupSafe(readResult.text)
            );
            if (parsed.ok === false) {
              return buildSettingsBackupImportFailureResult(parsed.reason, parsed.message);
            }

            const plan = buildSettingsImportPlan(App, parsed.data);
            const committed = await runSettingsBackupPerfAction(App, 'settingsBackup.import.commit', () =>
              commitSettingsImportPlan(App, plan)
            );
            return buildSettingsBackupImportSuccessResult(
              committed.modelsMergeResult.added,
              committed.colorsAdded,
              committed.warnings
            );
          },
        })
    );
  } catch (error) {
    if (!(error instanceof SettingsBackupActionError)) settingsBackupReport(App, 'import', error);
    const reason = error instanceof SettingsBackupActionError ? error.reason : 'error';
    const message = normalizeUnknownError(error).message;
    return reason === 'models-unavailable'
      ? buildSettingsBackupImportFailureResult(reason, message)
      : buildSettingsBackupActionErrorResult('import', error, '[WardrobePro] Settings backup import failed.');
  } finally {
    clearInputValue(event);
  }
}
