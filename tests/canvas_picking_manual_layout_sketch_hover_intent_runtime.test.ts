import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readManualLayoutSketchRodHoverIntent,
  readManualLayoutSketchStackHoverIntent,
  resolveManualLayoutSketchHoverMatchState,
} from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_intent.ts';

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

test('manual-layout hover intent readers normalize stack and vertical removal payloads', () => {
  const stack = readManualLayoutSketchStackHoverIntent({
    kind: 'ext_drawers',
    removeKind: 'std',
    removeSlot: 3,
    drawerCount: 5,
  });
  const rod = readManualLayoutSketchRodHoverIntent({
    kind: 'rod',
    op: 'remove',
    removeKind: 'base',
    removeIdx: 1,
    rodIndex: 4,
  });

  assert.deepEqual(stack, {
    kind: 'ext_drawers',
    op: 'add',
    yCenter: null,
    baseY: null,
    removeId: null,
    removeKind: 'std',
    removePid: null,
    removeSlot: 3,
    drawerH: null,
    drawerGap: null,
    stackH: null,
    drawerHeightM: null,
    drawerCount: 5,
    blockedReason: null,
  });
  assert.deepEqual(rod, {
    kind: 'rod',
    op: 'remove',
    removeKind: 'base',
    removeIdx: 1,
    rodIndex: 4,
  });
});

test('manual-layout hover intent readers reject string-encoded numeric state', () => {
  const stack = readManualLayoutSketchStackHoverIntent({
    kind: 'ext_drawers',
    removeKind: 'std',
    removeSlot: '3',
    drawerCount: '5',
  });
  const rod = readManualLayoutSketchRodHoverIntent({
    kind: 'rod',
    op: 'remove',
    removeKind: 'base',
    removeIdx: '1',
    rodIndex: '4',
  });

  assert.equal(stack?.removeSlot, null);
  assert.equal(stack?.drawerCount, null);
  assert.equal(rod?.removeIdx, null);
  assert.equal(rod?.rodIndex, null);
});
