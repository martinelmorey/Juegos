# Arcade Quality Pass Implementation Plan

> **For Hermes:** Improve one game at a time, verify it in a mobile browser, then commit before advancing.

**Goal:** Raise visual quality, motion, feedback, and mobile usability across the 15-game arcade without changing the black, green, and white identity.

**Architecture:** Keep the current dependency-free HTML, CSS, canvas, and JavaScript model. Add reusable visual primitives to `arcade.css`, then make focused per-game enhancements in `arcade.js` or `tetris/game.js`. Use Playwright mobile checks for each completed game and preserve Supabase score behavior.

**Tech Stack:** HTML, CSS animations, Canvas 2D, vanilla JavaScript, Playwright, Supabase REST.

---

### Task 1: Create a shared quality baseline

**Files:** Modify `arcade.css`, `tetris/styles.css`

1. Define reduced-motion-safe transitions, tactile press feedback, screen overlays, and status animation tokens.
2. Verify both light and dark themes preserve contrast.
3. Run the mobile smoke test.
4. Commit the shared visual primitive changes separately.

### Task 2: Tetris — premium gameplay feedback

**Files:** Modify `tetris/game.js`, `tetris/styles.css`

1. Add line-clear flash, score pop, hard-drop impact, and level-up feedback.
2. Keep rotation, ghost piece, mobile controls, pause, and ranking behavior working.
3. Play a browser session: start, rotate, hard-drop, pause, restart.
4. Commit as the first per-game upgrade.

### Task 3: Snake and Pong — responsive motion pass

**Files:** Modify `arcade.js`, `arcade.css`

1. Add eat/score bursts to Snake and trail/impact feedback to Pong.
2. Improve canvas HUD readability and mobile control press states.
3. Verify keyboard and touch paths individually.
4. Commit after both browser checks pass.

### Task 4: Breakout, Astro Dodge, and Cofre Rush — action effects

**Files:** Modify `arcade.js`, `arcade.css`

1. Add particles, hit flashes, and clear end-state feedback.
2. Improve Cofre Rush level transitions and chest reward reveal.
3. Test full completion paths, including coupon threshold selection.
4. Commit after each game or tightly related pair.

### Task 5: Memory, 2048, Connect 4, and Tic Tac Toe — board-game polish

**Files:** Modify `arcade.js`, `arcade.css`

1. Add flip, merge, placement, and winning-line effects.
2. Preserve CPU turn locking in Tic Tac Toe and Connect 4.
3. Verify win, loss, and restart states on a mobile viewport.
4. Commit each independently.

### Task 6: Whack-a-Pixel, Color Rush, Simon Pulse, Piedra Papel, and Math Sprint — reward feedback

**Files:** Modify `arcade.js`, `arcade.css`

1. Add countdown urgency, success/failure flashes, and round-complete states.
2. Keep all targets and answer buttons accessible by touch.
3. Test a successful and unsuccessful interaction for each game.
4. Commit each game independently.

### Task 7: Final arcade regression pass

**Files:** Modify only regression fixes and `README.md` if behavior changes.

1. Load all 15 routes in a mobile browser with no page errors.
2. Test theme toggling, score submission UI, home Top 3, and every mobile control group.
3. Check `node --check` and `git diff --check`.
4. Publish the final quality-pass summary.
