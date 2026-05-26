import { test, expect } from "@playwright/test";
import { mockUnauthenticated } from "./helpers/mockAuth";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto("/login");
  });

  test("renders sign-in heading", async ({ page }) => {
    await expect(page.getByText("Sign in to RepoLens")).toBeVisible();
  });

  test("shows Google sign-in button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Continue with Google/ })).toBeVisible();
  });

  test("shows GitHub sign-in button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Continue with GitHub/ })).toBeVisible();
  });

  test("Google button triggers OAuth redirect", async ({ page }) => {
    await page.route("**/api/auth/signin/google**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" }),
    );
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/auth")),
      page.getByRole("button", { name: /Continue with Google/ }).click(),
    ]);
    expect(request.url()).toContain("auth");
  });

  test("GitHub button triggers OAuth redirect", async ({ page }) => {
    await page.route("**/api/auth/signin/github**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" }),
    );
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/auth")),
      page.getByRole("button", { name: /Continue with GitHub/ }).click(),
    ]);
    expect(request.url()).toContain("auth");
  });
});
