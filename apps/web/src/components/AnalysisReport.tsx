"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

interface Props {
  report: AnalysisReportData;
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/50 transition-colors"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 py-3 border-t border-border">{children}</div>}
    </div>
  );
}

export default function AnalysisReport({ report }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Section title="Overview" defaultOpen={true}>
        <div className="prose prose-sm prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.overview}</ReactMarkdown>
        </div>
      </Section>

      <Section title="Architecture" defaultOpen={true}>
        <div className="prose prose-sm prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.architecture}</ReactMarkdown>
        </div>
      </Section>

      <Section title="Key Modules" defaultOpen={true}>
        <div className="grid gap-2">
          {report.keyModules.map((mod) => (
            <div key={mod.name} className="p-3 rounded-md bg-accent/30 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{mod.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{mod.purpose}</p>
              {mod.files.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {mod.files.map((f) => (
                    <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background text-muted-foreground">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Data Flow" defaultOpen={false}>
        <div className="prose prose-sm prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.dataFlow}</ReactMarkdown>
        </div>
      </Section>

      <Section title="Design Patterns" defaultOpen={false}>
        <ul className="space-y-1">
          {report.designPatterns.map((pattern) => (
            <li key={pattern} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-1">&#x2022;</span>
              {pattern}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Observations" defaultOpen={false}>
        <div className="flex flex-col gap-3">
          {report.observations.security && (
            <div>
              <span className="text-xs font-medium text-yellow-400 uppercase tracking-wider">Security</span>
              <p className="text-sm text-muted-foreground mt-0.5">{report.observations.security}</p>
            </div>
          )}
          {report.observations.performance && (
            <div>
              <span className="text-xs font-medium text-green-400 uppercase tracking-wider">Performance</span>
              <p className="text-sm text-muted-foreground mt-0.5">{report.observations.performance}</p>
            </div>
          )}
          {report.observations.techDebt && (
            <div>
              <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Tech Debt</span>
              <p className="text-sm text-muted-foreground mt-0.5">{report.observations.techDebt}</p>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
