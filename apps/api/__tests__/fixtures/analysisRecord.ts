export const completedAnalysis = {
  id: "analysis-1",
  userId: "user-1",
  repoUrl: "https://github.com/test/repo",
  repoName: "repo",
  summary: JSON.stringify({
    overview: "A test repository",
    architecture: "Layered",
    keyModules: [],
    dataFlow: "Simple request-response",
    designPatterns: ["MVC"],
    observations: { security: "OK", performance: "Good", techDebt: "Low" },
  }),
  techStack: ["TypeScript", "React", "Express"],
  fileTree: { name: "repo", path: ".", type: "directory", children: [
    { name: "src", path: "src", type: "directory", children: [
      { name: "index.ts", path: "src/index.ts", type: "file", language: "typescript" },
    ] },
  ] },
  diagrams: {
    mermaid: { dependency: "graph LR\n  A-->B", callGraph: "graph TD\n  A-->B", architecture: "flowchart TB\n  A-->B" },
    reactflow: {
      dependency: { nodes: [], edges: [] },
      callGraph: { nodes: [], edges: [] },
      architecture: { nodes: [], edges: [] },
    },
  },
  status: "completed",
  errorMessage: null,
  createdAt: new Date("2024-01-15T10:00:00Z"),
};

export const pendingAnalysis = {
  id: "analysis-2",
  userId: "user-1",
  repoUrl: "https://github.com/test/pending",
  repoName: "pending",
  summary: null,
  techStack: [],
  fileTree: null,
  diagrams: null,
  status: "pending",
  errorMessage: null,
  createdAt: new Date("2024-01-15T11:00:00Z"),
};

export const failedAnalysis = {
  id: "analysis-3",
  userId: "user-1",
  repoUrl: "https://github.com/test/failed",
  repoName: "failed",
  summary: null,
  techStack: [],
  fileTree: null,
  diagrams: null,
  status: "failed",
  errorMessage: "Clone failed: repository not found",
  createdAt: new Date("2024-01-15T12:00:00Z"),
};

export const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  image: null,
  githubAccessToken: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
};
