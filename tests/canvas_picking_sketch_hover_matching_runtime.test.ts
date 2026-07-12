import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isRecentSketchHoverForTool,
  matchRecentSketchHover,
  readSketchHoverRecord,
} from '../esm/native/services/canvas_picking_sketch_hover_matching.ts';
import { readSketchHoverHostIdentity } from '../esm/native/services/canvas_picking_sketch_hover_identity.ts';

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
      hostIsBottom: true,
    };

    assert.equal(isRecentSketchHoverForTool(hover, 'box', 600), true);
    assert.equal(isRecentSketchHoverForTool(hover, 'rod', 600), false);
    assert.deepEqual(readSketchHoverRecord(hover), hover);
    assert.deepEqual(
      readSketchHoverHostIdentity(hover, value => Number(value)),
      {
        moduleKey: 7,
        isBottom: true,
      }
    );

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

test('recent sketch hover matching rejects retired or malformed host identity records', () => {
  const realNow = Date.now;
  Date.now = () => 5_000;
  try {
    const legacyHover = {
      tool: 'free',
      ts: 3_900,
      moduleKey: '12',
      isBottom: 0,
    };
    const malformedHover = {
      tool: 'free',
      ts: 3_900,
      hostModuleKey: '12',
      hostIsBottom: 0,
    };

    assert.equal(
      readSketchHoverHostIdentity(legacyHover, value => Number(value)),
      null
    );
    assert.equal(
      readSketchHoverHostIdentity(malformedHover, value => Number(value)),
      null
    );
    assert.equal(
      matchRecentSketchHover({
        hover: legacyHover,
        tool: 'free',
        host: { moduleKey: 12, isBottom: false },
        toModuleKey: value => Number(value),
        maxAgeMs: 1_500,
      }),
      null
    );
    assert.equal(
      matchRecentSketchHover({
        hover: malformedHover,
        tool: 'free',
        host: { moduleKey: 12, isBottom: false },
        toModuleKey: value => Number(value),
        maxAgeMs: 1_500,
      }),
      null
    );
  } finally {
    Date.now = realNow;
  }
});
