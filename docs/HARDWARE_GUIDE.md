# Hardware Integration Guide

This guide explains how to connect physical POS hardware to the Self-Checkout POS system for a live demonstration.

---

## 1. Barcode Scanner (USB HID)

### How It Works

Most USB barcode scanners operate in **HID Keyboard Emulation** mode. When you scan a barcode, the scanner types the barcode digits as keyboard input and presses Enter at the end. The kiosk interface at `/kiosk` is already built to capture this input.

### Setup Steps

1. **Plug in the scanner** via USB. No driver installation is needed for HID scanners.
2. **Test the scanner** by opening Notepad (or any text editor), scanning a product, and confirming you see the barcode number followed by a newline.
3. **Open the kiosk page** at `http://localhost:3000/kiosk` in a browser.
4. **Scan a product** — the barcode input field is auto-focused and hidden. The scanner types the barcode and presses Enter, which triggers the product lookup automatically.

### How the Code Handles It

The `KioskCheckout.tsx` component has a hidden input field that auto-focuses when in scanning mode. The `onKeyDown` handler listens for the Enter key, which triggers the barcode lookup via the `product.getByBarcode` tRPC query.

```tsx
// Already implemented in KioskCheckout.tsx
const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleBarcodeInput(barcodeInput);
  }
};
```

### Recommended Scanners for Kenya

| Scanner | Type | Approx. Price (KSh) | Notes |
|---|---|---|---|
| Honeywell Voyager 1200g | 1D Laser | 8,000 - 12,000 | Reliable, widely available |
| Zebra DS2208 | 1D/2D Imager | 12,000 - 18,000 | Reads QR codes too |
| Netum NT-1228BL | 1D/2D Wireless | 3,000 - 5,000 | Budget option, Bluetooth |
| Generic USB Barcode Scanner | 1D Laser | 1,500 - 3,000 | Available on Jumia/Kilimall |

### Troubleshooting

If scanning does not work, check the following:

- The browser tab with `/kiosk` must be in focus (active tab).
- The barcode input field must be focused. Click anywhere on the kiosk page to refocus it.
- Ensure the scanned barcode exists in your products database. Use the seed script to add sample products.
- Some scanners add a prefix or suffix. Check your scanner's manual to configure it to output raw barcode + Enter only.

---

## 2. Receipt Printer (ESC/POS)

### Browser-Based Printing (Already Built)

The system already includes browser-based receipt printing. After a successful checkout, clicking "Print Receipt" opens a formatted receipt in a new window and triggers the browser's print dialog. This works with any printer connected to the computer.

### Thermal Receipt Printer (ESC/POS) — Advanced Setup

For a dedicated thermal receipt printer (like Epson TM-T20, Star TSP143, or POS-80), you need a local print agent because web browsers cannot communicate directly with USB/Serial printers.

#### Option A: Use the Browser Print Dialog

1. Connect your thermal printer as a regular Windows/Linux printer.
2. Set it as the default printer.
3. When the receipt window opens, press Ctrl+P or let the auto-print trigger.
4. The receipt is formatted at 280px width (standard 80mm thermal paper).

#### Option B: ESC/POS Direct Printing (Requires Local Agent)

For direct ESC/POS printing without the browser dialog, you need a small local Node.js agent running alongside the web app. Here is how to set it up:

**Step 1:** Install the `escpos` package in a separate local project:

```bash
mkdir pos-print-agent
cd pos-print-agent
npm init -y
npm install escpos escpos-usb
```

**Step 2:** Create `print-agent.mjs`:

```javascript
import escpos from "escpos";
import USB from "escpos-usb";
import http from "http";

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/print") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const receipt = JSON.parse(body);
        printReceipt(receipt);
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else if (req.method === "OPTIONS") {
    // CORS preflight
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

function printReceipt(receipt) {
  const device = new USB();
  const printer = new escpos.Printer(device);

  device.open(() => {
    printer
      .align("CT")
      .style("B")
      .size(1, 1)
      .text("SELF-CHECKOUT POS")
      .style("NORMAL")
      .size(0, 0)
      .text("--------------------------------")
      .text(`Receipt: ${receipt.receiptNumber}`)
      .text(`Date: ${new Date().toLocaleString("en-KE")}`)
      .text("--------------------------------")
      .align("LT");

    // Print each item
    for (const item of receipt.items) {
      printer.text(`${item.name}`);
      printer.text(`  ${item.quantity} x KSh ${item.unitPrice}    KSh ${item.totalPrice}`);
    }

    printer
      .text("--------------------------------")
      .align("RT")
      .style("B")
      .text(`TOTAL: KSh ${receipt.total}`)
      .style("NORMAL")
      .align("CT")
      .text("")
      .text("Thank you for shopping with us!")
      .text("")
      .cut()
      .close();
  });
}

server.listen(9100, () => {
  console.log("🖨️  Print agent running on http://localhost:9100");
  console.log("   POST /print with receipt JSON to print");
});
```

