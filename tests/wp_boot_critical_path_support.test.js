import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bootStepSubsystem,
  classifyBootStep,
  createBootCriticalPathRows,
} from '../tools/wp_boot_critical_path_support.js';

test('boot critical-path classification keeps foundation steps blocking and candidates provisional', () => {
  assert.deepEqual(classifyBootStep('boot.step.kernel.install'), {
    category: 'A',
    confidence: 'high for the current shell contract',
    mustBlockReact: 'yes',
    mustBlockFirstRender: 'yes',
    strategy: 'Keep on the pre-React foundation path.',
    risk: 'high: canonical App/store/kernel/UI surfaces are consumed during shell mount',
  });
  assert.equal(classifyBootStep('services.canvasPicking').category, 'C');
  assert.equal(classifyBootStep('services.canvasPicking').mustBlockReact, 'unknown');
  assert.equal(classifyBootStep('services.cloudSync').mustBlockFirstRender, 'unknown');
  assert.equal(classifyBootStep('platform.renderLoop').category, 'B');
});

test('boot critical-path rows join stable timings to subsystem attribution without claiming savings', () => {
  const rows = createBootCriticalPathRows(
    {
      bootSteps: [
        {
          name: 'boot.step.services.canvasPicking',
          durationMs: { samples: [0.1, 0.2, 0.3], median: 0.2 },
        },
      ],
    },
    {
      subsystemAttribution: [{ subsystem: 'canvas picking', renderedBytes: 1538754, moduleCount: 413 }],
    }
  );
  assert.equal(bootStepSubsystem('boot.step.services.canvasPicking'), 'canvas picking');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].subsystemRenderedBytes, 1538754);
  assert.equal(rows[0].subsystemModuleCount, 413);
  assert.equal(rows[0].durationMs.median, 0.2);
  assert.equal(rows[0].category, 'C');
});
