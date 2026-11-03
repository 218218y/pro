import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  collectBundledPackages,
  evaluateReleaseAudit,
} from '../tools/wp_release_dependency_audit_support.mjs';
import { createThreeVendorBuildConfig } from '../tools/wp_three_vendor_config.js';

test('release inventory includes lazy chunks, dev packages and exact nested lock paths', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-audit-'));
  try {
    const lock = { packages: {} };
    const paths = [
      'node_modules/three',
      'node_modules/react',
      'node_modules/pdf-lib/node_modules/@scope/helper',
    ];
    const outputs = paths.map((lockPath, index) => {
      const directory = path.join(root, lockPath);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({ name: lockPath.split('node_modules/').at(-1), version: '1.0.0' })
      );
      lock.packages[lockPath] = { version: '1.0.0', dev: index === 0 };
      return { type: 'chunk', isEntry: index === 0, modules: { [path.join(directory, 'index.js')]: {} } };
    });
    const build = [{ output: outputs }, { output: [outputs[0]] }];
    const packages = collectBundledPackages(build, { root, lock });
    assert.equal(packages.length, 3);
    assert.equal(packages.find(entry => entry.name === 'three').dev, true);
    assert.ok(packages.some(entry => entry.lockPath === paths[2]));
    lock.packages[paths[0]].version = '2.0.0';
    assert.throws(() => collectBundledPackages(build, { root, lock }), /version mismatch/u);
    delete lock.packages[paths[0]];
    assert.throws(() => collectBundledPackages(build, { root, lock }), /missing from lockfile/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('release inventory fails closed on missing or empty bundler evidence', () => {
  assert.throws(
    () => collectBundledPackages([{}], { root: process.cwd(), lock: {} }),
    /Missing bundler output/u
  );
  assert.throws(
    () => collectBundledPackages([{ output: [] }], { root: process.cwd(), lock: {} }),
    /no bundled npm packages/u
  );
});

test('release audit blocks high findings in dev-classified shipped code without blocking build-only findings', () => {
  const packages = [{ name: 'three', lockPath: 'node_modules/three', dev: true }];
  const issue = (name, severity, nodes) => ({ name, severity, nodes });
  const audit = {
    auditReportVersion: 2,
    vulnerabilities: {
      eslint: issue('eslint', 'critical', ['node_modules/eslint']),
      three: issue('three', 'high', ['node_modules/three', 'node_modules/build-tool/node_modules/three']),
    },
  };
  const blocked = evaluateReleaseAudit(audit, packages);
  assert.equal(blocked.passed, false);
  assert.deepEqual(
    blocked.findings.map(entry => entry.nodes),
    [['node_modules/three']]
  );
  audit.vulnerabilities.three.severity = 'moderate';
  assert.equal(evaluateReleaseAudit(audit, packages).passed, true);
  delete audit.vulnerabilities.three;
  assert.deepEqual(evaluateReleaseAudit(audit, packages).findings, []);
});

test('release audit never accepts network errors or malformed advisory responses as a clean result', () => {
  for (const response of [
    {},
    { error: { code: 'ECONNRESET' } },
    { auditReportVersion: 2, vulnerabilities: [] },
    { auditReportVersion: 2, vulnerabilities: { three: { severity: 'high' } } },
  ]) {
    assert.throws(() => evaluateReleaseAudit(response, []), /Invalid npm audit/u);
  }
});

test('Three vendor inspection shares the release build configuration', () => {
  const config = createThreeVendorBuildConfig({
    root: '/project',
    entryAbs: '/project/tools/three_vendor_entry.js',
    tmpDirAbs: '/tmp/vendor',
  });
  assert.equal(config.build.target, 'esnext');
  assert.equal(config.build.minify, 'oxc');
  assert.equal(config.build.rolldownOptions.output.codeSplitting, false);
});
