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
  const { repoUrl, githubToken, userEmail } = req.body as {
    repoUrl?: string;
    githubToken?: string;
    userEmail?: string;
  };

  if (!repoUrl || !repoUrl.includes("github.com")) {
    res.status(400).json({ error: "Valid GitHub URL required" });
    return;
  }

  let userId: string | undefined;
  if (userEmail) {
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: { email: userEmail },
      select: { id: true },
    });
    userId = user.id;
  }

  const analysis = await prisma.analysis.create({
    data: {
      repoUrl,
      repoName: repoUrl.split("/").pop()?.replace(".git", "") ?? "repo",
      status: "pending",
      userId,
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

  const userEmail = req.body.userEmail as string | undefined;
  let userId: string | undefined;
  if (userEmail) {
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: { email: userEmail },
      select: { id: true },
    });
    userId = user.id;
  }

  const analysis = await prisma.analysis.create({
    data: {
      repoName: req.file.originalname.replace(/\.zip$/i, ""),
      status: "pending",
      userId,
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
