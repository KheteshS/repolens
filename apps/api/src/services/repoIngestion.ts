import simpleGit from "simple-git";
import AdmZip from "adm-zip";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

export interface IngestedRepo {
  repoPath: string;
  repoName: string;
  cleanup: () => void;
}

export async function ingestFromUrl(
  repoUrl: string,
  githubToken?: string,
): Promise<IngestedRepo> {
  const repoName = extractRepoName(repoUrl);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "repolens-"));
  const cloneUrl = githubToken
    ? repoUrl.replace("https://", `https://${githubToken}@`)
    : repoUrl;

  const git = simpleGit();
  await git.clone(cloneUrl, tmpDir, ["--depth", "1"]);

  return {
    repoPath: tmpDir,
    repoName,
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
  };
}

export async function ingestFromZip(
  zipBuffer: Buffer,
  originalName: string,
): Promise<IngestedRepo> {
  const repoName = originalName.replace(/\.zip$/i, "");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "repolens-"));

  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(tmpDir, true);

  return {
    repoPath: tmpDir,
    repoName,
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
  };
}

function extractRepoName(url: string): string {
  const parts = url.replace(/\.git$/, "").split("/");
  return parts[parts.length - 1] ?? "unknown-repo";
}
