export const completedAnalysis = {
  id: "analysis-1",
  repoName: "test-repo",
  repoUrl: "https://github.com/test/repo",
  status: "completed",
  summary: JSON.stringify({
    overview: "A TypeScript web application",
    architecture: "Layered",
    keyModules: [{ name: "API", purpose: "HTTP endpoints", files: ["src/api.ts"] }],
    dataFlow: "Client → API → Database",
    designPatterns: ["MVC", "Repository"],
    observations: { security: "Good", performance: "Adequate", techDebt: "Low" },
  }),
  techStack: ["TypeScript", "React", "Express", "Prisma"],
  fileTree: {
    name: "test-repo",
    path: ".",
    type: "directory",
    children: [
      {
        name: "src",
        path: "src",
        type: "directory",
        children: [
          { name: "index.ts", path: "src/index.ts", type: "file", language: "typescript" },
          { name: "utils.ts", path: "src/utils.ts", type: "file", language: "typescript" },
          { name: "app.tsx", path: "src/app.tsx", type: "file", language: "typescript" },
        ],
      },
      { name: "package.json", path: "package.json", type: "file" },
    ],
  },
  diagrams: {
    mermaid: {
      dependency: "graph LR\n  index[index.ts] --> utils[utils.ts]",
      callGraph: "graph TD\n  main[main] --> helper[helper]",
      architecture: "flowchart TB\n  subgraph services\n    api[api.ts]\n  end",
    },
    reactflow: {
      dependency: {
        nodes: [
          { id: "src/index.ts", type: "graphNode", position: { x: 0, y: 0 }, data: { label: "index.ts", language: "typescript" } },
          { id: "src/utils.ts", type: "graphNode", position: { x: 200, y: 0 }, data: { label: "utils.ts", language: "typescript" } },
        ],
        edges: [{ id: "src/index.ts->src/utils.ts", source: "src/index.ts", target: "src/utils.ts", label: "imports" }],
      },
      callGraph: {
        nodes: [
          { id: "src/index.ts::main", type: "graphNode", position: { x: 0, y: 0 }, data: { label: "main" } },
          { id: "src/utils.ts::helper", type: "graphNode", position: { x: 0, y: 100 }, data: { label: "helper" } },
        ],
        edges: [{ id: "main->helper", source: "src/index.ts::main", target: "src/utils.ts::helper", label: "calls" }],
      },
      architecture: {
        nodes: [{ id: "layer-services", type: "graphNode", position: { x: 0, y: 0 }, data: { label: "services (2)", layer: "services", fileCount: 2 } }],
        edges: [],
      },
    },
  },
  createdAt: "2024-01-15T10:00:00.000Z",
};

export const analysisHistory = [
  {
    id: "analysis-1",
    repoName: "test-repo",
    repoUrl: "https://github.com/test/repo",
    status: "completed",
    createdAt: "2024-01-15T10:00:00.000Z",
    techStack: ["TypeScript", "React"],
  },
  {
    id: "analysis-2",
    repoName: "another-repo",
    repoUrl: "https://github.com/test/another",
    status: "failed",
    createdAt: "2024-01-14T08:00:00.000Z",
    techStack: ["Python"],
  },
];
