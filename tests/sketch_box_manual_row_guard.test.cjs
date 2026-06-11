const fs = require('fs');
const path = require('path');
const assert = require('assert');

const viewStatePath = path.join(
  __dirname,
  '..',
  'esm',
  'native',
  'ui',
  'react',
  'tabs',
  'use_interior_tab_view_state.ts'
);
const viewState = fs.readFileSync(viewStatePath, 'utf8');

assert.match(
  viewState,
  /const showManualRow = manualRowOpen \|\| \(isManualLayoutMode && !isSketchToolActive\);/,
  'Sketch tools such as add-box must not auto-open the generic manual-layout drawer just because they reuse MANUAL_LAYOUT mode.'
);

assert.match(
  viewState,
  /const activeManualToolForUi = isManualLayoutMode && !isSketchToolActive \? manualTool : manualUiTool;/,
  'While a sketch tool is active, the generic manual-layout UI must keep its own selection instead of mirroring sketch mode as shelf\/rod.'
);
