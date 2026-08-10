import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCarcassOps } from '../esm/native/builder/core_carcass_compute.ts';
import { applyCarcassAndGetCabinetMetrics } from '../esm/native/builder/carcass_pipeline.ts';
import {
  collectCarcassShellIrViolations,
  isCarcassBackPanelOp,
  isCarcassBoardOp,
  isCarcassShellPlan,
  type CarcassShellPlan,
} from '../esm/native/builder/carcass_shell_ir.ts';
import { __asOps } from '../esm/native/builder/render_carcass_ops_shared.ts';

const BASE = {
  totalW: 2.4,
  D: 0.6,
  H: 2.4,
  woodThick: 0.018,
  baseType: '',
  doorsCount: 4,
  hasCornice: false,
};

function moduleWidth(totalW: number, woodThick: number, count: number): number {
  return (totalW - (count + 1) * woodThick) / count;
}

function requireShellPlan(input: unknown): CarcassShellPlan {
  const ops = computeCarcassOps(input);
  const shell = {
    boards: ops.boards,
    backPanel: ops.backPanel,
    backPanels: ops.backPanels,
  };
  assert.equal(isCarcassShellPlan(shell), true);
  assert.deepEqual(collectCarcassShellIrViolations(shell), []);
  assert.ok(shell.boards.length > 0);
  assert.equal(shell.boards.every(isCarcassBoardOp), true);
  assert.equal(isCarcassBackPanelOp(shell.backPanel), true);
  assert.equal(shell.backPanels?.every(isCarcassBackPanelOp) ?? true, true);
  return shell;
}

test('carcass shell typed IR stays valid across stepped, depth, and removed-side geometry', () => {
  const w3 = moduleWidth(BASE.totalW, BASE.woodThick, 3);
  const scenarios = [
    { name: 'default', input: BASE },
    {
      name: 'depth-stepped',
      input: {
        ...BASE,
        moduleInternalWidths: [w3, w3, w3],
        moduleDepthsTotal: [0.6, 0.78, 0.52],
      },
    },
    {
      name: 'height-depth-stepped',
      input: {
        ...BASE,
        H: 2.65,
        moduleInternalWidths: [w3, w3, w3],
        moduleHeightsTotal: [2.2, 2.65, 2.4],
        moduleDepthsTotal: [0.6, 0.78, 0.52],
      },
    },
    {
      name: 'removed-left',
      input: {
        ...BASE,
        moduleInternalWidths: [0.8, 1.564],
        cfg: { removedDoorsMap: { removed_body_left: true } },
      },
    },
    {
      name: 'removed-right',
      input: {
        ...BASE,
        moduleInternalWidths: [0.8, 1.564],
        cfg: { removedDoorsMap: { removed_body_right: true } },
      },
    },
    {
      name: 'removed-both-stepped',
      input: {
        ...BASE,
        H: 2.6,
        moduleInternalWidths: [0.8, 1.564],
        moduleHeightsTotal: [2.2, 2.6],
        cfg: { removedDoorsMap: { removed_body_left: true, removed_body_right: true } },
      },
    },
  ] as const;

  for (const scenario of scenarios) {
    const shell = requireShellPlan(scenario.input);
    assert.ok(
      shell.boards.every(board => board.width > 0 && board.height > 0 && board.depth > 0),
      scenario.name
    );
  }
});

