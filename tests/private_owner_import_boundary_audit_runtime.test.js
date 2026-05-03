import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  collectImportSpecifiers,
  runPrivateOwnerImportBoundaryAudit,
} from '../tools/wp_private_owner_import_boundary_audit.mjs';

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-private-owner-imports-'));
}

function writeFile(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
}

test('private owner import boundary audit resolves static and dynamic import specifiers', () => {
  const imports = collectImportSpecifiers(`
    import type { A } from './a.js';
    import { B } from './b.js';
    import './side.js';
    export { C } from './c.js';
    const later = () => import('./dynamic.js');
  `);

  assert.deepEqual(imports.map(item => item.specifier).sort(), [
    './a.js',
    './b.js',
    './c.js',
    './dynamic.js',
    './side.js',
  ]);
});

test('private owner import boundary audit allows facade and sibling owners but rejects outside consumers', () => {
  const projectRoot = tempProject();
  writeFile(
    path.join(projectRoot, 'esm/native/family/public_facade.ts'),
    "export { privateThing } from './public_facade_private.js';\n"
  );
  writeFile(
    path.join(projectRoot, 'esm/native/family/public_facade_private.ts'),
    'export const privateThing = 1;\n'
  );
  writeFile(
    path.join(projectRoot, 'esm/native/family/public_facade_sibling.ts'),
    "import { privateThing } from './public_facade_private.js';\nexport const siblingThing = privateThing;\n"
  );
  writeFile(
    path.join(projectRoot, 'esm/native/consumer/good.ts'),
    "import { privateThing } from '../family/public_facade.js';\nexport const value = privateThing;\n"
  );
  writeFile(
    path.join(projectRoot, 'esm/native/consumer/bad.ts'),
    "import { privateThing } from '../family/public_facade_private.js';\nexport const value = privateThing;\n"
  );

  const result = runPrivateOwnerImportBoundaryAudit(projectRoot, {
    families: [
      {
        id: 'test:family',
        publicFacade: 'esm/native/family/public_facade.ts',
        privateOwners: [
          'esm/native/family/public_facade_private.ts',
          'esm/native/family/public_facade_sibling.ts',
        ],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.match(result.violations[0], /esm\/native\/consumer\/bad\.ts:1/);
  assert.match(result.violations[0], /use esm\/native\/family\/public_facade\.ts/);
});

test('private owner import boundary audit passes on the live registered owner families', () => {
  const result = runPrivateOwnerImportBoundaryAudit(process.cwd());

  assert.equal(result.ok, true);
  assert.equal(result.configErrors.length, 0);
  assert.equal(result.missingFiles.length, 0);
  assert.equal(result.violations.length, 0);
  assert.ok(result.privateOwners >= 25);
  assert.ok(result.importSites.length >= result.privateOwners);
});
