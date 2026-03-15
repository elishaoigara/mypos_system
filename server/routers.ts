import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

// ─── Admin guard ─────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ─── Product Router ──────────────────────────────────────────────────
const productRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          category: z.string().optional(),
          activeOnly: z.boolean().optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(({ input }) => db.getProducts(input ?? {})),

  getByBarcode: publicProcedure
    .input(z.object({ barcode: z.string().min(1) }))
    .query(async ({ input }) => {
      const product = await db.getProductByBarcode(input.barcode);
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }
      return product;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const product = await db.getProductById(input.id);
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }
      return product;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        barcode: z.string().min(1).max(128),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
        weight: z.string().regex(/^\d+(\.\d{1,3})?$/).optional(),
        category: z.string().max(128).optional(),
        stock: z.number().int().min(0).default(0),
        description: z.string().optional(),
        imageUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check for duplicate barcode
      const existing = await db.getProductByBarcode(input.barcode);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A product with this barcode already exists",
        });
      }
      return db.createProduct(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        barcode: z.string().min(1).max(128).optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        weight: z.string().regex(/^\d+(\.\d{1,3})?$/).nullish(),
        category: z.string().max(128).nullish(),
        stock: z.number().int().min(0).optional(),
        description: z.string().nullish(),
        imageUrl: z.string().url().nullish(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateProduct(id, data as any);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteProduct(input.id);
      return { success: true };
    }),

  categories: publicProcedure.query(() => db.getCategories()),

  updateStock: adminProcedure
    .input(
      z.object({
        productId: z.number(),
        quantityChange: z.number().int(),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateStock(input.productId, input.quantityChange);
      return { success: true };
    }),

  lowStock: adminProcedure
    .input(z.object({ threshold: z.number().int().min(0).default(10) }).optional())
    .query(({ input }) => db.getLowStockProducts(input?.threshold ?? 10)),
});

// ─── Transaction Router ──────────────────────────────────────────────
const transactionRouter = router({
  create: publicProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            productId: z.number(),
            quantity: z.number().int().min(1),
          })
        ).min(1),
        paymentMethod: z.enum(["cash", "card", "mpesa", "stripe"]),
        kioskId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Look up each product and validate stock
      const itemDetails = [];
      let totalAmount = 0;

      for (const item of input.items) {
        const product = await db.getProductById(item.productId);
        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Product #${item.productId} not found`,
          });
        }
        if (!product.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Product "${product.name}" is not available`,
          });
        }
        if (product.stock < item.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient stock for "${product.name}" (available: ${product.stock})`,
          });
        }

        const unitPrice = parseFloat(product.price as string);
        const totalPrice = unitPrice * item.quantity;
        totalAmount += totalPrice;

        itemDetails.push({
          productId: product.id,
          productName: product.name,
          productBarcode: product.barcode,
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
        });
      }

      const result = await db.createTransaction(
        {
          totalAmount: totalAmount.toFixed(2),
          paymentMethod: input.paymentMethod,
          paymentStatus: "completed",
          kioskId: input.kioskId,
          notes: input.notes,
          completedAt: new Date(),
        },
        itemDetails
      );

      return result;
    }),

  list: adminProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
          status: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(({ input }) => db.getTransactions(input ?? {})),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const transaction = await db.getTransactionById(input.id);
      if (!transaction) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
      }
      return transaction;
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "completed", "failed", "refunded"]),
        paymentReference: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateTransactionStatus(input.id, input.status, input.paymentReference);
      return { success: true };
    }),
});

// ─── Analytics Router ────────────────────────────────────────────────
const analyticsRouter = router({
  stats: adminProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(({ input }) => db.getSalesStats(input?.startDate, input?.endDate)),

  dailySales: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(7) }).optional())
    .query(({ input }) => db.getDailySales(input?.days ?? 7)),

  topProducts: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }).optional())
    .query(({ input }) => db.getTopProducts(input?.limit ?? 10)),
});

// ─── Kiosk Router ────────────────────────────────────────────────────
const kioskRouter = router({
  list: adminProcedure.query(() => db.getKiosks()),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        location: z.string().max(255).optional(),
      })
    )
    .mutation(({ input }) => db.createKiosk(input)),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["online", "offline", "maintenance"]),
      })
    )
    .mutation(({ input }) => db.updateKioskStatus(input.id, input.status)),
});

// ─── App Router ──────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  product: productRouter,
  transaction: transactionRouter,
  analytics: analyticsRouter,
  kiosk: kioskRouter,
});

export type AppRouter = typeof appRouter;
