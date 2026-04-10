import { Graphics } from "pixi.js";
import { BALL_RADIUS, clamp, type Ball } from "@cursor-soccer/shared";

/**
 * Renders the ball into `graphics`, applying a speed-based stretch effect.
 * The graphics object is cleared before drawing.
 */
export function renderBall(graphics: Graphics, ball: Ball): void {
  graphics.clear();

  const speed = Math.hypot(ball.velocityX, ball.velocityY);
  const stretchFactor = clamp(speed / 1400, 0, 0.45);
  const radiusX = BALL_RADIUS * (1 + stretchFactor);
  const radiusY = BALL_RADIUS * (1 - stretchFactor * 0.4);
  const angle = speed > 10 ? Math.atan2(ball.velocityY, ball.velocityX) : 0;

  graphics.position.set(ball.x, ball.y);
  graphics.rotation = angle;

  // Core
  graphics.beginFill(0xfffce5, 0.98);
  graphics.drawEllipse(0, 0, radiusX, radiusY);
  graphics.endFill();

  // Speed glow halo
  graphics.beginFill(0xffdd8a, 0.15 + stretchFactor * 0.5);
  graphics.drawEllipse(0, 0, radiusX * 1.3, radiusY * 1.3);
  graphics.endFill();
}
