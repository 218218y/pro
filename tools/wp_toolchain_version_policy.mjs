#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readNodeRuntimePolicy } from './wp_node_runtime_policy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DOC_RELATIVE_PATH = 'docs/TOOLCHAIN_VERSION_POLICY.md';

const APPROVED_DEV_DEP_RANGES = Object.freeze({
  typescript: '7.0.2',
  '@types/node': '^22.20.1',
  eslint: '^10.8.0',
  oxlint: '^1.75.0',
  'oxlint-tsgolint': '7.0.2001',
  'oxc-parser': '0.141.0',
});

const TOOLCHAIN_DEV_DEPS = [
  {
    name: 'typescript',
    approvedRange: APPROVED_DEV_DEP_RANGES.typescript,
    minVersion: '7.0.2',
    maxExclusiveVersion: '7.1.0',
    exactResolvedVersion: '7.0.2',
    role: 'Type correctness gate and TS7 compiler lane.',
    updatePolicy:
      'Keep the compiler exact because the offline repair vendor and declaration snapshots are built against this version.',
  },
  {
    name: '@types/node',
    approvedRange: APPROVED_DEV_DEP_RANGES['@types/node'],
    minVersion: '22.20.1',
    maxExclusiveVersion: '23.0.0',
    role: 'Node tool/test type surface aligned to the lowest supported Node runtime major.',
    updatePolicy:
      'Allow newer Node 22 declaration releases while Node 22 remains the compatibility floor. Node 24 remains the primary runtime.',
    nodeBaselineAligned: true,
  },
  {
    name: 'eslint',
    approvedRange: APPROVED_DEV_DEP_RANGES.eslint,
    minVersion: '10.8.0',
    maxExclusiveVersion: '11.0.0',
    role: 'Strict JS/tools/tests/config lint gate.',
    updatePolicy: 'Allow ESLint 10 patch/minor releases; major upgrades require a lint policy review.',
  },
  {
    name: 'oxlint',
    approvedRange: APPROVED_DEV_DEP_RANGES.oxlint,
    minVersion: '1.75.0',
    maxExclusiveVersion: '2.0.0',
    role: 'Blocking TS/TSX syntax lint gate.',
    updatePolicy:
      'Allow Oxlint 1.x patch/minor releases while the syntax and type-aware lanes remain at zero diagnostics.',
  },
  {
    name: 'oxlint-tsgolint',
    approvedRange: APPROVED_DEV_DEP_RANGES['oxlint-tsgolint'],
    minVersion: '7.0.2001',
    maxExclusiveVersion: '7.1.0',
    exactResolvedVersion: '7.0.2001',
    role: 'Blocking type-aware lint lane.',
    updatePolicy:
      'Keep this exact because it is encoded for the pinned TypeScript compiler; refresh both together.',
  },
  {
    name: 'oxc-parser',
    approvedRange: APPROVED_DEV_DEP_RANGES['oxc-parser'],
    minVersion: '0.141.0',
    maxExclusiveVersion: '0.142.0',
    exactResolvedVersion: '0.141.0',
    role: 'Internal AST adapter parser and offline repair dependency.',
    updatePolicy:
      'Keep this exact until the lockfile, offline AST archives, manifest checksums, and parser parity tests are refreshed together.',
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

function parseExactSemver(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(value || ''));
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareSemver(left, right) {
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] - right[key];
  }
  return 0;
}

function isVersionWithinBounds(version, minVersion, maxExclusiveVersion) {
  const parsed = parseExactSemver(version);
  const min = parseExactSemver(minVersion);
  const max = parseExactSemver(maxExclusiveVersion);
  if (!parsed || !min || !max) return false;
  return compareSemver(parsed, min) >= 0 && compareSemver(parsed, max) < 0;
}

