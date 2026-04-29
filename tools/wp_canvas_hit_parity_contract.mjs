#!/usr/bin/env node
import { readSourceText } from './wp_source_text.mjs';

const files = {
  owner: 'esm/native/services/canvas_picking_hit_identity.ts',
  transparentHitPolicy: 'esm/native/services/canvas_picking_transparent_hit_policy.ts',
  clickState: 'esm/native/services/canvas_picking_click_hit_flow_state.ts',
  clickScanObjects: 'esm/native/services/canvas_picking_click_hit_flow_scan_objects.ts',
  hoverScan: 'esm/native/services/canvas_picking_door_hover_targets_hit_scan.ts',
  hoverHitPaint: 'esm/native/services/canvas_picking_door_hover_targets_hit_paint.ts',
  clickRouteActions: 'esm/native/services/canvas_picking_click_route_actions.ts',
  splitClickShared: 'esm/native/services/canvas_picking_door_split_click_shared.ts',
  paintContracts: 'esm/native/services/canvas_picking_paint_flow_contracts.ts',
  paintMirror: 'esm/native/services/canvas_picking_paint_flow_mirror.ts',
  paintApplySpecial: 'esm/native/services/canvas_picking_paint_flow_apply_special.ts',
  sketchHoverIntentSnapshot:
    'esm/native/services/canvas_picking_manual_layout_sketch_hover_intent_snapshot.ts',
  sketchHoverMatching: 'esm/native/services/canvas_picking_sketch_hover_matching.ts',
  clickRuntimeTest: 'tests/canvas_picking_click_hit_flow_runtime.test.ts',
  splitClickRuntimeTest: 'tests/canvas_picking_door_split_click_runtime.test.ts',
  hoverClickRuntimeTest: 'tests/canvas_picking_hover_click_hit_identity_parity_runtime.test.ts',
  sketchHoverIntentRuntimeTest: 'tests/canvas_picking_manual_layout_sketch_hover_intent_runtime.test.ts',
  paintRuntimeTest: 'tests/canvas_picking_paint_flow_apply_runtime.test.ts',
  stageRuntimeTest: 'tests/refactor_stage18_canvas_hit_parity_runtime.test.js',
};

