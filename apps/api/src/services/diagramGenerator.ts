import type {
  DependencyGraph,
  CallGraph,
  ArchitectureLayer,
} from "./graphBuilder.js";
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
): AllDiagrams {
  return {
    mermaid: generateDiagrams(dependency, callGraph, layers),
    reactflow: {
      dependency: generateReactFlowDependency(dependency),
      callGraph: generateReactFlowCallGraph(callGraph),
      architecture: generateReactFlowArchitecture(layers),
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
    edges.push({ id: key, source: edge.from, target: edge.to, label: "imports" });
  }

  nodes = layoutGraph(nodes, edges, "LR");
  return { nodes, edges };
}

function generateReactFlowCallGraph(graph: CallGraph): ReactFlowGraph {
  const topNodes = graph.nodes.slice(0, 60);
  const nodeIds = new Set(topNodes.map((n) => n.id));

  let nodes: ReactFlowNode[] = topNodes.map((n) => ({
    id: n.id,
    type: "graphNode",
    position: { x: 0, y: 0 },
    data: { label: n.label },
  }));

  const seenEdges = new Set<string>();
  const edges: ReactFlowEdge[] = [];

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
    const key = `${edge.from}->${edge.to}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    edges.push({ id: key, source: edge.from, target: edge.to, label: "calls" });
  }

  nodes = layoutGraph(nodes, edges, "TB");
  return { nodes, edges };
}

function generateReactFlowArchitecture(layers: ArchitectureLayer[]): ReactFlowGraph {
  const nodes: ReactFlowNode[] = [];
  const edges: ReactFlowEdge[] = [];

  for (const layer of layers) {
    nodes.push({
      id: `layer-${layer.name}`,
      type: "graphNode",
      position: { x: 0, y: 0 },
      data: {
        label: `${layer.name} (${layer.files.length})`,
        layer: layer.name,
        fileCount: layer.files.length,
        files: layer.files.slice(0, 10),
      },
    });
  }

  for (let i = 0; i < layers.length - 1; i++) {
    edges.push({
      id: `layer-${layers[i]!.name}->layer-${layers[i + 1]!.name}`,
      source: `layer-${layers[i]!.name}`,
      target: `layer-${layers[i + 1]!.name}`,
    });
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
  if (graph.nodes.length === 0) return "graph TD\n  A[No functions found]";

  const topNodes = graph.nodes.slice(0, 25);
  const nodeIds = new Set(topNodes.map((n) => n.id));

  const lines: string[] = ["graph TD"];

  for (const node of topNodes) {
    const safeId = sanitizeId(node.id);
    lines.push(`  ${safeId}["${node.label}"]`);
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

function generateArchitectureDiagram(layers: ArchitectureLayer[]): string {
  if (layers.length === 0) return "flowchart TB\n  A[No architecture detected]";

  const lines: string[] = ["flowchart TB"];

  for (const layer of layers) {
    const safeLayer = sanitizeId(layer.name);
    const fileList = layer.files
      .slice(0, 4)
      .map((f) => f.split("/").pop())
      .join(", ");

    lines.push(`  subgraph ${safeLayer}["${layer.name}"]`);
    lines.push(`    ${safeLayer}_files["${fileList}"]`);
    lines.push(`  end`);
  }

  for (let i = 0; i < layers.length - 1; i++) {
    const from = sanitizeId(layers[i]!.name);
    const to = sanitizeId(layers[i + 1]!.name);
    lines.push(`  ${from} --> ${to}`);
  }

  return lines.join("\n");
}

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, "_").replace(/^_+/, "n_");
}
