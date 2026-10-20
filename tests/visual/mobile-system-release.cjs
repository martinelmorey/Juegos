const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");
const { startStaticServer } = require("./capture-routes.cjs");
const root = path.resolve(__dirname, "../..");

async function open(browser, baseURL, route) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const response = await page.goto(baseURL + route, { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200, route);
  await page.waitForTimeout(400);
  return page;
}

const rect = (page, selector) => page.locator(selector).evaluate(element => {
  const value = element.getBoundingClientRect();
  return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
});

test("mobile brand geometry is shared across gameplay surfaces", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const home = await open(browser, server.baseURL, "/");
    const homeLogo = await rect(home, ".home > .brand-logo");
    assert.ok(Math.abs(homeLogo.width - 96) <= 1, JSON.stringify(homeLogo));
    assert.ok(Math.abs((homeLogo.x + homeLogo.width / 2) - 195) <= 1, JSON.stringify(homeLogo));
    await home.close();

    for (const item of [
      { route: "/game.html?game=snake", shell: ".play", header: ".play > header", logo: ".brand-logo" },
      { route: "/tetris/", shell: ".game-shell", header: ".game-card > header", logo: ".brand-logo" },
      { route: "/rem-runner/", shell: ".runner-shell", header: ".runner-shell > header", logo: ".brand-logo" },
    ]) {
      const page = await open(browser, server.baseURL, item.route);
      const shell = await rect(page, item.shell), header = await rect(page, item.header), logo = await rect(page, item.logo), title = await rect(page, "h1"), back = await rect(page, ".back");
      assert.ok(Math.abs(logo.width - 84) <= 1, `${item.route} ${JSON.stringify(logo)}`);
      assert.ok(Math.abs(logo.x - title.x) <= 1, `${item.route} logo/title alignment`);
      assert.ok(Math.abs((logo.x - header.x) - 12) <= 1, `${item.route} header inset ${logo.x - header.x}`);
      assert.ok(Math.abs((back.x - shell.x) - 12) <= 1, `${item.route} back/shell inset ${back.x - shell.x}`);
      assert.ok(back.height >= 44, `${item.route} back height ${back.height}`);
      await page.close();
    }
  } finally { await browser.close(); await server.close(); }
});

test("mobile movement controls share one touch-safe component", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const item of [
      { route: "/game.html?game=snake", controls: "#mobile-controls", expected: 4 },
      { route: "/tetris/", controls: ".board-column > .mobile-controls", expected: 5 },
      { route: "/rem-runner/", controls: ".controls", expected: 6 },
    ]) {
      const page = await open(browser, server.baseURL, item.route);
      const report = await page.locator(item.controls).evaluate(element => {
        const style = getComputedStyle(element);
        const buttons = [...element.querySelectorAll("button")].filter(button => {
          const box = button.getBoundingClientRect(); return box.width > 0 && box.height > 0;
        }).map(button => {
          const box = button.getBoundingClientRect(), buttonStyle = getComputedStyle(button);
          return { width: box.width, height: box.height, radius: buttonStyle.borderRadius, label: button.getAttribute("aria-label"), touchAction: buttonStyle.touchAction };
        });
        return { border: style.borderTopWidth, padding: Number.parseFloat(style.paddingTop), background: style.backgroundColor, buttons };
      });
      assert.equal(report.buttons.length, item.expected, `${item.route} visible control count`);
      assert.equal(report.border, "1px", `${item.route} controls border`);
      assert.ok(report.padding >= 7, `${item.route} controls padding ${report.padding}`);
      assert.equal(report.background, "rgb(0, 0, 0)", `${item.route} controls background`);
      assert.ok(report.buttons.every(button => button.width >= 44 && button.height >= 44 && button.radius === "0px" && button.touchAction === "manipulation"), `${item.route} ${JSON.stringify(report.buttons)}`);
      assert.ok(report.buttons.every(button => button.label && button.label.length > 1), `${item.route} meaningful labels ${JSON.stringify(report.buttons)}`);
      await page.close();
    }
  } finally { await browser.close(); await server.close(); }
});

test("Tetris mobile order keeps board, controls and secondary panel separate", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await open(browser, server.baseURL, "/tetris/");
    const board = await rect(page, ".board-wrap"), controls = await rect(page, ".board-column > .mobile-controls"), panel = await rect(page, ".panel");
    assert.ok(board.bottom + 8 <= controls.y, JSON.stringify({ board, controls, panel }));
    assert.ok(controls.bottom + 8 <= panel.y, JSON.stringify({ board, controls, panel }));
  } finally { await browser.close(); await server.close(); }
});

test("mobile navigation and theme control stay in the same locations", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const route of ["/game.html?game=snake", "/tetris/", "/rem-runner/"]) {
      const page = await open(browser, server.baseURL, route);
      assert.equal((await page.locator(".back").textContent()).trim(), "← Volver al arcade", `${route} back copy`);
      const toggle = await page.locator(".theme-toggle").evaluate(element => {
        const box = element.getBoundingClientRect(), style = getComputedStyle(element);
        return { x: box.x, y: box.y, width: box.width, height: box.height, position: style.position };
      });
      assert.deepEqual(toggle, { x: 336, y: 10, width: 44, height: 44, position: "fixed" }, `${route} ${JSON.stringify(toggle)}`);
      await page.close();
    }
  } finally { await browser.close(); await server.close(); }
});

test("mobile controls follow the active dark and light theme", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await open(browser, server.baseURL, "/rem-runner/");
    const colors = () => page.locator(".controls").evaluate(element => {
      const root = getComputedStyle(document.documentElement), button = getComputedStyle(element.querySelector("button")), controls = getComputedStyle(element);
      const normalize = value => { const probe = document.createElement("i"); probe.style.color = value; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; };
      return { surface: controls.backgroundColor, button: button.backgroundColor, text: button.color, black: normalize(root.getPropertyValue("--black")), white: normalize(root.getPropertyValue("--white")) };
    });
    const dark = await colors();
    await page.locator(".theme-toggle").click();
    await page.waitForTimeout(50);
    const light = await colors();
    assert.equal(dark.surface, dark.black);
    assert.equal(dark.button, dark.black);
    assert.equal(dark.text, dark.white);
    assert.equal(light.surface, light.black);
    assert.equal(light.button, light.black);
    assert.equal(light.text, light.white);
    assert.notEqual(light.surface, dark.surface);
  } finally { await browser.close(); await server.close(); }
});
