import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectCornerCorniceIrViolations,
  isCornerCornicePlan,
  type CornerCornicePlan,
} from '../esm/native/builder/corner_cornice_ir.ts';

function validProfilePlan(): CornerCornicePlan {
  return {
    kind: 'corner_cornice',
    owner: 'wing',
    mode: 'profile',
    operations: [
      {
        kind: 'corner_profile',
        partId: 'corner_cornice_front',
        length: 1,
        profile: [
          { x: -0.01, y: 0 },
          { x: 0.02, y: 0.03 },
          { x: 0, y: 0.08 },
        ],
        rotationY: 0,
        flipX: false,
        miterStartTrim: 0.02,
        x: 0.5,
        y: 2.4,
        z: 0,
      },
    ],
  };
}

test('corner cornice IR validator accepts a canonical profile plan', () => {
  const plan = validProfilePlan();
  assert.equal(isCornerCornicePlan(plan), true);
  assert.deepEqual(collectCornerCorniceIrViolations(plan), []);
});

test('corner cornice IR rejects mode mismatches and corrupted geometry before rendering', () => {
  const waveInProfile = structuredClone(validProfilePlan()) as unknown as Record<string, unknown>;
  waveInProfile.operations = [
    {
      kind: 'corner_wave',
      partId: 'corner_cornice_front',
      length: 1,
      depth: 0.018,
      heightMax: 0.08,
      waveAmp: 0.01,
      waveCycles: 2,
      samples: 20,
      rotationY: 0,
      x: 0,
      y: 2,
      z: 0,
    },
  ];
  assert.ok(
    collectCornerCorniceIrViolations(waveInProfile).some(
      violation => violation.code === 'mode-operation-mismatch'
    )
  );

  const nanLength = structuredClone(validProfilePlan()) as unknown as {
    operations: Array<Record<string, unknown>>;
  };
  nanLength.operations[0].length = Number.NaN;
  assert.ok(
    collectCornerCorniceIrViolations(nanLength).some(
      violation => violation.path === 'operations[0].length' && violation.code === 'non-finite-number'
    )
  );

  const badPart = structuredClone(validProfilePlan()) as unknown as {
    operations: Array<Record<string, unknown>>;
  };
  badPart.operations[0].partId = 'corner_cornice_unknown';
  assert.ok(
    collectCornerCorniceIrViolations(badPart).some(
      violation => violation.path === 'operations[0].partId' && violation.code === 'invalid-part-id'
    )
  );
});
