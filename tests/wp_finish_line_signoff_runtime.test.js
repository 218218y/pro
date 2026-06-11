import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, 'package.json');
const removedToolPath = path.join(projectRoot, 'tools', 'wp_finish_line_signoff.mjs');
const removedArtifacts = [
  path.join(projectRoot, 'docs', 'finish_line_progress.json'),
  path.join(projectRoot, 'docs', 'finish_line_signoff.json'),
  path.join(projectRoot, 'docs', 'FINISH_LINE_SIGNOFF.md'),
];

function readPackageScripts() {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return pkg.scripts || {};
}

test('finish-line signoff tooling was intentionally removed with refactor-doc cleanup', () => {
  assert.equal(fs.existsSync(removedToolPath), false, 'legacy finish-line signoff tool should stay removed');
  for (const artifactPath of removedArtifacts) {
    assert.equal(
      fs.existsSync(artifactPath),
      false,
      `${path.relative(projectRoot, artifactPath)} should stay removed`
    );
  }
});

test('package scripts do not expose stale finish-line signoff entry points', () => {
  const scripts = readPackageScripts();
  const scriptEntries = Object.entries(scripts).filter(
    ([name, command]) =>
      /finish[-_]line[-_]signoff/i.test(name) || /finish[-_]line[-_]signoff/i.test(String(command))
  );

  assert.deepEqual(
    scriptEntries,
    [],
    'package scripts should not reference the removed finish-line signoff tool'
  );
});
