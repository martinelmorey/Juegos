const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");
const { startStaticServer } = require("./capture-routes.cjs");

const root = path.resolve(__dirname, "../..");

async function openTetris(browser, baseURL, random = 0) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(value => { Math.random = () => value; }, random);
  await page.goto(baseURL + "/tetris/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Jugar", exact: true }).click();
  return page;
}

test("Tetris touch play clears real lines, reports factory feedback, pauses and restarts", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await openTetris(browser, server.baseURL);
    const rotate = page.locator("[data-action=rotate]");
    const left = page.locator("[data-action=left]");
    const right = page.locator("[data-action=right]");
    const drop = page.locator("[data-action=drop]");
    for (let column = 0; column < 10; column += 1) {
      await rotate.click();
      const delta = column - 3;
      for (let step = 0; step < Math.abs(delta); step += 1) await (delta < 0 ? left : right).click();
      await drop.click();
    }
    assert.equal(await page.locator("#lines").textContent(), "4");
    assert.equal(await page.locator("#score").textContent(), "1820", "preserves classic line and hard-drop scoring");
    assert.match(await page.locator("#line-feedback").textContent(), /4 LÍNEAS|TETRIS/);

    await page.locator("#pause-button").click();
    await page.getByText("PAUSA", { exact: true }).waitFor();
    await page.locator("#start-button").click();
    assert.equal(await page.locator("#overlay").evaluate(element => element.classList.contains("hidden")), true);
    for (let piece = 0; piece < 21; piece += 1) await drop.click();
    await page.getByText("FIN DEL JUEGO", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    assert.equal(await page.locator("#score").textContent(), "0");
    assert.equal(await page.locator("#lines").textContent(), "0");
    assert.equal(await page.locator("#line-feedback").evaluate(element => element.classList.contains("active")), false, "restart clears completed-line emphasis");
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Tetris held pointer repeats movement until pointerup or pointercancel", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  const minGreenX = page => page.locator("#board").evaluate(canvas => { const context=canvas.getContext("2d");const xs=[];for(let y=0;y<6;y++)for(let x=0;x<10;x++){const pixel=context.getImageData(x*30+15,y*30+15,1,1).data;if(pixel[0]===15&&pixel[1]===143&&pixel[2]===56)xs.push(x)}return Math.min(...xs); });
  try {
    const page = await openTetris(browser, server.baseURL);
    const left = page.locator("[data-action=left]");
    await left.dispatchEvent("pointerdown", { pointerId: 7 });
    await page.waitForTimeout(100);
    await left.dispatchEvent("pointerup", { pointerId: 7 });
    const pointerUpPosition = await minGreenX(page);
    assert.equal(pointerUpPosition, 1, "held left repeats beyond one step before release");
    await page.waitForTimeout(180);
    assert.equal(await minGreenX(page), pointerUpPosition, "pointerup stops repetition before the wall");
    const right = page.locator("[data-action=right]");
    await right.dispatchEvent("pointerdown", { pointerId: 8 });
    await page.waitForTimeout(180);
    await right.dispatchEvent("pointercancel", { pointerId: 8 });
    const released = await minGreenX(page);
    await page.waitForTimeout(180);
    assert.equal(await minGreenX(page), released, "pointercancel stops repetition");
  } finally { await browser.close(); await server.close(); }
});

test("Tetris controls preserve native button activation without duplicating pointer input", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  const greenCells = page => page.locator("#board").evaluate(canvas => {
    const context = canvas.getContext("2d");
    const cells = [];
    for (let y = 0; y < 6; y += 1) for (let x = 0; x < 10; x += 1) {
      const pixel = context.getImageData(x * 30 + 15, y * 30 + 15, 1, 1).data;
      if (pixel[0] === 15 && pixel[1] === 143 && pixel[2] === 56) cells.push(`${x},${y}`);
    }
    return cells;
  });
  try {
    const page = await openTetris(browser, server.baseURL);
    const left = page.locator("[data-action=left]");
    await left.focus();
    await page.keyboard.press("Enter");
    assert.deepEqual(await greenCells(page), ["2,0", "3,0", "4,0", "5,0"], "Enter activates the focused button");

    const right = page.locator("[data-action=right]");
    await right.evaluate(element => element.click());
    await page.waitForTimeout(50);
    assert.deepEqual(await greenCells(page), ["3,0", "4,0", "5,0", "6,0"], "programmatic click preserves native button activation");

    await left.click();
    await page.waitForTimeout(50);
    assert.deepEqual(await greenCells(page), ["2,0", "3,0", "4,0", "5,0"], "pointer click is not applied twice");

    const down = page.locator("[data-action=down]");
    await down.focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(50);
    assert.deepEqual(await greenCells(page), ["2,1", "3,1", "4,1", "5,1"], "Space activates focused down once instead of hard drop");
  } finally { await browser.close(); await server.close(); }
});

