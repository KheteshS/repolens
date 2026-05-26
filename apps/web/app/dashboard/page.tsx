"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Analysis {
  id: string;
  repoName: string;
  repoUrl: string | null;
  status: string;
  createdAt: string;
  techStack: string[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.email) return;

    fetch(`http://localhost:4000/api/analyses?email=${encodeURIComponent(session.user.email)}`)
      .then((res) => res.json())
      .then((data) => setAnalyses(data.analyses || []))
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false));
  }, [session?.user?.email]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <Link href="/" className="text-lg font-bold tracking-tight">RepoLens</Link>
        <div className="flex items-center gap-3">
          {session?.user?.image && (
            <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
          )}
          <span className="text-sm text-muted-foreground">{session?.user?.name}</span>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </Button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Analyses</h1>
            <p className="text-muted-foreground mt-1">
              {session?.user?.name ? `Welcome back, ${session.user.name}` : "Your analysis history"}
            </p>
          </div>
          <Button onClick={() => router.push("/")}>New Analysis</Button>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-20" />
              </Card>
            ))}
          </div>
        ) : analyses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-muted-foreground text-lg">No analyses yet</p>
              <Button onClick={() => router.push("/")}>Analyze your first repo</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {analyses.map((a) => (
              <Link key={a.id} href={`/analysis/${a.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{a.repoName}</CardTitle>
                      <Badge
                        variant={
                          a.status === "completed"
                            ? "default"
                            : a.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {a.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{a.repoUrl || "ZIP upload"}</span>
                      <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                    {a.techStack && a.techStack.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {(a.techStack as string[]).slice(0, 5).map((tech) => (
                          <Badge key={tech} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
