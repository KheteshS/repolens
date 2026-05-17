import type {
  DependencyGraph,
  CallGraph,
  ArchitectureLayer,
} from "./graphBuilder.js";

export interface MermaidDiagrams {
  dependency: string;
  callGraph: string;
  architecture: string;
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

function generateDependencyDiagram(graph: DependencyGraph): string {
  if (graph.nodes.length === 0) return "graph LR\n  A[No files found]";

  // limit to top 30 nodes for readability
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

  // connect layers top-down in order
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
