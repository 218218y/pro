const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

test('[profile-door-paint] decorative door profile meshes keep the owner door partId for live paint refresh', () => {
  const src = [
    read('esm/native/builder/visuals_and_contents.ts'),
    read('esm/native/builder/visuals_and_contents_door_visual.ts'),
    read('esm/native/builder/visuals_and_contents_door_visual_support.ts'),
    read('esm/native/builder/visuals_and_contents_door_visual_support_contracts.ts'),
    read('esm/native/builder/visuals_and_contents_door_visual_tagging.ts'),
    read('esm/native/builder/visuals_and_contents_door_visual_style_contracts.ts'),
    read('esm/native/builder/visuals_and_contents_door_visual_styles.ts'),
    read('esm/native/builder/visuals_and_contents_door_visual_profile.ts'),
    read('esm/native/builder/visuals_and_contents_door_visual_tom.ts'),
  ].join('\n');

  assert.match(
    src,
    /const doorOwnerPartId = typeof (?:args\.)?groovePartId === 'string' && (?:args\.)?groovePartId \? (?:args\.)?groovePartId : '';/,
    'createDoorVisual should resolve the owning door partId once and reuse it for decorative sub-meshes'
  );

  assert.match(
    src,
    /const tagDoorVisualPart(?:: TagDoorVisualPartFn)? = \(node: (?:unknown|Object3DLike), visualRole\?: string\) => \{[\s\S]*?const userData = _asObject\(rec\.userData\) \|\| \{\};[\s\S]*?if \(doorOwnerPartId\) userData\.partId = doorOwnerPartId;[\s\S]*?if \(visualRole\) userData\.__doorVisualRole = visualRole;[\s\S]*?\};/,
    'decorative profile/tom door meshes must keep the owner door partId and store their local role separately'
  );

  assert.match(
    src,
    /tagDoorVisualPart\(centerPanel, 'door_profile_center_panel'\);/,
    'the profile center panel must inherit the actual door partId instead of exposing a shared generic pick id'
  );

  assert.match(
    src,
    /tagDoorVisualPart\(centerPanel, 'door_tom_center_panel'\);/,
    'the tom center panel must inherit the actual door partId instead of exposing a shared generic pick id'
  );

  assert.doesNotMatch(
    src,
    /centerPanel\.userData\.partId = 'door_profile_center_panel';/,
    'profile center panel must not overwrite paint/material routing with a shared generic partId'
  );

  assert.doesNotMatch(
    src,
    /centerPanel\.userData\.partId = 'door_tom_center_panel';/,
    'tom center panel must not overwrite paint/material routing with a shared generic partId'
  );
});
