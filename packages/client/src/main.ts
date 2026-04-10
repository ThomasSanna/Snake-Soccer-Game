/**
 * Application entry point.
 *
 * Responsibilities:
 *  1. Import global styles.
 *  2. Wire up scene factories.
 *  3. Bootstrap the SceneRouter and navigate to the menu.
 *
 * All game logic lives in the respective Scene classes.
 */
import "./styles.css";

import { SceneRouter, type SceneFactories } from "./router/SceneRouter";
import { MenuScene } from "./scenes/MenuScene";
import { TrainingScene } from "./scenes/TrainingScene";
import type { GameMode } from "./types/game.types";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing #app root element in index.html");
}

const factories: SceneFactories = {
  menu: (el, nav) => new MenuScene(el, nav),
  training: (el, nav) => new TrainingScene(el, () => nav("menu")),
  // Stubs — replace with real scene classes when implemented.
  ranked: (el, nav) =>
    new MenuScene(el, nav), // temporary fallback to menu
  private: (el, nav) =>
    new MenuScene(el, nav), // temporary fallback to menu
};

const router = new SceneRouter(root, factories);
router.go("menu");
