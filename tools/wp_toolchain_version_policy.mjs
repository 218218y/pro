#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DOC_RELATIVE_PATH = 'docs/TOOLCHAIN_VERSION_POLICY.md';

const PINNED_DEV_DEPS = [
  {
    name: 'typescript',
    role: 'Type correctness gate and TS7 compiler lane.',
    updatePolicy: 'Keep exact at 7.0.2 until a dedicated TypeScript patch/minor refresh is approved.',
  },
  {
    name: 'eslint',
    role: 'Strict JS/tools/tests/config lint gate.',
    updatePolicy: 'Keep exact; review patch/minor releases in a dedicated lint dependency refresh.',
  },
  {
    name: 'oxlint',
    role: 'Blocking TS/TSX syntax lint gate.',
    updatePolicy: 'Keep exact while syntax diagnostics are 0; update only with parity report refresh.',
  },
  {
    name: 'oxlint-tsgolint',
    role: 'Audit-only type-aware lint lane.',
    updatePolicy: 'Keep exact; patch/minor updates belong to a later type-aware diagnostic burn-down pass.',
  },
  {
    name: 'oxc-parser',
    role: 'Internal AST adapter parser.',
    updatePolicy: 'Keep exact; parser updates require `wp_ast_adapter` parity tests.',
  },
];

