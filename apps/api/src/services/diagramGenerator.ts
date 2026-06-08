import type {
  DependencyGraph,
  CallGraph,
  ArchitectureLayer,
} from "./graphBuilder.js";
import type { ParsedFile } from "./fileParser.js";
import dagre from "@dagrejs/dagre";

export interface MermaidDiagrams {
  dependency: string;
  callGraph: string;
  architecture: string;
}

export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    language?: string;
    layer?: string;
    fileCount?: number;
    files?: string[];
    filePath?: string;
    callers?: string[];
    callees?: string[];
    description?: string;
    role?: string;
    functions?: string[];
    exports?: string[];
  };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface ReactFlowGraph {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

export interface AllDiagrams {
  mermaid: MermaidDiagrams;
  reactflow: {
    dependency: ReactFlowGraph;
    callGraph: ReactFlowGraph;
    architecture: ReactFlowGraph;
  };
}

export function generateAllDiagrams(
  dependency: DependencyGraph,
  callGraph: CallGraph,
  layers: ArchitectureLayer[],
  callGraphDescriptions?: Map<string, string>,
  files?: ParsedFile[],
): AllDiagrams {
  return {
    mermaid: generateDiagrams(dependency, callGraph, layers),
    reactflow: {
      dependency: generateReactFlowDependency(dependency),
      callGraph: generateReactFlowCallGraph(
        callGraph,
        callGraphDescriptions,
        files,
      ),
      architecture: generateReactFlowArchitecture(layers, dependency),
    },
  };
}

export function generateDiagrams(
  dependency: DependencyGraph,
  callGraph: CallGraph,
  layers: ArchitectureLayer[],
): MermaidDiagrams {
  return {
    dependency: generateDependencyDiagram(dependency),
    callGraph: generateCallGraphDiagram(callGraph),
    architecture: generateArchitectureDiagram(layers),
  };
}

// --- ReactFlow generators ---

function layoutGraph(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  direction: "TB" | "LR" = "TB",
): ReactFlowNode[] {
  if (nodes.length === 0) return nodes;

  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  const connectedNodes = nodes.filter((n) => connectedIds.has(n.id));
  const disconnectedNodes = nodes.filter((n) => !connectedIds.has(n.id));

  if (connectedNodes.length > 0) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 });

    for (const node of connectedNodes) {
      g.setNode(node.id, { width: 180, height: 50 });
    }
    for (const edge of edges) {
      if (connectedIds.has(edge.source) && connectedIds.has(edge.target)) {
        g.setEdge(edge.source, edge.target);
      }
    }

    dagre.layout(g);

    for (const node of connectedNodes) {
      const pos = g.node(node.id);
      node.position = { x: pos.x - 90, y: pos.y - 25 };
    }
  }

  if (disconnectedNodes.length > 0) {
    const cols = Math.ceil(Math.sqrt(disconnectedNodes.length));
    let maxY = 0;
    for (const node of connectedNodes) {
      if (node.position.y > maxY) maxY = node.position.y;
    }
    const startY = connectedNodes.length > 0 ? maxY + 150 : 0;

    for (let i = 0; i < disconnectedNodes.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      disconnectedNodes[i]!.position = { x: col * 220, y: startY + row * 80 };
    }
  }

  return [...connectedNodes, ...disconnectedNodes];
}

