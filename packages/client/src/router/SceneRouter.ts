import type { GameScene, GameMode } from "../types/game.types";

/**
 * SceneRouter
 *
 * Manages the active scene.  Only one scene is alive at a time.
 * Calling `go(mode)` destroys the current scene then mounts the new one.
 *
 * Scene factories are injected at construction time to avoid circular imports.
 */
export class SceneRouter {
  private readonly root: HTMLElement;
  private readonly factories: SceneFactories;
  private current: GameScene | null = null;

  constructor(root: HTMLElement, factories: SceneFactories) {
    this.root = root;
    this.factories = factories;
  }

  /** Navigate to a scene by mode identifier. */
  go(mode: GameMode, params?: any): void {
    this.current?.destroy();
    this.current = this.factories[mode](this.root, (target, p) => this.go(target, p), params);
    this.current.mount();
  }
}

/** Map from GameMode to a scene factory function. */
export type SceneFactories = {
  [K in GameMode]: (
    root: HTMLElement,
    navigate: (mode: GameMode, params?: any) => void,
    params?: any
  ) => GameScene;
};