test("Tetris factory pieces retain seven visually distinct strict-palette patterns", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const signatures = [];
    for (let identity = 1; identity <= 7; identity += 1) {
      const page = await openTetris(browser, server.baseURL, (identity - .5) / 7);
      const report = await page.locator("#next").evaluate(canvas => {
        const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        const colors = new Set();
        let signature = "";
        for (let y = 0; y < canvas.height; y += 6) for (let x = 0; x < canvas.width; x += 6) {
          const index = (y * canvas.width + x) * 4;
          const color = `${data[index]},${data[index + 1]},${data[index + 2]}`;
          colors.add(color);
          signature += color === "15,143,56" ? "G" : color === "255,255,255" ? "W" : "B";
        }
        return { colors: [...colors], signature };
      });
      assert.ok(report.signature.length > 0);
      signatures.push(report.signature);
      await page.close();
    }
    assert.equal(new Set(signatures).size, 7);
  } finally {
    await browser.close();
    await server.close();
  }
});


test("Tetris exposes the arcade return path and loads the shared system before final mobile layout", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const response = await page.goto(server.baseURL + "/tetris/", { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator("main.game-shell").count(), 1);
    assert.equal(await page.getByRole("link", { name: /Volver al arcade/ }).getAttribute("href"), "../");
    const styles = await page.locator("link[rel=stylesheet]").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
    assert.deepEqual(styles, ["../arcade-system.css", "styles.css", "world.css", "../mobile-layout.css"]);
  } finally { await browser.close(); await server.close(); }
});

test("Tetris reduced motion freezes factory motion while paused", async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => { Math.random = () => 0; });
    await page.goto(server.baseURL + "/tetris/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Jugar", exact: true }).click();
    const board = page.locator("#board");
    assert.equal(await board.getAttribute("data-motion"), "reduced");
    await page.locator("#pause-button").click();
    const first = await board.screenshot();
    await page.waitForTimeout(250);
    assert.deepEqual(await board.screenshot(), first);
    assert.equal(await page.locator("#line-feedback").evaluate(element => element.getAnimations().length), 0);
  } finally {
    await browser.close();
    await server.close();
  }
});

