import * as Colyseus from "@colyseus/sdk"; (async () => { const client = new Colyseus.Client("ws://localhost:2567"); await client.create("private"); setTimeout(() => process.exit(0), 1000); })();
