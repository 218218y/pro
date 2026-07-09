#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
      'Oxlint reports redeclarations, but globals/profile parity remains under review.',
    ],
  ],
  [
    'eqeqeq',
    [
      'needs custom contract',
      'Current ESLint uses `smart`; Oxlint option parity must be confirmed before blocking.',
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
      'false positive',
      'Oxlint currently reports underscore catch variables that legacy ESLint intentionally ignores.',
    ],
  ],
  [
    '@typescript-eslint/no-unused-vars',
    [
      'false positive',
      'Candidate for Oxlint, but underscore and rest-sibling ignores need config parity first.',
    ],
  ],
  [
    'no-restricted-globals',
    [
      'needs custom contract',
      'Browser-global DI policy is architecture-specific and should not depend on TS parser selectors.',
    ],
  ],
  [
    'no-restricted-imports',
    [
      'needs custom contract',
      'Layer/import boundaries already overlap with custom contracts and should be fully owned there.',
    ],
  ],
  [
    'no-restricted-syntax',
    [
      'needs custom contract',
      'Legacy App.* bag ban is project-specific; move to a dedicated AST/custom contract before parser removal.',
    ],
  ],
]);

const GATES = [
  {
    gate: 'lint legacy',
    command: 'npm run lint:legacy',
    blocker: 'yes',
    role: 'Current canonical ESLint migrate profile, including `@typescript-eslint/parser` for TS/TSX.',
    status: 'kept as source of truth in Stage 5',
  },
  {
    gate: 'oxlint syntax',
    command: 'npm run lint:ts-modern:syntax',
    blocker: 'no',
    role: 'Fast modern parser/config/file-discovery lane for `esm` and `types`.',
    status: 'audit-only; diagnostics do not block yet',
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
    status: 'matrix/parity docs are checked; architecture contracts remain separate scripts',
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
  const lines = [
    '# Lint Parity Report',
    '',
    '<!-- Tool-owned report target. Regenerate with: npm run lint:parity-report -->',
    '',
    'Stage 5 keeps the legacy ESLint gate intact and introduces modern linting as audit-only. The report explains what is already covered, what is duplicated, and what still needs a durable owner before TS/TSX can be removed from `@typescript-eslint/parser`.',
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
    '## Stage 5 decision',
    '',
    '- Do not remove `@typescript-eslint` yet.',
    '- Do not update to TypeScript 7 yet.',
    '- Do not swap `wp_ast_adapter` away from TypeScript yet.',
    '- Keep `lint:legacy` as the blocking lint gate while `lint:ts-modern:*` runs in audit mode.',
    '- Before a later parser-removal stage, every `needs custom contract`, `false positive`, `blocked by tool support`, or `manual-review` row must be resolved or intentionally accepted.',
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
