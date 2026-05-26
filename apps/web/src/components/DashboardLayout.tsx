"use client";

import { useState } from "react";
import { UserMenu } from "@/components/UserMenu";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface Props {
  repoName: string;
  repoUrl?: string;
  items: NavItem[];
  activeItem: string;
  onItemChange: (id: string) => void;
  children: React.ReactNode;
}

export default function DashboardLayout({
  repoName,
  repoUrl,
  items,
  activeItem,
  onItemChange,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Fixed topbar */}
      <header className="h-12 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 shrink-0 z-40">
        <a
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground">
            RepoLens
          </span>
        </a>

        <div className="h-4 w-px bg-border" />

        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Analysis</span>
          <svg
            className="w-3 h-3 opacity-50"
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
          <span className="text-foreground font-medium truncate max-w-[220px]">
            {repoName}
          </span>
        </nav>

        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-muted-foreground hover:text-primary transition-colors"
            title="Open on GitHub"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        )}

        <div className="ml-auto hidden md:flex items-center gap-2">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Dashboard
          </a>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Analysis
          </a>
          <UserMenu />
        </div>

        <button
          className="ml-auto md:hidden text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </header>

      {/* Body: fixed sidebar + scrollable content */}
      <div className="flex flex-1 min-h-0">
        {/* Fixed sidebar — no scroll */}
        <aside
          className={`${
            sidebarOpen ? "w-44" : "w-0 -ml-44"
          } md:w-44 md:ml-0 border-r border-border bg-card/40 flex flex-col py-3 transition-all duration-200 overflow-hidden shrink-0`}
        >
          <div className="px-4 mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Sections
            </span>
          </div>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemChange(item.id)}
              className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-all ${
                activeItem === item.id
                  ? "text-primary bg-primary/8 border-l-2 border-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/30 border-l-2 border-transparent"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </aside>

        {/* Scrollable main content — ONLY this scrolls */}
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
