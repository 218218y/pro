#!/usr/bin/env node

function tokenizeNodeOptions(raw) {
  const src = String(raw || '');
  const out = [];
  let cur = '';
  let quote = '';
  let escape = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (escape) {
      cur += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (quote) {
      if (ch === quote) {
        quote = '';
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) {
        out.push(cur);
        cur = '';
      }
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function isLikelyValidLocalStoragePath(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  if (v === 'true' || v === 'false' || v === 'null' || v === 'undefined') return false;
  if (v.startsWith('--')) return false;
  return true;
}

export function sanitizeNodeOptions(raw) {
  const tokens = tokenizeNodeOptions(raw);
  if (!tokens.length) return { value: '', removedInvalidLocalStorageFile: false };

  const kept = [];
  let removedInvalidLocalStorageFile = false;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === '--localstorage-file') {
      const next = tokens[i + 1];
      if (isLikelyValidLocalStoragePath(next)) {
        kept.push(token, next);
        i += 1;
      } else {
        removedInvalidLocalStorageFile = true;
      }
      continue;
    }
    if (token.startsWith('--localstorage-file=')) {
      const value = token.slice('--localstorage-file='.length);
      if (isLikelyValidLocalStoragePath(value)) kept.push(token);
      else removedInvalidLocalStorageFile = true;
      continue;
    }
    kept.push(token);
  }

  return {
    value: kept.join(' '),
    removedInvalidLocalStorageFile,
  };
}

const NODE_OPTION_ENV_KEYS = ['NODE_OPTIONS', 'npm_config_node_options', 'NPM_CONFIG_NODE_OPTIONS'];

export function sanitizeNodeOptionEnvVars(baseEnv) {
  const env = { ...(baseEnv || process.env) };
  const touchedKeys = [];
  let removedInvalidLocalStorageFile = false;

  for (const key of NODE_OPTION_ENV_KEYS) {
    if (!(key in env)) continue;
    const parsed = sanitizeNodeOptions(env[key] || '');
    if (parsed.removedInvalidLocalStorageFile) {
      removedInvalidLocalStorageFile = true;
      touchedKeys.push(key);
    }
    if (!parsed.value) delete env[key];
    else env[key] = parsed.value;
  }

  return {
    env,
    removedInvalidLocalStorageFile,
    touchedKeys,
  };
}

export function createSanitizedChildEnv(baseEnv) {
  return sanitizeNodeOptionEnvVars(baseEnv);
}
