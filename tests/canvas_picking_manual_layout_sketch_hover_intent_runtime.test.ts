import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readManualLayoutSketchRodHoverIntent,
  readManualLayoutSketchStackHoverIntent,
  resolveManualLayoutSketchHoverMatchState,
} from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_intent.ts';
import { createManualLayoutSketchStackHoverRecord } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_state.ts';
import { createRodRemoveHoverRecord } from '../esm/native/services/canvas_picking_sketch_module_surface_preview_hover_records.ts';
import { decodeManualLayoutCommand } from '../esm/native/services/canvas_picking_manual_layout_command.ts';

type SketchModuleKey = number | 'corner' | `corner:${number}` | null;

function toSketchModuleKey(value: unknown): SketchModuleKey {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value === 'corner') return value;
  if (typeof value === 'string' && value.startsWith('corner:')) return value as `corner:${number}`;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

test('manual-layout sketch hover match state accepts a recent matching hover snapshot', () => {
  const now = 2_000;
  const state = resolveManualLayoutSketchHoverMatchState({
    hover: {
      tool: 'sketch_rod',
      hostModuleKey: 'corner:2',
      hostIsBottom: true,
      ts: now - 250,
      kind: 'rod',
      op: 'remove',
      removeIdx: 1,
    },
    toModuleKey: toSketchModuleKey,
    tool: 'sketch_rod',
    moduleKey: 'corner:2',
    isBottom: true,
    now,
    maxAgeMs: 900,
  });

  assert.equal(state.hoverOk, true);
  assert.equal(state.hoverKind, 'rod');
  assert.equal(state.hoverOp, 'remove');
  assert.equal(state.hoverRec.removeIdx, 1);
  assert.equal(state.snapshot.moduleKey, 'corner:2');
});

test('manual-layout sketch hover match state rejects stale or mismatched hover snapshots', () => {
  const now = 5_000;
  const stale = resolveManualLayoutSketchHoverMatchState({
    hover: {
      tool: 'sketch_shelf:glass',
      hostModuleKey: 3,
      hostIsBottom: false,
      ts: now - 1_500,
      kind: 'shelf',
      op: 'remove',
    },
    toModuleKey: toSketchModuleKey,
    tool: 'sketch_shelf:glass',
    moduleKey: 3,
    isBottom: false,
    now,
    maxAgeMs: 900,
  });
  const mismatched = resolveManualLayoutSketchHoverMatchState({
    hover: {
      tool: 'sketch_shelf:glass',
      hostModuleKey: 2,
      hostIsBottom: false,
      ts: now - 100,
      kind: 'shelf',
      op: 'remove',
    },
    toModuleKey: toSketchModuleKey,
    tool: 'sketch_shelf:glass',
    moduleKey: 3,
    isBottom: false,
    now,
    maxAgeMs: 900,
  });

  assert.equal(stale.hoverOk, false);
  assert.equal(mismatched.hoverOk, false);
  assert.equal(mismatched.hoverRec.kind, 'shelf');
});

test('manual-layout sketch hover match state rejects records that still carry retired host identity fields', () => {
  const now = 9_000;
  const hover = {
    tool: 'sketch_box:40',
    moduleKey: 3,
    isBottom: false,
    hostModuleKey: '4',
    hostIsBottom: true,
    ts: now - 100,
    kind: 'box',
    op: 'remove',
  };

  const canonicalHost = resolveManualLayoutSketchHoverMatchState({
    hover,
    toModuleKey: toSketchModuleKey,
    tool: 'sketch_box:40',
    moduleKey: 4,
    isBottom: true,
    now,
    maxAgeMs: 900,
  });
  const legacyHost = resolveManualLayoutSketchHoverMatchState({
    hover,
    toModuleKey: toSketchModuleKey,
    tool: 'sketch_box:40',
    moduleKey: 3,
    isBottom: false,
    now,
    maxAgeMs: 900,
  });

  assert.equal(canonicalHost.hoverOk, false);
  assert.equal(canonicalHost.snapshot.moduleKey, null);
  assert.equal(canonicalHost.snapshot.isBottom, null);
  assert.equal(legacyHost.hoverOk, false);
});

