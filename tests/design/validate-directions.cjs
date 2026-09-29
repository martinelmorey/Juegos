const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');
const { startStaticServer } = require('../visual/capture-routes.cjs');

const root = path.resolve(__dirname, '../..');
const artifactDir = path.join(root, 'tests/artifacts/directions');
const directions = ['a', 'b', 'c'];
const requiredViews = ['catalog', 'dom-game', 'canvas-game'];

function htmlPath(direction) {
  return path.join(root, `design/launch-direction-${direction}.html`);
}

test('all direction artifacts exist and satisfy the standalone contract', async () => {
  const readme = await fs.readFile(path.join(root, 'design/README.md'), 'utf8');
  for (const term of ['densidad', 'foco', 'scanabilidad', 'sensación', 'tradeoffs', 'recomendación']) {
    assert.match(readme.toLowerCase(), new RegExp(term), `README missing ${term}`);
  }
  for (const direction of directions) {
    const html = await fs.readFile(htmlPath(direction), 'utf8');
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
    assert.match(html, /assets\/rema-logo\.png/);
    assert.match(html, /Rem Enterprises/i);
    assert.match(html, /#0f8f38/i);
    assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
    assert.doesNotMatch(html, /<link[^>]+stylesheet|<script[^>]+src=/i, 'must be standalone');
    assert.doesNotMatch(html, /backdrop-filter|glassmorph|7c3aed|8b5cf6|purple/i);
    assert.doesNotMatch(html, /Connect(?:\s|<br>)*(?:4|Four)/i, "must use the original 4 en Línea name");
    for (const view of requiredViews) assert.match(html, new RegExp(`data-view="${view}"`));
  }
});

test('mobile directions are interactive, accessible and capture cleanly at 390x844', async () => {
  await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const direction of directions) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      const response = await page.goto(`${server.baseURL}/design/launch-direction-${direction}.html`, { waitUntil: 'networkidle' });
      assert.ok(response && response.status() >= 200 && response.status() < 300, `direction ${direction} HTTP status`);
      assert.equal(await page.locator('[role="tab"]').count(), 3, `direction ${direction} tab count`);
      assert.equal(await page.locator('[data-view]').count(), 3, `direction ${direction} view count`);
      for (const view of requiredViews) {
        await page.locator(`[role="tab"][data-target="${view}"]`).click();
        const panel = page.locator(`[data-view="${view}"]`);
        await assert.doesNotReject(() => panel.waitFor({ state: "visible" }));
        assert.equal(await panel.getAttribute("aria-hidden"), "false", `direction ${direction} ${view} aria-hidden`);
        if (view === "dom-game") {
          assert.equal(await panel.locator(".disc, .slot").count(), 42, `direction ${direction} board cell count`);
        }

        const action = panel.locator("[data-action]:visible").first();
        assert.equal(await action.count(), 1, `direction ${direction} ${view} visible CTA`);
        const before = await action.getAttribute("data-state");
        await action.click();
        const after = await action.getAttribute("data-state");
        assert.notEqual(after, before, `direction ${direction} ${view} CTA changes data-state`);

        const layout = await page.evaluate(() => {
          const targets = [...document.querySelectorAll("button, a[href], [role=\"button\"]")]
            .filter(element => {
              const box = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
            })
            .map(element => {
              const box = element.getBoundingClientRect();
              return { label: element.getAttribute("aria-label") || element.textContent.trim(), width: box.width, height: box.height };
            });
          return {
            bodyWidth: document.body.scrollWidth,
            docWidth: document.documentElement.scrollWidth,
            viewportWidth: innerWidth,
            targetCount: targets.length,
            undersized: targets.filter(target => target.width < 44 || target.height < 44),
          };
        });
        assert.ok(layout.targetCount > 0, `direction ${direction} ${view} visible interactives`);
        assert.ok(layout.bodyWidth <= layout.viewportWidth, `direction ${direction} ${view} body overflow`);
        assert.ok(layout.docWidth <= layout.viewportWidth, `direction ${direction} ${view} document overflow`);
        assert.deepEqual(layout.undersized, [], `direction ${direction} ${view} touch targets`);
      }
      assert.deepEqual(pageErrors, [], `direction ${direction} page errors`);
      const screenshot = path.join(artifactDir, `launch-direction-${direction}-390x844.png`);
      await page.screenshot({ path: screenshot });
      const png = await fs.readFile(screenshot);
      assert.equal(png.readUInt32BE(16), 390);
      assert.equal(png.readUInt32BE(20), 844);
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
});

