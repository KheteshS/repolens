import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import analyzeRouter from "./routes/analyze";
import statusRouter from "./routes/status";
import resultsRouter from "./routes/results";
import analysesRouter from "./routes/analyses";

const app = express();

app.use(
  cors({
    origin: process.env.NEXT_AUTH_URL || "http://localhost:3000",
    credentials: true,
  }),
);

export const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many requests, Try again in a minute.",
});

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/analyze", analyzeLimiter, analyzeRouter);
app.use("/api/status", statusRouter);
app.use("/api/results", resultsRouter);
app.use("/api/analyses", analysesRouter);

export default app;
