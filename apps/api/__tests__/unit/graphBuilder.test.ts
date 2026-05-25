import { describe, it, expect } from "vitest";
import { buildGraphs } from "../../src/services/graphBuilder";
import { simpleParsedFiles } from "../fixtures/parsedFiles";

describe("buildGraphs", () => {
  const graphs = buildGraphs(simpleParsedFiles);

  describe("dependency graph", () => {
    it("creates nodes for all files", () => {
      expect(graphs.dependency.nodes).toHaveLength(simpleParsedFiles.length);
    });

    it("node ids match file paths", () => {
      const ids = graphs.dependency.nodes.map(n => n.id);
      for (const file of simpleParsedFiles) {
        expect(ids).toContain(file.path);
      }
    });

    it("node labels are file basenames", () => {
      const indexNode = graphs.dependency.nodes.find(n => n.id === "src/index.ts");
      expect(indexNode?.label).toBe("index.ts");
    });

    it("creates edges for relative imports", () => {
      const edge = graphs.dependency.edges.find(
        e => e.from === "src/index.ts" && e.to === "src/utils.ts"
      );
      expect(edge).toBeDefined();
    });

    it("does not create edges for npm package imports", () => {
      const expressEdge = graphs.dependency.edges.find(
        e => e.to.includes("express")
      );
      expect(expressEdge).toBeUndefined();
    });

    it("resolves parent-dir imports", () => {
      const edge = graphs.dependency.edges.find(
        e => e.from === "src/components/Button.tsx" && e.to === "src/utils.ts"
      );
      expect(edge).toBeDefined();
    });

    it("includes language on nodes", () => {
      const node = graphs.dependency.nodes.find(n => n.id === "src/index.ts");
      expect(node?.language).toBe("typescript");
    });
  });

  describe("call graph", () => {
    it("creates nodes for functions", () => {
      expect(graphs.callGraph.nodes.length).toBeGreaterThan(0);
    });

    it("node ids are filePath::fnName format", () => {
      const node = graphs.callGraph.nodes.find(n => n.label === "main");
      expect(node?.id).toBe("src/index.ts::main");
    });

    it("creates edges when function name appears in another file content", () => {
      const helperEdge = graphs.callGraph.edges.find(
        e => e.to === "src/utils.ts::helper"
      );
      expect(helperEdge).toBeDefined();
    });

    it("does not self-link same-file functions", () => {
      const selfEdge = graphs.callGraph.edges.find(
        e => {
          const fromFile = e.from.split("::")[0];
          const toFile = e.to.split("::")[0];
          return fromFile === toFile;
        }
      );
      expect(selfEdge).toBeUndefined();
    });

    it("caps edges at 200", () => {
      expect(graphs.callGraph.edges.length).toBeLessThanOrEqual(200);
    });
  });

  describe("architecture layers", () => {
    it("returns non-empty layers only", () => {
      for (const layer of graphs.architecture) {
        expect(layer.files.length).toBeGreaterThan(0);
      }
    });

    it("classifies services files", () => {
      const services = graphs.architecture.find(l => l.name === "services");
      expect(services?.files).toContain("src/services/api.ts");
    });

    it("classifies components files", () => {
      const components = graphs.architecture.find(l => l.name === "components");
      expect(components?.files).toContain("src/components/Button.tsx");
    });
  });

  describe("empty input", () => {
    it("returns empty graphs for empty files array", () => {
      const empty = buildGraphs([]);
      expect(empty.dependency.nodes).toHaveLength(0);
      expect(empty.dependency.edges).toHaveLength(0);
      expect(empty.callGraph.nodes).toHaveLength(0);
      expect(empty.callGraph.edges).toHaveLength(0);
      expect(empty.architecture).toHaveLength(0);
    });
  });
});
