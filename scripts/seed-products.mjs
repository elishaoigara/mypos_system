/**
 * Seed Script — Kenyan Supermarket Products
 *
 * Run with:  node scripts/seed-products.mjs
 *
 * Prerequisites:
 *   - MySQL running with the pos_db database created
 *   - DATABASE_URL set in your .env file
 *   - Tables already created (run: pnpm drizzle-kit push)
 *
 * This script inserts sample products commonly found in Kenyan supermarkets
 * with realistic barcodes and KSh prices.
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";

config(); // Load .env

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env file");
  console.error("   Create a .env file with: DATABASE_URL=mysql://root:password@localhost:3306/pos_db");
  process.exit(1);
}

const products = [
  // ─── Beverages ──────────────────────────────────────────
  { name: "Tusker Lager 500ml", barcode: "5901234123457", price: "250.00", category: "Beverages", stock: 200 },
  { name: "Coca-Cola 500ml", barcode: "5449000000996", price: "70.00", category: "Beverages", stock: 300 },
  { name: "Fanta Orange 500ml", barcode: "5449000014535", price: "70.00", category: "Beverages", stock: 250 },
  { name: "Sprite 500ml", barcode: "5449000004840", price: "70.00", category: "Beverages", stock: 250 },
  { name: "Ketepa Tea 100 bags", barcode: "6161100000123", price: "350.00", category: "Beverages", stock: 80 },
  { name: "Nescafe Classic 100g", barcode: "7613036270670", price: "580.00", category: "Beverages", stock: 60 },
  { name: "Highlands Water 1L", barcode: "6161100200015", price: "50.00", category: "Beverages", stock: 400 },
  { name: "Alvaro Pear 330ml", barcode: "5449000253828", price: "120.00", category: "Beverages", stock: 150 },

  // ─── Dairy ──────────────────────────────────────────────
  { name: "Brookside Fresh Milk 500ml", barcode: "6161100300012", price: "65.00", category: "Dairy", stock: 100 },
  { name: "Brookside Fresh Milk 1L", barcode: "6161100300029", price: "120.00", category: "Dairy", stock: 80 },
  { name: "KCC Butter 250g", barcode: "6161100400019", price: "320.00", category: "Dairy", stock: 50 },
  { name: "Molo Milk UHT 500ml", barcode: "6161100400026", price: "75.00", category: "Dairy", stock: 120 },
  { name: "Brookside Yoghurt 250ml", barcode: "6161100300036", price: "80.00", category: "Dairy", stock: 90 },

  // ─── Bakery & Cereals ──────────────────────────────────
  { name: "Broadways White Bread", barcode: "6161100500013", price: "60.00", category: "Bakery", stock: 150 },
  { name: "Supa Loaf Bread 400g", barcode: "6161100500020", price: "55.00", category: "Bakery", stock: 120 },
  { name: "Unga Jogoo 2kg", barcode: "6161100600017", price: "180.00", category: "Cereals", stock: 100 },
  { name: "Weetabix 210g", barcode: "5010029200102", price: "350.00", category: "Cereals", stock: 60 },
  { name: "Corn Flakes Kelloggs 500g", barcode: "5053827175418", price: "650.00", category: "Cereals", stock: 40 },

  // ─── Cooking & Oils ────────────────────────────────────
  { name: "Kimbo Cooking Fat 1kg", barcode: "6161100700014", price: "350.00", category: "Cooking", stock: 80 },
  { name: "Golden Fry Cooking Oil 1L", barcode: "6161100700021", price: "280.00", category: "Cooking", stock: 100 },
  { name: "Royco Mchuzi Mix Beef", barcode: "6161100700038", price: "10.00", category: "Cooking", stock: 500 },
  { name: "Omo Multi Active 1kg", barcode: "6161100800011", price: "280.00", category: "Household", stock: 70 },
  { name: "Mumias Sugar 1kg", barcode: "6161100700045", price: "160.00", category: "Cooking", stock: 120 },
  { name: "Dormans Fine Coffee 100g", barcode: "6161100700052", price: "450.00", category: "Beverages", stock: 45 },

  // ─── Snacks ────────────────────────────────────────────
  { name: "Cadbury Dairy Milk 100g", barcode: "7622210100146", price: "200.00", category: "Snacks", stock: 100 },
  { name: "Tropical Heat Crisps 100g", barcode: "6161100900018", price: "120.00", category: "Snacks", stock: 150 },
  { name: "Orbit Chewing Gum", barcode: "5000159461122", price: "50.00", category: "Snacks", stock: 200 },
  { name: "Digestive Biscuits 400g", barcode: "5000168002118", price: "250.00", category: "Snacks", stock: 80 },

  // ─── Personal Care ─────────────────────────────────────
  { name: "Colgate Toothpaste 100ml", barcode: "8901314010100", price: "180.00", category: "Personal Care", stock: 90 },
  { name: "Dettol Soap 175g", barcode: "6161101000015", price: "120.00", category: "Personal Care", stock: 100 },
  { name: "Vaseline Jelly 100ml", barcode: "6161101000022", price: "200.00", category: "Personal Care", stock: 70 },
  { name: "Always Pads (10 pack)", barcode: "4015400259374", price: "150.00", category: "Personal Care", stock: 80 },

  // ─── Household ─────────────────────────────────────────
  { name: "Harpic Toilet Cleaner 500ml", barcode: "6161101100012", price: "250.00", category: "Household", stock: 60 },
  { name: "Sunlight Dish Soap 750ml", barcode: "6161101100029", price: "180.00", category: "Household", stock: 80 },
  { name: "Jik Bleach 750ml", barcode: "6161101100036", price: "150.00", category: "Household", stock: 90 },
  { name: "Tissue Paper (10 pack)", barcode: "6161101100043", price: "350.00", category: "Household", stock: 100 },

  // ─── Fresh Produce (weighed items) ─────────────────────
  { name: "Bananas (per kg)", barcode: "2000000000017", price: "100.00", category: "Fresh Produce", stock: 200, weight: "1.000" },
  { name: "Tomatoes (per kg)", barcode: "2000000000024", price: "120.00", category: "Fresh Produce", stock: 150, weight: "1.000" },
  { name: "Onions (per kg)", barcode: "2000000000031", price: "80.00", category: "Fresh Produce", stock: 180, weight: "1.000" },
  { name: "Potatoes (per kg)", barcode: "2000000000048", price: "70.00", category: "Fresh Produce", stock: 250, weight: "1.000" },
  { name: "Sukuma Wiki (bunch)", barcode: "2000000000055", price: "30.00", category: "Fresh Produce", stock: 300 },
];

async function seed() {
  console.log("🌱 Seeding Kenyan supermarket products...\n");

  const connection = await mysql.createConnection(DATABASE_URL);

  let inserted = 0;
  let skipped = 0;

  for (const product of products) {
    try {
      // Check if barcode already exists
      const [existing] = await connection.execute(
        "SELECT id FROM products WHERE barcode = ?",
        [product.barcode]
      );

      if (Array.isArray(existing) && existing.length > 0) {
        console.log(`  ⏭  Skipped (exists): ${product.name}`);
        skipped++;
        continue;
      }

      await connection.execute(
        `INSERT INTO products (name, barcode, price, category, stock, weight, isActive)
         VALUES (?, ?, ?, ?, ?, ?, true)`,
        [
          product.name,
          product.barcode,
          product.price,
          product.category,
          product.stock,
          product.weight ?? null,
        ]
      );

      console.log(`  ✅ Inserted: ${product.name} — KSh ${product.price}`);
      inserted++;
    } catch (err) {
      console.error(`  ❌ Failed: ${product.name} — ${err.message}`);
    }
  }

  console.log(`\n📊 Summary: ${inserted} inserted, ${skipped} skipped (already existed)`);
  console.log(`   Total products in seed: ${products.length}`);

  await connection.end();
  console.log("\n✅ Seed complete. You can now test barcode scanning in the kiosk.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
