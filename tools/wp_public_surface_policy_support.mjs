import path from 'node:path';

const sourceExtensionPattern = /\.(?:[cm]?[jt]sx?)$/u;

function stripQueryAndHash(specifier) {
  return String(specifier).split(/[?#]/u, 1)[0];
}

function normalizeProjectModuleStem(value) {
  let normalized = path.posix.normalize(String(value).replaceAll('\\', '/'));
  normalized = normalized.replace(sourceExtensionPattern, '');
  return normalized.replace(/^\.\//u, '');
}

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function retiredSurfacesForDomain(policy, domain) {
  const domainKey = isNonEmptyText(domain) ? domain.trim() : '';
  if (!domainKey) return [];
  const retiredSurfaces = Array.isArray(policy?.retiredSurfaces) ? policy.retiredSurfaces : [];
  return retiredSurfaces.filter(surface => surface?.domain === domainKey);
}

export function retiredSurfaceDomains(policy) {
  const out = new Map();
  const retiredSurfaces = Array.isArray(policy?.retiredSurfaces) ? policy.retiredSurfaces : [];
  for (const surface of retiredSurfaces) {
    const domain = isNonEmptyText(surface?.domain) ? surface.domain.trim() : '';
    if (!domain) continue;
    const entries = out.get(domain) ?? [];
    entries.push(surface);
    out.set(domain, entries);
  }
  return out;
}

export function publicSurfacePolicyViolations(policy) {
  const violations = [];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return ['public surface policy must be an object'];
  }
  if (policy.version !== 2) violations.push('public surface policy version must be 2');

  const retiredSurfaces = Array.isArray(policy.retiredSurfaces) ? policy.retiredSurfaces : [];
  if (!Array.isArray(policy.retiredSurfaces)) {
    violations.push('retiredSurfaces must be an array');
  }

  const seenPaths = new Set();
  for (let index = 0; index < retiredSurfaces.length; index += 1) {
    const surface = retiredSurfaces[index];
    const prefix = `retiredSurfaces[${index}]`;
    if (!surface || typeof surface !== 'object' || Array.isArray(surface)) {
      violations.push(`${prefix} must be an object`);
      continue;
    }
    for (const field of ['path', 'domain', 'kind', 'replacement', 'reason']) {
      if (!isNonEmptyText(surface[field])) violations.push(`${prefix}.${field} must be non-empty text`);
    }
    const pathValue = isNonEmptyText(surface.path) ? surface.path.trim() : '';
    if (pathValue) {
      if (seenPaths.has(pathValue)) violations.push(`${prefix}.path duplicates ${pathValue}`);
      seenPaths.add(pathValue);
    }
    const domain = isNonEmptyText(surface.domain) ? surface.domain.trim() : '';
    if (domain && !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(domain)) {
      violations.push(`${prefix}.domain must be a lowercase kebab-case identifier`);
    }
  }
  return violations;
}

export function retiredSurfaceStems(policy) {
  return new Set(
    (policy.retiredSurfaces ?? []).flatMap(surface => {
      const stem = normalizeProjectModuleStem(surface.path);
      return stem.endsWith('/index') ? [stem, stem.slice(0, -'/index'.length)] : [stem];
    })
  );
}

export function projectModuleStemFromSpecifier(fromFile, specifier) {
  const clean = stripQueryAndHash(specifier);
  if (clean.startsWith('@/')) return normalizeProjectModuleStem(`esm/${clean.slice(2)}`);
  if (clean.startsWith('/esm/')) return normalizeProjectModuleStem(clean.slice(1));
  if (!clean.startsWith('.')) return null;
  return normalizeProjectModuleStem(path.posix.join(path.posix.dirname(fromFile), clean));
}

export function retiredSurfaceForSpecifier(fromFile, specifier, policy) {
  const stem = projectModuleStemFromSpecifier(fromFile, specifier);
  if (!stem) return null;
  const retired = retiredSurfaceStems(policy);
  if (!retired.has(stem)) return null;
  return (
    (policy.retiredSurfaces ?? []).find(surface => {
      const surfaceStem = normalizeProjectModuleStem(surface.path);
      return stem === surfaceStem || (surfaceStem.endsWith('/index') && stem === surfaceStem.slice(0, -6));
    }) ?? null
  );
}

export function dimensionOwnerPublicBridgeViolations(fromFile, dependencies, policy, dimensionManifest) {
  const normalizedFromFile = normalizeProjectModuleStem(fromFile);
  if (normalizedFromFile.startsWith('esm/shared/dimensions/')) return [];

  const runtimeSurface = (policy.supportedSurfaces ?? []).find(surface => surface.scope === 'runtime');
  const runtimeStem = runtimeSurface ? normalizeProjectModuleStem(runtimeSurface.path) : null;
  const supportedSymbols = new Set(
    (dimensionManifest.symbols ?? []).map(entry => `${entry.kind}:${entry.name}`)
  );
  const violations = [];

  for (const dependency of dependencies) {
    if (!dependency.syntax?.endsWith('re-export')) continue;
    const targetStem = projectModuleStemFromSpecifier(fromFile, dependency.specifier);
    if (!targetStem?.startsWith('esm/shared/dimensions/')) continue;

    if (normalizedFromFile !== runtimeStem) {
      violations.push(
        `${fromFile} re-exports a dimension owner outside the supported Runtime surface (${dependency.specifier})`
      );
      continue;
    }
    if (dependency.importedSymbols.includes('*')) {
      violations.push(`${fromFile} wildcard re-exports dimension owner ${dependency.specifier}`);
      continue;
    }

    for (const binding of dependency.bindings) {
      if (binding.importedName !== binding.exportedName) {
        violations.push(
          `${fromFile} aliases dimension export ${binding.importedName} as ${binding.exportedName}`
        );
        continue;
      }
      const key = `${dependency.kind}:${binding.exportedName}`;
      if (!supportedSymbols.has(key)) {
        violations.push(`${fromFile} exposes unlisted dimension route ${key}`);
      }
    }
  }

  return violations;
}

export { normalizeProjectModuleStem };
