import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "colyseus";
import { RankedRoom } from "./rooms/RankedRoom";
import { PrivateRoom } from "./rooms/PrivateRoom";
import { SERVER_PORT } from "@cursor-soccer/shared";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const gameServer = new Server({
  server: httpServer,
} as any);

// Register rooms
gameServer.define("ranked", RankedRoom);
gameServer.define("private", PrivateRoom)
  // Enable custom IDs natively for private rooms
  .enableRealtimeListing();

app.get("/", (req, res) => {
  res.send("Cursor Soccer Server working !");
});

gameServer.listen(SERVER_PORT).then(() => {
  console.log(`[Colyseus] Cursor Soccer server listening on port ${SERVER_PORT}`);
});
