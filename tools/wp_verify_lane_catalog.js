export const VERIFY_LANE_CATALOG = Object.freeze({
  'app-boot-project-family-core': [
    'test:app-boot-project-family-core',
    'typecheck:platform',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:kernel',
    'contract:layers',
    'contract:api',
  ],
  'browser-feedback-family-core': [
    'test:browser-feedback-family-contracts',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'builder-support-surfaces': [
    'test:builder-support-surfaces',
    'typecheck:builder',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:kernel',
    'contract:layers',
    'contract:api',
  ],
  'builder-surface-family-core': [
    'test:builder-surface-family-core',
    'test:builder-surfaces',
    'test:builder-support-surfaces',
    'typecheck:builder',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:kernel',
    'contract:layers',
    'contract:api',
  ],
  'builder-surfaces': [
    'test:builder-surfaces',
    'typecheck:builder',
    'typecheck:runtime',
    'typecheck:services',
    'contract:layers',
    'contract:api',
  ],
  'canonical-access-surfaces': [
    'test:canonical-access-surfaces',
    'typecheck:runtime',
    'typecheck:services',
    'contract:layers',
    'contract:api',
  ],
  'canvas-family': [
    'test:visual-surface-family-contracts',
    'test:canvas-interaction-surfaces',
    'test:canvas-surfaces',
    'test:sketch-surfaces',
    'typecheck:services',
    'typecheck:runtime',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'canvas-interaction-surfaces': [
    'test:canvas-interaction-surfaces',
    'typecheck:services',
    'typecheck:runtime',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'canvas-surfaces': [
    'test:canvas-surfaces',
    'typecheck:services',
    'typecheck:runtime',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'cloud-sync-family-core': [
    'test:cloud-sync-family-contracts',
    'test:cloud-sync-surfaces',
    'typecheck:services',
    'typecheck:runtime',
    'contract:layers',
    'contract:api',
  ],
  'cloud-sync-surfaces': [
    'test:cloud-sync-surfaces',
    'typecheck:services',
    'typecheck:runtime',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'domain-surfaces': [
    'test:domain-surfaces',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:kernel',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'door-build-surfaces': [
    'test:door-build-surfaces',
    'typecheck:builder',
    'typecheck:runtime',
    'typecheck:services',
    'contract:layers',
    'contract:api',
  ],
  'export-overlay-errors-family-core': [
    'test:export-overlay-errors-family-contracts',
    'typecheck:platform',
    'typecheck:services',
    'typecheck:runtime',
    'contract:layers',
    'contract:api',
  ],
  'layout-tab-family': [
    'test:structure-tab-family-contracts',
    'test:tab-surfaces',
    'test:builder-surfaces',
    'typecheck:builder',
    'typecheck:ui',
    'typecheck:services',
    'typecheck:runtime',
    'contract:layers',
    'contract:api',
  ],
  'no-main-surfaces': [
    'test:no-main-surfaces',
    'typecheck:builder',
    'typecheck:services',
    'typecheck:runtime',
    'typecheck:kernel',
    'contract:layers',
    'contract:api',
  ],
  'order-pdf-surfaces': [
    'test:order-pdf-surfaces',
    'typecheck:ui',
    'typecheck:services',
    'contract:layers',
    'contract:api',
  ],
  'overlay-export-family': [
    'test:export-overlay-errors-family-contracts',
    'test:overlay-export-family-runtime',
    'test:order-pdf-surfaces',
    'typecheck:platform',
    'typecheck:services',
    'typecheck:runtime',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'overlay-export-family-core': ['verify:export-overlay-errors-family-core'],
  'perf-smoke': ['perf:smoke'],
  'perf-toolchain-core': ['test:perf-toolchain-core'],
  'project-surfaces': [
    'test:project-surfaces',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:kernel',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'public-surfaces': [
    'test:public-surfaces',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:kernel',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'render-family': [
    'test:visual-surface-family-contracts',
    'test:render-surfaces',
    'test:builder-support-surfaces',
    'test:sketch-surfaces',
    'test:tab-surfaces',
    'typecheck:platform',
    'typecheck:builder',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'render-surfaces': [
    'test:render-surfaces',
    'typecheck:platform',
    'typecheck:builder',
    'typecheck:runtime',
    'typecheck:services',
    'contract:layers',
    'contract:api',
  ],
  'residual-families-core': [
    'test:residual-families-core',
    'typecheck:builder',
    'typecheck:platform',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:kernel',
    'contract:layers',
    'contract:api',
  ],
  'runtime-access-surfaces': [
    'test:runtime-access-surfaces',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:kernel',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'runtime-platform-core-family-core': [
    'test:runtime-platform-core-family-core',
    'test:state-config-kernel-surfaces',
    'typecheck:platform',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:kernel',
    'contract:layers',
    'contract:api',
  ],
  'runtime-surface-family-core': [
    'test:runtime-surface-family-core',
    'typecheck:platform',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'service-canonical-surfaces': [
    'test:service-canonical-surfaces',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'sketch-surfaces': [
    'test:sketch-surfaces',
    'typecheck:builder',
    'typecheck:services',
    'typecheck:runtime',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
  'state-config-kernel-surfaces': [
    'test:state-config-kernel-surfaces',
    'typecheck:runtime',
    'typecheck:kernel',
    'typecheck:services',
    'contract:layers',
    'contract:api',
  ],
  'structure-tab-family-core': [
    'test:structure-tab-family-core',
    'test:tab-surfaces',
    'typecheck:builder',
    'typecheck:ui',
    'typecheck:services',
    'typecheck:runtime',
    'contract:layers',
    'contract:api',
  ],
  'tab-surfaces': [
    'test:tab-surfaces',
    'typecheck:ui',
    'typecheck:services',
    'typecheck:runtime',
    'contract:layers',
    'contract:api',
  ],
  'toolchain-surfaces': ['test:toolchain-surfaces'],
  'ui-dist-probe': ['typecheck:dist'],
  'ui-lean-core': ['test:ui-lean-contracts', 'typecheck:ui-lean', 'contract:layers', 'contract:api'],
  'ui-portable-core': [
    'test:ui-portable-typecheck-contracts',
    'typecheck:ui',
    'typecheck:ui-lean',
    'contract:layers',
    'contract:api',
  ],
  'ui-react-import-hardening-core': [
    'test:ui-react-import-hardening-contracts',
    'test:ui-type-hardening-contracts',
    'contract:layers',
    'contract:api',
  ],
  'ui-react-jsx-hardening-core': [
    'test:ui-react-import-hardening-contracts',
    'test:ui-react-jsx-hardening-contracts',
    'test:ui-type-hardening-contracts',
    'contract:layers',
    'contract:api',
  ],
  'ui-type-hardening-core': [
    'test:ui-type-hardening-contracts',
    'test:export-overlay-errors-family-contracts',
    'contract:layers',
    'contract:api',
  ],
  'visual-surface-family-core': [
    'test:visual-surface-family-contracts',
    'typecheck:platform',
    'typecheck:builder',
    'typecheck:services',
    'typecheck:runtime',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
  ],
});

export function listVerifyLaneNames() {
  return Object.keys(VERIFY_LANE_CATALOG).sort();
}

export function normalizeVerifyLaneName(name) {
  const value = typeof name === 'string' ? name.trim() : '';
  if (!value) return '';
  return value.startsWith('verify:') ? value.slice('verify:'.length) : value;
}

export function readVerifyLaneScripts(laneName) {
  const normalized = normalizeVerifyLaneName(laneName);
  const scripts = VERIFY_LANE_CATALOG[normalized];
  return Array.isArray(scripts) ? scripts.slice() : null;
}

export function flattenVerifyLaneScripts(laneName, seen = new Set()) {
  const normalized = normalizeVerifyLaneName(laneName);
  if (!normalized) throw new Error('[WardrobePro] verify lane name is required.');
  if (seen.has(normalized)) {
    throw new Error(
      `[WardrobePro] verify lane recursion detected: ${Array.from(seen).concat(normalized).join(' -> ')}`
    );
  }
  const scripts = readVerifyLaneScripts(normalized);
  if (!scripts) throw new Error(`[WardrobePro] unknown verify lane: ${normalized}`);
  seen.add(normalized);
  const out = [];
  for (const scriptName of scripts) {
    if (typeof scriptName !== 'string' || !scriptName.trim()) continue;
    if (scriptName.startsWith('verify:')) {
      out.push(...flattenVerifyLaneScripts(scriptName, seen));
      continue;
    }
    out.push(scriptName);
  }
  seen.delete(normalized);
  return out;
}

export function flattenVerifyLanePlan(laneNames, { dedupe = true } = {}) {
  const values = Array.isArray(laneNames) ? laneNames : [laneNames];
  const normalizedLaneNames = values.map(value => normalizeVerifyLaneName(value)).filter(Boolean);
  if (!normalizedLaneNames.length) {
    throw new Error('[WardrobePro] at least one verify lane name is required.');
  }

  const scripts = [];
  const seenScripts = new Set();
  for (const laneName of normalizedLaneNames) {
    for (const scriptName of flattenVerifyLaneScripts(laneName)) {
      if (dedupe && seenScripts.has(scriptName)) continue;
      scripts.push(scriptName);
      seenScripts.add(scriptName);
    }
  }

  return {
    laneNames: normalizedLaneNames,
    scripts,
  };
}
