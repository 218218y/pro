#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const {
  REPORT_JSON_PATH,
  buildMarkdownReport,
  validateCloseoutPayload,
} = require('./wp_verify_closeout_support.cjs');

function readOption(argv, name, fallback = null) {
  const prefix = `${name}=`;
  const inline = argv.find(arg => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

export function buildCanonicalVerificationSummary(projectRoot = process.cwd()) {
  const sourcePath = path.resolve(projectRoot, REPORT_JSON_PATH);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`[verification-summary] missing ${REPORT_JSON_PATH}; run npm run verify:closeout:write`);
  }
  const payload = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const errors = validateCloseoutPayload(payload, { projectRoot });
  if (errors.length) {
    throw new Error(
      `[verification-summary] stale or invalid ${REPORT_JSON_PATH}\n- ${errors.join('\n- ')}\n` +
        '[verification-summary] rerun an appropriate verify:closeout profile; do not refresh this report without executing its lanes'
    );
  }
  return {
    payload,
    markdown: buildMarkdownReport(payload),
  };
}

export function writeCanonicalVerificationSummary({ projectRoot = process.cwd(), jsonOut, markdownOut }) {
  const { payload, markdown } = buildCanonicalVerificationSummary(projectRoot);
  fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOut), { recursive: true });
  fs.writeFileSync(jsonOut, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownOut, markdown, 'utf8');
}

function main() {
  const argv = process.argv.slice(2);
  const projectRoot = process.cwd();
  const jsonOut = readOption(argv, '--json-out');
  const markdownOut = readOption(argv, '--md-out');
  if (!jsonOut || !markdownOut) {
    throw new Error('[verification-summary] --json-out and --md-out are required');
  }
  writeCanonicalVerificationSummary({
    projectRoot,
    jsonOut: path.resolve(projectRoot, jsonOut),
    markdownOut: path.resolve(projectRoot, markdownOut),
  });
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  try {
    main();
  } catch (error) {
    console.error(error && error.message ? error.message : error);
    process.exitCode = 1;
  }
}
