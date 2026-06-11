#!/usr/bin/env node
/**
 * WardrobePro - install git hooks (optional).
 *
 * Default install is intentionally fast and desktop-friendly:
 *   - pre-commit: format only staged files, then run the strict gate.
 *   - pre-push: disabled by default. Full verify is too heavy/fragile for
 *     GitHub Desktop on Windows and should usually stay a manual command.
 *
 * Usage:
 *   node tools/wp_hooks_install.js
 *   node tools/wp_hooks_install.js --with-pre-push
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

function parseArgs(argv) {
  const options = { withPrePush: false };

  for (const arg of argv) {
    if (arg === '--with-pre-push') {
      options.withPrePush = true;
    } else if (arg === '--no-pre-push') {
      options.withPrePush = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`WardrobePro git hook installer

Usage:
  node tools/wp_hooks_install.js
  node tools/wp_hooks_install.js --with-pre-push

Default:
  Installs only the fast pre-commit hook.

Options:
  --with-pre-push  Also install the full pre-push verify hook.
  --no-pre-push    Remove/disable any existing pre-push hook. This is the default.
`);
      process.exit(0);
    } else {
      console.error(`[WP Hooks] Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));
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
# Formats only staged files, then keeps boundaries clean without slowing you down.
${nodeCmd()} tools/wp_prettier_changed.mjs --write --staged
${nodeCmd()} tools/wp_check.js --strict --gate
`;

// Optional only. The hook consumes Git's pre-push stdin first and then detaches
// child commands from that stream. This avoids Windows/GitHub Desktop failures
// around pseudo-stdin paths such as /dev/stdin.
const prePush = `#!/usr/bin/env sh
# WardrobePro pre-push (optional full verify)
# Installed only by: npm run hooks:install:full
# Consume Git's pre-push refs so child tools do not inherit the hook stdin.
while read local_ref local_sha remote_ref remote_sha; do
  :
done
${nodeCmd()} tools/wp_verify.js < /dev/null
`;

const preCommitPath = path.join(hooksDir, 'pre-commit');
const prePushPath = path.join(hooksDir, 'pre-push');
fs.writeFileSync(preCommitPath, preCommit, 'utf8');

if (options.withPrePush) {
  fs.writeFileSync(prePushPath, prePush, 'utf8');
} else if (fs.existsSync(prePushPath)) {
  fs.rmSync(prePushPath, { force: true });
}

// Make executable on *nix
try {
  fs.chmodSync(preCommitPath, 0o755);
  if (options.withPrePush) fs.chmodSync(prePushPath, 0o755);
} catch (_) {}

console.log('[WP Hooks] Setting git core.hooksPath to .githooks ...');
sh(gitCmd(), ['config', 'core.hooksPath', '.githooks']);

if (options.withPrePush) {
  console.log('[WP Hooks] ✅ Installed fast pre-commit + optional full pre-push verify.');
} else {
  console.log('[WP Hooks] ✅ Installed fast pre-commit only. Pre-push is disabled by default.');
}
