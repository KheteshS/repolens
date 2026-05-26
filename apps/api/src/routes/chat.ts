import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { prisma } from "../db/prisma";
import { generateStream } from "../services/geminiClient";

interface ChatMessage {
  type: "ping" | "message";
  analysisId: string;
  content: string;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws/chat" });

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", async (raw) => {
      try {
        const msg: ChatMessage = JSON.parse(raw.toString());

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }

        if (msg.type !== "message" || !msg.analysisId || !msg.content) {
          ws.send(
            JSON.stringify({
              type: "error",
              content: "Invalid message format",
            }),
          );
          return;
        }

        // Load analysis from DB for context
        const analysis = await prisma.analysis.findUnique({
          where: { id: msg.analysisId },
        });

        if (!analysis || analysis.status !== "completed") {
          ws.send(
            JSON.stringify({
              type: "error",
              content: "Analysis not found or not completed",
            }),
          );
          return;
        }

        // Build context prompt with repo info
        const context = buildRepoContext(analysis);
        const prompt = `${context}\n\n## User Question\n${msg.content}\n\nAnswer the question based on the codebase
  above. Be specific — reference file names and functions.`;

        // Signal start of streaming
        ws.send(JSON.stringify({ type: "start" }));

        // Stream Gemini response token by token
        for await (const chunk of generateStream(prompt)) {
          if (ws.readyState !== WebSocket.OPEN) break;
          ws.send(JSON.stringify({ type: "chunk", content: chunk }));
        }

        // Signal end of response
        ws.send(JSON.stringify({ type: "end" }));
      } catch (err) {
        ws.send(
          JSON.stringify({ type: "error", content: "Something went wrong" }),
        );
      }
    });
  });

  return wss;
}

function buildRepoContext(analysis: any): string {
  const summary = analysis.summary ?? "";
  const techStack = JSON.stringify(analysis.techStack ?? []);
  const fileTree = JSON.stringify(analysis.fileTree ?? {}, null, 2).slice(
    0,
    5000,
  );

  return `You are an AI assistant that answers questions about a codebase.

  ## Repository: ${analysis.repoName}

  ## Summary
  ${summary}

  ## Tech Stack
  ${techStack}

  ## File Structure (partial)
  ${fileTree}

  You have full knowledge of this repository. Answer questions accurately and specifically.`;
}
