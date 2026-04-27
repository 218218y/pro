import {
  canCommitBootSeedUiSnapshot,
  commitBootSeedUiSnapshotOrThrow,
  resetHistoryBaselineOrThrow,
  hasEssentialUiDimsFromSnapshot,
  installStoreReactivityOrThrow,
} from '../services/api.js';
import { getUi } from './store_access.js';
import type { AppContainer, UnknownRecord } from '../../../types';
import type { UiBootReporterLike } from './ui_boot_controller_shared.js';
import { readRecord, reportUiBootPlatformError } from './ui_boot_controller_shared.js';

export function installUiBootStoreSeedAndHistory(App: AppContainer, reporter: UiBootReporterLike): void {
  try {
    installStoreReactivityOrThrow(App, 'UI boot store reactivity');
  } catch (err) {
    const bootErr = reporter.toBootError(
      'store.installReactivity',
      '[WardrobePro] Canonical store reactivity must be installed before UI boot completes.',
      err
    );
    reportUiBootPlatformError(App, reporter, 'boot.installStoreReactivity', bootErr);
    reporter.throwHard('store.installReactivity', bootErr.message, bootErr);
  }

  if (canCommitBootSeedUiSnapshot(App)) {
    let seedUi: UnknownRecord = {};

    try {
      seedUi = readRecord(getUi(App)) || {};
    } catch (err) {
      reporter.throwHard(
        'getUi.seedSnapshot',
        '[WardrobePro] UI boot seed could not read the canonical store.ui snapshot.',
        err
      );
    }

    if (!hasEssentialUiDimsFromSnapshot(seedUi)) {
      const err = reporter.toBootError(
        'store.seedUi.missingFields',
        '[WardrobePro] Boot seed requires essential UI fields in store.ui (width/height/depth/doors). DOM seeding (legacy UI readers) has been removed; fix the default store state or early UI init.'
      );
      reportUiBootPlatformError(App, reporter, 'boot.seedUi', err);
      reporter.throwHard('store.seedUi.missingFields', err.message, err);
    }

    try {
      commitBootSeedUiSnapshotOrThrow(App, seedUi, 'init:seed', 'UI boot seed snapshot');
    } catch (err) {
      reporter.throwHard(
        'store.commitSeedUiSnapshot',
        '[WardrobePro] Canonical boot seed commit failed. commitUiSnapshot must stay installed during UI boot.',
        err
      );
    }
  }

  try {
    resetHistoryBaselineOrThrow(App, { source: 'init:seed' }, 'UI boot history baseline reset');
  } catch (err) {
    reporter.throwHard(
      'history.resetBaseline(init:seed)',
      '[WardrobePro] UI boot history baseline reset failed after applying the canonical seed snapshot.',
      err
    );
  }
}
