import { generateText, isGeminiQuotaError } from "./geminiClient.js";
import type { ParsedFile } from "./fileParser.js";
import type { CallGraph, GraphNode } from "./graphBuilder.js";

/**
 * Generate AI descriptions for application flow graph nodes.
 * Each node is a file/module — descriptions explain what the module does
 * and its role in the overall application flow.
 */
export async function generateCallGraphDescriptions(
  callGraph: CallGraph,
  files: ParsedFile[],
): Promise<Map<string, string>> {
  if (callGraph.nodes.length === 0) return new Map();

  // Build file content map for quick lookup
  const fileContentMap = new Map<string, ParsedFile>();
  for (const file of files) {
    fileContentMap.set(file.path, file);
  }

  // Build incoming/outgoing context per node
  const incomingLabels = new Map<string, string[]>();
  const outgoingLabels = new Map<string, string[]>();
  for (const edge of callGraph.edges) {
    const fromNode = callGraph.nodes.find((n) => n.id === edge.from);
    const toNode = callGraph.nodes.find((n) => n.id === edge.to);
    if (fromNode) {
      outgoingLabels.set(edge.from, [
        ...(outgoingLabels.get(edge.from) ?? []),
        toNode?.label ?? edge.to,
      ]);
    }
    if (toNode) {
      incomingLabels.set(edge.to, [
        ...(incomingLabels.get(edge.to) ?? []),
        fromNode?.label ?? edge.from,
      ]);
    }
  }

  // Batch nodes (max 15 per batch — each node has more context now)
  const BATCH_SIZE = 15;
  const descriptions = new Map<string, string>();
  const nodesToDescribe = callGraph.nodes.slice(0, 40);

  for (let i = 0; i < nodesToDescribe.length; i += BATCH_SIZE) {
    const batch = nodesToDescribe.slice(i, i + BATCH_SIZE);
    let batchDescriptions: Map<string, string>;
    try {
      batchDescriptions = await generateBatchModuleDescriptions(
        batch,
        fileContentMap,
        incomingLabels,
        outgoingLabels,
      );
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        console.warn(
          "[CallGraphDescriptions] Gemini quota reached, skipping remaining call graph description batches.",
        );
        break;
      }
      throw err;
    }

    for (const [id, desc] of batchDescriptions) {
      descriptions.set(id, desc);
    }
  }

  return descriptions;
}

async function generateBatchModuleDescriptions(
  nodes: GraphNode[],
  fileContentMap: Map<string, ParsedFile>,
  incomingLabels: Map<string, string[]>,
  outgoingLabels: Map<string, string[]>,
): Promise<Map<string, string>> {
  const moduleSummaries = nodes.map((node) => {
    const file = fileContentMap.get(node.id);
    const snippet = file?.content?.slice(0, 1200) ?? "";

    const incoming = incomingLabels.get(node.id) ?? [];
    const outgoing = outgoingLabels.get(node.id) ?? [];

    return [
      `### ${node.id}`,
      `Module: ${node.label}`,
      `Role: ${node.role ?? "module"}`,
      file?.language ? `Language: ${file.language}` : "",
      file?.functions?.length
        ? `Functions: ${file.functions.slice(0, 8).join(", ")}`
        : "",
      file?.exports?.length
        ? `Exports: ${file.exports.slice(0, 8).join(", ")}`
        : "",
      incoming.length > 0
        ? `Used by: ${[...new Set(incoming)].join(", ")}`
        : "Entry point (nothing imports this)",
      outgoing.length > 0
        ? `Depends on: ${[...new Set(outgoing)].join(", ")}`
        : "Leaf module (no local dependencies)",
      snippet ? `Code preview:\n\`\`\`\n${snippet}\n\`\`\`` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  const prompt = `You are a senior software engineer analyzing modules from a codebase to describe the application's flow.

For EACH module below, write a concise 1-2 sentence description of:
1. What this module/file does in the application
2. Its role in the overall application flow (e.g., "Entry point that bootstraps the Express server and mounts route handlers", "Service layer that orchestrates repository analysis by calling file parser, graph builder, and AI summary generator")

Be SPECIFIC about actual functionality. Mention:
- What HTTP routes it defines (if a route file)
- What business logic it implements (if a service)
- What data it manages (if a data/model file)
- What UI it renders (if a component/page)
- What background work it performs (if a worker)

DO NOT write generic descriptions like "utility module" or "service file".

Respond with ONLY a valid JSON object mapping module paths to descriptions:
{
  "src/app.ts": "Entry point that creates the Express application, registers middleware (CORS, JSON parsing), and mounts the /api/analyze, /api/status, and /api/results route handlers.",
  "src/services/fileParser.ts": "Recursively walks the repository directory tree, reads source files, and extracts functions, imports, exports, and classes using language-specific regex patterns."
}

Modules to analyze:

${moduleSummaries.join("\n\n---\n\n")}`;

  try {
    const raw = await generateText(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(
        "[CallGraphDescriptions] Could not extract JSON from response",
      );
      return new Map();
    }
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
    return new Map(Object.entries(parsed));
  } catch (err) {
    if (isGeminiQuotaError(err)) {
      throw err;
    }
    console.warn(
      "[CallGraphDescriptions] Failed to generate descriptions:",
      err,
    );
    return new Map();
  }
}
