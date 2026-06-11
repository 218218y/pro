const fs = require('fs');
const path = require('path');
const assert = require('assert');

const interiorFiles = [
  path.join(__dirname, '..', 'esm', 'native', 'ui', 'react', 'tabs', 'InteriorTab.view.tsx'),
  path.join(__dirname, '..', 'esm', 'native', 'ui', 'react', 'tabs', 'use_interior_tab_view_state.ts'),
  path.join(__dirname, '..', 'esm', 'native', 'ui', 'react', 'tabs', 'use_interior_tab_workflows.tsx'),
  path.join(
    __dirname,
    '..',
    'esm',
    'native',
    'ui',
    'react',
    'tabs',
    'interior_tab_workflows_controller_runtime.ts'
  ),
  path.join(
    __dirname,
    '..',
    'esm',
    'native',
    'ui',
    'react',
    'tabs',
    'interior_tab_workflows_controller_contracts.ts'
  ),
  path.join(
    __dirname,
    '..',
    'esm',
    'native',
    'ui',
    'react',
    'tabs',
    'interior_tab_workflows_controller_shared.ts'
  ),
  path.join(
    __dirname,
    '..',
    'esm',
    'native',
    'ui',
    'react',
    'tabs',
    'interior_tab_workflows_controller_trim.ts'
  ),
];
const clickFlowPath = path.join(
  __dirname,
  '..',
  'esm',
  'native',
  'services',
  'canvas_picking_door_trim_click.ts'
);

const interiorTab = interiorFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
const clickFlow = fs.readFileSync(clickFlowPath, 'utf8');

assert.match(
  interiorTab,
  /createDoorTrimModeOpts\(/,
  'Door trim mode must build canonical mode opts before entering primary mode.'
);

assert.match(
  interiorTab,
  /trimAxis:\s*args\.axis,[\s\S]*trimColor:\s*args\.color,[\s\S]*trimSpan:\s*args\.span,[\s\S]*trimSizeCm:[\s\S]*trimCrossSizeCm:/,
  'Door trim mode opts must preserve axis/color/span/size/cross-size for hover and click state.'
);

assert.match(
  clickFlow,
  /const target = resolveDoorTrimTargetFromHitObject\(App, doorHitObject, clickedPartId\);/,
  'Door trim click must resolve the real door group from the hit object so add/remove uses the same target as hover.'
);

assert.doesNotMatch(
  clickFlow,
  /requestBuilderBuild\(App, \{ source: 'doorTrim:click', immediate: true, force: true \}\)/,
  'Door trim click must not force a rebuild directly; config commit should drive rebuild through the canonical pipeline.'
);

assert.doesNotMatch(
  interiorTab,
  /openDoors:\s*true/,
  'Door trim edit mode must not auto-open doors on entry or on option refresh.'
);
