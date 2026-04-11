import { Client } from "colyseus";
import { BaseGameRoom } from "./BaseGameRoom";

interface PrivateRoomOptions {
  roomCode?: string;
}

export class PrivateRoom extends BaseGameRoom {
  maxClients = 2;

  onCreate(options: PrivateRoomOptions) {
    super.onCreate(options);
    
    // Set room ID to something short if requested, or generate a short ID
    // Colyseus gives a GUID by default, we can generate a short code instead
    // But since roomId is already set, Colyseus allows setting custom id in matchmaking.
    // Assuming matchmaking handled the custom ID setup.
  }

  protected onPlayerJoin(client: Client) {
    if (this.clients.length === 2) {
      this.lock();
      this.startGame();
    }
  }

  protected onPlayerLeave(client: Client, code?: number) {
    // In private, we might pause the game or just end it if someone leaves
    if (!this.gameEnded) {
      this.gameEnded = true;
      const winnerId = Array.from(this.clients).find(c => c.sessionId !== client.sessionId)?.sessionId || null;
      this.broadcast("message", { type: "end", winnerId });
      this.disconnect();
    }
  }
}
