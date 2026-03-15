import { eq, desc, sql, like, and, gte, lte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  products,
  InsertProduct,
  Product,
  transactions,
  InsertTransaction,
  transactionItems,
  InsertTransactionItem,
  kiosks,
  InsertKiosk,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User Helpers ────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Product Helpers ─────────────────────────────────────────────────

export async function getProducts(opts?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts?.activeOnly !== false) {
    conditions.push(eq(products.isActive, true));
  }
  if (opts?.search) {
    conditions.push(
      sql`(${products.name} LIKE ${`%${opts.search}%`} OR ${products.barcode} LIKE ${`%${opts.search}%`})`
    );
  }
  if (opts?.category) {
    conditions.push(eq(products.category, opts.category));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.updatedAt))
      .limit(opts?.limit ?? 50)
      .offset(opts?.offset ?? 0),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0 };
}

export async function getProductByBarcode(barcode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(products)
    .where(and(eq(products.barcode, barcode), eq(products.isActive, true)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProduct(product: Omit<InsertProduct, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(product);
  return { id: result[0].insertId };
}

export async function updateProduct(
  id: number,
  data: Partial<Omit<InsertProduct, "id" | "createdAt">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete
  await db.update(products).set({ isActive: false }).where(eq(products.id, id));
}

export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(and(eq(products.isActive, true), sql`${products.category} IS NOT NULL`));
  return result.map((r) => r.category).filter(Boolean) as string[];
}

export async function updateStock(productId: number, quantityChange: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(products)
    .set({ stock: sql`${products.stock} + ${quantityChange}` })
    .where(eq(products.id, productId));
}

// ─── Transaction Helpers ─────────────────────────────────────────────

export async function createTransaction(
  transaction: Omit<InsertTransaction, "id">,
  items: Omit<InsertTransactionItem, "id" | "transactionId">[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate receipt number
  const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const result = await db.insert(transactions).values({
    ...transaction,
    receiptNumber,
    itemCount: items.length,
  });

  const transactionId = result[0].insertId;

  // Insert items
  if (items.length > 0) {
    await db.insert(transactionItems).values(
      items.map((item) => ({
        ...item,
        transactionId,
      }))
    );
  }

  // Decrease stock for each item
  for (const item of items) {
    await db
      .update(products)
      .set({ stock: sql`${products.stock} - ${item.quantity}` })
      .where(eq(products.id, item.productId));
  }

  return { id: transactionId, receiptNumber };
}

export async function getTransactions(opts?: {
  limit?: number;
  offset?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts?.status) {
    conditions.push(eq(transactions.paymentStatus, opts.status as any));
  }
  if (opts?.startDate) {
    conditions.push(gte(transactions.createdAt, opts.startDate));
  }
  if (opts?.endDate) {
    conditions.push(lte(transactions.createdAt, opts.endDate));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.createdAt))
      .limit(opts?.limit ?? 50)
      .offset(opts?.offset ?? 0),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transactions)
      .where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0 };
}

export async function getTransactionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [txResult, itemsResult] = await Promise.all([
    db.select().from(transactions).where(eq(transactions.id, id)).limit(1),
    db.select().from(transactionItems).where(eq(transactionItems.transactionId, id)),
  ]);
  if (txResult.length === 0) return undefined;
  return { ...txResult[0], items: itemsResult };
}

export async function updateTransactionStatus(
  id: number,
  status: "pending" | "completed" | "failed" | "refunded",
  paymentReference?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { paymentStatus: status };
  if (paymentReference) updateData.paymentReference = paymentReference;
  if (status === "completed") updateData.completedAt = new Date();
  await db.update(transactions).set(updateData).where(eq(transactions.id, id));
}

// ─── Sales Analytics ─────────────────────────────────────────────────

export async function getSalesStats(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return { totalSales: 0, totalTransactions: 0, totalItems: 0, avgTransaction: 0 };

  const conditions = [eq(transactions.paymentStatus, "completed")];
  if (startDate) conditions.push(gte(transactions.createdAt, startDate));
  if (endDate) conditions.push(lte(transactions.createdAt, endDate));

  const where = and(...conditions);

  const result = await db
    .select({
      totalSales: sql<number>`COALESCE(SUM(${transactions.totalAmount}), 0)`,
      totalTransactions: sql<number>`COUNT(*)`,
      totalItems: sql<number>`COALESCE(SUM(${transactions.itemCount}), 0)`,
      avgTransaction: sql<number>`COALESCE(AVG(${transactions.totalAmount}), 0)`,
    })
    .from(transactions)
    .where(where);

  return result[0] ?? { totalSales: 0, totalTransactions: 0, totalItems: 0, avgTransaction: 0 };
}

export async function getDailySales(days: number = 7) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await db
    .select({
      date: sql<string>`DATE(${transactions.createdAt})`.as("sale_date"),
      totalSales: sql<number>`COALESCE(SUM(${transactions.totalAmount}), 0)`.as("total_sales"),
      transactionCount: sql<number>`COUNT(*)`.as("tx_count"),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.paymentStatus, "completed"),
        gte(transactions.createdAt, startDate)
      )
    )
    .groupBy(sql`sale_date`)
    .orderBy(sql`sale_date`);

  return result;
}

export async function getTopProducts(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      productId: transactionItems.productId,
      productName: transactionItems.productName,
      totalQuantity: sql<number>`SUM(${transactionItems.quantity})`,
      totalRevenue: sql<number>`SUM(${transactionItems.totalPrice})`,
    })
    .from(transactionItems)
    .groupBy(transactionItems.productId, transactionItems.productName)
    .orderBy(desc(sql`SUM(${transactionItems.quantity})`))
    .limit(limit);

  return result;
}

export async function getLowStockProducts(threshold: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(products)
    .where(and(eq(products.isActive, true), lte(products.stock, threshold)))
    .orderBy(products.stock);
}

// ─── Kiosk Helpers ───────────────────────────────────────────────────

export async function getKiosks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kiosks).orderBy(kiosks.id);
}

export async function createKiosk(kiosk: Omit<InsertKiosk, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(kiosks).values(kiosk);
  return { id: result[0].insertId };
}

export async function updateKioskStatus(
  id: number,
  status: "online" | "offline" | "maintenance"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(kiosks)
    .set({ status, lastActive: new Date() })
    .where(eq(kiosks.id, id));
}
