export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  language?: String;
}

export interface DIagrams {
  dependency: string;
  callGraph: string;
  architecture: string;
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
