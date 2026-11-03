import fs from 'node:fs';
import path from 'node:path';

export function collectBundledPackages(buildResults, { root, lock }) {
  const packages = new Map();
  for (const result of buildResults.flat()) {
    if (!Array.isArray(result?.output)) throw new Error('Missing bundler output for release audit');
    for (const chunk of result.output) {
      if (chunk.type !== 'chunk') continue;
      for (const id of Object.keys(chunk.modules)) {
        if (!id.replaceAll('\\', '/').includes('/node_modules/')) continue;
        const relative = path.relative(root, id.replace(/^\0/u, '').split('?')[0]).replaceAll('\\', '/');
        const match = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)(?:\/|$)/u.exec(relative);
        if (!match || relative.startsWith('../')) throw new Error(`Unmapped release dependency: ${id}`);
        const lockPath = match[1];
        if (packages.has(lockPath)) continue;
        const entry = lock.packages?.[lockPath];
        if (!entry?.version) throw new Error(`Release dependency missing from lockfile: ${lockPath}`);
        const installed = JSON.parse(fs.readFileSync(path.join(root, lockPath, 'package.json'), 'utf8'));
        if (installed.version !== entry.version)
          throw new Error(`Release dependency version mismatch: ${lockPath}`);
        packages.set(lockPath, {
          name: installed.name,
          version: entry.version,
          lockPath,
          dev: entry.dev === true,
        });
      }
    }
  }
  if (packages.size === 0) throw new Error('Release audit found no bundled npm packages');
  return [...packages.values()].sort((a, b) => a.lockPath.localeCompare(b.lockPath));
}

export function evaluateReleaseAudit(audit, packages) {
  if (
    audit?.error ||
    audit?.auditReportVersion !== 2 ||
    !audit.vulnerabilities ||
    typeof audit.vulnerabilities !== 'object' ||
    Array.isArray(audit.vulnerabilities)
  ) {
    throw new Error('Invalid npm audit response; release dependencies were not audited');
  }
  const paths = new Set(packages.map(entry => entry.lockPath));
  const findings = [];
  const severities = new Set(['info', 'low', 'moderate', 'high', 'critical']);
  for (const [name, issue] of Object.entries(audit.vulnerabilities)) {
    if (
      !Array.isArray(issue.nodes) ||
      issue.nodes.some(node => typeof node !== 'string') ||
      !severities.has(issue.severity)
    ) {
      throw new Error(`Invalid npm audit vulnerability: ${name}`);
    }
    const nodes = issue.nodes.filter(node => paths.has(node));
    if (nodes.length > 0) findings.push({ ...issue, nodes });
  }
  return {
    packages,
    findings,
    passed: !findings.some(issue => ['high', 'critical'].includes(issue.severity)),
  };
}
