# REM Runner MVP — Technical Proposal and Delivery Plan

**Status:** Proposal only. No production implementation begins until this MVP scope is approved.

## Product decision

Replace the current basic `platformer` prototype with **REM Runner**, an original 2D side-scrolling platform game for REM Enterprises. It will use original characters, art direction, level layouts, mechanics, names, sounds, and UI. It must not reproduce Nintendo characters, levels, blocks, sounds, enemies, or art.

## MVP goal

Ship one playable world, **El Taller REM**, containing three connected levels, five original repairable enemies, three ink modes, collectible production items, a Calidad REM meter, a boss named El Diseño Pixelado, a workshop level selector, and touch plus keyboard controls.

## Technology recommendation

- Native ES modules plus Canvas 2D, deployed as static files in the current repository.
- No game engine for the MVP. This keeps GitHub Pages hosting, mobile load time, and the existing arcade architecture simple.
- Web Audio API for generated placeholder effects. Music remains optional until original licensed tracks exist.
- Supabase REST only for completed-level score submissions, never during play.
- A new standalone route at `rem-runner/`; the arcade card links there instead of using the generic `game.html` runtime.

## Proposed folder structure

```text
rem-runner/
  index.html
  styles.css
  src/
    main.js
    core/
      game.js
      loop.js
      input.js
      collision.js
      camera.js
      audio.js
      save.js
    content/
      worlds/taller-rem.js
      enemies.js
      inks.js
      collectibles.js
    entities/
      player.js
      enemy.js
      projectile.js
      platform.js
      portal.js
    systems/
      combat.js
      quality.js
      production.js
      progression.js
    scenes/
      workshop.js
      level.js
      boss.js
      reward.js
    ui/
      hud.js
      touch-controls.js
      pause-menu.js
  assets/
    sprites/
    tiles/
    ui/
    audio/
```

## Visual direction

- Brand palette: REM green `#0f8f38`, black, white.
- Hard black outlines, 2px machine-like UI borders, sharp corners, textile and ink-particle textures.
- REM logo used only as the untouched source asset from `assets/rema-logo.png` on menus, protagonist clothing, workshop signage, and rewards.
- Urban production workshop: presses, racks, film rolls, boxes, screens, portals, and print marks. No visual borrowing from Mario games.

## Player state machine

`idle`, `walk`, `run`, `crouch`, `jump`, `fall`, `aim`, `ink-fire`, `hurt`, `repair`, `portal-enter`, `victory`, `defeated`.

The player has acceleration, coyote time, jump buffering, one air jump unlocked by the REM cap power-up, invulnerability frames after damage, and a readable aim direction. These rules make mobile controls forgiving without changing the platforming challenge.

## Three ink modes

1. **Tinta Conductiva, green** — activates presses, moving platforms, and machine switches.
2. **Tinta Reveladora, white** — reveals hidden design paths and repairs pixelized surfaces.
3. **Tinta Fijadora, black** — immobilizes ink hazards and converts defective objects into temporary platforms.

Ink changes with one mobile button and a keyboard key. The HUD always shows the selected cartridge, remaining charge, and contextual target feedback.

## World 1: El Taller REM

### Level 1 — Turno nocturno

Tutorial for run, jump, labels, ink switching, and Conductiva switches. Goal: recover three design files and open the first portal.

### Level 2 — Línea de producción

Moving presses, belt platforms, defective packages, hidden Reveladora routes, and quality-risk hazards. Goal: complete two production orders before entering the portal.

### Level 3 — Archivo perdido

Combines all inks, secret collectible paths, and arena setup for the boss.

### Boss — El Diseño Pixelado

An original corrupted print file that creates pixel walls, defective package projectiles, and repair windows. It is repaired, not killed. The player identifies its exposed pattern and applies Reveladora followed by Fijadora.

## Enemy roster

1. Mancha de tinta — hops and leaves slow zones.
2. Diseño pixelado — moves in square patterns and hides weak points.
3. Burbuja de aire — floats, blocks jumps, and can be fixed with Fijadora.
4. Remera arrugada — charges in short bursts and becomes a platform when repaired.
5. Rodillo descontrolado — patrols production lines and is paused by Conductiva.

## Collectibles and scoring

- Etiquetas REM: 10 points each; 100 creates a one-hit protection.
- Botellas de tinta: refill a cartridge.
- Diseños PNG: 100 points and raise Calidad REM.
- Prendas recuperadas: 250 points and unlock cosmetic records.
- Paquetes listos: 200 points when delivered safely.

Completed-level score = base production points + time bonus + quality multiplier + collectible bonus. The final score is submitted once through the existing Supabase score UI.

## Calidad REM system

Starts at 100. Damage, wrong ink, broken packages, missed designs, and hazardous printing lower it. Perfect repairs, full collection, quick finish, and rescued orders restore it.

- 0–34: Estampado fallido
- 35–64: Calidad estándar
- 65–89: Calidad premium
- 90–100: Exceso de calidad

Only the workshop and reward screens may expose store links or coupons. No commercial links appear during a level.

## Controls

Desktop: left/right, jump, crouch, run, aim/fire, switch ink, interact, pause.

Mobile: left/right directional cluster, jump, fire, ink switch, interact, pause. Targets must be at least 48px and placed outside the gameplay viewport.

## Required original assets

- Protagonist sprite sheet: idle, walk, run, jump, fall, aim, fire, hurt, victory.
- Three ink projectile and impact effects.
- Five enemy sprite sheets with repair transitions.
- Workshop tile set, presses, belts, boxes, racks, portal, boss arena.
- Collectible icon set and machine UI icons.
- Original sound set: jump, print, repair, pickup, portal, quality rank, boss phases.
- REM logo source file reused unchanged.

Use geometric placeholders during code development, then replace them only with created or licensed original assets.

## Delivery stages

1. **Foundation:** standalone route, render loop, camera, input, responsive canvas, workshop menu.
2. **Movement:** player state machine, collision, run, jump, crouch, touch controls, pause.
3. **Print system:** aim, three inks, targets, switches, charge, feedback.
4. **Level content:** three Taller REM levels, collectibles, five enemies, portals.
5. **Quality and boss:** production orders, Calidad REM, boss phases, victory and defeat states.
6. **Progression:** local save, cosmetics placeholder, final Supabase submission, reward screen.
7. **Quality pass:** performance profiling on mobile, accessibility, test runs, art replacement, audio mix.

## Acceptance criteria for MVP

- Three levels can be completed consecutively on a 390px-wide mobile viewport.
- All three ink types are required at least once.
- Five enemy types and the boss use repair-based, non-lethal resolution.
- Calidad REM determines one of four grades on the reward screen.
- Keyboard and touch paths complete the same level.
- Restart, pause, win, lose, and score submission have no runtime errors.
- No non-original third-party game assets are included.
