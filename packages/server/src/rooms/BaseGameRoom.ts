import { Room, Client } from "colyseus";
import { GameState, PlayerState } from "./schema/GameState";
import { 
  Snake, 
  Ball, 
  FIELD_WIDTH, 
  FIELD_HEIGHT, 
  resolveSnakeVsSnakeCollision, 
  InputState,
  C2S_Input,
  S2C_Snapshot,
  S2C_GameStart,
  S2C_GoalScored,
  GOAL_RESET_DELAY_SECONDS,
  BALL_PHYSICS_SUBSTEPS,
  BALL_RADIUS,
  SERVER_TICK_RATE
} from "@cursor-soccer/shared";

interface BaseRoomOptions {
  // Option fields can go here
}

export abstract class BaseGameRoom extends Room<GameState> {
  protected snakes = new Map<string, Snake>();
  protected ball = new Ball();
  
  protected playerInputs = new Map<string, InputState>();
  protected playerSequences = new Map<string, number>();

  protected simulationInterval: NodeJS.Timeout | null = null;
  protected currentTick = 0;
  
  protected scores: Record<string, number> = {};
  protected resetCountdown = 0;
  protected gameEnded = false;

  onCreate(options: BaseRoomOptions) {
    this.setState(new GameState());
    
    // We expect raw messages for inputs
    this.onMessage("input", (client: Client, message: C2S_Input) => {
      this.playerInputs.set(client.sessionId, {
        mouseX: message.mouseX,
        mouseY: message.mouseY,
        sprint: message.sprint,
        anchor: message.anchor,
      });
      // Store the latest sequence number acknowledged for CSP
      this.playerSequences.set(client.sessionId, message.seq);
    });

    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 1000 / SERVER_TICK_RATE);
  }

  onJoin(client: Client, options: any) {
    console.log(`[${this.roomId}] Client joined: ${client.sessionId}`);
    
    const state = new PlayerState();
    this.state.players.set(client.sessionId, state);
    this.scores[client.sessionId] = 0;
    
    // Default snake setup
    this.snakes.set(client.sessionId, new Snake(FIELD_WIDTH / 2, FIELD_HEIGHT / 2));
    this.playerInputs.set(client.sessionId, { mouseX: FIELD_WIDTH / 2, mouseY: FIELD_HEIGHT / 2, sprint: false, anchor: false });
    this.playerSequences.set(client.sessionId, 0);

    this.onPlayerJoin(client);
  }

  onLeave(client: Client, code?: number) {
    console.log(`[${this.roomId}] Client left: ${client.sessionId}`);
    this.state.players.get(client.sessionId)!.connected = false;
    // For 1v1, if a player leaves, the game usually ends.
    this.onPlayerLeave(client);
  }

  onDispose() {
    console.log(`[${this.roomId}] Disposing room...`);
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
  }

  // Abstract hooks for specialized rooms
  protected abstract onPlayerJoin(client: Client): void;
  protected abstract onPlayerLeave(client: Client): void;

  protected startGame() {
    this.state.status = "playing";
    
    const clientIds = Array.from(this.clients).map(c => c.sessionId);
    if (clientIds.length >= 2) {
      const p1 = clientIds[0];
      const p2 = clientIds[1];
      
      this.resetRound();

      // Broadcast start with info about who is opponent
      const p1Client = this.clients.find(c => c.sessionId === p1);
      const p2Client = this.clients.find(c => c.sessionId === p2);

      p1Client?.send("start", { type: "start", yourId: p1, opponentId: p2 } as S2C_GameStart);
      p2Client?.send("start", { type: "start", yourId: p2, opponentId: p1 } as S2C_GameStart);
    }
  }

  protected resetRound() {
    const clientIds = Array.from(this.snakes.keys());
    if (clientIds.length < 2) return;
    
    const p1 = clientIds[0];
    const p2 = clientIds[1];

    this.snakes.get(p1)!.reset(FIELD_WIDTH * 0.25, FIELD_HEIGHT * 0.5, 1, 0, 0, true);
    this.snakes.get(p2)!.reset(FIELD_WIDTH * 0.75, FIELD_HEIGHT * 0.5, -1, 0, 0, true);
    this.ball.reset(FIELD_WIDTH * 0.5, FIELD_HEIGHT * 0.5);
    
    // Provide some fake push apart if they spawn closely, or keep simple
    this.snakes.get(p2)!.isSprinting = false; 
    
    this.ball.onWallHit = () => {};
    this.ball.onHeadHit = () => {};
    this.ball.onPerfectFlick = () => {};
    this.ball.onBodyHit = () => {};
  }

  private update(deltaTimeMs: number) {
    if (this.state.status !== "playing" || this.gameEnded) return;

    this.currentTick++;
    const fixedDt = 1 / SERVER_TICK_RATE; // we use fixed delta for determinism

    if (this.resetCountdown > 0) {
      this.resetCountdown -= fixedDt;
      if (this.resetCountdown <= 0) {
        this.resetCountdown = 0;
        this.resetRound();
      }
    } else {
      const pIds = Array.from(this.snakes.keys());
      if (pIds.length >= 2) {
        const s1 = this.snakes.get(pIds[0])!;
        const s2 = this.snakes.get(pIds[1])!;
        const i1 = this.playerInputs.get(pIds[0])!;
        const i2 = this.playerInputs.get(pIds[1])!;

        s1.update(i1, fixedDt);
        s2.update(i2, fixedDt);
        resolveSnakeVsSnakeCollision(s1, s2);

        const ballSubDt = fixedDt / BALL_PHYSICS_SUBSTEPS;
        for (let sub = 0; sub < BALL_PHYSICS_SUBSTEPS; sub++) {
          const lerpFactor = (sub + 1) / BALL_PHYSICS_SUBSTEPS;
          this.ball.update(ballSubDt);
          this.ball.collideWithSnake(s1, ballSubDt, lerpFactor);
          this.ball.collideWithSnake(s2, ballSubDt, lerpFactor);

          // Check goal
          const scored = this.ball.getScoredGoalSide();
          if (scored === "left") {
            this.handleGoal(pIds[1]); // right player scored on left goal
            break;
          } else if (scored === "right") {
            this.handleGoal(pIds[0]); // left player scored on right goal
            break;
          }
        }
      }
    }

    this.broadcastSnapshot();
  }

  private handleGoal(scorerId: string) {
    this.scores[scorerId] = (this.scores[scorerId] || 0) + 1;
    this.state.players.get(scorerId)!.score = this.scores[scorerId];
    this.resetCountdown = GOAL_RESET_DELAY_SECONDS;

    this.broadcast("message", {
      type: "goal",
      scorerId: scorerId,
      resetIn: GOAL_RESET_DELAY_SECONDS
    } as S2C_GoalScored);
    
    // Check win condition? (ex: max 5 goals)
  }

  private broadcastSnapshot() {
    const playersMap: Record<string, any> = {};
    for (const [id, snake] of this.snakes.entries()) {
      playersMap[id] = {
        seq: this.playerSequences.get(id) || 0,
        segments: snake.segments.map(s => ({ x: s.x, y: s.y })),
        velocityX: snake.velocityX,
        velocityY: snake.velocityY,
        stamina: snake.stamina,
        sprintExhausted: snake.sprintExhausted,
      };
    }

    const snapshot: S2C_Snapshot = {
      type: "snapshot",
      tick: this.currentTick,
      ball: { x: this.ball.x, y: this.ball.y, vx: this.ball.velocityX, vy: this.ball.velocityY },
      players: playersMap,
      scores: this.scores,
    };

    // Note: Instead of broadcasting globally which doesn't allow per-client variables (like their seq num),
    // wait, we can just attach the seq map or let the client rely on tick number for CSP.
    // Usually, client receives tick and knows which seq they sent at that tick.
    // Or we can include an ack map in the snapshot if needed.
    // Let's broadcast it for simplicity.
    this.broadcast("message", snapshot);
  }
}