test('manual-layout hover intent readers decode canonical versioned commands', () => {
  const host = { tool: 'sketch_ext_drawers:5:20', moduleKey: 2, isBottom: false, ts: 1_000 };
  const stack = readManualLayoutSketchStackHoverIntent(
    createManualLayoutSketchStackHoverRecord({
      host,
      kind: 'ext_drawers',
      op: 'add',
      yCenter: 1.2,
      baseY: 0.7,
      drawerCount: 5,
      drawerH: 0.2,
      drawerHeightM: 0.2,
      stackH: 1,
    })
  );
  const rod = readManualLayoutSketchRodHoverIntent(
    createRodRemoveHoverRecord({
      host: { ...host, tool: 'sketch_rod' },
      removeKind: 'base',
      removeIdx: null,
      rodIndex: 4,
    })
  );

  assert.deepEqual(stack, {
    kind: 'ext_drawers',
    op: 'add',
    yCenter: 1.2,
    baseY: 0.7,
    removeId: null,
    removeKind: '',
    removePid: null,
    removeSlot: null,
    drawerH: 0.2,
    drawerGap: null,
    stackH: 1,
    drawerHeightM: 0.2,
    drawerCount: 5,
    blockedReason: null,
  });
  assert.deepEqual(rod, {
    kind: 'rod',
    op: 'remove',
    removeKind: 'base',
    removeIdx: null,
    rodIndex: 4,
  });
});

test('manual-layout hover intent readers reject malformed and non-exact command payloads', () => {
  const stack = readManualLayoutSketchStackHoverIntent({
    manualLayoutCommand: {
      version: 1,
      command: {
        kind: 'ext_drawers',
        op: 'add',
        yCenter: 1,
        baseY: 0,
        removeId: null,
        removeKind: '',
        removePid: null,
        removeSlot: null,
        drawerH: 0.2,
        drawerGap: null,
        stackH: 1,
        drawerHeightM: 0.2,
        drawerCount: '5',
        blockedReason: null,
      },
    },
  });
  const rod = readManualLayoutSketchRodHoverIntent({
    manualLayoutCommand: {
      version: 1,
      command: {
        kind: 'rod',
        op: 'remove',
        removeKind: 'base',
        removeIdx: null,
        rodIndex: 4,
        unexpected: true,
      },
    },
  });

  assert.equal(stack, null);
  assert.equal(rod, null);
  assert.equal(
    readManualLayoutSketchRodHoverIntent({
      kind: 'rod',
      removeKind: 'base',
      rodIndex: 4,
    }),
    null
  );
});

test('manual-layout command decoder rejects missing, unknown, and extra fields for every mutation family', () => {
  const commands: Array<Record<string, unknown>> = [
    { kind: 'box', op: 'add', xCenter: 0, yCenter: 1, xNorm: 0.5, blockedReason: null },
    { kind: 'shelf', op: 'add', yNorm: 0.5, variant: 'regular', depthM: 0.4, blockedReason: null },
    { kind: 'rod', op: 'add', yNorm: 0.5, blockedReason: null },
    { kind: 'storage', op: 'add', yNorm: 0.2, blockedReason: null },
    {
      kind: 'drawers',
      op: 'add',
      yCenter: 1,
      baseY: 0.8,
      removeId: null,
      removeKind: '',
      removePid: null,
      removeSlot: null,
      drawerH: 0.2,
      drawerGap: 0.01,
      stackH: 0.4,
      drawerHeightM: 0.2,
      drawerCount: null,
      blockedReason: null,
    },
    {
      kind: 'ext_drawers',
      op: 'add',
      yCenter: 1,
      baseY: 0.8,
      removeId: null,
      removeKind: '',
      removePid: null,
      removeSlot: null,
      drawerH: 0.2,
      drawerGap: null,
      stackH: 1.2,
      drawerHeightM: 0.2,
      drawerCount: 6,
      blockedReason: null,
    },
  ];

  for (const command of commands) {
    assert.equal(decodeManualLayoutCommand({ manualLayoutCommand: { version: 1, command } }).ok, true);
    const { op: _missing, ...missingOp } = command;
    assert.equal(
      decodeManualLayoutCommand({ manualLayoutCommand: { version: 1, command: missingOp } }).ok,
      false
    );
    assert.equal(
      decodeManualLayoutCommand({
        manualLayoutCommand: { version: 1, command: { ...command, op: 'insert' } },
      }).ok,
      false
    );
    assert.equal(
      decodeManualLayoutCommand({
        manualLayoutCommand: { version: 1, command: { ...command, unexpected: true } },
      }).ok,
      false
    );
  }

  assert.deepEqual(
    decodeManualLayoutCommand({
      manualLayoutCommand: { version: 2, command: commands[0] },
    }),
    { ok: false, reason: 'unknown-version' }
  );
});
