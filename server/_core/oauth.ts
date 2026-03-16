import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { sdk } from "./sdk";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  /**
   * 🚀 DEVELOPMENT BYPASS ROUTE
   * Visit http://localhost:3007/api/auth/bypass to manually log in
   */
  app.get("/api/auth/bypass", async (req: Request, res: Response) => {
    try {
      const mockOpenId = "dev-user-123";
      
      // 1. Create/Update a dummy user in your Aiven MySQL
      await db.upsertUser({
        openId: mockOpenId,
        name: "Dev Admin",
        email: "admin@localhost",
        loginMethod: "bypass",
        lastSignedIn: new Date(),
      });

      // 2. Generate a session token
      const sessionToken = await sdk.createSessionToken(mockOpenId, {
        name: "Dev Admin",
        expiresInMs: ONE_YEAR_MS,
      });

      // 3. Set the cookie exactly like the real OAuth flow
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log("[Auth] Bypass successful. Redirecting to Dashboard...");
      res.redirect("/");
    } catch (error) {
      console.error("[Auth] Bypass failed", error);
      res.status(500).send("Bypass failed. Check database connection.");
    }
  });

  // Keep your existing /api/oauth/callback below for later use
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    // ... (rest of your existing code)
  });
}