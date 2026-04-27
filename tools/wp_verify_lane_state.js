import { listVerifyLaneNames, normalizeVerifyLaneName } from './wp_verify_lane_catalog.js';

export function parseVerifyLaneArgs(argv) {
  const args = Array.isArray(argv) ? argv.slice() : [];
  const flags = new Set();
  const laneNames = [];
  for (const arg of args) {
    if (typeof arg !== 'string') continue;
    if (arg.startsWith('--')) {
      flags.add(arg);
      continue;
    }
    const normalized = normalizeVerifyLaneName(arg);
    if (normalized) laneNames.push(normalized);
  }
  return {
    laneName: laneNames[0] || '',
    laneNames,
    list: flags.has('--list'),
    print: flags.has('--print'),
    dryRun: flags.has('--dry-run'),
    noDedupe: flags.has('--no-dedupe'),
  };
}

export function createVerifyLaneHelpText() {
  return [
    'Usage: node tools/wp_verify_lane.js <lane-name> [more-lanes...] [--print] [--dry-run] [--no-dedupe]',
    '',
    'Options:',
    '  --list       Print available lane names and exit.',
    '  --print      Print the resolved script order before running.',
    '  --dry-run    Print the resolved script order without running it.',
    '  --no-dedupe  Keep duplicate scripts when multiple lanes overlap.',
    '',
    'Available lanes:',
    ...listVerifyLaneNames().map(name => `  - ${name}`),
  ].join('\n');
}
