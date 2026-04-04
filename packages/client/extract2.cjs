const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, 'src', 'main.ts');
const sharedPhysicsPath = path.join(__dirname, '..', 'shared', 'src', 'physics.ts');
const sharedIndexPath = path.join(__dirname, '..', 'shared', 'src', 'index.ts');

const mainCode = fs.readFileSync(mainPath, 'utf8');

// The code blocks are well defined
const constantsRegex = /const BASE_TURN_RATE_RAD_PER_SECOND = Math\.PI \* 2\.0;[\s\S]*?const SNAKE_SELF_SEPARATION_RELAX = 0\.45;/;
const constantsMatch = mainCode.match(constantsRegex);
if (!constantsMatch) throw new Error("Could not find constants");
let constantsCode = constantsMatch[0].replace(/const /g, 'export const ');

const typesRegex = /type GoalSide = "left" \| "right";[\s\S]*?type InputState = \{[^}]*\};/;
const typesMatch = mainCode.match(typesRegex);
if (!typesMatch) throw new Error("Could not find types");
let typesCode = typesMatch[0].replace(/type /g, 'export type ');

const snakeRegex = /class Snake \{[\s\S]*?^\}/m;
// Since Snake class ends with `}`, we can find it by finding `class Snake` to the last `}` before `type Particle`.
const snakeStart = mainCode.indexOf('class Snake {');
let snakeEnd = mainCode.indexOf('\ntype Particle =');
if (snakeStart === -1 || snakeEnd === -1) throw new Error("Could not find snake");

// `drawSmoothSnakePath` shouldn't be moved, it's after `Particle`.
// `resolveSnakeVsSnakeCollision`, `resolveHeadToHead`, `resolveHeadAgainstBody` are after `drawSmoothSnakePath`.
let resolveStart = mainCode.indexOf('function resolveSnakeVsSnakeCollision');
let resolveEnd = mainCode.indexOf('\nfunction readStoredThemeId');
if (resolveStart === -1 || resolveEnd === -1) throw new Error("Could not find resolve func");

let ballStart = mainCode.indexOf('class Ball {');
let ballEnd = mainCode.indexOf('\ntype Shockwave = {');
if (ballStart === -1 || ballEnd === -1) throw new Error("Could not find ball");

let normalizeAngleStart = mainCode.indexOf('function normalizeAngle');
let normalizeAngleEnd = mainCode.indexOf('\nfunction drawSmoothSnakePath');

let snakeCode = mainCode.slice(snakeStart, snakeEnd);
let resolveCode = mainCode.slice(resolveStart, resolveEnd);
let ballCode = mainCode.slice(ballStart, ballEnd);
let normAngleCode = mainCode.slice(normalizeAngleStart, normalizeAngleEnd);

snakeCode = snakeCode.replace('class Snake {', 'export class Snake {');
ballCode = ballCode.replace('class Ball {', 'export class Ball {');
resolveCode = resolveCode.replace(/function resolve/g, 'export function resolve');
normAngleCode = normAngleCode.replace('function normalize', 'export function normalize');

// Modify Ball class to add event parameters instead of client imports
const ballEvents = `
  public onWallHit?: (x: number, y: number, velocity: number) => void;
  public onHeadHit?: (x: number, y: number, approach: number) => void;
  public onPerfectFlick?: (x: number, y: number) => void;
  public onBodyHit?: (x: number, y: number, bounce: number) => void;
  public onWhipHit?: (x: number, y: number, whip: number) => void;
`;
ballCode = ballCode.replace('public perfectFlickTriggered: boolean;', 'public perfectFlickTriggered: boolean;' + ballEvents);

ballCode = ballCode.replace(/if \(this.velocityY < -250\) emitParticles\(this.x, minY, 0xffffff, 6, 200\);/g, 'if (this.velocityY < -250) this.onWallHit?.(this.x, minY, Math.abs(this.velocityY));');
ballCode = ballCode.replace(/if \(this.velocityY > 250\) emitParticles\(this.x, maxY, 0xffffff, 6, 200\);/g, 'if (this.velocityY > 250) this.onWallHit?.(this.x, maxY, Math.abs(this.velocityY));');
ballCode = ballCode.replace(/if \(this.velocityX < -250\) emitParticles\(minX, this.y, 0xffffff, 6, 200\);/g, 'if (this.velocityX < -250) this.onWallHit?.(minX, this.y, Math.abs(this.velocityX));');
ballCode = ballCode.replace(/if \(this.velocityX > 250\) emitParticles\(maxX, this.y, 0xffffff, 6, 200\);/g, 'if (this.velocityX > 250) this.onWallHit?.(maxX, this.y, Math.abs(this.velocityX));');

ballCode = ballCode.replace(/if \(wallHitVelocity > 150\) \{\s*playSound\("bounce_wall\.mp3", wallHitVelocity \/ 1500\);\s*\}/g, '');
ballCode = ballCode.replace(/if \(velAlongNormal > 200\) \{\s*emitParticles\([^)]+\);\s*playSound\([^)]+\);\s*\}/g, 'if (velAlongNormal > 200) this.onWallHit?.(this.x, this.y, velAlongNormal);');

