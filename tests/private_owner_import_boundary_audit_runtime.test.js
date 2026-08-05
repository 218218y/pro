import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  collectImportSpecifiers,
  runPrivateOwnerImportBoundaryAudit,
} from '../tools/wp_private_owner_import_boundary_audit.mjs';

const EMPTY_REVIEWED_FACADES = [];

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
  writeFile(path.join(projectRoot, 'tests/family_runtime.test.ts'), 'export {};\n');

  const result = runPrivateOwnerImportBoundaryAudit(projectRoot, {
    families: [
      {
        id: 'test:family',
        publicFacade: 'esm/native/family/public_facade.ts',
        privateOwners: [
          'esm/native/family/public_facade_private.ts',
          'esm/native/family/public_facade_sibling.ts',
        ],
        behaviorTests: ['tests/family_runtime.test.ts'],
        justification: 'Test fixture public boundary.',
      },
    ],
    justifiedOneLineFacades: [],
    reviewedOneLineFacades: EMPTY_REVIEWED_FACADES,
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
  assert.ok(result.families.some(family => family.id === 'services:viewer-measurement-tool'));
  assert.ok(result.families.some(family => family.id === 'services:drawer-cross-family'));
  assert.ok(result.privateOwners >= 30);
  assert.ok(result.importSites.length >= result.privateOwners);
  assert.equal(result.reviewedOneLineFacadeMismatches.length, 0);
  assert.ok(result.oneLineFacades.length > 0);
});

test('private facade topology rejects an unregistered identity-only wrapper', () => {
  const projectRoot = tempProject();
  writeFile(path.join(projectRoot, 'esm/native/owner.ts'), 'export const value = 1;\n');
  writeFile(path.join(projectRoot, 'esm/native/orphan_facade.ts'), "export { value } from './owner.js';\n");

  const result = runPrivateOwnerImportBoundaryAudit(projectRoot, {
    families: [],
    justifiedOneLineFacades: [],
    reviewedOneLineFacades: EMPTY_REVIEWED_FACADES,
  });

  assert.equal(result.ok, false);
  assert.equal(result.unreviewedOneLineFacades.length, 1);
  assert.equal(result.reviewedOneLineFacadeMismatches.length, 1);
  assert.match(result.reviewedOneLineFacadeMismatches[0], /unreviewed identity-only facade/);
});

test('private facade topology reports explicit importer drift instead of an opaque hash mismatch', () => {
  const projectRoot = tempProject();
  writeFile(path.join(projectRoot, 'esm/native/owner.ts'), 'export const value = 1;\n');
  writeFile(path.join(projectRoot, 'esm/native/orphan_facade.ts'), "export { value } from './owner.js';\n");
  writeFile(
    path.join(projectRoot, 'esm/native/consumer.ts'),
    "import { value } from './orphan_facade.js';\nexport const result = value;\n"
  );

  const result = runPrivateOwnerImportBoundaryAudit(projectRoot, {
    families: [],
    justifiedOneLineFacades: [],
    reviewedOneLineFacades: [
      { path: 'esm/native/orphan_facade.ts', importer: 'esm/native/other_consumer.ts' },
    ],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.reviewedOneLineFacadeImporterDrift, [
    {
      file: 'esm/native/orphan_facade.ts',
      expectedImporter: 'esm/native/other_consumer.ts',
      actualImporter: 'esm/native/consumer.ts',
    },
  ]);
  assert.match(result.reviewedOneLineFacadeMismatches[0], /importer changed/);
});
