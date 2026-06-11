import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isRecentSketchHoverForTool,
  matchRecentSketchHover,
  readSketchHoverHostIsBottom,
  readSketchHoverHostModuleKey,
  readSketchHoverRecord,
} from '../esm/native/services/canvas_picking_sketch_hover_matching.ts';

test('recent sketch hover matching honors tool, age, free-placement, and host identity together', () => {
  const realNow = Date.now;
  Date.now = () => 2_000;
  try {
    const hover = {
      tool: 'box',
      kind: 'add',
      contentKind: 'shelf',
      ts: 1_450,
      freePlacement: true,
      hostModuleKey: '7',
      hostIsBottom: 1,
    };

    assert.equal(isRecentSketchHoverForTool(hover, 'box', 600), true);
    assert.equal(isRecentSketchHoverForTool(hover, 'rod', 600), false);
    assert.deepEqual(readSketchHoverRecord(hover), hover);
    assert.equal(
      readSketchHoverHostModuleKey(hover, value => Number(value)),
      7
    );
    assert.equal(readSketchHoverHostIsBottom(hover), true);

    assert.equal(
      matchRecentSketchHover({
        hover,
        tool: 'box',
        kind: 'add',
        contentKind: 'shelf',
        requireFreePlacement: true,
        host: { moduleKey: 7, isBottom: true },
        toModuleKey: value => Number(value),
        maxAgeMs: 600,
      }),
      hover
    );

    assert.equal(
      matchRecentSketchHover({
        hover,
        tool: 'box',
        kind: 'remove',
        host: { moduleKey: 7, isBottom: true },
        toModuleKey: value => Number(value),
        maxAgeMs: 600,
      }),
      null
    );

    assert.equal(
      matchRecentSketchHover({
        hover,
        tool: 'box',
        host: { moduleKey: 9, isBottom: true },
        toModuleKey: value => Number(value),
        maxAgeMs: 600,
      }),
      null
    );
  } finally {
    Date.now = realNow;
  }
});

test('recent sketch hover matching falls back to moduleKey/isBottom fields and rejects stale or host-checked matches without a normalizer', () => {
  const realNow = Date.now;
  Date.now = () => 5_000;
  try {
    const hover = {
      tool: 'free',
      ts: 3_900,
      moduleKey: '12',
      isBottom: 0,
    };

    assert.equal(
      readSketchHoverHostModuleKey(hover, value => Number(value)),
      12
    );
    assert.equal(readSketchHoverHostIsBottom(hover), false);
    assert.equal(
      matchRecentSketchHover({
        hover,
        tool: 'free',
        host: { moduleKey: 12, isBottom: false },
        maxAgeMs: 1_500,
      }),
      null
    );
    assert.equal(
      matchRecentSketchHover({
        hover,
        tool: 'free',
        maxAgeMs: 500,
      }),
      null
    );
  } finally {
    Date.now = realNow;
  }
});
