"use client";

import { useState } from "react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  language?: string;
  functions?: string[];
  exports?: string[];
  imports?: string[];
  classes?: string[];
  description?: string;
}

const LANG_COLORS: Record<string, string> = {
  typescript: "text-blue-700",
  javascript: "text-amber-700",
  python: "text-green-700",
  go: "text-cyan-700",
  rust: "text-orange-700",
  java: "text-red-700",
  c: "text-purple-700",
  cpp: "text-purple-700",
};

function buildFileDescription(node: FileNode): string {
  const parts: string[] = [];
  const ext = node.name.split(".").pop()?.toLowerCase() ?? "";

  // Identify the file role from the name
  const name = node.name.toLowerCase();
  if (name.includes("index")) parts.push("Entry point / barrel export file");
  else if (name.includes("test") || name.includes("spec"))
    parts.push("Test file");
  else if (name.includes("config") || name.includes("rc"))
    parts.push("Configuration file");
  else if (name.includes("route")) parts.push("Route definition");
  else if (name.includes("middleware")) parts.push("Middleware");
  else if (name.includes("hook") || name.startsWith("use"))
    parts.push("Custom React hook");
  else if (name.includes("util") || name.includes("helper"))
    parts.push("Utility / helper functions");
  else if (name.includes("service")) parts.push("Service layer module");
  else if (name.includes("model") || name.includes("schema"))
    parts.push("Data model / schema definition");
  else if (name.includes("component") || ext === "tsx" || ext === "jsx")
    parts.push("UI component");
  else if (ext === "css" || ext === "scss") parts.push("Stylesheet");
  else if (ext === "json") parts.push("JSON configuration / data");
  else if (ext === "md") parts.push("Documentation");

  if (node.language) parts.push(`Written in ${node.language}`);

  if (node.functions?.length) {
    parts.push(
      `Defines ${node.functions.length} function${node.functions.length > 1 ? "s" : ""}: ${node.functions.slice(0, 5).join(", ")}${node.functions.length > 5 ? "..." : ""}`,
    );
  }
  if (node.classes?.length) {
    parts.push(
      `Contains ${node.classes.length} class${node.classes.length > 1 ? "es" : ""}: ${node.classes.join(", ")}`,
    );
  }
  if (node.exports?.length) {
    parts.push(
      `Exports ${node.exports.length} symbol${node.exports.length > 1 ? "s" : ""}`,
    );
  }
  if (node.imports?.length) {
    parts.push(
      `Depends on ${node.imports.length} import${node.imports.length > 1 ? "s" : ""}`,
    );
  }

  return parts.length > 0
    ? parts.join(". ") + "."
    : "No metadata available for this file.";
}

function Node({
  node,
  depth,
  onFileClick,
  selectedPath,
}: {
  node: FileNode;
  depth: number;
  onFileClick: (node: FileNode) => void;
  selectedPath: string | null;
}) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === "file") {
    const isSelected = selectedPath === node.path;
    return (
      <button
        onClick={() => onFileClick(node)}
        className={`flex items-center gap-1.5 py-0.5 text-sm w-full text-left transition-colors rounded-sm px-1 ${
          isSelected
            ? "bg-indigo-50 text-indigo-700"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        }`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        <svg
          className="w-3.5 h-3.5 flex-shrink-0 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span
          className={
            node.language
              ? (LANG_COLORS[node.language] ?? "text-slate-700")
              : "text-slate-700"
          }
        >
          {node.name}
        </span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 py-0.5 text-sm w-full text-left text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors rounded-sm px-1"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <svg
          className="w-3.5 h-3.5 flex-shrink-0 text-amber-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
        <span className="font-medium text-slate-800">{node.name}</span>
      </button>
      {open &&
        node.children?.map((child) => (
          <Node
            key={child.path}
            node={child}
            depth={depth + 1}
            onFileClick={onFileClick}
            selectedPath={selectedPath}
          />
        ))}
    </div>
  );
}

function FileDetailPanel({
  node,
  onClose,
}: {
  node: FileNode;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-0 h-full w-72 bg-white border-l border-slate-200 shadow-xl p-4 overflow-y-auto z-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">File Details</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 transition-colors"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            Name
          </span>
          <p className="text-sm font-medium text-slate-800 mt-0.5">
            {node.name}
          </p>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            Path
          </span>
          <p className="text-xs font-mono text-slate-600 mt-0.5 break-all">
            {node.path}
          </p>
        </div>

        {node.language && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              Language
            </span>
            <p className="text-sm text-slate-700 mt-0.5 capitalize">
              {node.language}
            </p>
          </div>
        )}

        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            Type
          </span>
          <p className="text-sm text-slate-700 mt-0.5 capitalize">
            {node.type}
          </p>
        </div>

        {node.type === "file" && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              Description
            </span>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {node.description || buildFileDescription(node)}
            </p>
          </div>
        )}

        {node.functions && node.functions.length > 0 && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              Functions ({node.functions.length})
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {node.functions.map((fn) => (
                <span
                  key={fn}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700"
                >
                  {fn}()
                </span>
              ))}
            </div>
          </div>
        )}

        {node.classes && node.classes.length > 0 && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              Classes ({node.classes.length})
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {node.classes.map((cls) => (
                <span
                  key={cls}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-700"
                >
                  {cls}
                </span>
              ))}
            </div>
          </div>
        )}

        {node.exports && node.exports.length > 0 && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              Exports ({node.exports.length})
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {node.exports.map((exp) => (
                <span
                  key={exp}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-50 text-green-700"
                >
                  {exp}
                </span>
              ))}
            </div>
          </div>
        )}

        {node.imports && node.imports.length > 0 && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              Imports ({node.imports.length})
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {node.imports.slice(0, 15).map((imp) => (
                <span
                  key={imp}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                >
                  {imp}
                </span>
              ))}
              {node.imports.length > 15 && (
                <span className="text-[10px] text-slate-400">
                  +{node.imports.length - 15} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FileTree({ node }: { node: FileNode }) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  return (
    <div className="relative font-mono text-xs leading-6">
      <Node
        node={node}
        depth={0}
        onFileClick={setSelectedFile}
        selectedPath={selectedFile?.path ?? null}
      />
      {selectedFile && (
        <FileDetailPanel
          node={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}
