import type { ActionMetaLike, AppContainer, CloudSyncDeleteTempResult } from '../../../../types';

import { runAppActionFamilySingleFlight, type AppActionFamilyFlight } from '../action_family_singleflight.js';
import {
  reportCloudDeleteTempResult,
  reportCloudSketchSyncResult,
  reportCloudSyncShareLinkResult,
  reportFloatingSketchSyncPinResult,
  reportSite2TabsGateResult,
} from '../cloud_sync_action_feedback.js';

import type { ResolvedCloudSyncUiActionCommands } from './cloud_sync_ui_action_controller_commands.js';
import {
  buildDeleteTempBusyResult,
  buildDeleteTempErrorResult,
  buildShareLinkErrorResult,
  buildSketchSyncErrorResult,
  buildSyncPinBusyResult,
  buildSyncPinErrorResult,
  buildTabsGateBusyResult,
  buildTabsGateErrorResult,
  cloneActionMeta,
  type CloudSyncUiFeedbackLike,
} from './cloud_sync_ui_action_controller_shared.js';

type CloudSyncUiActionFlight<Key extends string> = AppActionFamilyFlight<void, Key>;

type DeleteTempKind = 'models' | 'colors';

type MutationRunArgs = {
  app: AppContainer;
  fb: CloudSyncUiFeedbackLike | null | undefined;
  commands: ResolvedCloudSyncUiActionCommands;
};

const copyShareLinkFlights = new WeakMap<object, CloudSyncUiActionFlight<'copyShareLink'>>();
const sketchSyncFlights = new WeakMap<object, CloudSyncUiActionFlight<'syncSketch'>>();
const deleteTempFlights = new WeakMap<object, CloudSyncUiActionFlight<DeleteTempKind>>();
const floatingSyncFlights = new WeakMap<object, CloudSyncUiActionFlight<'set:0' | 'set:1' | 'toggle'>>();
const site2TabsGateFlights = new WeakMap<object, CloudSyncUiActionFlight<'open:0' | 'open:1'>>();

function reportDeleteTempBusy(fb: CloudSyncUiFeedbackLike | null | undefined, kind: DeleteTempKind): void {
  reportCloudDeleteTempResult(fb, buildDeleteTempBusyResult(), kind);
}

function reportSyncPinBusy(fb: CloudSyncUiFeedbackLike | null | undefined): void {
  reportFloatingSketchSyncPinResult(fb, buildSyncPinBusyResult());
}

function reportSite2TabsGateBusy(fb: CloudSyncUiFeedbackLike | null | undefined): void {
  reportSite2TabsGateResult(fb, buildTabsGateBusyResult());
}

export async function runCloudSyncUiCopyShareLink(args: MutationRunArgs): Promise<void> {
  const { app, fb, commands } = args;
  return await runAppActionFamilySingleFlight({
    app,
    flights: copyShareLinkFlights,
    key: 'copyShareLink',
    run: async () => {
      try {
        const result = await commands.copyShareLinkCommand(app);
        reportCloudSyncShareLinkResult(fb, result);
      } catch (err) {
        reportCloudSyncShareLinkResult(fb, buildShareLinkErrorResult(err));
      }
    },
  });
}

export async function runCloudSyncUiSyncSketch(args: MutationRunArgs): Promise<void> {
  const { app, fb, commands } = args;
  return await runAppActionFamilySingleFlight({
    app,
    flights: sketchSyncFlights,
    key: 'syncSketch',
    run: async () => {
      try {
        const result = await commands.syncSketchCommand(app);
        reportCloudSketchSyncResult(fb, result);
      } catch (err) {
        reportCloudSketchSyncResult(fb, buildSketchSyncErrorResult(err));
      }
    },
  });
}

function readDeleteTempCommand(
  commands: ResolvedCloudSyncUiActionCommands,
  kind: DeleteTempKind
): (app: AppContainer) => Promise<CloudSyncDeleteTempResult> {
  return kind === 'models' ? commands.deleteModelsCommand : commands.deleteColorsCommand;
}

export async function runCloudSyncUiDeleteTemporary(
  args: MutationRunArgs & { kind: DeleteTempKind }
): Promise<void> {
  const { app, fb, commands, kind } = args;
  const runDelete = readDeleteTempCommand(commands, kind);
  return await runAppActionFamilySingleFlight({
    app,
    flights: deleteTempFlights,
    key: kind,
    onBusy: () => {
      reportDeleteTempBusy(fb, kind);
    },
    run: async () => {
      try {
        const result = await runDelete(app);
        reportCloudDeleteTempResult(fb, result, kind);
      } catch (err) {
        reportCloudDeleteTempResult(fb, buildDeleteTempErrorResult(err), kind);
      }
    },
  });
}

export async function runCloudSyncUiSetFloatingSyncEnabled(
  args: MutationRunArgs & { enabled: boolean }
): Promise<void> {
  const { app, fb, commands, enabled } = args;
  return await runAppActionFamilySingleFlight({
    app,
    flights: floatingSyncFlights,
    key: `set:${enabled ? '1' : '0'}`,
    onBusy: () => {
      reportSyncPinBusy(fb);
    },
    run: async () => {
      try {
        const result = await commands.setFloatingSyncCommand(app, !!enabled);
        reportFloatingSketchSyncPinResult(fb, result);
      } catch (err) {
        reportFloatingSketchSyncPinResult(fb, buildSyncPinErrorResult(err));
      }
    },
  });
}

export async function runCloudSyncUiToggleFloatingSyncEnabled(args: MutationRunArgs): Promise<void> {
  const { app, fb, commands } = args;
  return await runAppActionFamilySingleFlight({
    app,
    flights: floatingSyncFlights,
    key: 'toggle',
    onBusy: () => {
      reportSyncPinBusy(fb);
    },
    run: async () => {
      try {
        const result = await commands.toggleFloatingSyncCommand(app);
        reportFloatingSketchSyncPinResult(fb, result);
      } catch (err) {
        reportFloatingSketchSyncPinResult(fb, buildSyncPinErrorResult(err));
      }
    },
  });
}

export async function runCloudSyncUiToggleSite2TabsGate(
  args: MutationRunArgs & { nextOpen: boolean; meta: ActionMetaLike }
): Promise<void> {
  const { app, fb, commands, nextOpen, meta } = args;
  const safeMeta = cloneActionMeta(meta);
  return await runAppActionFamilySingleFlight({
    app,
    flights: site2TabsGateFlights,
    key: `open:${nextOpen ? '1' : '0'}`,
    onBusy: () => {
      reportSite2TabsGateBusy(fb);
    },
    run: async () => {
      try {
        const result = await commands.toggleSite2TabsGateCommand(app, !!nextOpen, safeMeta);
        reportSite2TabsGateResult(fb, result);
      } catch (err) {
        reportSite2TabsGateResult(fb, buildTabsGateErrorResult(err));
      }
    },
  });
}
