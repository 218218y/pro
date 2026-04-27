const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

test('[door-trim] type hardening keeps trim maps normalized and marker access null-safe', () => {
  const cornerConnector = [
    'esm/native/builder/corner_connector_door_emit.ts',
    'esm/native/builder/corner_connector_door_emit_shared.ts',
    'esm/native/builder/corner_connector_door_emit_split.ts',
    'esm/native/builder/corner_connector_door_emit_full.ts',
  ]
    .map(read)
    .join('\n');
  const cornerWing = [
    'esm/native/builder/corner_wing_cell_doors.ts',
    'esm/native/builder/corner_wing_cell_doors_shared.ts',
    'esm/native/builder/corner_wing_cell_doors_context.ts',
  ]
    .map(read)
    .join('\n');
  const visuals = read('esm/native/builder/door_trim_visuals.ts');
  const hover = read('esm/native/services/canvas_picking_door_action_hover_state.ts');
  const edit = read('esm/native/services/canvas_picking_door_trim_click.ts');
  const resolver = read('esm/native/services/canvas_picking_door_trim_targets.ts');
  const interior = read('esm/native/ui/react/tabs/interior_tab_sections.tsx');
  const kernel = read('types/kernel.ts');

  assert.match(cornerConnector, /const doorTrimMap = readDoorTrimMap\(cfg0\.doorTrimMap\);/);
  assert.match(cornerWing, /readDoorTrimMap\(\(helpers\.getCfg\(ctx\.App\) \|\| \{\}\)\.doorTrimMap\)/);
  assert.match(visuals, /mesh\.position\?\.set\?\.\(/);
  assert.match(edit, /resolveDoorTrimTargetFromHitObject/);
  assert.match(edit, /buildSnappedDoorTrimCenterFromLocal/);
  assert.match(
    hover,
    /const markerUd = hoverArgs\.doorMarker \? __asObject<MarkerUserDataLike>\(hoverArgs\.doorMarker\.userData\) \|\| \{\} : \{\};/
  );
  assert.match(
    resolver,
    /type DoorGroupLike =[\s\S]*DoorVisualEntryLike\['group'\][\s\S]*null[\s\S]*undefined;/
  );
  assert.doesNotMatch(interior, /<InlineNotice\s+tone=/);
  assert.doesNotMatch(kernel, /DoorTrimMap/);
});
