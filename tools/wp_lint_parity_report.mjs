#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLintArchitectureBaselineCount } from './wp_lint_architecture_contracts.mjs';
import { collectLintParserRemovalReadinessRows } from './wp_lint_parser_removal_readiness.mjs';
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
      'Oxlint reports redeclarations; legacy ESLint stays as a temporary compatibility gate until the parser-removal dry-run.',
    ],
  ],
  [
    'eqeqeq',
    [
      'covered by modern gate',
      'Oxlint syntax is configured with the same smart equality policy used by legacy ESLint.',
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
      'Oxlint syntax is configured to match legacy underscore ignore behavior for variables and catch bindings.',
    ],
  ],
  [
    '@typescript-eslint/no-unused-vars',
    [
      'covered by modern gate',
      'Oxlint syntax now covers the TS unused-vars migration lane with legacy underscore ignore parity.',
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
    gate: 'lint legacy',
    command: 'npm run lint:legacy',
    blocker: 'yes',
    role: 'Current compatibility ESLint migrate profile, including `@typescript-eslint/parser` for TS/TSX.',
    status: 'temporary compatibility gate only; not the final Stage 5 target split',
  },
  {
    gate: 'lint JS/parser-removal dry-run',
    command: 'npm run lint:parser-removal-dry-run',
    blocker: 'yes',
    role: 'ESLint profile that excludes TS/TSX and keeps JS/tools/tests/config coverage, including `no-undef`.',
    status: 'blocking dry-run; proves TS/TSX can leave `@typescript-eslint/parser` while JS remains linted',
  },
  {
    gate: 'oxlint syntax',
    command: 'npm run lint:ts-modern:syntax',
    blocker: 'yes',
    role: 'Fast modern parser/config/file-discovery lane for `esm` and `types`.',
    status: 'blocking; current syntax diagnostics are 0',
  },
  {
    gate: 'oxlint type-aware',
    command: 'npm run lint:ts-modern:type-aware',
    blocker: 'no',
    role: 'Future TypeScript semantic lint lane through `oxlint-tsgolint`.',
    status: 'audit-only; TS7/tsgolint path is not a blocker yet',
  },
  {
    gate: 'typecheck',
    command: 'npm run typecheck:runtime && npm run typecheck:dist',
    blocker: 'yes',
    role: 'TypeScript compiler contracts and TS/JS check lanes.',
    status: 'already canonical for type correctness',
  },
  {
    gate: 'custom contracts',
    command: 'npm run lint:contracts',
    blocker: 'yes',
    role: 'Project-owned quality rules that should survive parser/linter swaps.',
    status: 'matrix/parity docs, parser-removal readiness, and lint architecture contracts are blocking',
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
      'No automatic parity classification yet; keep legacy ESLint coverage.',
    ];
    return {
      rule: row.rule,
      legacy: 'covered',
      oxlintSyntax: row.futureTarget === 'replace-by-oxlint' ? 'candidate' : 'not owner',
      oxlintTypeAware: row.typeAware ? 'candidate' : 'not required today',
      typecheck:
        row.rule === 'no-undef' || row.rule.startsWith('@typescript-eslint/') ? 'partial' : 'not owner',
      customContracts: row.futureTarget === 'replace-by-custom-contract' ? 'candidate owner' : 'not owner',
      classification,
      rationale,
    };
  });
}

export async function createRawLintParityMarkdown() {
  const rows = await collectLintParityRows();
  const readinessRows = await collectLintParserRemovalReadinessRows();
  const lines = [
    '# Lint Parity Report',
    '',
    '<!-- Tool-owned report target. Regenerate with: npm run lint:parity-report -->',
    '',
    'Stage 5 keeps the legacy ESLint compatibility gate intact while promoting the JS-only ESLint dry-run, Oxlint syntax, and custom lint contracts to blocking parser-removal readiness gates. The report explains what is covered, which command owns each rule, and why TS/TSX is not removed from `@typescript-eslint/parser` until the next dry-run.',
    '',
    '## Gate comparison',
    '',
    '| Gate | Command | Blocking? | Role | Stage 5 status |',
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
    '| Rule | Legacy lint | Oxlint syntax | Oxlint type-aware | Typecheck | Custom contracts | Classification | Rationale |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |'
  );

  for (const row of rows) {
    lines.push(
      `| \`${mdCell(row.rule)}\` | ${mdCell(row.legacy)} | ${mdCell(row.oxlintSyntax)} | ${mdCell(row.oxlintTypeAware)} | ${mdCell(row.typecheck)} | ${mdCell(row.customContracts)} | ${mdCell(row.classification)} | ${mdCell(row.rationale)} |`
    );
  }

  lines.push(
    '',
    '## Parser removal readiness',
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
      : `The custom lint architecture contract currently has ${architectureBaselineCount} baselined exception(s); parser-removal readiness must stay false until this returns to 0.`;

  lines.push(
    '',
    '## Architecture contract baseline',
    '',
    architectureBaselineSentence,
    '',
    '## Stage 5 decision',
    '',
    '- Do not remove `@typescript-eslint` yet.',
    '- Do not update to TypeScript 7 yet.',
    '- Do not swap `wp_ast_adapter` away from TypeScript yet.',
    '- Keep `lint:legacy` as a temporary blocking compatibility gate; the final split is `lint:js` / `lint:parser-removal-dry-run`, `lint:ts-modern:syntax`, `lint:contracts`, and `typecheck:*`.',
    '- `quality:ts-modern` is the dry-run gate bundle for that final split; it intentionally excludes `lint:legacy`.',
    '- `lint:ts-modern:type-aware` remains audit-only with known diagnostics; it is not a Stage 5 blocker.',
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