test('quality controls expose complete tabs and view-specific behavior', async () => {
  await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const direction of directions) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      const response = await page.goto(`${server.baseURL}/design/launch-direction-${direction}.html`, { waitUntil: 'networkidle' });
      assert.ok(response && response.ok(), `direction ${direction} HTTP status`);
      const ids = await page.locator('[id]').evaluateAll(elements => elements.map(element => element.id));
      assert.equal(new Set(ids).size, ids.length, `direction ${direction} unique ids`);
      assert.ok(ids.every(Boolean), `direction ${direction} non-empty ids`);
      assert.equal(await page.locator('[role="tablist"]').count(), 1, `direction ${direction} tablist count`);
      assert.equal(await page.locator('[role="tabpanel"]').count(), 3, `direction ${direction} panel count`);
      for (const view of requiredViews) {
        const tab = page.locator(`[role="tab"][data-target="${view}"]`);
        const panel = page.locator(`[role="tabpanel"][data-view="${view}"]`);
        assert.equal(await tab.getAttribute('aria-controls'), await panel.getAttribute('id'), `direction ${direction} ${view} aria-controls`);
        assert.equal(await panel.getAttribute('aria-labelledby'), await tab.getAttribute('id'), `direction ${direction} ${view} aria-labelledby`);
      }
      const catalogTab = page.locator('[role="tab"][data-target="catalog"]');
      const domTab = page.locator('[role="tab"][data-target="dom-game"]');
      const runnerTab = page.locator('[role="tab"][data-target="canvas-game"]');
      await catalogTab.focus();
      await catalogTab.press('ArrowRight');
      assert.equal(await domTab.getAttribute('aria-selected'), 'true', `direction ${direction} ArrowRight activates tab`);
      assert.equal(await domTab.getAttribute('tabindex'), '0', `direction ${direction} active tab is tabbable`);
      assert.equal(await catalogTab.getAttribute('tabindex'), '-1', `direction ${direction} inactive tab leaves tab order`);
      assert.equal(await domTab.evaluate(element => element === document.activeElement), true, `direction ${direction} ArrowRight moves focus`);
      await domTab.press('Home');
      assert.equal(await catalogTab.getAttribute('aria-selected'), 'true', `direction ${direction} Home activates first tab`);
      await catalogTab.press('End');
      assert.equal(await runnerTab.getAttribute('aria-selected'), 'true', `direction ${direction} End activates last tab`);
      await runnerTab.press('ArrowLeft');
      assert.equal(await domTab.getAttribute('aria-selected'), 'true', `direction ${direction} ArrowLeft activates previous tab`);

      for (const view of requiredViews) {
        await page.locator(`[role="tab"][data-target="${view}"]`).click();
        const panel = page.locator(`[role="tabpanel"][data-view="${view}"]`);
        await panel.waitFor({ state: 'visible' });
        if (view === 'catalog') {
          const action = panel.locator('[data-action="catalog"]');
          assert.equal(await action.getAttribute('aria-pressed'), 'false', `direction ${direction} catalog initial state`);
          await action.click();
          assert.equal(await action.getAttribute('aria-pressed'), 'true', `direction ${direction} catalog selection state`);
          assert.match(await action.textContent(), /seleccionad|selección activa|cambiar selección|colección abierta/i, `direction ${direction} catalog selected label`);
        } else if (view === 'dom-game') {
          assert.equal(await panel.locator('.disc, .slot').count(), 42, `direction ${direction} board visual slots`);
          assert.equal(await panel.locator('.disc:is(button), .slot:is(button)').count(), 0, `direction ${direction} slots are not buttons`);
          assert.equal(await panel.locator('[data-column]').count(), 7, `direction ${direction} column controls`);
          await panel.locator('[data-column="0"]').click();
          await panel.locator('[data-column="1"]').click();
          assert.equal(await panel.locator('.disc[data-piece], .slot[data-piece]').count(), 2, `direction ${direction} board records moves`);
          const reset = panel.locator('[data-action="reset"]');
          await reset.click();
          assert.equal(await panel.locator('.disc[data-piece], .slot[data-piece]').count(), 0, `direction ${direction} reset clears board`);
          assert.match(await panel.locator('[data-board-status]').textContent(), /jugador 1|p1|verde/i, `direction ${direction} reset restores first turn`);
          assert.match(await reset.textContent(), /nueva|reiniciar/i, `direction ${direction} reset retains action label`);
        } else {
          const run = panel.locator('[data-action="runner"]');
          assert.equal(await run.getAttribute('data-state'), 'paused', `direction ${direction} runner initially paused`);
          assert.equal(await run.getAttribute('aria-pressed'), 'false', `direction ${direction} runner initial pressed state`);
          await run.click();
          assert.equal(await run.getAttribute('data-state'), 'running', `direction ${direction} runner starts`);
          assert.equal(await run.getAttribute('aria-pressed'), 'true', `direction ${direction} runner pressed while running`);
          assert.match(await run.textContent(), /pausar/i, `direction ${direction} runner running label`);
          await page.waitForTimeout(850);
          await run.click();
          assert.equal(await run.getAttribute('data-state'), 'paused', `direction ${direction} runner button pauses`);
          assert.equal(await run.getAttribute('aria-pressed'), 'false', `direction ${direction} runner button clears pressed state`);
          assert.equal(await panel.locator('[data-runner-figure]').evaluate(element => getComputedStyle(element).animationPlayState), 'paused', `direction ${direction} animation pauses manually`);
          const pausedDistance = await panel.locator('[data-distance]').textContent();
          await page.waitForTimeout(850);
          assert.equal(await panel.locator('[data-distance]').textContent(), pausedDistance, `direction ${direction} runner timer stops when paused`);
          await run.click();
          assert.equal(await run.getAttribute('data-state'), 'running', `direction ${direction} runner resumes`);
          await page.waitForTimeout(850);
          await catalogTab.click();
          assert.equal(await run.getAttribute('data-state'), 'paused', `direction ${direction} runner pauses on tab switch`);
          assert.equal(await run.getAttribute('aria-pressed'), 'false', `direction ${direction} switched runner pressed state`);
          const distance = await panel.locator('[data-distance]').textContent();
          await page.waitForTimeout(850);
          assert.equal(await panel.locator('[data-distance]').textContent(), distance, `direction ${direction} runner timer stops off-view`);
          assert.equal(await panel.locator('[data-runner-figure]').evaluate(element => getComputedStyle(element).animationPlayState), 'paused', `direction ${direction} animation pauses off-view`);
          await runnerTab.click();
        }
        const layout = await page.evaluate(() => {
          const targets = [...document.querySelectorAll('button, a[href], [role="button"]')]
            .filter(element => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'; })
            .map(element => { const box = element.getBoundingClientRect(); return { label: element.getAttribute('aria-label') || element.textContent.trim(), width: box.width, height: box.height }; });
          return { bodyWidth: document.body.scrollWidth, docWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, targetCount: targets.length, undersized: targets.filter(target => target.width < 44 || target.height < 44) };
        });
        assert.ok(layout.targetCount > 0, `direction ${direction} ${view} visible interactives`);
        assert.ok(layout.bodyWidth <= layout.viewportWidth, `direction ${direction} ${view} body overflow`);
        assert.ok(layout.docWidth <= layout.viewportWidth, `direction ${direction} ${view} document overflow`);
        assert.deepEqual(layout.undersized, [], `direction ${direction} ${view} touch targets`);
        const screenshot = path.join(artifactDir, `launch-direction-${direction}-${view}-390x844.png`);
        await page.screenshot({ path: screenshot });
        const png = await fs.readFile(screenshot);
        assert.equal(png.readUInt32BE(16), 390);
        assert.equal(png.readUInt32BE(20), 844);
      }
      assert.deepEqual(pageErrors, [], `direction ${direction} page errors`);
      await context.close();
    }
    const pngs = (await fs.readdir(artifactDir)).filter(file => file.endsWith('.png'));
    assert.equal(pngs.length, 9, 'captures all three views for all three directions');
  } finally {
    await browser.close();
    await server.close();
  }
});
