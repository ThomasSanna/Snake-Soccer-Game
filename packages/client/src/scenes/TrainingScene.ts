import { Application, Container, Graphics, Rectangle, Text, TextStyle } from "pixi.js";
import {
  BALL_DAMPING_PER_TICK,
  BALL_RADIUS,
  BALL_RESTITUTION,
  BASE_MAX_SPEED,
  BODY_RESTITUTION,
  ENEMY_FORWARD_SPEED_FACTOR,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  GOAL_RESET_DELAY_SECONDS,
  HEAD_CARRY_FACTOR,
  HEAD_SHOT_POWER,
  HEAD_SHOT_MAX_IMPULSE,
  PERFECT_FLICK_POWER_MULTIPLIER,
  PERFECT_FLICK_WINDOW_SECONDS,
  SNAKE_BODY_RADIUS,
  SNAKE_HEAD_RADIUS,
  SNAKE_SEGMENT_COUNT,
  SNAKE_SEGMENT_LENGTH,
  SPRINT_MULTIPLIER,
  STAMINA_DRAIN_PER_SECOND,
  STAMINA_MAX,
  STAMINA_RECOVER_PER_SECOND,
  TICK_RATE,
  clamp,
  BASE_TURN_RATE_RAD_PER_SECOND,
  FIELD_THEME_STORAGE_KEY,
  SNAKE_VS_SNAKE_HEAD_RESTITUTION,
  BALL_PHYSICS_SUBSTEPS,
  BALL_BODY_COLLISION_PADDING,
  BALL_BODY_TANGENTIAL_DAMPING,
  SNAKE_BODY_CARRY_FACTOR,
  SNAKE_BODY_MAX_BOUNCE_IMPULSE,
  WHIP_CURVATURE_THRESHOLD,
  WHIP_SURFACE_SPEED_THRESHOLD,
  WHIP_TANGENT_TRANSFER,
  WHIP_MAX_IMPULSE,
  BODY_SPEED_RESTITUTION_BOOST,
  BODY_SPEED_RESTITUTION_THRESHOLD,
  SNAKE_BODY_IMPACT_PUSH_FACTOR,
  SNAKE_BODY_IMPACT_SPEED_FACTOR,
  SNAKE_BODY_IMPACT_MAX_PUSH,
  SNAKE_BODY_IMPACT_SEGMENT_RANGE,
  SNAKE_BODY_IMPACT_VELOCITY_TRANSFER,
  SNAKE_BODY_IMPACT_MAX_VELOCITY_TRANSFER,
  BALL_BODY_SOLVER_ITERATIONS,
  BALL_MAX_PUSH_PER_ITERATION,
  SNAKE_CONSTRAINT_PASSES,
  SNAKE_CURVATURE_SMOOTHING,
  SNAKE_SELF_SEPARATION_DISTANCE,
  SNAKE_SELF_SEPARATION_RELAX,
  InputState,
  Snake,
  Ball,
  resolveSnakeVsSnakeCollision,
  GoalSide,
  normalizeAngle,
} from "@cursor-soccer/shared";
import {
  DEFAULT_FIELD_THEME_ID,
  FIELD_THEME_IDS,
  getFieldTheme,
  getFieldThemeBySlot,
  isFieldThemeId,
  type FieldTheme,
  type FieldThemeId,
} from "../fieldThemes";
import { renderField } from "../rendering/fieldRenderer";
import { renderSnake, type SnakePalette } from "../rendering/snakeRenderer";
import { renderBall } from "../rendering/ballRenderer";
import { renderFX } from "../rendering/fxRenderer";
import { emitParticles, tickParticles, clearParticles } from "../utils/particles";
import { playSound } from "../utils/audio";
import type { GameScene, Shockwave } from "../types/game.types";

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAYER_PALETTE: SnakePalette = {
  bodyColor: 0x33f0ff,
  headColor: 0x98ffff,
  glowColor: 0xb9ffff,
};

