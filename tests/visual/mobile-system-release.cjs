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
        const box = element.getBoundingClientRect(), style = getComputedStyle(element), icon = getComputedStyle(element, "::before");
        return { x: box.x, y: box.y, width: box.width, height: box.height, position: style.position, icon: { display: icon.display, width: icon.width, height: icon.height, border: icon.borderTopWidth, shadow: icon.boxShadow } };
      });
      assert.deepEqual({ x: toggle.x, y: toggle.y, width: toggle.width, height: toggle.height, position: toggle.position }, { x: 332, y: 10, width: 48, height: 48, position: "fixed" }, `${route} ${JSON.stringify(toggle)}`);
      assert.deepEqual({ display: toggle.icon.display, width: toggle.icon.width, height: toggle.icon.height, border: toggle.icon.border }, { display: "block", width: "18px", height: "18px", border: "3px" }, `${route} icon geometry`);
      assert.notEqual(toggle.icon.shadow, "none", `${route} icon rays`);
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
    await page.waitForTimeout(180);
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

test("mobile shell buttons expose clear primary and secondary hierarchy", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const item of [
      { route: "/game.html?game=snake", selector: "#restart", primary: false },
      { route: "/game.html?game=simon", selector: ".simon-start", primary: true },
      { route: "/tetris/", selector: "#start-button", primary: true },
      { route: "/tetris/", selector: "#pause-button", primary: false },
      { route: "/rem-runner/", selector: "#mute", primary: false },
      { route: "/rem-runner/", selector: "#pause", primary: false },
    ]) {
      const page = await open(browser, server.baseURL, item.route);
      const target = page.locator(item.selector);
      await target.focus();
      const report = await target.evaluate((element, primary) => {
        const style = getComputedStyle(element), root = getComputedStyle(document.documentElement), box = element.getBoundingClientRect();
        const normalize = value => { const probe = document.createElement("i"); probe.style.color = value; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; };
        return { height: box.height, background: style.backgroundColor, color: style.color, green: normalize(root.getPropertyValue("--green")), black: normalize(root.getPropertyValue("--black")), activeInk: normalize(root.getPropertyValue("--mobile-active-ink")), borderWidth: style.borderTopWidth, radius: style.borderRadius, shadow: style.boxShadow, outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle, transform: style.textTransform, spacing: style.letterSpacing, primary };
      }, item.primary);
      assert.ok(report.height >= 48, `${item.route} ${item.selector} height ${report.height}`);
      assert.equal(report.background, report.primary ? report.green : report.black, `${item.route} ${item.selector} background`);
      if (report.primary) assert.equal(report.color, report.activeInk, `${item.route} ${item.selector} primary ink`);
      assert.equal(report.borderWidth, "2px", `${item.route} ${item.selector} border`);
      assert.equal(report.radius, "0px", `${item.route} ${item.selector} radius`);
      assert.notEqual(report.shadow, "none", `${item.route} ${item.selector} shadow`);
      assert.equal(report.outlineWidth, "3px", `${item.route} ${item.selector} focus width`);
      assert.equal(report.outlineStyle, "solid", `${item.route} ${item.selector} focus style`);
      assert.equal(report.transform, "uppercase", `${item.route} ${item.selector} text transform`);
      assert.notEqual(report.spacing, "normal", `${item.route} ${item.selector} letter spacing`);
      await page.close();
    }
  } finally { await browser.close(); await server.close(); }
});

test("Simon distinguishes a new sequence from the global restart action", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await open(browser, server.baseURL, "/game.html?game=simon");
    await page.locator(".simon-start").click();
    assert.equal((await page.locator(".simon-start").textContent()).trim(), "Nueva secuencia");
    assert.equal((await page.locator("#restart").textContent()).trim(), "Reiniciar");
  } finally { await browser.close(); await server.close(); }
});
