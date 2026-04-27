import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('sketch click resolution prefers scoped sketch module keys for direct hits and hover commits', async () => {
  const clickScanSelectorSrc = await readFile(
    new URL('../esm/native/services/canvas_picking_click_hit_flow_scan_selector.ts', import.meta.url),
    'utf8'
  );
  const helperSrc = await readFile(
    new URL('../esm/native/services/canvas_picking_module_selector_hits_candidates.ts', import.meta.url),
    'utf8'
  );
  assert.match(clickScanSelectorSrc, /readModuleHitCandidateFromIntersection\(\{/);
  assert.match(clickScanSelectorSrc, /includeSketchModuleKey: true,/);
  assert.match(
    helperSrc,
    /return includeSketchModuleKey\s*\?\s*\(?userData\.moduleIndex \?\? userData\.__wpSketchModuleKey\)?\s*:\s*userData\.moduleIndex;/
  );

  const directHitSrc = [
    await readFile(
      new URL('../esm/native/services/canvas_picking_sketch_direct_hit_workflow.ts', import.meta.url),
      'utf8'
    ),
    await readFile(
      new URL('../esm/native/services/canvas_picking_sketch_direct_hit_workflow_shared.ts', import.meta.url),
      'utf8'
    ),
    await readFile(
      new URL('../esm/native/services/canvas_picking_sketch_direct_hit_workflow_objects.ts', import.meta.url),
      'utf8'
    ),
  ].join('\n');
  assert.match(
    directHitSrc,
    /return[\s\S]*readRecordString\(obj\.userData, '__wpSketchModuleKey'\)[\s\S]*\|\|[\s\S]*readRecordString\(obj\.userData, 'moduleIndex'\)[\s\S]*\);/
  );
});
