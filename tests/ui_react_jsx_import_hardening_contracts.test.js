import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const uiReactRoot = path.join(repoRoot, 'esm/native/ui/react');

function collectFiles(rootDir, suffix) {
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
      if (entry.isFile() && next.endsWith(suffix)) out.push(next);
    }
  }
  return out.sort();
}

function readFile(absPath) {
  return fs.readFileSync(absPath, 'utf8');
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const jsxFiles = collectFiles(uiReactRoot, '.tsx');

const appErrorBoundary = readFile(path.join(uiReactRoot, 'components/AppErrorBoundary.tsx'));
const overlayTopControls = readFile(path.join(uiReactRoot, 'overlay_top_controls.tsx'));
const renderRoomSection = readFile(path.join(uiReactRoot, 'tabs/render_tab_sections_room.tsx'));
const editorSurface = readFile(path.join(uiReactRoot, 'pdf/order_pdf_overlay_editor_surface.tsx'));

test('ui react jsx import hardening removes legacy default React imports and namespace access from tsx modules', () => {
  for (const file of jsxFiles) {
    const source = stripComments(readFile(file));
    assert.doesNotMatch(source, /import\s+React\s+from\s+['"]react['"]/);
    assert.doesNotMatch(source, /import\s+React\s*,/);
    assert.doesNotMatch(source, /\bReact\./);
  }
});

test('ui react jsx import hardening uses explicit named imports in representative components', () => {
  assert.match(appErrorBoundary, /import \{ Component \} from 'react';/);
  assert.match(appErrorBoundary, /import type \{ ReactNode \} from 'react';/);
  assert.doesNotMatch(appErrorBoundary, /\bReact\./);

  assert.match(overlayTopControls, /import \{ useCallback, useEffect, useState \} from 'react';/);
  assert.doesNotMatch(overlayTopControls, /\bReact\./);

  assert.match(renderRoomSection, /import type \{[^}]*ReactElement[^}]*\} from 'react';/);
  assert.doesNotMatch(renderRoomSection, /\bReact\./);

  assert.match(
    editorSurface,
    /import type \{[^}]*MutableRefObject[^}]*PointerEventHandler[^}]*ReactElement[^}]*ReactNode[^}]*\} from 'react';/
  );
  assert.doesNotMatch(editorSurface, /\bReact\./);
});
