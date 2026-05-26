"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import InteractiveGraph from "@/components/InteractiveGraph";
import TechStack from "@/components/TechStack";
import AnalysisReport from "@/components/AnalysisReport";
import QuickStats from "@/components/QuickStats";
import FileTree from "@/components/FileTree";
import MermaidDiagram from "@/components/MermaidDiagram";
import ZoomableContainer from "@/components/ZoomableContainer";
import ChatPanel from "@/components/ChatPanel";

interface TechStackCategories {
  languages: string[];
  frameworks: string[];
  libraries: string[];
  databases: string[];
  tools: string[];
}

interface KeyModule {
  name: string;
  purpose: string;
  files: string[];
}

interface AnalysisReportData {
  overview: string;
  architecture: string;
  keyModules: KeyModule[];
  dataFlow: string;
  designPatterns: string[];
  observations: {
    security: string;
    performance: string;
    techDebt: string;
  };
}

interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  language?: string;
}

interface Analysis {
  id: string;
  repoName: string;
  repoUrl?: string;
  summary: string;
  techStack: TechStackCategories | string[];
  fileTree: FileNode;
  diagrams: {
    mermaid?: { dependency: string; callGraph: string; architecture: string };
    reactflow?: {
      dependency: { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] };
      callGraph: { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] };
      architecture: { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] };
    };
    dependency?: string;
    callGraph?: string;
    architecture?: string;
  };
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface JobStatus {
  state: string;
  progress: number;
  analysisId?: string;
  failedReason?: string;
}

const NAV_ITEMS = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: "dependencies",
    label: "Dependencies",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
    ),
  },
  {
    id: "callgraph",
    label: "Call Graph",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 10h16M4 14h16M4 18h16"
        />
      </svg>
    ),
  },
  {
    id: "architecture",
    label: "Architecture",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
  },
  {
    id: "files",
    label: "File Tree",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>
    ),
  },
  {
    id: "chat",
    label: "Chat",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0
  4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9
  8z"
        />
      </svg>
    ),
  },
];

function parseReport(summary: string): AnalysisReportData | null {
  try {
    const parsed = JSON.parse(summary);
    if (parsed.overview) return parsed;
    return null;
  } catch {
    return null;
  }
}

const KNOWN_LANGUAGES = [
  "TypeScript", "JavaScript", "Python", "Java", "Go", "Rust", "Ruby",
  "C#", "C++", "C", "PHP", "Swift", "Kotlin", "Dart", "Scala", "Elixir",
  "HTML", "CSS", "SCSS", "Sass", "SQL",
];