function generateReactFlowDependency(graph: DependencyGraph): ReactFlowGraph {
  const topNodes = graph.nodes.slice(0, 80);
  const nodeIds = new Set(topNodes.map((n) => n.id));

  let nodes: ReactFlowNode[] = topNodes.map((n) => ({
    id: n.id,
    type: "graphNode",
    position: { x: 0, y: 0 },
    data: { label: n.label, language: n.language },
  }));

  const seenEdges = new Set<string>();
  const edges: ReactFlowEdge[] = [];

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
    const key = `${edge.from}->${edge.to}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    edges.push({
      id: key,
      source: edge.from,
      target: edge.to,
      label: "imports",
    });
  }

  nodes = layoutGraph(nodes, edges, "LR");
  return { nodes, edges };
}

function generateReactFlowCallGraph(
  graph: CallGraph,
  descriptions?: Map<string, string>,
  files?: ParsedFile[],
): ReactFlowGraph {
  const fileMap = new Map(files?.map((f) => [f.path, f]) ?? []);

  // Role-based ordering for top-down flow layout
  const ROLE_ORDER: Record<string, number> = {
    entry: 0,
    config: 1,
    middleware: 2,
    page: 3,
    route: 4,
    controller: 5,
    hook: 6,
    component: 7,
    api: 8,
    service: 9,
    worker: 10,
    utility: 11,
    data: 12,
    module: 13,
  };

  // Sort nodes by role so entry points come first
  const sortedNodes = [...graph.nodes].sort((a, b) => {
    const aOrder = ROLE_ORDER[a.role ?? "module"] ?? 99;
    const bOrder = ROLE_ORDER[b.role ?? "module"] ?? 99;
    return aOrder - bOrder;
  });

  const topNodes = sortedNodes.slice(0, 60);
  const nodeIds = new Set(topNodes.map((n) => n.id));

  const seenEdges = new Set<string>();
  const edges: ReactFlowEdge[] = [];

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
    if (edge.from === edge.to) continue;
    const key = `${edge.from}->${edge.to}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    edges.push({
      id: key,
      source: edge.from,
      target: edge.to,
      label: edge.label ?? "uses",
    });
  }

  // Build incoming/outgoing maps for enriching nodes
  const incomingMap = new Map<string, string[]>();
  const outgoingMap = new Map<string, string[]>();
  for (const edge of edges) {
    const sourceLabel =
      topNodes.find((n) => n.id === edge.source)?.label ?? edge.source;
    const targetLabel =
      topNodes.find((n) => n.id === edge.target)?.label ?? edge.target;
    outgoingMap.set(edge.source, [
      ...(outgoingMap.get(edge.source) ?? []),
      targetLabel,
    ]);
    incomingMap.set(edge.target, [
      ...(incomingMap.get(edge.target) ?? []),
      sourceLabel,
    ]);
  }

  // Include connected nodes + all entry/route/service nodes even if disconnected
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  const importantRoles = new Set([
    "entry",
    "route",
    "service",
    "worker",
    "page",
    "controller",
  ]);
  const nodesToShow = topNodes.filter(
    (n) => connectedIds.has(n.id) || importantRoles.has(n.role ?? ""),
  );

  let nodes: ReactFlowNode[] = nodesToShow.map((n) => {
    const file = fileMap.get(n.id);
    return {
      id: n.id,
      type: "graphNode",
      position: { x: 0, y: 0 },
      data: {
        label: n.label,
        language: n.language,
        filePath: n.filePath ?? n.id,
        role: n.role,
        callers: incomingMap.get(n.id) ?? [],
        callees: outgoingMap.get(n.id) ?? [],
        functions: file?.functions?.slice(0, 10),
        exports: file?.exports?.slice(0, 10),
        description: descriptions?.get(n.id),
      },
    };
  });

  nodes = layoutGraph(nodes, edges, "TB");
  return { nodes, edges };
}

/** Descriptions for architecture layers */
const LAYER_DESCRIPTIONS: Record<string, string> = {
  entry_points: "Application entry points and bootstrapping",
  routing: "URL routing and navigation definitions",
  controllers: "Request handlers, controllers, and resolvers",
  middleware: "Middleware, interceptors, guards, and filters",
  pipes: "Data transformation pipes",
  directives: "Template directives and DOM manipulation",
  pages: "Page-level views and screens",
  components: "Reusable UI components, widgets, and templates",
  services: "Business logic, providers, and use cases",
  state: "State management: stores, reducers, actions, and selectors",
  hooks: "Hooks, composables, and reusable logic",
  models: "Data models, entities, DTOs, types, and interfaces",
  data_access: "Database access, repositories, and migrations",
  modules: "Feature modules and module definitions",
  api: "API layer, gateways, and GraphQL",
  workers: "Background workers, jobs, and queues",
  decorators: "Custom decorators and annotations",
  utilities: "Shared utilities, helpers, and library code",
  config: "Configuration and environment settings",
  styles: "Stylesheets and CSS modules",
  assets: "Static assets, images, and fonts",
  other: "Other project files",
};

/** Role colors matching the frontend GraphNode ROLE_COLORS */
const LAYER_ROLE_MAP: Record<string, string> = {
  entry_points: "entry",
  routing: "route",
  controllers: "controller",
  middleware: "middleware",
  pipes: "middleware",
  directives: "component",
  pages: "page",
  components: "component",
  services: "service",
  state: "service",
  hooks: "hook",
  models: "data",
  data_access: "data",
  modules: "module",
  api: "api",
  workers: "worker",
  decorators: "utility",
  utilities: "utility",
  config: "config",
  styles: "module",
  assets: "module",
  other: "module",
};

