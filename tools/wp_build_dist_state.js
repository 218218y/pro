import path from 'node:path';

export function createBuildDistHelpText() {
  return `
WardrobePro dist builder

Options:
  --no-clean          Do not delete previous dist outputs
  --no-assets         Skip copying static assets (faster; for tests/verify)
  --tsconfig <path>   Path to tsconfig used for emit (default: tsconfig.dist.json)
  -h, --help          Show help
`.trim();
}

export function parseBuildDistArgs(argv = []) {
  const args = Array.isArray(argv) ? argv : [];
  const out = {
    clean: true,
    assets: true,
    tsconfig: 'tsconfig.dist.json',
    help: false,
    unknownOptions: [],
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];

    if (a === '--no-clean') {
      out.clean = false;
      continue;
    }
    if (a === '--clean') {
      out.clean = true;
      continue;
    }

    if (a === '--no-assets') {
      out.assets = false;
      continue;
    }
    if (a === '--assets') {
      out.assets = true;
      continue;
    }

    if (a === '--tsconfig' && args[i + 1]) {
      out.tsconfig = args[++i];
      continue;
    }

    if (a === '-h' || a === '--help') {
      out.help = true;
      continue;
    }

    if (typeof a === 'string' && a.startsWith('-')) {
      out.unknownOptions.push(a);
    }
  }

  return out;
}

export function resolveBuildDistPaths({ root, tsconfig }) {
  const tsconfigAbs = path.isAbsolute(tsconfig) ? tsconfig : path.join(root, tsconfig);
  const distAbs = path.join(root, 'dist');
  const distEsmAbs = path.join(distAbs, 'esm');
  const distTypesAbs = path.join(distAbs, 'types');
  const tsBuildInfoAbs = path.join(distAbs, '.tsconfig.dist.tsbuildinfo');
  const entryAbs = path.join(distEsmAbs, 'main.js');
  return {
    root,
    tsconfigAbs,
    distAbs,
    distEsmAbs,
    distTypesAbs,
    tsBuildInfoAbs,
    entryAbs,
  };
}

export function createBuildDistSuccessMessage({ assets = true } = {}) {
  return assets
    ? '[WP BuildDist] Done: dist/esm + dist/types + static assets'
    : '[WP BuildDist] Done: dist/esm + dist/types';
}
