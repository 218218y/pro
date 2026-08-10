#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLintArchitectureBaselineCount } from './wp_lint_architecture_contracts.mjs';
import { collectLintModernReadinessRows } from './wp_lint_modern_readiness.mjs';
import { collectLintRuleMatrix, formatMarkdownForDocs } from './wp_lint_rule_matrix.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DOC_RELATIVE_PATH = 'docs/LINT_PARITY_REPORT.md';

const COVERAGE_BY_RULE = new Map([
  [
    'no-dupe-keys',
    ['covered by modern gate', 'Oxlint correctness and `wp_check_syntax` both cover duplicate object keys.'],
  ],
  [
    'no-unreachable',
    [
      'covered by modern gate',
      'Oxlint correctness and TypeScript syntax/typecheck catch unreachable syntax classes.',
    ],
  ],
  [
    'no-const-assign',
    ['covered by modern gate', 'Oxlint correctness and JavaScript semantics cover const reassignment.'],
  ],
  [
    'no-redeclare',
    [
      'covered by modern gate',
      'Oxlint reports redeclarations in the canonical modern syntax gate; ESLint stays focused on JS/tools/config.',
    ],
  ],
  [
    'eqeqeq',
    [
      'covered by modern gate',
      'Oxlint syntax is configured with the same smart equality policy used by the JS ESLint gate.',
    ],
  ],
  [
    'no-undef',
    [
      'blocked by tool support',
      'TS/TSX should rely on TypeScript; JS/tools still need ESLint globals policy.',
    ],
  ],
  [
    'no-unused-vars',
    [
      'covered by modern gate',
      'Oxlint syntax is configured to match underscore ignore behavior for variables and catch bindings.',
    ],
  ],
  [
    'no-restricted-globals',
    [
      'covered by modern gate',
      'Mirrored by `wp_lint_architecture_contracts`; architecture baseline is 0, so every new violation fails.',
    ],
  ],
  [
    'no-restricted-imports',
    [
      'covered by modern gate',
      'Mirrored by `wp_lint_architecture_contracts` and existing layer contracts; architecture baseline is 0.',
    ],
  ],
  [
    'no-restricted-syntax',
    [
      'covered by modern gate',
      'Mirrored by `wp_lint_architecture_contracts` through the AST adapter, without depending on ESLint selectors.',
    ],
  ],
]);

const GATES = [
  {
    gate: 'lint modern',
    command: 'npm run lint:modern',
    blocker: 'yes',
    role: 'Canonical lint gate combining strict JS ESLint, Oxlint syntax, and custom contracts.',
    status: 'blocking primary gate',
  },
  {
    gate: 'lint JS-only',
    command: 'npm run lint:js:strict',
    blocker: 'yes',
    role: 'ESLint coverage for JS/tools/tests/config, including `no-undef`.',
    status: 'strict blocking JS gate with 0 warnings; TS/TSX stays outside ESLint',
  },
  {
    gate: 'oxlint syntax',
    command: 'npm run lint:ts-modern:syntax',
    blocker: 'yes',
    role: 'Fast modern parser/config/file-discovery lane for `esm` and `types` TS/TSX.',
    status: 'blocking; current syntax diagnostics are 0',
  },
  {
    gate: 'oxlint type-aware',
    command: 'npm run lint:ts-modern:type-aware',
    blocker: 'yes',
    role: 'Semantic lint lane through `oxlint-tsgolint`.',
    status: 'blocking; current type-aware diagnostics are 0',
  },
  {
    gate: 'typecheck',
    command: 'npm run typecheck',
    blocker: 'yes',
    role: 'Whole-project strict TypeScript compiler gate.',
    status: 'canonical for type correctness on TypeScript 7.0.2',
  },
  {
    gate: 'custom contracts',
    command: 'npm run lint:contracts',
    blocker: 'yes',
    role: 'Project-owned quality rules that survive parser/linter swaps.',
    status: 'matrix/parity docs, modern readiness, and lint architecture contracts are blocking',
  },
];

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
        'Usage: node tools/wp_lint_parity_report.mjs [--json] [--out docs/LINT_PARITY_REPORT.md] [--check docs/LINT_PARITY_REPORT.md]'
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function mdCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n+/g, '<br>');
}

export async function collectLintParityRows() {
  const matrixRows = await collectLintRuleMatrix();
  return matrixRows.map(row => {
    const [classification, rationale] = COVERAGE_BY_RULE.get(row.rule) || [
      'manual-review',
      'No automatic parity classification yet; keep the rule out of TS/TSX ESLint ownership until an owner is declared.',
    ];
    return {
      rule: row.rule,
      eslintJs:
        row.appliesTo.includes('JS') || row.appliesTo.includes('tools') || row.appliesTo.includes('tests')
          ? 'active'
          : 'not owner',
      oxlintSyntax: row.futureTarget === 'replace-by-oxlint' ? 'candidate' : 'not owner',
      oxlintTypeAware: row.typeAware ? 'candidate' : 'not required today',
      typecheck: row.rule === 'no-undef' ? 'partial' : 'not owner',
      customContracts: row.futureTarget === 'replace-by-custom-contract' ? 'candidate owner' : 'not owner',
      classification,
      rationale,
    };
  });
}

