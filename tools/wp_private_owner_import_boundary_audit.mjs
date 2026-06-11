#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();

export const PRIVATE_OWNER_IMPORT_FAMILIES = Object.freeze([
  {
    id: 'builder:sketch-box-door-visuals',
    publicFacade: 'esm/native/builder/render_interior_sketch_boxes_fronts_door_visuals.ts',
    privateOwners: [
      'esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_materials.ts',
      'esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_routes.ts',
      'esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_core.ts',
    ],
  },
  {
    id: 'builder:drawer-shared-render-contract',
    publicFacade: 'esm/native/builder/render_drawer_ops_shared.ts',
    privateOwners: [
      'esm/native/builder/render_drawer_ops_shared_types.ts',
      'esm/native/builder/render_drawer_ops_shared_guards.ts',
      'esm/native/builder/render_drawer_ops_shared_readers.ts',
      'esm/native/builder/render_drawer_ops_shared_ops.ts',
      'esm/native/builder/render_drawer_ops_shared_visual_state.ts',
    ],
  },
  {
    id: 'ui:sketch-box-controls-runtime',
    publicFacade: 'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime.ts',
    privateOwners: [
      'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_types.ts',
      'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_sync.ts',
      'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_dimensions.ts',
      'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_panels.ts',
      'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_base.ts',
      'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_cornice.ts',
    ],
  },
  {
    id: 'runtime:ui-raw-selectors',
    publicFacade: 'esm/native/runtime/ui_raw_selectors.ts',
    privateOwners: [
      'esm/native/runtime/ui_raw_selectors_shared.ts',
      'esm/native/runtime/ui_raw_selectors_snapshot.ts',
      'esm/native/runtime/ui_raw_selectors_canonical.ts',
      'esm/native/runtime/ui_raw_selectors_store.ts',
    ],
  },
  {
    id: 'runtime:runtime-selectors',
    publicFacade: 'esm/native/runtime/runtime_selectors.ts',
    privateOwners: [
      'esm/native/runtime/runtime_selectors_shared.ts',
      'esm/native/runtime/runtime_selectors_normalizers.ts',
      'esm/native/runtime/runtime_selectors_snapshot.ts',
      'esm/native/runtime/runtime_selectors_store.ts',
    ],
  },
  {
    id: 'ui:order-pdf-export-commands',
    publicFacade: 'esm/native/ui/react/pdf/order_pdf_overlay_export_commands.ts',
    privateOwners: [
      'esm/native/ui/react/pdf/order_pdf_overlay_export_commands_types.ts',
      'esm/native/ui/react/pdf/order_pdf_overlay_export_commands_errors.ts',
      'esm/native/ui/react/pdf/order_pdf_overlay_export_commands_load_pdf.ts',
      'esm/native/ui/react/pdf/order_pdf_overlay_export_commands_downloads.ts',
      'esm/native/ui/react/pdf/order_pdf_overlay_export_commands_gmail.ts',
      'esm/native/ui/react/pdf/order_pdf_overlay_export_commands_pdfjs.ts',
    ],
  },
]);

const SOURCE_FILE_RE = /\.(?:js|mjs|ts|tsx|mts)$/;
const IMPORT_FROM_RE = /\bimport\b[^;]*?\bfrom\b\s*['"]([^'"]+)['"]/g;
const IMPORT_SIDE_EFFECT_RE = /\bimport\b\s*['"]([^'"]+)['"]/g;
const EXPORT_FROM_RE = /\bexport\b[^;]*?\bfrom\b\s*['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function normalizeRel(file) {
  return file.replace(/\\/g, '/');
}

function rel(projectRoot, file) {
  return normalizeRel(path.relative(projectRoot, file));
}

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

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

export function collectImportSpecifiers(source) {
  const imports = [];
  for (const rx of [IMPORT_FROM_RE, IMPORT_SIDE_EFFECT_RE, EXPORT_FROM_RE, DYNAMIC_IMPORT_RE]) {
    rx.lastIndex = 0;
    for (const match of source.matchAll(rx)) {
      imports.push({
        specifier: match[1],
        index: match.index || 0,
      });
    }
  }
  return imports;
}