ballCode = ballCode.replace(/emitParticles\(this.x, this.y, 0xffaa00, 30, 800\);\s*\/\/\s*Big impact\s*playSound\("hit_perfect.mp3", 1\.0\);/g, 'this.onPerfectFlick?.(this.x, this.y);');
ballCode = ballCode.replace(/emitParticles\(this.x, this.y, 0xaaffff, 12, 350\);\s*playSound\("hit_head.mp3", clamp\(relativeApproach \/ 800, 0\.2, 0\.8\)\);/g, 'this.onHeadHit?.(this.x, this.y, relativeApproach);');

ballCode = ballCode.replace(/if \(clampedBounce > 100\) \{\s*emitParticles\([^)]+\);\s*playSound\([^)]+\);\s*\}/g, 'if (clampedBounce > 100) this.onBodyHit?.(this.x, this.y, clampedBounce);');
ballCode = ballCode.replace(/if \(Math\.abs\(whipImpulse\) > 80\) \{\s*emitParticles\([^)]+\);\s*playSound\([^)]+\);\s*\}/g, 'if (Math.abs(whipImpulse) > 80) this.onWhipHit?.(this.x, this.y, Math.abs(whipImpulse));');

let fullPhysicsCode = `import {
  TICK_RATE, FIELD_WIDTH, FIELD_HEIGHT, FIELD_CORNER_RADIUS, GOAL_HEIGHT,
  SNAKE_HEAD_RADIUS, SNAKE_BODY_RADIUS, SNAKE_SEGMENT_LENGTH, SNAKE_SEGMENT_COUNT,
  BALL_RADIUS, BALL_RESTITUTION, BALL_DAMPING_PER_TICK,
  BASE_MAX_SPEED, SPRINT_MULTIPLIER, STAMINA_MAX, STAMINA_DRAIN_PER_SECOND, STAMINA_RECOVER_PER_SECOND,
  HEAD_SHOT_POWER, HEAD_SHOT_MAX_IMPULSE, HEAD_CARRY_FACTOR, BODY_RESTITUTION,
  PERFECT_FLICK_POWER_MULTIPLIER, PERFECT_FLICK_WINDOW_SECONDS,
  clamp, length, type Segment
} from "./index";

${constantsCode}
${typesCode}
${normAngleCode}
${snakeCode}
${resolveCode}
${ballCode}
`;

fs.writeFileSync(sharedPhysicsPath, fullPhysicsCode, 'utf8');

// Update shared/src/index.ts to export from physics
let sharedIndexCode = fs.readFileSync(sharedIndexPath, 'utf8');
if (!sharedIndexCode.includes('export * from "./physics"')) {
    sharedIndexCode += '\nexport * from "./physics";\n';
    fs.writeFileSync(sharedIndexPath, sharedIndexCode, 'utf8');
}

// Update main.ts to remove these blocks
let newMainCode = mainCode.replace(constantsMatch[0], '');
newMainCode = newMainCode.replace(typesMatch[0], '');
newMainCode = newMainCode.replace(mainCode.slice(snakeStart, snakeEnd), '');
newMainCode = newMainCode.replace(mainCode.slice(resolveStart, resolveEnd), '');
newMainCode = newMainCode.replace(mainCode.slice(ballStart, ballEnd), '');
newMainCode = newMainCode.replace(mainCode.slice(normalizeAngleStart, normalizeAngleEnd), '');

// Need to update the import in main.ts
const importsRegex = /import \{[^}]*\} from "@cursor-soccer\/shared";/;
const sharedImportsMatch = newMainCode.match(importsRegex);
if (!sharedImportsMatch) throw new Error("Could not find shared imports in main.ts");

const allExports = [
  ...constantsMatch[0].matchAll(/(?:const) ([A-Z_0-9]+)/g)
].map(m => m[1]);
allExports.push('InputState', 'GoalSide', 'Snake', 'Ball', 'resolveSnakeVsSnakeCollision', 'resolveHeadToHead', 'resolveHeadAgainstBody', 'normalizeAngle');

let currentImports = sharedImportsMatch[0];
let newImports = currentImports.replace('} from "@cursor-soccer/shared";', '  ' + allExports.join(',\n  ') + '\n} from "@cursor-soccer/shared";');
newMainCode = newMainCode.replace(currentImports, newImports);

// Fix Ball instantiation in main.ts
newMainCode = newMainCode.replace(/const ball = new Ball\(\);/g, `const ball = new Ball();
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
    shakeIntensity += 15;
    shockwaves.push({ x, y, radius: BALL_RADIUS, alpha: 1, color: 0xffaa00 });
  };
  ball.onBodyHit = (x, y, bounce) => {
    emitParticles(x, y, 0xaaffff, 5, 200);
    playSound("hit_body.mp3", clamp(bounce / 400, 0.1, 0.6));
  };
  ball.onWhipHit = (x, y, whip) => {
    emitParticles(x, y, 0x88ff88, 6, 250);
    playSound("hit_whip.mp3", clamp(whip / 300, 0.2, 0.7));
  };`);

// Wait, the shockwaves and shakeIntensity update is inside physics loop now! I need to ensure it uses the local variables from main.ts or just calls them properly. In main.ts those are inside `main()`.
// So adding the callbacks inside `main()` right after `new Ball()` is perfect!

fs.writeFileSync(mainPath, newMainCode, 'utf8');

console.log("Successfully extracted to shared and updated main.ts");
