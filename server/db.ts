import { eq, desc, sql, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise"; // 🛠️ Crucial: must be /promise
import * as schema from "../drizzle/schema";

// 🛠️ Match exactly what drizzle() returns to resolve IDE errors
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // 🛠️ Use mysql2/promise to provide the '.promise' property
      const pool = mysql.createPool(process.env.DATABASE_URL);
      
      // 🛠️ FIX: Added mode: "default" to satisfy Drizzle config
      _db = drizzle(pool, { schema, mode: "default" });
      console.log("[Database] Connected successfully to Aiven MySQL");
    } catch (error) {
      console.error("[Database] Connection failed:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Kiosk Helpers ───────────────────────────────────────────────────

export async function getKiosks() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(schema.kiosks).orderBy(desc(schema.kiosks.id));
}

export async function createKiosk(kiosk: schema.InsertKiosk) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 🛠️ Performs the actual insert when you click 'Add Kiosk'
  const [result] = await db.insert(schema.kiosks).values({
    ...kiosk,
    status: kiosk.status ?? "offline",
    lastActive: new Date(),
  });
  
  return { id: result.insertId };
}

export async function updateKioskStatus(id: number, status: "online" | "offline" | "maintenance") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(schema.kiosks).set({ status, lastActive: new Date() }).where(eq(schema.kiosks.id, id));
}

// ─── Product Helpers (For Barcode Scanner) ──────────────────────────

export async function getProductByBarcode(barcode: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.barcode, barcode), eq(schema.products.isActive, true)))
    .limit(1);
  return result[0];
}

export async function getProducts(opts: any = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const items = await db.select().from(schema.products).where(eq(schema.products.isActive, true));
  return { items, total: items.length };
}