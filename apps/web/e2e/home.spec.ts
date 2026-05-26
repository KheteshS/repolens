import { test, expect } from "@playwright/test";
import { mockAuthenticated, mockUnauthenticated } from "./helpers/mockAuth";
import { mockAnalyzeUrl, mockGitHubRepoPublic, mockGitHubRepoPrivate, mockBackendDown } from "./helpers/mockApi";

test.describe("Home page - unauthenticated", () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto("/");
  });

  test("renders hero section", async ({ page }) => {
    await expect(page.getByText("Understand any codebase")).toBeVisible();
    await expect(page.getByText("in minutes")).toBeVisible();
  });

  test("shows Sign in button in nav", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("shows GitHub URL input", async ({ page }) => {
    await expect(page.getByPlaceholder("https://github.com/owner/repo")).toBeVisible();
  });

  test("shows ZIP upload card", async ({ page }) => {
    await expect(page.getByText("Upload ZIP Archive")).toBeVisible();
  });

  test("shows error for invalid URL", async ({ page }) => {
    await page.getByPlaceholder("https://github.com/owner/repo").fill("https://gitlab.com/foo/bar");
    await page.getByRole("button", { name: "Analyze" }).click();
    await expect(page.getByText("Enter a valid GitHub URL")).toBeVisible();
  });

  test("shows backend unavailable error", async ({ page }) => {
    await mockBackendDown(page);
    await page.getByPlaceholder("https://github.com/owner/repo").fill("https://github.com/owner/repo");
    await page.getByRole("button", { name: "Analyze" }).click();
    await expect(page.getByText("Backend unavailable")).toBeVisible();
  });

  test("visibility badge shows Public for public repo", async ({ page }) => {
    await mockGitHubRepoPublic(page);
    await page.getByPlaceholder("https://github.com/owner/repo").fill("https://github.com/facebook/react");
    await expect(page.getByText("Public")).toBeVisible({ timeout: 5000 });
  });

  test("visibility badge shows Private for private/404 repo", async ({ page }) => {
    await mockGitHubRepoPrivate(page);
    await page.getByPlaceholder("https://github.com/owner/repo").fill("https://github.com/owner/private-repo");
    await expect(page.getByText(/Private/)).toBeVisible({ timeout: 5000 });
  });

  test("private repo shows sign-in prompt when no token", async ({ page }) => {
    await mockGitHubRepoPrivate(page);
    // Intercept analyze to prevent navigation if prompt fails
    let analyzeRequested = false;
    await page.route("**/api/analyze/url", (route) => {
      analyzeRequested = true;
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "j1", analysisId: "a1" }) });
    });
    const input = page.getByPlaceholder("https://github.com/owner/repo");
    await input.fill("https://github.com/owner/private-repo");
    // Wait for private badge — confirms visibility state is "private"
    await expect(page.getByText(/Private/)).toBeVisible({ timeout: 5000 });
    // Small wait for React state to propagate
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Analyze" }).click();
    // Should show prompt, not navigate
    await expect(page.getByText(/Sign in with GitHub to grant access/)).toBeVisible({ timeout: 5000 });
  });

  test("cancel dismisses private repo prompt", async ({ page }) => {
    await mockGitHubRepoPrivate(page);
    await page.route("**/api/analyze/url", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobId: "j1", analysisId: "a1" }) });
    });
    const input = page.getByPlaceholder("https://github.com/owner/repo");
    await input.fill("https://github.com/owner/private-repo");
    await expect(page.getByText(/Private/)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Analyze" }).click();
    await expect(page.getByText(/Sign in with GitHub to grant access/)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText(/Sign in with GitHub to grant access/)).not.toBeVisible();
  });
});

test.describe("Home page - authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await page.goto("/");
  });

  test("shows user name and Dashboard link", async ({ page }) => {
    await expect(page.getByText("Test User")).toBeVisible();
    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
  });

  test("shows Sign out button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("valid URL submits and redirects to analysis page", async ({ page }) => {
    await mockAnalyzeUrl(page);
    await page.getByPlaceholder("https://github.com/owner/repo").fill("https://github.com/owner/repo");
    await page.getByRole("button", { name: "Analyze" }).click();
    await page.waitForURL(/\/analysis\/analysis-1/);
    expect(page.url()).toContain("/analysis/analysis-1");
  });
});
