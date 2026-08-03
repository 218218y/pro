#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  JUSTIFIED_ONE_LINE_FACADES,
  LEGACY_ONE_LINE_FACADE_BASELINE,
  PRIVATE_OWNER_IMPORT_FAMILIES,
} from './wp_contract_registry.mjs';

export { PRIVATE_OWNER_IMPORT_FAMILIES } from './wp_contract_registry.mjs';

const root = process.cwd();
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
  for (const site of dependencySites) {
    if (!importersByTarget.has(site.target)) importersByTarget.set(site.target, new Set());
    importersByTarget.get(site.target).add(site.importer);
  }
  const facades = [];
  for (const file of files) {
    const fileRel = rel(projectRoot, file);
    const source = stripComments(fs.readFileSync(file, 'utf8'));
    if (!IDENTITY_REEXPORT_RE.test(source)) continue;
    const importers = [...(importersByTarget.get(fileRel) || [])].sort();
    if (importers.length > 1) continue;
    facades.push({ file: fileRel, importers });
  }
  return facades.sort((left, right) => left.file.localeCompare(right.file));
}

export function runPrivateOwnerImportBoundaryAudit(projectRoot = root, options = {}) {
  const families = (options.families || PRIVATE_OWNER_IMPORT_FAMILIES).map(normalizeFamily);
  const sourceRoots = options.sourceRoots || ['esm'];
  const justifiedOneLineFacades = options.justifiedOneLineFacades || JUSTIFIED_ONE_LINE_FACADES;
  const oneLineFacadeBaseline = options.oneLineFacadeBaseline || LEGACY_ONE_LINE_FACADE_BASELINE;
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
  const legacyOneLineFacades = oneLineFacades.filter(entry => !justified.has(entry.file));
  const legacyOneLineFacadePaths = legacyOneLineFacades.map(entry => entry.file).sort();
  const oneLineFacadeTopology = {
    candidateCount: legacyOneLineFacadePaths.length,
    sha256: crypto.createHash('sha256').update(legacyOneLineFacadePaths.join('\n')).digest('hex'),
  };
  const oneLineFacadeTopologyMismatch =
    oneLineFacadeTopology.candidateCount !== Number(oneLineFacadeBaseline.candidateCount) ||
    oneLineFacadeTopology.sha256 !== String(oneLineFacadeBaseline.sha256 || '')
      ? [
          `identity-only facade topology changed: expected ${oneLineFacadeBaseline.candidateCount}/${oneLineFacadeBaseline.sha256 || '<unset>'}, current ${oneLineFacadeTopology.candidateCount}/${oneLineFacadeTopology.sha256}`,
        ]
      : [];

  return {
    ok:
      configErrors.length === 0 &&
      missingFiles.length === 0 &&
      violations.length === 0 &&
      oneLineFacadeTopologyMismatch.length === 0,
    families,
    scannedFiles: files.length,
    privateOwners: privateOwnerIndex.size,
    importSites,
    oneLineFacades,
    legacyOneLineFacades,
    oneLineFacadeTopology,
    configErrors,
    missingFiles,
    violations,
    oneLineFacadeTopologyMismatch,
  };
}

function main() {
  const result = runPrivateOwnerImportBoundaryAudit(root);
  if (!result.ok) {
    console.error('[private-owner-imports] FAILED');
    for (const key of ['configErrors', 'missingFiles', 'violations', 'oneLineFacadeTopologyMismatch']) {
      for (const error of result[key]) console.error(`- ${error}`);
    }
    process.exit(1);
  }
  console.log(
    `[private-owner-imports] ok (${result.families.length} families, ${result.privateOwners} private owners, ${result.importSites.length} guarded import sites, ${result.oneLineFacades.length} identity facades, ${result.legacyOneLineFacades.length} on the no-growth ratchet)`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
