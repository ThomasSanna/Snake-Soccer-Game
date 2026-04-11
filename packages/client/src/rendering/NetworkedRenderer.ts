import { Container, Graphics } from "pixi.js";
import { 
  Snake, Ball, 
  S2C_Snapshot, C2S_Input, 
  resolveSnakeVsSnakeCollision 
} from "@cursor-soccer/shared";
import { renderSnake, type SnakePalette } from "./snakeRenderer";
import { renderBall } from "./ballRenderer";
import { renderField } from "./fieldRenderer";
import { type FieldTheme } from "../fieldThemes";

const PLAYER_PALETTE: SnakePalette = {
  bodyColor: 0x33f0ff,
  headColor: 0x98ffff,
  glowColor: 0xb9ffff,
};

const ENEMY_PALETTE: SnakePalette = {
  bodyColor: 0xff7f52,
  headColor: 0xffc0a3,
  glowColor: 0xffa16f,
};

export class NetworkedRenderer {
  private fieldGraphics = new Graphics();
  private snakeGraphics = new Graphics();
  private ballGraphics = new Graphics();
  
  // Clientside prediction representation
  private playerSnake = new Snake(0, 0); 
  private enemySnake = new Snake(0, 0);
  private ball = new Ball();

  private myId: string;
  private theme: FieldTheme;

  constructor(world: Container, theme: FieldTheme, myId: string) {
    world.addChild(this.fieldGraphics, this.snakeGraphics, this.ballGraphics);
    this.theme = theme;
    this.myId = myId;
  }

  onSnapshot(msg: S2C_Snapshot) {
    // Basic interpolation: just snap to server state.
    // In a full implementation, we re-apply unacknowledged inputs on top of this.
    
    // Enemy
    const enemyId = Object.keys(msg.players).find(id => id !== this.myId);
    if (enemyId && msg.players[enemyId]) {
      const eSnap = msg.players[enemyId];
      if (eSnap.segments && eSnap.segments.length > 0) {
        this.enemySnake.segments.forEach((seg, i) => {
           if (eSnap.segments[i]) {
             seg.x = eSnap.segments[i].x;
             seg.y = eSnap.segments[i].y;
           }
        });
        this.enemySnake.velocityX = eSnap.velocityX;
        this.enemySnake.velocityY = eSnap.velocityY;
        this.enemySnake.stamina = eSnap.stamina;
        this.enemySnake.sprintExhausted = eSnap.sprintExhausted;
      }
    }

    // Server authoritative ball snap (interpolation would blend smoothly)
    this.ball.x = msg.ball.x;
    this.ball.y = msg.ball.y;
    this.ball.velocityX = msg.ball.vx;
    this.ball.velocityY = msg.ball.vy;

    // Player Server Reconciliation
    // Here we snap the player back to the server state.
    // In real CSP, we would immediately re-simulate pending inputs.
    if (this.myId && msg.players[this.myId]) {
      const pSnap = msg.players[this.myId];
      if (pSnap.segments && pSnap.segments.length > 0) {
        this.playerSnake.segments.forEach((seg, i) => {
           if (pSnap.segments[i]) {
             seg.x = pSnap.segments[i].x;
             seg.y = pSnap.segments[i].y;
           }
        });
        this.playerSnake.velocityX = pSnap.velocityX;
        this.playerSnake.velocityY = pSnap.velocityY;
        this.playerSnake.stamina = pSnap.stamina;
        this.playerSnake.sprintExhausted = pSnap.sprintExhausted;
      }
    }
  }

  predict(input: C2S_Input, dt: number) {
    // Client-side prediction of the player's own snake
    this.playerSnake.update(input, dt);
  }

  render(dt: number) {
    // Extrapolate enemy to smooth out frames
    for (let i = 0; i < this.enemySnake.segments.length; i++) {
        this.enemySnake.segments[i].x += this.enemySnake.velocityX * dt;
        this.enemySnake.segments[i].y += this.enemySnake.velocityY * dt;
    }
    
    // Extrapolate ball
    this.ball.update(dt);

    renderField(this.fieldGraphics, this.theme);
    
    this.snakeGraphics.clear();
    renderSnake(this.snakeGraphics, this.playerSnake, PLAYER_PALETTE);
    renderSnake(this.snakeGraphics, this.enemySnake, ENEMY_PALETTE, 1);
    
    renderBall(this.ballGraphics, this.ball);
  }
}
