const { captureRoutes } = require('./capture-routes.cjs');
const { routes, viewports } = require('./routes.js');

const MIN_TOUCH_TARGET = 44;
const TOLERANCE = 1;
const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input',
  'select',
  'textarea',
  '[role="button"]',
].join(', ');
const violations = [];

async function inspectLayout({ page, route, viewport }) {
  const report = await page.evaluate(({ interactiveSelector, regions, tolerance, minTouchTarget }) => {
    for (const animation of document.getAnimations()) {
      const iterations = animation.effect && animation.effect.getTiming().iterations;
      if (animation.playState === 'running' && iterations !== Infinity) animation.finish();
    }

    const failures = [];
    const viewportWidth = window.innerWidth;
    const documentWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;

    if (documentWidth > viewportWidth + tolerance) {
      failures.push(`document scrollWidth ${documentWidth}px > viewport ${viewportWidth}px`);
    }
    if (bodyWidth > viewportWidth + tolerance) {
      failures.push(`body scrollWidth ${bodyWidth}px > viewport ${viewportWidth}px`);
    }

    for (const [label, selector] of Object.entries(regions)) {
      const element = document.querySelector(selector);
      if (!element) {
        failures.push(`${label}: missing ${selector}`);
        continue;
      }
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) <= 0) {
        failures.push(`${label}: hidden ${selector}`);
        continue;
      }
      if (box.width <= 0 || box.height <= 0) {
        failures.push(`${label}: empty ${Math.round(box.width)}x${Math.round(box.height)}`);
      }
      if (box.left < -tolerance || box.right > viewportWidth + tolerance) {
        failures.push(`${label}: horizontal bounds ${box.left.toFixed(1)}..${box.right.toFixed(1)} outside 0..${viewportWidth}`);
      }
      if (element.scrollWidth > element.clientWidth + tolerance) {
        failures.push(`${label}: content width ${element.scrollWidth}px clipped by ${element.clientWidth}px`);
      }

      const clippingValues = new Set(['auto', 'clip', 'hidden', 'scroll']);
      let clippingParent = element.parentElement;
      while (clippingParent) {
        const parentStyle = getComputedStyle(clippingParent);
        if (clippingValues.has(parentStyle.overflowX) || clippingValues.has(parentStyle.overflowY)) break;
        clippingParent = clippingParent.parentElement;
      }
      if (clippingParent) {
        const parentStyle = getComputedStyle(clippingParent);
        const parentBox = clippingParent.getBoundingClientRect();
        if (clippingValues.has(parentStyle.overflowX)
          && (box.left < parentBox.left - tolerance || box.right > parentBox.right + tolerance)) {
          failures.push(`${label}: horizontal bounds ${box.left.toFixed(1)}..${box.right.toFixed(1)} outside clipping parent ${parentBox.left.toFixed(1)}..${parentBox.right.toFixed(1)}`);
        }
        if (clippingValues.has(parentStyle.overflowY)
          && (box.top < parentBox.top - tolerance || box.bottom > parentBox.bottom + tolerance)) {
          failures.push(`${label}: vertical bounds ${box.top.toFixed(1)}..${box.bottom.toFixed(1)} outside clipping parent ${parentBox.top.toFixed(1)}..${parentBox.bottom.toFixed(1)}`);
        }
      }
    }

    const describeTarget = target => {
      const id = target.id ? `#${target.id}` : '';
      const classes = [...target.classList].map(name => `.${name}`).join('');
      const href = target.getAttribute('href');
      const name = target.getAttribute('aria-label') || target.textContent.trim().replace(/\s+/g, ' ').slice(0, 40);
      return `${target.tagName.toLowerCase()}${id}${classes}${href ? `[href="${href}"]` : ''}${name ? ` "${name}"` : ''}`;
    };
    const targets = [...document.querySelectorAll(interactiveSelector)];
    for (const [index, target] of targets.entries()) {
      const style = getComputedStyle(target);
      const box = target.getBoundingClientRect();
      const visible = style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) > 0
        && box.width > 0
        && box.height > 0;
      if (visible && (box.width < minTouchTarget || box.height < minTouchTarget)) {
        failures.push(`touch target ${describeTarget(target)} [${index}] is ${box.width.toFixed(1)}x${box.height.toFixed(1)}; minimum is ${minTouchTarget}x${minTouchTarget}`);
      }
    }

    return { bodyWidth, documentWidth, failures, viewportWidth };
  }, {
    regions: route.regions,
    interactiveSelector: INTERACTIVE_SELECTOR,
    tolerance: TOLERANCE,
    minTouchTarget: MIN_TOUCH_TARGET,
  });

  if (report.failures.length) {
    violations.push(`${route.name} ${viewport.name}:\n  ${report.failures.join('\n  ')}`);
  }
}

captureRoutes(inspectLayout)
  .then(results => {
    const expectedCount = routes.length * viewports.length;
    if (results.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} screenshots, received ${results.length}`);
    }
    if (violations.length) {
      throw new Error(violations.join('\n'));
    }
    console.log(`PASS layout: ${results.length} screenshots, ${routes.length} routes, ${viewports.length} viewports, 0 layout violations`);
  })
  .catch(error => {
    console.error(`FAIL layout\n${error.stack || error}`);
    process.exitCode = 1;
  });
