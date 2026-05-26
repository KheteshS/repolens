import { Page } from "@playwright/test";

const authenticatedSession = {
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    image: "https://avatars.githubusercontent.com/u/1?v=4",
    provider: "github",
    githubAccessToken: "ghp_test_token_123",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export async function mockAuthenticated(page: Page) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(authenticatedSession) }),
  );
  await page.route("**/api/auth/providers", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        google: { id: "google", name: "Google", type: "oauth" },
        github: { id: "github", name: "GitHub", type: "oauth" },
      }),
    }),
  );
  await page.route("**/api/auth/csrf", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "mock-csrf-token" }),
    }),
  );
  await page.route("**/api/auth/_log", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
}

export async function mockUnauthenticated(page: Page) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) }),
  );
  await page.route("**/api/auth/providers", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        google: { id: "google", name: "Google", type: "oauth" },
        github: { id: "github", name: "GitHub", type: "oauth" },
      }),
    }),
  );
  await page.route("**/api/auth/csrf", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "mock-csrf-token" }),
    }),
  );
  await page.route("**/api/auth/_log", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
}
