const viewports = [
  { name: '320x844', width: 320, height: 844 },
  { name: '390x844', width: 390, height: 844 },
  { name: '592x1280', width: 592, height: 1280 },
];

async function confirmCatalogReady({ page }) {
  await page.waitForFunction(() => document.querySelectorAll('.grid .card').length === 16);
}

async function confirmSharedGameReady({ page, route }) {
  await page.waitForSelector(route.regions.board, { state: 'visible' });
  if (route.regions.controls) {
    await page.waitForSelector(route.regions.controls, { state: 'visible' });
  }
}

async function startSimon(context) {
  const { page } = context;
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await confirmSharedGameReady(context);
}

async function startTetris({ page, route }) {
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.waitForSelector(route.regions.board, { state: 'visible' });
  await page.waitForSelector(route.regions.controls, { state: 'visible' });
}

async function confirmRunnerReady({ page }) {
  await page.waitForSelector('#game', { state: 'visible' });
  await page.waitForSelector('.controls button:not([disabled])', { state: 'visible' });
}


const sharedGames = [
  ['snake', 'canvas', true],
  ['pong', 'canvas', true],
  ['breakout', 'canvas', true],
  ['memory', '.memory-grid', false],
  ['merge', '.merge-grid', true],
  ['dodge', 'canvas', true],
  ['connect', '.connect-grid', false],
  ['whack', '.whack-grid', false],
  ['reaction', '.reaction-box', false],
  ['tic', '.tic-grid', false],
  ['simon', '.simon-wrap', false],
  ['rps', '.rps-wrap', false],
  ['math', '.math-wrap', false],
  ['maze', 'canvas', true],
];

const routes = [
  {
    name: 'home',
    path: '/',
    root: '.home',
    regions: {
      shell: '.home',
      stage: '.grid',
      panel: '.home-ranking',
      board: '.grid',
    },
    action: 'confirm-ready',
    prepare: confirmCatalogReady,
  },
  ...sharedGames.map(([game, board, hasControls]) => ({
    name: game,
    path: `/game.html?game=${game}`,
    root: `body[data-game="${game}"]`,
    regions: {
      shell: '.play',
      stage: '#stage',
      hud: '.hud',
      panel: '.gamebox',
      board: `#stage > ${board}`,
      ...(hasControls ? { controls: '#mobile-controls' } : {}),
    },
    action: game === 'simon' ? 'click-play' : 'confirm-active',
    prepare: game === 'simon' ? startSimon : confirmSharedGameReady,
  })),
  {
    name: 'tetris',
    path: '/tetris/',
    root: '.game-shell',
    regions: {
      shell: '.game-card',
      stage: '.game-layout',
      hud: '.panel',
      panel: '.panel',
      board: '.board-wrap',
      controls: '.game-card > .mobile-controls',
    },
    action: 'click-play',
    prepare: startTetris,
  },
  {
    name: 'rem-runner',
    path: '/rem-runner/',
    root: '.runner-shell',
    regions: {
      shell: '.runner-shell',
      stage: '.runner-card',
      hud: '.runner-hud',
      panel: '.runner-card',
      board: '#game',
      controls: '.controls',
    },
    action: 'confirm-active',
    prepare: confirmRunnerReady,
  },
];

module.exports = { routes, viewports };