const ENEMY_PALETTE: SnakePalette = {
  bodyColor: 0xff7f52,
  headColor: 0xffc0a3,
  glowColor: 0xffa16f,
};

const UI_MARGIN_TOP = 130;
const UI_MARGIN_BOTTOM = 110;
const UI_MARGIN_SIDES = 60;

// ─── Theme persistence helpers ────────────────────────────────────────────────

function readStoredThemeId(): FieldThemeId | null {
  try {
    const stored = window.localStorage.getItem(FIELD_THEME_STORAGE_KEY);
    if (!stored || !isFieldThemeId(stored)) return null;
    return stored;
  } catch {
    return null;
  }
}

function persistThemeId(themeId: FieldThemeId): void {
  try {
    window.localStorage.setItem(FIELD_THEME_STORAGE_KEY, themeId);
  } catch {
    // Ignore storage failures in restrictive browser modes.
  }
}

// ─── TrainingScene ────────────────────────────────────────────────────────────

/**
 * The Training scene: player vs straight-line bot.
 *
 * Lifecycle:
 *   mount()   → creates the Pixi app, wires input, starts the game loop.
 *   destroy() → stops the ticker, removes the canvas, clears all listeners.
 */
export class TrainingScene implements GameScene {
  private readonly root: HTMLElement;
  private readonly onExit: () => void;

  private app: Application | null = null;
  private abortController = new AbortController();

  constructor(root: HTMLElement, onExit: () => void) {
    this.root = root;
    this.onExit = onExit;
  }

  // ── Public lifecycle ───────────────────────────────────────────────────────

  mount(): void {
    this.abortController = new AbortController();
    void this.init();
  }

  destroy(): void {
    this.abortController.abort();
    clearParticles();
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }

  // ── Private initialisation ─────────────────────────────────────────────────

