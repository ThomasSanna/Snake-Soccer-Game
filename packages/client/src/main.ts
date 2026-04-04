import "./styles.css";

import {
  Application,
  Container,
  Graphics,
  Rectangle,
  Text,
  TextStyle
} from "pixi.js";
import {
  BALL_DAMPING_PER_TICK,
  BALL_RADIUS,
  BALL_RESTITUTION,
  BASE_MAX_SPEED,
  BODY_RESTITUTION,
  ENEMY_FORWARD_SPEED_FACTOR,
  FIELD_CORNER_RADIUS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  GOAL_HEIGHT,
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
  length,
  type Segment,
  BASE_TURN_RATE_RAD_PER_SECOND,
  FIELD_THEME_STORAGE_KEY,
  SNAKE_VS_SNAKE_HEAD_RESTITUTION,
  BALL_SNAKE_COLLISION_PASSES,
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
  BALL_PHYSICS_SUBSTEPS,
  BALL_BODY_SOLVER_ITERATIONS,
  BALL_MAX_PUSH_PER_ITERATION,
  SNAKE_CONSTRAINT_PASSES,
  SNAKE_CURVATURE_SMOOTHING,
  SNAKE_SELF_SEPARATION_DISTANCE,
  SNAKE_SELF_SEPARATION_RELAX,
  InputState,
  GoalSide,
  Snake,
  Ball,
  resolveSnakeVsSnakeCollision,
  resolveHeadToHead,
  resolveHeadAgainstBody,
  normalizeAngle
} from "@cursor-soccer/shared";
import {
  DEFAULT_FIELD_THEME_ID,
  FIELD_THEME_IDS,
  getFieldTheme,
  getFieldThemeBySlot,
  isFieldThemeId,
  type FieldTheme,
  type FieldThemeId
} from "./fieldThemes";


const PLAYER_PALETTE = {
  bodyColor: 0x33f0ff,
  headColor: 0x98ffff,
  glowColor: 0xb9ffff
};
const ENEMY_PALETTE = {
  bodyColor: 0xff7f52,
  headColor: 0xffc0a3,
  glowColor: 0xffa16f
};




type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number; size: number };
const particles: Particle[] = [];

export function emitParticles(x: number, y: number, color: number, count: number, baseSpeed: number): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * baseSpeed;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 0.15 + Math.random() * 0.35,
      color,
      size: 1.5 + Math.random() * 3
    });
  }
}

export function playSound(filename: string, volume: number = 0.5): void {
  try {
    const audio = new Audio(`/sounds/${filename}`);
    audio.volume = clamp(volume, 0, 1);
    audio.play().catch(() => { /* Les fichiers manquants seront ignorés silencieusement */ });
  } catch {
    // Ignore context blocked errors
  }
}


