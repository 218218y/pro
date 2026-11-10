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
  /if \(props\.isBraceShelvesMode \|\| props\.isSketchDivisionToolActive\) return 'sketch';/,
  'Only canonical sketch division and shelf conversion tools select the interior sketch panel.'
);

assert.match(
  layout,
  /if \(props\.isManualLayoutMode && !props\.isSketchToolActive\) return 'grid';\s*return null;/,
  'Unrelated sketch tools such as add-box do not enter the interior grid panel.'
);
