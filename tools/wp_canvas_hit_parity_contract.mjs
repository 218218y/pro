#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const files = {
  owner: 'esm/native/services/canvas_picking_hit_identity.ts',
  clickState: 'esm/native/services/canvas_picking_click_hit_flow_state.ts',
  clickScanObjects: 'esm/native/services/canvas_picking_click_hit_flow_scan_objects.ts',
  hoverScan: 'esm/native/services/canvas_picking_door_hover_targets_hit_scan.ts',
  clickRuntimeTest: 'tests/canvas_picking_click_hit_flow_runtime.test.ts',
  hoverClickRuntimeTest: 'tests/canvas_picking_hover_click_hit_identity_parity_runtime.test.ts',
  stageRuntimeTest: 'tests/refactor_stage18_canvas_hit_parity_runtime.test.js',
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
requireMatch(
  files.owner,
  owner,
  /readonly hitObjectUserData\?: unknown;/,
  'click identity must accept hit object userData'
);
requireMatch(
  files.owner,
  owner,
  /userData:\s*args\.hitObjectUserData/,
  'click identity must forward userData to the canonical identity normalizer'
);
requireMatch(
  files.owner,
  owner,
  /export function mergeCanvasPickingHitIdentityUserData\(/,
  'hit identity owner must expose shared hover/click metadata merger'
);
requireMatch(
  files.owner,
  owner,
  /const merged: UnknownRecord = \{\s*\.\.\.\(resolved \|\| \{\}\),\s*\.\.\.\(hit \|\| \{\}\),\s*\};/s,
  'shared metadata merger must preserve surface hit metadata over resolved parent defaults'
);
requireMatch(
  files.owner,
  owner,
  /__wpSketchModuleKey/,
  'identity owner must normalize sketch module metadata'
);
requireMatch(
  files.owner,
  owner,
  /__wpSketchBoxDoorId/,
  'identity owner must normalize sketch-box door metadata'
);
requireMatch(
  files.owner,
  owner,
  /inferCanvasPickingFaceSideFromSign/,
  'identity owner must infer mirror face side from face sign'
);

const clickState = read(files.clickState);
requireMatch(
  files.clickState,
  clickState,
  /foundPartUserData: UnknownRecord \| null;/,
  'click state must preserve resolved part userData'
);
requireMatch(
  files.clickState,
  clickState,
  /doorHitUserData: UnknownRecord \| null;/,
  'click state must preserve door hit userData'
);
requireMatch(
  files.clickState,
  clickState,
  /hitObjectUserData:\s*\n\s*state\.doorHitUserData \|\| state\.foundPartUserData \|\| state\.primaryHitObject\?\.userData \|\| null/,
  'finalized click identity must use the strongest available hit metadata'
);
requireMatch(
  files.clickState,
  clickState,
  /moduleStack:\s*state\.stackHintSource === 'none' \? null : state\.foundModuleStack/,
  'finalized click identity must not invent a top stack when no stack hint exists'
);

const clickScanObjects = read(files.clickScanObjects);
requireMatch(
  files.clickScanObjects,
  clickScanObjects,
  /mergeCanvasPickingHitIdentityUserData/,
  'click scan must use the shared canonical metadata merger'
);
requireMatch(
  files.clickScanObjects,
  clickScanObjects,
  /state\.foundPartUserData = mergedUserData;/,
  'click scan must store part metadata'
);
requireMatch(
  files.clickScanObjects,
  clickScanObjects,
  /state\.doorHitUserData = mergedUserData;/,
  'click scan must store door metadata'
);
requireMatch(
  files.clickScanObjects,
  clickScanObjects,
  /normalizeCanvasPickingModuleStack/,
  'click scan must preserve explicit object stack metadata for hit identity parity'
);
requireMatch(
  files.clickScanObjects,
  clickScanObjects,
  /state\.stackHintSource = 'objectTag';/,
  'click scan must mark object-tag stack hints explicitly'
);
requireMatch(
  files.clickScanObjects,
  clickScanObjects,
  /const resolvedDoorId =\s*\n\s*typeof mergedUserData\?\.doorId === 'string'/,
  'click scan must prefer canonical resolved door id from merged metadata when available'
);

const hoverScan = read(files.hoverScan);
requireMatch(
  files.hoverScan,
  hoverScan,
  /mergeCanvasPickingHitIdentityUserData/,
  'hover scan must use the shared canonical metadata merger'
);

const clickRuntimeTest = read(files.clickRuntimeTest);
requireMatch(
  files.clickRuntimeTest,
  clickRuntimeTest,
  /carries door face metadata into canonical hit identity/,
  'runtime test must cover direct door face metadata'
);
requireMatch(
  files.clickRuntimeTest,
  clickRuntimeTest,
  /merges surface child metadata with parent door identity/,
  'runtime test must cover child surface + parent part merge'
);
const hoverClickRuntimeTest = read(files.hoverClickRuntimeTest);
requireMatch(
  files.hoverClickRuntimeTest,
  hoverClickRuntimeTest,
  /hover and click preserve the same child-surface door identity/,
  'runtime test must prove hover/click child-surface parity'
);
requireMatch(
  files.hoverClickRuntimeTest,
  hoverClickRuntimeTest,
  /mirror inside and outside hits infer canonical face side/,
  'runtime test must cover mirror inside/outside parity'
);
requireMatch(
  files.hoverClickRuntimeTest,
  hoverClickRuntimeTest,
  /lower split door child hits keep door identity/,
  'runtime test must cover lower split-door parity'
);
requireMatch(
  files.hoverClickRuntimeTest,
  hoverClickRuntimeTest,
  /sketch-box door hits preserve module and door identity/,
  'runtime test must cover sketch-box door parity'
);

const stageRuntimeTest = read(files.stageRuntimeTest);
requireMatch(
  files.stageRuntimeTest,
  stageRuntimeTest,
  /stage 18 keeps mirror, split, and sketch identities canonical/,
  'stage guard must pin mirror/split/sketch identity behavior'
);

if (errors.length) {
  console.error('[canvas-hit-parity-contract] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('[canvas-hit-parity-contract] ok');
