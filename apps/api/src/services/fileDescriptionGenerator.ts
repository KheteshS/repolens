import { generateText, isGeminiQuotaError } from "./geminiClient.js";
import type { ParsedFile } from "./fileParser.js";
import type { FileNode } from "@repo/shared";

/**
 * Use Gemini to generate meaningful one-line descriptions for each file
 * based on its content, functions, classes, imports, and exports.
 * Files are batched to avoid exceeding token limits.
 */
export async function generateFileDescriptions(
  files: ParsedFile[],
): Promise<Map<string, string>> {
  const BATCH_SIZE = 40;
  const descriptions = new Map<string, string>();

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    let batchDescriptions: Map<string, string>;
    try {
      batchDescriptions = await generateBatchDescriptions(batch);
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        console.warn(
          "[FileDescriptions] Gemini quota reached, skipping remaining file description batches.",
        );
        break;
      }
      throw err;
    }

    for (const [path, desc] of batchDescriptions) {
      descriptions.set(path, desc);
    }
  }

  return descriptions;
}

async function generateBatchDescriptions(
  files: ParsedFile[],
): Promise<Map<string, string>> {
  const fileSummaries = files.map((f) => {
    const contentSnippet = f.content.slice(0, 1500);
    return [
      `### ${f.path}`,
      `Language: ${f.language}`,
      f.functions.length > 0 ? `Functions: ${f.functions.join(", ")}` : "",
      f.classes.length > 0 ? `Classes: ${f.classes.join(", ")}` : "",
      f.exports.length > 0 ? `Exports: ${f.exports.join(", ")}` : "",
      f.imports.length > 0
        ? `Imports: ${f.imports.slice(0, 15).join(", ")}`
        : "",
      `Content preview:\n\`\`\`\n${contentSnippet}\n\`\`\``,
    ]
      .filter(Boolean)
      .join("\n");
  });

  const prompt = `You are a senior software engineer analyzing source files from a codebase.

For EACH file below, write a concise but specific 1-2 sentence description of what the file does.
Be specific about the actual functionality — mention things like:
- What UI it renders (e.g., "login form with email/password authentication", "dashboard showing analytics charts")
- What business logic it handles (e.g., "processes payment transactions", "validates user registration data")
- What APIs it exposes or consumes
- What data it manages
- What component/service/module it implements

DO NOT write generic descriptions like "UI component" or "service file". Be specific about the actual purpose and functionality.

Respond with ONLY a valid JSON object mapping file paths to descriptions:
{
  "path/to/file.ts": "Implements the user login form with email/password fields, OAuth social login buttons, and form validation with error display.",
  "path/to/other.ts": "Express route handler that creates new user accounts, hashes passwords with bcrypt, and sends welcome emails."
}

Files to analyze:

${fileSummaries.join("\n\n---\n\n")}`;

  try {
    const raw = await generateText(prompt);
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[FileDescriptions] Could not extract JSON from response");
      return new Map();
    }
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
    return new Map(Object.entries(parsed));
  } catch (err) {
    if (isGeminiQuotaError(err)) {
      throw err;
    }
    console.warn("[FileDescriptions] Failed to generate descriptions:", err);
    return new Map();
  }
}

/**
 * Walk the file tree and attach AI-generated descriptions to file nodes.
 */
export function attachDescriptionsToTree(
  node: FileNode,
  descriptions: Map<string, string>,
): void {
  if (node.type === "file") {
    // Try exact match first, then suffix matching
    const desc =
      descriptions.get(node.path) ??
      [...descriptions.entries()].find(
        ([key]) => node.path.endsWith(key) || key.endsWith(node.path),
      )?.[1];
    if (desc) {
      node.description = desc;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      attachDescriptionsToTree(child, descriptions);
    }
  }
}
