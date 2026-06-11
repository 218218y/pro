import {
  DEFAULT_PERF_SMOKE_BASELINE_RELATIVE_PATH,
  DEFAULT_PERF_SMOKE_JSON_OUT_RELATIVE_PATH,
  DEFAULT_PERF_SMOKE_MD_OUT_RELATIVE_PATH,
  DEFAULT_PERF_SMOKE_DOC_RELATIVE_PATH,
  DEFAULT_PERF_SMOKE_LANES,
  resolvePerfSmokePath,
} from './wp_perf_smoke_shared.js';

function readValue(args, index, flag) {
  const value = typeof args[index + 1] === 'string' ? args[index + 1].trim() : '';
  if (!value) throw new Error(`[WP Perf Smoke] ${flag} requires a value.`);
  return value;
}

export function parsePerfSmokeArgs(argv = []) {
  const args = Array.isArray(argv) ? argv : [];
  const out = {
    laneNames: [],
    scriptNames: [],
    baselinePath: '',
    jsonOutPath: '',
    mdOutPath: '',
    docOutPath: '',
    updateBaseline: false,
    enforce: false,
    print: false,
    dryRun: false,
    noDedupe: false,
    allowMissingBaseline: false,
    listDefaults: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = typeof args[i] === 'string' ? args[i].trim() : '';
    if (!arg) continue;
    if (arg === '--lane') {
      out.laneNames.push(readValue(args, i, '--lane'));
      i += 1;
      continue;
    }
    if (arg.startsWith('--lane=')) {
      out.laneNames.push(arg.slice('--lane='.length).trim());
      continue;
    }
    if (arg === '--script') {
      out.scriptNames.push(readValue(args, i, '--script'));
      i += 1;
      continue;
    }
    if (arg.startsWith('--script=')) {
      out.scriptNames.push(arg.slice('--script='.length).trim());
      continue;
    }
    if (arg === '--baseline') {
      out.baselinePath = readValue(args, i, '--baseline');
      i += 1;
      continue;
    }
    if (arg.startsWith('--baseline=')) {
      out.baselinePath = arg.slice('--baseline='.length).trim();
      continue;
    }
    if (arg === '--json-out') {
      out.jsonOutPath = readValue(args, i, '--json-out');
      i += 1;
      continue;
    }
    if (arg.startsWith('--json-out=')) {
      out.jsonOutPath = arg.slice('--json-out='.length).trim();
      continue;
    }
    if (arg === '--md-out') {
      out.mdOutPath = readValue(args, i, '--md-out');
      i += 1;
      continue;
    }
    if (arg.startsWith('--md-out=')) {
      out.mdOutPath = arg.slice('--md-out='.length).trim();
      continue;
    }
    if (arg === '--doc-out') {
      out.docOutPath = readValue(args, i, '--doc-out');
      i += 1;
      continue;
    }
    if (arg.startsWith('--doc-out=')) {
      out.docOutPath = arg.slice('--doc-out='.length).trim();
      continue;
    }
    if (arg === '--update-baseline') {
      out.updateBaseline = true;
      continue;
    }
    if (arg === '--enforce') {
      out.enforce = true;
      continue;
    }
    if (arg === '--print') {
      out.print = true;
      continue;
    }
    if (arg === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (arg === '--no-dedupe') {
      out.noDedupe = true;
      continue;
    }
    if (arg === '--allow-missing-baseline') {
      out.allowMissingBaseline = true;
      continue;
    }
    if (arg === '--list-defaults') {
      out.listDefaults = true;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`[WP Perf Smoke] Unknown flag: ${arg}`);
    }
    out.laneNames.push(arg);
  }

  return out;
}

export function resolvePerfSmokePaths(args, projectRoot) {
  return {
    baselinePath: resolvePerfSmokePath(
      projectRoot,
      args.baselinePath,
      DEFAULT_PERF_SMOKE_BASELINE_RELATIVE_PATH
    ),
    jsonOutPath: resolvePerfSmokePath(
      projectRoot,
      args.jsonOutPath,
      DEFAULT_PERF_SMOKE_JSON_OUT_RELATIVE_PATH
    ),
    mdOutPath: resolvePerfSmokePath(projectRoot, args.mdOutPath, DEFAULT_PERF_SMOKE_MD_OUT_RELATIVE_PATH),
    docOutPath: args.docOutPath
      ? resolvePerfSmokePath(projectRoot, args.docOutPath, '')
      : resolvePerfSmokePath(projectRoot, '', DEFAULT_PERF_SMOKE_DOC_RELATIVE_PATH),
  };
}

export function createPerfSmokeHelpText() {
  const defaults = DEFAULT_PERF_SMOKE_LANES.map(name => `  - ${name}`).join('\n');
  return [
    'Usage: node tools/wp_perf_smoke.mjs [lane-name ...] [options]',
    '',
    'Options:',
    '  --lane <name>              Add a verify lane to the perf smoke profile',
    '  --script <name>            Add a direct npm script to the perf smoke profile',
    '  --baseline <path>          Baseline JSON path',
    '  --json-out <path>          Summary JSON output path',
    '  --md-out <path>            Summary Markdown output path',
    '  --doc-out <path>           Markdown doc output path',
    '  --update-baseline          Replace the stored baseline with the current run',
    '  --enforce                  Fail when current timings exceed the stored baseline budget',
    '  --allow-missing-baseline   Do not fail when --enforce is used but no baseline exists',
    '  --print                    Print the resolved script profile before running',
    '  --dry-run                  Print the resolved script profile and exit',
    '  --no-dedupe                Keep duplicate scripts when combining lanes/scripts',
    '  --list-defaults            Print the default perf smoke verify lanes',
    '',
    'Default verify lanes:',
    defaults,
  ].join('\n');
}
