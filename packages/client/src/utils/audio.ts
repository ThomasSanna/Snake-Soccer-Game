import { clamp } from "@cursor-soccer/shared";

/**
 * Plays a sound file from the /sounds/ directory.
 * Failures (missing file, suspended AudioContext) are swallowed silently so
 * that missing assets never crash the game loop.
 */
export function playSound(filename: string, volume = 0.5): void {
  try {
    const audio = new Audio(`/sounds/${filename}`);
    audio.volume = clamp(volume, 0, 1);
    audio.play().catch(() => {
      /* ignore — missing assets or autoplay policy */
    });
  } catch {
    /* ignore — context blocked */
  }
}
