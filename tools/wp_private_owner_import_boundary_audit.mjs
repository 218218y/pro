#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { JUSTIFIED_ONE_LINE_FACADES, PRIVATE_OWNER_IMPORT_FAMILIES } from './wp_contract_registry.mjs';

export { PRIVATE_OWNER_IMPORT_FAMILIES } from './wp_contract_registry.mjs';

const root = process.cwd();
const REVIEWED_ONE_LINE_FACADE_INVENTORY = 'tools/wp_identity_facade_inventory.json';
const SOURCE_FILE_RE = /\.(?:js|mjs|ts|tsx|mts)$/u;
const IMPORT_FROM_RE = /\bimport\b[^;]*?\bfrom\b\s*['"]([^'"]+)['"]/gu;
const IMPORT_SIDE_EFFECT_RE = /\bimport\b\s*['"]([^'"]+)['"]/gu;
const EXPORT_FROM_RE = /\bexport\b[^;]*?\bfrom\b\s*['"]([^'"]+)['"]/gu;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu;
const IDENTITY_REEXPORT_RE = /^export\s+(?:type\s+)?(?:\*|\{[\s\S]*\})\s+from\s+['"][^'"]+['"]\s*;?$/u;

const normalizeRel = file => file.replace(/\\/gu, '/');
const rel = (projectRoot, file) => normalizeRel(path.relative(projectRoot, file));

function walk(dir, out = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'vendor') continue;
      walk(abs, out);
    } else if (entry.isFile() && SOURCE_FILE_RE.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

function existingFile(projectRoot, candidate) {
  try {
    const abs = path.join(projectRoot, candidate);
    return fs.existsSync(abs) && fs.statSync(abs).isFile();
  } catch {
    return false;
  }
}

function resolveRelativeImport(projectRoot, importerRel, specifier) {
  if (!specifier || !specifier.startsWith('.')) return null;
  const importerAbs = path.join(projectRoot, importerRel);
  const rawAbs = path.resolve(path.dirname(importerAbs), specifier);
  const rawRel = rel(projectRoot, rawAbs);
  const ext = path.extname(rawRel);
  const candidates = [rawRel];
  if (!ext) {
    candidates.push(`${rawRel}.js`, `${rawRel}.mjs`, `${rawRel}.ts`, `${rawRel}.tsx`, `${rawRel}.mts`);
  } else if (ext === '.js' || ext === '.mjs') {
    const base = rawRel.slice(0, -ext.length);
    candidates.push(`${base}.ts`, `${base}.tsx`, `${base}.mts`);
  } else if (ext === '.ts' || ext === '.tsx' || ext === '.mts') {
    const base = rawRel.slice(0, -ext.length);
    candidates.push(`${base}.js`, `${base}.mjs`);
  }
  for (const candidate of candidates) {
    if (existingFile(projectRoot, candidate)) return normalizeRel(candidate);
  }
  return null;
}

const lineNumberAt = (source, index) => source.slice(0, index).split(/\r?\n/u).length;

export function collectImportSpecifiers(source) {
  const imports = [];
  for (const rx of [IMPORT_FROM_RE, IMPORT_SIDE_EFFECT_RE, EXPORT_FROM_RE, DYNAMIC_IMPORT_RE]) {
    rx.lastIndex = 0;
    for (const match of source.matchAll(rx)) {
      imports.push({ specifier: match[1], index: match.index || 0 });
    }
  }
  return imports;
}

function normalizeFamily(family) {
  return {
    id: String(family.id || family.publicFacade || ''),
    publicFacade: normalizeRel(String(family.publicFacade || '')),
    privateOwners: Array.isArray(family.privateOwners)
      ? family.privateOwners.map(value => normalizeRel(String(value)))
      : [],
    allowedImporters: Array.isArray(family.allowedImporters)
      ? family.allowedImporters.map(value => normalizeRel(String(value)))
      : [],
    behaviorTests: Array.isArray(family.behaviorTests)
      ? family.behaviorTests.map(value => normalizeRel(String(value)))
      : [],
    justification: String(family.justification || '').trim(),
  };
}

function createPrivateOwnerIndex(families) {
  const index = new Map();
  const configErrors = [];
  const ids = new Set();
  const facades = new Set();
  for (const family of families.map(normalizeFamily)) {
    if (!family.id || ids.has(family.id))
      configErrors.push(`family id is missing or duplicated: ${family.id}`);
    if (!family.publicFacade || facades.has(family.publicFacade)) {
      configErrors.push(`${family.id || '<unknown>'}: publicFacade is missing or duplicated`);
    }
    if (!family.privateOwners.length) configErrors.push(`${family.id || '<unknown>'}: missing privateOwners`);
    if (!family.behaviorTests.length) configErrors.push(`${family.id || '<unknown>'}: missing behaviorTests`);
    if (!family.justification) configErrors.push(`${family.id || '<unknown>'}: missing justification`);
    ids.add(family.id);
    facades.add(family.publicFacade);
    for (const owner of family.privateOwners) {
      if (index.has(owner)) {
        configErrors.push(`${owner}: registered by both ${index.get(owner).id} and ${family.id}`);
      } else {
        index.set(owner, family);
      }
    }
  }
  return { index, configErrors };
}

function isAllowedImporter(importerRel, family) {
  return (
    importerRel === family.publicFacade ||
    family.privateOwners.includes(importerRel) ||
    family.allowedImporters.includes(importerRel)
  );
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '')
    .trim();
}

