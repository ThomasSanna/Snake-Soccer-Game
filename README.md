# Cursor Soccer - Prototype Phase 1

This repository now includes the first playable local prototype aligned with the GDD and roadmap:

- PixiJS/WebGL render loop
- snake-like player with inertia steering toward mouse
- stamina and sprint system (mouse click or Space)
- ball physics with damping and wall bounces
- collision split: strong hit on head, softer absorption on body
- fixed tick-rate physics loop at 60 Hz

## Structure

- `packages/client`: local game prototype (Vite + PixiJS)
- `packages/shared`: shared gameplay constants and utility types
- `packages/server`: scaffold for future authoritative multiplayer phase

## Quick start

```bash
npm install
npm run dev
```

Then open the Vite URL in your browser.

## Controls

- Move mouse to steer the snake head
- Hold left click or Space to sprint (consumes stamina)
