import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFirstExisting } from './_read_src.js';
import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const structureTab = normalizeWhitespace(
  [
    read('esm/native/ui/react/tabs/StructureTab.view.tsx'),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_view_state.ts'], import.meta.url)
    ),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx'], import.meta.url)
    ),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_library_helpers.ts'], import.meta.url)
    ),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_controls.tsx'], import.meta.url)
    ),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_shared.ts'], import.meta.url)
    ),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_saved_models_panel.tsx'], import.meta.url)
    ),
  ].join('\n')
);
const libraryPreset = read('esm/native/features/library_preset/library_preset.ts');
const libraryPresetTypes = read('esm/native/features/library_preset/library_preset_types.ts');
const libraryPresetFlow = normalizeWhitespace(
  [
    read('esm/native/features/library_preset/library_preset_flow.ts'),
    read('esm/native/features/library_preset/library_preset_flow_shared.ts'),
    read('esm/native/features/library_preset/library_preset_flow_toggle.ts'),
    read('esm/native/features/library_preset/library_preset_flow_invariants.ts'),
  ].join('\n')
);
const libraryPresetShared = read('esm/native/features/library_preset/library_preset_shared.ts');
const multicolorService = read('esm/native/ui/multicolor_service.ts');

test('[stageB] library preset + multicolor use explicit typed surfaces (no generic key writers)', () => {
  assert.match(libraryPresetTypes, /export type LibraryPresetUiRawState = Partial<\s*Pick</);
  assert.match(libraryPresetTypes, /type LibraryPresetConfigSurface = \{/);
  assert.match(libraryPresetTypes, /type LibraryPresetUiSurface = \{/);
  assert.match(libraryPreset, /let preState: LibraryPresetPreState \| null = null;/);
  assert.match(libraryPresetFlow, /raw: readLibraryPresetUiRawState\(ui\.raw\),/);
  assert.match(libraryPresetFlow, /applyLibraryPresetUiRawState\(env, rawRestore, meta\);/);
  assert.match(libraryPresetShared, /export function buildLibraryModuleConfigLists\(/);
  assert.doesNotMatch(libraryPreset, /setScalar: \(key: string, value: unknown/);
  assert.doesNotMatch(libraryPreset, /setFlag: \(key: string, on: boolean/);
  assert.doesNotMatch(libraryPreset, /setRawScalar: \(key: string, value: unknown/);
  assert.doesNotMatch(libraryPreset, /_setUiRaw\(/);

  assert.match(structureTab, /setModulesConfiguration: \(next, m\?: ActionMetaLike\) =>/);
  assert.match(structureTab, /setStackSplitLowerDoorsManual: \(on: boolean, m\?: ActionMetaLike\) =>/);
  assert.doesNotMatch(structureTab, /setScalar: \(k: string, v: unknown/);
  assert.doesNotMatch(structureTab, /setFlag: \(k: string, on: boolean/);
  assert.doesNotMatch(structureTab, /setRawScalar: \(k: string, v: unknown/);

  assert.match(multicolorService, /readModeStateFromApp/);
  assert.match(multicolorService, /readConfigStateFromApp/);
  assert.match(multicolorService, /readUiStateFromApp/);
  assert.match(multicolorService, /setUiScalarSoft\(App, 'currentCurtainChoice', next,/);
  assert.doesNotMatch(multicolorService, /patchUiSoft\(/);
  assert.doesNotMatch(multicolorService, /type PatchOptions =/);
  assert.doesNotMatch(multicolorService, /export type MulticolorServiceApp =/);
});
