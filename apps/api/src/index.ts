import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { startWorker } from "./workers/analysisWorker";

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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[API] Server running on http://localhost:${PORT}`);
});

startWorker();
console.log("[Worker] Analysis worker started");

export default app;
