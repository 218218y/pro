import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findModuleSelectorObject,
  findPreferredCornerCellCandidate,
  findPreferredModuleSelectorHit,
  readModuleHitCandidateFromIntersection,
} from '../esm/native/services/canvas_picking_module_selector_hits.ts';

function toModuleKey(value: unknown) {
  if (typeof value === 'number') return value;
  if (value === 'corner') return 'corner';
  if (typeof value === 'string' && /^corner:\d+$/.test(value)) return value as `corner:${number}`;
  return null;
}

test('preferred selector hits upgrade generic corner selectors to specific corner cells', () => {
  const genericSelector = {
    object: {
      userData: {
        isModuleSelector: true,
        moduleIndex: 'corner',
        __wpStack: 'top',
      },
    },
    point: { y: 11 },
  };
  const specificSelector = {
    object: {
      userData: {
        isModuleSelector: true,
        moduleIndex: 'corner:2',
        __wpStack: 'top',
      },
    },
    point: { y: 12 },
  };

  const preferred = findPreferredModuleSelectorHit({
    intersects: [genericSelector, specificSelector],
    toModuleKey,
  });

  assert.equal(preferred?.moduleKey, 'corner:2');
  assert.equal(preferred?.stack, 'top');
  assert.equal(preferred?.hitY, 12);
});

test('module hit candidates can resolve sketch module keys when regular module indices are absent', () => {
  const candidate = readModuleHitCandidateFromIntersection({
    hit: {
      object: {
        userData: {
          __wpSketchModuleKey: 'corner:3',
          __wpStack: 'bottom',
        },
      },
      point: { y: 4 },
    },
    toModuleKey,
    includeSketchModuleKey: true,
  });

  assert.deepEqual(candidate, {
    moduleKey: 'corner:3',
    hitY: 4,
    stackHint: 'bottom',
    object: {
      userData: {
        __wpSketchModuleKey: 'corner:3',
        __wpStack: 'bottom',
      },
    },
  });
});

test('preferred corner-cell candidates favor specific stack matches and selector trees stay searchable', () => {
  const preferred = findPreferredCornerCellCandidate({
    intersects: [
      {
        object: { userData: { moduleIndex: 'corner', __wpStack: 'bottom' } },
        point: { y: 2 },
      },
      {
        object: { userData: { moduleIndex: 'corner:7', __wpStack: 'bottom' } },
        point: { y: 1.5 },
      },
    ],
    desiredStack: 'bottom',
    boundaryY: 5,
    toModuleKey,
  });
  assert.deepEqual(preferred, { moduleKey: 'corner:7', hitY: 1.5 });

  const treeRoot = {
    children: [
      {
        userData: { isModuleSelector: true, moduleIndex: 1, __wpStack: 'top' },
      },
      {
        children: [
          {
            userData: { isModuleSelector: true, moduleIndex: 'corner:7', __wpStack: 'bottom' },
          },
        ],
      },
    ],
  };

  const selectorObject = findModuleSelectorObject({
    root: treeRoot,
    moduleKey: 'corner:7',
    stackKey: 'bottom',
    toModuleKey,
  });

  assert.equal(selectorObject, (treeRoot.children as any[])[1].children[0]);
});
