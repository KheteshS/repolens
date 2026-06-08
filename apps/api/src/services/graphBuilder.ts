import type { ParsedFile } from "./fileParser.js";

export interface GraphNode {
  id: string;
  label: string;
  language?: string;
  filePath?: string;
  role?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
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
  // Normalize paths to forward slashes (Windows compat)
  const normalizedFiles = files.map((f) => ({
    ...f,
    path: f.path.replace(/\\/g, "/"),
  }));
  const filePaths = new Set(normalizedFiles.map((f) => f.path));
  const nodes: GraphNode[] = normalizedFiles.map((f) => ({
    id: f.path,
    label: f.path.split("/").pop() ?? f.path,
    language: f.language,
  }));

  const edges: GraphEdge[] = [];

  for (const file of normalizedFiles) {
    for (const imp of file.imports) {
      // only include local imports (relative paths)
      if (!imp.startsWith(".")) continue;

      const resolved = resolveImport(file.path, imp);
      const target = findMatchingFile(resolved, filePaths);

      if (target) {
        edges.push({ from: file.path, to: target });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Build an application flow graph at the file/module level.
 * Shows how the repo works end-to-end: entry points → routes → services → data layer.
 * Each node is a file/module, edges represent import/usage relationships with labels
 * indicating what is imported (functions, classes, etc.).
 */
function buildCallGraph(files: ParsedFile[]): CallGraph {
  // Normalize all paths to forward slashes (Windows compat)
  const normalizedFiles = files.map((f) => ({
    ...f,
    path: f.path.replace(/\\/g, "/"),
  }));
  const filePaths = new Set(normalizedFiles.map((f) => f.path));
  const fileMap = new Map(normalizedFiles.map((f) => [f.path, f]));

  // Classify each file by its role in the application
  const getRole = (p: string): string => {
    const lp = p.toLowerCase();
    if (/\/(index|main|server|app)\.(ts|js|tsx|jsx|py|go)$/.test(lp))
      return "entry";
    if (lp.includes("/routes/") || lp.includes("/router")) return "route";
    if (lp.includes("/controllers/") || lp.includes("/controller"))
      return "controller";
    if (lp.includes("/middleware/") || lp.includes("/middlewares/"))
      return "middleware";
    if (lp.includes("/services/") || lp.includes("/service")) return "service";
    if (lp.includes("/workers/") || lp.includes("/jobs/")) return "worker";
    if (
      lp.includes("/models/") ||
      lp.includes("/schema") ||
      lp.includes("/prisma/") ||
      lp.includes("/db/")
    )
      return "data";
    if (
      lp.includes("/utils/") ||
      lp.includes("/helpers/") ||
      lp.includes("/lib/")
    )
      return "utility";
    if (lp.includes("/components/")) return "component";
    if (lp.includes("/pages/") || lp.includes("/app/")) return "page";
    if (lp.includes("/hooks/")) return "hook";
    if (lp.includes("/api/")) return "api";
    if (lp.includes("/config") || lp.includes(".config.")) return "config";
    if (
      lp.includes(".test.") ||
      lp.includes(".spec.") ||
      lp.includes("__tests__")
    )
      return "test";
    return "module";
  };

  const appFiles = normalizedFiles.filter((f) => !isTestFile(f.path));

  // Build nodes — one per file
  const nodes: GraphNode[] = appFiles.map((f) => {
    const fileName = f.path.split("/").pop() ?? f.path;
    const role = getRole(f.path);
    return {
      id: f.path,
      label: fileName.replace(/\.(ts|tsx|js|jsx|py|go|java|rs)$/, ""),
      language: f.language,
      filePath: f.path,
      role,
    };
  });

  // Build edges from import relationships with labels showing what's used
  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();

  for (const file of appFiles) {
    for (const imp of file.imports) {
      if (!imp.startsWith(".")) continue; // only local imports

      const resolved = resolveImport(file.path, imp);

      // Find matching file — try exact match, then with extensions, then prefix match
      const targetPath = findMatchingFile(resolved, filePaths);

      if (!targetPath) continue;
      const targetFile = fileMap.get(targetPath);
      if (!targetFile) continue;
      if (isTestFile(targetFile.path)) continue;

      const key = `${file.path}->${targetPath}`;
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);

      // Figure out what is being imported from the target file
      const importedNames = extractImportedNames(file.content, imp);
      const edgeLabel =
        importedNames.length > 0
          ? importedNames.slice(0, 3).join(", ")
          : "uses";

      edges.push({ from: file.path, to: targetPath, label: edgeLabel });
    }
  }

  // Prioritize: keep nodes that are connected + important standalone modules
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.from);
    connectedIds.add(edge.to);
  }

  // Always include entry points and important modules even if disconnected
  const importantRoles = new Set([
    "entry",
    "route",
    "service",
    "worker",
    "page",
    "controller",
  ]);
  const filteredNodes = nodes.filter(
    (n) => connectedIds.has(n.id) || importantRoles.has(n.role ?? ""),
  );

  return { nodes: filteredNodes, edges };
}

/** Extract the named imports from an import statement */
function extractImportedNames(content: string, importPath: string): string[] {
  const escaped = importPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match: import { foo, bar } from './path'
  const namedMatch = content.match(
    new RegExp(
      `import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${escaped}(?:\\.\\w+)?['"]`,
    ),
  );
  if (namedMatch?.[1]) {
    return namedMatch[1]
      .split(",")
      .map(
        (s) =>
          s
            .trim()
            .split(/\s+as\s+/)
            .pop()
            ?.trim() ?? "",
      )
      .filter(Boolean);
  }
  // Match: import Foo from './path'
  const defaultMatch = content.match(
    new RegExp(`import\\s+(\\w+)\\s+from\\s*['"]${escaped}(?:\\.\\w+)?['"]`),
  );
  if (defaultMatch?.[1]) return [defaultMatch[1]];

  // Match: const { foo } = require('./path')
  const cjsMatch = content.match(
    new RegExp(
      `(?:const|let|var)\\s*\\{([^}]+)\\}\\s*=\\s*require\\(['"]${escaped}['"]\\)`,
    ),
  );
  if (cjsMatch?.[1]) {
    return cjsMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

function buildArchitectureLayers(files: ParsedFile[]): ArchitectureLayer[] {
  // Comprehensive layer definitions — ordered by priority (first match wins)
  const layerRules: {
    name: string;
    match: (path: string, fileName: string) => boolean;
  }[] = [
    // Entry points
    {
      name: "entry_points",
      match: (p, f) =>
        /^(src\/)?(main|index|server|app|bootstrap|startup)\.[^/]+$/.test(p) ||
        f === "app.module.ts" ||
        f === "app.component.ts",
    },
    // Routing
    {
      name: "routing",
      match: (p, f) =>
        p.includes("/routes/") ||
        p.includes("/router/") ||
        p.includes("/routing/") ||
        p.includes("/navigation/") ||
        /\.routes\.[^/]+$/.test(f) ||
        /\.routing\.[^/]+$/.test(f) ||
        f === "app-routing.module.ts",
    },
    // Controllers / Handlers / Resolvers
    {
      name: "controllers",
      match: (p, f) =>
        p.includes("/controllers/") ||
        p.includes("/controller/") ||
        p.includes("/handlers/") ||
        p.includes("/resolvers/") ||
        /\.controller\.[^/]+$/.test(f) ||
        /\.resolver\.[^/]+$/.test(f),
    },
    // Middleware / Interceptors / Guards / Filters / Pipes (NestJS / Angular)
    {
      name: "middleware",
      match: (p, f) =>
        p.includes("/middleware/") ||
        p.includes("/middlewares/") ||
        p.includes("/interceptors/") ||
        p.includes("/guards/") ||
        p.includes("/filters/") ||
        /\.interceptor\.[^/]+$/.test(f) ||
        /\.guard\.[^/]+$/.test(f) ||
        /\.filter\.[^/]+$/.test(f) ||
        /\.middleware\.[^/]+$/.test(f),
    },
    // Pipes (Angular / NestJS)
    {
      name: "pipes",
      match: (p, f) => p.includes("/pipes/") || /\.pipe\.[^/]+$/.test(f),
    },
    // Directives (Angular)
    {
      name: "directives",
      match: (p, f) =>
        p.includes("/directives/") || /\.directive\.[^/]+$/.test(f),
    },
    // Pages / Screens / Views
    {
      name: "pages",
      match: (p) =>
        p.includes("/pages/") ||
        p.includes("/screens/") ||
        p.includes("/views/") ||
        p.includes("/app/"),
    },
    // Components / UI / Widgets / Templates
    {
      name: "components",
      match: (p, f) =>
        p.includes("/components/") ||
        p.includes("/widgets/") ||
        p.includes("/ui/") ||
        p.includes("/templates/") ||
        p.includes("/partials/") ||
        p.includes("/layouts/") ||
        /\.component\.[^/]+$/.test(f),
    },
    // Services / Providers / Use Cases
    {
      name: "services",
      match: (p, f) =>
        p.includes("/services/") ||
        p.includes("/providers/") ||
        p.includes("/usecases/") ||
        p.includes("/use-cases/") ||
        /\.service\.[^/]+$/.test(f) ||
        /\.provider\.[^/]+$/.test(f),
    },
    // State Management
    {
      name: "state",
      match: (p, f) =>
        p.includes("/store/") ||
        p.includes("/stores/") ||
        p.includes("/reducers/") ||
        p.includes("/actions/") ||
        p.includes("/selectors/") ||
        p.includes("/slices/") ||
        p.includes("/state/") ||
        p.includes("/context/") ||
        /\.store\.[^/]+$/.test(f) ||
        /\.reducer\.[^/]+$/.test(f) ||
        /\.slice\.[^/]+$/.test(f) ||
        /\.actions\.[^/]+$/.test(f),
    },
    // Hooks / Composables
    {
      name: "hooks",
      match: (p, f) =>
        p.includes("/hooks/") ||
        p.includes("/composables/") ||
        /^use[A-Z].*\.[^/]+$/.test(f),
    },
    // Models / Entities / Types / DTOs / Interfaces
    {
      name: "models",
      match: (p, f) =>
        p.includes("/models/") ||
        p.includes("/entities/") ||
        p.includes("/types/") ||
        p.includes("/interfaces/") ||
        p.includes("/dto/") ||
        p.includes("/dtos/") ||
        /\.model\.[^/]+$/.test(f) ||
        /\.entity\.[^/]+$/.test(f) ||
        /\.dto\.[^/]+$/.test(f) ||
        /\.interface\.[^/]+$/.test(f) ||
        /\.type\.[^/]+$/.test(f),
    },
    // Data Access / Repositories / Database
    {
      name: "data_access",
      match: (p, f) =>
        p.includes("/repositories/") ||
        p.includes("/repository/") ||
        p.includes("/dao/") ||
        p.includes("/database/") ||
        p.includes("/db/") ||
        p.includes("/prisma/") ||
        p.includes("/migrations/") ||
        p.includes("/seeds/") ||
        p.includes("/seeders/") ||
        /\.repository\.[^/]+$/.test(f) ||
        /\.schema\.[^/]+$/.test(f),
    },
    // Modules (Angular / NestJS)
    {
      name: "modules",
      match: (p, f) =>
        (p.includes("/modules/") || /\.module\.[^/]+$/.test(f)) &&
        !f.includes("app.module"),
    },
    // API / Gateway / GraphQL
    {
      name: "api",
      match: (p) =>
        p.includes("/api/") ||
        p.includes("/gateway/") ||
        p.includes("/graphql/"),
    },
    // Workers / Jobs / Queues
    {
      name: "workers",
      match: (p, f) =>
        p.includes("/workers/") ||
        p.includes("/jobs/") ||
        p.includes("/queues/") ||
        /\.worker\.[^/]+$/.test(f) ||
        /\.job\.[^/]+$/.test(f),
    },
    // Decorators
    {
      name: "decorators",
      match: (p, f) =>
        p.includes("/decorators/") || /\.decorator\.[^/]+$/.test(f),
    },
    // Utilities / Helpers / Shared / Common / Core / Lib
    {
      name: "utilities",
      match: (p) =>
        p.includes("/utils/") ||
        p.includes("/helpers/") ||
        p.includes("/lib/") ||
        p.includes("/shared/") ||
        p.includes("/common/") ||
        p.includes("/core/"),
    },
    // Configuration
    {
      name: "config",
      match: (p, f) =>
        p.includes("/config/") ||
        p.includes("/configs/") ||
        p.includes("/settings/") ||
        p.includes("/environments/") ||
        p.includes("/env/") ||
        /\.config\.[^/]+$/.test(f) ||
        f === ".env" ||
        /^environment\.[^/]+$/.test(f),
    },
    // Styles / CSS
    {
      name: "styles",
      match: (p, f) =>
        p.includes("/styles/") ||
        p.includes("/css/") ||
        p.includes("/scss/") ||
        p.includes("/sass/") ||
        /\.(css|scss|less|sass|styl)$/.test(f),
    },
    // Assets / Static
    {
      name: "assets",
      match: (p) =>
        p.includes("/assets/") ||
        p.includes("/images/") ||
        p.includes("/fonts/") ||
        p.includes("/public/") ||
        p.includes("/static/"),
    },
  ];

  const layers: Record<string, string[]> = {};

  for (const file of files) {
    // Skip test files
    if (isTestFile(file.path)) continue;

    const p = file.path.toLowerCase().replace(/\\/g, "/");
    const fileName = (p.split("/").pop() ?? "").toLowerCase();

    let classified = false;
    for (const rule of layerRules) {
      if (rule.match(p, fileName)) {
        if (!layers[rule.name]) layers[rule.name] = [];
        layers[rule.name]!.push(file.path);
        classified = true;
        break;
      }
    }

    if (!classified) {
      if (!layers["other"]) layers["other"] = [];
      layers["other"]!.push(file.path);
    }
  }

  // Canonical display order
  const ORDER = [
    "entry_points",
    "config",
    "modules",
    "routing",
    "middleware",
    "pipes",
    "directives",
    "guards",
    "controllers",
    "pages",
    "components",
    "hooks",
    "state",
    "services",
    "api",
    "workers",
    "decorators",
    "models",
    "data_access",
    "utilities",
    "styles",
    "assets",
    "other",
  ];

  const sorted = Object.entries(layers)
    .filter(([, files]) => files.length > 0)
    .sort(([a], [b]) => {
      const ai = ORDER.indexOf(a);
      const bi = ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  return sorted.map(([name, files]) => ({ name, files }));
}

function resolveImport(fromPath: string, importPath: string): string {
  // Normalize to forward slashes
  const normalFrom = fromPath.replace(/\\/g, "/");
  const normalImport = importPath.replace(/\\/g, "/");
  const dir = normalFrom.split("/").slice(0, -1).join("/");
  const parts = [...dir.split("/"), ...normalImport.split("/")];
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== ".") resolved.push(part);
  }

  return resolved.join("/");
}

/** Try to find a file in the set, handling missing extensions and index files */
function findMatchingFile(
  resolved: string,
  filePaths: Set<string>,
): string | undefined {
  // Exact match
  if (filePaths.has(resolved)) return resolved;

  // Try common extensions
  const extensions = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".py",
    ".go",
    ".java",
    ".rs",
  ];
  for (const ext of extensions) {
    if (filePaths.has(resolved + ext)) return resolved + ext;
  }

  // Try index files (import "./services" → "./services/index.ts")
  for (const ext of extensions) {
    const indexPath = resolved + "/index" + ext;
    if (filePaths.has(indexPath)) return indexPath;
  }

  // Prefix match as last resort (e.g., resolving "./utils" to "src/utils.ts")
  return [...filePaths].find(
    (p) => p.startsWith(resolved + ".") || p.startsWith(resolved + "/"),
  );
}

/** Detect test/spec files across all frameworks and languages */
function isTestFile(filePath: string): boolean {
  const lp = filePath.toLowerCase().replace(/\\/g, "/");
  const fileName = lp.split("/").pop() ?? "";

  // Directory-based patterns (any framework)
  if (
    lp.includes("/__tests__/") ||
    lp.includes("/__mocks__/") ||
    lp.includes("/__fixtures__/") ||
    lp.includes("/test/") ||
    lp.includes("/tests/") ||
    lp.includes("/testing/") ||
    lp.includes("/e2e/") ||
    lp.includes("/cypress/") ||
    lp.includes("/playwright/") ||
    lp.includes("/.storybook/")
  )
    return true;

  // File name suffix patterns (works for .ts, .js, .tsx, .jsx, .py, .go, etc.)
  if (
    /\.spec\.[^/]+$/.test(fileName) || // *.spec.ts, *.spec.js, etc.
    /\.test\.[^/]+$/.test(fileName) || // *.test.ts, *.test.js, etc.
    /\.tests\.[^/]+$/.test(fileName) || // *.tests.ts
    /\.spec-.*\.[^/]+$/.test(fileName) || // *.spec-helper.ts
    /\.stories\.[^/]+$/.test(fileName) || // *.stories.tsx (Storybook)
    /\.cy\.[^/]+$/.test(fileName) // *.cy.ts (Cypress)
  )
    return true;

  // Exact file names commonly test-related
  const testFileNames = new Set([
    "jest.config.ts",
    "jest.config.js",
    "jest.config.mjs",
    "jest.setup.ts",
    "jest.setup.js",
    "vitest.config.ts",
    "vitest.config.js",
    "vitest.config.mts",
    "karma.conf.js",
    "karma.conf.ts",
    "protractor.conf.js",
    "protractor.conf.ts",
    "cypress.config.ts",
    "cypress.config.js",
    "playwright.config.ts",
    "playwright.config.js",
    ".mocharc.yml",
    ".mocharc.js",
    "setup.ts",
    "setup.js",
    "test-setup.ts",
    "test-setup.js",
    "setupTests.ts",
    "setupTests.js",
    "test-utils.ts",
    "test-utils.js",
    "test-helpers.ts",
    "test-helpers.js",
    "conftest.py", // pytest
  ]);
  if (testFileNames.has(fileName)) return true;

  // Python test files: test_*.py
  if (/^test_.*\.py$/.test(fileName)) return true;

  // Go test files: *_test.go
  if (/_test\.go$/.test(fileName)) return true;

  // Java/Kotlin test files
  if (/test\.java$/.test(fileName) || /test\.kt$/.test(fileName)) return true;

  // Rust test files
  if (lp.includes("/tests/") && fileName.endsWith(".rs")) return true;

  return false;
}
