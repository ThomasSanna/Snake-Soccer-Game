import * as Colyseus from "@colyseus/sdk";
import { SERVER_PORT } from "@cursor-soccer/shared";

// Singleton wrapper setup
class NetworkClient {
  private client: Colyseus.Client;
  private currentRoom: Colyseus.Room | null = null;
  public sessionId: string | null = null;

  constructor() {
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    // Si on déploie, on changera l'URL. Pour l'instant, c'est en dur sur localhost ou le même host
    const endpoint = isLocalhost 
      ? `ws://${window.location.hostname}:${SERVER_PORT}` 
      : `${window.location.protocol.replace("http", "ws")}//${window.location.hostname}`;
      
    this.client = new Colyseus.Client(endpoint);
  }

  async joinRanked(): Promise<Colyseus.Room> {
    await this.leaveRoom();
    this.currentRoom = await this.client.joinOrCreate("ranked");
    this.sessionId = this.currentRoom.sessionId;
    return this.currentRoom;
  }

  async createPrivate(): Promise<{ room: Colyseus.Room; code: string }> {
    await this.leaveRoom();
    
    // Generate a simple 6 char code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Actually colyseus create() just gives a GUID. We can create, then read the ID.
    this.currentRoom = await this.client.create("private", { roomCode: code });
    this.sessionId = this.currentRoom.sessionId;
    
    // Or we use currentRoom.id and return that. 
    return { room: this.currentRoom, code: (this.currentRoom as any).id || this.currentRoom.roomId };
  }

  async joinPrivate(code: string): Promise<Colyseus.Room> {
    await this.leaveRoom();
    this.currentRoom = await this.client.joinById(code);
    this.sessionId = this.currentRoom.sessionId;
    return this.currentRoom;
  }

  async leaveRoom(): Promise<void> {
    if (this.currentRoom) {
      this.currentRoom.leave();
      this.currentRoom = null;
      this.sessionId = null;
    }
  }

  get room(): Colyseus.Room | null {
    return this.currentRoom;
  }
}

export const networkClient = new NetworkClient();
