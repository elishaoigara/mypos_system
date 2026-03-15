import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

/**
 * Creates a mock context for an admin user.
 * Admin role is required for product CRUD, transaction listing, analytics, and kiosk management.
 */
function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@store.co.ke",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

/**
 * Creates a mock context for a regular (non-admin) user.
 */
function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

/**
 * Creates a mock context for an unauthenticated visitor.
 */
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ──────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns the user when authenticated", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("admin-user");
    expect(result?.role).toBe("admin");
  });

  it("returns null when not authenticated", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

// ─── Product Router Tests ────────────────────────────────────────────

describe("product router", () => {
  describe("product.list (public)", () => {
    it("can be called without authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      // Should not throw - product listing is public
      const result = await caller.product.list();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("accepts search and pagination parameters", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.product.list({
        search: "test",
        limit: 5,
        offset: 0,
        activeOnly: true,
      });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });
  });

  describe("product.create (admin only)", () => {
    it("rejects unauthenticated users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.product.create({
          name: "Test Product",
          barcode: "1234567890123",
          price: "100.00",
          stock: 50,
        })
      ).rejects.toThrow();
    });

    it("rejects regular users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.product.create({
          name: "Test Product",
          barcode: "1234567890123",
          price: "100.00",
          stock: 50,
        })
      ).rejects.toThrow();
    });

    it("validates price format", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.product.create({
          name: "Test Product",
          barcode: "1234567890123",
          price: "abc",
          stock: 50,
        })
      ).rejects.toThrow();
    });

    it("validates required fields", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.product.create({
          name: "",
          barcode: "1234567890123",
          price: "100.00",
          stock: 50,
        })
      ).rejects.toThrow();
    });
  });

  describe("product.delete (admin only)", () => {
    it("rejects non-admin users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.product.delete({ id: 1 })).rejects.toThrow();
    });
  });

  describe("product.lowStock (admin only)", () => {
    it("rejects non-admin users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.product.lowStock()).rejects.toThrow();
    });
  });
});

// ─── Transaction Router Tests ────────────────────────────────────────

describe("transaction router", () => {
  describe("transaction.create (public)", () => {
    it("validates that items array is not empty", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.transaction.create({
          items: [],
          paymentMethod: "cash",
        })
      ).rejects.toThrow();
    });

    it("validates payment method enum", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.transaction.create({
          items: [{ productId: 1, quantity: 1 }],
          paymentMethod: "bitcoin" as any,
        })
      ).rejects.toThrow();
    });

    it("validates quantity is at least 1", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.transaction.create({
          items: [{ productId: 1, quantity: 0 }],
          paymentMethod: "cash",
        })
      ).rejects.toThrow();
    });
  });

  describe("transaction.list (admin only)", () => {
    it("rejects unauthenticated users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.transaction.list()).rejects.toThrow();
    });

    it("rejects regular users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.transaction.list()).rejects.toThrow();
    });

    it("allows admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.transaction.list();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });
  });

  describe("transaction.getById (protected)", () => {
    it("rejects unauthenticated users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.transaction.getById({ id: 1 })).rejects.toThrow();
    });
  });
});

// ─── Analytics Router Tests ──────────────────────────────────────────

describe("analytics router", () => {
  describe("analytics.stats (admin only)", () => {
    it("rejects non-admin users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.analytics.stats()).rejects.toThrow();
    });

    it("returns stats for admin", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.analytics.stats();
      expect(result).toHaveProperty("totalSales");
      expect(result).toHaveProperty("totalTransactions");
      expect(result).toHaveProperty("totalItems");
      expect(result).toHaveProperty("avgTransaction");
    });
  });

  describe("analytics.dailySales (admin only)", () => {
    it("rejects non-admin users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.analytics.dailySales()).rejects.toThrow();
    });

    it("returns daily sales data for admin", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.analytics.dailySales({ days: 7 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("analytics.topProducts (admin only)", () => {
    it("rejects non-admin users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.analytics.topProducts()).rejects.toThrow();
    });

    it("returns top products for admin", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.analytics.topProducts({ limit: 5 });
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

// ─── Kiosk Router Tests ──────────────────────────────────────────────

describe("kiosk router", () => {
  describe("kiosk.list (admin only)", () => {
    it("rejects non-admin users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.kiosk.list()).rejects.toThrow();
    });

    it("returns kiosk list for admin", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.kiosk.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("kiosk.create (admin only)", () => {
    it("rejects non-admin users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.kiosk.create({ name: "Test Kiosk" })
      ).rejects.toThrow();
    });

    it("validates required name field", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.kiosk.create({ name: "" })
      ).rejects.toThrow();
    });
  });

  describe("kiosk.updateStatus (admin only)", () => {
    it("rejects non-admin users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.kiosk.updateStatus({ id: 1, status: "online" })
      ).rejects.toThrow();
    });

    it("validates status enum", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.kiosk.updateStatus({ id: 1, status: "broken" as any })
      ).rejects.toThrow();
    });
  });
});

// ─── Currency Utility Tests ──────────────────────────────────────────

describe("currency formatting", () => {
  // Import directly since it's a shared utility
  it("formats KSh correctly", async () => {
    const { formatKSh, formatKShShort } = await import("../shared/currency");

    expect(formatKSh(1500)).toBe("KSh 1,500.00");
    expect(formatKSh(0)).toBe("KSh 0.00");
    expect(formatKSh("249.5")).toBe("KSh 249.50");
    expect(formatKSh("invalid")).toBe("KSh 0.00");

    expect(formatKShShort(1500)).toBe("KSh 1,500");
    expect(formatKShShort(0)).toBe("KSh 0");
  });
});