function isTsgolintVersionAlignedWithTypeScript(typescriptVersion, tsgolintVersion) {
  const typescriptMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(typescriptVersion || ''));
  const tsgolintMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(tsgolintVersion || ''));
  if (!typescriptMatch || !tsgolintMatch) return false;

  const [, typescriptMajor, typescriptMinor, typescriptPatch] = typescriptMatch;
  const [, tsgolintMajor, tsgolintMinor, tsgolintPatchWithRevision] = tsgolintMatch;
  if (typescriptMajor !== tsgolintMajor || typescriptMinor !== tsgolintMinor) return false;
  if (tsgolintPatchWithRevision.length <= 3) return false;

  const tsgolintRevision = tsgolintPatchWithRevision.slice(-3);
  const encodedTypeScriptPatch = tsgolintPatchWithRevision.slice(0, -3);
  return encodedTypeScriptPatch === typescriptPatch && /^\d{3}$/.test(tsgolintRevision);
}

function collectToolchainVersionPolicy() {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const rootLockPackage = lock.packages?.[''] || {};
  const devDependencies = pkg.devDependencies || {};
  const lockRootDevDependencies = rootLockPackage.devDependencies || {};
  const rows = [];
  const violations = [];
  const nodeRuntimePolicy = readNodeRuntimePolicy(ROOT);

  for (const item of TOOLCHAIN_DEV_DEPS) {
    const packageJsonRange = devDependencies[item.name] || null;
    const lockRootRange = lockRootDevDependencies[item.name] || null;
    const resolvedVersion = lock.packages?.[`node_modules/${item.name}`]?.version || null;
    const manifestRangeApproved = packageJsonRange === item.approvedRange;
    const lockRangeMatchesManifest = packageJsonRange === lockRootRange;
    const resolvedWithinApprovedRange = item.exactResolvedVersion
      ? resolvedVersion === item.exactResolvedVersion
      : isVersionWithinBounds(resolvedVersion, item.minVersion, item.maxExclusiveVersion);
    const allowedResolvedSpec = item.exactResolvedVersion
      ? `=${item.exactResolvedVersion}`
      : `>=${item.minVersion} <${item.maxExclusiveVersion}`;

    if (!packageJsonRange) violations.push(`${item.name} is missing from package.json devDependencies.`);
    if (packageJsonRange && !manifestRangeApproved) {
      violations.push(
        `${item.name} must use approved range ${item.approvedRange}; found ${packageJsonRange}.`
      );
    }
    if (!lockRootRange) violations.push(`${item.name} is missing from package-lock root devDependencies.`);
    if (packageJsonRange && lockRootRange && !lockRangeMatchesManifest) {
      violations.push(
        `${item.name} package.json range (${packageJsonRange}) does not match package-lock root (${lockRootRange}).`
      );
    }
    if (!resolvedVersion) {
      violations.push(`${item.name} is missing from the resolved package-lock tree.`);
    } else if (!resolvedWithinApprovedRange) {
      violations.push(
        `${item.name} resolved version ${resolvedVersion} does not satisfy approved policy ${allowedResolvedSpec}.`
      );
    }
    if (item.nodeBaselineAligned && resolvedVersion) {
      const parsed = parseExactSemver(resolvedVersion);
      if (!parsed || parsed.major !== nodeRuntimePolicy.typeBaselineMajor) {
        violations.push(
          `${item.name} major ${parsed?.major ?? 'unknown'} does not match the lowest supported Node major ${nodeRuntimePolicy.typeBaselineMajor}.`
        );
      }
    }

    rows.push({
      ...item,
      packageJsonRange,
      lockRootRange,
      resolvedVersion,
      manifestRangeApproved,
      lockRangeMatchesManifest,
      resolvedWithinApprovedRange,
      allowedResolvedSpec,
    });
  }

  const typescriptVersion = lock.packages?.['node_modules/typescript']?.version || null;
  const tsgolintVersion = lock.packages?.['node_modules/oxlint-tsgolint']?.version || null;
  const tsgolintTypeScriptAligned = isTsgolintVersionAlignedWithTypeScript(
    typescriptVersion,
    tsgolintVersion
  );
  if (typescriptVersion && tsgolintVersion && !tsgolintTypeScriptAligned) {
    violations.push(
      `oxlint-tsgolint ${tsgolintVersion} is not aligned with resolved TypeScript ${typescriptVersion}.`
    );
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
    approvedRanges: APPROVED_DEV_DEP_RANGES,
    nodeRuntimePolicy,
    tsgolintTypeScriptAligned,
    forbiddenPackages: FORBIDDEN_PACKAGES.map(item => item.name),
    forbiddenPackageLabels: FORBIDDEN_PACKAGES.map(item => item.label),
    violations,
  };
}

