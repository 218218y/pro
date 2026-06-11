import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

export function posixRel(root, p) {
  return path.relative(root, p).split(path.sep).join('/');
}

export function parseArgs(argv) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const out = {
    root: repoRoot,
    requireDist: false,
    requireRelease: false,
    sourceOnly: false,
    artifactsOnly: false,
    json: false,
    quiet: false,
    manifestOut: null,
    scanPaths: ['esm'],
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--root' || a === '-C') && argv[i + 1]) {
      out.root = path.resolve(argv[++i]);
      continue;
    }
    if (a === '--require-dist') out.requireDist = true;
    if (a === '--require-release') out.requireRelease = true;
    if (a === '--strict-build') {
      out.requireDist = true;
      out.requireRelease = true;
    }
    if (a === '--source-only') out.sourceOnly = true;
    if (a === '--artifacts-only') out.artifactsOnly = true;
    if (a === '--json') out.json = true;
    if (a === '--quiet') out.quiet = true;
    if (a === '--manifest-out' && argv[i + 1]) out.manifestOut = argv[++i];
    if (a === '--scan' && argv[i + 1]) out.scanPaths.push(argv[++i]);
    if (a === '--help' || a === '-h') {
      console.log(
        `
WardrobePro - release parity checks

Usage:
  node tools/wp_release_parity.js
  node tools/wp_release_parity.js --strict-build
  node tools/wp_release_parity.js --source-only --manifest-out dist/release_parity.json

Checks:
  - Three vendor contract: only symbols actually used by app code must exist in tools/three_vendor_entry.js
  - dist artifact integrity: local refs in dist/index.html + JS import literals point to existing files
  - release artifact integrity: local refs in dist/release/index.html + JS import literals point to existing files

Options:
  -C, --root <dir>          Project root
  --scan <path>             Additional path to scan for THREE.* usages
  --require-dist            Fail if dist/ is missing
  --require-release         Fail if dist/release/ is missing
  --strict-build            Same as: --require-dist --require-release
  --source-only             Run only source/vendor contract check
  --artifacts-only          Skip source/vendor contract check
  --manifest-out <path>     Write JSON report
  --json                    Print JSON report
`.trim()
      );
      process.exit(0);
    }
  }

  return out;
}

export function normalizeRefText(ref) {
  if (ref == null) return '';
  const s = String(ref).trim();
  if (s.length > 512) return '';
  if (/[\r\n\0]/.test(s)) return '';
  return s;
}

export function isLocalRef(ref) {
  const s = normalizeRefText(ref);
  if (!s) return false;
  if (s.startsWith('#')) return false;
  if (/^(?:[a-z]+:)?\/\//i.test(s)) return false;
  if (/^(?:data|blob|javascript|mailto|tel):/i.test(s)) return false;
  return true;
}

export function isPlausibleJsModuleSpecifier(ref) {
  const s = normalizeRefText(ref);
  if (!s) return false;
  if (/\s/.test(s)) return false;
  if (s.includes(',')) return false;
  if (s.includes(';')) return false;
  return true;
}

export function isLocalJsRef(ref) {
  const s = normalizeRefText(ref);
  if (!s) return false;
  if (!isPlausibleJsModuleSpecifier(s)) return false;
  if (!isLocalRef(s)) return false;

  if (s.startsWith('./') || s.startsWith('../') || s.startsWith('/')) return true;
  if (/^(?:libs|dist|esm|css|public)\//i.test(s)) return true;
  return false;
}

export function resolveRefFile(baseDir, ref, options = {}) {
  const { jsLike = false, siteRootDir = null } = options;
  let clean = normalizeRefText(ref);
  clean = clean.replace(/[?#].*$/, '');
  if (!clean) return null;
  if (clean.startsWith('/')) clean = clean.slice(1);

  const candidates = [path.resolve(baseDir, clean)];
  if (siteRootDir && /^(?:libs|dist|esm|css|public)\//i.test(clean)) {
    candidates.push(path.resolve(siteRootDir, clean));
  }

  for (const exact of candidates) {
    if (exists(exact)) return exact;
  }

  if (jsLike && !path.extname(clean)) {
    const fallbacks = ['.js', '.mjs', '.cjs', '.json', '/index.js', '/index.mjs', '/index.cjs'];
    for (const base of candidates) {
      for (const suffix of fallbacks) {
        const alt = `${base}${suffix}`;
        if (exists(alt)) return alt;
      }
    }
  }

  return candidates[0];
}

export function formatRefForConsole(ref) {
  const s = normalizeRefText(ref) || String(ref || '');
  const max = 180;
  if (s.length <= max) return s;
  return `${s.slice(0, max)}… [len=${s.length}]`;
}
