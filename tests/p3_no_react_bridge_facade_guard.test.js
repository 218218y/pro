import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = new URL('..', import.meta.url);

function read(rel) {
  return fs.readFileSync(new URL(rel, ROOT), 'utf8');
}

test('P3 guard: React UI code does not refer to legacy bridge facades', () => {
  const files = [
    'esm/native/ui/ui_manifest.ts',
    'esm/native/ui/react/actions/modes_actions.ts',
    'esm/native/ui/react/actions/store_actions.ts',
    'esm/native/ui/react/actions/interactive_actions.ts',
    'esm/native/ui/react/tabs/StructureTab.view.tsx',
  ];

  const forbidden = ['React bridge', 'bridge.actions', 'bridge_impl'];

  for (const f of files) {
    const s = read(f);
    for (const token of forbidden) {
      assert.equal(s.includes(token), false, `Unexpected legacy token "${token}" in ${f}`);
    }
  }
});
