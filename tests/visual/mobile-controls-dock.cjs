const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const test = require("node:test");
const { chromium } = require("playwright");
const { startStaticServer } = require("./capture-routes.cjs");
const root = path.resolve(__dirname, "../..");

const cases = [
  { name: "snake", path: "/game.html?game=snake", board: "#stage canvas", controls: "#mobile-controls" },
  { name: "pong", path: "/game.html?game=pong", board: "#stage canvas", controls: "#mobile-controls" },
  { name: "breakout", path: "/game.html?game=breakout", board: "#stage canvas", controls: "#mobile-controls" },
  { name: "merge", path: "/game.html?game=merge", board: ".merge-grid", controls: "#mobile-controls" },
  { name: "dodge", path: "/game.html?game=dodge", board: "#stage canvas", controls: "#mobile-controls" },
  { name: "maze", path: "/game.html?game=maze", board: "#stage canvas", controls: "#mobile-controls" },
  { name: "tetris", path: "/tetris/", board: ".board-wrap", controls: ".board-column > .mobile-controls" },
  { name: "runner", path: "/rem-runner/", board: ".runner-card canvas", controls: ".controls" },
];
const viewports = [
  { width: 320, height: 568 }, { width: 320, height: 667 }, { width: 360, height: 640 },
  { width: 375, height: 667 }, { width: 390, height: 600 }, { width: 390, height: 740 },
  { width: 592, height: 844 }, { width: 600, height: 600 }, { width: 568, height: 320 }, { width: 667, height: 375 },
  { width: 844, height: 390 }, { width: 852, height: 393 }, { width: 915, height: 412 }, { width: 932, height: 430 },
];

const box = locator => locator.evaluate(element => {
  const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
  return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, position: style.position };
});

test("control docks reserve device safe areas", () => {
  const css = fs.readFileSync(path.join(root, "mobile-layout.css"), "utf8");
  for (const edge of ["bottom", "left", "right"]) assert.match(css, new RegExp(`safe-area-inset-${edge}`));
  for (const file of ["game.html", "tetris/index.html", "rem-runner/index.html"]) {
    assert.match(fs.readFileSync(path.join(root, file), "utf8"), /viewport-fit=cover/);
  }
});

test("every movement game keeps its board and touch dock visible together", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      for (const item of cases) {
        const page = await browser.newPage({ viewport, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
        const response = await page.goto(server.baseURL + item.path, { waitUntil: "domcontentloaded" });
        assert.equal(response.status(), 200, `${item.name} ${viewport.width} HTTP`);
        await page.waitForSelector(item.controls, { state: "visible" });
        if (item.name === "runner") await page.evaluate(() => { document.querySelector("#reward-panel").hidden = false; });
        await page.waitForTimeout(150);
        const board = await box(page.locator(item.board));
        const controls = await box(page.locator(item.controls));
        assert.equal(await page.locator(item.controls).getAttribute("role"), "group", `${item.name} ${viewport.width} control semantics`);
        assert.equal(controls.position, "fixed", `${item.name} ${viewport.width} dock position`);
        assert.ok(controls.y >= 0 && controls.bottom <= viewport.height - 7, `${item.name} ${viewport.width} dock ${JSON.stringify(controls)}`);
        assert.ok(board.y >= 0 && board.bottom <= viewport.height - 6 && board.height >= 140, `${item.name} ${viewport.width}x${viewport.height} board ${JSON.stringify(board)}`);
        const separated = board.bottom + 8 <= controls.y || board.right + 8 <= controls.x || controls.right + 8 <= board.x;
        assert.ok(separated, `${item.name} ${viewport.width}x${viewport.height} overlap ${JSON.stringify({ board, controls })}`);
        assert.ok(board.x >= -1 && board.right <= viewport.width + 1, `${item.name} ${viewport.width} board bounds`);
        const buttons = await page.locator(`${item.controls} button`).evaluateAll(elements => elements.map(element => { const rect = element.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }));
        assert.ok(buttons.length > 0 && buttons.every(button => button.width >= 44 && button.height >= 44), `${item.name} ${viewport.width} buttons ${JSON.stringify(buttons)}`);
        await page.evaluate(selector => {
          window.__dockPointerHits = 0;
          document.querySelector(`${selector} button`).addEventListener("pointerdown", () => { window.__dockPointerHits += 1; }, { once: true });
        }, item.controls);
        await page.locator(`${item.controls} button`).first().tap();
        assert.equal(await page.evaluate(() => window.__dockPointerHits), 1, `${item.name} ${viewport.width} dock hit test`);
        const obscured = await page.evaluate(controlSelector => {
          const dock = document.querySelector(controlSelector).getBoundingClientRect();
          return [...document.querySelectorAll("a,button,input,[tabindex],.hint,#records,.message,.hud,.runner-hud,.panel,.reward-panel,.maze-progress")].filter(element => !element.closest(controlSelector)).filter(element => {
            const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
            const visible = style.display !== "none" && style.visibility !== "hidden" && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
            return visible && rect.left < dock.right && rect.right > dock.left && rect.top < dock.bottom && rect.bottom > dock.top;
          }).map(element => element.id || element.getAttribute("aria-label") || element.tagName);
        }, item.controls);
        assert.deepEqual(obscured, [], `${item.name} ${viewport.width}x${viewport.height} obscured controls ${JSON.stringify(obscured)}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width, `${item.name} ${viewport.width} overflow`);
        if (item.name === "tetris") {
          const secondary = await page.evaluate(() => {
            const panel = document.querySelector(".panel"), records = document.querySelector("#records");
            const visible = selector => {
              const element = document.querySelector(selector), style = getComputedStyle(element), rect = element.getBoundingClientRect();
              return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
            };
            return {
              panelOverflow: getComputedStyle(panel).overflow,
              recordsDisplay: getComputedStyle(records).display,
              targetsVisible: [".next-piece", ".line-feedback", ".instructions", ".panel .secondary", "#records"].every(visible),
            };
          });
          assert.notEqual(secondary.panelOverflow, "hidden", `tetris ${viewport.width} panel clipping`);
          assert.notEqual(secondary.recordsDisplay, "none", `tetris ${viewport.width} records hidden`);
          assert.equal(secondary.targetsVisible, true, `tetris ${viewport.width} secondary content hidden`);
          const detailSelectors = [".next-piece", ".line-feedback", ".instructions", ".panel .secondary", "#records"];
          for (const selector of detailSelectors) {
            await page.locator(selector).evaluate(element => element.scrollIntoView({ block: "start" }));
            const target = await box(page.locator(selector));
            const dock = await box(page.locator(item.controls));
            const reachable = target.y < viewport.height && target.bottom > 0;
            const clear = target.bottom + 4 <= dock.y || target.right + 4 <= dock.x || dock.right + 4 <= target.x;
            assert.ok(reachable && clear, `tetris ${viewport.width} ${selector} unreachable ${JSON.stringify({ target, dock })}`);
          }
        }
        await page.close();
      }
    }
  } finally { await browser.close(); await server.close(); }
});
