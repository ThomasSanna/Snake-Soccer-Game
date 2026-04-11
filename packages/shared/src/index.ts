export * from "./protocol";
export * from "./config";

export type Vec2 = { x: number; y: number };
export type Segment = { x: number; y: number };


export const TICK_RATE = 60;

export const FIELD_WIDTH = 1920;
export const FIELD_HEIGHT = 1080;
// Higher value => longer and more pronounced corner rounding.
export const FIELD_CORNER_ROUNDNESS = 0.28;
export const FIELD_CORNER_RADIUS = Math.round(
  Math.min(FIELD_WIDTH, FIELD_HEIGHT) * FIELD_CORNER_ROUNDNESS
);
export const GOAL_HEIGHT = 320;
export const GOAL_RESET_DELAY_SECONDS = 2.2;

export const SNAKE_SEGMENT_COUNT = 14;
export const SNAKE_SEGMENT_LENGTH = 22;
export const SNAKE_HEAD_RADIUS = 25;
export const SNAKE_BODY_RADIUS = 10;

export const BASE_MAX_SPEED = 450;
export const BASE_STEERING_FORCE = 1650;
export const SPRINT_MULTIPLIER = 1.55;
export const ENEMY_FORWARD_SPEED_FACTOR = 0.86;

export const STAMINA_MAX = 100;
export const STAMINA_DRAIN_PER_SECOND = 44;
export const STAMINA_RECOVER_PER_SECOND = 20;

export const BALL_RADIUS = 13;
export const BALL_RESTITUTION = 0.92;
export const BALL_DAMPING_PER_TICK = 0.992;

export const HEAD_SHOT_POWER = 60;
export const HEAD_SHOT_MAX_IMPULSE = 150;
export const HEAD_CARRY_FACTOR = 0.16;
export const BODY_RESTITUTION = 0.25;

export const PERFECT_FLICK_POWER_MULTIPLIER = 2.5;
export const PERFECT_FLICK_WINDOW_SECONDS = 0.05;


export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function length(x: number, y: number): number {
  return Math.hypot(x, y);
}





export const BASE_TURN_RATE_RAD_PER_SECOND = Math.PI * 2.0;
export const FIELD_THEME_STORAGE_KEY = "cursor-soccer.field-theme";
export const SNAKE_VS_SNAKE_HEAD_RESTITUTION = 0.84;
export const BALL_SNAKE_COLLISION_PASSES = 3;
export const BALL_BODY_COLLISION_PADDING = 0;
export const BALL_BODY_TANGENTIAL_DAMPING = 0.1;
export const SNAKE_BODY_CARRY_FACTOR = 0.25;
export const SNAKE_BODY_MAX_BOUNCE_IMPULSE = 300;
export const WHIP_CURVATURE_THRESHOLD = 0.24;
export const WHIP_SURFACE_SPEED_THRESHOLD = 220;
export const WHIP_TANGENT_TRANSFER = 0.58;
export const WHIP_MAX_IMPULSE = 230;
export const BODY_SPEED_RESTITUTION_BOOST = 0.18;
export const BODY_SPEED_RESTITUTION_THRESHOLD = 120;
export const SNAKE_BODY_IMPACT_PUSH_FACTOR = 0.72;
export const SNAKE_BODY_IMPACT_SPEED_FACTOR = 0.004;
export const SNAKE_BODY_IMPACT_MAX_PUSH = SNAKE_BODY_RADIUS * 1.45;
export const SNAKE_BODY_IMPACT_SEGMENT_RANGE = 4;
export const SNAKE_BODY_IMPACT_VELOCITY_TRANSFER = 0.2;
export const SNAKE_BODY_IMPACT_MAX_VELOCITY_TRANSFER = 125;
export const BALL_PHYSICS_SUBSTEPS = 3;
export const BALL_BODY_SOLVER_ITERATIONS = 3;
export const BALL_MAX_PUSH_PER_ITERATION = BALL_RADIUS * 0.55;
export const SNAKE_CONSTRAINT_PASSES = 3;
export const SNAKE_CURVATURE_SMOOTHING = 0;
export const SNAKE_SELF_SEPARATION_DISTANCE = SNAKE_BODY_RADIUS * 2 + BALL_RADIUS * 0.85;
export const SNAKE_SELF_SEPARATION_RELAX = 0.45;
export type GoalSide = "left" | "right";

export type InputState = {
  mouseX: number;
  mouseY: number;
  sprint: boolean;
  anchor: boolean;
};

export function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let normalized = angle % twoPi;
  if (normalized > Math.PI) {
    normalized -= twoPi;
  } else if (normalized < -Math.PI) {
    normalized += twoPi;
  }
  return normalized;
}

export class Snake {
  public readonly segments: Segment[];
  public readonly previousSegments: Segment[];
  public velocityX: number;
  public velocityY: number;
  public stamina: number;
  public sprintExhausted: boolean;
  public isSprinting: boolean;
  public perfectFlickTimer: number;
  public segmentVelocities: Segment[];