function drawSmoothSnakePath(graphics: Graphics, segments: Segment[]): void {
  if (segments.length === 0) {
    return;
  }

  graphics.moveTo(segments[0].x, segments[0].y);

  if (segments.length === 1) {
    return;
  }

  if (segments.length === 2) {
    graphics.lineTo(segments[1].x, segments[1].y);
    return;
  }

  for (let i = 1; i < segments.length - 1; i += 1) {
    const current = segments[i];
    const next = segments[i + 1];
    const midX = (current.x + next.x) * 0.5;
    const midY = (current.y + next.y) * 0.5;
    graphics.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  const tail = segments[segments.length - 1];
  graphics.lineTo(tail.x, tail.y);
}


function readStoredThemeId(): FieldThemeId | null {
  try {
    const stored = window.localStorage.getItem(FIELD_THEME_STORAGE_KEY);
    if (!stored || !isFieldThemeId(stored)) {
      return null;
    }
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


type Shockwave = { x: number; y: number; radius: number; alpha: number; color: number };

async function main(): Promise<void> {
  const appHost = document.getElementById("app");
  if (!appHost) {
    throw new Error("Missing #app root element");
  }

  const app = new Application({
    antialias: true,
    backgroundColor: 0x060913,
    resizeTo: window
  });
  appHost.appendChild(app.view as HTMLCanvasElement);
  app.ticker.maxFPS = 144;

  const world = new Container();
  app.stage.addChild(world);

  const uiLayer = new Container();
  app.stage.addChild(uiLayer);

  const topUI = new Container();
  const bottomUI = new Container();
  uiLayer.addChild(topUI, bottomUI);

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
      letterSpacing: 4
    })
  );
  scoreText.anchor.set(0.5, 0.5);
  topUI.addChild(scoreText);

  const infoText = new Text(
    "",
    new TextStyle({
      fontFamily: "Consolas, monospace",
      fontSize: 14,
      fill: 0x888888
    })
  );
  infoText.anchor.set(0.5, 0);
  infoText.y = 45;
  topUI.addChild(infoText);

  const staminaLabel = new Text(
    "STAMINA",
    new TextStyle({
      fontFamily: "Arial, sans-serif",
      fontWeight: "800",
      fontSize: 14,
      fill: 0xaaaaaa,
      letterSpacing: 4
    })
  );
  staminaLabel.anchor.set(0.5, 1);
  staminaLabel.y = -10;

  const staminaBg = new Graphics();
  const staminaFill = new Graphics();
  bottomUI.addChild(staminaLabel, staminaBg, staminaFill);

  const fieldGraphics = new Graphics();
  const fxGraphics = new Graphics();
  const snakeGraphics = new Graphics();
  const ballGraphics = new Graphics();

  world.addChild(fieldGraphics, fxGraphics, snakeGraphics, ballGraphics);

  const UI_MARGIN_TOP = 130;
  const UI_MARGIN_BOTTOM = 110;
  const UI_MARGIN_SIDES = 60;

  const shockwaves: Shockwave[] = [];
  let screenShakeTimer = 0;


  const playerSnake = new Snake(FIELD_WIDTH * 0.25, FIELD_HEIGHT * 0.5);
  const enemySnake = new Snake(FIELD_WIDTH * 0.75, FIELD_HEIGHT * 0.5);
  const enemyForwardSpeed = BASE_MAX_SPEED * ENEMY_FORWARD_SPEED_FACTOR;
  const ball = new Ball();

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

  let activeTheme: FieldTheme = getFieldTheme(readStoredThemeId() ?? DEFAULT_FIELD_THEME_ID);
  let playerScore = 0;
  let enemyScore = 0;
  let resetCountdown = 0;
  const input: InputState = {
    mouseX: playerSnake.head.x,
    mouseY: playerSnake.head.y,
    sprint: false,
    anchor: false
  };

  const resetRound = (): void => {
    playerSnake.reset(FIELD_WIDTH * 0.25, FIELD_HEIGHT * 0.5, 1, 0, 0, true);
    enemySnake.reset(FIELD_WIDTH * 0.75, FIELD_HEIGHT * 0.5, -1, 0, enemyForwardSpeed, true);
    ball.reset(FIELD_WIDTH * 0.5, FIELD_HEIGHT * 0.5);
    input.mouseX = playerSnake.head.x;
    input.mouseY = playerSnake.head.y;
  };

  resetRound();

  const applyThemeById = (themeId: FieldThemeId): void => {
    activeTheme = getFieldTheme(themeId);
    persistThemeId(themeId);
  };

  const applyThemeBySlot = (slot: number): void => {
    const selectedTheme = getFieldThemeBySlot(slot);
    applyThemeById(selectedTheme.id);
  };

  const cycleTheme = (step: number): void => {
    const currentIndex = FIELD_THEME_IDS.indexOf(activeTheme.id);
    const nextIndex = (currentIndex + step + FIELD_THEME_IDS.length) % FIELD_THEME_IDS.length;
    applyThemeById(FIELD_THEME_IDS[nextIndex]);
  };

  const updateViewport = (): void => {
    const safeWidth = Math.max(10, app.screen.width - UI_MARGIN_SIDES * 2);
    const safeHeight = Math.max(10, app.screen.height - UI_MARGIN_TOP - UI_MARGIN_BOTTOM);

    const scale = Math.min(safeWidth / FIELD_WIDTH, safeHeight / FIELD_HEIGHT);
    world.scale.set(scale, scale);

    world.position.set(
      (app.screen.width - FIELD_WIDTH * scale) * 0.5,
      UI_MARGIN_TOP + (safeHeight - FIELD_HEIGHT * scale) * 0.5
    );

    app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);

    topUI.position.set(app.screen.width * 0.5, UI_MARGIN_TOP * 0.45);
    bottomUI.position.set(app.screen.width * 0.5, app.screen.height - UI_MARGIN_BOTTOM * 0.45);
  };
  updateViewport();
  window.addEventListener("resize", updateViewport);

  app.stage.eventMode = "static";
  app.stage.on("pointermove", (event) => {
    const worldX = (event.global.x - world.position.x) / world.scale.x;
    const worldY = (event.global.y - world.position.y) / world.scale.y;
    input.mouseX = clamp(worldX, 0, FIELD_WIDTH);
    input.mouseY = clamp(worldY, 0, FIELD_HEIGHT);
  });

  const canvas = app.view as HTMLCanvasElement;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("mousedown", (e) => {
    if (e.button === 0) input.sprint = true;
    if (e.button === 2) input.anchor = true;
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) input.sprint = false;
    if (e.button === 2) input.anchor = false;
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      input.sprint = true;
      return;
    }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      input.anchor = true;
      return;
    }

    if (event.code.startsWith("Digit")) {
      const slot = Number.parseInt(event.code.replace("Digit", ""), 10);
      if (Number.isFinite(slot) && slot >= 1 && slot <= FIELD_THEME_IDS.length) {
        applyThemeBySlot(slot - 1);
      }
      return;
    }

    if (event.code === "BracketLeft") {
      cycleTheme(-1);
      return;
    }

    if (event.code === "BracketRight") {
      cycleTheme(1);
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
      input.sprint = false;
    }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      input.anchor = false;
    }
  });

  const renderField = (): void => {
    const goalHalfHeight = GOAL_HEIGHT * 0.5;
    const goalTop = FIELD_HEIGHT * 0.5 - goalHalfHeight;

    fieldGraphics.clear();
    fieldGraphics.beginFill(activeTheme.pitchFill, activeTheme.pitchAlpha);
    fieldGraphics.drawRoundedRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT, FIELD_CORNER_RADIUS);
    fieldGraphics.endFill();

    // Subtle background grid
    fieldGraphics.lineStyle(1, activeTheme.borderColor, activeTheme.borderAlpha * 0.15);
    const gridSize = 100;
    for (let x = gridSize; x < FIELD_WIDTH; x += gridSize) {
      fieldGraphics.moveTo(x, 0); fieldGraphics.lineTo(x, FIELD_HEIGHT);
    }
    for (let y = gridSize; y < FIELD_HEIGHT; y += gridSize) {
      fieldGraphics.moveTo(0, y); fieldGraphics.lineTo(FIELD_WIDTH, y);
    }

    fieldGraphics.lineStyle(activeTheme.borderWidth, activeTheme.borderColor, activeTheme.borderAlpha);
    fieldGraphics.drawRoundedRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT, FIELD_CORNER_RADIUS);

    fieldGraphics.lineStyle(activeTheme.borderWidth * 0.8, activeTheme.innerBorderColor, activeTheme.innerBorderAlpha);
    fieldGraphics.drawRoundedRect(
      activeTheme.innerBorderInset,
      activeTheme.innerBorderInset,
      FIELD_WIDTH - activeTheme.innerBorderInset * 2,
      FIELD_HEIGHT - activeTheme.innerBorderInset * 2,
      Math.max(2, FIELD_CORNER_RADIUS - activeTheme.innerBorderInset * 0.5)
    );

    fieldGraphics.lineStyle(activeTheme.centerLineWidth, activeTheme.centerLineColor, activeTheme.centerLineAlpha);
    fieldGraphics.moveTo(FIELD_WIDTH * 0.5, 16);
    fieldGraphics.lineTo(FIELD_WIDTH * 0.5, FIELD_HEIGHT - 16);

    fieldGraphics.lineStyle(activeTheme.centerLineWidth * 0.7, activeTheme.centerCircleColor, activeTheme.centerCircleAlpha);
    fieldGraphics.drawCircle(FIELD_WIDTH * 0.5, FIELD_HEIGHT * 0.5, activeTheme.centerCircleRadius);

    fieldGraphics.lineStyle(activeTheme.borderWidth * 0.75, activeTheme.borderColor, activeTheme.borderAlpha * 0.9);
    fieldGraphics.drawRect(-20, goalTop, 20, GOAL_HEIGHT);
    fieldGraphics.drawRect(FIELD_WIDTH, goalTop, 20, GOAL_HEIGHT);
  };

  const renderSnake = (
    snake: Snake,
    palette: { bodyColor: number; headColor: number; glowColor: number },
    staminaRatioOverride?: number
  ): void => {
    const staminaRatio = staminaRatioOverride ?? snake.stamina / STAMINA_MAX;
    const segmentCount = snake.segments.length;

    // Tapering Glow Layer
    for (let i = 0; i < segmentCount - 1; i++) {
      const p1 = snake.segments[i]!;
      const p2 = snake.segments[i + 1]!;
      const ratio = 1 - (i / (segmentCount - 1));
      const thickness = SNAKE_BODY_RADIUS * 3.5 * (0.3 + 0.7 * ratio);

      snakeGraphics.lineStyle(thickness, palette.glowColor, (0.05 + staminaRatio * 0.15) * ratio);
      snakeGraphics.moveTo(p1.x, p1.y);
      snakeGraphics.lineTo(p2.x, p2.y);
    }

    // Tapering Core Layer
    for (let i = 0; i < segmentCount - 1; i++) {
      const p1 = snake.segments[i]!;
      const p2 = snake.segments[i + 1]!;
      const ratio = 1 - (i / (segmentCount - 1));
      const thickness = SNAKE_BODY_RADIUS * 1.8 * (0.3 + 0.7 * ratio);

      snakeGraphics.lineStyle(thickness, palette.bodyColor, 0.5 + 0.5 * ratio);
      snakeGraphics.moveTo(p1.x, p1.y);
      snakeGraphics.lineTo(p2.x, p2.y);
    }

    snakeGraphics.lineStyle(0);
    snakeGraphics.beginFill(palette.headColor, 0.96);
    snakeGraphics.drawCircle(snake.segments[0]!.x, snake.segments[0]!.y, SNAKE_HEAD_RADIUS);
    snakeGraphics.endFill();

    snakeGraphics.beginFill(palette.glowColor, 0.08 + staminaRatio * 0.14);
    snakeGraphics.drawCircle(snake.segments[0]!.x, snake.segments[0]!.y, SNAKE_HEAD_RADIUS * 1.3);
    snakeGraphics.endFill();
  };

  const renderBall = (): void => {
    ballGraphics.clear();
    const speed = Math.hypot(ball.velocityX, ball.velocityY);
    const stretchFactor = clamp(speed / 1400, 0, 0.45);
    const radiusX = BALL_RADIUS * (1 + stretchFactor);
    const radiusY = BALL_RADIUS * (1 - stretchFactor * 0.4);
    let angle = 0;
    if (speed > 10) angle = Math.atan2(ball.velocityY, ball.velocityX);
    ballGraphics.position.set(ball.x, ball.y);
    ballGraphics.rotation = angle;
    ballGraphics.beginFill(0xfffce5, 0.98);
    ballGraphics.drawEllipse(0, 0, radiusX, radiusY);
    ballGraphics.endFill();
    ballGraphics.beginFill(0xffdd8a, 0.15 + stretchFactor * 0.5);
    ballGraphics.drawEllipse(0, 0, radiusX * 1.3, radiusY * 1.3);
    ballGraphics.endFill();
  };

  const fixedDt = 1 / TICK_RATE;
  let accumulator = 0;


  app.ticker.add(() => {
    accumulator += app.ticker.deltaMS / 1000;
    const frameDt = app.ticker.deltaMS / 1000;

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
      for (let subStep = 0; subStep < BALL_PHYSICS_SUBSTEPS; subStep += 1) {
        const lerpFactor = (subStep + 1) / BALL_PHYSICS_SUBSTEPS;
        ball.update(ballSubDt);
        ball.collideWithSnake(playerSnake, ballSubDt, lerpFactor);
        ball.collideWithSnake(enemySnake, ballSubDt, lerpFactor);

        if (ball.perfectFlickTriggered) {
          ball.perfectFlickTriggered = false;
          screenShakeTimer = 0.2;
          shockwaves.push({ x: ball.x, y: ball.y, radius: BALL_RADIUS, alpha: 1.0, color: 0xffffff });
        }

        const scoredSide = ball.getScoredGoalSide();
        if (scoredSide === "left") {
          enemyScore += 1;
          resetCountdown = GOAL_RESET_DELAY_SECONDS;
          playSound("goal_scored.mp3", 1.0);
          break;
        }
        if (scoredSide === "right") {
          playerScore += 1;
          resetCountdown = GOAL_RESET_DELAY_SECONDS;
          playSound("goal_scored.mp3", 1.0);
          break;
        }
      }

      accumulator -= fixedDt;
    }

    renderField();

    fxGraphics.clear();
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i]!;
      sw.radius += 1200 * frameDt;
      sw.alpha -= 3.5 * frameDt;
      if (sw.alpha <= 0) {
        shockwaves.splice(i, 1);
      } else {
        fxGraphics.lineStyle(6, sw.color, sw.alpha);
        fxGraphics.drawCircle(sw.x, sw.y, sw.radius);
      }
    }

    fxGraphics.lineStyle(0);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!;
      p.life += frameDt;
      p.x += p.vx * frameDt;
      p.y += p.vy * frameDt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
      } else {
        const alpha = 1 - (p.life / p.maxLife);
        fxGraphics.beginFill(p.color, alpha);
        fxGraphics.drawCircle(p.x, p.y, p.size);
        fxGraphics.endFill();
      }
    }

    if (screenShakeTimer > 0) {
      screenShakeTimer = Math.max(0, screenShakeTimer - frameDt);
      const intensity = (screenShakeTimer / 0.2) * 12;
      const dx = (Math.random() - 0.5) * 2 * intensity;
      const dy = (Math.random() - 0.5) * 2 * intensity;
      const safeWidth = Math.max(10, app.screen.width - UI_MARGIN_SIDES * 2);
      const safeHeight = Math.max(10, app.screen.height - UI_MARGIN_TOP - UI_MARGIN_BOTTOM);
      const scale = Math.min(safeWidth / FIELD_WIDTH, safeHeight / FIELD_HEIGHT);
      world.position.set(
        (app.screen.width - FIELD_WIDTH * scale) * 0.5 + dx,
        UI_MARGIN_TOP + (safeHeight - FIELD_HEIGHT * scale) * 0.5 + dy
      );
    } else {
      const safeWidth = Math.max(10, app.screen.width - UI_MARGIN_SIDES * 2);
      const safeHeight = Math.max(10, app.screen.height - UI_MARGIN_TOP - UI_MARGIN_BOTTOM);
      const scale = Math.min(safeWidth / FIELD_WIDTH, safeHeight / FIELD_HEIGHT);
      world.position.set(
        (app.screen.width - FIELD_WIDTH * scale) * 0.5,
        UI_MARGIN_TOP + (safeHeight - FIELD_HEIGHT * scale) * 0.5
      );
    }

    snakeGraphics.clear();
    ballGraphics.clear();
    renderSnake(playerSnake, PLAYER_PALETTE);
    renderSnake(enemySnake, ENEMY_PALETTE, 1);
    renderBall();

    const resetLabel = resetCountdown > 0 ? ` (Reset: ${Math.ceil(resetCountdown)}s)` : "";
    scoreText.text = `YOU ${playerScore} - ${enemyScore} BOT${resetLabel}`;
    scoreText.style.fill = resetCountdown > 0 ? 0xff4444 : 0xffffff;

    infoText.text = `Theme: ${activeTheme.name} | [Space/Click] Sprint | [ ] or 1-${FIELD_THEME_IDS.length} Themes`;

    const barWidth = Math.min(600, app.screen.width - 80);
    const barHeight = 14;
    const staminaPct = playerSnake.stamina / STAMINA_MAX;

    staminaBg.clear();
    staminaBg.beginFill(0x222222, 0.8);
    staminaBg.drawRoundedRect(-barWidth * 0.5, 0, barWidth, barHeight, barHeight * 0.5);
    staminaBg.endFill();

    let fillColor = 0x00ffcc;
    let fillAlpha = 1.0;

    if (input.anchor) {
      fillColor = 0xffa500; // Orange warning to show they are braking/anchoring!
    } else if (input.sprint && !playerSnake.sprintExhausted) {
      fillColor = 0xffffff;
    } else if (playerSnake.sprintExhausted) {
      fillColor = 0xff4444;
      fillAlpha = 0.5;
    }

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

main().catch((error: unknown) => {
  // Surface startup failures with useful context during local prototyping.
  console.error("Failed to start Cursor Soccer prototype", error);
});
