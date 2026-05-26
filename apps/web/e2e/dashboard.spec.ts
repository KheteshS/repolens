import { test, expect } from "@playwright/test";
import { mockAuthenticated, mockUnauthenticated } from "./helpers/mockAuth";
import { mockAnalyses } from "./helpers/mockApi";
import { analysisHistory } from "./fixtures/mockResponses";

test.describe("Dashboard - authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
  });

  test("shows analysis history", async ({ page }) => {
    await mockAnalyses(page, analysisHistory);
    await page.goto("/dashboard");
    await expect(page.getByText("test-repo")).toBeVisible();
    await expect(page.getByText("another-repo")).toBeVisible();
  });

  test("shows status badges", async ({ page }) => {
    await mockAnalyses(page, analysisHistory);
    await page.goto("/dashboard");
    await expect(page.getByText("completed")).toBeVisible();
    await expect(page.getByText("failed")).toBeVisible();
  });

  test("shows tech stack badges", async ({ page }) => {
    await mockAnalyses(page, analysisHistory);
    await page.goto("/dashboard");
    await expect(page.getByText("TypeScript")).toBeVisible();
  });

  test("click analysis navigates to detail page", async ({ page }) => {
    await mockAnalyses(page, analysisHistory);
    await page.goto("/dashboard");
    await page.getByText("test-repo").click();
    await page.waitForURL(/\/analysis\/analysis-1/);
    expect(page.url()).toContain("/analysis/analysis-1");
  });

  test("empty state shows message and button", async ({ page }) => {
    await mockAnalyses(page, []);
    await page.goto("/dashboard");
    await expect(page.getByText("No analyses yet")).toBeVisible();
    await expect(page.getByRole("button", { name: /Analyze your first repo/ })).toBeVisible();
  });

  test("New Analysis button navigates to home", async ({ page }) => {
    await mockAnalyses(page, []);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "New Analysis" }).click();
    await page.waitForURL("/");
    expect(page.url()).toContain("/");
  });

  test("shows user info and sign out", async ({ page }) => {
    await mockAnalyses(page, []);
    await page.goto("/dashboard");
    await expect(page.getByText("Test User", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});

test.describe("Dashboard - unauthenticated", () => {
  test("redirects to login", async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });
});
