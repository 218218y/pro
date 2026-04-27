import fs from 'node:fs';
import path from 'node:path';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function looksLikeNodeScript(filePath) {
  if (!isNonEmptyString(filePath)) return false;
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.js' || ext === '.cjs' || ext === '.mjs';
}

function quotePosixShellArg(value) {
  const text = String(value ?? '');
  if (!text.length) return "''";
  if (/^[A-Za-z0-9_./:=+-]+$/.test(text)) return text;
  return `'${text.replace(/'/g, `'\"'\"'`)}'`;
}

function quoteWindowsCommandArg(value) {
  const text = String(value ?? '');
  if (!text.length) return '""';
  if (/^[A-Za-z0-9_./:=+-]+$/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

export function resolveNpmRunLaunchOptions(scriptName, options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const nodeExecPath = options.nodeExecPath || process.execPath;
  const existsSync = options.existsSync || fs.existsSync;
  const comspec = isNonEmptyString(options.comspec)
    ? options.comspec
    : isNonEmptyString(env?.ComSpec)
      ? env.ComSpec
      : 'cmd.exe';
  const npmExecPath = isNonEmptyString(options.npmExecPath)
    ? options.npmExecPath
    : isNonEmptyString(env?.npm_execpath)
      ? env.npm_execpath
      : '';

  if (looksLikeNodeScript(npmExecPath) && existsSync(npmExecPath)) {
    return {
      command: nodeExecPath,
      args: [npmExecPath, 'run', scriptName],
      shell: false,
    };
  }

  if (platform === 'win32') {
    return {
      command: comspec,
      args: ['/d', '/s', '/c', 'npm', 'run', scriptName],
      shell: false,
    };
  }

  return {
    command: 'npm',
    args: ['run', scriptName],
    shell: false,
  };
}

export function resolveNpmRunCommandString(scriptName, options = {}) {
  const platform = options.platform || process.platform;
  const launch = resolveNpmRunLaunchOptions(scriptName, options);
  const quote = platform === 'win32' ? quoteWindowsCommandArg : quotePosixShellArg;
  return [launch.command, ...launch.args].map(quote).join(' ');
}