  constructor(spawnX: number, spawnY: number) {
    this.segments = Array.from({ length: SNAKE_SEGMENT_COUNT }, () => ({ x: spawnX, y: spawnY }));
    this.previousSegments = Array.from({ length: SNAKE_SEGMENT_COUNT }, () => ({ x: spawnX, y: spawnY }));
    this.segmentVelocities = Array.from({ length: SNAKE_SEGMENT_COUNT }, () => ({ x: 0, y: 0 }));
    this.velocityX = 0;
    this.velocityY = 0;
    this.stamina = STAMINA_MAX;
    this.sprintExhausted = false;
    this.isSprinting = false;
    this.perfectFlickTimer = 0;
    this.reset(spawnX, spawnY, 1, 0, 0, true);
  }

  get head(): Segment {
    return this.segments[0]!;
  }

  reset(
    spawnX: number,
    spawnY: number,
    headingX: number,
    headingY: number,
    speed: number,
    refillStamina: boolean
  ): void {
    let dirX = headingX;
    let dirY = headingY;
    const headingMagnitude = length(dirX, dirY);
    if (headingMagnitude > 0.0001) {
      dirX /= headingMagnitude;
      dirY /= headingMagnitude;
    } else {
      dirX = 1;
      dirY = 0;
    }

    for (let i = 0; i < this.segments.length; i += 1) {
      this.segments[i]!.x = spawnX - dirX * SNAKE_SEGMENT_LENGTH * i;
      this.segments[i]!.y = spawnY - dirY * SNAKE_SEGMENT_LENGTH * i;
      this.previousSegments[i]!.x = this.segments[i]!.x;
      this.previousSegments[i]!.y = this.segments[i]!.y;
    }

    this.velocityX = dirX * speed;
    this.velocityY = dirY * speed;

    if (refillStamina) {
      this.stamina = STAMINA_MAX;
    }

    this.sprintExhausted = false;
    this.isSprinting = false;
    this.perfectFlickTimer = 0;
  }

  update(input: InputState, dt: number): void {
    for (let i = 1; i < this.segments.length; i++) {
        this.segmentVelocities[i]!.x = this.segments[i]!.x - this.previousSegments[i]!.x;
        this.segmentVelocities[i]!.y = this.segments[i]!.y - this.previousSegments[i]!.y;
    }
    
    this.capturePreviousSegments();

    if (!input.sprint) {
      this.sprintExhausted = false;
    }

    const wasSprinting = this.isSprinting;
    this.isSprinting = input.sprint;

    const wantsSprint = input.sprint && !this.sprintExhausted && !input.anchor;
    const canSprint = wantsSprint && this.stamina > 0;

    if (canSprint && !wasSprinting) {
      this.perfectFlickTimer = PERFECT_FLICK_WINDOW_SECONDS;
    }

    if (this.perfectFlickTimer > 0) {
      this.perfectFlickTimer = Math.max(0, this.perfectFlickTimer - dt);
    }

    const speedLimit = BASE_MAX_SPEED * (canSprint ? SPRINT_MULTIPLIER : 1);
    const turnRate = BASE_TURN_RATE_RAD_PER_SECOND * (canSprint ? SPRINT_MULTIPLIER : 1);

    if (canSprint) {
      this.stamina = clamp(this.stamina - STAMINA_DRAIN_PER_SECOND * dt, 0, STAMINA_MAX);
      if (this.stamina <= 0.0001) {
        this.stamina = 0;
        this.sprintExhausted = true;
      }
    } else {
      this.stamina = clamp(this.stamina + STAMINA_RECOVER_PER_SECOND * dt, 0, STAMINA_MAX);
    }

    const toTargetX = input.mouseX - this.head.x;
    const toTargetY = input.mouseY - this.head.y;
    const distanceToTarget = length(toTargetX, toTargetY);

    let headingX = this.velocityX;
    let headingY = this.velocityY;
    const headingMagnitude = length(headingX, headingY);
    if (headingMagnitude > 0.0001) {
      headingX /= headingMagnitude;
      headingY /= headingMagnitude;
    } else {
      headingX = 1;
      headingY = 0;
    }

    if (distanceToTarget > 0.0001) {
      const targetDirX = toTargetX / distanceToTarget;
      const targetDirY = toTargetY / distanceToTarget;
      const currentAngle = Math.atan2(headingY, headingX);
      const targetAngle = Math.atan2(targetDirY, targetDirX);
      const angleDelta = normalizeAngle(targetAngle - currentAngle);
      const maxTurn = turnRate * dt;
      const nextAngle = currentAngle + clamp(angleDelta, -maxTurn, maxTurn);
      headingX = Math.cos(nextAngle);
      headingY = Math.sin(nextAngle);
    }

    if (input.anchor) {
      // Glissade (Friction moins violente pour éviter l'arrêt instantané "cheaté")
      this.velocityX *= 0.93;
      this.velocityY *= 0.93;
    } else {
      this.velocityX = headingX * speedLimit;
      this.velocityY = headingY * speedLimit;
    }

    this.head.x += this.velocityX * dt;
    this.head.y += this.velocityY * dt;

    const inertiaDecay = input.anchor ? 0.98 : 0.45;
    for (let i = 1; i < this.segments.length; i += 1) {
      const vx = this.segmentVelocities[i]!.x;
      const vy = this.segmentVelocities[i]!.y;
      
      this.segments[i]!.x += vx * inertiaDecay;
      this.segments[i]!.y += vy * inertiaDecay;

      if (input.anchor && i === 1 && Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) {
        this.segments[i]!.x += (Math.random() - 0.5) * 4;
        this.segments[i]!.y += (Math.random() - 0.5) * 4;
      }
    }

    this.constrainHeadToArena();
    this.solveBodyConstraints();
    this.constrainHeadToArena();
  }

