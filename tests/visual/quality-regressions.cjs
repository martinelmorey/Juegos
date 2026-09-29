const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { captureRoutes, runCleanup, startStaticServer } = require('./capture-routes.cjs');
const { routes } = require('./routes.js');

test('cleanup attempts every resource and preserves the original error', async () => {
  const original = new Error('inspect failed');
  const calls = [];

  await assert.rejects(
    runCleanup(original, [
      async () => { calls.push('browser'); throw new Error('browser close failed'); },
      async () => { calls.push('server'); throw new Error('server close failed'); },
    ]),
    error => error === original,
  );
  assert.deepEqual(calls, ['browser', 'server']);
});

test('cleanup reports its first failure when there is no original error', async () => {
  const first = new Error('browser close failed');
  let serverClosed = false;

  await assert.rejects(
    runCleanup(null, [
      async () => { throw first; },
      async () => { serverClosed = true; },
    ]),
    error => error === first,
  );
  assert.equal(serverClosed, true);
});

test('capture closes the server when chromium launch fails', async () => {
  const original = new Error('launch failed');
  let serverClosed = false;

  await assert.rejects(
    captureRoutes(async () => {}, {
      browserType: { launch: async () => { throw original; } },
      startServer: async () => ({
        baseURL: 'http://unused.test',
        close: async () => { serverClosed = true; },
      }),
    }),
    error => error === original,
  );
  assert.equal(serverClosed, true);
});

test('capture closes browser and server after inspection fails, preserving inspection error', async () => {
  const original = new Error('inspect failed');
  const calls = [];
  const page = {
    goto: async () => ({ status: () => 200 }),
    route: async () => {},
    screenshot: async () => {},
    waitForSelector: async () => {},
    waitForTimeout: async () => {},
  };
  const browser = {
    close: async () => { calls.push('browser'); throw new Error('browser close failed'); },
    newContext: async () => ({
      close: async () => {},
      newPage: async () => page,
    }),
  };

  await assert.rejects(
    captureRoutes(async () => { throw original; }, {
      browserType: { launch: async () => browser },
      startServer: async () => ({
        baseURL: 'http://unused.test',
        close: async () => { calls.push('server'); throw new Error('server close failed'); },
      }),
    }),
    error => error === original,
  );
  assert.deepEqual(calls, ['browser', 'server']);
});

test('static server serves public files but blocks secrets, dotfiles and symlink escapes', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'arcade-server-'));
  const root = path.join(parent, 'root');
  const outside = path.join(parent, 'outside.txt');
  await fs.mkdir(path.join(root, '.git'), { recursive: true });
  await fs.writeFile(path.join(root, 'public.txt'), 'public');
  await fs.writeFile(path.join(root, '.env'), 'secret');
  await fs.writeFile(path.join(root, '.hidden'), 'hidden');
  await fs.writeFile(path.join(root, '.git', 'config'), 'git secret');
  await fs.writeFile(outside, 'outside');
  await fs.symlink(outside, path.join(root, 'escape.txt'));
  const server = await startStaticServer(root);

  try {
    const publicResponse = await fetch(`${server.baseURL}/public.txt`);
    assert.equal(publicResponse.status, 200);
    assert.equal(await publicResponse.text(), 'public');
    for (const pathname of ['/.env', '/.hidden', '/.git/config', '/escape.txt']) {
      const response = await fetch(`${server.baseURL}${pathname}`);
      assert.equal(response.status, 403, pathname);
    }
  } finally {
    await server.close();
    await fs.rm(parent, { recursive: true, force: true });
  }
});

test('every route defines a safe playable-state preparation', () => {
  assert.equal(routes.length, 17);
  for (const route of routes) {
    assert.equal(typeof route.prepare, 'function', route.name);
  }
  assert.deepEqual(routes.filter(route => route.action === 'click-play').map(route => route.name), ['simon', 'tetris']);
});
