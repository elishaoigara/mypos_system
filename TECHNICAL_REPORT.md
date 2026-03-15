# Self-Checkout POS System — Complete Technical Report

**Project:** pos-checkout-system
**Author:** Manus AI
**Date:** 15 March 2026
**Target Market:** Kenya (KSh — Kenyan Shilling)

---

## 1. Executive Summary

This document provides a comprehensive technical report of the **Self-Checkout POS and Inventory Management System** that was built from scratch. The system is a full-stack web application designed for the Kenyan retail market, featuring an admin dashboard for store management and a standalone self-checkout kiosk interface for customers. It uses **TypeScript** end-to-end, with **React** on the frontend, **Express + tRPC** on the backend, **Drizzle ORM** for database access, and **MySQL** as the relational database. All prices and currency displays use **KSh (Kenyan Shilling)**.

---

## 2. Languages and Technologies Used

### 2.1 Programming Languages

| Language | Where Used | Purpose |
|---|---|---|
| **TypeScript** | Entire codebase (frontend + backend + shared + tests) | Primary language; provides static typing across the full stack |
| **SQL** | Migration files (`drizzle/*.sql`) | Database schema creation, indexes, and table definitions |
| **CSS** | `client/src/index.css` + Tailwind utility classes | Styling, theming, and responsive layout |
| **HTML** | `client/index.html` + receipt template in JSX | Entry point HTML shell and printable receipt markup |

TypeScript is the sole programming language used across every layer of the application. The project contains **zero JavaScript files** — everything is written in `.ts` or `.tsx` format, ensuring full type safety from the database schema through to the React components.

### 2.2 Frontend Stack

| Technology | Version | Role |
|---|---|---|
| **React** | 19.2.1 | UI component library and rendering engine |
| **Vite** | 7.1.7 | Build tool and development server with HMR |
| **Tailwind CSS** | 4.1.14 | Utility-first CSS framework for styling |
| **shadcn/ui** | (Radix-based) | Pre-built accessible UI component library |
| **wouter** | 3.3.5 | Lightweight client-side routing |
| **Recharts** | 2.15.2 | Charting library for sales analytics |
| **Lucide React** | 0.453.0 | Icon library used throughout the UI |
| **Framer Motion** | 12.23.22 | Animation library (available for micro-interactions) |
| **Sonner** | 2.0.7 | Toast notification system |
| **date-fns** | 4.1.0 | Date formatting and manipulation |
| **React Hook Form** | 7.64.0 | Form state management and validation |
| **Zod** | 4.1.12 | Schema validation (shared with backend) |
| **@tanstack/react-query** | 5.90.2 | Server state management and caching (via tRPC) |
| **next-themes** | 0.4.6 | Theme provider for light/dark mode support |

### 2.3 Backend Stack

| Technology | Version | Role |
|---|---|---|
| **Node.js** | 22.13.0 | Server runtime environment |
| **Express** | 4.21.2 | HTTP server framework |
| **tRPC** | 11.6.0 | End-to-end typesafe API layer (replaces REST) |
| **Drizzle ORM** | 0.44.5 | TypeScript-first SQL ORM for database operations |
| **mysql2** | 3.15.0 | MySQL database driver |
| **jose** | 6.1.0 | JWT token handling for authentication |
| **cookie** | 1.0.2 | HTTP cookie parsing for session management |
| **Superjson** | 1.13.3 | Serialization (preserves Date, BigInt, etc. over tRPC) |
| **nanoid** | 5.1.5 | Unique ID generation |

### 2.4 Database

| Component | Detail |
|---|---|
| **Engine** | MySQL (TiDB-compatible) |
| **ORM** | Drizzle ORM with `drizzle-kit` for migrations |
| **Migration strategy** | Schema-first: edit `drizzle/schema.ts`, generate SQL, apply via `webdev_execute_sql` |

### 2.5 Development and Testing Tools