  updateForward(dt: number, speed: number): void {
    for (let i = 1; i < this.segments.length; i++) {
        this.segmentVelocities[i]!.x = this.segments[i]!.x - this.previousSegments[i]!.x;
        this.segmentVelocities[i]!.y = this.segments[i]!.y - this.previousSegments[i]!.y;
    }

    this.capturePreviousSegments();

    if (this.perfectFlickTimer > 0) {
      this.perfectFlickTimer = Math.max(0, this.perfectFlickTimer - dt);
    }

    let headingX = this.velocityX;
    let headingY = this.velocityY;
    const headingMagnitude = length(headingX, headingY);
    if (headingMagnitude > 0.0001) {
      headingX /= headingMagnitude;
      headingY /= headingMagnitude;
    } else {
      headingX = -1;
      headingY = 0;
    }

    this.velocityX = headingX * speed;
    this.velocityY = headingY * speed;

    this.head.x += this.velocityX * dt;
    this.head.y += this.velocityY * dt;

    const inertiaDecay = 0.45;
    for (let i = 1; i < this.segments.length; i += 1) {
      const vx = this.segmentVelocities[i]!.x;
      const vy = this.segmentVelocities[i]!.y;
      
      this.segments[i]!.x += vx * inertiaDecay;
      this.segments[i]!.y += vy * inertiaDecay;
    }

    this.constrainHeadToArena();
    this.solveBodyConstraints();
    this.constrainHeadToArena();
  }

  reconcileAfterExternalPush(): void {
    this.constrainHeadToArena();
    this.solveBodyConstraints();
    this.constrainHeadToArena();
  }

  getSegmentCurvature(index: number): number {
    if (index <= 0 || index >= this.segments.length - 1) {
      return 0;
    }

    const prev = this.segments[index - 1]!;
    const current = this.segments[index]!;
    const next = this.segments[index + 1]!;

    const inX = current.x - prev.x;
    const inY = current.y - prev.y;
    const outX = next.x - current.x;
    const outY = next.y - current.y;
    const inLength = length(inX, inY);
    const outLength = length(outX, outY);

    if (inLength < 0.0001 || outLength < 0.0001) {
      return 0;
    }

    const inNormX = inX / inLength;
    const inNormY = inY / inLength;
    const outNormX = outX / outLength;
    const outNormY = outY / outLength;
    const dot = clamp(inNormX * outNormX + inNormY * outNormY, -1, 1);

    return 1 - dot;
  }

  private capturePreviousSegments(): void {
    for (let i = 0; i < this.segments.length; i += 1) {
      this.previousSegments[i]!.x = this.segments[i]!.x;
      this.previousSegments[i]!.y = this.segments[i]!.y;
    }
  }

