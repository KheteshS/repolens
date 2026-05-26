import fs from "node:fs";
import path from "node:path";
import type { FileNode } from "@repo/shared";

const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".java",
  ".rs",
  ".c",
  ".cpp",
  ".h",
]);

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "__pycache__",
  ".turbo",
  "coverage",
  ".cache",
]);

const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".go": "go",
  ".java": "java",
  ".rs": "rust",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
};

export interface ParsedFile {
  path: string;
  language: string;
  imports: string[];
  exports: string[];
  functions: string[];
  classes: string[];
  content: string;
}

export function buildFileTree(rootPath: string): FileNode {
  return buildNode(rootPath, rootPath);
}

function buildNode(nodePath: string, rootPath: string): FileNode {
  const stat = fs.statSync(nodePath);
  const name = path.basename(nodePath);
  const relativePath = path.relative(rootPath, nodePath);

  if (stat.isDirectory()) {
    const children = fs
      .readdirSync(nodePath)
      .filter((child) => !IGNORE_DIRS.has(child))
      .map((child) => buildNode(path.join(nodePath, child), rootPath))
      .filter(Boolean);

    return { name, path: relativePath || ".", type: "directory", children };
  }

  const ext = path.extname(name);
  return {
    name,
    path: relativePath,
    type: "file",
    language: LANGUAGE_MAP[ext],
  };
}

export function parseFiles(repoPath: string): ParsedFile[] {
  const results: ParsedFile[] = [];
  walkDir(repoPath, repoPath, results);
  return results;
}

function walkDir(dirPath: string, rootPath: string, results: ParsedFile[]) {
  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry)) continue;

    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walkDir(fullPath, rootPath, results);
    } else {
      const ext = path.extname(entry);
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

      // Skip large files
      if (stat.size > 500_000) continue;

      const content = fs.readFileSync(fullPath, "utf-8");
      const relativePath = path.relative(rootPath, fullPath);
      const language = LANGUAGE_MAP[ext] ?? "unknown";

      results.push({
        path: relativePath,
        language,
        imports: extractImports(content, ext),
        exports: extractExports(content, ext),
        functions: extractFunctions(content, ext),
        classes: extractClasses(content, ext),
        content: content.slice(0, 10_000), // cap at 10KB per file for Gemini
      });
    }
  }
}

function extractImports(content: string, ext: string): string[] {
  const imports: string[] = [];

  if ([".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(ext)) {
    const esImports = content.matchAll(/^import\s+.*?from\s+['"](.+?)['"]/gm);
    const cjsImports = content.matchAll(/require\(['"](.+?)['"]\)/g);
    for (const m of esImports) if (m[1]) imports.push(m[1]);
    for (const m of cjsImports) if (m[1]) imports.push(m[1]);
  } else if (ext === ".py") {
    const pyImports = content.matchAll(/^(?:import|from)\s+([\w.]+)/gm);
    for (const m of pyImports) if (m[1]) imports.push(m[1]);
  } else if (ext === ".go") {
    const goImports = content.matchAll(/["']([\w./]+)["']/g);
    for (const m of goImports) if (m[1]) imports.push(m[1]);
  }

  return [...new Set(imports)];
}

function extractExports(content: string, ext: string): string[] {
  const exports: string[] = [];

  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
    const namedExports = content.matchAll(
      /^export\s+(?:const|function|class|type|interface|enum)\s+(\w+)/gm,
    );
    const defaultExport = content.match(
      /^export\s+default\s+(?:function\s+)?(\w+)/m,
    );
    for (const m of namedExports) if (m[1]) exports.push(m[1]);
    if (defaultExport?.[1]) exports.push(`default:${defaultExport[1]}`);
  }

  return exports;
}

function extractFunctions(content: string, ext: string): string[] {
  const fns: string[] = [];

  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
    const matches = content.matchAll(
      /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\()/gm,
    );
    for (const m of matches) {
      const name = m[1] ?? m[2];
      if (name) fns.push(name);
    }
  } else if (ext === ".py") {
    const matches = content.matchAll(/^def\s+(\w+)/gm);
    for (const m of matches) if (m[1]) fns.push(m[1]);
  } else if (ext === ".go") {
    const matches = content.matchAll(/^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/gm);
    for (const m of matches) if (m[1]) fns.push(m[1]);
  }

  return [...new Set(fns)].slice(0, 50);
}

function extractClasses(content: string, ext: string): string[] {
  const classes: string[] = [];

  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
    const matches = content.matchAll(/^(?:export\s+)?class\s+(\w+)/gm);
    for (const m of matches) if (m[1]) classes.push(m[1]);
  } else if (ext === ".py") {
    const matches = content.matchAll(/^class\s+(\w+)/gm);
    for (const m of matches) if (m[1]) classes.push(m[1]);
  } else if (ext === ".java") {
    const matches = content.matchAll(/^(?:public\s+)?class\s+(\w+)/gm);
    for (const m of matches) if (m[1]) classes.push(m[1]);
  }

  return classes;
}
