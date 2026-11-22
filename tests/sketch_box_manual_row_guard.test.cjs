const fs = require('fs');
const path = require('path');
const assert = require('assert');

const layoutPath = path.join(
  __dirname,
  '..',
  'esm',
  'native',
  'ui',
  'react',
  'tabs',
  'interior_tab_sections_layout.tsx'
);
const layout = fs.readFileSync(layoutPath, 'utf8');

assert.match(
  layout,
  /if \(props\.isBraceShelvesMode \|\| props\.isSketchDivisionToolActive \|\| readActiveBuiltInDeskOptions\(props\)\)\s*return 'sketch';/,
  'The interior sketch panel owns shelf conversion, sketch division, and built-in desk editing.'
);

assert.match(
  layout,
  /if \(props\.isManualLayoutMode && !props\.isSketchToolActive\) return 'grid';\s*return null;/,
  'Unrelated sketch tools such as add-box do not enter the interior grid panel.'
);
