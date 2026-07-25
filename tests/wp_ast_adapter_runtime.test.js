import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  collectCodeLineNumbers,
  collectTypeHotspotCounts,
  countFunctionLikeNodes,
  createAstAdapter,
  createSourceFile,
  getAstParserModule,
  requireAstAdapter,
  walkAst,
} from '../tools/wp_ast_adapter.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      walkFiles(full, out);
      continue;
    }
    if (/\.(?:js|mjs|cjs|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test('AST adapter uses Oxc parser and parses TS/TSX through stable syntax helpers', () => {
  const astApi = requireAstAdapter('AST Adapter Runtime Test');
  const source = createSourceFile(
    'fixture.tsx',
    `
      import { item as importedItem } from './item.js';
      type Props = { label: string };
      export function View(props: Props) {
        return <div>{props?.label ?? importedItem}</div>;
      }
    `,
    { astApi }
  );

  let functionCount = 0;
  let importCount = 0;
  let memberCount = 0;
  walkAst(
    source,
    node => {
      if (astApi.isFunctionDeclaration(node)) functionCount += 1;
      if (astApi.isImportDeclaration(node)) importCount += 1;
      if (astApi.isPropertyAccessExpression(node)) memberCount += 1;
    },
    { astApi }
  );

  assert.equal(getAstParserModule().parseSync, getAstParserModule().parseSync);
  assert.equal(astApi.__parser, 'oxc-parser');
  assert.equal(astApi.getScriptKindForFile('fixture.tsx'), astApi.ScriptKind.TSX);
  assert.equal(functionCount, 1);
  assert.equal(importCount, 1);
  assert.ok(memberCount >= 1);
  assert.equal(countFunctionLikeNodes(source, { astApi }), 1);
});

test('AST adapter preserves import, dynamic import, member, optional-chain, and meta-property shapes for callers', () => {
  const astApi = requireAstAdapter('AST Adapter Runtime Test');
  const source = createSourceFile(
    'imports.ts',
    `
      import * as THREE from 'three';
      import localDefault, { Mesh as MeshAlias } from './local.js';
      export { MeshAlias } from './exported.js';
      const ctor = THREE.Mesh;
      const optional = app?.store?.value;
      const loaded = import('./lazy.js');
      function constructable() {
        return new.target;
      }
      const url = new URL('./asset.js', import.meta.url);
      void constructable;
      void localDefault;
    `,
    { astApi }
  );

  const imports = [];
  const exports = [];
  const dynamicImports = [];
  const propertyNames = [];
  const newUrls = [];
  const metaProperties = [];
  walkAst(
    source,
    node => {
      if (astApi.isImportDeclaration(node)) imports.push(node.moduleSpecifier.text);
      if (node.kind === astApi.SyntaxKind.ExportDeclaration) exports.push(node.moduleSpecifier.text);
      if (astApi.isCallExpression(node) && node.expression.kind === astApi.SyntaxKind.ImportKeyword) {
        dynamicImports.push(node.arguments[0].text);
      }
      if (astApi.isPropertyAccessExpression(node)) propertyNames.push(node.name?.text || '');
      if (astApi.isNewExpression(node) && astApi.isIdentifier(node.expression))
        newUrls.push(node.expression.text);
      if (astApi.isMetaProperty(node)) {
        metaProperties.push(`${node.meta?.name || ''}.${node.property?.name || ''}`);
      }
    },
    { astApi }
  );

  assert.deepEqual(imports, ['three', './local.js']);
  assert.deepEqual(exports, ['./exported.js']);
  assert.deepEqual(dynamicImports, ['./lazy.js']);
  assert.ok(propertyNames.includes('Mesh'));
  assert.ok(propertyNames.includes('url'));
  assert.deepEqual(newUrls, ['URL']);
  assert.deepEqual(metaProperties.sort(), ['import.meta', 'new.target']);
});

test('AST adapter keeps token/code-line metrics independent from tool callers', () => {
  const astApi = requireAstAdapter('AST Adapter Runtime Test');
  const text = `
    // comment only
    const value = 1;

    function run() {
      return value;
    }
  `;
  const source = createSourceFile('metrics.ts', text, { astApi });
  const codeLines = [...collectCodeLineNumbers('metrics.ts', text, { astApi, sourceFile: source })];

  assert.deepEqual(codeLines, [3, 5, 6, 7]);
  assert.equal(countFunctionLikeNodes(source, { astApi }), 1);
});

test('AST adapter centralizes type-hardening AST counts', () => {
  const astApi = requireAstAdapter('AST Adapter Runtime Test');
  const source = createSourceFile(
    'types.ts',
    `
      const loose: any = {};
      const cast = loose as { value?: number };
      const forced = cast.value!;
      const angle = <number>forced;
    `,
    { astApi }
  );

  assert.deepEqual(collectTypeHotspotCounts(source, { astApi }), {
    explicitAny: 1,
    asExpression: 1,
    angleAssertion: 1,
    nonNull: 1,
  });
});

test('AST adapter exposes syntax error diagnostics without TypeScript compiler API', () => {
  const astApi = requireAstAdapter('AST Adapter Runtime Test');
  const source = createSourceFile('broken.ts', 'export const value = ;', { astApi });

  assert.equal(source.parseDiagnostics.length, 1);
  assert.match(String(source.parseDiagnostics[0].messageText), /Expected|Unexpected|expression|token/i);
});

test('no project tool/test/runtime source imports TypeScript directly', () => {
  const scannedRoots = ['tools', 'tests', 'esm', 'types']
    .map(rel => path.join(root, rel))
    .filter(dir => fs.existsSync(dir));
  const forbiddenNeedles = [
    ['from ', "'typescript'"].join(''),
    ['from ', '"typescript"'].join(''),
    ['require', "('typescript')"].join(''),
    ['require', '("typescript")'].join(''),
    ['import', "('typescript')"].join(''),
    ['import', '("typescript")'].join(''),
  ];
  const failures = [];

  for (const file of scannedRoots.flatMap(dir => walkFiles(dir))) {
    const rel = path.relative(root, file).replaceAll(path.sep, '/');
    const source = read(rel);
    for (const needle of forbiddenNeedles) {
      if (source.includes(needle)) failures.push(`${rel}: ${needle}`);
    }
  }

  assert.deepEqual(failures, []);
});

test('AST adapter returns injected adapter instances without exposing TypeScript module wrapping', () => {
  const direct = requireAstAdapter('AST Adapter Runtime Test');
  const wrapped = createAstAdapter({ astApi: direct });

  assert.equal(wrapped, direct);
  assert.equal(wrapped.getScriptKindForFile('fixture.js'), wrapped.ScriptKind.JS);
});