function generateReactFlowArchitecture(
  layers: ArchitectureLayer[],
  dependency?: DependencyGraph,
): ReactFlowGraph {
  const nodes: ReactFlowNode[] = [];
  const edges: ReactFlowEdge[] = [];

  // Build a map: filePath → layer name (for cross-layer edge detection)
  const fileToLayer = new Map<string, string>();
  for (const layer of layers) {
    for (const file of layer.files) {
      fileToLayer.set(file, layer.name);
    }
  }

  for (const layer of layers) {
    const sampleFiles = layer.files.slice(0, 8).map((f) => {
      const name = f.split("/").pop() ?? f;
      return name.replace(/\.(ts|tsx|js|jsx|py|go|java|rs|vue|svelte)$/, "");
    });

    nodes.push({
      id: `layer-${layer.name}`,
      type: "graphNode",
      position: { x: 0, y: 0 },
      data: {
        label: `${layer.name.replace(/_/g, " ")} (${layer.files.length})`,
        layer: layer.name,
        fileCount: layer.files.length,
        files: layer.files.slice(0, 15),
        role: LAYER_ROLE_MAP[layer.name] ?? "module",
        description:
          LAYER_DESCRIPTIONS[layer.name] ??
          `${layer.files.length} files in this layer`,
        exports: sampleFiles,
      },
    });
  }

  // Compute cross-layer edges from actual dependency graph
  if (dependency && dependency.edges.length > 0) {
    const layerEdgeCounts = new Map<string, number>();

    for (const edge of dependency.edges) {
      const fromLayer = fileToLayer.get(edge.from);
      const toLayer = fileToLayer.get(edge.to);
      if (!fromLayer || !toLayer || fromLayer === toLayer) continue;

      const key = `layer-${fromLayer}->layer-${toLayer}`;
      layerEdgeCounts.set(key, (layerEdgeCounts.get(key) ?? 0) + 1);
    }

    for (const [key, count] of layerEdgeCounts) {
      const [source, target] = key.split("->");
      edges.push({
        id: key,
        source: source!,
        target: target!,
        label: `${count} import${count > 1 ? "s" : ""}`,
      });
    }
  }

  // Fallback: if no dependency-based edges, connect by canonical order
  if (edges.length === 0) {
    for (let i = 0; i < layers.length - 1; i++) {
      edges.push({
        id: `layer-${layers[i]!.name}->layer-${layers[i + 1]!.name}`,
        source: `layer-${layers[i]!.name}`,
        target: `layer-${layers[i + 1]!.name}`,
      });
    }
  }

  const laidOut = layoutGraph(nodes, edges, "TB");
  return { nodes: laidOut, edges };
}

// --- Mermaid generators ---

function generateDependencyDiagram(graph: DependencyGraph): string {
  if (graph.nodes.length === 0) return "graph LR\n  A[No files found]";

  const topNodes = graph.nodes.slice(0, 30);
  const nodeIds = new Set(topNodes.map((n) => n.id));

  const lines: string[] = ["graph LR"];

  for (const node of topNodes) {
    const safeId = sanitizeId(node.id);
    const label = node.label.replace(/"/g, "'");
    lines.push(`  ${safeId}["${label}"]`);
  }

  const seenEdges = new Set<string>();
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
    const key = `${edge.from}->${edge.to}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    lines.push(`  ${sanitizeId(edge.from)} --> ${sanitizeId(edge.to)}`);
  }

  return lines.join("\n");
}

function generateCallGraphDiagram(graph: CallGraph): string {
  if (graph.nodes.length === 0) return "graph TD\n  A[No modules found]";

  // Group nodes by role for subgraphs
  const roleGroups = new Map<string, typeof graph.nodes>();
  for (const node of graph.nodes.slice(0, 30)) {
    const role = node.role ?? "module";
    const list = roleGroups.get(role) ?? [];
    list.push(node);
    roleGroups.set(role, list);
  }

  const nodeIds = new Set(graph.nodes.slice(0, 30).map((n) => n.id));
  const lines: string[] = ["graph TB"];

  // Create subgraphs per role
  for (const [role, nodes] of roleGroups) {
    if (nodes.length === 0) continue;
    const safeRole = sanitizeId(role);
    lines.push(`  subgraph ${safeRole}["${role.toUpperCase()}"]`);
    for (const node of nodes) {
      const safeId = sanitizeId(node.id);
      const label = node.label.replace(/"/g, "'");
      lines.push(`    ${safeId}["${label}"]`);
    }
    lines.push(`  end`);
  }

  const seenEdges = new Set<string>();
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
    if (edge.from === edge.to) continue;
    const key = `${edge.from}->${edge.to}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    const label = edge.label ? `|${edge.label.replace(/"/g, "'")}|` : "";
    lines.push(`  ${sanitizeId(edge.from)} -->${label} ${sanitizeId(edge.to)}`);
  }

  return lines.join("\n");
}