export async function createRawLintParityMarkdown() {
  const rows = await collectLintParityRows();
  const readinessRows = await collectLintModernReadinessRows();
  const lines = [
    '# Lint Parity Report',
    '',
    '<!-- Tool-owned report target. Regenerate with: npm run lint:parity-report -->',
    '',
    'Stage 9 finalizes the TypeScript 7 quality path: TypeScript 7.0.2 is active, TS-specific ESLint parser/plugin packages are removed, JS/tools/tests/config stay on strict ESLint, TS/TSX syntax stays on Oxlint, architecture rules stay on custom contracts, type correctness stays on TypeScript, and `wp_ast_adapter` remains on `oxc-parser`. The modern gate is the canonical lint path.',
    '',
    '## Gate comparison',
    '',
    '| Gate | Command | Blocking? | Role | Stage 9 status |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const gate of GATES) {
    lines.push(
      `| ${mdCell(gate.gate)} | \`${mdCell(gate.command)}\` | ${mdCell(gate.blocker)} | ${mdCell(gate.role)} | ${mdCell(gate.status)} |`
    );
  }

  lines.push(
    '',
    '## Rule parity',
    '',
    '| Rule | ESLint JS gate | Oxlint syntax | Oxlint type-aware | Typecheck | Custom contracts | Classification | Rationale |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |'
  );

  for (const row of rows) {
    lines.push(
      `| \`${mdCell(row.rule)}\` | ${mdCell(row.eslintJs)} | ${mdCell(row.oxlintSyntax)} | ${mdCell(row.oxlintTypeAware)} | ${mdCell(row.typecheck)} | ${mdCell(row.customContracts)} | ${mdCell(row.classification)} | ${mdCell(row.rationale)} |`
    );
  }

  lines.push(
    '',
    '## Modern lint readiness',
    '',
    '| Rule | Future owner | Blocking command | Ready? | Notes |',
    '| --- | --- | --- | --- | --- |'
  );

  for (const row of readinessRows) {
    lines.push(
      `| \`${mdCell(row.rule)}\` | ${mdCell(row.futureOwner)} | \`${mdCell(row.blockingCommand)}\` | ${row.ready ? 'yes' : 'no'} | ${mdCell(row.notes)} |`
    );
  }

  const architectureBaselineCount = getLintArchitectureBaselineCount();
  const architectureBaselineSentence =
    architectureBaselineCount === 0
      ? 'The custom lint architecture contract baseline is 0. Every new architecture violation fails, and stale baseline entries fail as well.'
      : `The custom lint architecture contract currently has ${architectureBaselineCount} baselined exception(s); modern lint readiness must stay false until this returns to 0.`;

  lines.push(
    '',
    '## Architecture contract baseline',
    '',
    architectureBaselineSentence,
    '',
    '## Stage 9 decision',
    '',
    '- TypeScript 7.0.2 is active and remains the compiler version for this lane.',
    '- TS-specific ESLint parser/plugin packages are removed from package metadata and ESLint config.',
    '- `lint:modern` is the canonical lint gate: `lint:js:strict`, `lint:ts-modern:syntax`, `lint:ts-modern:type-aware`, and `lint:contracts`.',
    '- `quality:ts-modern` is the primary TypeScript quality bundle.',
    '- `lint:ts-modern:type-aware` is blocking at 0 diagnostics, with global zero guards for the hardened semantic rules.',
    ''
  );

  return lines.join('\n');
}

export async function createLintParityMarkdown() {
  return formatMarkdownForDocs(await createRawLintParityMarkdown());
}

function resolveRootPath(value) {
  return path.resolve(ROOT, value || DEFAULT_DOC_RELATIVE_PATH);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.json) {
    console.log(JSON.stringify({ gates: GATES, rules: await collectLintParityRows() }, null, 2));
    return;
  }
  const markdown = await createLintParityMarkdown();

  if (args.checkPath) {
    const target = resolveRootPath(args.checkPath);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (current !== markdown) {
      console.error(
        `[Lint Parity] ${path.relative(ROOT, target)} is out of date. Run: npm run lint:parity-report`
      );
      process.exit(1);
    }
    console.log(`[Lint Parity] OK: ${path.relative(ROOT, target)}`);
    return;
  }

  if (args.outPath) {
    const target = resolveRootPath(args.outPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, markdown);
    console.log(`[Lint Parity] Wrote ${path.relative(ROOT, target)}`);
    return;
  }

  console.log(markdown);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
