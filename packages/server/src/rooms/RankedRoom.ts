import { Client } from "colyseus";
import { BaseGameRoom } from "./BaseGameRoom";

export class RankedRoom extends BaseGameRoom {
  maxClients = 2; // Matchmaking sets up 1v1

  onCreate(options: any) {
    super.onCreate(options);
    // Add logic if needed for Ranked (e.g. keeping track of elo)
  }

  protected onPlayerJoin(client: Client) {
    if (this.clients.length === 2) {
      // Room is full, we can lock it and start
      this.lock();
      this.startGame();
    }
  }

  protected onPlayerLeave(client: Client, code?: number) {
    // In ranked, if someone leaves early, it's a forfeit.
    if (!this.gameEnded) {
      this.gameEnded = true;
      const winnerId = Array.from(this.clients).find(c => c.sessionId !== client.sessionId)?.sessionId || null;
      this.broadcast("message", { type: "end", winnerId });
      this.disconnect();
    }
  }
}
