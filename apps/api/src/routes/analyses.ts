import { Router } from "express";
import { prisma } from "../db/prisma";

const router = Router();

router.get("/", async (req, res) => {
  const email = req.query.email as string;

  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    res.json({ analyses: [] });
    return;
  }

  const analyses = await prisma.analysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      repoName: true,
      repoUrl: true,
      status: true,
      createdAt: true,
      techStack: true,
    },
  });

  res.json({ analyses });
});

export default router;
