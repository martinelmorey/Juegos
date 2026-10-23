const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");
const { startStaticServer } = require("./capture-routes.cjs");
const root = path.resolve(__dirname, "../..");

async function open(browser, baseURL) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const response = await page.goto(baseURL + "/game.html?game=snake", { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200);
  await page.waitForSelector("canvas");
  await page.waitForTimeout(180);
  return page;
}

const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

test("Snake renders a dark top-down energy garden with a named board and structured HUD", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await open(browser, server.baseURL);
    const report = await page.evaluate(() => {
      const canvas = document.querySelector("canvas"), context = canvas.getContext("2d"), hud = document.querySelector(".hud"), score = document.querySelector("#score"), stage = document.querySelector("#stage");
      const pixel = (x, y) => [...context.getImageData(x, y, 1, 1).data.slice(0, 3)];
      const hudStyle = getComputedStyle(hud), labelStyle = getComputedStyle(score, "::before"), stageStyle = getComputedStyle(stage);
      return {
        label: canvas.getAttribute("aria-label"),
        corners: [pixel(5, 5), pixel(394, 5), pixel(5, 394), pixel(394, 394)],
        hudBackground: hudStyle.backgroundColor,
        hudBorder: hudStyle.borderBottomWidth,
        scoreLabel: labelStyle.content,
        stageBackground: stageStyle.backgroundColor,
      };
    });
    assert.equal(report.label, "Serpentario de energía REM");
    assert.ok(report.corners.every(color => luminance(color) < 70), JSON.stringify(report.corners));
    assert.equal(report.hudBorder, "2px");
    assert.equal(report.scoreLabel, '"ENERGÍA"');
    assert.ok(luminance(report.hudBackground.match(/\d+/g).map(Number)) < 45, report.hudBackground);
    assert.ok(luminance(report.stageBackground.match(/\d+/g).map(Number)) < 45, report.stageBackground);
  } finally { await browser.close(); await server.close(); }
});

test("Snake eats the first energy fruit and reaches game over through touch input", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await open(browser, server.baseURL);
    await page.waitForFunction(() => document.querySelector("#score").textContent === "1", null, { timeout: 2500 });
    await page.getByRole("button", { name: "Mover abajo" }).click();
    await page.waitForFunction(() => document.querySelector("canvas").dataset.head === "15,11", null, { timeout: 1500 });
    await page.getByRole("button", { name: "Mover izquierda" }).click();
    await page.waitForFunction(() => document.querySelector("canvas").dataset.head === "14,11", null, { timeout: 1500 });
    await page.getByRole("button", { name: "Mover arriba" }).click();
    await page.waitForFunction(() => document.querySelector("#status").textContent === "Fin — choque con cola", null, { timeout: 1200 });
    assert.equal((await page.locator("#score").textContent()).trim(), "1");
    await page.locator("#restart").click();
    assert.equal((await page.locator("#score").textContent()).trim(), "0");
    assert.equal((await page.locator("#status").textContent()).trim(), "Serpentario activo");
  } finally { await browser.close(); await server.close(); }
});

test("Snake permits the vacating tail cell and handles a full board without looping", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await open(browser, server.baseURL);
    const result = await page.evaluate(() => {
      const body = [{ x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
      const full = Array.from({ length: 400 }, (_, index) => ({ x: index % 20, y: Math.floor(index / 20) }));
      return {
        tailAllowed: !window.snakeRules.hitsBody(body, { x: 0, y: 1 }, false),
        growingTailBlocked: window.snakeRules.hitsBody(body, { x: 0, y: 1 }, true),
        fullBoardFood: window.snakeRules.nextFood(full),
      };
    });
    assert.deepEqual(result, { tailAllowed: true, growingTailBlocked: true, fullBoardFood: null });
  } finally { await browser.close(); await server.close(); }
});
