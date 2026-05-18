import { Router } from "express";
import multer from "multer";
import { prisma } from "../db/prisma";
import { analysisQueue } from "../workers/analysisWorker";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// POST /api/analyze - submit GitHub URL
router.post("/url", async (req, res) => {
  const { repoUrl, githubToken } = req.body as {
    repoUrl?: string;
    githubToken?: string;
  };

  if (!repoUrl || !repoUrl.includes("github.com")) {
    res.status(400).json({ error: "Valid GitHub URL required" });
    return;
  }

  const analysis = await prisma.analysis.create({
    data: {
      repoUrl,
      repoName: repoUrl.split("/").pop()?.replace(".git", "") ?? "repo",
      status: "pending",
    },
  });

  const job = await analysisQueue.add("analyze", {
    analysisId: analysis.id,
    repoUrl,
    githubToken,
  });

  res.json({ jobId: job.id, analysisId: analysis.id });
});

// POST /api/analyze/zip — submit ZIP file
router.post("/zip", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "ZIP file required" });
    return;
  }

  const analysis = await prisma.analysis.create({
    data: {
      repoName: req.file.originalname.replace(/\.zip$/i, ""),
      status: "pending",
    },
  });

  const job = await analysisQueue.add("analyze", {
    analysisId: analysis.id,
    zipBuffer: req.file.buffer,
    zipName: req.file.originalname,
  });

  res.json({ jobId: job.id, analysisId: analysis.id });
});

export default router;
