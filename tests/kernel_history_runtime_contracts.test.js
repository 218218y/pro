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
import { readBuildTypesBundleNormalized } from './_build_types_bundle.js';

const readNormalized = rel =>
  normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

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
const kernelTypes = readNormalized('types/kernel.ts');
const stateTypes = readNormalized('types/state.ts');
const buildTypes = readBuildTypesBundleNormalized(import.meta.url);
const appTypes = readNormalized('types/app.ts');
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
  assertMatchesAll(
    assert,
    kernelTypes,
    [
      /export interface HistoryPushRequestLike extends ActionMetaLike \{/,
      /export interface HistoryStatusLike extends UnknownRecord \{/,
      /export type HistoryStatusListener = \(status: HistoryStatusLike, meta\?: ActionMetaLike\) => void;/,
      /schedulePush\?: \(meta\?: ActionMetaLike\) => unknown;/,
      /flushPendingPush\?: \(opts\?: HistoryPushRequestLike\) => unknown;/,
      /pushState\?: \(opts\?: HistoryPushRequestLike\) => unknown;/,
      /flushOrPush\?: \(opts\?: HistoryPushRequestLike\) => unknown;/,
    ],
    'kernel types'
  );
  assertMatchesAll(
    assert,
    stateTypes,
    [
      /patchModuleConfig: \(indexOrKey: number \| string, patch: ModuleConfigPatchLike, meta\?: ActionMetaLike\) => unknown;/,
      /patchSplitLowerModuleConfig: \(indexOrKey: number \| string, patch: ModuleConfigPatchLike, meta\?: ActionMetaLike\) => unknown;/,
      /commitFromSnapshot\?: \(snapshot: unknown, meta\?: ActionMetaLike\) => unknown;/,
      /touch\?: \(meta\?: ActionMetaLike\) => unknown;/,
    ],
    'state types'
  );
  assertMatchesAll(
    assert,
    buildTypes,
    [
      /setActive\?: \(on: boolean, meta\?: ActionMetaLike\) => unknown;/,
      /schedulePush\?: \(meta\?: ActionMetaLike\) => void;/,
      /flushPendingPush\?: \(opts\?: HistoryPushRequestLike\) => void;/,
      /subscribeStatus\?: \(listener: HistoryStatusListener\) => \(\) => void;/,
    ],
    'build types'
  );
  assertMatchesAll(
    assert,
    appTypes,
    [
      /setSketchMode: \(v: boolean, meta\?: ActionMetaLike\) => unknown;/,
      /toggleSketchMode\?: \(meta\?: ActionMetaLike\) => unknown;/,
    ],
    'app types'
  );
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
