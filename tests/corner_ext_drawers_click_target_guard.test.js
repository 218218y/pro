import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const OWNER = path.resolve(process.cwd(), 'esm/native/services/canvas_picking_click_hit_flow.ts');
const STACK = path.resolve(process.cwd(), 'esm/native/services/canvas_picking_click_hit_flow_stack.ts');
const STACK_CORNER = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_click_hit_flow_stack_corner.ts'
);
const HELPER = path.resolve(process.cwd(), 'esm/native/services/canvas_picking_module_selector_hits.ts');
const HELPER_SHARED = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_module_selector_hits_shared.ts'
);
const HELPER_CANDIDATES = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_module_selector_hits_candidates.ts'
);

test('[corner-ext-drawers-click] generic corner hits are promoted to a specific corner cell before config patching tools consume the module key', () => {
  const owner = fs.readFileSync(OWNER, 'utf8');
  const stack = fs.readFileSync(STACK, 'utf8');
  const stackCorner = fs.readFileSync(STACK_CORNER, 'utf8');
  const helper = fs.readFileSync(HELPER, 'utf8');
  const helperShared = fs.readFileSync(HELPER_SHARED, 'utf8');
  const helperCandidates = fs.readFileSync(HELPER_CANDIDATES, 'utf8');

  assert.match(owner, /canvas_picking_click_hit_flow_stack\.js/);
  assert.match(stack, /canvas_picking_click_hit_flow_stack_corner\.js/);
  assert.match(helper, /canvas_picking_module_selector_hits_shared\.js/);
  assert.match(helper, /canvas_picking_module_selector_hits_candidates\.js/);
  assert.match(helperShared, /export function isSpecificCornerCellKey\(/);
  assert.match(helperCandidates, /export function findPreferredCornerCellCandidate\(/);
  assert.match(stackCorner, /if \(state\.foundModuleIndex !== 'corner'\) return;/);
  assert.match(
    stackCorner,
    /const selectorCandidate =\s*state\.foundModuleStack === 'bottom' \? state\.selectorHitBottom : state\.selectorHitTop;/
  );
  assert.match(
    stackCorner,
    /if \(selectorCandidate && isSpecificCornerCellKey\(selectorCandidate\.mi\)\) \{/
  );
  assert.match(stackCorner, /state\.foundModuleIndex = selectorCandidate\.mi;/);
  assert.match(stackCorner, /const preferred = findPreferredCornerCellCandidate\(\{/);
  assert.match(stackCorner, /desiredStack: state\.foundModuleStack,/);
  assert.match(stackCorner, /if \(preferred && isSpecificCornerCellKey\(preferred\.moduleKey\)\) \{/);
  assert.match(stackCorner, /op: 'cornerCell\.promoteFromGenericCorner'/);
  assert.doesNotMatch(stackCorner, /function\s+pickPreferredCornerCellCandidate\(/);
});
