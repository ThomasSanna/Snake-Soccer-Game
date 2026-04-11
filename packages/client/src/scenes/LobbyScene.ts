import { GameScene, GameMode } from "../types/game.types";
import { networkClient } from "../network/NetworkClient";

export class LobbyScene implements GameScene {
  private readonly root: HTMLElement;
  private readonly onStartGame: (myId: string, opponentId: string) => void;
  private readonly onCancel: () => void;
  private readonly mode: "ranked" | "private";
  private wrapper: HTMLElement | null = null;
  private unsubs: Array<() => void> = [];

  constructor(
    root: HTMLElement, 
    mode: "ranked" | "private", 
    onStartGame: (myId: string, opponentId: string) => void,
    onCancel: () => void
  ) {
    this.root = root;
    this.mode = mode;
    this.onStartGame = onStartGame;
    this.onCancel = onCancel;
  }

  mount(): void {
    this.wrapper = document.createElement("div");
    this.wrapper.id = "lobby-scene";
    this.wrapper.className = "lobby__content menu__content";
    this.root.appendChild(this.wrapper);
    
    if (this.mode === "ranked") {
      this.mountRanked();
    } else {
      this.mountPrivate();
    }
  }

  destroy(): void {
    if (this.wrapper) {
      this.wrapper.remove();
      this.wrapper = null;
    }
    this.unsubs.forEach(u => u());
  }

  private async mountRanked() {
    this.wrapper!.innerHTML = `
      <h1 class="menu__title">MATCHMAKING</h1>
      <p class="menu__subtitle">Looking for an opponent...</p>
      <div class="lobby__spinner"></div>
      <button id="btn-cancel" class="menu__btn">Cancel</button>
    `;

    document.getElementById("btn-cancel")?.addEventListener("click", () => {
      networkClient.leaveRoom();
      this.onCancel();
    });

    try {
      const room = await networkClient.joinRanked();
      this.handleRoom(room);
    } catch (e) {
      alert("Failed to join matchmaking: " + e);
      this.onCancel();
    }
  }

  private mountPrivate() {
    this.wrapper!.innerHTML = `
      <h1 class="menu__title">PRIVATE PARTY</h1>
      <div class="lobby__actions">
        <button id="btn-create" class="menu__btn">Create Room</button>
        <div style="margin: 20px 0;">
          <input type="text" id="input-code" placeholder="ROOM CODE" class="menu__input" />
          <button id="btn-join" class="menu__btn">Join Room</button>
        </div>
      </div>
      <button id="btn-cancel" class="menu__btn">Cancel</button>
    `;

    document.getElementById("btn-cancel")?.addEventListener("click", () => {
      networkClient.leaveRoom();
      this.onCancel();
    });

    document.getElementById("btn-create")?.addEventListener("click", async () => {
      try {
        const { room, code } = await networkClient.createPrivate();
        this.wrapper!.innerHTML = `
          <h1 class="menu__title">PRIVATE PARTY</h1>
          <p class="menu__subtitle">Share this code with your friend:</p>
          <h2 style="color: #ffaa00; font-size: 48px; letter-spacing: 10px;">${code}</h2>
          <p class="menu__subtitle">Waiting for them to join...</p>
          <button id="btn-cancel" class="menu__btn">Cancel</button>
        `;
        document.getElementById("btn-cancel")?.addEventListener("click", () => {
          networkClient.leaveRoom();
          this.onCancel();
        });
        this.handleRoom(room);
      } catch (e) {
        alert("Failed to create room: " + e);
      }
    });

    document.getElementById("btn-join")?.addEventListener("click", async () => {
      const code = (document.getElementById("input-code") as HTMLInputElement).value.trim();
      if (!code) return;
      try {
        const room = await networkClient.joinPrivate(code);
        this.handleRoom(room);
      } catch (e) {
        alert("Failed to join room: " + e);
      }
    });
  }

  private handleRoom(room: any) {
    const unsub = room.onMessage("start", (msg: any) => {
      this.onStartGame(msg.yourId, msg.opponentId);
    });
    this.unsubs.push(() => room.onMessage.handlers = {}); // pseudo unbind
  }
}
