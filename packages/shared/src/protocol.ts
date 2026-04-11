export type C2S_Input = {
  type: "input";
  seq: number;
  mouseX: number;
  mouseY: number;
  sprint: boolean;
  anchor: boolean;
};

export type SnakeSnapshot = {
  seq: number;
  segments: Array<{ x: number; y: number }>;
  velocityX: number;
  velocityY: number;
  stamina: number;
  sprintExhausted: boolean;
};

export type WorldSnapshot = {
  tick: number;
  ball: { x: number; y: number; vx: number; vy: number };
  players: Record<string, SnakeSnapshot>;
  scores: Record<string, number>;
};

export type S2C_Snapshot = { type: "snapshot" } & WorldSnapshot;
export type S2C_GoalScored = { type: "goal"; scorerId: string; resetIn: number };
export type S2C_GameStart = { type: "start"; yourId: string; opponentId: string };
export type S2C_GameEnd = { type: "end"; winnerId: string | null };

export type S2C_Message = S2C_Snapshot | S2C_GoalScored | S2C_GameStart | S2C_GameEnd;
