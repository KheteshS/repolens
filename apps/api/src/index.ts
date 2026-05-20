import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { startWorker } from "./workers/analysisWorker";
import { setupWebSocket } from "./routes/chat";
import analyzeRouter from "./routes/analyze";
import statusRouter from "./routes/status";
import resultsRouter from "./routes/results";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.NEXT_AUTH_URL || "http://localhost:3000",
    credentials: true,
  }),
);

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: "Too many requests, Try again in a minute.",
});

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/analyze", analyzeLimiter, analyzeRouter);
app.use("/api/status", statusRouter);
app.use("/api/results", resultsRouter);

const server = app.listen(PORT, () => {
  console.log(`[API] Server running on http://localhost:${PORT}`);
  startWorker();
  console.log("[Worker] Analysis worker started");
});

setupWebSocket(server);
console.log("[WS] Chat WebSocket ready at /ws/chat");

export default app;
