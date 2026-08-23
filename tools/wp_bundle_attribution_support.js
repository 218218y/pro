function normalizeModuleId(value) {
  return String(value || '')
    .replaceAll('\\', '/')
    .toLowerCase();
}

export function classifyInitialModuleSubsystem(moduleId) {
  const id = normalizeModuleId(moduleId);
  if (/\/node_modules\/(?:react|react-dom|scheduler|zustand|use-sync-external-store)\//u.test(id)) {
    return 'React/UI vendor';
  }
  if (id.includes('/node_modules/')) return 'other vendor';
  if (id.includes('/canvas_picking')) return 'canvas picking';
  if (id.includes('/cloud_sync')) return 'cloud sync';
  if (id.includes('measurement')) return 'measurement';
  if (id.includes('/notes') || id.includes('_notes')) return 'notes';
  if (
    id.includes('/native/io/') ||
    /\/(?:project_io|project_load|project_save|project_capture|runtime_config)/u.test(id)
  ) {
    return 'project IO/config';
  }
  if (id.includes('/native/builder/')) return 'builder';
  if (id.includes('/native/ui/react/')) return 'React/UI app';
  if (id.includes('/native/ui/')) return 'UI interactions';
  if (id.includes('/native/runtime/')) return 'runtime';
  if (id.includes('/native/platform/')) return 'platform';
  if (id.includes('/native/kernel/')) return 'kernel/state';
  if (id.includes('/room') || id.includes('room_')) return 'room';
  if (id.includes('/native/services/')) return 'other services';
  if (id.includes('/native/data/')) return 'data';
  if (id.includes('/native/adapters/')) return 'adapters';
  if (id.includes('/esm/boot/') || /\/esm\/(?:main|release_main)\./u.test(id)) return 'boot/entry';
  return 'other app';
}

export function createInitialBundleSubsystemSummary(chunks, staticClosure) {
  const closure = staticClosure instanceof Set ? staticClosure : new Set(staticClosure || []);
  const buckets = new Map();
  for (const chunk of Array.isArray(chunks) ? chunks : []) {
    if (!closure.has(chunk?.fileName)) continue;
    for (const [moduleId, info] of Object.entries(chunk.modules || {})) {
      const subsystem = classifyInitialModuleSubsystem(moduleId);
      const bucket = buckets.get(subsystem) || { subsystem, moduleCount: 0, renderedBytes: 0 };
      bucket.moduleCount += 1;
      bucket.renderedBytes += Math.max(0, Number(info?.renderedLength) || 0);
      buckets.set(subsystem, bucket);
    }
  }
  return Array.from(buckets.values()).sort((left, right) => {
    if (right.renderedBytes !== left.renderedBytes) return right.renderedBytes - left.renderedBytes;
    return left.subsystem.localeCompare(right.subsystem);
  });
}
