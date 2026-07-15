#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STORE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const VALID_ENVIRONMENTS = new Set(['production', 'development']);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultConfigPath = path.join(repoRoot, 'supabase', 'cloud_sync_origins.json');

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateOriginMap(value, label) {
  if (!isRecord(value)) {
    throw new Error(`${label} must be a JSON object`);
  }

  const result = new Map();
  for (const [origin, storeId] of Object.entries(value)) {
    let normalizedOrigin = '';
    try {
      normalizedOrigin = new URL(origin).origin;
    } catch {
      throw new Error(`${label} contains an invalid origin: ${origin}`);
    }

    if (normalizedOrigin !== origin) {
      throw new Error(`${label} origin must be exact (scheme + host + optional port, no path): ${origin}`);
    }
    if (typeof storeId !== 'string' || !STORE_PATTERN.test(storeId)) {
      throw new Error(`${label} contains an invalid store id for ${origin}`);
    }
    result.set(origin, storeId);
  }
  return result;
}

export function loadOriginConfig(configPath = defaultConfigPath) {
  const parsed = JSON.parse(readFileSync(configPath, 'utf8'));
  if (!isRecord(parsed)) throw new Error('Cloud Sync origin config must be a JSON object');

  return {
    production: validateOriginMap(parsed.production, 'production'),
    development: validateOriginMap(parsed.development, 'development'),
  };
}

export function resolveOriginStores(environment = 'production', configPath = defaultConfigPath) {
  if (!VALID_ENVIRONMENTS.has(environment)) {
    throw new Error(`Unsupported environment '${environment}'. Use production or development.`);
  }

  const config = loadOriginConfig(configPath);
  const merged = new Map(config.production);
  if (environment === 'development') {
    for (const [origin, storeId] of config.development) {
      const existingStoreId = merged.get(origin);
      if (existingStoreId && existingStoreId !== storeId) {
        throw new Error(`Origin ${origin} is assigned to two different stores`);
      }
      merged.set(origin, storeId);
    }
  }
  return Object.fromEntries(merged);
}

function readEnvironmentArg(argv) {
  const index = argv.indexOf('--environment');
  if (index === -1) return 'production';
  const value = String(argv[index + 1] || '')
    .trim()
    .toLowerCase();
  if (!value) throw new Error('--environment requires production or development');
  return value;
}

function isDirectRun() {
  return !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  try {
    const environment = readEnvironmentArg(process.argv.slice(2));
    process.stdout.write(JSON.stringify(resolveOriginStores(environment)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
