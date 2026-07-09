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
  requireAstAdapter,
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

test('AST adapter parses TS/TSX and exposes stable syntax helpers', () => {
  const astApi = requireAstAdapter('AST Adapter Runtime Test');
  const source = createSourceFile(
    'fixture.tsx',
    `
      type Props = { label: string };
      export function View(props: Props) {
        return <div>{props.label}</div>;
      }
    `,
    { astApi }
  );

  let functionCount = 0;
  function visit(node) {
    if (astApi.isFunctionDeclaration(node)) functionCount += 1;
    astApi.forEachChild(node, visit);
  }
  visit(source);

  assert.equal(astApi.getScriptKindForFile('fixture.tsx'), astApi.ScriptKind.TSX);
  assert.equal(functionCount, 1);
  assert.equal(countFunctionLikeNodes(source, { astApi }), 1);
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

test('only the AST adapter imports TypeScript directly for AST parsing', () => {
  const scannedRoots = ['tools', 'tests'].map(rel => path.join(root, rel));
  const allowedRelPaths = new Set(['tools/wp_ast_adapter.mjs']);
  const forbiddenNeedles = [
    ['from ', "'typescript'"].join(''),
    ['from ', '"typescript"'].join(''),
    ['require', "('typescript')"].join(''),
    ['require', '("typescript")'].join(''),
    ['import', "('typescript')"].join(''),
  ];
  const failures = [];

  for (const file of scannedRoots.flatMap(dir => walkFiles(dir))) {
    const rel = path.relative(root, file).replaceAll(path.sep, '/');
    if (allowedRelPaths.has(rel)) continue;
    const source = read(rel);
    for (const needle of forbiddenNeedles) {
      if (source.includes(needle)) failures.push(`${rel}: ${needle}`);
    }
  }

  assert.deepEqual(failures, []);
});

test('AST adapter can wrap an already loaded TS module for callers that inject one', () => {
  const direct = requireAstAdapter('AST Adapter Runtime Test');
  const wrapped = createAstAdapter({ tsModule: direct.__tsModule });

  assert.ok(wrapped);
  assert.equal(wrapped.getScriptKindForFile('fixture.js'), wrapped.ScriptKind.JS);
});
