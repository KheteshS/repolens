"use client";

import type { Node } from "@xyflow/react";

interface Props {
  node: Node;
  onClose: () => void;
}

export default function DetailPanel({ node, onClose }: Props) {
  const data = node.data as {
    label: string;
    language?: string;
    layer?: string;
    fileCount?: number;
    files?: string[];
    systemType?: string;
  };

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-white border-l border-slate-200 shadow-xl p-4 overflow-y-auto z-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Node Details</h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <span className="text-xs text-slate-500 uppercase tracking-wider">Name</span>
          <p className="text-sm font-medium text-slate-800 mt-0.5">{data.label}</p>
        </div>

        {data.language && (
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Language</span>
            <p className="text-sm text-slate-800 mt-0.5 capitalize">{data.language}</p>
          </div>
        )}

        {data.layer && (
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Layer</span>
            <p className="text-sm text-slate-800 mt-0.5 capitalize">{data.layer}</p>
          </div>
        )}

        {data.fileCount !== undefined && (
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Files</span>
            <p className="text-sm text-slate-800 mt-0.5">{data.fileCount} files</p>
          </div>
        )}

        {data.files && data.files.length > 0 && (
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">File List</span>
            <ul className="mt-1 space-y-0.5">
              {data.files.map((f) => (
                <li key={f} className="text-xs text-slate-500 font-mono truncate">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.systemType && (
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Type</span>
            <p className="text-sm text-slate-800 mt-0.5 capitalize">{data.systemType}</p>
          </div>
        )}
      </div>
    </div>
  );
}
