import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const currentFilePath = fileURLToPath(import.meta.url);
const toolsDir = path.dirname(currentFilePath);
const projectRoot = path.dirname(toolsDir);
const viteBinPath = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');

const child = spawn(
  process.execPath,
  [viteBinPath, '--host', '127.0.0.1', '--port', '5174', '--strictPort'],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_WP_SUPABASE_REALTIME: 'false',
    },
  }
);

const forwardSignal = signal => {
  if (!child.killed) child.kill(signal);
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

const exitCode = await new Promise(resolve => {
  child.once('exit', (code, signal) => {
    if (typeof code === 'number') {
      resolve(code);
      return;
    }
    resolve(signal ? 1 : 0);
  });
});

process.exit(exitCode);