| Tool | Version | Purpose |
|---|---|---|
| **Vitest** | 2.1.4 | Unit testing framework (31 tests, all passing) |
| **TypeScript** | 5.9.3 | Type checking across the full project |
| **tsx** | 4.19.1 | TypeScript execution for the dev server |
| **esbuild** | 0.25.0 | Production bundling for the server |
| **Drizzle Kit** | 0.31.4 | Database migration generation tool |
| **pnpm** | 10.4.1 | Package manager |
| **Prettier** | 3.6.2 | Code formatting |

### 2.6 Authentication

The system uses **Manus OAuth** for user authentication. The OAuth flow is handled by the framework's built-in `server/_core/oauth.ts` module, which drops a session cookie upon successful login. The `protectedProcedure` middleware in tRPC injects `ctx.user` into every authenticated request. An additional `adminProcedure` guard checks `ctx.user.role === "admin"` for admin-only operations.

---

## 3. Database Schema

The database consists of **5 tables** with **9 indexes** for query performance. All tables use auto-incrementing integer primary keys and timestamp tracking.

### 3.1 Table: `users`

Manages authentication and role-based access control.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Surrogate primary key |
| `openId` | VARCHAR(64) | NOT NULL, UNIQUE | Manus OAuth identifier |
| `name` | TEXT | nullable | Display name |
| `email` | VARCHAR(320) | nullable | Email address |
| `loginMethod` | VARCHAR(64) | nullable | OAuth provider used |
| `role` | ENUM('user','admin') | NOT NULL, DEFAULT 'user' | Access control role |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation time |
| `updatedAt` | TIMESTAMP | NOT NULL, ON UPDATE | Last modification time |
| `lastSignedIn` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last login timestamp |

### 3.2 Table: `products`