  private constrainSegmentToArena(segment: { x: number; y: number }, radius: number, isHead: boolean): void {
    const minX = radius;
    const maxX = FIELD_WIDTH - radius;
    const minY = radius;
    const maxY = FIELD_HEIGHT - radius;

    if (segment.x < minX) {
      segment.x = minX;
      if (isHead) this.velocityX *= -0.2;
    } else if (segment.x > maxX) {
      segment.x = maxX;
      if (isHead) this.velocityX *= -0.2;
    }

    if (segment.y < minY) {
      segment.y = minY;
      if (isHead) this.velocityY *= -0.2;
    } else if (segment.y > maxY) {
      segment.y = maxY;
      if (isHead) this.velocityY *= -0.2;
    }

    const cornerRadius = Math.max(1, FIELD_CORNER_RADIUS - radius);
    const corners = [
      { cx: FIELD_CORNER_RADIUS, cy: FIELD_CORNER_RADIUS },
      { cx: FIELD_WIDTH - FIELD_CORNER_RADIUS, cy: FIELD_CORNER_RADIUS },
      { cx: FIELD_CORNER_RADIUS, cy: FIELD_HEIGHT - FIELD_CORNER_RADIUS },
      { cx: FIELD_WIDTH - FIELD_CORNER_RADIUS, cy: FIELD_HEIGHT - FIELD_CORNER_RADIUS }
    ];

    for (const corner of corners) {
      const isInsideCornerZone =
        (corner.cx === FIELD_CORNER_RADIUS ? segment.x < corner.cx : segment.x > corner.cx) &&
        (corner.cy === FIELD_CORNER_RADIUS ? segment.y < corner.cy : segment.y > corner.cy);

      if (isInsideCornerZone) {
        let normalX = segment.x - corner.cx;
        let normalY = segment.y - corner.cy;
        let dist = length(normalX, normalY);

        if (dist >= cornerRadius) {
          if (dist < 0.0001) {
            normalX = 1; normalY = 0; dist = 1;
          }
          normalX /= dist;
          normalY /= dist;

          segment.x = corner.cx + normalX * cornerRadius;
          segment.y = corner.cy + normalY * cornerRadius;

          if (isHead) {
            const velAlongNormal = this.velocityX * normalX + this.velocityY * normalY;
            if (velAlongNormal < 0) {
              this.velocityX -= velAlongNormal * normalX * 1.2;
              this.velocityY -= velAlongNormal * normalY * 1.2;
            }
          }
        }
      }
    }
  }

  private constrainHeadToArena(): void {
    this.constrainSegmentToArena(this.head, SNAKE_HEAD_RADIUS, true);
  }

  private solveBodyConstraints(): void {
    for (let pass = 0; pass < SNAKE_CONSTRAINT_PASSES; pass += 1) {
      for (let i = 1; i < this.segments.length; i += 1) {
        const prev = this.segments[i - 1]!;
        const current = this.segments[i]!;
        const diffX = current.x - prev.x;
        const diffY = current.y - prev.y;
        const dist = length(diffX, diffY);

        if (dist === 0) {
          current.x = prev.x - SNAKE_SEGMENT_LENGTH;
          current.y = prev.y;
          continue;
        }

        const ratio = SNAKE_SEGMENT_LENGTH / dist;
        current.x = prev.x + diffX * ratio;
        current.y = prev.y + diffY * ratio;
      }

      this.smoothBodyCurvature();
      this.relaxSelfOverlap();
      this.constrainBodyToArena();
    }
  }

  private constrainBodyToArena(): void {
    for (let i = 1; i < this.segments.length; i += 1) {
      this.constrainSegmentToArena(this.segments[i]!, SNAKE_BODY_RADIUS, false);
    }
  }

  private smoothBodyCurvature(): void {
    for (let i = 2; i < this.segments.length - 1; i += 1) {
      const prev = this.segments[i - 1]!;
      const current = this.segments[i]!;
      const next = this.segments[i + 1]!;
      const targetX = (prev.x + next.x) * 0.5;
      const targetY = (prev.y + next.y) * 0.5;
      current.x += (targetX - current.x) * SNAKE_CURVATURE_SMOOTHING;
      current.y += (targetY - current.y) * SNAKE_CURVATURE_SMOOTHING;
    }
  }

  private relaxSelfOverlap(): void {
    const minDistance = SNAKE_SELF_SEPARATION_DISTANCE;

    for (let i = 2; i < this.segments.length; i += 1) {
      for (let j = i + 2; j < this.segments.length; j += 1) {
        const a = this.segments[i]!;
        const b = this.segments[j]!;
        let diffX = b.x - a.x;
        let diffY = b.y - a.y;
        let dist = length(diffX, diffY);

        if (dist >= minDistance) {
          continue;
        }

        if (dist < 0.0001) {
          diffX = 1;
          diffY = 0;
          dist = 1;
        }

        const normalX = diffX / dist;
        const normalY = diffY / dist;
        const penetration = (minDistance - dist) * SNAKE_SELF_SEPARATION_RELAX;

        a.x -= normalX * penetration * 0.5;
        a.y -= normalY * penetration * 0.5;
        b.x += normalX * penetration * 0.5;
        b.y += normalY * penetration * 0.5;
      }
    }
  }
}

export function resolveSnakeVsSnakeCollision(a: Snake, b: Snake): void {
  resolveHeadToHead(a, b);
  resolveHeadAgainstBody(a, b);
  resolveHeadAgainstBody(b, a);
  a.reconcileAfterExternalPush();
  b.reconcileAfterExternalPush();
}

