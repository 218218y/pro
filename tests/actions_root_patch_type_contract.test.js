import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const configPath = path.join(rootDir, 'tsconfig.type-contracts.json');
const fixturePath = path.join(
  rootDir,
  'tests',
  'type_contracts',
  'actions_root_patch_type_contract.fixture.ts'
);
const tscBinPath = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');

function runTypeContracts() {
  assert.ok(fs.existsSync(tscBinPath), `Local TypeScript compiler was not found at ${tscBinPath}`);

  return spawnSync(process.execPath, [tscBinPath, '-p', configPath, '--noEmit', '--pretty', 'false'], {
    cwd: rootDir,
    encoding: 'utf8',
    windowsHide: true,
  });
}

test('[actions.patch types] fixture uses native @ts-expect-error contracts', () => {
  const source = fs.readFileSync(fixturePath, 'utf8');
  const forbiddenNeedles = [
    ['create', 'Program'].join(''),
    ['getPreEmit', 'Diagnostics'].join(''),
    ['createCompiler', 'Host'].join(''),
    ['transpile', 'Module'].join(''),
  ];

  assert.match(source, /@ts-expect-error/);
  assert.doesNotMatch(source, /\/\/\s*expect-error(?!\s*$)/);
  assert.deepEqual(
    forbiddenNeedles.filter(needle => source.includes(needle)),
    []
  );
});

test('[actions.patch types] public/backend patch contract fixture typechecks through tsc', () => {
  const result = runTypeContracts();
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');

  assert.equal(
    result.status,
    0,
    `Type contract fixture failed. Command: node ${path.relative(rootDir, tscBinPath)} -p ${path.relative(
      rootDir,
      configPath
    )} --noEmit --pretty false\n${output}`
  );
});
