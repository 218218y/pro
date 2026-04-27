import type { AppContainer } from '../../../types';
import { buildPerfEntryOptionsFromActionResult, runPerfAction } from '../services/api.js';
import { runAppConfirmedActionFamilySingleFlight } from './confirmed_action_family_runtime.js';
import { runAppActionFamilySingleFlight, type AppActionFamilyFlight } from './action_family_singleflight.js';
import type { SettingsBackupActionResult } from './settings_backup_contracts.js';
import {
  buildSettingsBackupExportFailureResult,
  buildSettingsBackupImportFailureResult,
} from './settings_backup_action_result.js';
import { clearInputValue } from './settings_backup_shared.js';

type SettingsBackupFlightKey = 'export' | 'import';

type ConfirmImportArgs = {
  App: AppContainer;
  event: unknown;
  runConfirmed: () => Promise<SettingsBackupActionResult>;
  onRequestError: (message: string) => SettingsBackupActionResult;
};

const settingsBackupFlights = new WeakMap<
  object,
  AppActionFamilyFlight<SettingsBackupActionResult, SettingsBackupFlightKey>
>();

export function runSettingsBackupFlight(
  App: AppContainer,
  key: SettingsBackupFlightKey,
  run: () => Promise<SettingsBackupActionResult>
): Promise<SettingsBackupActionResult> {
  return runAppActionFamilySingleFlight({
    flights: settingsBackupFlights,
    app: App,
    key,
    run,
    onBusy: () =>
      key === 'import'
        ? buildSettingsBackupImportFailureResult('busy')
        : buildSettingsBackupExportFailureResult('busy'),
  });
}

type SettingsBackupPerfActionRunner = <T>(
  App: AppContainer,
  name: string,
  run: () => Promise<T> | T
) => Promise<T>;

export const runSettingsBackupPerfAction: SettingsBackupPerfActionRunner = async (App, name, run) => {
  if (typeof runPerfAction !== 'function') {
    return await run();
  }

  return await runPerfAction(App, name, run, {
    resolveEndOptions: result =>
      typeof buildPerfEntryOptionsFromActionResult === 'function'
        ? buildPerfEntryOptionsFromActionResult(result)
        : undefined,
  });
};

export async function runConfirmedSettingsBackupImportFlight({
  App,
  event,
  runConfirmed,
  onRequestError,
}: ConfirmImportArgs): Promise<SettingsBackupActionResult> {
  return runAppConfirmedActionFamilySingleFlight({
    flights: settingsBackupFlights,
    app: App,
    key: 'import',
    title: 'שחזור הגדרות',
    message: 'פעולה זו תמזג את הדגמים והצבעים מהקובץ לרשימה הקיימת שלך. האם להמשיך?',
    onRequestError,
    onCancelled: () => buildSettingsBackupImportFailureResult('cancelled'),
    onBusy: () => {
      clearInputValue(event);
      return buildSettingsBackupImportFailureResult('busy');
    },
    onReuse: () => {
      clearInputValue(event);
    },
    runConfirmed,
  });
}
