import { describe, it, expect } from "vitest";
import { generateAllDiagrams, generateDiagrams } from "../../src/services/diagramGenerator";
import {
  sampleDependencyGraph,
  sampleCallGraph,
  sampleArchitectureLayers,
  emptyDependencyGraph,
  emptyCallGraph,
} from "../fixtures/graphs";

describe("generateDiagrams (Mermaid)", () => {
  const diagrams = generateDiagrams(sampleDependencyGraph, sampleCallGraph, sampleArchitectureLayers);

  describe("dependency diagram", () => {
    it("starts with graph LR", () => {
      expect(diagrams.dependency.startsWith("graph LR")).toBe(true);
    });

    it("includes node labels", () => {
      expect(diagrams.dependency).toContain("index.ts");
      expect(diagrams.dependency).toContain("utils.ts");
    });

    it("includes edges with arrow syntax", () => {
      expect(diagrams.dependency).toContain("-->");
    });
  });

  describe("call graph diagram", () => {
    it("starts with graph TD", () => {
      expect(diagrams.callGraph.startsWith("graph TD")).toBe(true);
    });

    it("includes function labels", () => {
      expect(diagrams.callGraph).toContain("main");
      expect(diagrams.callGraph).toContain("helper");
    });
  });

  describe("architecture diagram", () => {
    it("starts with flowchart TB", () => {
      expect(diagrams.architecture.startsWith("flowchart TB")).toBe(true);
    });

    it("includes subgraph for each layer", () => {
      expect(diagrams.architecture).toContain("subgraph");
      expect(diagrams.architecture).toContain("routes");
      expect(diagrams.architecture).toContain("services");
    });
  });

  describe("empty graphs", () => {
    it("returns fallback for empty dependency graph", () => {
      const d = generateDiagrams(emptyDependencyGraph, emptyCallGraph, []);
      expect(d.dependency).toContain("No files found");
    });

    it("returns fallback for empty call graph", () => {
      const d = generateDiagrams(emptyDependencyGraph, emptyCallGraph, []);
      expect(d.callGraph).toContain("No functions found");
    });

    it("returns fallback for empty architecture", () => {
      const d = generateDiagrams(emptyDependencyGraph, emptyCallGraph, []);
      expect(d.architecture).toContain("No architecture detected");
    });
  });
});

describe("generateAllDiagrams (ReactFlow)", () => {
  const all = generateAllDiagrams(sampleDependencyGraph, sampleCallGraph, sampleArchitectureLayers);

  it("returns mermaid and reactflow sections", () => {
    expect(all.mermaid).toBeDefined();
    expect(all.reactflow).toBeDefined();
  });

  describe("reactflow dependency", () => {
    it("creates nodes with positions", () => {
      for (const node of all.reactflow.dependency.nodes) {
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe("number");
        expect(typeof node.position.y).toBe("number");
      }
    });

    it("nodes have graphNode type", () => {
      for (const node of all.reactflow.dependency.nodes) {
        expect(node.type).toBe("graphNode");
      }
    });

    it("edges have source and target", () => {
      for (const edge of all.reactflow.dependency.edges) {
        expect(edge.source).toBeDefined();
        expect(edge.target).toBeDefined();
        expect(edge.id).toBeDefined();
      }
    });

    it("deduplicates edges", () => {
      const ids = all.reactflow.dependency.edges.map(e => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("reactflow call graph", () => {
    it("creates nodes for functions", () => {
      expect(all.reactflow.callGraph.nodes.length).toBeGreaterThan(0);
    });

    it("edges labeled calls", () => {
      for (const edge of all.reactflow.callGraph.edges) {
        expect(edge.label).toBe("calls");
      }
    });
  });

  describe("reactflow architecture", () => {
    it("creates one node per layer", () => {
      expect(all.reactflow.architecture.nodes).toHaveLength(sampleArchitectureLayers.length);
    });

    it("nodes include layer data", () => {
      const routeNode = all.reactflow.architecture.nodes.find(n => n.data.layer === "routes");
      expect(routeNode).toBeDefined();
      expect(routeNode?.data.fileCount).toBe(sampleArchitectureLayers.find(l => l.name === "routes")!.files.length);
    });

    it("creates edges between consecutive layers", () => {
      expect(all.reactflow.architecture.edges.length).toBe(sampleArchitectureLayers.length - 1);
    });
  });
});