function normalizeFamily(family) {
  const privateOwners = Array.isArray(family.privateOwners) ? family.privateOwners.map(normalizeRel) : [];
  return {
    id: String(family.id || family.publicFacade || ''),
    publicFacade: normalizeRel(String(family.publicFacade || '')),
    privateOwners,
    allowedImporters: Array.isArray(family.allowedImporters) ? family.allowedImporters.map(normalizeRel) : [],
  };
}

function createPrivateOwnerIndex(families) {
  const index = new Map();
  const configErrors = [];

  for (const family of families.map(normalizeFamily)) {
    if (!family.id) configErrors.push('family is missing id');
    if (!family.publicFacade) configErrors.push(`${family.id || '<unknown>'}: missing publicFacade`);
    if (!family.privateOwners.length) configErrors.push(`${family.id || '<unknown>'}: missing privateOwners`);

    for (const owner of family.privateOwners) {
      if (index.has(owner)) {
        configErrors.push(`${owner}: registered by both ${index.get(owner).id} and ${family.id}`);
        continue;
      }
      index.set(owner, family);
    }
  }

  return { index, configErrors };
}

function isAllowedImporter(importerRel, family) {
  if (importerRel === family.publicFacade) return true;
  if (family.privateOwners.includes(importerRel)) return true;
  if (family.allowedImporters.includes(importerRel)) return true;
  return false;
}

export function runPrivateOwnerImportBoundaryAudit(projectRoot = root, options = {}) {
  const families = options.families || PRIVATE_OWNER_IMPORT_FAMILIES;
  const sourceRoots = options.sourceRoots || ['esm'];
  const { index: privateOwnerIndex, configErrors } = createPrivateOwnerIndex(families);
  const missingFiles = [];

  for (const family of families.map(normalizeFamily)) {
    for (const file of [family.publicFacade, ...family.privateOwners]) {
      if (!existingFile(projectRoot, file)) missingFiles.push(`${family.id}: missing ${file}`);
    }
  }

  const files = sourceRoots.flatMap(sourceRoot => walk(path.join(projectRoot, sourceRoot)));
  const importSites = [];
  const violations = [];

  for (const file of files) {
    const importerRel = rel(projectRoot, file);
    const source = fs.readFileSync(file, 'utf8');
    const seen = new Set();

    for (const item of collectImportSpecifiers(source)) {
      const targetRel = resolveRelativeImport(projectRoot, importerRel, item.specifier);
      if (!targetRel) continue;
      const targetFamily = privateOwnerIndex.get(targetRel);
      if (!targetFamily) continue;

      const dedupeKey = `${importerRel}:${targetRel}:${item.index}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const site = {
        family: targetFamily.id,
        importer: importerRel,
        target: targetRel,
        line: lineNumberAt(source, item.index),
      };
      importSites.push(site);

      if (!isAllowedImporter(importerRel, targetFamily)) {
        violations.push(
          `${site.importer}:${site.line}: imports private owner ${site.target} from ${site.family}; use ${targetFamily.publicFacade}`
        );
      }
    }
  }

  return {
    ok: configErrors.length === 0 && missingFiles.length === 0 && violations.length === 0,
    families: families.map(normalizeFamily),
    scannedFiles: files.length,
    privateOwners: privateOwnerIndex.size,
    importSites,
    configErrors,
    missingFiles,
    violations,
  };
}

function main() {
  const result = runPrivateOwnerImportBoundaryAudit(root);
  if (!result.ok) {
    console.error('[private-owner-imports] FAILED');
    for (const error of result.configErrors) console.error(`- ${error}`);
    for (const error of result.missingFiles) console.error(`- ${error}`);
    for (const violation of result.violations) console.error(`- ${violation}`);
    process.exit(1);
  }

  console.log(
    `[private-owner-imports] ok (${result.families.length} families, ${result.privateOwners} private owners, ${result.importSites.length} guarded import sites)`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