test('Tetris launch and game-over copy keeps AA contrast in dark and light themes', async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${server.baseURL}/tetris/`, { waitUntil: 'domcontentloaded' });
    for (const theme of ['dark', 'light']) {
      await page.evaluate(value => {
        document.documentElement.dataset.theme = value;
        const overlay = document.querySelector('#overlay');
        overlay.classList.remove('hidden');
      }, theme);
      for (const copy of ['Presioná jugar para comenzar', 'Fin del juego']) {
        await page.locator('#overlay-copy').evaluate((element, value) => { element.textContent = value; }, copy);
        const report = await page.locator('#overlay-copy').evaluate(element => {
          const parse = value => value.match(/[\d.]+/g).map(Number);
          const blend = (front, back) => {
            const alpha = front[3] ?? 1;
            return front.slice(0, 3).map((channel, index) => channel * alpha + back[index] * (1 - alpha));
          };
          const luminance = color => {
            const linear = color.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
            return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
          };
          const overlay = element.closest('.overlay');
          const themeBackground = parse(getComputedStyle(document.body).backgroundColor);
          const background = blend(parse(getComputedStyle(overlay).backgroundColor), themeBackground);
          const foreground = blend(parse(getComputedStyle(element).color), background);
          const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
          return {
            ratio: (values[0] + .05) / (values[1] + .05),
            color: getComputedStyle(element).color,
            background: getComputedStyle(overlay).backgroundColor,
          };
        });
        assert.ok(report.ratio >= 4.5, `${theme} ${copy}: ${JSON.stringify(report)}`);
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
});


test('Tetris rotates rectangular and non-symmetric pieces and reaches game over', async () => {
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  const greenCells = async page => page.locator('#board').evaluate(canvas => {
    const context = canvas.getContext('2d');
    const cells = [];
    for (let y = 0; y < 6; y += 1) for (let x = 0; x < 10; x += 1) {
      const pixel = context.getImageData(x * 30 + 15, y * 30 + 15, 1, 1).data;
      if (pixel[0] === 15 && pixel[1] === 143 && pixel[2] === 56) cells.push(`${x},${y}`);
    }
    return cells;
  });
  const openTetris = async random => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(value => { Math.random = () => value; }, random);
    await page.goto(`${server.baseURL}/tetris/`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Jugar', exact: true }).click();
    await page.waitForTimeout(50);
    return page;
  };
  try {
    const iPiece = await openTetris(0);
    assert.deepEqual(await greenCells(iPiece), ['3,0', '4,0', '5,0', '6,0'], 'I piece starts 1x4');
    await iPiece.locator('[data-action="rotate"]').click();
    await iPiece.waitForTimeout(50);
    assert.deepEqual(await greenCells(iPiece), ['3,0', '3,1', '3,2', '3,3'], 'I piece rotates to 4x1');
    await iPiece.close();

    const asymmetric = await openTetris(.2);
    assert.deepEqual(await greenCells(asymmetric), ['3,0', '3,1', '4,1', '5,1'], 'J piece starts asymmetric');
    await asymmetric.locator('[data-action="rotate"]').click();
    await asymmetric.waitForTimeout(50);
    assert.deepEqual(await greenCells(asymmetric), ['3,0', '4,0', '3,1', '3,2'], 'J piece keeps its non-symmetric clockwise rotation');
    await asymmetric.close();

    const failure = await openTetris(0);
    for (let piece = 0; piece < 21; piece += 1) await failure.locator('[data-action="drop"]').click();
    await failure.locator('#overlay').waitFor({ state: 'visible' });
    assert.equal(await failure.locator('#overlay-title').textContent(), 'FIN DEL JUEGO');
    assert.match(await failure.locator('#overlay-copy').textContent(), /^Puntaje final: \d+$/);
    await failure.close();
  } finally {
    await browser.close();
    await server.close();
  }
});


test('every Tetris piece contrasts with upper, lower and next-preview backgrounds', async () => {
  const shapes = [
    null,
    [[1, 1, 1, 1]],
    [[2, 0, 0], [2, 2, 2]],
    [[0, 0, 3], [3, 3, 3]],
    [[4, 4], [4, 4]],
    [[0, 5, 5], [5, 5, 0]],
    [[0, 6, 0], [6, 6, 6]],
    [[7, 7, 0], [0, 7, 7]],
  ];
  const contrast = (front, back) => {
    const luminance = color => {
      const linear = color.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
      return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
    };
    const values = [luminance(front), luminance(back)].sort((a, b) => b - a);
    return (values[0] + .05) / (values[1] + .05);
  };
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  try {
    for (let identity = 1; identity <= 7; identity += 1) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.addInitScript(value => { Math.random = () => value; }, (identity - .5) / 7);
      await page.goto(`${server.baseURL}/tetris/`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Jugar', exact: true }).click();
      await page.waitForTimeout(100);
      const sample = async (canvasSelector, matrix, offset, scale, backgroundX) => page.locator(canvasSelector).evaluate((canvas, input) => {
        const context = canvas.getContext('2d');
        const pixels = [];
        input.matrix.forEach((row, y) => row.forEach((value, x) => {
          if (!value) return;
          const centerY = Math.floor((y + input.offset.y + .5) * input.scale);
          pixels.push({
            piece: [...context.getImageData(Math.floor((x + input.offset.x + .5) * input.scale), centerY, 1, 1).data].slice(0, 3),
            background: [...context.getImageData(input.backgroundX, centerY, 1, 1).data].slice(0, 3),
          });
        }));
        return pixels;
      }, { matrix, offset, scale, backgroundX });
      const matrix = shapes[identity];
      const spawnX = Math.floor((10 - matrix[0].length) / 2);
      const upper = await sample('#board', matrix, { x: spawnX, y: 0 }, 30, 2);
      const preview = await sample('#next', matrix, { x: (5 - matrix[0].length) / 2, y: (5 - matrix.length) / 2 }, 24, 2);
      for (let step = 0; step < 14; step += 1) await page.locator('[data-action="down"]').click();
      await page.waitForTimeout(100);
      const lower = await sample('#board', matrix, { x: spawnX, y: 14 }, 30, 2);
      for (const [context, pixels] of [['upper board', upper], ['lower board', lower], ['next preview', preview]]) {
        assert.ok(pixels.every(pixel => contrast(pixel.piece, pixel.background) >= 3), `piece ${identity} on ${context}: ${JSON.stringify(pixels)}`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
});
