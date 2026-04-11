import { Application, Container, Graphics, Text, TextStyle, Rectangle } from "pixi.js";
import { GameScene, GameMode } from "../types/game.types";
import { networkClient } from "../network/NetworkClient";
import { InputBuffer } from "../network/InputBuffer";
import { NetworkedRenderer } from "../rendering/NetworkedRenderer";
import { 
  FIELD_WIDTH, FIELD_HEIGHT, TICK_RATE, 
  SNAKE_SEGMENT_COUNT, BALL_RADIUS, SNAKE_HEAD_RADIUS, SNAKE_BODY_RADIUS,
  S2C_Message, S2C_Snapshot
} from "@cursor-soccer/shared";
import { getFieldTheme, DEFAULT_FIELD_THEME_ID } from "../fieldThemes";
import { playSound } from "../utils/audio";

export class OnlineScene implements GameScene {
  private readonly root: HTMLElement;
  private readonly onExit: () => void;
  private app: Application | null = null;
  private abortController = new AbortController();

  private renderer!: NetworkedRenderer;
  private inputBuffer = new InputBuffer();
  private lastTick = 0;
  private scoreText!: Text;

  private myId: string | null = null;
  private opponentId: string | null = null;

  constructor(
    root: HTMLElement, 
    onExit: () => void, 
    myId: string, 
    opponentId: string
  ) {
    this.root = root;
    this.onExit = onExit;
    this.myId = myId;
    this.opponentId = opponentId;
  }

  mount(): void {
    this.abortController = new AbortController();
    void this.init();
  }

  destroy(): void {
    this.abortController.abort();
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }

  private async init() {
    const { signal } = this.abortController;

    this.app = new Application({
      antialias: true,
      backgroundColor: 0x060913,
      resizeTo: window,
    });
    if (signal.aborted) { this.app.destroy(true); this.app = null; return; }
    
    this.root.appendChild(this.app.view as HTMLCanvasElement);
    this.app.ticker.maxFPS = 144;

    const world = new Container();
    const uiLayer = new Container();
    this.app.stage.addChild(world, uiLayer);

    const theme = getFieldTheme(DEFAULT_FIELD_THEME_ID);
    this.renderer = new NetworkedRenderer(world, theme, this.myId || "");

    this.scoreText = new Text("0 - 0", new TextStyle({
      fontFamily: "Arial, sans-serif",
      fontWeight: "900",
      fontSize: 64,
      fill: 0xffffff,
    }));
    this.scoreText.anchor.set(0.5, 0.5);
    this.scoreText.y = 80;
    uiLayer.addChild(this.scoreText);

    // Setup network listener
    const room = networkClient.room;
    if (!room) {
      console.error("No active room!");
      this.onExit();
      return;
    }

    room.onMessage("message", (msg: S2C_Message) => {
      if (msg.type === "snapshot") {
        this.renderer.onSnapshot(msg);
        
        if (this.myId && msg.players[this.myId]) {
          const processedSeq = msg.players[this.myId].seq;
          this.inputBuffer.ack(processedSeq);
          
          // Re-apply pending inputs for Client-Side Prediction
          const pending = this.inputBuffer.getPendingInputs();
          const fixedDt = 1 / TICK_RATE;
          for (const input of pending) {
            this.renderer.predict(input, fixedDt);
          }
        }
        
        // Update score
        if (this.myId && this.opponentId) {
           const myScore = msg.scores[this.myId] || 0;
           const opScore = msg.scores[this.opponentId] || 0;
           this.scoreText.text = `YOU ${myScore} - ${opScore} ENEMY`;
        }
      } else if (msg.type === "goal") {
        playSound("goal_scored.mp3", 1.0);
        // Visual shake or goal explosion could go here
      } else if (msg.type === "end") {
        alert(msg.winnerId === this.myId ? "You Win!" : "You Lose!");
        this.onExit();
      }
    });

    // Viewport
    const updateViewport = () => {
      if (!this.app) return;
      const scale = Math.min(
        this.app.screen.width / FIELD_WIDTH, 
        this.app.screen.height / FIELD_HEIGHT
      ) * 0.8;
      world.scale.set(scale, scale);
      world.position.set(
        (this.app.screen.width - FIELD_WIDTH * scale) * 0.5,
        (this.app.screen.height - FIELD_HEIGHT * scale) * 0.5
      );
      this.scoreText.x = this.app.screen.width * 0.5;
    };
    updateViewport();
    window.addEventListener("resize", updateViewport, { signal });

    // Input state
    let mouseX = FIELD_WIDTH / 2;
    let mouseY = FIELD_HEIGHT / 2;
    let sprint = false;
    let anchor = false;

    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = new Rectangle(0, 0, 10000, 10000);
    this.app.stage.on("pointermove", (e) => {
      mouseX = (e.global.x - world.position.x) / world.scale.x;
      mouseY = (e.global.y - world.position.y) / world.scale.y;
    });

    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) sprint = true;
      if (e.button === 2) anchor = true;
    }, { signal });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) sprint = false;
      if (e.button === 2) anchor = false;
    }, { signal });
    
    (this.app.view as HTMLCanvasElement).addEventListener("contextmenu", e => e.preventDefault(), { signal });

    let timeAccumulator = 0;
    const fixedDt = 1 / TICK_RATE;

    this.app.ticker.add(() => {
      if (!this.app) return;
      const frameDt = this.app.ticker.deltaMS / 1000;
      timeAccumulator += frameDt;

      // Fixed update loop for inputs
      while (timeAccumulator >= fixedDt) {
        const input = this.inputBuffer.addInput(mouseX, mouseY, sprint, anchor);
        room.send("input", input);
        
        // Predict
        this.renderer.predict(input, fixedDt);
        
        timeAccumulator -= fixedDt;
      }

      this.renderer.render(frameDt);
    });
  }
}