export function resolveHeadToHead(a: Snake, b: Snake): void {
  let normalX = b.head.x - a.head.x;
  let normalY = b.head.y - a.head.y;
  let dist = length(normalX, normalY);
  const hitDistance = SNAKE_HEAD_RADIUS * 2;
  if (dist >= hitDistance) {
    return;
  }

  if (dist < 0.0001) {
    normalX = 1;
    normalY = 0;
    dist = 1;
  }

  normalX /= dist;
  normalY /= dist;

  const penetration = hitDistance - dist;
  a.head.x -= normalX * penetration * 0.5;
  a.head.y -= normalY * penetration * 0.5;
  b.head.x += normalX * penetration * 0.5;
  b.head.y += normalY * penetration * 0.5;

  const relVelX = b.velocityX - a.velocityX;
  const relVelY = b.velocityY - a.velocityY;
  const relAlongNormal = relVelX * normalX + relVelY * normalY;
  if (relAlongNormal >= 0) {
    return;
  }

  const impulse = (-(1 + SNAKE_VS_SNAKE_HEAD_RESTITUTION) * relAlongNormal) * 0.5;
  a.velocityX -= impulse * normalX;
  a.velocityY -= impulse * normalY;
  b.velocityX += impulse * normalX;
  b.velocityY += impulse * normalY;
}

export function resolveHeadAgainstBody(headSnake: Snake, bodySnake: Snake): void {
  const hitRadius = SNAKE_HEAD_RADIUS + SNAKE_BODY_RADIUS;

  for (let i = 1; i < bodySnake.segments.length; i += 1) {
    const a = bodySnake.segments[i - 1]!;
    const b = bodySnake.segments[i]!;
    const abX = b.x - a.x;
    const abY = b.y - a.y;
    const abLenSq = abX * abX + abY * abY;
    if (abLenSq <= 0.0001) {
      continue;
    }

    const apX = headSnake.head.x - a.x;
    const apY = headSnake.head.y - a.y;
    const projection = clamp((apX * abX + apY * abY) / abLenSq, 0, 1);
    const closestX = a.x + abX * projection;
    const closestY = a.y + abY * projection;

    let normalX = headSnake.head.x - closestX;
    let normalY = headSnake.head.y - closestY;
    let dist = length(normalX, normalY);

    if (dist >= hitRadius) {
      continue;
    }

    if (dist < 0.0001) {
      normalX = headSnake.head.x - a.x;
      normalY = headSnake.head.y - a.y;
      dist = length(normalX, normalY);
      if (dist < 0.0001) {
        normalX = 1;
        normalY = 0;
        dist = 1;
      }
    }

    normalX /= dist;
    normalY /= dist;

    const penetration = hitRadius - dist;
    const impactCenterIndex = i - 1 + projection;
    headSnake.head.x += normalX * penetration;
    headSnake.head.y += normalY * penetration;

    const velAlongNormal = headSnake.velocityX * normalX + headSnake.velocityY * normalY;
    const incomingSpeed = Math.max(0, -velAlongNormal);

    const bodyPushDistance = Math.min(
      SNAKE_BODY_IMPACT_MAX_PUSH,
      penetration * SNAKE_BODY_IMPACT_PUSH_FACTOR + incomingSpeed * SNAKE_BODY_IMPACT_SPEED_FACTOR
    );
    if (bodyPushDistance > 0) {
      for (let segmentIndex = 1; segmentIndex < bodySnake.segments.length; segmentIndex += 1) {
        const indexDistance = Math.abs(segmentIndex - impactCenterIndex);
        if (indexDistance > SNAKE_BODY_IMPACT_SEGMENT_RANGE) {
          continue;
        }

        const falloff = 1 - indexDistance / (SNAKE_BODY_IMPACT_SEGMENT_RANGE + 1);
        const weightedPush = bodyPushDistance * falloff * falloff;
        const segment = bodySnake.segments[segmentIndex]!;
        segment.x -= normalX * weightedPush;
        segment.y -= normalY * weightedPush;
      }

      const transferredVelocity = Math.min(
        SNAKE_BODY_IMPACT_MAX_VELOCITY_TRANSFER,
        incomingSpeed * SNAKE_BODY_IMPACT_VELOCITY_TRANSFER
      );
      bodySnake.velocityX -= normalX * transferredVelocity;
      bodySnake.velocityY -= normalY * transferredVelocity;
    }

    if (velAlongNormal < 0) {
      headSnake.velocityX -= velAlongNormal * normalX;
      headSnake.velocityY -= velAlongNormal * normalY;
    }
  }
}

export class Ball {
  public x: number;
  public y: number;
  public velocityX: number;
  public velocityY: number;
  public perfectFlickTriggered: boolean;
  public onWallHit?: (x: number, y: number, velocity: number) => void;
  public onHeadHit?: (x: number, y: number, approach: number) => void;
  public onPerfectFlick?: (x: number, y: number) => void;
  public onBodyHit?: (x: number, y: number, bounce: number) => void;
  public onWhipHit?: (x: number, y: number, whip: number) => void;

  constructor() {
    this.x = FIELD_WIDTH / 2;
    this.y = FIELD_HEIGHT / 2;
    this.velocityX = 0;
    this.velocityY = 0;
    this.perfectFlickTriggered = false;
  }

