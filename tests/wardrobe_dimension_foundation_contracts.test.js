import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { createSourceFile, walkAst } from '../tools/wp_ast_adapter.mjs';

const FACADE_SPECIFIER = 'wardrobe_dimension_tokens_shared';
const MAX_FACADE_IMPORTERS = 290;
const MAX_FACADE_IMPORT_STATEMENTS = 291;

function read(relativePath) {
  return fs.readFileSync(relativePath, 'utf8');
}

function walkSourceFiles(directory, visit) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(absolute, visit);
    } else if (/\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) {
      visit(absolute);
    }
  }
}

test('[dimension-foundation] focused owners hold units, defaults, and product limits', () => {
  const facade = read('esm/shared/wardrobe_dimension_tokens_shared.ts');
  const units = read('esm/shared/dimensions/units.ts');
  const defaults = read('esm/shared/dimensions/wardrobe_defaults.ts');
  const limits = read('esm/shared/dimensions/product_limits.ts');

  assert.match(facade, /from '\.\/dimensions\/units\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/wardrobe_defaults\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/product_limits\.js'/u);
  assert.doesNotMatch(facade, /export const WARDROBE_DEFAULTS =/u);
  assert.doesNotMatch(facade, /export const WARDROBE_LIMITS =/u);

  assert.match(units, /export type Millimeters/u);
  assert.match(units, /export type WorldUnits/u);
  assert.match(units, /export function centimetersToMeters\(/u);
  assert.match(defaults, /export const WARDROBE_DEFAULTS = Object\.freeze/u);
  assert.match(limits, /export const WARDROBE_LIMITS = Object\.freeze/u);

  assert.doesNotMatch(`${units}\n${defaults}\n${limits}`, /wardrobe_dimension_tokens_shared/u);
});

test('[dimension-foundation] legacy facade importer budget is decrease-only', () => {
  const importers = new Set();
  let importStatements = 0;

  walkSourceFiles('esm', file => {
    const source = read(file);
    if (!source.includes(FACADE_SPECIFIER)) return;
    const sourceFile = createSourceFile(file, source);
    walkAst(sourceFile, node => {
      if (node?.type !== 'ImportDeclaration') return;
      if (!String(node.source?.value || '').includes(FACADE_SPECIFIER)) return;
      importers.add(file.replaceAll('\\', '/'));
      importStatements += 1;
    });
  });

  assert.ok(
    importers.size <= MAX_FACADE_IMPORTERS,
    `legacy dimension facade gained importers: ${importers.size} > ${MAX_FACADE_IMPORTERS}`
  );
  assert.ok(
    importStatements <= MAX_FACADE_IMPORT_STATEMENTS,
    `legacy dimension facade gained import statements: ${importStatements} > ${MAX_FACADE_IMPORT_STATEMENTS}`
  );
});
