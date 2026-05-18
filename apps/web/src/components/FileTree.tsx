"use client";

import { useState } from "react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  language?: string;
}

const LANG_COLORS: Record<string, string> = {
  typescript: "text-blue-400",
  javascript: "text-yellow-400",
  python: "text-green-400",
  go: "text-cyan-400",
  rust: "text-orange-400",
  java: "text-red-400",
  c: "text-purple-400",
  cpp: "text-purple-400",
};

function Node({ node, depth }: { node: FileNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === "file") {
    return (
      <div
        className="flex items-center gap-1.5 py-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className={node.language ? LANG_COLORS[node.language] ?? "" : ""}>{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 py-0.5 text-sm w-full text-left hover:text-foreground transition-colors"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <svg className="w-3.5 h-3.5 flex-shrink-0 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
        <span className="font-medium">{node.name}</span>
      </button>
      {open && node.children?.map((child) => (
        <Node key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function FileTree({ node }: { node: FileNode }) {
  return (
    <div className="font-mono text-xs leading-6">
      <Node node={node} depth={0} />
    </div>
  );
}
