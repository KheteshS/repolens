import type { ParsedFile } from "./fileParser.js";

export interface GraphNode {
  id: string;
  label: string;
  language?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CallGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ArchitectureLayer {
  name: string;
  files: string[];
}

export interface Graphs {
  dependency: DependencyGraph;
  callGraph: CallGraph;
  architecture: ArchitectureLayer[];
}

export function buildGraphs(files: ParsedFile[]): Graphs {
  return {
    dependency: buildDependencyGraph(files),
    callGraph: buildCallGraph(files),
    architecture: buildArchitectureLayers(files),
  };
}

function buildDependencyGraph(files: ParsedFile[]): DependencyGraph {
  const filePaths = new Set(files.map((f) => f.path));
  const nodes: GraphNode[] = files.map((f) => ({
    id: f.path,
    label: f.path.split("/").pop() ?? f.path,
    language: f.language,
  }));

  const edges: GraphEdge[] = [];

  for (const file of files) {
    for (const imp of file.imports) {
      // only include local imports (relative paths)
      if (!imp.startsWith(".")) continue;

      const resolved = resolveImport(file.path, imp);
      const target = filePaths.has(resolved)
        ? resolved
        : [...filePaths].find((p) => p.startsWith(resolved));

      if (target) {
        edges.push({ from: file.path, to: target });
      }
    }
  }

  return { nodes, edges };
}

function buildCallGraph(files: ParsedFile[]): CallGraph {
  const allFunctions = new Map<string, string>(); // fnName → filePath

  for (const file of files) {
    for (const fn of file.functions) {
      allFunctions.set(fn, file.path);
    }
  }

  const nodes: GraphNode[] = [...allFunctions.entries()].map(
    ([fn, filePath]) => ({
      id: `${filePath}::${fn}`,
      label: fn,
    }),
  );

  const edges: GraphEdge[] = [];

  for (const file of files) {
    for (const fn of file.functions) {
      // find other known functions called in this file's content
      for (const [callee, calleePath] of allFunctions.entries()) {
        if (callee === fn) continue;
        if (calleePath === file.path) continue;
        // simple heuristic: callee name appears in file content
        const regex = new RegExp(`\\b${callee}\\s*\\(`, "g");
        if (regex.test(file.content)) {
          edges.push({
            from: `${file.path}::${fn}`,
            to: `${calleePath}::${callee}`,
          });
        }
      }
    }
  }

  return { nodes, edges: edges.slice(0, 200) }; // cap edges for large repos
}

function buildArchitectureLayers(files: ParsedFile[]): ArchitectureLayer[] {
  const layers: Record<string, string[]> = {
    routes: [],
    controllers: [],
    services: [],
    models: [],
    utils: [],
    components: [],
    pages: [],
    hooks: [],
    config: [],
    tests: [],
    other: [],
  };

  for (const file of files) {
    const p = file.path.toLowerCase();

    if (p.includes("/routes/") || p.includes("/route"))
      layers.routes!.push(file.path);
    else if (p.includes("/controllers/") || p.includes("/controller"))
      layers.controllers!.push(file.path);
    else if (p.includes("/services/") || p.includes("/service"))
      layers.services!.push(file.path);
    else if (
      p.includes("/models/") ||
      p.includes("/model") ||
      p.includes("/schema")
    )
      layers.models!.push(file.path);
    else if (
      p.includes("/utils/") ||
      p.includes("/helpers/") ||
      p.includes("/lib/")
    )
      layers.utils!.push(file.path);
    else if (p.includes("/components/")) layers.components!.push(file.path);
    else if (p.includes("/pages/") || p.includes("/app/"))
      layers.pages!.push(file.path);
    else if (p.includes("/hooks/")) layers.hooks!.push(file.path);
    else if (p.includes("/config/") || p.includes(".config."))
      layers.config!.push(file.path);
    else if (
      p.includes(".test.") ||
      p.includes(".spec.") ||
      p.includes("/__tests__/")
    )
      layers.tests!.push(file.path);
    else layers.other!.push(file.path);
  }

  return Object.entries(layers)
    .filter(([, files]) => files.length > 0)
    .map(([name, files]) => ({ name, files }));
}

function resolveImport(fromPath: string, importPath: string): string {
  const dir = fromPath.split("/").slice(0, -1).join("/");
  const parts = [...dir.split("/"), ...importPath.split("/")];
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== ".") resolved.push(part);
  }

  return resolved.join("/");
}
