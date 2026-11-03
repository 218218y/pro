import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'vite';
import { buildDistModules } from './wp_bundle_dist.js';
import { createBundleBuildConfig } from './wp_bundle_emit.js';
import { createThreeVendorBuildConfig } from './wp_three_vendor_config.js';
import { resolveNpmRunLaunchOptions } from './wp_npm_spawn_support.js';
import { collectBundledPackages, evaluateReleaseAudit } from './wp_release_dependency_audit_support.mjs';

async function main() {
  const root = process.cwd();
  const outDir = path.join(root, '.artifacts/release-dependency-audit');
  buildDistModules(root, { forceDistRebuild: false });
  const configs = [
    createBundleBuildConfig({
      root,
      entryAbs: path.join(root, 'dist/esm/release_main.js'),
      tmpDirAbs: outDir,
      args: { buildMode: 'client', minify: true, sourcemap: false },
    }),
    createThreeVendorBuildConfig({
      root,
      entryAbs: path.join(root, 'tools/three_vendor_entry.js'),
      tmpDirAbs: outDir,
    }),
  ];
  const results = [];
  for (const config of configs) {
    config.build.write = false;
    results.push(await build(config));
  }
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const packages = collectBundledPackages(results, { root, lock });
  const launch = resolveNpmRunLaunchOptions('audit:toolchain');
  const runIndex = launch.args.indexOf('run');
  launch.args.splice(runIndex, 0, '--silent');
  const result = spawnSync(
    launch.command,
    [...launch.args, '--', '--include=dev', '--package-lock-only', '--json'],
    {
      cwd: root,
      encoding: 'utf8',
      shell: launch.shell,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    }
  );
  if (result.error || ![0, 1].includes(result.status)) {
    throw new Error(`npm audit failed: ${result.error?.message ?? result.stderr ?? result.status}`);
  }
  const report = evaluateReleaseAudit(JSON.parse(result.stdout), packages);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `[release-dependency-audit] ${packages.length} bundled packages audited, including ${
      packages
        .filter(entry => entry.dev)
        .map(entry => entry.name)
        .join(', ') || 'no dev-classified packages'
    }`
  );
  for (const issue of report.findings)
    console.log(`- ${issue.severity}: ${issue.name}: ${issue.nodes.join(', ')}`);
  if (!report.passed) process.exitCode = 1;
}

main().catch(error => {
  console.error(`[release-dependency-audit] ${error.message}`);
  process.exitCode = 1;
});