  private async init(): Promise<void> {
    const { signal } = this.abortController;

    // ── Pixi Application ────────────────────────────────────────────────────
    this.app = new Application({
      antialias: true,
      backgroundColor: 0x060913,
      resizeTo: window,
    });
    if (signal.aborted) { this.app.destroy(true); this.app = null; return; }
    this.root.appendChild(this.app.view as HTMLCanvasElement);
    this.app.ticker.maxFPS = 144;

    // ── Stage layers ────────────────────────────────────────────────────────
    const world = new Container();
    const uiLayer = new Container();
    this.app.stage.addChild(world, uiLayer);

    const topUI = new Container();
    const bottomUI = new Container();
    uiLayer.addChild(topUI, bottomUI);

    const fieldGraphics = new Graphics();
    const fxGraphics = new Graphics();
    const snakeGraphics = new Graphics();
    const ballGraphics = new Graphics();
    world.addChild(fieldGraphics, fxGraphics, snakeGraphics, ballGraphics);

    // ── HUD ─────────────────────────────────────────────────────────────────
    const scoreText = new Text(
      "0 - 0",
      new TextStyle({
        fontFamily: "Arial, sans-serif",
        fontWeight: "900",
        fontSize: 64,
        fill: 0xffffff,
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowAlpha: 0.5,
        dropShadowBlur: 10,
        dropShadowDistance: 0,
        letterSpacing: 4,
      })
    );
    scoreText.anchor.set(0.5, 0.5);
    topUI.addChild(scoreText);

    const infoText = new Text(
      "",
      new TextStyle({ fontFamily: "Consolas, monospace", fontSize: 14, fill: 0x888888 })
    );
    infoText.anchor.set(0.5, 0);
    infoText.y = 45;
    topUI.addChild(infoText);

    // Back-to-menu button (HTML overlay, not Pixi)
    const backBtn = document.createElement("button");
    backBtn.id = "btn-back-to-menu";
    backBtn.textContent = "← Menu";
    backBtn.className = "back-btn";
    this.root.appendChild(backBtn);
    backBtn.addEventListener("click", () => this.onExit(), { signal });

    const staminaLabel = new Text(
      "STAMINA",
      new TextStyle({
        fontFamily: "Arial, sans-serif",
        fontWeight: "800",
        fontSize: 14,
        fill: 0xaaaaaa,
        letterSpacing: 4,
      })
    );
    staminaLabel.anchor.set(0.5, 1);
    staminaLabel.y = -10;

    const staminaBg = new Graphics();
    const staminaFill = new Graphics();
    bottomUI.addChild(staminaLabel, staminaBg, staminaFill);

    // ── Game state ───────────────────────────────────────────────────────────
    const playerSnake = new Snake(FIELD_WIDTH * 0.25, FIELD_HEIGHT * 0.5);
    const enemySnake = new Snake(FIELD_WIDTH * 0.75, FIELD_HEIGHT * 0.5);
    const enemyForwardSpeed = BASE_MAX_SPEED * ENEMY_FORWARD_SPEED_FACTOR;
    const ball = new Ball();
    const shockwaves: Shockwave[] = [];

    let activeTheme: FieldTheme =
      getFieldTheme(readStoredThemeId() ?? DEFAULT_FIELD_THEME_ID);
    let playerScore = 0;
    let enemyScore = 0;
    let resetCountdown = 0;
    let screenShakeTimer = 0;

    const input: InputState = {
      mouseX: playerSnake.head.x,
      mouseY: playerSnake.head.y,
      sprint: false,
      anchor: false,
    };

    // ── Ball event hooks ─────────────────────────────────────────────────────
    ball.onWallHit = (x, y, v) => {
      if (v > 150) playSound("bounce_wall.mp3", v / 1500);
      if (v > 200) emitParticles(x, y, 0xffffff, 6, 250);
    };
    ball.onHeadHit = (x, y, approach) => {
      emitParticles(x, y, 0xaaffff, 12, 350);
      playSound("hit_head.mp3", clamp(Math.abs(approach) / 800, 0.2, 0.8));
    };
    ball.onPerfectFlick = (x, y) => {
      emitParticles(x, y, 0xffaa00, 30, 800);
      playSound("hit_perfect.mp3", 1.0);
      screenShakeTimer = Math.min(screenShakeTimer + 0.15, 0.4);
      shockwaves.push({ x, y, radius: BALL_RADIUS, alpha: 1, color: 0xffaa00 });
    };
    ball.onBodyHit = (x, y, bounce) => {
      emitParticles(x, y, 0xaaffff, 5, 200);
      playSound("hit_body.mp3", clamp(bounce / 400, 0.1, 0.6));
    };
    ball.onWhipHit = (x, y, whip) => {
      emitParticles(x, y, 0x88ff88, 6, 250);
      playSound("hit_whip.mp3", clamp(whip / 300, 0.2, 0.7));
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const resetRound = (): void => {
      playerSnake.reset(FIELD_WIDTH * 0.25, FIELD_HEIGHT * 0.5, 1, 0, 0, true);
      enemySnake.reset(FIELD_WIDTH * 0.75, FIELD_HEIGHT * 0.5, -1, 0, enemyForwardSpeed, true);
      ball.reset(FIELD_WIDTH * 0.5, FIELD_HEIGHT * 0.5);
      input.mouseX = playerSnake.head.x;
      input.mouseY = playerSnake.head.y;
    };

    const applyThemeById = (themeId: FieldThemeId): void => {
      activeTheme = getFieldTheme(themeId);
      persistThemeId(themeId);
    };

    const cycleTheme = (step: number): void => {
      const idx = FIELD_THEME_IDS.indexOf(activeTheme.id);
      const next = (idx + step + FIELD_THEME_IDS.length) % FIELD_THEME_IDS.length;
      applyThemeById(FIELD_THEME_IDS[next]);
    };

    // ── Viewport ─────────────────────────────────────────────────────────────
    const updateViewport = (): void => {
      if (!this.app) return;
      const safeW = Math.max(10, this.app.screen.width - UI_MARGIN_SIDES * 2);
      const safeH = Math.max(10, this.app.screen.height - UI_MARGIN_TOP - UI_MARGIN_BOTTOM);
      const scale = Math.min(safeW / FIELD_WIDTH, safeH / FIELD_HEIGHT);

      world.scale.set(scale, scale);
      world.position.set(
        (this.app.screen.width - FIELD_WIDTH * scale) * 0.5,
        UI_MARGIN_TOP + (safeH - FIELD_HEIGHT * scale) * 0.5
      );
      this.app.stage.hitArea = new Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
      topUI.position.set(this.app.screen.width * 0.5, UI_MARGIN_TOP * 0.45);
      bottomUI.position.set(this.app.screen.width * 0.5, this.app.screen.height - UI_MARGIN_BOTTOM * 0.45);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport, { signal });

    // ── Input listeners ──────────────────────────────────────────────────────
    this.app.stage.eventMode = "static";
    this.app.stage.on("pointermove", (event) => {
      const wx = (event.global.x - world.position.x) / world.scale.x;
      const wy = (event.global.y - world.position.y) / world.scale.y;
      input.mouseX = clamp(wx, 0, FIELD_WIDTH);
      input.mouseY = clamp(wy, 0, FIELD_HEIGHT);
    });

    (this.app.view as HTMLCanvasElement).addEventListener(
      "contextmenu",
      (e) => e.preventDefault(),
      { signal }
    );

    window.addEventListener(
      "mousedown",
      (e) => {
        if (e.button === 0) input.sprint = true;
        if (e.button === 2) input.anchor = true;
      },
      { signal }
    );

    window.addEventListener(
      "mouseup",
      (e) => {
        if (e.button === 0) input.sprint = false;
        if (e.button === 2) input.anchor = false;
      },
      { signal }
    );

    window.addEventListener(
      "keydown",
      (e) => {
        if (e.code === "Space") { input.sprint = true; return; }
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") { input.anchor = true; return; }
        if (e.code === "Escape") { this.onExit(); return; }
        if (e.code.startsWith("Digit")) {
          const slot = Number.parseInt(e.code.replace("Digit", ""), 10);
          if (Number.isFinite(slot) && slot >= 1 && slot <= FIELD_THEME_IDS.length) {
            applyThemeById(FIELD_THEME_IDS[slot - 1]);
          }
          return;
        }
        if (e.code === "BracketLeft") { cycleTheme(-1); return; }
        if (e.code === "BracketRight") { cycleTheme(1); }
      },
      { signal }
    );

    window.addEventListener(
      "keyup",
      (e) => {
        if (e.code === "Space") input.sprint = false;
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") input.anchor = false;
      },
      { signal }
    );

    resetRound();

    // ── Game loop ─────────────────────────────────────────────────────────────
    const fixedDt = 1 / TICK_RATE;
    let accumulator = 0;

    this.app.ticker.add(() => {
      if (!this.app) return;
      const frameDt = this.app.ticker.deltaMS / 1000;
      accumulator += frameDt;

      // Physics ticks
      while (accumulator >= fixedDt) {
        if (resetCountdown > 0) {
          resetCountdown = Math.max(0, resetCountdown - fixedDt);
          if (resetCountdown === 0) resetRound();
          accumulator -= fixedDt;
          continue;
        }

        playerSnake.update(input, fixedDt);
        enemySnake.updateForward(fixedDt, enemyForwardSpeed);
        resolveSnakeVsSnakeCollision(playerSnake, enemySnake);

        const ballSubDt = fixedDt / BALL_PHYSICS_SUBSTEPS;
        for (let sub = 0; sub < BALL_PHYSICS_SUBSTEPS; sub++) {
          const lerpFactor = (sub + 1) / BALL_PHYSICS_SUBSTEPS;
          ball.update(ballSubDt);
          ball.collideWithSnake(playerSnake, ballSubDt, lerpFactor);
          ball.collideWithSnake(enemySnake, ballSubDt, lerpFactor);

          if (ball.perfectFlickTriggered) {
            ball.perfectFlickTriggered = false;
            screenShakeTimer = 0.2;
            shockwaves.push({ x: ball.x, y: ball.y, radius: BALL_RADIUS, alpha: 1, color: 0xffffff });
          }

          const scored = ball.getScoredGoalSide();
          if (scored === "left") {
            enemyScore++;
            resetCountdown = GOAL_RESET_DELAY_SECONDS;
            playSound("goal_scored.mp3", 1.0);
            break;
          }
          if (scored === "right") {
            playerScore++;
            resetCountdown = GOAL_RESET_DELAY_SECONDS;
            playSound("goal_scored.mp3", 1.0);
            break;
          }
        }

        accumulator -= fixedDt;
      }

      // Render
      renderField(fieldGraphics, activeTheme);
      tickParticles(frameDt);
      renderFX(fxGraphics, shockwaves, frameDt);

      // Screen shake
      if (screenShakeTimer > 0) {
        screenShakeTimer = Math.max(0, screenShakeTimer - frameDt);
        const intensity = (screenShakeTimer / 0.2) * 12;
        const safeW = Math.max(10, this.app.screen.width - UI_MARGIN_SIDES * 2);
        const safeH = Math.max(10, this.app.screen.height - UI_MARGIN_TOP - UI_MARGIN_BOTTOM);
        const scale = Math.min(safeW / FIELD_WIDTH, safeH / FIELD_HEIGHT);
        world.position.set(
          (this.app.screen.width - FIELD_WIDTH * scale) * 0.5 + (Math.random() - 0.5) * 2 * intensity,
          UI_MARGIN_TOP + (safeH - FIELD_HEIGHT * scale) * 0.5 + (Math.random() - 0.5) * 2 * intensity
        );
      }

      snakeGraphics.clear();
      renderSnake(snakeGraphics, playerSnake, PLAYER_PALETTE);
      renderSnake(snakeGraphics, enemySnake, ENEMY_PALETTE, 1);
      renderBall(ballGraphics, ball);

      // HUD update
      const resetLabel = resetCountdown > 0 ? ` (Reset: ${Math.ceil(resetCountdown)}s)` : "";
      scoreText.text = `YOU ${playerScore} - ${enemyScore} BOT${resetLabel}`;
      scoreText.style.fill = resetCountdown > 0 ? 0xff4444 : 0xffffff;
      infoText.text = `Training Mode | [Esc] Menu | [Space/Click] Sprint | [ ] or 1-${FIELD_THEME_IDS.length} Themes`;

      const barWidth = Math.min(600, this.app.screen.width - 80);
      const barHeight = 14;
      const staminaPct = playerSnake.stamina / STAMINA_MAX;

      staminaBg.clear();
      staminaBg.beginFill(0x222222, 0.8);
      staminaBg.drawRoundedRect(-barWidth * 0.5, 0, barWidth, barHeight, barHeight * 0.5);
      staminaBg.endFill();

      const fillColor = input.anchor
        ? 0xffa500
        : input.sprint && !playerSnake.sprintExhausted
          ? 0xffffff
          : playerSnake.sprintExhausted
            ? 0xff4444
            : 0x00ffcc;
      const fillAlpha = playerSnake.sprintExhausted ? 0.5 : 1.0;

      staminaFill.clear();
      staminaFill.beginFill(fillColor, fillAlpha);
      staminaFill.drawRoundedRect(
        -barWidth * 0.5,
        0,
        Math.max(10, barWidth * Math.max(0, staminaPct)),
        barHeight,
        barHeight * 0.5
      );
      staminaFill.endFill();
    });
  }
}
