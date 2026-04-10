import type { GameScene, GameMode } from "../types/game.types";

/**
 * MenuScene
 *
 * A pure-HTML menu scene rendered directly into the DOM.
 * It does **not** use PixiJS so that the canvas is hidden while the menu is
 * active; this avoids running a GPU render loop unnecessarily.
 *
 * Usage:
 *   const menu = new MenuScene(container, (mode) => router.go(mode));
 *   menu.mount();   // inject HTML & attach listeners
 *   menu.destroy(); // clean up before switching scenes
 */
export class MenuScene implements GameScene {
  private readonly root: HTMLElement;
  private readonly onSelect: (mode: GameMode) => void;
  private wrapper: HTMLElement | null = null;

  constructor(root: HTMLElement, onSelect: (mode: GameMode) => void) {
    this.root = root;
    this.onSelect = onSelect;
  }

  mount(): void {
    this.wrapper = document.createElement("div");
    this.wrapper.id = "menu-scene";
    this.wrapper.innerHTML = MenuScene.buildHTML();
    this.root.appendChild(this.wrapper);

    // Animated entrance — tiny rAF delay so CSS transition fires after insert
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.wrapper?.classList.add("menu-scene--visible");
      });
    });

    this.wrapper
      .querySelector<HTMLButtonElement>("#btn-training")
      ?.addEventListener("click", () => this.onSelect("training"));

    this.wrapper
      .querySelector<HTMLButtonElement>("#btn-ranked")
      ?.addEventListener("click", () => this.onSelect("ranked"));

    this.wrapper
      .querySelector<HTMLButtonElement>("#btn-private")
      ?.addEventListener("click", () => this.onSelect("private"));
  }

  destroy(): void {
    if (!this.wrapper) return;
    this.wrapper.classList.remove("menu-scene--visible");
    // Wait for fade-out transition before removing from DOM
    const el = this.wrapper;
    this.wrapper = null;
    setTimeout(() => el.remove(), 400);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private static buildHTML(): string {
    return `
      <div class="menu__backdrop"></div>
      <div class="menu__content">

        <header class="menu__header">
          <div class="menu__logo-icon" aria-hidden="true">⚽</div>
          <h1 class="menu__title">CURSOR SOCCER</h1>
          <p class="menu__subtitle">Choose your arena</p>
        </header>

        <nav class="menu__nav" aria-label="Game mode selection">

          <button id="btn-training" class="menu__btn menu__btn--training" type="button">
            <span class="menu__btn-icon" aria-hidden="true">🤖</span>
            <span class="menu__btn-body">
              <span class="menu__btn-label">Training</span>
              <span class="menu__btn-desc">Practice against a straight-line bot</span>
            </span>
            <span class="menu__btn-arrow" aria-hidden="true">›</span>
          </button>

          <button id="btn-ranked" class="menu__btn menu__btn--ranked" type="button" disabled aria-disabled="true">
            <span class="menu__btn-icon" aria-hidden="true">🏆</span>
            <span class="menu__btn-body">
              <span class="menu__btn-label">
                Ranked
                <span class="menu__badge">Soon</span>
              </span>
              <span class="menu__btn-desc">Compete online for glory</span>
            </span>
            <span class="menu__btn-arrow" aria-hidden="true">›</span>
          </button>

          <button id="btn-private" class="menu__btn menu__btn--private" type="button" disabled aria-disabled="true">
            <span class="menu__btn-icon" aria-hidden="true">🔒</span>
            <span class="menu__btn-body">
              <span class="menu__btn-label">
                Private Party
                <span class="menu__badge">Soon</span>
              </span>
              <span class="menu__btn-desc">Play with friends in a private lobby</span>
            </span>
            <span class="menu__btn-arrow" aria-hidden="true">›</span>
          </button>

        </nav>

        <footer class="menu__footer">
          <p>Move your cursor · <kbd>Space</kbd> / <kbd>Click</kbd> to sprint · <kbd>Shift</kbd> to anchor</p>
        </footer>

      </div>
    `;
  }
}
