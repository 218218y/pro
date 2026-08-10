import { expect, test } from '@playwright/test';

import { PLAYWRIGHT_CRITICAL_MATRIX_PROFILES } from '../../tools/wp_playwright_matrix_profiles.js';
import {
  collectRuntimeIssues,
  expectNoRuntimeIssues,
  gotoSmokeApp,
  openMainTab,
  readStructureDimensions,
  setStructureDimension,
} from './helpers/project_flows';
import {
  expectCriticalMatrixBrowserProfile,
  expectHealthySceneGeometry,
  expectPrimaryViewportGeometry,
  readSceneGeometrySnapshot,
} from './helpers/critical_matrix';

test.describe('Targeted critical browser matrix', () => {
  for (const profile of PLAYWRIGHT_CRITICAL_MATRIX_PROFILES) {
    test.describe(profile.name, () => {
      test.use({
        viewport: profile.viewport,
        deviceScaleFactor: profile.deviceScaleFactor,
        hasTouch: profile.hasTouch,
        contextOptions: {
          reducedMotion: profile.reducedMotion,
        },
      });

      test('shell, authoring and deterministic scene geometry stay valid @critical @matrix', async ({
        page,
      }) => {
        const issues = collectRuntimeIssues(page);
        await gotoSmokeApp(page);

        await expectCriticalMatrixBrowserProfile(page, profile.name);
        await expectPrimaryViewportGeometry(page);

        for (const tab of ['structure', 'design', 'interior', 'settings'] as const) {
          await openMainTab(page, tab);
        }

        const baseline = await readSceneGeometrySnapshot(page);
        expectHealthySceneGeometry(baseline);
        const repeatedBaseline = await readSceneGeometrySnapshot(page);
        expect(repeatedBaseline.fingerprint).toBe(baseline.fingerprint);

        const { width } = await readStructureDimensions(page);
        const nextWidth = Math.max(90, Math.round(width) + 7);
        await setStructureDimension(page, 'width', nextWidth);

        await expect
          .poll(async () => (await readSceneGeometrySnapshot(page)).fingerprint, {
            message: 'a real structure edit should produce a new deterministic scene fingerprint',
          })
          .not.toBe(baseline.fingerprint);

        const afterAuthoring = await readSceneGeometrySnapshot(page);
        expectHealthySceneGeometry(afterAuthoring);
        expect(afterAuthoring.fingerprint).not.toBe(baseline.fingerprint);

        expectNoRuntimeIssues(issues);
      });
    });
  }
});
