#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const files = {
  owner: 'esm/native/services/canvas_picking_hit_identity.ts',
  clickState: 'esm/native/services/canvas_picking_click_hit_flow_state.ts',
  clickScanObjects: 'esm/native/services/canvas_picking_click_hit_flow_scan_objects.ts',
  clickRuntimeTest: 'tests/canvas_picking_click_hit_flow_runtime.test.ts',
};

const errors = [];
function read(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch (error) {
    errors.push(`${file}: cannot read (${error?.message || error})`);
    return '';
  }
}
function requireMatch(file, source, pattern, message) {
  if (!pattern.test(source)) errors.push(`${file}: ${message}`);
}

const owner = read(files.owner);
requireMatch(files.owner, owner, /readonly hitObjectUserData\?: unknown;/, 'click identity must accept hit object userData');
requireMatch(files.owner, owner, /userData:\s*args\.hitObjectUserData/, 'click identity must forward userData to the canonical identity normalizer');

const clickState = read(files.clickState);
requireMatch(files.clickState, clickState, /foundPartUserData: UnknownRecord \| null;/, 'click state must preserve resolved part userData');
requireMatch(files.clickState, clickState, /doorHitUserData: UnknownRecord \| null;/, 'click state must preserve door hit userData');
requireMatch(files.clickState, clickState, /hitObjectUserData:\s*\n\s*state\.doorHitUserData \|\| state\.foundPartUserData \|\| state\.primaryHitObject\?\.userData \|\| null/, 'finalized click identity must use the strongest available hit metadata');

const clickScanObjects = read(files.clickScanObjects);
requireMatch(files.clickScanObjects, clickScanObjects, /function mergeClickHitUserData\(/, 'click scan must merge child surface metadata with resolved parent part metadata');
requireMatch(files.clickScanObjects, clickScanObjects, /state\.foundPartUserData = mergedUserData;/, 'click scan must store part metadata');
requireMatch(files.clickScanObjects, clickScanObjects, /state\.doorHitUserData = mergedUserData;/, 'click scan must store door metadata');

const clickRuntimeTest = read(files.clickRuntimeTest);
requireMatch(files.clickRuntimeTest, clickRuntimeTest, /carries door face metadata into canonical hit identity/, 'runtime test must cover direct door face metadata');
requireMatch(files.clickRuntimeTest, clickRuntimeTest, /merges surface child metadata with parent door identity/, 'runtime test must cover child surface + parent part merge');

if (errors.length) {
  console.error('[canvas-hit-parity-contract] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('[canvas-hit-parity-contract] ok');
