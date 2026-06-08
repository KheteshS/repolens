export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  language?: String;
  functions?: string[];
  exports?: string[];
  imports?: string[];
  classes?: string[];
  description?: string;
}

export interface Diagrams {
  dependency: string;
  callGraph: string;
  architecture: string;
}

export interface Analysis {
  id: string;
  repoUrl?: string;
  repoName: string;
  summary: string;
  techStack: string[];
  fileTree: FileNode;
  diagrams: Diagrams;
  status: AnalysisStatus;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface JobStatus {
  jobUd: string;
  status: AnalysisStatus;
  analysisId?: string;
  error?: string;
}
