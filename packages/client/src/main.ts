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
import { LobbyScene } from "./scenes/LobbyScene";
import { OnlineScene } from "./scenes/OnlineScene";
import type { GameMode } from "./types/game.types";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing #app root element in index.html");
}

const factories: SceneFactories = {
  menu: (el, nav) => new MenuScene(el, nav),
  training: (el, nav) => new TrainingScene(el, () => nav("menu")),
  lobby: (el, nav) => new MenuScene(el, nav), // Fallback
  ranked: (el, nav) => new LobbyScene(el, "ranked", (p1, p2) => nav("online", { myId: p1, opponentId: p2 }), () => nav("menu")),
  private: (el, nav) => new LobbyScene(el, "private", (p1, p2) => nav("online", { myId: p1, opponentId: p2 }), () => nav("menu")),
  online: (el, nav, params) => new OnlineScene(el, () => nav("menu"), params?.myId || "", params?.opponentId || ""),
};

const router = new SceneRouter(root, factories);
router.go("menu");
