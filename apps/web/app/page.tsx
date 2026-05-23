"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  const router = useRouter();
  const { data: session } = useSession();
  const [repoUrl, setRepoUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUrlError("");
    if (!repoUrl.includes("github.com")) {
      setUrlError("Enter a valid GitHub URL");
      return;
    }
    setUrlLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/analyze/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, userEmail: session?.user?.email }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Backend unavailable — make sure the API server is running on port 4000");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start analysis");
      router.push(`/analysis/${data.analysisId}?jobId=${data.jobId}`);
    } catch (err: unknown) {
      setUrlError(err instanceof Error ? err.message : "Something went wrong");
      setUrlLoading(false);
    }
  }

  async function handleZipUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setZipError("");
    if (!file.name.endsWith(".zip")) {
      setZipError("Only .zip files are supported");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setZipError("File must be under 100MB");
      return;
    }
    setZipLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (session?.user?.email) form.append("userEmail", session.user.email);
      const res = await fetch("http://localhost:4000/api/analyze/zip", {
        method: "POST",
        body: form,
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Backend unavailable — make sure the API server is running on port 4000");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start analysis");
      router.push(`/analysis/${data.analysisId}?jobId=${data.jobId}`);
    } catch (err: unknown) {
      setZipError(err instanceof Error ? err.message : "Something went wrong");
      setZipLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16 gap-16">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <span className="text-lg font-bold tracking-tight">RepoLens</span>
        {session?.user ? (
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            {session.user.image && (
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
            )}
            <span className="text-sm text-muted-foreground">{session.user.name}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button variant="outline" size="sm">Sign in</Button>
          </Link>
        )}
      </nav>

      {/* Spacer for fixed nav */}
      <div className="h-8" />

      {/* Hero */}
      <div className="text-center max-w-2xl flex flex-col gap-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight">RepoLens</span>
        </div>
        <h1 className="text-5xl font-bold tracking-tight leading-tight">
          Understand any codebase<br />
          <span className="text-primary">in minutes</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Paste a GitHub URL or upload a ZIP — RepoLens generates dependency graphs, call graphs, architecture diagrams, and an AI assistant that knows your entire repo.
        </p>
      </div>

      {/* Input cards */}
      <div className="w-full max-w-2xl flex flex-col gap-4">
        {/* GitHub URL */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              Analyze GitHub Repository
            </CardTitle>
            <CardDescription>Public repos work instantly. Private repos need a GitHub token.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUrlSubmit} className="flex gap-2">
              <Input
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={urlLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={urlLoading || !repoUrl}>
                {urlLoading ? "Analyzing…" : "Analyze"}
              </Button>
            </form>
            {urlError && <p className="text-destructive text-sm mt-2">{urlError}</p>}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <div className="flex-1 h-px bg-border" />
          or
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* ZIP upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload ZIP Archive
            </CardTitle>
            <CardDescription>Upload a .zip of your project. Max 100MB.</CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleZipUpload}
              disabled={zipLoading}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileRef.current?.click()}
              disabled={zipLoading}
            >
              {zipLoading ? "Uploading…" : "Choose ZIP file"}
            </Button>
            {zipError && <p className="text-destructive text-sm mt-2">{zipError}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 justify-center text-sm">
        {["Dependency graphs", "Call graphs", "Architecture diagrams", "AI chat assistant", "7 languages", "Streaming responses"].map((f) => (
          <span key={f} className="px-3 py-1 rounded-full border border-border bg-card text-muted-foreground">
            {f}
          </span>
        ))}
      </div>
    </main>
  );
}