  update(dt: number): void {
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;
    const damping = Math.pow(BALL_DAMPING_PER_TICK, dt * TICK_RATE);
    this.velocityX *= damping;
    this.velocityY *= damping;
    this.collideWithRoundedArena();
  }

  reset(spawnX: number, spawnY: number): void {
    this.x = spawnX;
    this.y = spawnY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.perfectFlickTriggered = false;
  }

  getScoredGoalSide(): GoalSide | null {
    if (!this.isInsideGoalMouth()) {
      return null;
    }
    if (this.x < -BALL_RADIUS) {
      return "left";
    }
    if (this.x > FIELD_WIDTH + BALL_RADIUS) {
      return "right";
    }
    return null;
  }


  private isInsideGoalMouth(): boolean {
    const goalHalfHeight = GOAL_HEIGHT * 0.5;
    const goalTop = FIELD_HEIGHT * 0.5 - goalHalfHeight - BALL_RADIUS;
    const goalBottom = FIELD_HEIGHT * 0.5 + goalHalfHeight + BALL_RADIUS;
    return this.y >= goalTop && this.y <= goalBottom;
  }

  private collideWithRoundedArena(): void {
    const minX = BALL_RADIUS;
    const maxX = FIELD_WIDTH - BALL_RADIUS;
    const minY = BALL_RADIUS;
    const maxY = FIELD_HEIGHT - BALL_RADIUS;
    const inGoalMouth = this.isInsideGoalMouth();

    if (this.y < minY) {
      this.y = minY;
      if (this.velocityY < -250) this.onWallHit?.(this.x, minY, Math.abs(this.velocityY));
      this.velocityY = Math.abs(this.velocityY) * BALL_RESTITUTION;
    } else if (this.y > maxY) {
      this.y = maxY;
      if (this.velocityY > 250) this.onWallHit?.(this.x, maxY, Math.abs(this.velocityY));
      this.velocityY = -Math.abs(this.velocityY) * BALL_RESTITUTION;
    }

    if (!inGoalMouth) {
      if (this.x < minX) {
        this.x = minX;
        if (this.velocityX < -250) this.onWallHit?.(minX, this.y, Math.abs(this.velocityX));
        this.velocityX = Math.abs(this.velocityX) * BALL_RESTITUTION;
      } else if (this.x > maxX) {
        this.x = maxX;
        if (this.velocityX > 250) this.onWallHit?.(maxX, this.y, Math.abs(this.velocityX));
        this.velocityX = -Math.abs(this.velocityX) * BALL_RESTITUTION;
      }
    }

    // Corner roundness collision
    const cornerRadius = Math.max(1, FIELD_CORNER_RADIUS - BALL_RADIUS);
    const corners = [
      { cx: FIELD_CORNER_RADIUS, cy: FIELD_CORNER_RADIUS },
      { cx: FIELD_WIDTH - FIELD_CORNER_RADIUS, cy: FIELD_CORNER_RADIUS },
      { cx: FIELD_CORNER_RADIUS, cy: FIELD_HEIGHT - FIELD_CORNER_RADIUS },
      { cx: FIELD_WIDTH - FIELD_CORNER_RADIUS, cy: FIELD_HEIGHT - FIELD_CORNER_RADIUS }
    ];

    for (const corner of corners) {
      const isInsideCornerZone =
        (corner.cx === FIELD_CORNER_RADIUS ? this.x < corner.cx : this.x > corner.cx) &&
        (corner.cy === FIELD_CORNER_RADIUS ? this.y < corner.cy : this.y > corner.cy);

      if (isInsideCornerZone) {
        let normalX = this.x - corner.cx;
        let normalY = this.y - corner.cy;
        let dist = length(normalX, normalY);

        if (dist > cornerRadius) {
          if (dist < 0.0001) { normalX = 1; normalY = 0; dist = 1; }
          normalX /= dist;
          normalY /= dist;
          this.x = corner.cx + normalX * cornerRadius;
          this.y = corner.cy + normalY * cornerRadius;
          const velAlongNormal = this.velocityX * normalX + this.velocityY * normalY;
          if (velAlongNormal > 0) {
            const v = Math.abs(velAlongNormal);
            if (v > 200) this.onWallHit?.(this.x, this.y, v);
            this.velocityX -= velAlongNormal * normalX * (1 + BALL_RESTITUTION);
            this.velocityY -= velAlongNormal * normalY * (1 + BALL_RESTITUTION);
          }
        }
      }
    }
  }

  collideWithSnake(snake: Snake, dt: number, lerpFactor: number): void {
    for (let pass = 0; pass < BALL_SNAKE_COLLISION_PASSES; pass += 1) {
      this.collideWithSnakeHead(snake, lerpFactor);
      this.collideWithSnakeBody(snake, dt, lerpFactor);
    }
  }