test('unified stack-split divider is emitted inside typed shell IR and keeps the full frame renderable', () => {
  const result = applyCarcassAndGetCabinetMetrics({
    App: {},
    THREE: null,
    totalW: BASE.totalW,
    D: BASE.D,
    H: BASE.H,
    woodThick: BASE.woodThick,
    doorsCount: BASE.doorsCount,
    baseType: '',
    hasCornice: false,
    stackSplitDividerY: 0.9,
    renderCarcass: false,
  });

  const ops = result.carcassOps as Record<string, unknown>;
  const boards = ops.boards as Array<Record<string, unknown>>;
  assert.equal(boards.length, 5);
  assert.deepEqual(
    boards.map(board => board.role),
    ['floor', 'ceiling', 'left-side', 'right-side', 'stack-divider']
  );
  const divider = boards.find(board => board.role === 'stack-divider');
  assert.ok(divider);
  assert.equal(divider.partId, 'body_stack_split_divider');
  assert.equal(isCarcassBoardOp(divider), true);

  const shell = {
    boards,
    backPanel: ops.backPanel,
    backPanels: ops.backPanels,
  };
  assert.equal(isCarcassShellPlan(shell), true);
  assert.deepEqual(collectCarcassShellIrViolations(shell), []);

  const rendered = __asOps({ ...ops, cornice: null });
  assert.ok(rendered);
  assert.equal(rendered.boards?.length, 5);
});

test('carcass shell board roles remain valid after stack-split part-id prefixing', () => {
  const shell = requireShellPlan(BASE);
  const prefixed = {
    ...shell,
    boards: shell.boards.map(board => ({ ...board, partId: `lower_${board.partId}` })),
    backPanel: shell.backPanel.partId
      ? { ...shell.backPanel, partId: `lower_${shell.backPanel.partId}` }
      : shell.backPanel,
    backPanels:
      shell.backPanels?.map(panel =>
        panel.partId ? { ...panel, partId: `lower_${panel.partId}` } : panel
      ) ?? null,
  };

  assert.equal(isCarcassShellPlan(prefixed), true);
  assert.deepEqual(collectCarcassShellIrViolations(prefixed), []);
  const rendered = __asOps({ ...prefixed, cornice: null });
  assert.ok(rendered);
  assert.deepEqual(rendered.boards, prefixed.boards);
});

test('carcass shell IR validator rejects malformed geometry and inconsistent wood identities', () => {
  const shell = requireShellPlan(BASE);
  const board = shell.boards[0];

  const invalidBoard = {
    ...shell,
    boards: [{ ...board, width: Number.NaN, role: 'left-side', partId: 'body_unknown' }],
  };
  assert.equal(isCarcassShellPlan(invalidBoard), false);
  const boardViolations = collectCarcassShellIrViolations(invalidBoard);
  assert.ok(boardViolations.some(v => v.path.endsWith('.width') && v.code === 'non-finite-number'));
  assert.ok(boardViolations.some(v => v.path.endsWith('.partId') && v.code === 'invalid-part-id'));

  const removed = requireShellPlan({
    ...BASE,
    moduleInternalWidths: [0.8, 1.564],
    cfg: { removedDoorsMap: { removed_body_left: true } },
  });
  const woodPanel = removed.backPanels?.find(panel => panel.__wpWoodBackPanel === true);
  assert.ok(woodPanel);
  const invalidWoodIdentity = {
    ...removed,
    backPanels: [{ ...woodPanel, __wpWoodBackPanel: undefined }],
  };
  assert.equal(isCarcassShellPlan(invalidWoodIdentity), false);
  assert.ok(
    collectCarcassShellIrViolations(invalidWoodIdentity).some(v => v.code === 'invalid-wood-identity')
  );
});

test('render carcass boundary accepts canonical shell IR and rejects malformed shell arrays as a whole', () => {
  const shell = requireShellPlan(BASE);
  const valid = __asOps({ ...shell, cornice: null });
  assert.ok(valid);
  assert.deepEqual(valid.boards, shell.boards);
  assert.deepEqual(valid.backPanels, shell.backPanels);

  const invalid = __asOps({
    ...shell,
    boards: [{ ...shell.boards[0], depth: 0 }],
    backPanels: [{ ...shell.backPanel, width: '1.2' }],
  });
  assert.ok(invalid);
  assert.equal(invalid.boards, null);
  assert.equal(invalid.backPanels, null);
});
