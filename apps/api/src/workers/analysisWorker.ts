import { Worker, Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "../db/prisma.js";
import { ingestFromUrl, ingestFromZip } from "../services/repoIngestion.js";
import { buildFileTree, parseFiles } from "../services/fileParser.js";
import { buildGraphs } from "../services/graphBuilder.js";
import { generateSummary } from "../services/summaryGenerator.js";
import { generateAllDiagrams } from "../services/diagramGenerator.js";

export const ANALYSIS_QUEUE = "analysis";

export const redis = new IORedis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

export const analysisQueue = new Queue(ANALYSIS_QUEUE, { connection: redis });

export interface AnalysisJobData {
  analysisId: string;
  repoUrl?: string;
  zipBuffer?: Buffer;
  zipName?: string;
  githubToken?: string;
}

export function startWorker() {
  const worker = new Worker<AnalysisJobData>(
    ANALYSIS_QUEUE,
    async (job) => {
      const { analysisId, repoUrl, zipBuffer, zipName, githubToken } = job.data;

      await prisma.analysis.update({
        where: { id: analysisId },
        data: { status: "processing" },
      });

      let ingested: Awaited<ReturnType<typeof ingestFromUrl>> | null = null;

      try {
        // Step 1: Ingest repo
        await job.updateProgress(10);
        if (repoUrl) {
          ingested = await ingestFromUrl(repoUrl, githubToken);
        } else if (zipBuffer && zipName) {
          ingested = await ingestFromZip(Buffer.from(zipBuffer), zipName);
        } else {
          throw new Error("No repo URL or ZIP provided");
        }

        // Step 2: Parse files
        await job.updateProgress(25);
        const files = parseFiles(ingested.repoPath);
        const fileTree = buildFileTree(ingested.repoPath);

        // Step 3: Build graphs
        await job.updateProgress(45);
        const graphs = buildGraphs(files);

        // Step 4: Generate summary via Gemini
        await job.updateProgress(60);
        const summary = await generateSummary(
          ingested.repoName,
          files,
          fileTree,
          graphs.architecture,
        );

        // Step 5: Generate diagrams (Mermaid + ReactFlow)
        await job.updateProgress(80);
        const diagrams = generateAllDiagrams(
          graphs.dependency,
          graphs.callGraph,
          graphs.architecture,
        );

        // Step 6: Save to DB
        await job.updateProgress(95);
        await prisma.analysis.update({
          where: { id: analysisId },
          data: {
            status: "completed",
            summary: summary.summary,
            techStack: summary.techStack,
            fileTree: fileTree as object,
            diagrams: diagrams as object,
          },
        });

        await job.updateProgress(100);
      } catch (err) {
        await prisma.analysis.update({
          where: { id: analysisId },
          data: {
            status: "failed",
            errorMessage: String(err),
          },
        });
        throw err;
      } finally {
        ingested?.cleanup();
      }
    },
    {
      connection: redis,
      concurrency: 2,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  return worker;
}
