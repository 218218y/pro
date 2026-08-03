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

export { normalizeProjectModuleStem };
