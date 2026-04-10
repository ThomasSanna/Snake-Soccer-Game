import type { Particle } from "../types/game.types";

/** The global pool of live particles shared across all renderers. */
const particles: Particle[] = [];

/**
 * Returns the live particle pool (read-only from the outside).
 * Used by the FX renderer to iterate and draw particles each frame.
 */
export function getParticles(): readonly Particle[] {
  return particles;
}

/**
 * Spawns `count` particles at (x, y) with random directions and speeds up to
 * `baseSpeed`.  They will be automatically removed by `tickParticles` when
 * their lifetime expires.
 */
export function emitParticles(
  x: number,
  y: number,
  color: number,
  count: number,
  baseSpeed: number
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * baseSpeed;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 0.15 + Math.random() * 0.35,
      color,
      size: 1.5 + Math.random() * 3,
    });
  }
}

/**
 * Advances all particles by `dt` seconds and removes expired ones.
 * Call once per render frame (not per physics tick).
 */
export function tickParticles(dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]!;
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
    if (p.life >= p.maxLife) {
      particles.splice(i, 1);
    }
  }
}

/** Clears all active particles (e.g. when leaving a scene). */
export function clearParticles(): void {
  particles.length = 0;
}
