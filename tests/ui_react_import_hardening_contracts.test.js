import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const uiReactRoot = path.join(repoRoot, 'esm/native/ui/react');

function readSource(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function collectTsFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(next);
        continue;
      }
      if (entry.isFile() && next.endsWith('.ts')) out.push(next);
    }
  }
  return out.sort();
}

const normalizedUiTsFiles = collectTsFiles(uiReactRoot);
const savedModelsListContracts = readSource(
  'esm/native/ui/react/tabs/structure_tab_saved_models_list_contracts.ts'
);
const richEditors = readSource('esm/native/ui/react/pdf/order_pdf_overlay_rich_editors.ts');
const sketchPanelHooks = readSource('esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_hooks.ts');
const sketchPanelCanvasHooks = readSource(
  'esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_canvas_hooks.ts'
);
const notesPalette = readSource('esm/native/ui/react/notes/notes_overlay_controller_palette.ts');
const designColorManagerShared = readSource('esm/native/ui/react/tabs/design_tab_color_manager_shared.ts');

function readFile(absPath) {
  return fs.readFileSync(absPath, 'utf8');
}

test('ui react import hardening removes legacy React namespace access from pure ts modules', () => {
  for (const file of normalizedUiTsFiles) {
    const source = readFile(file);
    assert.doesNotMatch(source, /import\s+React\s+from\s+['"]react['"]/);
    assert.doesNotMatch(source, /import\s+type\s+React\s+from\s+['"]react['"]/);
    assert.doesNotMatch(source, /\bReact\./);
  }
});

test('ui react import hardening uses explicit named type imports for event-heavy contracts', () => {
  assert.match(
    savedModelsListContracts,
    /import type \{(?: CSSProperties,)? ?DragEvent(?:, CSSProperties)? \} from 'react';/
  );
  assert.doesNotMatch(savedModelsListContracts, /\bReact\./);

  assert.match(richEditors, /import type \{ HTMLAttributes, MutableRefObject \} from 'react';/);
  assert.match(sketchPanelHooks, /import \{ useEffect \} from 'react';/);
  assert.match(
    sketchPanelCanvasHooks,
    /import \{ useCallback, useEffect, useLayoutEffect, useRef \} from 'react';/
  );
  assert.match(notesPalette, /import \{ useLayoutEffect \} from 'react';/);
  assert.match(designColorManagerShared, /import type \{ ChangeEvent, DragEvent, RefObject \} from 'react';/);
});
