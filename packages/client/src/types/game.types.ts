// ─── Scene Types ─────────────────────────────────────────────────────────────

/**
 * Lifecycle interface every scene must implement.
 * The router calls mount() when entering and destroy() when leaving.
 */
export interface GameScene {
  /** Called once when the scene becomes active. */
  mount(): void;
  /** Called once when the scene is being replaced by another. */
  destroy(): void;
}

// ─── Mode Identifiers ────────────────────────────────────────────────────────

export type GameMode = "menu" | "training" | "ranked" | "private" | "lobby" | "online";

// ─── Visual FX ───────────────────────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: number;
}
