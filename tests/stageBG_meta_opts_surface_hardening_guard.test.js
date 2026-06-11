import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const kernelTypes = read('types/kernel.ts');
const stateTypes = read('types/state.ts');
const cloudSyncTypes = read('types/cloud_sync.ts');
const modes = read('esm/native/ui/modes.ts');
const roomActions = read('esm/native/ui/react/actions/room_actions.ts');
const sketchActions = read('esm/native/ui/react/actions/sketch_actions.ts');
const storeActions = [
  read('esm/native/ui/react/actions/store_actions.ts'),
  read('esm/native/ui/react/actions/store_actions_runtime.ts'),
].join('\n');
const historyAccess = read('esm/native/runtime/history_system_access.ts');
const historyAccessServices = read('esm/native/runtime/history_system_access_services.ts');
const stateKernelService = read('esm/native/kernel/state_kernel_service.ts');
const cloudSyncRealtime = [
  read('esm/native/services/cloud_sync_realtime.ts'),
  read('esm/native/services/cloud_sync_realtime_shared.ts'),
].join('\n');
const interiorTabView = [
  read('esm/native/ui/react/tabs/InteriorTab.view.tsx'),
  read('esm/native/ui/react/tabs/use_interior_tab_view_state.ts'),
  read('esm/native/ui/react/tabs/interior_tab_view_state_core_runtime.ts'),
].join('\n');

test('[stageBG] residual meta/opts seams use shared typed contracts instead of raw unknown bags', () => {
  assert.match(kernelTypes, /export interface ModeActionOptsLike extends UnknownRecord \{/);
  assert.match(kernelTypes, /handleType\?: string \| null;/);
  assert.match(kernelTypes, /edgeHandleVariant\?: 'short' \| 'long' \| string \| null;/);
  assert.match(kernelTypes, /extDrawerCount\?: number \| null;/);

  assert.match(
    cloudSyncTypes,
    /export interface CloudSyncRealtimeChannelOptionsLike extends UnknownRecord \{/
  );
  assert.match(cloudSyncTypes, /channel\?: \(name: string, opts\?: CloudSyncRealtimeChannelOptionsLike\)/);

  assert.match(
    modes,
    /export function applyModeOpts\(App: AppLike, mode: string, opts\?: ModeActionOptsLike\): void \{/
  );
  assert.match(interiorTabView, /opts\?: ModeActionOptsLike;/);
  assert.match(storeActions, /opts\?: ModulesRecomputeFromUiOptionsLike/);

  assert.match(
    roomActions,
    /export function setRoomOpen\(app: AppContainer, open: unknown, opts\?: DoorsSetOpenOptionsLike\): void \{/
  );
  assert.match(
    roomActions,
    /export function setManualWidth\(app: AppContainer, isManual: boolean, meta\?: ActionMetaLike\): unknown \{/
  );
  assert.match(
    sketchActions,
    /export function toggleSketchMode\(app: AppContainer, meta\?: ActionMetaLike\): void \{/
  );

  assert.match(historyAccess, /from '\.\/history_system_access_services\.js';/);
  assert.match(
    historyAccessServices,
    /export type HistoryServiceMethodArg = ActionMetaLike \| HistoryPushRequestLike \| undefined;/
  );
  assert.match(stateTypes, /patchModuleConfigForStack\?: \([\s\S]*meta\?: ActionMetaLike/);
  assert.match(
    stateKernelService,
    /type StateKernelPatchFn = \(indexOrKey: number \| string, patch: ModuleConfigPatchLike, meta\?: ActionMetaLike\) => unknown;/
  );
  assert.match(
    cloudSyncRealtime,
    /function getRealtimeChannel\(client: CloudSyncRealtimeClientLike \| null, name: string, opts\?: CloudSyncRealtimeChannelOptionsLike\): CloudSyncRealtimeChannelLike \| null \{/
  );

  assert.doesNotMatch(modes, /applyModeOpts\(App: AppLike, mode: string, opts\?: unknown\)/);
  assert.doesNotMatch(roomActions, /setManualWidth\(app: AppContainer, isManual: boolean, meta\?: unknown\)/);
  assert.doesNotMatch(sketchActions, /toggleSketchMode\(app: AppContainer, meta\?: unknown\)/);
  assert.doesNotMatch(
    historyAccessServices,
    /function callHistoryServiceMethodMaybe\(App: unknown, methodName: HistoryServiceMethodName, arg\?: unknown\)/
  );
});
