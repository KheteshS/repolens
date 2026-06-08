import type { ParsedFile } from "./fileParser.js";
import type { ArchitectureLayer } from "./graphBuilder.js";
import { generateText, isGeminiQuotaError } from "./geminiClient.js";
import type { FileNode } from "@repo/shared";

export interface RepoSummary {
  overview: string;
  architecture: string;
  techStack: string[];
  entryPoints: string[];
  keyModules: { name: string; purpose: string; files: string[] }[];
  dataFlow: string;
  externalDependencies: { name: string; version?: string; purpose: string }[];
  designPatterns: string[];
  observations: {
    security: string;
    performance: string;
    techDebt: string;
  };
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
    .slice(0, 20)
    .map((f) => `### ${f.path}\n${f.content.slice(0, 3000)}`)
    .join("\n\n");

  const prompt = `
You are a principal software architect performing a deep technical audit of the codebase "${repoName}".
Your analysis must be thorough, specific, and actionable — not generic. Reference actual file names, function names, and patterns you observe in the code.

## File Structure (${files.length} files total)
${fileList}

## Architecture Layers
${layerSummary}

## Key File Contents
${keyFiles}

Respond ONLY with a valid JSON object (no markdown, no code blocks, no trailing commas):
{
  "overview": "A detailed 6-10 sentence technical description covering: what the project does, who it is for, the core problem it solves, how the major subsystems interact, the request/response lifecycle, background processing, and any notable architectural decisions. Be specific — name actual files, routes, services, and patterns.",
  "architecture": "One of: MVC, Layered, Microservices, Monolith, Component-Based, Event-Driven, Serverless, Hexagonal, Unknown — followed by a colon and a 2-3 sentence justification referencing actual files and patterns observed",
  "techStack": ["Every detected runtime, language, framework, library, ORM, queue, database, auth provider, and build tool — include version hints where visible in imports"],
  "entryPoints": ["All application entry points: HTTP server bootstrap files, CLI entry files, worker process files, Next.js app root, etc."],
  "keyModules": [
    {
      "name": "Exact module or service name",
      "purpose": "2-4 sentences describing what this module does, its responsibilities, key functions/classes, and how it connects to other modules",
      "files": ["list of files belonging to this module"]
    }
  ],
  "dataFlow": "A detailed step-by-step markdown-formatted description of how data flows through the system. Use a numbered list with each step on its own line (use actual newline characters). Each step should follow this pattern: step number, bold title, then the description naming actual functions and files. Cover the full lifecycle from external trigger through persistence and response. Name the actual functions, files, services, and classes at each step.",
  "externalDependencies": [
    {
      "name": "package name",
      "version": "version if detectable",
      "purpose": "Specific reason this dependency is used in this codebase"
    }
  ],
  "designPatterns": ["List every design pattern observed: Repository, Factory, Singleton, Observer, Worker/Queue, Middleware chain, etc. — with a brief note on where each is used"],
  "observations": {
    "security": "Detailed analysis of security concerns: missing auth checks, unvalidated inputs, exposed secrets, insecure dependencies, CORS config, injection risks — name specific files and functions",
    "performance": "Detailed analysis of performance concerns: N+1 queries, missing indexes, unbounded loops, no caching, large bundle sizes, blocking operations — name specific files and functions",
    "techDebt": "Detailed analysis of tech debt: hardcoded values, missing error handling, duplicated logic, outdated patterns, missing tests, TODO comments, overly complex functions — name specific files and functions"
  }
}
`;

  let raw = "";
  try {
    raw = await generateText(prompt);
  } catch (err) {
    if (isGeminiQuotaError(err)) {
      console.warn(
        "[Summary] Gemini quota reached, returning deterministic fallback summary.",
      );
      return buildFallbackSummary(repoName, files, layers);
    }
    throw err;
  }

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as RepoSummary;
  } catch {
    return {
      overview: raw.slice(0, 500),
      architecture: "Unknown",
      techStack: detectTechStack(files),
      entryPoints: [],
      keyModules: [],
      dataFlow: "",
      externalDependencies: [],
      designPatterns: [],
      observations: { security: "", performance: "", techDebt: "" },
    };
  }
}

function buildFallbackSummary(
  repoName: string,
  files: ParsedFile[],
  layers: ArchitectureLayer[],
): RepoSummary {
  const entryPoints = files
    .filter(
      (f) =>
        /(^|\/)index\./i.test(f.path) ||
        /(^|\/)main\./i.test(f.path) ||
        /(^|\/)app\./i.test(f.path) ||
        /worker/i.test(f.path),
    )
    .slice(0, 10)
    .map((f) => f.path);

  const keyModules = layers
    .filter((layer) => layer.files.length > 0)
    .slice(0, 6)
    .map((layer) => ({
      name: layer.name,
      purpose: `Contains ${layer.files.length} file(s) grouped under the ${layer.name} architecture layer.`,
      files: layer.files.slice(0, 10),
    }));

  const architectureName = layers.length > 0 ? "Layered" : "Unknown";
  const architectureReason =
    layers.length > 0
      ? `Detected ${layers.length} architecture layers from static analysis.`
      : "Could not determine architecture layers from available files.";

  return {
    overview: `${repoName} was analyzed using static parsing because Gemini quota is currently exhausted. The report includes dependency graphing, architecture layer extraction, and file metadata, with AI narrative enrichment temporarily skipped.`,
    architecture: `${architectureName}: ${architectureReason}`,
    techStack: detectTechStack(files),
    entryPoints,
    keyModules,
    dataFlow:
      "1. **Repository ingestion**: Source files are ingested and parsed into metadata.\n2. **Static analysis**: Dependency, call, and architecture graphs are computed.\n3. **Persistence**: Analysis artifacts are stored and served to the UI.",
    externalDependencies: [],
    designPatterns: ["Worker/Queue", "Layered architecture"],
    observations: {
      security:
        "AI-based security observations were skipped because Gemini quota is exhausted.",
      performance:
        "AI-based performance observations were skipped because Gemini quota is exhausted.",
      techDebt:
        "AI-based tech debt observations were skipped because Gemini quota is exhausted.",
    },
  };
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
