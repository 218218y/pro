import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const readProjectSource = relativePath => readFileSync(resolve(here, '..', relativePath), 'utf8');

test('[settings-tab-order-contract] room design is rendered immediately after image export and before display', () => {
  const settingsTabSource = readProjectSource('esm/native/ui/react/tabs/SettingsTab.tsx');

  const displaySectionIndex = settingsTabSource.indexOf('<SettingsVisualDisplaySection');
  const roomSectionIndex = settingsTabSource.indexOf('<SettingsVisualRoomSection');
  const imageExportSectionIndex = settingsTabSource.indexOf('<Section title="ייצוא תמונות"');
  const imageExportSectionEndIndex = settingsTabSource.indexOf('</Section>', imageExportSectionIndex);

  assert.notEqual(displaySectionIndex, -1);
  assert.notEqual(roomSectionIndex, -1);
  assert.notEqual(imageExportSectionIndex, -1);
  assert.notEqual(imageExportSectionEndIndex, -1);
  assert.ok(imageExportSectionIndex < roomSectionIndex);
  assert.ok(roomSectionIndex < displaySectionIndex);
  assert.equal(
    settingsTabSource.slice(imageExportSectionEndIndex + '</Section>'.length, roomSectionIndex).trim(),
    '',
    'room design should be the next rendered section after image export'
  );
});
