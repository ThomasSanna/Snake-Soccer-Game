import { Schema, type, MapSchema } from "@colyseus/schema";

export class BallState extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
}

export class PlayerState extends Schema {
  // En reality on va envoyer l'état via des messages custom "snapshot" raw (cf JSON) 
  // comme recommandé dans le plan. Mais on garde la room avec un état minimal ou full 
  // Colyseus schema au choix. Dans notre plan, le "WorldSnapshot" remplace la sync schema.
  // Colyseus schema reste utile pour les metadata de lobby ou le score.
  @type("number") score: number = 0;
  @type("boolean") connected: boolean = true;
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type(BallState) ball: BallState = new BallState();
  @type("string") status: "waiting" | "playing" | "finished" = "waiting";
}
