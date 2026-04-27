export const requiredRuntimeMetrics = [
  'boot.browser.setup',
  'boot.react.mount.reactSidebarRoot',
  'project.save',
  'project.load',
  'project.resetDefault',
  'project.restoreLastSession',
  'export.snapshot',
  'export.copy',
  'export.renderSketch',
  'export.dual',
  'render.globalClick.toggle',
  'render.sketchMode.toggle',
  'render.notes.toggle',
  'structure.dimensions.width.commit',
  'structure.dimensions.height.commit',
  'structure.dimensions.depth.commit',
  'design.savedColor.add',
  'design.savedColor.delete',
  'cloudSync.floatingSync.toggle',
  'orderPdf.open',
  'orderPdf.close',
  'settingsBackup.export',
  'settingsBackup.import',
];

export const happyPathMetricsWithoutErrors = [
  'project.save',
  'project.resetDefault',
  'project.restoreLastSession',
  'export.snapshot',
  'export.copy',
  'export.renderSketch',
  'export.dual',
  'render.globalClick.toggle',
  'render.sketchMode.toggle',
  'render.notes.toggle',
  'structure.dimensions.width.commit',
  'structure.dimensions.height.commit',
  'structure.dimensions.depth.commit',
  'design.savedColor.add',
  'design.savedColor.delete',
  'cloudSync.floatingSync.toggle',
  'orderPdf.open',
  'orderPdf.close',
  'settingsBackup.export',
];

export const requiredProjectActions = ['save', 'load', 'reset-default', 'restore-last-session'];

export const requiredUserJourneys = [
  'boot-and-shell',
  'cabinet-core-authoring',
  'cabinet-build-variants',
  'cabinet-door-drawer-authoring',
  'export-authoring',
  'settings-backup-resilience',
  'cloud-sync-controls',
  'order-pdf-lifecycle',
  'project-roundtrip',
  'project-recovery-proveout',
];

export const requiredUserJourneyMinimumStepCounts = {
  'boot-and-shell': 2,
  'cabinet-core-authoring': 2,
  'cabinet-build-variants': 4,
  'cabinet-door-drawer-authoring': 4,
  'export-authoring': 5,
  'settings-backup-resilience': 2,
  'cloud-sync-controls': 2,
  'order-pdf-lifecycle': 2,
  'project-roundtrip': 4,
  'project-recovery-proveout': 3,
};

export const requiredRuntimeDomains = [
  'boot',
  'project',
  'structure',
  'design',
  'export',
  'render',
  'cloud-sync',
  'order-pdf',
  'settings-backup',
];

export const requiredRuntimeMetricMinimumCounts = {
  'export.copy': 3,
  'export.renderSketch': 3,
  'export.dual': 3,
  'orderPdf.open': 3,
  'orderPdf.close': 3,
  'settingsBackup.export': 1,
  'settingsBackup.import': 6,
  'project.load': 6,
  'project.restoreLastSession': 6,
  'structure.dimensions.width.commit': 7,
  'structure.dimensions.height.commit': 7,
  'structure.dimensions.depth.commit': 7,
  'design.savedColor.add': 5,
  'design.savedColor.delete': 3,
};

export const requiredRuntimeOutcomeCoverage = {
  'project.load': { ok: 1, error: 1 },
  'project.restoreLastSession': { ok: 1, mark: 1 },
  'settingsBackup.import': { ok: 2, error: 1 },
};

export const requiredRuntimeStatusTransitions = {
  'project.load': { 'ok->error': 1, 'error->ok': 1 },
  'project.restoreLastSession': { 'ok->mark': 1, 'mark->ok': 1 },
  'settingsBackup.import': { 'ok->error': 1, 'error->ok': 1 },
};

export const requiredRuntimeRecoverySequences = {
  'project.load': {
    recoveredCount: 1,
    stableRecoveryCount: 1,
    cleanRecoveryCount: 1,
    minPostRecoveryOkStreak: 3,
    maxRecoverySpanEntries: 1,
    maxRelapseCount: 0,
    unresolvedCount: 0,
  },
  'project.restoreLastSession': {
    recoveredCount: 1,
    stableRecoveryCount: 1,
    cleanRecoveryCount: 1,
    minPostRecoveryOkStreak: 3,
    maxRecoverySpanEntries: 1,
    maxRelapseCount: 0,
    unresolvedCount: 0,
  },
  'settingsBackup.import': {
    recoveredCount: 1,
    stableRecoveryCount: 1,
    cleanRecoveryCount: 1,
    minPostRecoveryOkStreak: 3,
    maxRecoverySpanEntries: 1,
    maxRelapseCount: 0,
    unresolvedCount: 0,
  },
};
