import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';

import prettierConfig from '../prettier.config.cjs';
import { buildRootRuntimeConfigSource, loadSiteProfile } from './wp_site_profiles.mjs';

export const ROOT_RUNTIME_CONFIG_FILE = 'wp_runtime_config.mjs';

export async function readExpectedRootRuntimeConfig(projectRoot = process.cwd()) {
  const profile = await loadSiteProfile(projectRoot, 'bargig');
  return await prettier.format(buildRootRuntimeConfigSource(profile), {
    ...prettierConfig,
    parser: 'babel',
  });
}

export async function writeRootRuntimeConfig(projectRoot = process.cwd()) {
  const target = path.join(projectRoot, ROOT_RUNTIME_CONFIG_FILE);
  const expected = await readExpectedRootRuntimeConfig(projectRoot);
  fs.writeFileSync(target, expected, 'utf8');
  return target;
}

export async function assertRootRuntimeConfigCurrent(projectRoot = process.cwd()) {
  const target = path.join(projectRoot, ROOT_RUNTIME_CONFIG_FILE);
  const expected = await readExpectedRootRuntimeConfig(projectRoot);
  const actual = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (actual === expected) return target;
  throw new Error(
    '[WP Runtime Config] wp_runtime_config.mjs is missing or stale. ' +
      'Run `npm run generate:runtime-config`; edit sites/bargig/site.profile.mjs, never the generated file.'
  );
}
