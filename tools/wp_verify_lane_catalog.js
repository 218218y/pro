function testGroup(name) {
  return Object.freeze({ kind: 'test-group', name });
}

function packageScript(name) {
  return Object.freeze({ kind: 'package-script', name });
}

const SURFACE_GUARD_SCRIPTS = Object.freeze(['contract:layers', 'contract:api']);

function defineLane({ groups = [], scripts = [] }) {
  return Object.freeze([...groups.map(testGroup), ...scripts.map(packageScript)]);
}

function guardedLane(groups, typecheckScripts = ['typecheck']) {
  return defineLane({
    groups,
    scripts: [...typecheckScripts, ...SURFACE_GUARD_SCRIPTS],
  });
}

export const VERIFY_LANE_CATALOG = Object.freeze({
  'app-boot-project-family-core': guardedLane(['app-boot-project-family-core']),
  'browser-feedback-family-core': guardedLane(['browser-feedback-family-contracts']),
  'builder-support-surfaces': guardedLane(['builder-support-surfaces']),
  'builder-surface-family-core': guardedLane([
    'builder-surface-family-core',
    'builder-surfaces',
    'builder-support-surfaces',
  ]),
  'builder-surfaces': guardedLane(['builder-surfaces']),
  'canonical-access-surfaces': guardedLane(['canonical-access-surfaces']),
  'canvas-family': guardedLane([
    'visual-surface-family-contracts',
    'canvas-interaction-surfaces',
    'canvas-surfaces',
    'sketch-surfaces',
  ]),
  'canvas-interaction-surfaces': guardedLane(['canvas-interaction-surfaces']),
  'canvas-surfaces': guardedLane(['canvas-surfaces']),
  'cloud-sync-family-core': guardedLane(['cloud-sync-family-contracts', 'cloud-sync-surfaces']),
  'cloud-sync-surfaces': guardedLane(['cloud-sync-surfaces']),
  'domain-surfaces': guardedLane(['domain-surfaces']),
  'door-build-surfaces': guardedLane(['door-build-surfaces']),
  'export-overlay-errors-family-core': guardedLane(['export-overlay-errors-family-contracts']),
  'layout-tab-family': guardedLane(['structure-tab-family-contracts', 'tab-surfaces', 'builder-surfaces']),
  'no-main-surfaces': guardedLane(['no-main-surfaces']),
  'order-pdf-surfaces': guardedLane(['order-pdf-surfaces']),
  'overlay-export-family': guardedLane([
    'export-overlay-errors-family-contracts',
    'overlay-export-family-runtime',
    'order-pdf-surfaces',
  ]),
  'perf-smoke': defineLane({ groups: [], scripts: ['perf:smoke'] }),
  'perf-toolchain-core': defineLane({ groups: ['perf-toolchain-core'], scripts: [] }),
  'project-surfaces': guardedLane(['project-surfaces']),
  'public-surfaces': guardedLane(['public-surfaces']),
  'render-family': guardedLane([
    'visual-surface-family-contracts',
    'render-surfaces',
    'builder-support-surfaces',
    'sketch-surfaces',
    'tab-surfaces',
  ]),
  'render-surfaces': guardedLane(['render-surfaces']),
  'residual-families-core': guardedLane(['residual-families-core']),
  'runtime-access-surfaces': guardedLane(['runtime-access-surfaces']),
  'runtime-platform-core-family-core': guardedLane([
    'runtime-platform-core-family-core',
    'state-config-kernel-surfaces',
  ]),
  'runtime-surface-family-core': guardedLane(['runtime-surface-family-core']),
  'service-canonical-surfaces': guardedLane(['service-canonical-surfaces']),
  'sketch-surfaces': guardedLane(['sketch-surfaces']),
  'state-config-kernel-surfaces': guardedLane(['state-config-kernel-surfaces']),
  'structure-tab-family-core': guardedLane(['structure-tab-family-core', 'tab-surfaces']),
  'tab-surfaces': guardedLane(['tab-surfaces']),
  'toolchain-surfaces': defineLane({ groups: ['toolchain-surfaces'], scripts: [] }),
  'ui-dist-probe': defineLane({ groups: [], scripts: ['typecheck'] }),
  'ui-lean-core': guardedLane(['ui-lean-contracts'], ['typecheck:ui-lean']),
  'ui-portable-core': guardedLane(['ui-portable-typecheck-contracts'], ['typecheck', 'typecheck:ui-lean']),
  'ui-react-import-hardening-core': guardedLane(
    ['ui-react-import-hardening-contracts', 'ui-type-hardening-contracts'],
    []
  ),
  'ui-react-jsx-hardening-core': guardedLane(
    [
      'ui-react-import-hardening-contracts',
      'ui-react-jsx-hardening-contracts',
      'ui-type-hardening-contracts',
    ],
    []
  ),
  'ui-type-hardening-core': guardedLane(
    ['ui-type-hardening-contracts', 'export-overlay-errors-family-contracts'],
    []
  ),
  'visual-surface-family-core': guardedLane(['visual-surface-family-contracts']),
});

export function listVerifyLaneNames() {
  return Object.keys(VERIFY_LANE_CATALOG).sort();
}

export function normalizeVerifyLaneName(name) {
  return typeof name === 'string' ? name.trim() : '';
}

export function readVerifyLaneTasks(laneName) {
  const normalized = normalizeVerifyLaneName(laneName);
  const tasks = VERIFY_LANE_CATALOG[normalized];
  return Array.isArray(tasks) ? tasks.map(task => ({ ...task })) : null;
}

export function verifyTaskKey(task) {
  return `${task.kind}:${task.name}`;
}

export function formatVerifyTask(task) {
  if (task.kind === 'test-group') return `test-group:${task.name}`;
  if (task.kind === 'package-script') return `npm:${task.name}`;
  return `${task.kind}:${task.name}`;
}

export function flattenVerifyLaneTasks(laneName) {
  const normalized = normalizeVerifyLaneName(laneName);
  if (!normalized) throw new Error('[WardrobePro] verify lane name is required.');
  const tasks = readVerifyLaneTasks(normalized);
  if (!tasks) throw new Error(`[WardrobePro] unknown verify lane: ${normalized}`);
  return tasks;
}

export function flattenVerifyLanePlan(laneNames, { dedupe = true } = {}) {
  const values = Array.isArray(laneNames) ? laneNames : [laneNames];
  const normalizedLaneNames = values.map(value => normalizeVerifyLaneName(value)).filter(Boolean);
  if (!normalizedLaneNames.length) {
    throw new Error('[WardrobePro] at least one verify lane name is required.');
  }

  const tasks = [];
  const seenTasks = new Set();
  for (const laneName of normalizedLaneNames) {
    for (const task of flattenVerifyLaneTasks(laneName)) {
      const key = verifyTaskKey(task);
      if (dedupe && seenTasks.has(key)) continue;
      tasks.push(task);
      seenTasks.add(key);
    }
  }

  return {
    laneNames: normalizedLaneNames,
    tasks,
  };
}
