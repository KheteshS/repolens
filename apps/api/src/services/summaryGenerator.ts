import type { ParsedFile } from "./fileParser.js";
import type { ArchitectureLayer } from "./graphBuilder.js";
import { generateText } from "./geminiClient.js";
import type { FileNode } from "@repo/shared";

export interface RepoSummary {
  summary: string;
  techStack: string[];
  entryPoints: string[];
  architectureStyle: string;
}

export async function generateSummary(
  repoName: string,
  files: ParsedFile[],
  fileTree: FileNode,
  layers: ArchitectureLayer[],
): Promise<RepoSummary> {
  const fileList = files
    .slice(0, 100) // top 100 files for context
    .map(
      (f) =>
        `${f.path} (${f.language}) — imports: ${f.imports.slice(0, 5).join(", ")}`,
    )
    .join("\n");

  const layerSummary = layers
    .map((l) => `${l.name}: ${l.files.slice(0, 5).join(", ")}`)
    .join("\n");

  const keyFiles = files
    .slice(0, 10)
    .map((f) => `### ${f.path}\n${f.content.slice(0, 2000)}`)
    .join("\n\n");

  const prompt = `
  You are a senior software engineer analyzing a codebase called "${repoName}".

  ## File Structure (${files.length} files total)
  ${fileList}

  ## Architecture Layers
  ${layerSummary}

  ## Key File Contents
  ${keyFiles}

  Respond ONLY with a valid JSON object (no markdown, no code blocks):
  {
    "summary": "2-3 sentence description of what this project does, its purpose, and how it works",
    "techStack": ["list", "of", "detected", "technologies", "frameworks", "libraries"],
    "entryPoints": ["list", "of", "main", "entry", "point", "files"],
    "architectureStyle": "one of: MVC, Layered, Microservices, Monolith, Component-Based, Event-Driven, Unknown"
  }
  `;

  const raw = await generateText(prompt);

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as RepoSummary;
  } catch {
    return {
      summary: raw.slice(0, 500),
      techStack: detectTechStack(files),
      entryPoints: [],
      architectureStyle: "Unknown",
    };
  }
}

function detectTechStack(files: ParsedFile[]): string[] {
  const stack = new Set<string>();
  const allImports = files.flatMap((f) => f.imports);

  const checks: [string, string][] = [
    ["react", "React"],
    ["next", "Next.js"],
    ["express", "Express"],
    ["fastify", "Fastify"],
    ["prisma", "Prisma"],
    ["typeorm", "TypeORM"],
    ["mongoose", "MongoDB"],
    ["pg", "PostgreSQL"],
    ["redis", "Redis"],
    ["bullmq", "BullMQ"],
    ["tailwindcss", "Tailwind CSS"],
    ["@supabase", "Supabase"],
    ["axios", "Axios"],
    ["zod", "Zod"],
    ["trpc", "tRPC"],
  ];

  for (const [pkg, label] of checks) {
    if (allImports.some((i) => i.includes(pkg))) stack.add(label);
  }

  const langs = new Set(files.map((f) => f.language));
  if (langs.has("typescript")) stack.add("TypeScript");
  if (langs.has("python")) stack.add("Python");
  if (langs.has("go")) stack.add("Go");
  if (langs.has("rust")) stack.add("Rust");

  return [...stack];
}
