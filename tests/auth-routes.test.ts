import request from "supertest";

// Use dynamic import to avoid top-level await issues in Jest
let app;

beforeAll(async () => {
  const { createTestApp } = await import("../server/test-app");
  app = await createTestApp();
});

describe("Auth and OAuth endpoint integration", () => {
  it("GET /auth/test should return 200 and expected JSON", async () => {
    const res = await request(app).get("/auth/test");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Auth routing is working");
    expect(res.body).toHaveProperty("timestamp");
    expect(new Date(res.body.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("GET /api/oauth/debug should return 200 and contain keys", async () => {
    const res = await request(app).get("/api/oauth/debug");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("baseUrl");
    expect(res.body).toHaveProperty("environment");
    expect(res.body).toHaveProperty("callbackUrls");
    expect(res.body.callbackUrls).toHaveProperty("google");
    expect(res.body.callbackUrls).toHaveProperty("github");
    expect(res.body.callbackUrls).toHaveProperty("microsoft");
    expect(res.body.callbackUrls).toHaveProperty("linkedin");
  });

  it("GET /auth/google should redirect to Google OAuth provider", async () => {
    const res = await request(app).get("/auth/google").redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers).toHaveProperty("location");
    expect(res.headers.location).toContain("accounts.google.com");
  });

  it("GET /auth/github should redirect to GitHub OAuth provider", async () => {
    const res = await request(app).get("/auth/github").redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers).toHaveProperty("location");
    expect(res.headers.location).toContain("github.com");
  });
});