function parseTechStack(
  techStack: TechStackCategories | string[],
): TechStackCategories {
  if (Array.isArray(techStack)) {
    const languages = techStack.filter((t) =>
      KNOWN_LANGUAGES.some((l) => l.toLowerCase() === t.toLowerCase())
    );
    const frameworks = techStack.filter((t) =>
      !KNOWN_LANGUAGES.some((l) => l.toLowerCase() === t.toLowerCase())
    );
    return {
      languages,
      frameworks,
      libraries: [],
      databases: [],
      tools: [],
    };
  }
  return techStack;
}

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const [job, setJob] = useState<JobStatus | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) {
      // Loaded from history — fetch completed analysis directly
      fetch(`http://localhost:4000/api/results/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "completed") {
            setAnalysis(data);
          } else if (data.status === "failed") {
            setError(data.errorMessage || "Analysis failed");
          } else {
            setError("Analysis still in progress — please wait");
          }
        })
        .catch(() => setError("Could not reach API"));
      return;
    }

    async function poll() {
      try {
        const res = await fetch(`http://localhost:4000/api/status/${jobId}`);
        const data: JobStatus = await res.json();
        setJob(data);

        if (data.state === "completed") {
          clearInterval(pollRef.current!);
          const r = await fetch(`http://localhost:4000/api/results/${id}`);
          const a: Analysis = await r.json();
          setAnalysis(a);
        } else if (data.state === "failed") {
          clearInterval(pollRef.current!);
          setError(data.failedReason || "Analysis failed");
        }
      } catch {
        setError("Could not reach API");
        clearInterval(pollRef.current!);
      }
    }

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current!);
  }, [jobId, id]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <p className="text-destructive font-medium">Analysis failed</p>
            <p className="text-muted-foreground text-sm">{error}</p>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Try another repository
            </a>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!analysis) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-base">Analyzing repository...</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress value={job?.progress ?? 0} className="h-2" />
            <p className="text-muted-foreground text-sm text-center">
              {job ? `${job.state} — ${job.progress}%` : "Starting..."}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {[
                { label: "Cloning repo", pct: 10 },
                { label: "Parsing files", pct: 25 },
                { label: "Building graphs", pct: 45 },
                { label: "AI analysis", pct: 60 },
                { label: "Generating diagrams", pct: 80 },
                { label: "Saving results", pct: 95 },
              ].map(({ label, pct }) => (
                <div
                  key={label}
                  className={`flex items-center gap-1.5 ${
                    (job?.progress ?? 0) >= pct ? "text-primary" : ""
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      (job?.progress ?? 0) >= pct ? "bg-primary" : "bg-border"
                    }`}
                  />
                  {label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const report = parseReport(analysis.summary);
  const techStack = parseTechStack(analysis.techStack);
  const hasReactFlow = !!analysis.diagrams.reactflow;

  function countFiles(node: FileNode): number {
    if (node.type === "file") return 1;
    return (node.children || []).reduce((sum, child) => sum + countFiles(child), 0);
  }
  const totalFiles = analysis.fileTree ? countFiles(analysis.fileTree) : 0;

  function renderSection() {
    switch (activeSection) {
      case "overview":
        return (
          <div className="flex flex-col gap-6">
            <QuickStats
              totalFiles={totalFiles}
              languages={techStack.languages}
              architectureStyle={report ? "See report" : "Unknown"}
              analyzedAt={analysis!.createdAt}
            />
            <TechStack techStack={techStack} />
            {report ? (
              <AnalysisReport report={report} />
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{analysis!.summary}</p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "dependencies":
        if (hasReactFlow) {
          return (
            <InteractiveGraph
              nodes={analysis!.diagrams.reactflow!.dependency.nodes}
              edges={analysis!.diagrams.reactflow!.dependency.edges}
              title="Dependency Graph"
            />
          );
        }
        return (
          <ZoomableContainer className="h-[650px]">
            <div className="p-8 flex items-center justify-center min-h-full">
              <MermaidDiagram
                chart={
                  analysis!.diagrams.mermaid?.dependency ??
                  analysis!.diagrams.dependency ??
                  ""
                }
              />
            </div>
          </ZoomableContainer>
        );

      case "callgraph":
        if (hasReactFlow) {
          return (
            <InteractiveGraph
              nodes={analysis!.diagrams.reactflow!.callGraph.nodes}
              edges={analysis!.diagrams.reactflow!.callGraph.edges}
              title="Call Graph"
            />
          );
        }
        return (
          <ZoomableContainer className="h-[650px]">
            <div className="p-8 flex items-center justify-center min-h-full">
              <MermaidDiagram
                chart={
                  analysis!.diagrams.mermaid?.callGraph ??
                  analysis!.diagrams.callGraph ??
                  ""
                }
              />
            </div>
          </ZoomableContainer>
        );

      case "architecture":
        if (hasReactFlow) {
          return (
            <InteractiveGraph
              nodes={analysis!.diagrams.reactflow!.architecture.nodes}
              edges={analysis!.diagrams.reactflow!.architecture.edges}
              title="Architecture"
            />
          );
        }
        return (
          <ZoomableContainer className="h-[650px]">
            <div className="p-8 flex items-center justify-center min-h-full">
              <MermaidDiagram
                chart={
                  analysis!.diagrams.mermaid?.architecture ??
                  analysis!.diagrams.architecture ??
                  ""
                }
              />
            </div>
          </ZoomableContainer>
        );

      case "files":
        return (
          <div className="rounded-xl border border-slate-200 overflow-hidden h-[650px] overflow-y-auto" style={{ background: "#ffffff" }}>
            <div className="p-6">
              <FileTree node={analysis!.fileTree} />
            </div>
          </div>
        );

      case "chat":
        return <ChatPanel analysisId={analysis!.id} />;

      default:
        return null;
    }
  }

  return (
    <DashboardLayout
      repoName={analysis.repoName}
      repoUrl={analysis.repoUrl}
      items={NAV_ITEMS}
      activeItem={activeSection}
      onItemChange={setActiveSection}
    >
      {renderSection()}
    </DashboardLayout>
  );
}
