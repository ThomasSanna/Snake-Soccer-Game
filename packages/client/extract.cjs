const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, 'src', 'main.ts');
const sharedIndexPath = path.join(__dirname, '..', 'shared', 'src', 'index.ts');

const mainCode = fs.readFileSync(mainPath, 'utf8');
const lines = mainCode.split('\n');

const constStart = lines.findIndex(l => l.includes('const BASE_TURN_RATE_RAD_PER_SECOND'));
const classEnd = lines.findIndex(l => l.includes('type Shockwave'));

if (constStart === -1 || classEnd === -1) {
    console.error("Could not find bounds");
    process.exit(1);
}

let physicsCode = lines.slice(constStart, classEnd).join('\n');

// Make things exportable
physicsCode = physicsCode.replace(/const BASE_TURN_RATE/g, 'export const BASE_TURN_RATE');
physicsCode = physicsCode.replace(/const FIELD_THEME_STORAGE_KEY/g, 'export const FIELD_THEME_STORAGE_KEY');
physicsCode = physicsCode.replace(/const SNAKE_/g, 'export const SNAKE_');
physicsCode = physicsCode.replace(/const BALL_/g, 'export const BALL_');
physicsCode = physicsCode.replace(/const WHIP_/g, 'export const WHIP_');
physicsCode = physicsCode.replace(/const BODY_/g, 'export const BODY_');
physicsCode = physicsCode.replace(/const PLAYER_PALETTE/g, 'export const PLAYER_PALETTE');
physicsCode = physicsCode.replace(/const ENEMY_PALETTE/g, 'export const ENEMY_PALETTE');

physicsCode = physicsCode.replace(/type GoalSide/g, 'export type GoalSide');
physicsCode = physicsCode.replace(/type InputState/g, 'export type InputState');
physicsCode = physicsCode.replace(/class Snake/g, 'export class Snake');
physicsCode = physicsCode.replace(/class Ball/g, 'export class Ball');
physicsCode = physicsCode.replace(/function normalizeAngle/g, 'export function normalizeAngle');
physicsCode = physicsCode.replace(/function drawSmoothSnakePath/g, 'export function drawSmoothSnakePath');
physicsCode = physicsCode.replace(/function resolveSnake/g, 'export function resolveSnake');
physicsCode = physicsCode.replace(/function resolveHead/g, 'export function resolveHead');

// Add events to ball
const ballEvents = `
  public onWallHit?: (x: number, y: number, velocity: number) => void;
  public onHeadHit?: (x: number, y: number, approach: number) => void;
  public onPerfectFlick?: (x: number, y: number) => void;
  public onBodyHit?: (x: number, y: number, bounce: number) => void;
  public onWhipHit?: (x: number, y: number, whip: number) => void;
`;
physicsCode = physicsCode.replace(/public perfectFlickTriggered: boolean;/g, 'public perfectFlickTriggered: boolean;' + ballEvents);

// Strip sound and particles
physicsCode = physicsCode.replace(/if \(this.velocityY < -250\) emitParticles\(this.x, minY, 0xffffff, 6, 200\);/g, 'if (this.velocityY < -250) this.onWallHit?.(this.x, minY, Math.abs(this.velocityY));');
physicsCode = physicsCode.replace(/if \(this.velocityY > 250\) emitParticles\(this.x, maxY, 0xffffff, 6, 200\);/g, 'if (this.velocityY > 250) this.onWallHit?.(this.x, maxY, Math.abs(this.velocityY));');
physicsCode = physicsCode.replace(/if \(this.velocityX < -250\) emitParticles\(minX, this.y, 0xffffff, 6, 200\);/g, 'if (this.velocityX < -250) this.onWallHit?.(minX, this.y, Math.abs(this.velocityX));');
physicsCode = physicsCode.replace(/if \(this.velocityX > 250\) emitParticles\(maxX, this.y, 0xffffff, 6, 200\);/g, 'if (this.velocityX > 250) this.onWallHit?.(maxX, this.y, Math.abs(this.velocityX));');
physicsCode = physicsCode.replace(/if \(wallHitVelocity > 150\) \{\s*playSound\("bounce_wall\.mp3", wallHitVelocity \/ 1500\);\s*\}/g, '');
physicsCode = physicsCode.replace(/if \(velAlongNormal > 200\) \{\s*emitParticles\([^)]+\);\s*playSound\([^)]+\);\s*\}/g, 'if (velAlongNormal > 200) this.onWallHit?.(this.x, this.y, velAlongNormal);');

physicsCode = physicsCode.replace(/emitParticles\(this.x, this.y, 0xffaa00, 30, 800\);\s*\/\/\s*Big impact\s*playSound\("hit_perfect.mp3", 1\.0\);/g, 'this.onPerfectFlick?.(this.x, this.y);');
physicsCode = physicsCode.replace(/emitParticles\(this.x, this.y, 0xaaffff, 12, 350\);\s*playSound\("hit_head.mp3", clamp\(relativeApproach \/ 800, 0\.2, 0\.8\)\);/g, 'this.onHeadHit?.(this.x, this.y, relativeApproach);');

physicsCode = physicsCode.replace(/if \(clampedBounce > 100\) \{\s*emitParticles\([^)]+\);\s*playSound\([^)]+\);\s*\}/g, 'if (clampedBounce > 100) this.onBodyHit?.(this.x, this.y, clampedBounce);');
physicsCode = physicsCode.replace(/if \(Math\.abs\(whipImpulse\) > 80\) \{\s*emitParticles\([^)]+\);\s*playSound\([^)]+\);\s*\}/g, 'if (Math.abs(whipImpulse) > 80) this.onWhipHit?.(this.x, this.y, Math.abs(whipImpulse));');

// Strip out emitParticles and playSound declarations from physicsCode
physicsCode = physicsCode.replace(/type Particle =[\s\S]*?const particles[\s\S]*?export function emitParticles[\s\S]*?\}\s*\}\s*export function playSound[\s\S]*?\}\s*\}\s*/, '');
physicsCode = physicsCode.replace(/function readStoredThemeId(.*?\n){10}\s*}\s*/, '');
physicsCode = physicsCode.replace(/function persistThemeId(.*?\n){5}\s*}\s*/, '');

let sharedIndexCode = fs.readFileSync(sharedIndexPath, 'utf8');
sharedIndexCode = sharedIndexCode + '\n' + physicsCode + '\n';
fs.writeFileSync(sharedIndexPath, sharedIndexCode, 'utf8');

console.log("Extracted physics to shared");
