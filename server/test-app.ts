import express from "express";
import { registerRoutes } from "./routes";
import cors from "cors";

// Minimal test app for Supertest/Jest
export async function createTestApp() {
  const app = express();

  // CORS (match main server for test consistency)
  app.use(cors({
    origin: "*",
    credentials: true,
    optionsSuccessStatus: 200
  }));

  app.use(express.json({ limit: "2gb" }));
  app.use(express.urlencoded({ extended: false, limit: "2gb" }));

  await registerRoutes(app);

  return app;
}