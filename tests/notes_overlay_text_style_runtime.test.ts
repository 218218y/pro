import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyNotesEditorFormattingDefaults,
  applyNotesEditorStyleDefaults,
  readNotesCardFormatting,
  readNotesToolbarFormatting,
  resolveNotesFontSizePxFromUi,
  resolveNotesLegacyFontSizeFromToolbarValue,
  resolveNotesToolbarColor,
  resolveNotesToolbarFontSizeUi,
  resolveNotesToolbarFontSizeUiFromPx,
} from '../esm/native/ui/react/notes/notes_overlay_text_style_runtime.js';

test('readNotesToolbarFormatting normalizes saved-note text color and legacy font size once', () => {
  const formatting = readNotesToolbarFormatting({
    textColor: 'rgb(239, 68, 68)',
    fontSize: '6',
  });

  assert.deepEqual(formatting, {
    color: '#ef4444',
    legacyFontSize: '6',
    fontSizeUi: '5',
  });
});

test('readNotesCardFormatting prefers base style values and preserves stable fallbacks', () => {
  const formatting = readNotesCardFormatting({
    baseTextColor: '#ffffff',
    baseFontSize: '5',
    textColor: '#000000',
    fontSize: '3',
  });

  assert.deepEqual(formatting, {
    baseFontPx: '20px',
    baseTextColor: '#ffffff',
  });
});

test('resolveNotes font helpers normalize ui, legacy, and px values through one canonical path', () => {
  assert.equal(resolveNotesLegacyFontSizeFromToolbarValue('1'), '2');
  assert.equal(resolveNotesLegacyFontSizeFromToolbarValue('5'), '6');
  assert.equal(resolveNotesLegacyFontSizeFromToolbarValue('6'), '6');
  assert.equal(resolveNotesLegacyFontSizeFromToolbarValue('24px'), '6');
  assert.equal(resolveNotesToolbarFontSizeUi('6'), '5');
  assert.equal(resolveNotesToolbarFontSizeUiFromPx(24), '5');
  assert.equal(resolveNotesFontSizePxFromUi('5'), 24);
});

test('resolveNotesToolbarColor keeps normalized css colors stable but preserves explicit raw fallbacks', () => {
  assert.equal(resolveNotesToolbarColor('rgb(250, 204, 21)'), '#facc15');
  assert.equal(resolveNotesToolbarColor('not-a-color', '#000000'), 'not-a-color');
  assert.equal(resolveNotesToolbarColor('', '#000000'), '#000000');
});

test('applyNotesEditorFormattingDefaults writes color and font size and only toggles bold when needed', () => {
  const commands: Array<[string, boolean, string | undefined]> = [];
  const doc = {
    execCommand(cmd: string, _showUi: boolean, value?: string) {
      commands.push([cmd, false, value]);
      return true;
    },
    queryCommandState(cmd: string) {
      assert.equal(cmd, 'bold');
      return false;
    },
  } as any;

  applyNotesEditorFormattingDefaults(doc, {
    color: 'rgb(255, 255, 255)',
    fontSize: '4',
    bold: true,
  });

  assert.deepEqual(commands, [
    ['foreColor', false, '#ffffff'],
    ['fontSize', false, '5'],
    ['bold', false, undefined],
  ]);
});

test('applyNotesEditorFormattingDefaults preserves bold state when it already matches and accepts legacy size input', () => {
  const commands: Array<[string, boolean, string | undefined]> = [];
  const doc = {
    execCommand(cmd: string, _showUi: boolean, value?: string) {
      commands.push([cmd, false, value]);
      return true;
    },
    queryCommandState() {
      return true;
    },
  } as any;

  applyNotesEditorFormattingDefaults(doc, {
    color: '#ef4444',
    fontSize: '6',
    bold: true,
  });

  assert.deepEqual(commands, [
    ['foreColor', false, '#ef4444'],
    ['fontSize', false, '6'],
  ]);
});

test('applyNotesEditorStyleDefaults reuses the same canonical formatting resolution for saved styles', () => {
  const commands: Array<[string, boolean, string | undefined]> = [];
  const doc = {
    execCommand(cmd: string, _showUi: boolean, value?: string) {
      commands.push([cmd, false, value]);
      return true;
    },
    queryCommandState() {
      return false;
    },
  } as any;

  const formatting = applyNotesEditorStyleDefaults(doc, {
    textColor: 'rgb(0, 0, 0)',
    fontSize: '5',
  });

  assert.deepEqual(formatting, {
    color: '#000000',
    legacyFontSize: '5',
    fontSizeUi: '4',
  });
  assert.deepEqual(commands, [
    ['foreColor', false, '#000000'],
    ['fontSize', false, '5'],
  ]);
});
