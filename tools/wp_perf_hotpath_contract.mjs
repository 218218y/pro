#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];
function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    checks.push(`${file}: cannot read (${error?.message || error})`);
    return '';
  }
}

const handlesApply = read('esm/native/builder/handles_apply.ts');
if (/performance\.now\s*\(|Date\.now\s*\(/.test(handlesApply)) {
  checks.push('esm/native/builder/handles_apply.ts: applyHandles hotpath must not keep unused timing probes');
}
if (!/runPlatformRenderFollowThrough\(App, \{ updateShadows: false \}\)/.test(handlesApply)) {
  checks.push(
    'esm/native/builder/handles_apply.ts: applyHandles must keep render follow-through on the platform owner'
  );
}

const schedulerShared = read('esm/native/builder/scheduler_shared.ts');
if (!/getBrowserTimers\(App\)/.test(schedulerShared)) {
  checks.push('esm/native/builder/scheduler_shared.ts: scheduler timers must use getBrowserTimers(App)');
}
if (/(^|[^A-Za-z0-9_$.])setTimeout\s*\(/m.test(schedulerShared)) {
  checks.push('esm/native/builder/scheduler_shared.ts: scheduler must not call global setTimeout directly');
}

const schedulerRuntime = read('esm/native/builder/scheduler_runtime.ts');
if (
  !/shouldSuppressSatisfiedRequest/.test(schedulerRuntime) ||
  !/shouldSuppressRepeatedExecute/.test(schedulerRuntime)
) {
  checks.push(
    'esm/native/builder/scheduler_runtime.ts: scheduler must keep request and execute dedupe gates'
  );
}

if (checks.length) {
  console.error('[perf-hotpath-contract] FAILED');
  for (const check of checks) console.error(`- ${check}`);
  process.exit(1);
}

console.log('[perf-hotpath-contract] ok');
