import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, adminProcedure, router } from "./_core/trpc";
import * as db from "./db";

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
    .mutation(async ({ input }) => {
      return await db.createKiosk(input);
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["online", "offline", "maintenance"]),
      })
    )
    .mutation(({ input }) => db.updateKioskStatus(input.id, input.status)),
});

// ─── Product Router (For Barcode Scanner) ───────────────────────────
const productRouter = router({
  getByBarcode: publicProcedure
    .input(z.object({ barcode: z.string().min(1) }))
    .query(async ({ input }) => {
      const product = await db.getProductByBarcode(input.barcode);
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }
      return product;
    }),
    
  list: publicProcedure.query(() => db.getProducts({})),
});

export const appRouter = router({
  product: productRouter,
  kiosk: kioskRouter,
});

export type AppRouter = typeof appRouter;