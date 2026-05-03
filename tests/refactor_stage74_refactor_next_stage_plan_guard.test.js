import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  REFACTOR_COMPLETED_STAGE_LABELS,
  REFACTOR_INTEGRATION_ANCHORS,
} from '../tools/wp_refactor_stage_catalog.mjs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const PLAN_FILE = 'docs/REFACTOR_NEXT_STAGE_PLAN.md';
const GUARD_FILE = 'tests/refactor_stage74_refactor_next_stage_plan_guard.test.js';

test('stage 74 refactor next-stage plan quality gate is anchored', () => {
  const plan = read(PLAN_FILE);
  const progress = read('docs/REFACTOR_WORKMAP_PROGRESS.md');
  const workmap = read('refactor_workmap.md');
  const docsAudit = read('tools/wp_docs_control_plane_audit.mjs');
  const integrationAudit = read('tools/wp_refactor_integration_audit.mjs');
  const pkg = JSON.parse(read('package.json'));

  assert.ok(REFACTOR_COMPLETED_STAGE_LABELS.includes('Stage 74'));
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 74 refactor next-stage plan quality gate is anchored')
    ),
    'stage 74 must be registered in the shared refactor stage catalog anchors'
  );

  assert.ok(
    pkg.scripts['test:refactor-stage-guards'].includes(GUARD_FILE),
    'stage 74 guard must be wired into the stage guard lane'
  );
  assert.ok(integrationAudit.includes(GUARD_FILE), 'integration audit must require the stage 74 guard');
  assert.ok(docsAudit.includes(PLAN_FILE), 'docs audit must keep the next-stage plan as a core doc');
  assert.match(progress, /Stage 74/);
  assert.match(workmap, /Stage 74/);

  for (const requiredHeading of [
    '## Professional split gate',
    '## Do not split when',
    '## Next qualified implementation stages',
    '## Validation matrix for every future stage',
    '## Stop conditions',
  ]) {
    assert.ok(plan.includes(requiredHeading), `plan must include ${requiredHeading}`);
  }

  for (const requiredPrinciple of [
    'line count alone is not a reason to split',
    'concrete source anchors',
    'public consumer contract can remain stable',
    'clear reason to exist',
    'Stage 75',
    'Stage 76',
    'Stage 77',
    'Stage 78',
    'Stage 79',
    'Stage 80',
  ]) {
    assert.ok(plan.includes(requiredPrinciple), `plan must retain principle/candidate: ${requiredPrinciple}`);
  }

  assert.doesNotMatch(
    plan,
    /split\s+all\s+large\s+files/i,
    'next-stage plan must reject automatic line-count-driven splitting'
  );
});
