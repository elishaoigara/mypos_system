import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  bigint,
  index,
  boolean,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Products ────────────────────────────────────────────────────────
export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    barcode: varchar("barcode", { length: 128 }).notNull().unique(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    weight: decimal("weight", { precision: 8, scale: 3 }),
    category: varchar("category", { length: 128 }),
    stock: int("stock").notNull().default(0),
    description: text("description"),
    imageUrl: text("imageUrl"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_products_barcode").on(table.barcode),
    index("idx_products_category").on(table.category),
    index("idx_products_isActive").on(table.isActive),
  ]
);

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── Kiosks ──────────────────────────────────────────────────────────
export const kiosks = mysqlTable("kiosks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  location: varchar("location", { length: 255 }),
  status: mysqlEnum("status", ["online", "offline", "maintenance"])
    .notNull()
    .default("offline"),
  lastActive: timestamp("lastActive"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Kiosk = typeof kiosks.$inferSelect;
export type InsertKiosk = typeof kiosks.$inferInsert;

// ─── Transactions ────────────────────────────────────────────────────
export const transactions = mysqlTable(
  "transactions",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Total amount in the store's currency */
    totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: mysqlEnum("paymentMethod", [
      "cash",
      "card",
      "mpesa",
      "stripe",
    ]).notNull(),
    paymentStatus: mysqlEnum("paymentStatus", [
      "pending",
      "completed",
      "failed",
      "refunded",
    ])
      .notNull()
      .default("pending"),
    /** External reference from payment provider */
    paymentReference: varchar("paymentReference", { length: 255 }),
    kioskId: int("kioskId"),
    cashierId: int("cashierId"),
    itemCount: int("itemCount").notNull().default(0),
    receiptNumber: varchar("receiptNumber", { length: 64 }),
    notes: text("notes"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_transactions_paymentStatus").on(table.paymentStatus),
    index("idx_transactions_createdAt").on(table.createdAt),
    index("idx_transactions_kioskId").on(table.kioskId),
    index("idx_transactions_receiptNumber").on(table.receiptNumber),
  ]
);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─── Transaction Items ───────────────────────────────────────────────
export const transactionItems = mysqlTable(
  "transaction_items",
  {
    id: int("id").autoincrement().primaryKey(),
    transactionId: int("transactionId").notNull(),
    productId: int("productId").notNull(),
    productName: varchar("productName", { length: 255 }).notNull(),
    productBarcode: varchar("productBarcode", { length: 128 }).notNull(),
    quantity: int("quantity").notNull().default(1),
    unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_transaction_items_transactionId").on(table.transactionId),
    index("idx_transaction_items_productId").on(table.productId),
  ]
);

export type TransactionItem = typeof transactionItems.$inferSelect;
export type InsertTransactionItem = typeof transactionItems.$inferInsert;
