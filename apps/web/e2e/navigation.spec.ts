import { test, expect } from "@playwright/test";
import { mockAuthenticated, mockUnauthenticated } from "./helpers/mockAuth";
import { mockAnalyses, mockResults } from "./helpers/mockApi";
import { completedAnalysis, analysisHistory } from "./fixtures/mockResponses";

test.describe("Navigation flows", () => {
  test("home -> login page via Sign in button", async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Sign in" }).click();
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("home -> dashboard when authenticated", async ({ page }) => {
    await mockAuthenticated(page);
    await mockAnalyses(page, []);
    await page.goto("/");
    await page.getByRole("button", { name: "Dashboard" }).click();
    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain("/dashboard");
  });

  test("dashboard -> analysis -> back to dashboard", async ({ page }) => {
    await mockAuthenticated(page);
    await mockAnalyses(page, analysisHistory);
    await mockResults(page, completedAnalysis);

    await page.goto("/dashboard");
    await page.getByText("test-repo").click();
    await page.waitForURL(/\/analysis/);

    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain("/dashboard");
  });

  test("direct URL access to analysis works", async ({ page }) => {
    await mockAuthenticated(page);
    await mockResults(page, completedAnalysis);
    await page.goto("/analysis/analysis-1");
    await expect(page.getByText("test-repo")).toBeVisible();
  });

  test("sign out redirects to home", async ({ page }) => {
    await mockAuthenticated(page);
    await mockAnalyses(page, []);
    await page.goto("/dashboard");

    await page.route("**/api/auth/signout", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "/" }) }),
    );

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/", { timeout: 5000 });
  });
});