export function collectOneLineFacadeTopology(projectRoot, files, dependencySites) {
  const importersByTarget = new Map();
  const targetsByImporter = new Map();
  for (const site of dependencySites) {
    if (!importersByTarget.has(site.target)) importersByTarget.set(site.target, new Set());
    importersByTarget.get(site.target).add(site.importer);
    if (!targetsByImporter.has(site.importer)) targetsByImporter.set(site.importer, new Set());
    targetsByImporter.get(site.importer).add(site.target);
  }
  const facades = [];
  for (const file of files) {
    const fileRel = rel(projectRoot, file);
    const source = stripComments(fs.readFileSync(file, 'utf8'));
    if (!IDENTITY_REEXPORT_RE.test(source)) continue;
    const importers = [...(importersByTarget.get(fileRel) || [])].sort();
    if (importers.length > 1) continue;
    const targets = [...(targetsByImporter.get(fileRel) || [])].sort();
    facades.push({ file: fileRel, importers, targets });
  }
  return facades.sort((left, right) => left.file.localeCompare(right.file));
}

function readReviewedOneLineFacadeInventory(projectRoot) {
  const file = path.join(projectRoot, REVIEWED_ONE_LINE_FACADE_INVENTORY);
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Number(parsed?.schemaVersion) !== 2 || !Array.isArray(parsed?.entries)) {
    throw new Error(`${REVIEWED_ONE_LINE_FACADE_INVENTORY}: expected schemaVersion=2 and entries[]`);
  }
  const allowedCategories = new Set([
    'api-surface',
    'boot-entry',
    'builder-composition',
    'dimension-policy',
    'domain-composition',
    'feature-composition',
    'internal-composition',
    'platform-composition',
    'runtime-composition',
    'service-composition',
    'ui-composition',
  ]);
  for (const entry of parsed.entries) {
    const file = normalizeRel(String(entry?.path || ''));
    const category = String(entry?.category || '').trim();
    const reason = String(entry?.reason || '').trim();
    if (!file || !allowedCategories.has(category) || reason.length < 24) {
      throw new Error(
        `${REVIEWED_ONE_LINE_FACADE_INVENTORY}: ${file || '<empty>'} requires a reviewed category and substantive reason`
      );
    }
  }
  return parsed.entries;
}

function normalizeReviewedOneLineFacades(entries, configErrors) {
  const reviewed = new Map();
  for (const entry of entries) {
    const file = normalizeRel(String(entry?.path || ''));
    const importer = normalizeRel(String(entry?.importer || ''));
    if (!file || !importer || reviewed.has(file)) {
      configErrors.push(`invalid or duplicate reviewed one-line facade: ${file || '<empty>'}`);
      continue;
    }
    reviewed.set(file, importer);
  }
  return reviewed;
}