function generateArchitectureDiagram(layers: ArchitectureLayer[]): string {
  if (layers.length === 0) return "flowchart TB\n  A[No architecture detected]";

  const lines: string[] = ["flowchart TB"];

  // Layer style classes
  const LAYER_STYLES: Record<string, string> = {
    entry_points: "fill:#fef2f2,stroke:#ef4444,color:#991b1b",
    routing: "fill:#fff7ed,stroke:#f97316,color:#9a3412",
    controllers: "fill:#fff7ed,stroke:#f97316,color:#9a3412",
    middleware: "fill:#fefce8,stroke:#eab308,color:#854d0e",
    pipes: "fill:#fefce8,stroke:#eab308,color:#854d0e",
    directives: "fill:#ecfeff,stroke:#06b6d4,color:#155e75",
    pages: "fill:#f0fdf4,stroke:#22c55e,color:#166534",
    components: "fill:#ecfeff,stroke:#06b6d4,color:#155e75",
    services: "fill:#faf5ff,stroke:#a855f7,color:#6b21a8",
    state: "fill:#faf5ff,stroke:#a855f7,color:#6b21a8",
    hooks: "fill:#fdf2f8,stroke:#ec4899,color:#9d174d",
    models: "fill:#eff6ff,stroke:#3b82f6,color:#1e40af",
    data_access: "fill:#eff6ff,stroke:#3b82f6,color:#1e40af",
    modules: "fill:#f8fafc,stroke:#64748b,color:#334155",
    api: "fill:#f0fdf4,stroke:#22c55e,color:#166534",
    workers: "fill:#fdf2f8,stroke:#ec4899,color:#9d174d",
    decorators: "fill:#f9fafb,stroke:#6b7280,color:#374151",
    utilities: "fill:#f9fafb,stroke:#6b7280,color:#374151",
    config: "fill:#fafaf9,stroke:#78716c,color:#44403c",
    styles: "fill:#f8fafc,stroke:#64748b,color:#334155",
    assets: "fill:#f8fafc,stroke:#64748b,color:#334155",
    other: "fill:#fafafa,stroke:#52525b,color:#27272a",
  };

  for (const layer of layers) {
    const safeLayer = sanitizeId(layer.name);
    const displayName = layer.name.replace(/_/g, " ");
    const fileList = layer.files
      .slice(0, 6)
      .map((f) => {
        const name = f.split("/").pop() ?? f;
        return name.replace(/\.(ts|tsx|js|jsx|py|go|java|rs|vue|svelte)$/, "");
      })
      .join(", ");
    const extra =
      layer.files.length > 6 ? ` +${layer.files.length - 6} more` : "";

    lines.push(
      `  subgraph ${safeLayer}["${displayName} (${layer.files.length})"]`,
    );
    lines.push(`    ${safeLayer}_files["${fileList}${extra}"]`);
    lines.push(`  end`);
  }

  // Connect layers by canonical architecture flow (skip non-adjacent if only 2)
  const FLOW_PAIRS: [string, string][] = [
    ["entry_points", "config"],
    ["entry_points", "routing"],
    ["entry_points", "modules"],
    ["routing", "controllers"],
    ["routing", "pages"],
    ["routing", "middleware"],
    ["middleware", "controllers"],
    ["controllers", "services"],
    ["pages", "components"],
    ["pages", "services"],
    ["components", "services"],
    ["components", "hooks"],
    ["components", "state"],
    ["hooks", "services"],
    ["hooks", "state"],
    ["services", "models"],
    ["services", "data_access"],
    ["services", "api"],
    ["services", "workers"],
    ["state", "services"],
    ["data_access", "models"],
    ["modules", "components"],
    ["modules", "services"],
    ["modules", "routing"],
    ["api", "services"],
    ["utilities", "models"],
  ];

  const layerNames = new Set(layers.map((l) => l.name));
  const addedEdges = new Set<string>();

  for (const [from, to] of FLOW_PAIRS) {
    if (layerNames.has(from) && layerNames.has(to)) {
      const key = `${from}->${to}`;
      if (!addedEdges.has(key)) {
        addedEdges.add(key);
        lines.push(`  ${sanitizeId(from)} --> ${sanitizeId(to)}`);
      }
    }
  }

  // If no canonical edges matched, fall back to linear
  if (addedEdges.size === 0) {
    for (let i = 0; i < layers.length - 1; i++) {
      lines.push(
        `  ${sanitizeId(layers[i]!.name)} --> ${sanitizeId(layers[i + 1]!.name)}`,
      );
    }
  }

  // Add style classes
  for (const layer of layers) {
    const style = LAYER_STYLES[layer.name];
    if (style) {
      lines.push(`  style ${sanitizeId(layer.name)} ${style}`);
    }
  }

  return lines.join("\n");
}

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, "_").replace(/^_+/, "n_");
}
