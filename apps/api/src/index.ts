import app from "./app";
import { startWorker } from "./workers/analysisWorker";
import { setupWebSocket } from "./routes/chat";

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`[API] Server running on http://localhost:${PORT}`);
  startWorker();
  console.log("[Worker] Analysis worker started");
});

setupWebSocket(server);
console.log("[WS] Chat WebSocket ready at /ws/chat");

export default app;
