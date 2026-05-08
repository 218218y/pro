import { test } from '@playwright/test';

import { gotoSmokeApp } from './helpers/project_flows';

test('warm app shell before parallel smoke workers', async ({ page }) => {
  await gotoSmokeApp(page);
});