**Step 3:** Run the print agent:

```bash
node print-agent.mjs
```

**Step 4:** To call the print agent from the kiosk, you can add a fetch call in the receipt handler:

```typescript
// Add this to KioskCheckout.tsx handlePrintReceipt function
fetch("http://localhost:9100/print", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    receiptNumber: `TXN-${completedTxId}`,
    items: cart.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price.toFixed(2),
      totalPrice: (item.price * item.quantity).toFixed(2),
    })),
    total: cartTotal.toFixed(2),
  }),
});
```

### Recommended Receipt Printers for Kenya

| Printer | Interface | Paper Width | Approx. Price (KSh) |
|---|---|---|---|
| Epson TM-T20III | USB + Serial | 80mm | 25,000 - 35,000 |
| XPrinter XP-80C | USB | 80mm | 8,000 - 12,000 |
| POS-80 Generic | USB | 80mm | 5,000 - 8,000 |
| Star TSP143IIIU | USB | 80mm | 30,000 - 40,000 |

---

## 3. Weighing Scale (Optional)

### How It Works

Electronic weighing scales with a serial (RS-232) or USB interface can send weight data to the computer. The weight column already exists in the products database schema for produce items priced by weight.

### Setup Approach

Weighing scale integration requires reading serial port data. This is done via a local agent similar to the print agent:

**Step 1:** Install the serial port package:

```bash
npm install serialport
```

**Step 2:** Create `scale-agent.mjs`:

```javascript
import { SerialPort } from "serialport";
import { ReadlineParser } from "serialport";
import http from "http";

let lastWeight = 0;

// Adjust the port path for your system
// Windows: "COM3", "COM4", etc.
// Linux: "/dev/ttyUSB0", "/dev/ttyACM0", etc.
const port = new SerialPort({
  path: "/dev/ttyUSB0",  // Change this to your scale's port
  baudRate: 9600,         // Check your scale's manual for baud rate
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

parser.on("data", (data) => {
  // Most scales send weight in format like "  1.234 kg" or "ST,GS,  1.234kg"
  const match = data.match(/([\d.]+)/);
  if (match) {
    lastWeight = parseFloat(match[1]);
    console.log(`⚖️  Weight: ${lastWeight} kg`);
  }
});

// HTTP endpoint for the web app to read the weight
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify({ weight: lastWeight }));
});

server.listen(9101, () => {
  console.log("⚖️  Scale agent running on http://localhost:9101");
  console.log("   GET / to read current weight");
});
```

**Step 3:** From the kiosk UI, poll the weight endpoint:

```typescript
const response = await fetch("http://localhost:9101");
const { weight } = await response.json();
// Use weight to calculate price for produce items
```

### Recommended Scales for Kenya

| Scale | Capacity | Interface | Approx. Price (KSh) |
|---|---|---|---|
| CAS SW-1 Series | 5-30 kg | RS-232 | 15,000 - 25,000 |
| Jadever JWI-700 | 3-30 kg | RS-232/USB | 20,000 - 30,000 |
| Generic Digital Scale | 5-40 kg | USB | 5,000 - 10,000 |

---

## 4. Cash Drawer (Optional)

Cash drawers are typically connected to the receipt printer via an RJ-11 cable. When the receipt printer receives the "open drawer" ESC/POS command, it sends a signal to the cash drawer to open.

Add this to the print agent after printing the receipt:

```javascript
// In the printReceipt function, before .close():
printer.cashdraw(2);  // Opens cash drawer on pin 2
```

---

## 5. Complete Hardware Demo Setup

For a full demonstration, here is the recommended setup:

```
┌─────────────────────────────────────────────┐
│              KIOSK COMPUTER                  │
│  (Laptop/Desktop running the POS system)    │
│                                             │
│  Browser: http://localhost:3000/kiosk        │
│  Print Agent: http://localhost:9100          │
│  Scale Agent: http://localhost:9101          │
│                                             │
│  USB Ports:                                 │
│    ├── Barcode Scanner (HID keyboard mode)  │
│    ├── Receipt Printer (USB)                │
│    └── Weighing Scale (USB-Serial)          │
│                                             │
│  RJ-11 (from printer):                      │
│    └── Cash Drawer                          │
└─────────────────────────────────────────────┘
```

### Demo Workflow

1. Start MySQL and ensure the database is seeded with products.
2. Start the POS web app: `pnpm dev`
3. Start the print agent: `node pos-print-agent/print-agent.mjs`
4. Start the scale agent (if using): `node pos-print-agent/scale-agent.mjs`
5. Open `http://localhost:3000/kiosk` in a fullscreen browser (press F11).
6. Scan products with the barcode scanner.
7. Complete checkout — receipt prints automatically, cash drawer opens.
