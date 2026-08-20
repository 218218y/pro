import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  bundleSources,
  readSource,
  normalizeWhitespace,
  assertMatchesAll,
  assertLacksAll,
} from './_source_bundle.js';
import { readBuildTypesBundle } from './_build_types_bundle.js';
import { getInterfaceFact, getTypeAliasFact } from './_semantic_source_contracts.js';

const readNormalized = rel =>
  normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const readRaw = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const kernelOwner = readSource('../esm/native/kernel/kernel.ts', import.meta.url);
const historyModule = bundleSources(
  [
    '../esm/native/kernel/kernel_history_system.ts',
    '../esm/native/kernel/kernel_history_system_contracts.ts',
    '../esm/native/kernel/kernel_history_system_shared.ts',
    '../esm/native/kernel/kernel_history_system_lifecycle.ts',
    '../esm/native/kernel/kernel_history_system_status.ts',
  ],
  import.meta.url
);
const overlay = bundleSources(
  ['../esm/native/ui/react/overlay_app.tsx', '../esm/native/ui/react/overlay_top_controls.tsx'],
  import.meta.url
);
const historyBundle = bundleSources(
  [
    '../esm/native/kernel/kernel.ts',
    '../esm/native/kernel/kernel_history_system.ts',
    '../esm/native/kernel/kernel_history_system_shared.ts',
    '../esm/native/kernel/kernel_history_system_lifecycle.ts',
    '../esm/native/kernel/kernel_history_system_status.ts',
  ],
  import.meta.url
);
const historyReadsBundle = bundleSources(
  [
    '../esm/native/services/autosave.ts',
    '../esm/native/services/history.ts',
    '../esm/native/services/models.ts',
    '../esm/native/ui/react/overlay_app.tsx',
    '../esm/native/ui/react/overlay_top_controls.tsx',
    '../esm/native/ui/react/boot_react_ui.tsx',
    '../esm/native/ui/interactions/history_ui.ts',
    '../esm/native/ui/interactions/canvas_interactions.ts',
  ],
  import.meta.url
);
const kernelTypesRaw = readRaw('types/kernel.ts');
const stateTypesRaw = readRaw('types/state.ts');
const buildTypesRaw = readBuildTypesBundle(import.meta.url);
const appTypesRaw = readRaw('types/app.ts');
const historyAccessEntry = readNormalized('esm/native/runtime/history_system_access.ts');
const historyAccess = normalizeWhitespace(
  bundleSources(
    [
      '../esm/native/runtime/history_system_access.ts',
      '../esm/native/runtime/history_system_access_actions.ts',
      '../esm/native/runtime/history_system_access_services.ts',
      '../esm/native/runtime/history_system_access_system.ts',
      '../esm/native/runtime/history_system_access_shared.ts',
    ],
    import.meta.url
  )
);
const historyService = readNormalized('esm/native/services/history.ts');

