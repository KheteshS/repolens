import { Router } from "express";
import { prisma } from "../db/prisma";

const router = Router();

router.get("/:id", async (req, res) => {
  const analysis = await prisma.analysis.findUnique({
    where: { id: req.params.id },
  });

  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  if (analysis.status !== "completed") {
    res.json({ status: analysis.status, errorMessage: analysis.errorMessage });
    return;
  }

  res.json(analysis);
});

export default router;
