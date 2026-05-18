import { Router } from "express";
import { analysisQueue } from "../workers/analysisWorker";
import { prisma } from "../db/prisma";

const router = Router();

router.get("/:jobId", async (req, res) => {
  const job = await analysisQueue.getJob(req.params.jobId!);

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const state = await job.getState();
  const progress = job.progress;

  // if completed, return analysisId from job data
  if (state === "completed") {
    const analysis = await prisma.analysis.findFirst({
      where: { id: job.data.analysisId },
      select: { id: true, status: true },
    });
    res.json({ jobId: job.id, state, progress, analysisId: analysis?.id });
    return;
  }

  if (state === "failed") {
    res.json({ jobId: job.id, state, progress, error: job.failedReason });
    return;
  }

  res.json({ jobId: job.id, state, progress });
});

export default router;
