import test from 'node:test';
import assert from 'node:assert/strict';

import type { ActionMetaLike } from '../types';
import type {
  StoreUiActionRuntime,
  StoreUiNamedActions,
} from '../esm/native/ui/react/actions/store_actions_ui_contracts.js';
import { applyUiRawScalarPatch } from '../esm/native/ui/react/actions/store_actions_ui_writes.js';
import { setUiActiveTab } from '../esm/native/ui/react/actions/store_actions_ui_project.js';
import {
  setUiBaseType,
  setUiColorChoice,
  setUiStackSplitEnabled,
  setUiWidth,
} from '../esm/native/ui/react/actions/store_actions_ui_structure.js';
import {
  setUiGridDivisionsState,
  setUiShowContents,
} from '../esm/native/ui/react/actions/store_actions_ui_render.js';

type Call = [op: string, ...args: unknown[]];

function createRuntime(named: StoreUiNamedActions = {}) {
  const calls: Call[] = [];
  const runtime: StoreUiActionRuntime = {
    readUiActions: () => named,
    patch: (patch, meta) => calls.push(['patch', patch, meta]),
    patchSoft: (patch, meta) => calls.push(['patchSoft', patch, meta]),
    setRawScalar: (key: string, value: unknown, meta?: ActionMetaLike) =>
      calls.push(['setRawScalar', key, value, meta]),
    setScalar: (key, value, meta) => calls.push(['setScalar', key, value, meta]),
    setScalarSoft: (key, value, meta) => calls.push(['setScalarSoft', key, value, meta]),
    setLastSelectedWallColor: (value, meta) => calls.push(['setLastSelectedWallColor', value, meta]),
    setLightScalar: (key, value, meta) => calls.push(['setLightScalar', key, value, meta]),
    patchLightingState: (patch, meta) => calls.push(['patchLightingState', patch, meta]),
  };
  return { runtime, calls };
}

test('[store-ui-capability] structure actions execute against narrow capabilities without an AppContainer', () => {
  const meta = { source: 'capability:test' };
  const { runtime, calls } = createRuntime();

  setUiBaseType(runtime, 'legs', meta);
  setUiWidth(runtime, 180, meta);
  setUiStackSplitEnabled(runtime, true, meta);
  setUiColorChoice(runtime, 'oak', meta);

  assert.deepEqual(calls, [
    ['setScalar', 'baseType', 'legs', meta],
    ['setRawScalar', 'width', 180, meta],
    ['setScalar', 'stackSplitEnabled', true, meta],
    ['setScalar', 'colorChoice', 'oak', meta],
  ]);
});

test('[store-ui-capability] dedicated UI actions remain authoritative when the host provides them', () => {
  const calls: Call[] = [];
  const meta = { source: 'capability:dedicated' };
  const { runtime } = createRuntime({
    setBaseType: (value, actionMeta) => calls.push(['dedicatedBaseType', value, actionMeta]),
    setActiveTab: (value, actionMeta) => calls.push(['dedicatedActiveTab', value, actionMeta]),
    setShowContents: (value, actionMeta) => calls.push(['dedicatedShowContents', value, actionMeta]),
  });

  setUiBaseType(runtime, 'plinth', meta);
  setUiActiveTab(runtime, 'structure', meta);
  setUiShowContents(runtime, true, meta);

  assert.deepEqual(calls, [
    ['dedicatedBaseType', 'plinth', meta],
    ['dedicatedActiveTab', 'structure', meta],
    ['dedicatedShowContents', true, meta],
  ]);
});

test('[store-ui-capability] render fallbacks preserve coupled UI invariants without application access', () => {
  const meta = { source: 'capability:render' };
  const { runtime, calls } = createRuntime();

  setUiShowContents(runtime, true, meta);
  setUiGridDivisionsState(runtime, 6, { cellA: 4 }, 'cellA', meta);

  assert.deepEqual(calls, [
    ['patch', { showContents: true, showHanger: false }, meta],
    ['patchSoft', { currentGridDivisions: 6, perCellGridMap: { cellA: 4 }, activeGridCellId: 'cellA' }, meta],
  ]);
});

test('[store-ui-capability] raw patch batching stays capability-owned and typed', () => {
  const meta = { source: 'capability:raw' };
  const { runtime, calls } = createRuntime();

  applyUiRawScalarPatch(runtime, { width: 180, depth: 62, unsupported: 7 }, meta);

  assert.deepEqual(calls, [['patchSoft', { raw: { width: 180, depth: 62 } }, meta]]);
});
