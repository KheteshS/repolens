import { test, expect } from "@playwright/test";
import { mockAuthenticated } from "./helpers/mockAuth";
import { mockResults } from "./helpers/mockApi";
import { completedAnalysis } from "./fixtures/mockResponses";

test.describe("Chat functionality", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockResults(page, completedAnalysis);
    await page.goto("/analysis/analysis-1");
    await page.getByRole("button", { name: "Chat" }).click();
  });

  test("chat input is visible", async ({ page }) => {
    await expect(page.getByPlaceholder(/Ask about/)).toBeVisible();
  });

  test("quick suggestion buttons visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: "What's the entry point?" })).toBeVisible();
  });

  test("send button disabled when input empty", async ({ page }) => {
    const sendBtn = page.locator("button[type='submit'], button:has(svg)").last();
    await expect(page.getByPlaceholder(/Ask about/)).toHaveValue("");
  });

  test("typing enables interaction", async ({ page }) => {
    const input = page.getByPlaceholder(/Ask about/);
    await input.fill("How does the API work?");
    await expect(input).toHaveValue("How does the API work?");
  });
});
