import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource } from './_source_bundle.js';

const structureControlsSource = readSource(
  '../esm/native/ui/react/tabs/structure_tab_controls.tsx',
  import.meta.url
);
const projectFlowsSource = readSource('../tests/e2e/helpers/project_flows.ts', import.meta.url);

test('[structure-e2e-surface] structure controls expose stable button hooks and pressed state', () => {
  assert.match(structureControlsSource, /data-testid="structure-type-selector"/);
  assert.match(structureControlsSource, /data-testid="structure-type-row"/);
  assert.match(structureControlsSource, /data-testid="structure-board-material-row"/);
  assert.match(structureControlsSource, /data-testid=\{`structure-type-\$\{option\.id\}-button`\}/);
  assert.match(structureControlsSource, /data-testid=\{`structure-board-material-\$\{option\.id\}-button`\}/);
  assert.match(structureControlsSource, /aria-pressed=\{selected\}/);
});

test('[structure-e2e-surface] project flows read structure selections from stable structure button attributes', () => {
  assert.match(projectFlowsSource, /readSelectedButtonValue/);
  assert.match(
    projectFlowsSource,
    /readSelectedButtonValue\(\s*getStructureTypeRow\(page\)\.locator\('button'\)/
  );
  assert.match(
    projectFlowsSource,
    /readSelectedButtonValue\(\s*getBoardMaterialRow\(page\)\.locator\('button'\)/
  );
  assert.match(projectFlowsSource, /project-name-input/);
  assert.doesNotMatch(projectFlowsSource, /button\.selected\[data-structure-type\]/);
  assert.doesNotMatch(projectFlowsSource, /button\.selected\[data-board-material\]/);
});

test('[structure-e2e-surface] project flows treat selected state canonically and do not require aria-pressed on option buttons', () => {
  assert.match(projectFlowsSource, /async function isButtonSelected/);
  assert.match(projectFlowsSource, /\bselected\b/);
  assert.match(projectFlowsSource, /\bactive\b/);
  assert.match(projectFlowsSource, /aria-pressed/);
  assert.doesNotMatch(projectFlowsSource, /setStructureType[\s\S]*toHaveAttribute\('aria-pressed', 'true'\)/);
  assert.doesNotMatch(projectFlowsSource, /setBoardMaterial[\s\S]*toHaveAttribute\('aria-pressed', 'true'\)/);
  assert.doesNotMatch(projectFlowsSource, /setDoorStyle[\s\S]*toHaveAttribute\('aria-pressed', 'true'\)/);
});
