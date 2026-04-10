import { Graphics } from "pixi.js";
import {
  FIELD_CORNER_RADIUS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  GOAL_HEIGHT,
} from "@cursor-soccer/shared";
import type { FieldTheme } from "../fieldThemes";

/**
 * Redraws the entire pitch (background, grid, borders, goals, centre circle)
 * into `graphics`.  Clearing before drawing is the caller's responsibility if
 * needed, but this function always clears first for safety.
 */
export function renderField(graphics: Graphics, theme: FieldTheme): void {
  const goalHalfHeight = GOAL_HEIGHT * 0.5;
  const goalTop = FIELD_HEIGHT * 0.5 - goalHalfHeight;

  graphics.clear();

  // Pitch background
  graphics.beginFill(theme.pitchFill, theme.pitchAlpha);
  graphics.drawRoundedRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT, FIELD_CORNER_RADIUS);
  graphics.endFill();

  // Subtle background grid
  graphics.lineStyle(1, theme.borderColor, theme.borderAlpha * 0.15);
  const gridSize = 100;
  for (let x = gridSize; x < FIELD_WIDTH; x += gridSize) {
    graphics.moveTo(x, 0);
    graphics.lineTo(x, FIELD_HEIGHT);
  }
  for (let y = gridSize; y < FIELD_HEIGHT; y += gridSize) {
    graphics.moveTo(0, y);
    graphics.lineTo(FIELD_WIDTH, y);
  }

  // Outer border
  graphics.lineStyle(theme.borderWidth, theme.borderColor, theme.borderAlpha);
  graphics.drawRoundedRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT, FIELD_CORNER_RADIUS);

  // Inner border
  graphics.lineStyle(
    theme.borderWidth * 0.8,
    theme.innerBorderColor,
    theme.innerBorderAlpha
  );
  graphics.drawRoundedRect(
    theme.innerBorderInset,
    theme.innerBorderInset,
    FIELD_WIDTH - theme.innerBorderInset * 2,
    FIELD_HEIGHT - theme.innerBorderInset * 2,
    Math.max(2, FIELD_CORNER_RADIUS - theme.innerBorderInset * 0.5)
  );

  // Centre line
  graphics.lineStyle(
    theme.centerLineWidth,
    theme.centerLineColor,
    theme.centerLineAlpha
  );
  graphics.moveTo(FIELD_WIDTH * 0.5, 16);
  graphics.lineTo(FIELD_WIDTH * 0.5, FIELD_HEIGHT - 16);

  // Centre circle
  graphics.lineStyle(
    theme.centerLineWidth * 0.7,
    theme.centerCircleColor,
    theme.centerCircleAlpha
  );
  graphics.drawCircle(
    FIELD_WIDTH * 0.5,
    FIELD_HEIGHT * 0.5,
    theme.centerCircleRadius
  );

  // Goal posts
  graphics.lineStyle(
    theme.borderWidth * 0.75,
    theme.borderColor,
    theme.borderAlpha * 0.9
  );
  graphics.drawRect(-20, goalTop, 20, GOAL_HEIGHT);
  graphics.drawRect(FIELD_WIDTH, goalTop, 20, GOAL_HEIGHT);
}