export function runPrivateOwnerImportBoundaryAudit(projectRoot = root, options = {}) {
  const families = (options.families || PRIVATE_OWNER_IMPORT_FAMILIES).map(normalizeFamily);
  const sourceRoots = options.sourceRoots || ['esm'];
  const justifiedOneLineFacades = options.justifiedOneLineFacades || JUSTIFIED_ONE_LINE_FACADES;
  const reviewedOneLineFacadeEntries =
    options.reviewedOneLineFacades ?? readReviewedOneLineFacadeInventory(projectRoot);
  const { index: privateOwnerIndex, configErrors } = createPrivateOwnerIndex(families);
  const missingFiles = [];
  for (const family of families) {
    for (const file of [family.publicFacade, ...family.privateOwners, ...family.behaviorTests]) {
      if (!existingFile(projectRoot, file)) missingFiles.push(`${family.id}: missing ${file}`);
    }
  }

  const justified = new Map();
  for (const entry of justifiedOneLineFacades) {
    const file = normalizeRel(String(entry?.path || ''));
    const reason = String(entry?.reason || '').trim();
    if (!file || !reason || justified.has(file)) {
      configErrors.push(`invalid or duplicate one-line facade justification: ${file || '<empty>'}`);
      continue;
    }
    justified.set(file, reason);
  }
  for (const family of families) justified.set(family.publicFacade, family.justification);
  const reviewedOneLineFacades = normalizeReviewedOneLineFacades(reviewedOneLineFacadeEntries, configErrors);

  const files = sourceRoots.flatMap(sourceRoot => walk(path.join(projectRoot, sourceRoot)));
  const dependencySites = [];
  const importSites = [];
  const violations = [];
  for (const file of files) {
    const importerRel = rel(projectRoot, file);
    const source = fs.readFileSync(file, 'utf8');
    const seen = new Set();
    for (const item of collectImportSpecifiers(source)) {
      const targetRel = resolveRelativeImport(projectRoot, importerRel, item.specifier);
      if (!targetRel) continue;
      const dedupeKey = `${importerRel}:${targetRel}:${item.index}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const dependencySite = {
        importer: importerRel,
        target: targetRel,
        line: lineNumberAt(source, item.index),
      };
      dependencySites.push(dependencySite);
      const targetFamily = privateOwnerIndex.get(targetRel);
      if (!targetFamily) continue;
      const site = { family: targetFamily.id, ...dependencySite };
      importSites.push(site);
      if (!isAllowedImporter(importerRel, targetFamily)) {
        violations.push(
          `${site.importer}:${site.line}: imports private owner ${site.target} from ${site.family}; use ${targetFamily.publicFacade}`
        );
      }
    }
  }

  const oneLineFacades = collectOneLineFacadeTopology(projectRoot, files, dependencySites);
  const unregisteredOneLineFacades = oneLineFacades.filter(entry => !justified.has(entry.file));
  const actualReviewedTopology = new Map(
    unregisteredOneLineFacades.map(entry => [entry.file, entry.importers[0] || ''])
  );
  const unreviewedOneLineFacades = unregisteredOneLineFacades.filter(
    entry => !reviewedOneLineFacades.has(entry.file)
  );
  const staleReviewedOneLineFacades = [...reviewedOneLineFacades]
    .filter(([file]) => !actualReviewedTopology.has(file))
    .map(([file, importer]) => ({ file, importer }));
  const reviewedOneLineFacadeImporterDrift = [...reviewedOneLineFacades]
    .filter(
      ([file, importer]) => actualReviewedTopology.has(file) && actualReviewedTopology.get(file) !== importer
    )
    .map(([file, importer]) => ({
      file,
      expectedImporter: importer,
      actualImporter: actualReviewedTopology.get(file) || '',
    }));
  const reviewedSingleTargetFacades = unregisteredOneLineFacades
    .filter(entry => reviewedOneLineFacades.has(entry.file) && entry.targets.length < 2)
    .map(entry => ({ file: entry.file, targets: entry.targets }));
  const reviewedOneLineFacadeMismatches = [
    ...unreviewedOneLineFacades.map(
      entry => `unreviewed identity-only facade: ${entry.file} (importer: ${entry.importers[0] || '<none>'})`
    ),
    ...staleReviewedOneLineFacades.map(
      entry => `stale reviewed identity-only facade: ${entry.file} (expected importer: ${entry.importer})`
    ),
    ...reviewedOneLineFacadeImporterDrift.map(
      entry =>
        `identity-only facade importer changed: ${entry.file} expected ${entry.expectedImporter}, current ${entry.actualImporter || '<none>'}`
    ),
    ...reviewedSingleTargetFacades.map(
      entry =>
        `reviewed identity facade must compose at least two focused targets: ${entry.file} (targets: ${entry.targets.join(', ') || '<none>'})`
    ),
  ];

  return {
    ok:
      configErrors.length === 0 &&
      missingFiles.length === 0 &&
      violations.length === 0 &&
      reviewedOneLineFacadeMismatches.length === 0,
    families,
    scannedFiles: files.length,
    privateOwners: privateOwnerIndex.size,
    importSites,
    oneLineFacades,
    reviewedOneLineFacades: unregisteredOneLineFacades,
    unreviewedOneLineFacades,
    staleReviewedOneLineFacades,
    reviewedOneLineFacadeImporterDrift,
    reviewedSingleTargetFacades,
    configErrors,
    missingFiles,
    violations,
    reviewedOneLineFacadeMismatches,
  };
}

function main() {
  const result = runPrivateOwnerImportBoundaryAudit(root);
  if (!result.ok) {
    console.error('[private-owner-imports] FAILED');
    for (const key of ['configErrors', 'missingFiles', 'violations', 'reviewedOneLineFacadeMismatches']) {
      for (const error of result[key]) console.error(`- ${error}`);
    }
    process.exit(1);
  }
  console.log(
    `[private-owner-imports] ok (${result.families.length} families, ${result.privateOwners} private owners, ${result.importSites.length} guarded import sites, ${result.oneLineFacades.length} identity facades, ${result.reviewedOneLineFacades.length} explicitly inventoried)`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
