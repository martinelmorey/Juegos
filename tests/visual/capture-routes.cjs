const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { routes, viewports } = require('./routes.js');

const rootDir = path.resolve(__dirname, '../..');
const artifactDir = path.join(rootDir, 'tests/artifacts/current');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.sql': 'text/plain; charset=utf-8',
};

function startStaticServer(servedRoot = rootDir) {
  const serverRoot = path.resolve(servedRoot);
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      const requestedPath = decodeURIComponent(url.pathname);
      const relativePath = requestedPath.endsWith('/') ? `${requestedPath}index.html` : requestedPath;
      const pathSegments = requestedPath.split('/').filter(Boolean);
      if (pathSegments.some(segment => segment.startsWith('.'))) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const filePath = path.resolve(serverRoot, `.${relativePath}`);
      if (filePath !== serverRoot && !filePath.startsWith(`${serverRoot}${path.sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const [realRoot, realFile] = await Promise.all([fs.realpath(serverRoot), fs.realpath(filePath)]);
      if (realFile !== realRoot && !realFile.startsWith(`${realRoot}${path.sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const body = await fs.readFile(realFile);
      response.writeHead(200, {
        'cache-control': 'no-store',
        'content-type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      });
      response.end(body);
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        baseURL: `http://127.0.0.1:${port}`,
        close: () => new Promise((done, fail) => server.close(error => error ? fail(error) : done())),
      });
    });
  });
}
async function runCleanup(originalError, cleanups) {
  const results = await Promise.allSettled(cleanups.map(cleanup => cleanup()));
  if (originalError) throw originalError;
  const failed = results.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
}


async function captureRoutes(inspectPage = async () => {}, {
  browserType = chromium,
  startServer = startStaticServer,
} = {}) {
  await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });
  const server = await startServer();
  let browser;
  let originalError;
  const results = [];

  try {
    browser = await browserType.launch({ headless: true });
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await page.route('**/*', intercepted => {
        const hostname = new URL(intercepted.request().url()).hostname;
        if (hostname.endsWith('.supabase.co')) {
          return intercepted.abort('blockedbyclient');
        }
        return intercepted.continue();
      });

      for (const route of routes) {
        const response = await page.goto(`${server.baseURL}${route.path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15_000,
        });
        const status = response ? response.status() : 0;
        if (status < 200 || status >= 300) {
          throw new Error(`${route.name} ${viewport.name}: HTTP ${status}`);
        }
        await page.waitForSelector(route.root, { state: 'visible', timeout: 10_000 });
        await page.waitForTimeout(150);
        await inspectPage({ page, route, viewport });
        await route.prepare({ page, route, viewport });
        await page.waitForTimeout(150);
        await inspectPage({ page, route, viewport });
        const screenshot = path.join(artifactDir, `${route.name}-${viewport.name}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        results.push({ route: route.name, viewport: viewport.name, screenshot });
      }
      await context.close();
    }
  } catch (error) {
    originalError = error;
  } finally {
    await runCleanup(originalError, [
      async () => {
        if (browser) await browser.close();
      },
      () => server.close(),
    ]);
  }

  return results;
}

if (require.main === module) {
  captureRoutes()
    .then(results => console.log(`Captured ${results.length} routes in ${artifactDir}`))
    .catch(error => {
      console.error(error.stack || error);
      process.exitCode = 1;
    });
}

module.exports = { artifactDir, captureRoutes, runCleanup, startStaticServer };
