import { Graphics } from "pixi.js";
import { getParticles } from "../utils/particles";
import type { Shockwave } from "../types/game.types";

/**
 * Renders all active shockwaves and particles into `fxGraphics`.
 * The graphics layer is cleared before drawing.
 *
 * @param fxGraphics  Dedicated FX graphics layer (world-space).
 * @param shockwaves  Live shockwave array.  Expired entries are removed in-place.
 * @param dt          Frame delta time in seconds.
 */
export function renderFX(
  fxGraphics: Graphics,
  shockwaves: Shockwave[],
  dt: number
): void {
  fxGraphics.clear();

  // ── Shockwaves ─────────────────────────────────────────────────────────────
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i]!;
    sw.radius += 1200 * dt;
    sw.alpha -= 3.5 * dt;
    if (sw.alpha <= 0) {
      shockwaves.splice(i, 1);
    } else {
      fxGraphics.lineStyle(6, sw.color, sw.alpha);
      fxGraphics.drawCircle(sw.x, sw.y, sw.radius);
    }
  }

  // ── Particles ──────────────────────────────────────────────────────────────
  fxGraphics.lineStyle(0);
  for (const p of getParticles()) {
    const alpha = 1 - p.life / p.maxLife;
    fxGraphics.beginFill(p.color, alpha);
    fxGraphics.drawCircle(p.x, p.y, p.size);
    fxGraphics.endFill();
  }
}
