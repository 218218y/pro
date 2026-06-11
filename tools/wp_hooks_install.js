#!/usr/bin/env node
/**
 * WardrobePro - install git hooks (optional).
 * Creates `.githooks/` with:
 *   - pre-commit: fast check (strict+gate)
 *   - pre-push: full verify (optional but recommended)
 *
 * Then configures: `git config core.hooksPath .githooks`
 *
 * Usage:
 *   node tools/wp_hooks_install.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sh(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (res.status !== 0) process.exit(res.status ?? 1);
}
function gitCmd() {
  return process.platform === 'win32' ? 'git.exe' : 'git';
}
function nodeCmd() {
  return process.platform === 'win32' ? 'node.exe' : 'node';
}

const root = path.resolve(__dirname, '..');
process.chdir(root);

if (!fs.existsSync(path.join(root, '.git'))) {
  console.error('[WP Hooks] .git folder not found. Initialize a repo first (git init).');
  process.exit(1);
}

const hooksDir = path.join(root, '.githooks');
fs.mkdirSync(hooksDir, { recursive: true });

const preCommit = `#!/usr/bin/env sh
# WardrobePro pre-commit (fast)
# Keeps boundaries clean without slowing you down.
${nodeCmd()} tools/wp_check.js --strict --gate
`;
const prePush = `#!/usr/bin/env sh
# WardrobePro pre-push (full)
# Runs full verify (lint + format check + bundle + release).
${nodeCmd()} tools/wp_verify.js
`;

fs.writeFileSync(path.join(hooksDir, 'pre-commit'), preCommit, 'utf8');
fs.writeFileSync(path.join(hooksDir, 'pre-push'), prePush, 'utf8');

// Make executable on *nix
try {
  fs.chmodSync(path.join(hooksDir, 'pre-commit'), 0o755);
  fs.chmodSync(path.join(hooksDir, 'pre-push'), 0o755);
} catch (_) {}

console.log('[WP Hooks] Setting git core.hooksPath to .githooks ...');
sh(gitCmd(), ['config', 'core.hooksPath', '.githooks']);

console.log('[WP Hooks] ✅ Installed. Next pushes will run verification automatically.');
