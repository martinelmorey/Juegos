const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");
const { startStaticServer } = require("./capture-routes.cjs");

const root = path.resolve(__dirname, "../..");

async function openMaze(browser, baseURL) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.addInitScript(() => {
    Math.random = () => .1;
    window.__hudAnimations = { score: 0, status: 0 };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.id === "score" || this.id === "status") window.__hudAnimations[this.id] += 1;
      return animate.apply(this, args);
    };
  });
  const response = await page.goto(baseURL + "/game.html?game=maze", { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200);
  await page.locator("#stage canvas").waitFor({ state: "visible" });
  return page;
}

test("Cofre Rush telemetry updates without looping HUD animations", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await openMaze(browser, server.baseURL);
    await page.waitForTimeout(1200);
    const report = await page.evaluate(() => ({
      counts: window.__hudAnimations,
      scoreAnimation: getComputedStyle(document.querySelector("#score")).animationName,
      stageAnimation: getComputedStyle(document.querySelector("#stage"), "::before").animationName,
    }));
    assert.ok(report.counts.score <= 1, JSON.stringify(report));
    assert.ok(report.counts.status <= 1, JSON.stringify(report));
    assert.equal(report.scoreAnimation, "none");
    assert.equal(report.stageAnimation, "none");
  } finally { await browser.close(); await server.close(); }
});

test("Cofre Rush exposes a structured level rail, readable HUD and named touch controls", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await openMaze(browser, server.baseURL);
    assert.equal(await page.locator(".maze-progress").count(), 1);
    assert.equal(await page.locator(".maze-progress [data-level]").count(), 3);
    assert.equal(await page.locator(".maze-progress [aria-current=step]").count(), 1);
    assert.equal(await page.locator("#stage canvas").getAttribute("aria-label"), "Mapa del Cofre Rush, nivel 1 de 3");
    assert.deepEqual(await page.locator("#mobile-controls button").evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label"))), ["Mover arriba", "Mover izquierda", "Mover abajo", "Mover derecha"]);
    assert.ok(await page.locator("#status").evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize) >= 12));
    assert.equal(await page.locator("#score").getAttribute("aria-label"), "Puntaje restante");
    assert.equal(await page.locator("#score").evaluate(element => getComputedStyle(element, "::before").content), '"PUNTOS"');
    const stageStyle = await page.locator("#stage").evaluate(element => ({ backgroundColor: getComputedStyle(element).backgroundColor, backgroundImage: getComputedStyle(element).backgroundImage }));
    assert.deepEqual(stageStyle, { backgroundColor: "rgb(0, 0, 0)", backgroundImage: "none" });
    const width = await page.locator("#stage canvas").evaluate(canvas => canvas.getBoundingClientRect().width);
    assert.ok(width <= 380 && width >= 340, `canvas width ${width}`);
    for (const viewport of [{ width: 320, height: 844 }, { width: 390, height: 844 }, { width: 592, height: 1280 }]) {
      await page.setViewportSize(viewport);
      const geometry = await page.evaluate(() => {
        const rect = selector => { const value = document.querySelector(selector).getBoundingClientRect(); return { top: value.top, right: value.right, bottom: value.bottom, left: value.left }; };
        return { stage: rect("#stage"), canvas: rect("#stage canvas"), progress: rect(".maze-progress"), controls: rect("#mobile-controls") };
      });
      const label = `${viewport.width}x${viewport.height}`;
      assert.ok(geometry.progress.bottom <= geometry.canvas.top, `${label} progress overlaps canvas: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.canvas.top >= geometry.stage.top && geometry.canvas.right <= geometry.stage.right && geometry.canvas.bottom <= geometry.stage.bottom && geometry.canvas.left >= geometry.stage.left, `${label} canvas clipped by stage: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.canvas.bottom <= geometry.controls.top, `${label} controls overlap canvas: ${JSON.stringify(geometry)}`);
    }
  } finally { await browser.close(); await server.close(); }
});

test("Cofre Rush completes all three maze levels through touch controls", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  const directions = [[0, -1, "Mover arriba"], [-1, 0, "Mover izquierda"], [0, 1, "Mover abajo"], [1, 0, "Mover derecha"]];
  try {
    const page = await openMaze(browser, server.baseURL);
    for (const [level, size] of [[1, 13], [2, 17], [3, 21]]) {
      const grid = await page.locator("#stage canvas").evaluate((canvas, dimension) => {
        const context = canvas.getContext("2d");
        const unit = canvas.width / dimension;
        const offsets = [-.25, 0, .25];
        return Array.from({ length: dimension }, (_, y) => Array.from({ length: dimension }, (_, x) => {
          let black = 0;
          for (const offsetY of offsets) for (const offsetX of offsets) {
            const pixel = context.getImageData(Math.floor((x + .5 + offsetX) * unit), Math.floor((y + .5 + offsetY) * unit), 1, 1).data;
            if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0) black += 1;
          }
          return black >= 5;
        }));
      }, size);
      grid[1][1] = true;
      grid[size - 2][size - 2] = true;
      const queue = [[1, 1]], previous = new Map([["1,1", null]]);
      for (let index = 0; index < queue.length; index += 1) {
        const [x, y] = queue[index];
        for (const [dx, dy, label] of directions) {
          const nx = x + dx, ny = y + dy, id = `${nx},${ny}`;
          if (grid[ny]?.[nx] && !previous.has(id)) { previous.set(id, { x, y, label }); queue.push([nx, ny]); }
        }
      }
      const goal = `${size - 2},${size - 2}`;
      assert.ok(previous.has(goal), `level ${level} exposes a readable path`);
      const moves = [];
      for (let cursor = goal; previous.get(cursor);) {
        const step = previous.get(cursor); moves.push(step.label); cursor = `${step.x},${step.y}`;
      }
      moves.reverse();
      for (const label of moves) {
        const box = await page.getByRole("button", { name: label, exact: true }).boundingBox();
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      }
      if (level < 3) {
        await page.locator(`.maze-progress [data-level="${level + 1}"][aria-current="step"]`).waitFor();
        await page.waitForTimeout(50);
      }
    }
    await page.locator(".coupon-win").waitFor({ state: "visible" });
    const seconds = Number.parseFloat((await page.locator(".coupon-win small").textContent()).match(/[\d.]+/)[0]);
    const expectedCoupon = seconds <= 30 ? "REM20OFF" : seconds <= 60 ? "REM15OFF" : "REM10OHH";
    assert.equal(await page.locator(".coupon-win strong").textContent(), expectedCoupon);
    assert.equal(Number(await page.locator("#score").textContent()), Math.max(0, 3000 - Math.round(seconds * 10)));
    assert.match(await page.locator("#status").textContent(), /Completaste los 3 niveles/);
  } finally { await browser.close(); await server.close(); }
});