Core inventory table storing all product information.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Product ID |
| `name` | VARCHAR(255) | NOT NULL | Product display name |
| `barcode` | VARCHAR(128) | NOT NULL, UNIQUE | Scannable barcode (EAN-13, UPC, etc.) |
| `price` | DECIMAL(10,2) | NOT NULL | Unit price in KSh |
| `weight` | DECIMAL(8,3) | nullable | Weight in kg (for weighed items) |
| `category` | VARCHAR(128) | nullable | Product category |
| `stock` | INT | NOT NULL, DEFAULT 0 | Current stock quantity |
| `description` | TEXT | nullable | Product description |
| `imageUrl` | TEXT | nullable | Product image URL |
| `isActive` | BOOLEAN | NOT NULL, DEFAULT true | Soft-delete flag |
| `createdAt` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updatedAt` | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:** `idx_products_barcode`, `idx_products_category`, `idx_products_isActive`

### 3.3 Table: `transactions`

Records every completed sale.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Transaction ID |
| `totalAmount` | DECIMAL(12,2) | NOT NULL | Total sale amount in KSh |
| `paymentMethod` | ENUM('cash','card','mpesa','stripe') | NOT NULL | Payment type used |
| `paymentStatus` | ENUM('pending','completed','failed','refunded') | NOT NULL, DEFAULT 'pending' | Payment lifecycle status |
| `paymentReference` | VARCHAR(255) | nullable | External payment provider reference |
| `kioskId` | INT | nullable | Which kiosk processed the sale |
| `cashierId` | INT | nullable | Cashier who processed (if applicable) |
| `itemCount` | INT | NOT NULL, DEFAULT 0 | Number of line items |
| `receiptNumber` | VARCHAR(64) | nullable | Unique receipt identifier (e.g., `RCP-1710...`) |
| `notes` | TEXT | nullable | Transaction notes |
| `completedAt` | TIMESTAMP | nullable | When payment was confirmed |
| `createdAt` | TIMESTAMP | NOT NULL | Transaction creation time |
| `updatedAt` | TIMESTAMP | NOT NULL | Last update time |

**Indexes:** `idx_transactions_paymentStatus`, `idx_transactions_createdAt`, `idx_transactions_kioskId`, `idx_transactions_receiptNumber`

### 3.4 Table: `transaction_items`

Line items for each transaction, denormalized with product name and barcode for receipt history.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Line item ID |
| `transactionId` | INT | NOT NULL | FK to transactions |
| `productId` | INT | NOT NULL | FK to products |
| `productName` | VARCHAR(255) | NOT NULL | Snapshot of product name at time of sale |
| `productBarcode` | VARCHAR(128) | NOT NULL | Snapshot of barcode at time of sale |
| `quantity` | INT | NOT NULL, DEFAULT 1 | Quantity purchased |
| `unitPrice` | DECIMAL(10,2) | NOT NULL | Price per unit at time of sale |
| `totalPrice` | DECIMAL(10,2) | NOT NULL | quantity x unitPrice |
| `createdAt` | TIMESTAMP | NOT NULL | Creation timestamp |

**Indexes:** `idx_transaction_items_transactionId`, `idx_transaction_items_productId`

### 3.5 Table: `kiosks`

Tracks physical self-checkout terminals.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Kiosk ID |
| `name` | VARCHAR(128) | NOT NULL | Kiosk display name |
| `location` | VARCHAR(255) | nullable | Physical location description |
| `status` | ENUM('online','offline','maintenance') | NOT NULL, DEFAULT 'offline' | Current operational status |
| `lastActive` | TIMESTAMP | nullable | Last activity timestamp |
| `createdAt` | TIMESTAMP | NOT NULL | Registration time |
| `updatedAt` | TIMESTAMP | NOT NULL | Last update time |

---

## 4. API Endpoints (tRPC Procedures)

The API is organized into **5 routers** with **20 procedures** total. All communication uses tRPC over HTTP, meaning there are no traditional REST endpoints — instead, the frontend calls typed procedures directly.

### 4.1 Auth Router (`trpc.auth.*`)

| Procedure | Type | Access | Description |
|---|---|---|---|
| `auth.me` | Query | Public | Returns the currently authenticated user or `null` |
| `auth.logout` | Mutation | Public | Clears the session cookie and logs the user out |

### 4.2 Product Router (`trpc.product.*`)

| Procedure | Type | Access | Input | Description |
|---|---|---|---|---|
| `product.list` | Query | Public | search?, category?, activeOnly?, limit?, offset? | Paginated product listing with search |
| `product.getByBarcode` | Query | Public | barcode (string) | Lookup a single product by barcode |
| `product.getById` | Query | Public | id (number) | Lookup a single product by ID |
| `product.create` | Mutation | Admin | name, barcode, price, stock, weight?, category?, description?, imageUrl? | Create a new product (validates unique barcode) |
| `product.update` | Mutation | Admin | id + partial fields | Update product details |
| `product.delete` | Mutation | Admin | id | Soft-delete a product (sets `isActive = false`) |
| `product.categories` | Query | Public | (none) | List all distinct product categories |
| `product.updateStock` | Mutation | Admin | productId, quantityChange | Adjust stock level (positive or negative) |
| `product.lowStock` | Query | Admin | threshold? (default 10) | List products below stock threshold |

### 4.3 Transaction Router (`trpc.transaction.*`)

| Procedure | Type | Access | Input | Description |
|---|---|---|---|---|
| `transaction.create` | Mutation | Public | items[], paymentMethod, kioskId?, notes? | Process a checkout: validates stock, calculates totals, decrements inventory, generates receipt number |
| `transaction.list` | Query | Admin | limit?, offset?, status?, startDate?, endDate? | Paginated transaction history with filters |
| `transaction.getById` | Query | Protected | id | Get transaction details including line items |
| `transaction.updateStatus` | Mutation | Admin | id, status, paymentReference? | Update payment status (e.g., mark as refunded) |

### 4.4 Analytics Router (`trpc.analytics.*`)

| Procedure | Type | Access | Input | Description |
|---|---|---|---|---|
| `analytics.stats` | Query | Admin | startDate?, endDate? | Aggregate stats: total sales, transaction count, items sold, average transaction |
| `analytics.dailySales` | Query | Admin | days? (default 7) | Daily sales breakdown for charting |
| `analytics.topProducts` | Query | Admin | limit? (default 10) | Top-selling products by quantity |

### 4.5 Kiosk Router (`trpc.kiosk.*`)

| Procedure | Type | Access | Input | Description |
|---|---|---|---|---|
| `kiosk.list` | Query | Admin | (none) | List all registered kiosks |
| `kiosk.create` | Mutation | Admin | name, location? | Register a new kiosk terminal |
| `kiosk.updateStatus` | Mutation | Admin | id, status | Update kiosk operational status |

---

## 5. Frontend Pages and Routes

The application has **7 routes** serving two distinct interfaces: the admin dashboard (5 pages with sidebar navigation) and the standalone self-checkout kiosk (1 fullscreen page).

| Route | Component | Layout | Description |
|---|---|---|---|
| `/` | `Home.tsx` | DashboardLayout | Admin dashboard with KPI cards, sales chart, top products, low stock alerts |
| `/products` | `Products.tsx` | DashboardLayout | Product CRUD: table view, add/edit dialogs, search, category filter, stock management |
| `/transactions` | `Transactions.tsx` | DashboardLayout | Transaction history table with status badges, pagination, date filtering |
| `/analytics` | `Analytics.tsx` | DashboardLayout | Sales analytics with bar charts, revenue breakdowns, and reporting |
| `/kiosks` | `Kiosks.tsx` | DashboardLayout | Kiosk terminal management: register, set status (online/offline/maintenance) |
| `/kiosk` | `KioskCheckout.tsx` | Standalone (fullscreen) | Customer-facing self-checkout with barcode scanning, cart, payment selection, receipt printing |
| `/404` | `NotFound.tsx` | None | 404 error page |

### 5.1 Admin Dashboard Features

The admin dashboard uses a persistent **sidebar navigation** pattern with the following sections: Dashboard, Products, Transactions, Analytics, and Kiosks. A prominent "Open Kiosk Mode" button in the sidebar footer navigates to the standalone kiosk interface.

The **Dashboard** (`/`) displays four KPI cards (Total Sales, Transactions, Items Sold, Average Transaction), a 7-day sales bar chart built with Recharts, a top-5 products leaderboard, and a low-stock alert panel that highlights products below the configurable threshold.

The **Products** page (`/products`) provides a full CRUD interface with a data table, search bar, category filter, and dialog-based forms for adding and editing products. Stock adjustments can be made inline. Products are soft-deleted (marked inactive) rather than permanently removed.

### 5.2 Self-Checkout Kiosk Features

The kiosk interface at `/kiosk` is a **fullscreen, touch-friendly** interface designed for customer self-service. It progresses through a multi-step flow:

1. **Scanning** — A hidden barcode input field auto-focuses and captures hardware scanner input. A manual product search dialog is also available. Scanned products appear in a cart with quantity controls (+/-) and remove buttons.

2. **Payment** — Three payment options are presented as large touch targets: M-Pesa (mobile money), Card, and Cash. Each option is styled with distinct colors and icons.

3. **Processing** — An animated loading screen displays while the transaction is being processed.

4. **Complete** — A success screen with the option to print a receipt or start a new transaction.

5. **Failed** — An error screen with retry and start-over options.

The receipt printing functionality opens a new browser window with a monospace-formatted receipt (store name, transaction ID, date, itemized list, total, and a thank-you message) and triggers the browser's native print dialog.

---

## 6. Shared Utilities

### 6.1 Currency Formatting (`shared/currency.ts`)

Two utility functions ensure consistent KSh formatting across the entire application:

- **`formatKSh(amount)`** — Formats a number or string as `KSh 1,500.00` with two decimal places, using the `en-KE` locale for proper thousand separators.
- **`formatKShShort(amount)`** — Formats without decimals for chart labels: `KSh 1,500`.
- **`CURRENCY_SYMBOL`** — Exported constant `"KSh"` for use in templates.

---

## 7. Design and Theming

The application uses a **teal/green color palette** appropriate for retail environments, defined using OKLCH color values in CSS custom properties. The primary color is `oklch(0.45 0.12 168)` (a professional teal-green). The font family is **Inter** loaded from Google Fonts CDN.

The theme is configured as **light mode** by default via the `ThemeProvider` component. All colors are defined as CSS variables in `client/src/index.css`, making it straightforward to adjust the palette globally. The shadcn/ui component library provides consistent, accessible UI primitives (buttons, cards, dialogs, tables, inputs, selects, badges, etc.) styled with Tailwind CSS utilities.

---

## 8. File Inventory

The project contains **22 custom files** written specifically for this POS system (excluding framework plumbing and pre-built UI components):

### 8.1 Database Layer (2 files)

| File | Lines | Purpose |
|---|---|---|
| `drizzle/schema.ts` | 138 | Table definitions for users, products, kiosks, transactions, transaction_items |
| `drizzle/0001_yellow_grim_reaper.sql` | 67 | Generated migration SQL with CREATE TABLE and CREATE INDEX statements |

### 8.2 Backend Layer (2 files)

| File | Lines | Purpose |
|---|---|---|
| `server/db.ts` | 403 | 18 database helper functions covering all CRUD and analytics queries |
| `server/routers.ts` | 297 | 5 tRPC routers with 20 procedures, input validation via Zod |

### 8.3 Frontend Layer (8 files)

| File | Lines | Purpose |
|---|---|---|
| `client/src/App.tsx` | 47 | Route definitions and app-level providers |
| `client/src/pages/Home.tsx` | 234 | Admin dashboard with KPI cards, charts, alerts |
| `client/src/pages/Products.tsx` | ~350 | Product management CRUD interface |
| `client/src/pages/Transactions.tsx` | ~250 | Transaction history and monitoring |
| `client/src/pages/Analytics.tsx` | ~200 | Sales analytics and reporting charts |
| `client/src/pages/Kiosks.tsx` | ~150 | Kiosk terminal management |
| `client/src/pages/KioskCheckout.tsx` | 643 | Full self-checkout kiosk with 5-step flow |
| `client/src/components/DashboardLayout.tsx` | ~200 | Sidebar navigation with POS-specific menu items |

### 8.4 Shared Layer (1 file)

| File | Lines | Purpose |
|---|---|---|
| `shared/currency.ts` | 29 | KSh formatting utilities |

### 8.5 Configuration and Styling (2 files)

| File | Purpose |
|---|---|
| `client/src/index.css` | Tailwind 4 theme with teal/green OKLCH color palette, Inter font |
| `client/index.html` | HTML shell with Google Fonts CDN link |

### 8.6 Test Files (2 files)

| File | Tests | Purpose |
|---|---|---|
| `server/auth.logout.test.ts` | 1 | Verifies session cookie clearing on logout |
| `server/pos.test.ts` | 30 | Comprehensive tests: auth, product CRUD, transactions, analytics, kiosks, currency formatting |

---

## 9. Test Coverage

The project includes **31 passing tests** across 2 test files, covering:

| Test Suite | Tests | What Is Verified |
|---|---|---|
| Auth | 3 | `auth.me` returns user when authenticated, returns null when not; `auth.logout` clears cookies |
| Product Router | 6 | Public listing works without auth; admin-only create rejects unauthenticated/regular users; price format validation; required field validation; delete/lowStock access control |
| Transaction Router | 6 | Empty items array rejected; invalid payment method rejected; quantity minimum enforced; list/getById access control |
| Analytics Router | 6 | Stats/dailySales/topProducts reject non-admins; return correct data shapes for admins |
| Kiosk Router | 5 | List/create/updateStatus reject non-admins; name validation; status enum validation |
| Currency Formatting | 1 | `formatKSh` and `formatKShShort` produce correct output for numbers, strings, zero, and invalid input |

All tests use **Vitest** with mock tRPC contexts (admin, regular user, and public/unauthenticated) to verify both authorization guards and input validation without requiring a running database for access-control tests.

---

## 10. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Admin Dash   │  │ Product Mgmt │  │ Self-Checkout     │  │
│  │ (Dashboard,  │  │ (CRUD, Stock │  │ Kiosk (Barcode   │  │
│  │  Analytics)  │  │  Management) │  │  Scan, Cart,     │  │
│  │              │  │              │  │  Payment, Receipt)│  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│         └─────────────────┼────────────────────┘            │
│                           │                                 │
│                    tRPC Client                              │
│              (@trpc/react-query)                            │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (superjson)
┌───────────────────────────┴─────────────────────────────────┐
│                        BACKEND                              │
│  Node.js 22 + Express 4 + tRPC 11                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ tRPC Routers                                        │    │
│  │  ├── auth     (me, logout)                          │    │
│  │  ├── product  (list, getByBarcode, create, update,  │    │
│  │  │             delete, categories, updateStock,      │    │
│  │  │             lowStock)                             │    │
│  │  ├── transaction (create, list, getById,            │    │
│  │  │               updateStatus)                      │    │
│  │  ├── analytics (stats, dailySales, topProducts)     │    │
│  │  └── kiosk    (list, create, updateStatus)          │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │                               │
│  ┌──────────────────────────┴──────────────────────────┐    │
│  │ Database Helpers (server/db.ts)                      │    │
│  │  18 functions: getProducts, getProductByBarcode,     │    │
│  │  createTransaction, getSalesStats, getDailySales...  │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │ Drizzle ORM                   │
└─────────────────────────────┬───────────────────────────────┘
                              │ mysql2 driver
┌─────────────────────────────┴───────────────────────────────┐
│                        DATABASE                             │
│  MySQL (TiDB-compatible)                                    │
│                                                             │
│  Tables: users, products, kiosks, transactions,             │
│          transaction_items                                  │
│  Indexes: 9 performance indexes on frequently queried cols  │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Security Model

The application implements a **three-tier access control** system:

| Level | tRPC Middleware | Who Can Access | Example Procedures |
|---|---|---|---|
| **Public** | `publicProcedure` | Anyone (including unauthenticated kiosk users) | `product.list`, `product.getByBarcode`, `transaction.create` |
| **Protected** | `protectedProcedure` | Any logged-in user | `transaction.getById` |
| **Admin** | `adminProcedure` | Users with `role = 'admin'` | `product.create`, `transaction.list`, `analytics.stats`, `kiosk.create` |

The self-checkout kiosk flow (`transaction.create`) is intentionally public so that customers can complete purchases without logging in. All management and reporting operations require admin authentication.

---

## 12. What the Attached Document Identified vs. What Was Already Built

Your attached document identified several items as "missing" from the system. Here is the current status of each:

| Item from Document | Status | Details |
|---|---|---|
| Scan UI | **Already built** | `KioskCheckout.tsx` has a hidden auto-focus barcode input that captures hardware scanner input, plus a manual search dialog |
| Cart system | **Already built** | Full cart with add/remove/update quantity, real-time total calculation |
| Checkout logic | **Already built** | `transaction.create` validates stock, calculates totals, decrements inventory, generates receipt numbers |
| Printer integration | **Partially built** | Browser-based receipt printing via `window.open()` + `window.print()`. ESC/POS hardware printer integration would require a local desktop agent (not possible in a web-only deployment) |
| Barcode column | **Already exists** | `barcode VARCHAR(128) NOT NULL UNIQUE` with index |
| Scan API | **Already exists** | `product.getByBarcode` query procedure |
| Database connection bug | **Not applicable** | Drizzle ORM handles connection pooling internally via the `mysql2` driver |
| "searc" typo | **Not present** | The codebase uses `search: z.string().optional()` correctly |

---

## 13. Recommendations for Next Steps

Based on the current state of the system, the following enhancements would convert this into a production-ready supermarket system:

1. **Seed sample products** — Add Kenyan supermarket products (Tusker, Brookside Milk, Unga, etc.) with real EAN-13 barcodes to test the full scanning flow.

2. **M-Pesa STK Push integration** — Connect the Safaricom Daraja API to trigger real-time M-Pesa payment prompts on the customer's phone during checkout.

3. **CSV product import** — Add a bulk import feature on the Products page to onboard entire inventories from spreadsheets.

4. **ESC/POS receipt printing** — For physical receipt printers, implement a local print agent (Electron app or desktop service) that receives print jobs from the web app via WebSocket.

5. **Weighing scale integration** — The `weight` column exists in the schema; connect it to a USB scale for produce items priced by weight.

6. **Multi-store support** — Extend the schema with a `stores` table and associate products, transactions, and kiosks with specific store locations.