function mdCell(value) {
  return String(value == null ? '' : value)
    .replace(/\|/g, '\|')
    .replace(/\n+/g, '<br>');
}

function createMarkdownTable(headers, rows) {
  const normalizedRows = [headers, ...rows].map(row => row.map(mdCell));
  const widths = headers.map((_, columnIndex) =>
    Math.max(...normalizedRows.map(row => row[columnIndex].length), 3)
  );
  const formatRow = row =>
    `| ${row.map((cell, columnIndex) => cell.padEnd(widths[columnIndex])).join(' | ')} |`;

  return [
    formatRow(normalizedRows[0]),
    formatRow(widths.map(width => '-'.repeat(width))),
    ...normalizedRows.slice(1).map(formatRow),
  ];
}

function createToolchainVersionPolicyMarkdown(policy) {
  const lines = [
    '# Toolchain Version Policy',
    '',
    '<!-- Tool-owned report target. Regenerate with: npm run toolchain:version-policy:report -->',
    '',
    'Most core toolchain manifests use bounded compatibility ranges, while `package-lock.json` still records one exact resolved version for reproducible installs. TypeScript, `oxlint-tsgolint`, and `oxc-parser` remain deliberately exact because the offline repair vendor and declaration snapshots are version-coupled. This permits reviewed patch/minor refreshes where safe without weakening major-version or compatibility boundaries. `@types/node` remains on the lowest supported Node runtime major so typechecking cannot silently adopt Node 24-only APIs while the Node 22 compatibility lane exists.',
    '',
    '## Bounded toolchain ranges',
    '',
    ...createMarkdownTable(
      [
        'Package',
        'Approved manifest range',
        'package.json',
        'package-lock root',
        'resolved lock package',
        'Allowed resolved window',
        'Role',
        'Update policy',
      ],
      policy.rows.map(row => [
        `\`${row.name}\``,
        `\`${row.approvedRange}\``,
        `\`${row.packageJsonRange}\``,
        `\`${row.lockRootRange}\``,
        `\`${row.resolvedVersion}\``,
        `\`${row.allowedResolvedSpec}\``,
        row.role,
        row.updatePolicy,
      ])
    ),
  ];

  lines.push(
    '',
    '## Removed packages that must stay absent',
    '',
    ...policy.forbiddenPackageLabels.map(label => `- ${label}`),
    '',
    '## Dependency refresh workflow',
    '',
    '- `npm update` may advance direct and transitive packages only inside the declared manifest ranges.',
    '- The repository `deps:update:safe` and `deps:update:recommended` scripts regenerate this report after a successful lockfile refresh.',
    '- The exact resolved versions remain committed in `package-lock.json`; CI uses `npm ci` and therefore remains reproducible.',
    '- A dependency refresh must run the toolchain policy, lint, typecheck, build, and relevant runtime/contract tests.',
    '- Major releases and versions outside the documented windows still require an explicit compatibility review.',
    '- `oxlint-tsgolint` must encode the resolved TypeScript major, minor, and patch plus its three-digit tsgolint revision.',
    '- `oxc-parser` may advance only when the lockfile and signed offline AST vendor archives are refreshed and verified together.',
    '',
    '## Current status',
    '',
    policy.violations.length
      ? 'Not ready:'
      : 'Ready: all toolchain manifest ranges are approved, resolved lock versions are inside their compatibility windows, `@types/node` matches the lowest supported Node major, `oxlint-tsgolint` is aligned with TypeScript, and removed TS ESLint packages are absent.',
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
  APPROVED_DEV_DEP_RANGES,
  collectToolchainVersionPolicy,
  createToolchainVersionPolicyMarkdown,
  createFormattedToolchainVersionPolicyMarkdown,
  isTsgolintVersionAlignedWithTypeScript,
  isVersionWithinBounds,
};