test('[kernel-history] kernel owner delegates history lifecycle and overlay uses canonical history seams', () => {
  assertMatchesAll(
    assert,
    kernelOwner,
    [
      /import \{ createKernelHistorySystem, type KernelHistorySystem \} from '\.\/kernel_history_system\.js';/,
      /const HistorySystem: KernelHistorySystem = createKernelHistorySystem\(\{/,
      /import \{ getUi, getRuntime \} from '\.\/store_access\.js';/,
      /function isRestoring\(\) \{/,
      /const runtime = asRecord\(getRuntime\(App0\), \{\}\);/,
    ],
    'kernel owner'
  );
  assert.doesNotMatch(kernelOwner, /getCurrentSnapshot: function \(/);
  assert.doesNotMatch(kernelOwner, /pushState: function \(/);
  assert.doesNotMatch(kernelOwner, /applyState: function \(/);

  assertMatchesAll(
    assert,
    historyModule,
    [
      /export interface KernelHistorySystem/,
      /export function createKernelHistorySystem\(/,
      /normalizeUndoSnapshot\(/,
      /preserveUiOnlySnapshotFields\(/,
      /historySystem\.undo = \(\) => \{/,
      /historySystem\.redo = \(\) => \{/,
    ],
    'kernel history module'
  );
  assert.doesNotMatch(historyModule, /this\.undoStack/);
  assert.doesNotMatch(historyModule, /this\.redoStack/);

  assertMatchesAll(
    assert,
    historyBundle,
    [
      /scheduleHistoryPushMaybe\(App, meta\)/,
      /flushOrPushHistoryStateMaybe\(App, opts\)/,
      /historySystem\.subscribeStatus = \(listener: KernelHistoryStatusListener\) => \{/,
    ],
    'kernel history bundle'
  );

  assertMatchesAll(
    assert,
    overlay,
    [
      /services\/api\.js/,
      /applyStatus\(getHistoryStatusMaybe\(app\)\);/,
      /return subscribeHistoryStatusMaybe\(app, \(next: HistoryStatusLike\) => \{/,
      /runHistoryUndoMaybe\(app\);/,
      /runHistoryRedoMaybe\(app\);/,
    ],
    'overlay history surface'
  );
  assert.doesNotMatch(overlay, /Object\.defineProperty\(out, 'onStatusChange'/);
  assert.doesNotMatch(overlay, /Reflect\.apply\(fn, hs, \[\]\)/);
  assert.doesNotMatch(overlay, /hs\.onStatusChange = /);
});

test('[history-types] history, state, build, and app surfaces keep explicit ActionMeta boundaries', () => {
  const historyRequest = getInterfaceFact(kernelTypesRaw, 'HistoryPushRequestLike', 'types/kernel.ts');
  assert.deepEqual(historyRequest?.extends, ['ActionMetaLike']);
  assert.deepEqual(historyRequest?.properties, [
    { name: 'noPush', optional: true, readonly: false, type: 'boolean' },
    { name: 'keepRedo', optional: true, readonly: false, type: 'boolean' },
  ]);

  const historyStatus = getInterfaceFact(kernelTypesRaw, 'HistoryStatusLike', 'types/kernel.ts');
  assert.deepEqual(historyStatus?.extends, ['UnknownRecord']);
  assert.deepEqual(historyStatus?.properties, [
    { name: 'canUndo', optional: false, readonly: false, type: 'boolean' },
    { name: 'canRedo', optional: false, readonly: false, type: 'boolean' },
    { name: 'undoCount', optional: false, readonly: false, type: 'number' },
    { name: 'redoCount', optional: false, readonly: false, type: 'number' },
    { name: 'isPaused', optional: false, readonly: false, type: 'boolean' },
  ]);
  assert.deepEqual(getTypeAliasFact(kernelTypesRaw, 'HistoryStatusListener', 'types/kernel.ts'), {
    name: 'HistoryStatusListener',
    type: 'fn(status:HistoryStatusLike,meta?:ActionMetaLike)->void',
  });

  const historyActions = getInterfaceFact(kernelTypesRaw, 'HistoryActionsNamespaceLike', 'types/kernel.ts');
  const historyActionProps = new Map(historyActions?.properties.map(prop => [prop.name, prop]));
  assert.equal(historyActionProps.get('schedulePush')?.type, 'fn(meta?:ActionMetaLike)->unknown');
  assert.equal(historyActionProps.get('flushPendingPush')?.type, 'fn(opts?:HistoryPushRequestLike)->unknown');
  assert.equal(historyActionProps.get('pushState')?.type, 'fn(opts?:HistoryPushRequestLike)->unknown');
  assert.equal(historyActionProps.get('flushOrPush')?.type, 'fn(opts?:HistoryPushRequestLike)->unknown');

  const stateKernel = getInterfaceFact(stateTypesRaw, 'StateKernelLike', 'types/state.ts');
  const stateProps = new Map(stateKernel?.properties.map(prop => [prop.name, prop]));
  assert.equal(
    stateProps.get('patchConfigScalar')?.type,
    'fn(key:string,valueOrFn:unknown,meta?:ActionMetaLike)->unknown'
  );
  assert.equal(
    stateProps.get('applyKernelConfigMapSnapshot')?.type,
    'fn(patchObj:unknown,meta?:ActionMetaLike)->unknown'
  );
  assert.equal(
    stateProps.get('commitFromSnapshot')?.type,
    'fn(snapshot:unknown,meta?:ActionMetaLike)->unknown'
  );
  assert.equal(stateProps.get('touch')?.type, 'fn(meta?:ActionMetaLike)->unknown');
  assert.equal(stateProps.has('patchModuleConfig'), false);
  assert.equal(stateProps.has('patchSplitLowerModuleConfig'), false);

  const roomDesign = getInterfaceFact(buildTypesRaw, 'RoomDesignServiceLike', 'types/build.ts bundle');
  assert.equal(
    roomDesign?.properties.find(prop => prop.name === 'setActive')?.type,
    'fn(on:boolean,meta?:ActionMetaLike)->unknown'
  );
  const historySystem = getInterfaceFact(buildTypesRaw, 'HistorySystemLike', 'types/build.ts bundle');
  const historySystemProps = new Map(historySystem?.properties.map(prop => [prop.name, prop]));
  assert.equal(historySystemProps.get('schedulePush')?.type, 'fn(meta?:ActionMetaLike)->void');
  assert.equal(historySystemProps.get('flushPendingPush')?.type, 'fn(opts?:HistoryPushRequestLike)->void');
  assert.equal(
    historySystemProps.get('subscribeStatus')?.type,
    'fn(listener:HistoryStatusListener)->fn()->void'
  );

  const viewNamespace = getInterfaceFact(appTypesRaw, 'ViewNamespaceLike', 'types/app.ts');
  const viewProps = new Map(viewNamespace?.properties.map(prop => [prop.name, prop]));
  assert.equal(viewProps.get('setSketchMode')?.type, 'fn(v:boolean,meta?:ActionMetaLike)->unknown');
  assert.equal(viewProps.get('toggleSketchMode')?.type, 'fn(meta?:ActionMetaLike)->unknown');

  assert.match(historyAccessEntry, /from '\.\/history_system_access_services\.js';/);
  assert.match(historyAccessEntry, /from '\.\/history_system_access_system\.js';/);
  assertMatchesAll(
    assert,
    historyAccess,
    [
      /import type \{[\s\S]*HistoryPushRequestLike,[\s\S]*HistorySystemLike,[\s\S]*\} from '\.\.\/\.\.\/\.\.\/types';/,
      /import type \{ HistoryStatusLike, HistoryStatusListener \} from '\.\/history_system_access_shared\.js';/,
      /export function scheduleHistoryPushMaybe\(App: unknown, meta\?: ActionMetaLike\): boolean \{/,
      /export function flushHistoryPendingPushMaybe\(App: unknown, opts\?: HistoryPushRequestLike\): boolean \{/,
    ],
    'history access runtime'
  );
  assert.doesNotMatch(
    historyAccess,
    /export type HistoryStatusListener = \(status: HistoryStatusLike, meta\?: unknown\) => void;/
  );
  assertMatchesAll(
    assert,
    historyService,
    [
      /from '\.\/history_shared\.js';/,
      /from '\.\/history_schedule\.js';/,
      /from '\.\/history_runtime\.js';/,
      /export \{ cancelPendingPush, flushPendingPush, schedulePush \} from '\.\/history_schedule\.js';/,
      /export \{ pause, pushNow, resume \} from '\.\/history_runtime\.js';/,
    ],
    'history service'
  );
  assert.doesNotMatch(historyService, /let _pendingAction: ActionMetaLike \| null = null;/);
  assert.doesNotMatch(historyService, /let _timer: TimeoutHandleLike \| null = null;/);
});

test('[history-access] probing stays centralized through runtime history seams and UI service API', () => {
  assertMatchesAll(
    assert,
    historyReadsBundle,
    [
      /services\/history\.ts/,
      /from '\.\/history_schedule\.js';/,
      /from '\.\/history_runtime\.js';/,
      /getHistoryStatusMaybe\(app\)/,
      /subscribeHistoryStatusMaybe\(app, /,
      /runHistoryUndoMaybe\(app\)|runHistoryUndoMaybe\(App\)/,
      /runHistoryRedoMaybe\(app\)|runHistoryRedoMaybe\(App\)/,
      /services\/api\.js/,
      /export function installHistoryUI\(/,
    ],
    'history reads bundle'
  );
  assertLacksAll(
    assert,
    historyReadsBundle,
    [
      /stateKernel\?\.historySystem/,
      /services\.history.*\.system/,
      /deps\.historySystem/,
      /getHistorySystem: getHistorySystemMaybe/,
      /store_reactivity_access\.js/,
    ],
    'history reads bundle'
  );
});
