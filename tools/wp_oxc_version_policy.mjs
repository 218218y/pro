function fail(message) {
  throw new Error(`[oxc-version-policy] ${message}`);
}

function parseExactSemver(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(String(value || ''));
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    version: `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`,
  };
}

function compareVersions(left, right) {
  const leftVersion = typeof left === 'string' ? parseExactSemver(left) : left;
  const rightVersion = typeof right === 'string' ? parseExactSemver(right) : right;
  if (!leftVersion || !rightVersion) return Number.NaN;
  for (const key of ['major', 'minor', 'patch']) {
    if (leftVersion[key] !== rightVersion[key]) return leftVersion[key] - rightVersion[key];
  }
  return 0;
}

function parseBoundedSemverRange(range) {
  const match = /^>=(\d+\.\d+\.\d+) <(\d+\.\d+\.\d+)$/u.exec(String(range || '').trim());
  if (!match) return null;
  const min = parseExactSemver(match[1]);
  const max = parseExactSemver(match[2]);
  if (!min || !max || compareVersions(min, max) >= 0) return null;
  return {
    minVersion: min.version,
    maxExclusiveVersion: max.version,
    boundedRange: `>=${min.version} <${max.version}`,
  };
}

function versionSatisfiesBoundedRange(version, range) {
  const policy = typeof range === 'string' ? parseBoundedSemverRange(range) : range;
  if (!policy) return false;
  const parsed = parseExactSemver(version);
  const min = parseExactSemver(policy.minVersion);
  const max = parseExactSemver(policy.maxExclusiveVersion);
  if (!parsed || !min || !max) return false;
  return compareVersions(parsed, min) >= 0 && compareVersions(parsed, max) < 0;
}

function parseOxcManifestRange(range) {
  const value = String(range || '').trim();
  const caretMatch = /^\^0\.(\d+)\.(\d+)$/u.exec(value);
  if (caretMatch) {
    const minor = Number(caretMatch[1]);
    const patch = Number(caretMatch[2]);
    const minVersion = `0.${minor}.${patch}`;
    const maxExclusiveVersion = `0.${minor + 1}.0`;
    return {
      manifestRange: value,
      minVersion,
      maxExclusiveVersion,
      boundedRange: `>=${minVersion} <${maxExclusiveVersion}`,
    };
  }

  const boundedMatch = /^>=0\.(\d+)\.(\d+) <0\.(\d+)\.0$/u.exec(value);
  if (boundedMatch) {
    const minMinor = Number(boundedMatch[1]);
    const minPatch = Number(boundedMatch[2]);
    const maxMinor = Number(boundedMatch[3]);
    if (maxMinor !== minMinor + 1) return null;
    const minVersion = `0.${minMinor}.${minPatch}`;
    const maxExclusiveVersion = `0.${maxMinor}.0`;
    return {
      manifestRange: value,
      minVersion,
      maxExclusiveVersion,
      boundedRange: `>=${minVersion} <${maxExclusiveVersion}`,
    };
  }

  return null;
}

function versionSatisfiesOxcPolicy(version, policy) {
  if (!policy) return false;
  const parsed = parseExactSemver(version);
  const min = parseExactSemver(policy.minVersion);
  const max = parseExactSemver(policy.maxExclusiveVersion);
  if (!parsed || !min || !max) return false;
  return compareVersions(parsed, min) >= 0 && compareVersions(parsed, max) < 0;
}

function dependencyCandidates(lockPath, dependencyName) {
  const candidates = [`${lockPath}/node_modules/${dependencyName}`];
  let current = lockPath;
  while (current.includes('/node_modules/')) {
    current = current.slice(0, current.lastIndexOf('/node_modules/'));
    if (current) candidates.push(`${current}/node_modules/${dependencyName}`);
  }
  candidates.push(`node_modules/${dependencyName}`);
  return [...new Set(candidates)];
}

function resolveDependencyLockPath(packages, fromLockPath, dependencyName) {
  return dependencyCandidates(fromLockPath, dependencyName).find(candidate => packages[candidate]) ?? null;
}

function resolveOxcLockGraph(lock) {
  const packages = lock?.packages;
  if (!packages || typeof packages !== 'object') fail('package-lock.json has no packages map');

  const parserPath = 'node_modules/oxc-parser';
  const parser = packages[parserPath];
  if (!parser) fail(`${parserPath} is missing from package-lock.json`);
  const version = parser.version;
  if (!parseExactSemver(version)) fail(`${parserPath} has an invalid version`);

  const typesRange = parser.dependencies?.['@oxc-project/types'];
  if (typeof typesRange !== 'string' || typesRange.length === 0) {
    fail(`${parserPath} has no @oxc-project/types dependency`);
  }
  const typesPath = resolveDependencyLockPath(packages, parserPath, '@oxc-project/types');
  if (!typesPath) fail(`cannot resolve @oxc-project/types for ${parserPath}`);
  if (packages[typesPath]?.version !== version) {
    fail(
      `resolved ${typesPath} ${packages[typesPath]?.version ?? 'missing'} does not match oxc-parser ${version}`
    );
  }

  const bindingName = '@oxc-parser/binding-linux-x64-gnu';
  const bindingRange = parser.optionalDependencies?.[bindingName];
  if (bindingRange !== version) {
    fail(
      `${parserPath} optional ${bindingName} must be exactly ${version}; found ${bindingRange ?? 'missing'}`
    );
  }
  const bindingPath = resolveDependencyLockPath(packages, parserPath, bindingName);
  if (!bindingPath) fail(`cannot resolve ${bindingName} for ${parserPath}`);
  if (packages[bindingPath]?.version !== version) {
    fail(
      `resolved ${bindingPath} ${packages[bindingPath]?.version ?? 'missing'} does not match oxc-parser ${version}`
    );
  }

  return {
    version,
    parserPath,
    typesPath,
    bindingPath,
    lockPaths: [parserPath, typesPath, bindingPath],
  };
}

export {
  compareVersions,
  parseBoundedSemverRange,
  parseExactSemver,
  parseOxcManifestRange,
  resolveDependencyLockPath,
  resolveOxcLockGraph,
  versionSatisfiesBoundedRange,
  versionSatisfiesOxcPolicy,
};
