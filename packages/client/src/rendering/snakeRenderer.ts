import { Graphics } from "pixi.js";
import {
  SNAKE_BODY_RADIUS,
  SNAKE_HEAD_RADIUS,
  STAMINA_MAX,
  type Snake,
} from "@cursor-soccer/shared";

export interface SnakePalette {
  bodyColor: number;
  headColor: number;
  glowColor: number;
}

/**
 * Renders a snake into the provided Graphics object.
 *
 * @param graphics        The shared snake graphics layer (caller clears it
 *                        once before rendering all snakes in a frame).
 * @param snake           The snake state to render.
 * @param palette         Colour set for this snake.
 * @param staminaOverride If provided, overrides snake.stamina for the glow
 *                        intensity (useful for the bot which has infinite
 *                        stamina visually).
 */
export function renderSnake(
  graphics: Graphics,
  snake: Snake,
  palette: SnakePalette,
  staminaOverride?: number
): void {
  const staminaRatio =
    staminaOverride !== undefined
      ? staminaOverride
      : snake.stamina / STAMINA_MAX;

  const segments = snake.segments;
  const segmentCount = segments.length;

  // ── Tapering glow layer ────────────────────────────────────────────────────
  for (let i = 0; i < segmentCount - 1; i++) {
    const p1 = segments[i]!;
    const p2 = segments[i + 1]!;
    const ratio = 1 - i / (segmentCount - 1);
    const thickness = SNAKE_BODY_RADIUS * 3.5 * (0.3 + 0.7 * ratio);

    graphics.lineStyle(
      thickness,
      palette.glowColor,
      (0.05 + staminaRatio * 0.15) * ratio
    );
    graphics.moveTo(p1.x, p1.y);
    graphics.lineTo(p2.x, p2.y);
  }

  // ── Tapering core layer ────────────────────────────────────────────────────
  for (let i = 0; i < segmentCount - 1; i++) {
    const p1 = segments[i]!;
    const p2 = segments[i + 1]!;
    const ratio = 1 - i / (segmentCount - 1);
    const thickness = SNAKE_BODY_RADIUS * 1.8 * (0.3 + 0.7 * ratio);

    graphics.lineStyle(thickness, palette.bodyColor, 0.5 + 0.5 * ratio);
    graphics.moveTo(p1.x, p1.y);
    graphics.lineTo(p2.x, p2.y);
  }

  // ── Head ──────────────────────────────────────────────────────────────────
  const head = segments[0]!;
  graphics.lineStyle(0);

  graphics.beginFill(palette.headColor, 0.96);
  graphics.drawCircle(head.x, head.y, SNAKE_HEAD_RADIUS);
  graphics.endFill();

  graphics.beginFill(palette.glowColor, 0.08 + staminaRatio * 0.14);
  graphics.drawCircle(head.x, head.y, SNAKE_HEAD_RADIUS * 1.3);
  graphics.endFill();
}
