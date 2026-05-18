"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const LANGUAGE_COLORS: Record<string, string> = {
  typescript: "#3b82f6",
  javascript: "#eab308",
  python: "#22c55e",
  go: "#06b6d4",
  rust: "#f97316",
  java: "#ef4444",
  c: "#a855f7",
  cpp: "#a855f7",
};

const LAYER_COLORS: Record<string, string> = {
  routes: "#ef4444",
  controllers: "#f97316",
  services: "#a855f7",
  models: "#3b82f6",
  components: "#06b6d4",
  pages: "#22c55e",
  utils: "#6b7280",
  hooks: "#ec4899",
  config: "#78716c",
  tests: "#84cc16",
  other: "#52525b",
};

const SYSTEM_COLORS: Record<string, string> = {
  database: "#3b82f6",
  cache: "#ef4444",
  api: "#22c55e",
  queue: "#f97316",
};

const SYSTEM_ICONS: Record<string, string> = {
  database: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4",
  cache: "M13 10V3L4 14h7v7l9-11h-7z",
  api: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  queue: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
};

function GraphNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as {
    label: string;
    language?: string;
    layer?: string;
    fileCount?: number;
    files?: string[];
    systemType?: string;
  };

  const accentColor =
    (nodeData.language && LANGUAGE_COLORS[nodeData.language]) ||
    (nodeData.layer && LAYER_COLORS[nodeData.layer]) ||
    (nodeData.systemType && SYSTEM_COLORS[nodeData.systemType]) ||
    "#6366f1";

  const isExternal = !!nodeData.systemType;

  return (
    <div
      className={`group relative px-3.5 py-2.5 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer ${
        selected
          ? "ring-2 ring-indigo-400/60 ring-offset-1 ring-offset-white border-indigo-300"
          : "border-slate-200 hover:border-indigo-200"
      }`}
      style={{ background: "#ffffff" }}
    >
      {/* Accent bar at top */}
      <div
        className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full"
        style={{ backgroundColor: accentColor }}
      />

      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2 !border-none" />

      <div className="flex items-center gap-2">
        {/* Icon for external systems */}
        {isExternal && SYSTEM_ICONS[nodeData.systemType!] && (
          <svg className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={SYSTEM_ICONS[nodeData.systemType!]} />
          </svg>
        )}

        {/* Language dot indicator */}
        {nodeData.language && (
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
        )}

        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-medium text-slate-800 truncate max-w-[150px]">
            {nodeData.label}
          </span>
          {nodeData.fileCount !== undefined && (
            <span className="text-[9px] text-slate-500">{nodeData.fileCount} files</span>
          )}
          {nodeData.systemType && (
            <span className="text-[9px] text-slate-500 capitalize">{nodeData.systemType}</span>
          )}
          {nodeData.language && (
            <span className="text-[9px] text-slate-500 capitalize">{nodeData.language}</span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-2 !h-2 !border-none" />
    </div>
  );
}

export default memo(GraphNodeComponent);
