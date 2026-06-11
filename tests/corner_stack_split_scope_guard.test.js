import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { normalizeWhitespace } from './_source_bundle.js';

const MATERIALS_SRC = path.resolve(process.cwd(), 'esm/native/builder/corner_materials.ts');
const REMOVE_SRC = path.resolve(process.cwd(), 'esm/native/builder/corner_state_normalize_config.ts');
const MIRROR_SRC = path.resolve(process.cwd(), 'esm/native/features/mirror_layout.ts');
const MIRROR_LOOKUP_SRC = path.resolve(process.cwd(), 'esm/native/features/mirror_layout_lookup.ts');
const HOVER_SRC = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_door_action_hover_state.ts'
);
const HOVER_TARGETS_SRC = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_door_hover_targets_shared.ts'
);
const HOVER_TARGETS_POLICY_SRC = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_door_hover_targets_policy.ts'
);
const ACTION_PREVIEW_SRC = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_door_action_hover_preview_paint.ts'
);

test('[corner-stack-scope] lower stacked corner materials stay isolated from upper overrides', () => {
  const src = fs.readFileSync(MATERIALS_SRC, 'utf8');
  const srcNorm = normalizeWhitespace(src);

  assert.match(
    srcNorm,
    /const useScopedNamespace = stackSplitEnabled && stackKey === 'bottom' && typeof stackScopePartKey === 'function';/
  );
  assert.match(src, /if \(useScopedNamespace && scopedId && scopedId !== baseId\) return undefined;/);
  assert.doesNotMatch(src, /return typeof scopedVal !== 'undefined' \? scopedVal : rec\[baseId\];/);
});

test('[corner-stack-scope] lower stacked corner removal does not fall back to upper removed state', () => {
  const src = fs.readFileSync(REMOVE_SRC, 'utf8');

  assert.match(
    src,
    /if \(!\(__stackSplitEnabled && __stackKey === 'bottom'\) && scoped !== kRaw && isRemoved\(kRaw\)\) return true;/
  );
});

test('[corner-stack-scope] mirror layout lookup can stay scoped-only for the lower stack', () => {
  const src = [fs.readFileSync(MIRROR_SRC, 'utf8'), fs.readFileSync(MIRROR_LOOKUP_SRC, 'utf8')].join('\n');

  assert.match(src, /preferScopedOnly\?: boolean;/);
  assert.match(src, /if \(!args\.preferScopedOnly\) pushVariants\(candidates, seen, args\.partId\);/);
});

test('[corner-stack-scope] door hover preview uses stack-aware scoped ids for corner doors', () => {
  const hoverSrc = fs.readFileSync(HOVER_SRC, 'utf8');
  const hoverTargetsSrc = fs.readFileSync(HOVER_TARGETS_SRC, 'utf8');
  const hoverTargetsPolicySrc = fs.readFileSync(HOVER_TARGETS_POLICY_SRC, 'utf8');
  const previewSrc = fs.readFileSync(ACTION_PREVIEW_SRC, 'utf8');

  assert.match(
    `${hoverTargetsSrc}
${hoverTargetsPolicySrc}`,
    /export (?:function __scopeCornerHoverPartKey\(partId: unknown, stackKey: unknown\): string|\{[\s\S]*__scopeCornerHoverPartKey[\s\S]*\} from '\.\/canvas_picking_door_hover_targets_policy\.js';)/
  );
  assert.match(hoverSrc, /const scopedHitDoorPid = __scopeCornerHoverPartKey\(hitDoorPid, hitDoorStack\);/);
  assert.match(previewSrc, /const partKey = canonDoorPartKeyForMaps\(scopedHitDoorPid\);/);
});

test('[corner-stack-scope] lower stacked corner split rendering stays scoped to lower ids only', () => {
  const wing = [
    'esm/native/builder/corner_wing_cell_doors_shared.ts',
    'esm/native/builder/corner_wing_cell_doors_contracts.ts',
    'esm/native/builder/corner_wing_cell_doors_context.ts',
    'esm/native/builder/corner_wing_cell_doors_scope.ts',
    'esm/native/builder/corner_wing_cell_doors_state.ts',
    'esm/native/builder/corner_wing_cell_doors_rendering.ts',
    'esm/native/builder/corner_wing_cell_doors_split_policy.ts',
    'esm/native/builder/corner_wing_cell_doors_split.ts',
  ]
    .map(rel => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8'))
    .join('\n');
  const connector = [
    'esm/native/builder/corner_connector_door_emit.ts',
    'esm/native/builder/corner_connector_door_emit_shared.ts',
    'esm/native/builder/corner_connector_door_emit_policy.ts',
    'esm/native/builder/corner_connector_door_emit_visuals.ts',
    'esm/native/builder/corner_connector_door_emit_split.ts',
    'esm/native/builder/corner_connector_door_emit_full.ts',
  ]
    .map(rel => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8'))
    .join('\n');

  assert.match(
    wing,
    /if \(ctx\.stackKey === 'bottom'\) \{\s*if \(!\(ctx\.splitMap0 && Object\.prototype\.hasOwnProperty\.call\(ctx\.splitMap0, keyScoped\)\)\) return false;/
  );
  assert.match(wing, /if \(ctx\.stackKey === 'bottom'\) return false;/);
  assert.match(
    wing,
    /readSplitPosListFromMap\(\s*ctx\.splitMap0,\s*ctx\.stackKey === 'bottom' \? state\.scopedDoorBaseId : state\.doorBaseId\s*\)/
  );
  assert.match(
    connector,
    /return ctx\.isSplitExplicitInMap\(ctx\.splitMap0, ctx\.stackScopePartKey\(baseId\)\);/
  );
  assert.match(connector, /ctx\.stackKey === 'bottom' \? ctx\.stackScopePartKey\(baseId\) : baseId/);
});
