import { test, expect } from "@playwright/test";
import { mockAuthenticated } from "./helpers/mockAuth";
import { mockJobStatus, mockResults } from "./helpers/mockApi";
import { completedAnalysis } from "./fixtures/mockResponses";

test.describe("Analysis page - polling", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
  });

  test("shows progress bar during analysis", async ({ page }) => {
    await mockJobStatus(page, "active", 45);
    await page.goto("/analysis/analysis-1?jobId=job-1");
    await expect(page.getByText("Analyzing repository")).toBeVisible();
    await expect(page.getByText("45%")).toBeVisible();
  });

  test("shows error state when job fails", async ({ page }) => {
    await mockJobStatus(page, "failed", 25, { failedReason: "Clone timeout" });
    await page.goto("/analysis/analysis-1?jobId=job-1");
    await expect(page.getByText("Analysis failed").first()).toBeVisible();
  });

  test("try another repo link visible on error", async ({ page }) => {
    await mockJobStatus(page, "failed", 0, { error: "Not found" });
    await page.goto("/analysis/analysis-1?jobId=job-1");
    await expect(page.getByText("Try another repository")).toBeVisible();
  });
});

test.describe("Analysis page - completed", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockResults(page, completedAnalysis);
    await page.goto("/analysis/analysis-1");
  });

  test("shows repo name in header", async ({ page }) => {
    await expect(page.getByText("test-repo")).toBeVisible();
  });

  test("overview tab shows tech stack", async ({ page }) => {
    await expect(page.getByText("TypeScript", { exact: true }).first()).toBeVisible();
  });

  test("overview tab shows file count", async ({ page }) => {
    await expect(page.locator("text=Files").first()).toBeVisible();
  });

  test("can navigate to Dependencies tab", async ({ page }) => {
    await page.getByRole("complementary").getByRole("button", { name: "Dependencies" }).click();
    await expect(page.getByTestId("rf__wrapper")).toBeVisible({ timeout: 5000 });
  });

  test("can navigate to Call Graph tab", async ({ page }) => {
    await page.getByRole("complementary").getByRole("button", { name: "Call Graph" }).click();
    await expect(page.getByTestId("rf__wrapper")).toBeVisible({ timeout: 5000 });
  });

  test("can navigate to Architecture tab", async ({ page }) => {
    await page.getByRole("complementary").getByRole("button", { name: "Architecture" }).click();
    await expect(page.getByTestId("rf__wrapper")).toBeVisible({ timeout: 5000 });
  });

  test("can navigate to File Tree tab", async ({ page }) => {
    await page.getByRole("complementary").getByRole("button", { name: "File Tree" }).click();
    await expect(page.getByText("index.ts")).toBeVisible();
  });

  test("can navigate to Chat tab", async ({ page }) => {
    await page.getByRole("complementary").getByRole("button", { name: "Chat" }).click();
    await expect(page.getByPlaceholder(/Ask about/)).toBeVisible();
  });

  test("Dashboard link in header", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  });

  test("New Analysis link in header", async ({ page }) => {
    await expect(page.getByRole("link", { name: "New Analysis" })).toBeVisible();
  });
});
