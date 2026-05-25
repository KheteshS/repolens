import type { DependencyGraph, CallGraph, ArchitectureLayer } from "../../src/services/graphBuilder";

export const sampleDependencyGraph: DependencyGraph = {
  nodes: [
    { id: "src/index.ts", label: "index.ts", language: "typescript" },
    { id: "src/utils.ts", label: "utils.ts", language: "typescript" },
    { id: "src/components/Button.tsx", label: "Button.tsx", language: "typescript" },
    { id: "src/services/api.ts", label: "api.ts", language: "typescript" },
  ],
  edges: [
    { from: "src/index.ts", to: "src/utils.ts" },
    { from: "src/components/Button.tsx", to: "src/utils.ts" },
    { from: "src/services/api.ts", to: "src/utils.ts" },
  ],
};

export const sampleCallGraph: CallGraph = {
  nodes: [
    { id: "src/index.ts::main", label: "main" },
    { id: "src/utils.ts::helper", label: "helper" },
    { id: "src/utils.ts::formatDate", label: "formatDate" },
    { id: "src/services/api.ts::fetchData", label: "fetchData" },
  ],
  edges: [
    { from: "src/index.ts::main", to: "src/utils.ts::helper" },
    { from: "src/services/api.ts::fetchData", to: "src/utils.ts::helper" },
  ],
};

export const sampleArchitectureLayers: ArchitectureLayer[] = [
  { name: "routes", files: ["src/routes/auth.ts", "src/routes/api.ts"] },
  { name: "services", files: ["src/services/api.ts", "src/services/auth.ts"] },
  { name: "components", files: ["src/components/Button.tsx", "src/components/Modal.tsx"] },
  { name: "utils", files: ["src/utils/format.ts"] },
];

export const emptyDependencyGraph: DependencyGraph = { nodes: [], edges: [] };
export const emptyCallGraph: CallGraph = { nodes: [], edges: [] };
