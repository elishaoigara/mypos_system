# Self-Checkout POS System

A full-stack Point-of-Sale and Inventory Management system built for the Kenyan retail market. It features an admin dashboard for store management and a standalone self-checkout kiosk interface for customers. All prices use **KSh (Kenyan Shilling)**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts |
| **Backend** | Node.js 22, Express 4, tRPC 11 |
| **Database** | MySQL (via Drizzle ORM) |
| **Testing** | Vitest (31 tests) |
| **Build** | Vite 7, esbuild, pnpm |

---

## Prerequisites

Before running this project locally, ensure you have the following installed:

| Tool | Version | Installation |
|---|---|---|
| **Node.js** | 18+ (recommended 22) | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 10+ | `npm install -g pnpm` |
| **MySQL** | 8.0+ | [mysql.com](https://dev.mysql.com/downloads/) or use XAMPP/WAMP |

---

## Quick Start (Local Development)

### Step 1: Clone and Install

```bash
# Navigate to the project folder
cd pos-checkout-system

# Install all dependencies
pnpm install
```

### Step 2: Set Up MySQL Database

Create a database in MySQL:

```sql
CREATE DATABASE pos_db;
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=mysql://root:your_password@localhost:3306/pos_db
JWT_SECRET=generate-a-random-32-char-string-here
```

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

See `docs/ENV_SETUP.md` for full environment variable documentation.

### Step 4: Create Database Tables

```bash
# Generate and run migrations
pnpm drizzle-kit push
```

### Step 5: Seed Sample Products

```bash
# Insert 40 Kenyan supermarket products with realistic barcodes
node scripts/seed-products.mjs
```

This adds products like Tusker Lager, Brookside Milk, Unga Jogoo, Coca-Cola, and more with real EAN-13 barcodes and KSh prices.

### Step 6: Start the Development Server

```bash
pnpm dev
```

The app will be available at **http://localhost:3000**.

---

## Application Routes

| Route | Interface | Description |
|---|---|---|
| `/` | Admin Dashboard | KPI cards, sales charts, top products, low stock alerts |
| `/products` | Admin Dashboard | Product CRUD, search, category filter, stock management |
| `/transactions` | Admin Dashboard | Transaction history, status filters, date range |
| `/analytics` | Admin Dashboard | Sales analytics with bar charts and reporting |
| `/kiosks` | Admin Dashboard | Kiosk terminal management |
| `/kiosk` | Self-Checkout Kiosk | Fullscreen customer-facing checkout interface |

---

## Hardware Integration

This system is designed to work with physical POS hardware. See `docs/HARDWARE_GUIDE.md` for detailed setup instructions.

### Barcode Scanner

Most USB barcode scanners work out of the box. They operate in HID keyboard mode, meaning they type the barcode digits and press Enter. The kiosk interface at `/kiosk` captures this input automatically.

**To test:** Open `/kiosk` in your browser, plug in a USB barcode scanner, and scan any product that exists in your database.

### Receipt Printer

Two options are available:

1. **Browser printing** (built-in): Click "Print Receipt" after checkout. Works with any printer.
2. **ESC/POS direct printing**: For thermal receipt printers, run the local print agent. See `docs/HARDWARE_GUIDE.md` for setup.

### Weighing Scale

For produce items priced by weight, connect a serial/USB scale via the scale agent. See `docs/HARDWARE_GUIDE.md`.

---

## Project Structure

```
pos-checkout-system/
├── client/                     # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx        # Admin dashboard overview
│   │   │   ├── Products.tsx    # Product management CRUD
│   │   │   ├── Transactions.tsx # Transaction history
│   │   │   ├── Analytics.tsx   # Sales analytics charts
│   │   │   ├── Kiosks.tsx      # Kiosk terminal management
│   │   │   └── KioskCheckout.tsx # Self-checkout kiosk (fullscreen)
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx # Sidebar navigation layout
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── lib/trpc.ts         # tRPC client binding
│   │   └── index.css           # Tailwind theme (teal/green palette)
│   └── index.html              # HTML shell with Inter font
├── server/
│   ├── db.ts                   # 18 database helper functions
│   ├── routers.ts              # 5 tRPC routers, 20 procedures
│   ├── pos.test.ts             # 30 POS-specific tests
│   ├── auth.logout.test.ts     # Auth test
│   └── _core/                  # Framework plumbing (do not edit)
├── drizzle/
│   ├── schema.ts               # 5 tables: users, products, kiosks, transactions, transaction_items
│   └── 0001_yellow_grim_reaper.sql # Migration SQL
├── shared/
│   └── currency.ts             # KSh formatting utilities
├── scripts/
│   └── seed-products.mjs       # Seed 40 Kenyan supermarket products
├── docs/
│   ├── ENV_SETUP.md            # Environment variable documentation
│   └── HARDWARE_GUIDE.md       # Barcode scanner, printer, scale setup
└── package.json
```

---

## API Reference

All API calls use tRPC (type-safe RPC). The frontend calls these directly via `trpc.*.useQuery()` and `trpc.*.useMutation()`.

### Product Endpoints

| Procedure | Type | Access | Description |
|---|---|---|---|
| `product.list` | Query | Public | Paginated product listing with search |
| `product.getByBarcode` | Query | Public | Lookup product by barcode |
| `product.getById` | Query | Public | Lookup product by ID |
| `product.create` | Mutation | Admin | Create new product |
| `product.update` | Mutation | Admin | Update product details |
| `product.delete` | Mutation | Admin | Soft-delete product |
| `product.categories` | Query | Public | List all categories |
| `product.updateStock` | Mutation | Admin | Adjust stock level |
| `product.lowStock` | Query | Admin | Products below threshold |

### Transaction Endpoints

| Procedure | Type | Access | Description |
|---|---|---|---|
| `transaction.create` | Mutation | Public | Process checkout (validates stock, calculates totals) |
| `transaction.list` | Query | Admin | Transaction history with filters |
| `transaction.getById` | Query | Protected | Transaction details with line items |
| `transaction.updateStatus` | Mutation | Admin | Update payment status |

### Analytics Endpoints

| Procedure | Type | Access | Description |
|---|---|---|---|
| `analytics.stats` | Query | Admin | Total sales, transactions, items, average |
| `analytics.dailySales` | Query | Admin | Daily sales for charting |
| `analytics.topProducts` | Query | Admin | Top-selling products |

### Kiosk Endpoints

| Procedure | Type | Access | Description |
|---|---|---|---|
| `kiosk.list` | Query | Admin | List all kiosks |
| `kiosk.create` | Mutation | Admin | Register new kiosk |
| `kiosk.updateStatus` | Mutation | Admin | Update kiosk status |

---

## Database Schema

Five tables with 9 performance indexes:

| Table | Key Columns | Purpose |
|---|---|---|
| `users` | id, openId, role, email | Authentication and access control |
| `products` | id, name, barcode (unique), price, stock, category | Product inventory |
| `transactions` | id, totalAmount, paymentMethod, paymentStatus, receiptNumber | Sales records |
| `transaction_items` | id, transactionId, productId, quantity, unitPrice, totalPrice | Line items per transaction |
| `kiosks` | id, name, location, status | Self-checkout terminal tracking |

---

## Running Tests

```bash
pnpm test
```

This runs 31 Vitest tests covering authentication, product CRUD authorization, transaction validation, analytics access control, kiosk management, and currency formatting.

---

## Scripts Reference

| Command | Description |
|---|---|
| `pnpm dev` | Start development server (http://localhost:3000) |
| `pnpm build` | Build for production |
| `pnpm start` | Run production build |
| `pnpm test` | Run all tests |
| `pnpm check` | TypeScript type checking |
| `pnpm drizzle-kit push` | Push schema changes to database |
| `node scripts/seed-products.mjs` | Seed sample Kenyan products |

---

## Payment Methods

The system supports four payment methods in the checkout flow:

| Method | Status | Notes |
|---|---|---|
| **Cash** | Ready | Marks transaction as completed immediately |
| **M-Pesa** | UI Ready | Payment selection wired; needs Safaricom Daraja API integration |
| **Card** | UI Ready | Payment selection wired; needs payment gateway integration |
| **Stripe** | UI Ready | Payment selection wired; needs Stripe API keys |

For M-Pesa STK Push integration, you will need a Safaricom Daraja API developer account at [developer.safaricom.co.ke](https://developer.safaricom.co.ke/).

---

## Deployment Options

### Option 1: Manus Hosting (Recommended)

The project is already configured for Manus hosting. Click the **Publish** button in the Manus UI to deploy instantly with database included.

### Option 2: Local Machine (For Hardware Demo)

Follow the Quick Start guide above. This is the recommended approach for connecting to physical POS hardware (barcode scanner, receipt printer, weighing scale).

### Option 3: VPS / Cloud Server

Deploy to any VPS (DigitalOcean, Linode, Hetzner) with Node.js and MySQL:

```bash
pnpm install
pnpm build
pnpm start
```

---

## License

MIT
