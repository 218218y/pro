import { parseVerifyArgs } from './wp_verify_state.js';

const DEFAULT_PARALLEL_JOBS = 5;
const DEFAULT_TEST_JOBS = 6;
const DEFAULT_TEST_SHARDS = 2;

function readFlagValue(argv, name) {
  const inlinePrefix = `${name}=`;
  const inline = argv.find(arg => String(arg).startsWith(inlinePrefix));
  if (inline) return inline.slice(inlinePrefix.length);
  const index = argv.findIndex(arg => arg === name);
  if (index < 0) return '';
  return String(argv[index + 1] || '');
}

function parsePositiveIntFlag(argv, name, fallback) {
  const raw = readFlagValue(argv, name).trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function parseVerifyParallelArgs(argv = []) {
  const args = Array.isArray(argv) ? argv.slice() : [];
  const base = parseVerifyArgs(args);
  return {
    ...base,
    help: args.includes('--help') || args.includes('-h'),
    print: args.includes('--print'),
    dryRun: args.includes('--dry-run'),
    parallelJobs: parsePositiveIntFlag(args, '--jobs', DEFAULT_PARALLEL_JOBS),
    testJobs: parsePositiveIntFlag(args, '--test-jobs', DEFAULT_TEST_JOBS),
    testShards: parsePositiveIntFlag(args, '--test-shards', DEFAULT_TEST_SHARDS),
  };
}

export function createVerifyParallelHelpText() {
  return [
    'Usage: node tools/wp_verify_parallel.js [--gate] [--ci|--no-bundle] [--jobs N] [--test-jobs N] [--test-shards N]',
    '',
    'Runs the local verify suite through CI-like parallel lanes:',
    '  policy/lint/refactor guardrails, TypeScript, contracts, and runtime test shards.',
    '',
    'Options:',
    '  --gate, --strict      Use strict gate policy and fail on formatting differences.',
    '  --ci, --no-bundle    Skip release bundle steps after the parallel lanes.',
    '  --no-build           Reuse an existing dist/esm/main.js instead of rebuilding dist first.',
    '  --jobs N             Maximum lanes to run at once (default: 4).',
    '  --test-jobs N        Per-shard wp_test.js worker count (default: 2).',
    '  --test-shards N      Number of runtime test shards (default: 2).',
    '  --print              Print the resolved plan before running.',
    '  --dry-run            Print the resolved plan without running it.',
  ].join('\n');
}