const TS_ESLINT_SCOPE = '@typescript-' + 'eslint';
const FORBIDDEN_PACKAGES = [
  { name: `${TS_ESLINT_SCOPE}/parser`, label: 'TS ESLint parser package' },
  { name: `${TS_ESLINT_SCOPE}/eslint-plugin`, label: 'TS ESLint plugin package' },
  { name: '@typescript/' + 'typescript' + '6', label: 'TypeScript 6 compatibility package' },
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function parseArgs(argv) {
  const args = { checkPath: null, outPath: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') args.json = true;
    else if (arg === '--check') args.checkPath = argv[++i] || DEFAULT_DOC_RELATIVE_PATH;
    else if (arg.startsWith('--check='))
      args.checkPath = arg.slice('--check='.length) || DEFAULT_DOC_RELATIVE_PATH;
    else if (arg === '--out') args.outPath = argv[++i] || DEFAULT_DOC_RELATIVE_PATH;
    else if (arg.startsWith('--out=')) args.outPath = arg.slice('--out='.length) || DEFAULT_DOC_RELATIVE_PATH;
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node tools/wp_toolchain_version_policy.mjs [--json] [--out docs/TOOLCHAIN_VERSION_POLICY.md] [--check docs/TOOLCHAIN_VERSION_POLICY.md]'
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function isExactSemver(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(value || ''));
}

function collectToolchainVersionPolicy() {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const rootLockPackage = lock.packages?.[''] || {};
  const devDependencies = pkg.devDependencies || {};
  const lockRootDevDependencies = rootLockPackage.devDependencies || {};
  const rows = [];
  const violations = [];

  for (const item of PINNED_DEV_DEPS) {
    const packageJsonVersion = devDependencies[item.name] || null;
    const lockRootVersion = lockRootDevDependencies[item.name] || null;
    const installedVersion = lock.packages?.[`node_modules/${item.name}`]?.version || null;
    const exact = isExactSemver(packageJsonVersion);
    const lockExact = isExactSemver(lockRootVersion);
    const lockMatchesPackageJson = packageJsonVersion === lockRootVersion;
    const installedMatchesRoot = installedVersion === packageJsonVersion;

    if (!packageJsonVersion) violations.push(`${item.name} is missing from package.json devDependencies.`);
    if (packageJsonVersion && !exact)
      violations.push(`${item.name} is not exact in package.json: ${packageJsonVersion}`);
    if (lockRootVersion && !lockExact)
      violations.push(`${item.name} is not exact in package-lock root: ${lockRootVersion}`);
    if (!lockRootVersion) violations.push(`${item.name} is missing from package-lock root devDependencies.`);
    if (packageJsonVersion && lockRootVersion && !lockMatchesPackageJson) {
      violations.push(
        `${item.name} package.json (${packageJsonVersion}) does not match package-lock root (${lockRootVersion}).`
      );
    }
    if (packageJsonVersion && installedVersion && !installedMatchesRoot) {
      violations.push(
        `${item.name} installed lock version (${installedVersion}) does not match package.json (${packageJsonVersion}).`
      );
    }

    rows.push({
      ...item,
      packageJsonVersion,
      lockRootVersion,
      installedVersion,
      exact,
      lockMatchesPackageJson,
      installedMatchesRoot,
    });
  }

  for (const item of FORBIDDEN_PACKAGES) {
    const name = item.name;
    const presentInPackageJson = Boolean(devDependencies[name] || pkg.dependencies?.[name]);
    const presentInLockRoot = Boolean(lockRootDevDependencies[name] || rootLockPackage.dependencies?.[name]);
    const presentInLockTree = Boolean(lock.packages?.[`node_modules/${name}`]);
    if (presentInPackageJson || presentInLockRoot || presentInLockTree) {
      violations.push(`${item.label} must stay absent after TypeScript 7 cleanup.`);
    }
  }

  return {
    rows,
    forbiddenPackages: FORBIDDEN_PACKAGES.map(item => item.name),
    forbiddenPackageLabels: FORBIDDEN_PACKAGES.map(item => item.label),
    violations,
  };
}

function mdCell(value) {
  return String(value == null ? '' : value)
    .replace(/\|/g, '\\|')
    .replace(/\n+/g, '<br>');
}

function createToolchainVersionPolicyMarkdown(policy) {
  const lines = [
    '# Toolchain Version Policy',
    '',
    '<!-- Tool-owned report target. Regenerate with: npm run toolchain:version-policy:report -->',
    '',
    'TypeScript 7 cleanup is complete. Core toolchain packages are intentionally exact-pinned so future patch/minor upgrades happen in a dedicated dependency refresh, not as silent lockfile drift.',
    '',
    '## Exact pinned packages',
    '',
    '| Package | package.json | package-lock root | resolved lock package | Role | Future patch/minor policy |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const row of policy.rows) {
    lines.push(
      `| \`${mdCell(row.name)}\` | \`${mdCell(row.packageJsonVersion)}\` | \`${mdCell(row.lockRootVersion)}\` | \`${mdCell(row.installedVersion)}\` | ${mdCell(row.role)} | ${mdCell(row.updatePolicy)} |`
    );
  }

  lines.push(
    '',
    '## Removed packages that must stay absent',
    '',
    ...policy.forbiddenPackageLabels.map(label => `- ${label}`),
    '',
    '## Future update check',
    '',
    '- Do not auto-upgrade TypeScript, Oxlint, oxlint-tsgolint, oxc-parser, or ESLint as part of feature work.',
    '- For a future patch/minor refresh, run the normal quality gates, regenerate lint parity docs, and compare `lint:ts-modern:type-aware` diagnostics before/after.',
    '- `lint:ts-modern:type-aware` remains audit-only; patch/minor updates should reduce or explain diagnostics before becoming blocking.',
    '',
    '## Current status',
    '',
    policy.violations.length
      ? 'Not ready:'
      : 'Ready: all pinned toolchain versions are exact and removed TS ESLint packages are absent.',
    ...policy.violations.map(v => `- ${v}`),
    ''
  );
  return lines.join('\n');
}

async function formatMarkdownForDocs(markdown) {
  try {
    const prettier = await import('prettier');
    return await prettier.format(markdown, { parser: 'markdown' });
  } catch {
    return markdown;
  }
}

async function createFormattedToolchainVersionPolicyMarkdown(policy) {
  return formatMarkdownForDocs(createToolchainVersionPolicyMarkdown(policy));
}

function assertClean(policy) {
  if (!policy.violations.length) return;
  throw new Error(
    `[toolchain-version-policy] ${policy.violations.length} violation(s):\n- ${policy.violations.join('\n- ')}`
  );
}

function writeFile(relativePath, text) {
  const target = path.resolve(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const policy = collectToolchainVersionPolicy();
  const markdown = await createFormattedToolchainVersionPolicyMarkdown(policy);

  if (args.json) console.log(JSON.stringify(policy, null, 2));

  if (args.outPath) {
    writeFile(args.outPath, markdown);
    console.log(`[toolchain-version-policy] wrote ${args.outPath}`);
  }

  if (args.checkPath) {
    assertClean(policy);
    const target = path.resolve(ROOT, args.checkPath);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (current !== markdown) {
      throw new Error(`[toolchain-version-policy] generated docs are stale: ${args.checkPath}`);
    }
    console.log('[toolchain-version-policy] OK');
  }

  if (!args.outPath && !args.checkPath && !args.json) {
    assertClean(policy);
    console.log(markdown);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export {
  collectToolchainVersionPolicy,
  createToolchainVersionPolicyMarkdown,
  createFormattedToolchainVersionPolicyMarkdown,
};
