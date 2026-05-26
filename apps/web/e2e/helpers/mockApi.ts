import { Page } from "@playwright/test";

export async function mockAnalyzeUrl(page: Page, response = { jobId: "job-1", analysisId: "analysis-1" }) {
  await page.route("**/api/analyze/url", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) }),
  );
}

export async function mockAnalyzeZip(page: Page, response = { jobId: "job-1", analysisId: "analysis-1" }) {
  await page.route("**/api/analyze/zip", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) }),
  );
}

export async function mockAnalyses(page: Page, analyses: unknown[] = []) {
  await page.route("**/api/analyses**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ analyses }) }),
  );
}

export async function mockJobStatus(page: Page, state: string, progress: number, extra: Record<string, unknown> = {}) {
  await page.route("**/api/status/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jobId: "job-1", state, progress, ...extra }),
    }),
  );
}

export async function mockResults(page: Page, analysis: unknown) {
  await page.route("**/api/results/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(analysis) }),
  );
}

export async function mockGitHubRepoPublic(page: Page) {
  await page.route("**/api.github.com/repos/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ private: false }) }),
  );
}

export async function mockGitHubRepoPrivate(page: Page) {
  await page.route("**/api.github.com/repos/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Not Found" }) }),
  );
}

export async function mockBackendDown(page: Page) {
  await page.route("**/localhost:4000/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!DOCTYPE html><html><body>Not Found</body></html>" }),
  );
}