  private collideWithSnakeHead(snake: Snake, lerpFactor: number): void {
    const prevHead = snake.previousSegments[0]!;
    const currHead = snake.segments[0]!;
    const headX = prevHead.x + (currHead.x - prevHead.x) * lerpFactor;
    const headY = prevHead.y + (currHead.y - prevHead.y) * lerpFactor;
    
    const hitDistance = BALL_RADIUS + SNAKE_HEAD_RADIUS;
    let normalX = this.x - headX;
    let normalY = this.y - headY;
    let dist = length(normalX, normalY);

    if (dist >= hitDistance) {
      return;
    }

    if (dist < 0.0001) {
      normalX = snake.velocityX;
      normalY = snake.velocityY;
      dist = length(normalX, normalY);
      if (dist < 0.0001) {
        normalX = 1;
        normalY = 0;
        dist = 1;
      }
    }

    normalX /= dist;
    normalY /= dist;

    const penetration = hitDistance - dist;
    this.x += normalX * penetration;
    this.y += normalY * penetration;

    const relativeVelocityX = snake.velocityX - this.velocityX;
    const relativeVelocityY = snake.velocityY - this.velocityY;
    const relativeApproach = Math.max(0, relativeVelocityX * normalX + relativeVelocityY * normalY);
    let baseImpulse = clamp(
      HEAD_SHOT_POWER + relativeApproach * 0.55,
      HEAD_SHOT_POWER,
      HEAD_SHOT_MAX_IMPULSE
    );

    if (snake.perfectFlickTimer > 0) {
      baseImpulse *= PERFECT_FLICK_POWER_MULTIPLIER;
      // Consume the timer so it doesn't apply to multiple physics sub-steps or hits in the same frame
      snake.perfectFlickTimer = 0;
      this.perfectFlickTriggered = true;
      this.onPerfectFlick?.(this.x, this.y);
    } else if (relativeApproach > 150) {
      this.onHeadHit?.(this.x, this.y, relativeApproach);
    }

    this.velocityX += normalX * baseImpulse;
    this.velocityY += normalY * baseImpulse;

    this.velocityX += snake.velocityX * HEAD_CARRY_FACTOR;
    this.velocityY += snake.velocityY * HEAD_CARRY_FACTOR;
  }

