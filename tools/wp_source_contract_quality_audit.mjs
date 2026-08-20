#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSourceFile, walkAst } from './wp_ast_adapter.mjs';

const ROOT = process.cwd();
const FIXED_SHA256_LITERAL_RE = /['"]([0-9a-f]{64})['"]/gu;
const SOURCE_FINGERPRINT_MARKER_RE =
  /\b(?:canonicalSemanticAst|canonicalAst|semanticSha256|semanticHash|functionHashes|semanticFingerprints|rawSemanticSha256|consumerBodySha256|numericHash|rawTailSha256|uiSemanticFingerprint|formulaHashes|initializerSha256|ownerInitializerSha256)\b/u;

// This is a ratchet, not an allow-forever list. A file must be removed from this ledger
// as soon as its opaque source/AST baseline is replaced by explicit ownership/behavior facts.
export const OPAQUE_SOURCE_FINGERPRINT_DEBT = Object.freeze({});

const SOURCE_READER_MARKER_RE =
  /(?:readSource|bundleSources|readFirstExisting|readFileSync|fs\.readFileSync)/u;
export const SOURCE_SHAPE_REGEX_KEYS = Object.freeze([
  'crossStatement',
  'exactObjectCall',
  'optionalTypeSyntax',
  'indexedAccessSyntax',
  'ternaryUndefined',
  'loopSyntax',
]);

// Aggregate implementation-shape indicator ratchet. These patterns are not all invalid:
// import/export, CSS, and negative architecture contracts can legitimately remain source-based.
// The ratchet prevents silent growth while later modernization waves replace only the brittle
// implementation-coupled cases with semantic AST, ownership, or runtime assertions.
// Source-text assertions are sometimes the right tool: visual/CSS/DOM policy is itself
// expressed in source structure and often has no useful runtime seam. Keep those contracts
// explicit and exact instead of mixing them into the implementation-shape modernization debt.
export const SOURCE_POLICY_REGEX_CONTRACTS = Object.freeze({
  'tests/order_pdf_toolbar_visual_contracts.test.js': Object.freeze({
    reason: 'Order-PDF toolbar CSS/DOM/z-index layout policy is intentionally source-structural.',
    patterns: 35,
    categories: Object.freeze({
      crossStatement: 34,
      exactObjectCall: 1,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/design_tab_tooltip_visual_contracts.test.js': Object.freeze({
    reason:
      'Design-tab tooltip CSS/DOM placement and visual-state policy is intentionally source-structural.',
    patterns: 22,
    categories: Object.freeze({
      crossStatement: 22,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 1,
      loopSyntax: 0,
    }),
  }),
  'tests/viewer_notes_controls_contract.test.js': Object.freeze({
    reason: 'Viewer-notes control layout/DOM wiring is a visual interaction contract.',
    patterns: 10,
    categories: Object.freeze({
      crossStatement: 10,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/overlay_quick_actions_tooltips_contract.test.js': Object.freeze({
    reason: 'Quick-action tooltip DOM/CSS layering and presentation is a source-visible UI policy.',
    patterns: 9,
    categories: Object.freeze({
      crossStatement: 8,
      exactObjectCall: 1,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/ui_modern_pressed_states_contracts.test.js': Object.freeze({
    reason: 'Pressed-state styling is a CSS/DOM visual-system contract.',
    patterns: 9,
    categories: Object.freeze({
      crossStatement: 9,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/order_pdf_sketch_text_mode_layer_contract.test.js': Object.freeze({
    reason: 'Order-PDF sketch-text layer ordering is intentionally checked as DOM/CSS source policy.',
    patterns: 4,
    categories: Object.freeze({
      crossStatement: 4,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/settings_visual_sections_runtime.test.js': Object.freeze({
    reason: 'Settings visual-section layout is an explicit UI source contract.',
    patterns: 4,
    categories: Object.freeze({
      crossStatement: 4,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/app_boot_browser_project_family_contracts.test.js': Object.freeze({
    reason:
      'Boot/browser/project family contracts intentionally freeze integration topology, E2E sequencing, and UI source policy.',
    patterns: 15,
    categories: Object.freeze({
      crossStatement: 15,
      exactObjectCall: 1,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/builder_service_access_contracts.test.js': Object.freeze({
    reason:
      'Builder service-access contracts intentionally enforce facade exports, ownership routing, and stable binding topology.',
    patterns: 8,
    categories: Object.freeze({
      crossStatement: 8,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/runtime_surface_family_contracts.test.js': Object.freeze({
    reason:
      'Runtime surface-family contracts intentionally enforce facade/owner topology as source architecture policy.',
    patterns: 4,
    categories: Object.freeze({
      crossStatement: 4,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/builder_bootstrap_install_contracts.test.js': Object.freeze({
    reason:
      'Builder bootstrap contracts intentionally enforce install-owner decomposition and binding topology.',
    patterns: 4,
    categories: Object.freeze({
      crossStatement: 4,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/cloud_sync_gateway_security_contract.test.js': Object.freeze({
    reason: 'Cloud gateway SQL/privilege/retention assertions are explicit security source-policy contracts.',
    patterns: 7,
    categories: Object.freeze({
      crossStatement: 7,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/design_tab_feedback_and_color_contracts.test.js': Object.freeze({
    reason: 'Design feedback/color presentation is an explicit visual-source policy.',
    patterns: 3,
    categories: Object.freeze({
      crossStatement: 3,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/interior_tab_sections_runtime.test.js': Object.freeze({
    reason:
      'Interior section spacing, wrapping, and option-button layout are explicit CSS/visual source policy.',
    patterns: 7,
    categories: Object.freeze({
      crossStatement: 7,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/front_special_visual_routes_guard.test.js': Object.freeze({
    reason:
      'Special glass/mirror front routing intentionally freezes visual-state forwarding at the render seam.',
    patterns: 5,
    categories: Object.freeze({
      crossStatement: 2,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 5,
      loopSyntax: 0,
    }),
  }),
  'tests/github_actions_ci_contracts.test.js': Object.freeze({
    reason: 'GitHub workflow sequencing and release-gate topology are YAML source policy by definition.',
    patterns: 3,
    categories: Object.freeze({
      crossStatement: 3,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/structure_e2e_surface_contracts.test.js': Object.freeze({
    reason:
      'Structure E2E hooks and selected-state probing are explicit integration/source policy for stable automation.',
    patterns: 3,
    categories: Object.freeze({
      crossStatement: 3,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/structure_tab_dimensions_stack_split_layout_runtime.test.tsx': Object.freeze({
    reason:
      'Structure stack-split dimension row spacing, badge width, link typography, and restore-button width are explicit CSS/layout source policy.',
    patterns: 4,
    categories: Object.freeze({
      crossStatement: 4,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/runtime_platform_core_family_contracts.test.js': Object.freeze({
    reason:
      'Runtime/platform core family assertions intentionally enforce owner decomposition, public API topology, and canonical install sequencing.',
    patterns: 3,
    categories: Object.freeze({
      crossStatement: 1,
      exactObjectCall: 0,
      optionalTypeSyntax: 2,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/builder_service_access_build_decomposition_contracts.test.js': Object.freeze({
    reason:
      'Builder service-access build decomposition assertions intentionally freeze facade-to-owner topology and delegated build seams.',
    patterns: 2,
    categories: Object.freeze({
      crossStatement: 2,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/cloud_sync_main_row_pull_decomposition_contracts.test.js': Object.freeze({
    reason:
      'Cloud main-row pull decomposition assertions intentionally enforce facade/shared/runtime owner topology.',
    patterns: 2,
    categories: Object.freeze({
      crossStatement: 2,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/cloud_sync_sketch_ops_sketch_decomposition_contracts.test.js': Object.freeze({
    reason:
      'Cloud sketch-room decomposition assertions intentionally enforce state/load/pull/push/runtime ownership topology.',
    patterns: 2,
    categories: Object.freeze({
      crossStatement: 2,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/cloud_sync_coalescer_decomposition_contracts.test.js': Object.freeze({
    reason:
      'Cloud coalescer decomposition assertions intentionally enforce shared/policy/diag/runtime ownership topology.',
    patterns: 1,
    categories: Object.freeze({
      crossStatement: 1,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/cloud_sync_install_runtime_decomposition_contracts.test.js': Object.freeze({
    reason:
      'Cloud install-runtime decomposition assertions intentionally enforce shared/ops/panel/create owner topology.',
    patterns: 1,
    categories: Object.freeze({
      crossStatement: 1,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/cloud_sync_lifecycle_realtime_decomposition_contracts.test.js': Object.freeze({
    reason:
      'Cloud realtime-lifecycle decomposition assertions intentionally enforce facade/shared/runtime topology.',
    patterns: 1,
    categories: Object.freeze({
      crossStatement: 1,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/cloud_sync_lifecycle_realtime_transport_decomposition_contracts.test.js': Object.freeze({
    reason:
      'Cloud realtime-transport decomposition assertions intentionally enforce cleanup/status/runtime owner topology.',
    patterns: 1,
    categories: Object.freeze({
      crossStatement: 1,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/cloud_sync_lifecycle_status_decomposition_contracts.test.js': Object.freeze({
    reason:
      'Cloud lifecycle-status decomposition assertions intentionally enforce the dedicated snapshot/phase mutation seam.',
    patterns: 1,
    categories: Object.freeze({
      crossStatement: 0,
      exactObjectCall: 1,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/cloud_sync_main_row_remote_decomposition_contracts.test.js': Object.freeze({
    reason:
      'Cloud remote main-row decomposition assertions intentionally enforce facade/shared/push/pull owner topology.',
    patterns: 1,
    categories: Object.freeze({
      crossStatement: 1,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/cloud_sync_realtime_decomposition_contracts.test.js': Object.freeze({
    reason:
      'Cloud realtime decomposition assertions intentionally enforce facade/shared/module ownership topology.',
    patterns: 1,
    categories: Object.freeze({
      crossStatement: 1,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/cloud_sync_sketch_ops_floating_decomposition_contracts.test.js': Object.freeze({
    reason:
      'Cloud floating-sketch decomposition assertions intentionally enforce state/pull/push/runtime owner topology.',
    patterns: 1,
    categories: Object.freeze({
      crossStatement: 1,
      exactObjectCall: 0,
      optionalTypeSyntax: 0,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
  'tests/kernel_store_boundary_decomposition_contracts.test.js': Object.freeze({
    reason:
      'Kernel/store boundary decomposition assertions intentionally enforce thin public owners and focused orchestration seams.',
    patterns: 1,
    categories: Object.freeze({
      crossStatement: 0,
      exactObjectCall: 0,
      optionalTypeSyntax: 1,
      indexedAccessSyntax: 0,
      ternaryUndefined: 0,
      loopSyntax: 0,
    }),
  }),
});

// Ratchet only the implementation-shaped debt. Explicit source-policy contracts above are
// audited separately and cannot grow or drift without deliberate review.
export const SOURCE_SHAPE_REGEX_RATCHET = Object.freeze({
  files: 82,
  patterns: 165,
  categories: Object.freeze({
    crossStatement: 104,
    exactObjectCall: 35,
    optionalTypeSyntax: 18,
    indexedAccessSyntax: 9,
    ternaryUndefined: 18,
    loopSyntax: 1,
  }),
});

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      out.push(...walk(full));
    } else if (entry.isFile() && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function normalize(projectRoot, file) {
  return path.relative(projectRoot, file).split(path.sep).join('/');
}

export function scanOpaqueSourceFingerprintText(source) {
  const text = String(source || '');
  const hasSourceFingerprintMarker = SOURCE_FINGERPRINT_MARKER_RE.test(text);
  SOURCE_FINGERPRINT_MARKER_RE.lastIndex = 0;
  const fixedSha256Baselines = [...text.matchAll(FIXED_SHA256_LITERAL_RE)].length;
  return {
    hasSourceFingerprintMarker,
    fixedSha256Baselines: hasSourceFingerprintMarker ? fixedSha256Baselines : 0,
  };
}

export function classifySourceShapeRegexPattern(patternIn) {
  const pattern = String(patternIn || '');
  return {
    crossStatement: pattern.includes('[\\s\\S]'),
    exactObjectCall: /\\\(\\\{|\\\(\\s\*\\\{/u.test(pattern),
    optionalTypeSyntax: /[A-Za-z0-9_$)]\\\?\s*:\s*/u.test(pattern),
    indexedAccessSyntax: /[A-Za-z0-9_$.)]\\\[[A-Za-z_$][A-Za-z0-9_$]*\\\]/u.test(pattern),
    ternaryUndefined: /[?\\]\s*[^\n]{0,100}:\s*(?:undefined|null)/u.test(pattern),
    loopSyntax: /for\\s\*?\\\(/u.test(pattern),
  };
}

function emptySourceShapeCategoryCounts() {
  return Object.fromEntries(SOURCE_SHAPE_REGEX_KEYS.map(key => [key, 0]));
}

export function collectSourceShapeRegexMetrics(projectRoot = ROOT) {
  const testRoot = path.join(projectRoot, 'tests');
  const categories = emptySourceShapeCategoryCounts();
  const byFile = [];
  let patterns = 0;

  for (const file of walk(testRoot)) {
    const rel = normalize(projectRoot, file);
    if (!/\.test\.(?:[cm]?[jt]sx?)$/u.test(rel)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (!SOURCE_READER_MARKER_RE.test(source)) continue;

    let sourceFile;
    try {
      sourceFile = createSourceFile(path.basename(file), source);
    } catch {
      continue;
    }

    const local = emptySourceShapeCategoryCounts();
    let localPatterns = 0;
    walkAst(sourceFile, node => {
      if (node?.type !== 'Literal' || !node.regex?.pattern) return;
      const classification = classifySourceShapeRegexPattern(node.regex.pattern);
      let counted = false;
      for (const key of SOURCE_SHAPE_REGEX_KEYS) {
        if (!classification[key]) continue;
        local[key] += 1;
        counted = true;
      }
      if (counted) localPatterns += 1;
    });

    if (!localPatterns) continue;
    patterns += localPatterns;
    for (const key of SOURCE_SHAPE_REGEX_KEYS) categories[key] += local[key];
    byFile.push({ file: rel, patterns: localPatterns, categories: local });
  }

  byFile.sort((left, right) => right.patterns - left.patterns || left.file.localeCompare(right.file));
  return { files: byFile.length, patterns, categories, byFile };
}

function subtractSourceShapeCategoryCounts(left, right) {
  return Object.fromEntries(
    SOURCE_SHAPE_REGEX_KEYS.map(key => [key, Math.max(0, (left[key] || 0) - (right[key] || 0))])
  );
}

function sourcePolicyMetricsFromRaw(rawMetrics) {
  const categories = emptySourceShapeCategoryCounts();
  const byFile = [];
  let patterns = 0;

  for (const [file, policy] of Object.entries(SOURCE_POLICY_REGEX_CONTRACTS)) {
    const actual = rawMetrics.byFile.find(entry => entry.file === file);
    if (!actual) continue;
    patterns += actual.patterns;
    for (const key of SOURCE_SHAPE_REGEX_KEYS) categories[key] += actual.categories[key];
    byFile.push(actual);
  }

  byFile.sort((left, right) => left.file.localeCompare(right.file));
  return { files: byFile.length, patterns, categories, byFile };
}

export function collectImplementationShapeRegexMetrics(projectRoot = ROOT) {
  const raw = collectSourceShapeRegexMetrics(projectRoot);
  const policy = sourcePolicyMetricsFromRaw(raw);
  const policyFiles = new Set(policy.byFile.map(entry => entry.file));
  const byFile = raw.byFile.filter(entry => !policyFiles.has(entry.file));
  return {
    files: byFile.length,
    patterns: Math.max(0, raw.patterns - policy.patterns),
    categories: subtractSourceShapeCategoryCounts(raw.categories, policy.categories),
    byFile,
    raw,
    policy,
  };
}

export function collectOpaqueSourceFingerprintDebt(projectRoot = ROOT) {
  const testRoot = path.join(projectRoot, 'tests');
  return walk(testRoot)
    .filter(file => normalize(projectRoot, file) !== 'tests/source_contract_quality_audit.test.js')
    .map(file => {
      const source = fs.readFileSync(file, 'utf8');
      const scan = scanOpaqueSourceFingerprintText(source);
      return {
        file: normalize(projectRoot, file),
        fixedSha256Baselines: scan.fixedSha256Baselines,
      };
    })
    .filter(entry => entry.fixedSha256Baselines > 0)
    .sort((left, right) => left.file.localeCompare(right.file));
}

export function runSourceContractQualityAudit(projectRoot = ROOT) {
  const actual = collectOpaqueSourceFingerprintDebt(projectRoot);
  const actualByFile = new Map(actual.map(entry => [entry.file, entry.fixedSha256Baselines]));
  const sourceShape = collectImplementationShapeRegexMetrics(projectRoot);
  const failures = [];

  for (const entry of actual) {
    const debt = OPAQUE_SOURCE_FINGERPRINT_DEBT[entry.file];
    if (!debt) {
      failures.push(
        `${entry.file}: unregistered opaque source/AST SHA-256 baseline (${entry.fixedSha256Baselines})`
      );
      continue;
    }
    if (entry.fixedSha256Baselines !== debt.fixedSha256Baselines) {
      failures.push(
        `${entry.file}: opaque baseline count changed ${debt.fixedSha256Baselines} -> ${entry.fixedSha256Baselines}; ` +
          'replace the fingerprint or ratchet the debt ledger deliberately'
      );
    }
  }

  for (const [file, debt] of Object.entries(OPAQUE_SOURCE_FINGERPRINT_DEBT)) {
    const actualCount = actualByFile.get(file) ?? 0;
    if (actualCount === 0) {
      failures.push(`${file}: stale source-fingerprint debt entry; remove it from the ledger`);
    } else if (!String(debt.reason || '').trim()) {
      failures.push(`${file}: source-fingerprint debt entry requires a migration reason`);
    }
  }

  for (const [file, policy] of Object.entries(SOURCE_POLICY_REGEX_CONTRACTS)) {
    const actualEntry = sourceShape.raw.byFile.find(entry => entry.file === file);
    if (!actualEntry) {
      failures.push(`${file}: registered source-policy contract has no measured source-shape regexes`);
      continue;
    }
    if (!String(policy.reason || '').trim()) {
      failures.push(`${file}: source-policy contract requires a review reason`);
    }
    if (actualEntry.patterns !== policy.patterns) {
      failures.push(
        `${file}: source-policy pattern count changed ${policy.patterns} -> ${actualEntry.patterns}; review the visual/source policy deliberately`
      );
    }
    for (const key of SOURCE_SHAPE_REGEX_KEYS) {
      if (actualEntry.categories[key] !== policy.categories[key]) {
        failures.push(
          `${file}: source-policy category ${key} changed ${policy.categories[key]} -> ${actualEntry.categories[key]}; review deliberately`
        );
      }
    }
  }

  for (const key of ['files', 'patterns']) {
    const expected = SOURCE_SHAPE_REGEX_RATCHET[key];
    const value = sourceShape[key];
    if (value > expected) {
      failures.push(
        `source-shape regex ${key} increased ${expected} -> ${value}; modernize the new implementation-shaped contract or ratchet deliberately`
      );
    } else if (value < expected) {
      failures.push(
        `source-shape regex ${key} decreased ${expected} -> ${value}; lower SOURCE_SHAPE_REGEX_RATCHET deliberately`
      );
    }
  }
  for (const key of SOURCE_SHAPE_REGEX_KEYS) {
    const expected = SOURCE_SHAPE_REGEX_RATCHET.categories[key];
    const value = sourceShape.categories[key];
    if (value > expected) {
      failures.push(
        `source-shape regex category ${key} increased ${expected} -> ${value}; modernize the new implementation-shaped contract or ratchet deliberately`
      );
    } else if (value < expected) {
      failures.push(
        `source-shape regex category ${key} decreased ${expected} -> ${value}; lower SOURCE_SHAPE_REGEX_RATCHET deliberately`
      );
    }
  }

  return {
    ok: failures.length === 0,
    files: actual.length,
    fixedSha256Baselines: actual.reduce((sum, entry) => sum + entry.fixedSha256Baselines, 0),
    sourceShape,
    failures,
    actual,
  };
}

function main() {
  const result = runSourceContractQualityAudit(ROOT);
  if (!result.ok) {
    console.error(`[source-contract-quality] FAILED with ${result.failures.length} issue(s)`);
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `[source-contract-quality] ok (${result.files} opaque debt files, ${result.fixedSha256Baselines} fixed SHA-256 baselines; ` +
      `${result.sourceShape.files} implementation-shape files, ${result.sourceShape.patterns} debt indicators; ` +
      `${result.sourceShape.policy.files} registered source-policy files, ${result.sourceShape.policy.patterns} policy indicators)`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
