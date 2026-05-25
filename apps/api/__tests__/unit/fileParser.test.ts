import { describe, it, expect } from "vitest";
import path from "path";
import { buildFileTree, parseFiles } from "../../src/services/fileParser";

const FIXTURES_PATH = path.resolve(__dirname, "../fixtures/sampleRepo");

describe("buildFileTree", () => {
  it("returns correct root structure", () => {
    const tree = buildFileTree(FIXTURES_PATH);
    expect(tree.type).toBe("directory");
    expect(tree.name).toBe("sampleRepo");
    expect(tree.children).toBeDefined();
  });

  it("includes nested directories", () => {
    const tree = buildFileTree(FIXTURES_PATH);
    const src = tree.children?.find(c => c.name === "src");
    expect(src).toBeDefined();
    expect(src?.type).toBe("directory");
    expect(src?.children?.length).toBeGreaterThan(0);
  });

  it("assigns language from extension", () => {
    const tree = buildFileTree(FIXTURES_PATH);
    const src = tree.children?.find(c => c.name === "src");
    const index = src?.children?.find(c => c.name === "index.ts");
    expect(index?.language).toBe("typescript");
  });

  it("includes tsx files with typescript language", () => {
    const tree = buildFileTree(FIXTURES_PATH);
    const src = tree.children?.find(c => c.name === "src");
    const components = src?.children?.find(c => c.name === "components");
    const button = components?.children?.find(c => c.name === "Button.tsx");
    expect(button?.language).toBe("typescript");
  });

  it("does not include node_modules", () => {
    const tree = buildFileTree(FIXTURES_PATH);
    const nodeModules = tree.children?.find(c => c.name === "node_modules");
    expect(nodeModules).toBeUndefined();
  });

  it("marks files with type file", () => {
    const tree = buildFileTree(FIXTURES_PATH);
    const pkg = tree.children?.find(c => c.name === "package.json");
    expect(pkg?.type).toBe("file");
  });
});

describe("parseFiles", () => {
  it("returns parsed files for supported extensions", () => {
    const files = parseFiles(FIXTURES_PATH);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every(f => f.language !== undefined)).toBe(true);
  });

  it("extracts ES imports", () => {
    const files = parseFiles(FIXTURES_PATH);
    const index = files.find(f => f.path.includes("index.ts"));
    expect(index?.imports).toContain("./utils");
    expect(index?.imports).toContain("express");
  });

  it("extracts relative imports", () => {
    const files = parseFiles(FIXTURES_PATH);
    const button = files.find(f => f.path.includes("Button.tsx"));
    expect(button?.imports).toContain("../utils");
  });

  it("extracts named exports", () => {
    const files = parseFiles(FIXTURES_PATH);
    const utils = files.find(f => f.path.includes("utils.ts"));
    expect(utils?.exports).toContain("helper");
    expect(utils?.exports).toContain("formatDate");
    expect(utils?.exports).toContain("DateFormatter");
  });

  it("extracts default exports", () => {
    const files = parseFiles(FIXTURES_PATH);
    const index = files.find(f => f.path.includes("index.ts"));
    expect(index?.exports).toContain("default:main");
  });

  it("extracts function declarations", () => {
    const files = parseFiles(FIXTURES_PATH);
    const utils = files.find(f => f.path.includes("utils.ts"));
    expect(utils?.functions).toContain("helper");
    expect(utils?.functions).toContain("formatDate");
  });

  it("extracts classes", () => {
    const files = parseFiles(FIXTURES_PATH);
    const utils = files.find(f => f.path.includes("utils.ts"));
    expect(utils?.classes).toContain("DateFormatter");
  });

  it("extracts classes from services", () => {
    const files = parseFiles(FIXTURES_PATH);
    const api = files.find(f => f.path.includes("api.ts"));
    expect(api?.classes).toContain("ApiClient");
  });

  it("caps content at 10KB", () => {
    const files = parseFiles(FIXTURES_PATH);
    for (const file of files) {
      expect(file.content.length).toBeLessThanOrEqual(10_000);
    }
  });

  it("skips non-supported extensions", () => {
    const files = parseFiles(FIXTURES_PATH);
    const json = files.find(f => f.path.endsWith(".json"));
    expect(json).toBeUndefined();
  });

  it("sets correct language for each file", () => {
    const files = parseFiles(FIXTURES_PATH);
    for (const file of files) {
      if (file.path.endsWith(".ts") || file.path.endsWith(".tsx")) {
        expect(file.language).toBe("typescript");
      }
    }
  });
});
