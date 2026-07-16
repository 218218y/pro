import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { resolveTsc } from '../tools/wp_typecheck_shared.js';

const rootDir = process.cwd();
const configPath = path.join(rootDir, 'tsconfig.type-contracts.json');
const fixturePath = path.join(
  rootDir,
  'tests',
  'type_contracts',
  'builder_synchronous_run_type_contract.fixture.ts'
);

test('[builder synchronous run types] async callbacks are rejected by the native TypeScript contract', () => {
  const source = fs.readFileSync(fixturePath, 'utf8');
  assert.match(source, /@ts-expect-error/);

  const tscRef = resolveTsc(rootDir);
  assert.ok(tscRef && tscRef.kind !== 'blocked', 'Local TypeScript compiler is required');
  const result = spawnSync(
    tscRef.command,
    [...tscRef.argsPrefix, '-p', configPath, '--noEmit', '--pretty', 'false'],
    { cwd: rootDir, encoding: 'utf8', windowsHide: true }
  );
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');

  assert.equal(result.status, 0, output);
});
