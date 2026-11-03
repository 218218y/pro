import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import {
  startBrowserPerfServer,
  stopBrowserPerfServer,
  waitForBrowserPerfServer,
} from '../tools/wp_browser_perf_server.mjs';

test(
  'browser perf readiness aborts a server that accepts requests without responding',
  { timeout: 5000 },
  async () => {
    const server = http.createServer(() => {});
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      assert.equal(await waitForBrowserPerfServer(`http://127.0.0.1:${server.address().port}`, 150), false);
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
);

test(
  'browser perf awaits owned server termination and tolerates repeated disposal',
  { timeout: 10000 },
  async () => {
    const child = startBrowserPerfServer(
      { command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'], shell: false },
      { cwd: process.cwd() }
    );
    await once(child, 'spawn');
    await stopBrowserPerfServer(child);
    assert.ok(child.exitCode !== null || child.signalCode !== null);
    await stopBrowserPerfServer(child);
  }
);