  private collideWithSnakeBody(snake: Snake, dt: number, lerpFactor: number): void {
    const hitRadius = BALL_RADIUS + SNAKE_BODY_RADIUS + BALL_BODY_COLLISION_PADDING;
    const invDt = dt > 0.000001 ? 1 / dt : TICK_RATE;

    for (let iteration = 0; iteration < BALL_BODY_SOLVER_ITERATIONS; iteration += 1) {
      let bestPenetration = 0;
      let bestNormalX = 0;
      let bestNormalY = 0;
      let bestSurfaceVelocityX = 0;
      let bestSurfaceVelocityY = 0;
      let bestSegmentIndex = 1;
      
      let sumPenetrationScalar = 0;
      let netPushX = 0;
      let netPushY = 0;

      for (let i = 1; i < snake.segments.length; i += 1) {
        const currA = snake.segments[i - 1]!;
        const currB = snake.segments[i]!;
        const prevA = snake.previousSegments[i - 1]!;
        const prevB = snake.previousSegments[i]!;
        
        const aX = prevA.x + (currA.x - prevA.x) * lerpFactor;
        const aY = prevA.y + (currA.y - prevA.y) * lerpFactor;
        const bX = prevB.x + (currB.x - prevB.x) * lerpFactor;
        const bY = prevB.y + (currB.y - prevB.y) * lerpFactor;

        const abX = bX - aX;
        const abY = bY - aY;
        const abLenSq = abX * abX + abY * abY;

        if (abLenSq <= 0.0001) {
          continue;
        }

        const apX = this.x - aX;
        const apY = this.y - aY;
        const projection = clamp((apX * abX + apY * abY) / abLenSq, 0, 1);
        const closestX = aX + abX * projection;
        const closestY = aY + abY * projection;
        
        const velAX = (currA.x - prevA.x) * invDt;
        const velAY = (currA.y - prevA.y) * invDt;
        const velBX = (currB.x - prevB.x) * invDt;
        const velBY = (currB.y - prevB.y) * invDt;
        const surfaceVelocityX = velAX + (velBX - velAX) * projection;
        const surfaceVelocityY = velAY + (velBY - velAY) * projection;

        let normalX = this.x - closestX;
        let normalY = this.y - closestY;
        let dist = length(normalX, normalY);

        if (dist >= hitRadius) {
          continue;
        }

        if (dist < 0.0001) {
          normalX = -abY;
          normalY = abX;
          dist = length(normalX, normalY);
          if (dist < 0.0001) {
            normalX = 1;
            normalY = 0;
            dist = 1;
          }
        }

        normalX /= dist;
        normalY /= dist;

        const penetration = hitRadius - dist;
        sumPenetrationScalar += penetration;
        netPushX += normalX * penetration;
        netPushY += normalY * penetration;

        if (penetration > bestPenetration) {
          bestPenetration = penetration;
          bestNormalX = normalX;
          bestNormalY = normalY;
          bestSurfaceVelocityX = surfaceVelocityX;
          bestSurfaceVelocityY = surfaceVelocityY;
          bestSegmentIndex = i;
        }
      }

      if (bestPenetration <= 0) {
        break;
      }

      // --- THE "PINCH SHOT" (QUANTUM GLITCH) MECHANIC ---
      // If sum of all scalar penetrations is much greater than the net vector length, 
      // the ball is being crushed from multiple opposing angles (a tight tail loop).
      const netVectorLength = length(netPushX, netPushY);
      const crushFactor = sumPenetrationScalar - netVectorLength;

      if (crushFactor > BALL_RADIUS * 0.4) {
        // Intentionally exaggerated "physics bug" pop-out
        const glitchImpulse = 400 * (crushFactor / BALL_RADIUS);
        this.velocityX += bestNormalX * glitchImpulse;
        this.velocityY += bestNormalY * glitchImpulse;
      }
      // --------------------------------------------------

      const pushedDistance = Math.min(bestPenetration, BALL_MAX_PUSH_PER_ITERATION);
      this.x += bestNormalX * pushedDistance;
      this.y += bestNormalY * pushedDistance;

      const bodyVelocityX = bestSurfaceVelocityX * SNAKE_BODY_CARRY_FACTOR;
      const bodyVelocityY = bestSurfaceVelocityY * SNAKE_BODY_CARRY_FACTOR;

      const velAlongNormal = this.velocityX * bestNormalX + this.velocityY * bestNormalY;
      const bodyVelAlongNormal = bodyVelocityX * bestNormalX + bodyVelocityY * bestNormalY;
      const relativeVelAlongNormal = velAlongNormal - bodyVelAlongNormal;

      if (relativeVelAlongNormal < 0) {
        const impactSpeed = -relativeVelAlongNormal;
        const speedRestitutionBoost = clamp(
          (impactSpeed - BODY_SPEED_RESTITUTION_THRESHOLD) / 520,
          0,
          BODY_SPEED_RESTITUTION_BOOST
        );
        const dynamicRestitution = BODY_RESTITUTION + speedRestitutionBoost;
        const bounce = (1 + dynamicRestitution) * impactSpeed;
        const clampedBounce = Math.min(bounce, SNAKE_BODY_MAX_BOUNCE_IMPULSE);
        
        if (clampedBounce > 100) {
            this.onBodyHit?.(this.x, this.y, clampedBounce);
        }

        this.velocityX += clampedBounce * bestNormalX;
        this.velocityY += clampedBounce * bestNormalY;
      }

      const tangentX = -bestNormalY;
      const tangentY = bestNormalX;

      const ballTangentVel = this.velocityX * tangentX + this.velocityY * tangentY;
      const bodyTangentVel = bodyVelocityX * tangentX + bodyVelocityY * tangentY;
      const segmentCurvature = snake.getSegmentCurvature(bestSegmentIndex);
      const curvatureFactor = clamp(
        (segmentCurvature - WHIP_CURVATURE_THRESHOLD) / (1 - WHIP_CURVATURE_THRESHOLD),
        0,
        1
      );
      const surfaceSpeed = length(bestSurfaceVelocityX, bestSurfaceVelocityY);
      const speedFactor = clamp((surfaceSpeed - WHIP_SURFACE_SPEED_THRESHOLD) / 520, 0, 1);
      const tailFactor = clamp(
        (bestSegmentIndex - 2) / Math.max(1, snake.segments.length - 3),
        0,
        1
      );
      const whipFactor = curvatureFactor * speedFactor * tailFactor;

      const tangentDelta = bodyTangentVel - ballTangentVel;
      const whipImpulse = clamp(
        tangentDelta * WHIP_TANGENT_TRANSFER * whipFactor,
        -WHIP_MAX_IMPULSE,
        WHIP_MAX_IMPULSE
      );

      if (Math.abs(whipImpulse) > 80) {
          this.onWhipHit?.(this.x, this.y, Math.abs(whipImpulse));
      }

      this.velocityX += tangentX * whipImpulse;
      this.velocityY += tangentY * whipImpulse;

      const adjustedBallTangentVel = ballTangentVel + whipImpulse;
      const tangentialDamping = BALL_BODY_TANGENTIAL_DAMPING * (1 - 0.55 * whipFactor);
      const desiredTangentVel =
        adjustedBallTangentVel * (1 - tangentialDamping) + bodyTangentVel * tangentialDamping;
      const tangentCorrection = desiredTangentVel - adjustedBallTangentVel;

      this.velocityX += tangentCorrection * tangentX;
      this.velocityY += tangentCorrection * tangentY;
    }
  }
}
