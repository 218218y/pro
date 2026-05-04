import { test, expect } from '@playwright/test';

import {
  applyCellDimsToReachableLinearModuleViaBrowserPointer,
  collectRuntimeIssues,
  expectNoRuntimeIssues,
  gotoSmokeApp,
  readLinearModuleSpecialDims,
  resetAllCellDimsOverrides,
  setCellDimsDraft,
  setCellDimsMode,
} from './helpers/project_flows';

test.describe('Canvas pointer parity smoke', () => {
  test('browser hover and click apply cell dimensions to the same canvas target', async ({ page }) => {
    const issues = collectRuntimeIssues(page);
    await gotoSmokeApp(page);

    const expectedDims = {
      widthCm: 86,
      heightCm: 211,
      depthCm: 47,
    };

    await setCellDimsMode(page, true);
    await resetAllCellDimsOverrides(page);
    await setCellDimsDraft(page, 'cellDimsWidth', expectedDims.widthCm);
    await setCellDimsDraft(page, 'cellDimsHeight', expectedDims.heightCm);
    await setCellDimsDraft(page, 'cellDimsDepth', expectedDims.depthCm);

    const applied = await applyCellDimsToReachableLinearModuleViaBrowserPointer(page, expectedDims, {
      stack: 'top',
    });

    expect(applied.widthCm).toBe(expectedDims.widthCm);
    expect(applied.heightCm).toBe(expectedDims.heightCm);
    expect(applied.depthCm).toBe(expectedDims.depthCm);
    await expect.poll(async () => (await readLinearModuleSpecialDims(page, 'top')).length).toBe(1);

    expectNoRuntimeIssues(issues);
  });
});