const errors = [];
function read(file) {
  try {
    return readSourceText(file);
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

const transparentHitPolicy = read(files.transparentHitPolicy);
requireMatch(
  files.transparentHitPolicy,
  transparentHitPolicy,
  /export function readCanvasPickingMaterialHitPolicy\(/,
  'transparent hit policy owner must normalize scalar and array material visibility'
);
requireMatch(
  files.transparentHitPolicy,
  transparentHitPolicy,
  /export function isCanvasPickingTransparentRestoreTarget\(/,
  'transparent hit policy owner must gate restore hits by removed-door metadata'
);
requireMatch(
  files.transparentHitPolicy,
  transparentHitPolicy,
  /visibleMaterials\.every\(materialRecord => materialRecord\.opacity === 0\)/,
  'transparent hit policy must treat all-transparent material arrays as transparent'
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
  /isCanvasPickingMaterialHitEligible/,
  'click scan must use the shared transparent hit policy'
);
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

const hoverHitPaint = read(files.hoverHitPaint);
requireMatch(
  files.hoverHitPaint,
  hoverHitPaint,
  /isCanvasPickingMaterialHitEligible/,
  'hover hit eligibility must use the shared transparent hit policy'
);

const sketchHoverIntentSnapshot = read(files.sketchHoverIntentSnapshot);
requireMatch(
  files.sketchHoverIntentSnapshot,
  sketchHoverIntentSnapshot,
  /readSketchHoverHostModuleKey/,
  'manual sketch hover snapshots must use the canonical sketch host module-key reader'
);
requireMatch(
  files.sketchHoverIntentSnapshot,
  sketchHoverIntentSnapshot,
  /readSketchHoverHostIsBottom/,
  'manual sketch hover snapshots must use the canonical sketch host stack reader'
);

const sketchHoverMatching = read(files.sketchHoverMatching);
requireMatch(
  files.sketchHoverMatching,
  sketchHoverMatching,
  /'hostModuleKey'\) \?\? readRecordValue\(hoverRec, 'moduleKey'\)/,
  'sketch hover matching must prefer canonical hostModuleKey before legacy moduleKey'
);

const clickRouteActions = read(files.clickRouteActions);
requireMatch(
  files.clickRouteActions,
  clickRouteActions,
  /hitIdentity,\s*\n\s*primaryHitY: _primaryHitY/,
  'click action route must read finalized hitIdentity'
);
requireMatch(
  files.clickRouteActions,
  clickRouteActions,
  /tryHandleCanvasPaintClick\(\{[\s\S]*hitIdentity,[\s\S]*\}\)/,
  'paint route must forward canonical hitIdentity into paint commit'
);

const splitClickShared = read(files.splitClickShared);
requireMatch(
  files.splitClickShared,
  splitClickShared,
  /const splitMapKey = __splitKey\(doorIdStr\);/,
  'split click normalization must reuse canonical split map-key policy'
);
requireMatch(
  files.splitClickShared,
  splitClickShared,
  /return __wp_getSplitHoverDoorBaseKey\(splitBase\) \|\| splitBase \|\| doorIdStr;/,
  'split click normalization must use the same base-key owner as split hover before reading bounds'
);

const paintContracts = read(files.paintContracts);
requireMatch(
  files.paintContracts,
  paintContracts,
  /import type \{ CanvasPickingHitIdentity \} from '\.\/canvas_picking_hit_identity\.js';/,
  'paint click contract must use canonical hit identity type'
);
requireMatch(
  files.paintContracts,
  paintContracts,
  /hitIdentity\?: CanvasPickingHitIdentity \| null;/,
  'paint click args must expose optional canonical hitIdentity'
);

const paintMirror = read(files.paintMirror);
requireMatch(
  files.paintMirror,
  paintMirror,
  /resolveFullDoorMirrorHitIdentityResult/,
  'mirror paint resolver must support full-door face selection from hitIdentity'
);
requireMatch(
  files.paintMirror,
  paintMirror,
  /findFullDoorMirrorFaceMatch/,
  'mirror hitIdentity fallback must remove matching full-face layouts instead of duplicating them'
);

const paintApplySpecial = read(files.paintApplySpecial);
requireMatch(
  files.paintApplySpecial,
  paintApplySpecial,
  /effectiveDoorId && \(!isSpecialPart\(foundPartId\) \|\| isSpecialPart\(effectiveDoorId\)\)/,
  'direct paint target resolution must not let canonical door ids override special sketch door part keys'
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
requireMatch(
  files.clickRuntimeTest,
  clickRuntimeTest,
  /ignores fully transparent material arrays outside remove-door mode/,
  'runtime test must prove transparent removed placeholders do not block normal clicks'
);
requireMatch(
  files.clickRuntimeTest,
  clickRuntimeTest,
  /accepts transparent restore targets only when the removed-door owner is tagged/,
  'runtime test must prove remove mode only picks tagged transparent restore targets'
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

const sketchHoverIntentRuntimeTest = read(files.sketchHoverIntentRuntimeTest);
requireMatch(
  files.sketchHoverIntentRuntimeTest,
  sketchHoverIntentRuntimeTest,
  /prefers canonical host identity fields over legacy module fields/,
  'runtime test must cover sketch hover/commit host identity precedence'
);

const splitClickRuntimeTest = read(files.splitClickRuntimeTest);
requireMatch(
  files.splitClickRuntimeTest,
  splitClickRuntimeTest,
  /lower split door clicks resolve bottom split action using full-family bounds/,
  'runtime test must cover lower split commit action parity'
);
requireMatch(
  files.splitClickRuntimeTest,
  splitClickRuntimeTest,
  /lower corner custom split commits canonical split position against full-family bounds/,
  'runtime test must cover lower corner custom split commit bounds parity'
);
requireMatch(
  files.splitClickRuntimeTest,
  splitClickRuntimeTest,
  /lower_corner_pent_door_3_bot/,
  'runtime test must pin lower corner pent split base normalization'
);

const paintRuntimeTest = read(files.paintRuntimeTest);
requireMatch(
  files.paintRuntimeTest,
  paintRuntimeTest,
  /falls back to canonical hit identity for full-door face selection/,
  'runtime test must cover mirror commit face selection from hitIdentity'
);
requireMatch(
  files.paintRuntimeTest,
  paintRuntimeTest,
  /uses hit identity to remove an existing full-face mirror without geometry/,
  'runtime test must cover full-face mirror removal through hitIdentity fallback'
);
requireMatch(
  files.paintRuntimeTest,
  paintRuntimeTest,
  /sketch_box_free_alpha_door_sbdr_1/,
  'runtime test must cover sketch-box door special paint target preservation'
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
