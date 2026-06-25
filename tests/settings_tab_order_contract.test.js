import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const readProjectSource = relativePath => readFileSync(resolve(here, '..', relativePath), 'utf8');

test('[settings-tab-order-contract] image export section is rendered before display section', () => {
  const settingsTabSource = readProjectSource('esm/native/ui/react/tabs/SettingsTab.tsx');

  const displaySectionIndex = settingsTabSource.indexOf('<SettingsVisualDisplaySection');
  const imageExportSectionIndex = settingsTabSource.indexOf('<Section title="ייצוא תמונות"');

  assert.notEqual(displaySectionIndex, -1);
  assert.notEqual(imageExportSectionIndex, -1);
  assert.ok(imageExportSectionIndex < displaySectionIndex);
});
