import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatKSh } from "@shared/currency";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  ScanBarcode,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle2,
  XCircle,
  Printer,
  RotateCcw,
  Search,
} from "lucide-react";

type CartItem = {
  productId: number;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
};

type CheckoutStep = "scanning" | "payment" | "processing" | "complete" | "failed";

export default function KioskCheckout() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<CheckoutStep>("scanning");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [manualSearchOpen, setManualSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [completedTxId, setCompletedTxId] = useState<number | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: searchResults } = trpc.product.list.useQuery(
    { search: searchQuery, limit: 8, activeOnly: true },
    { enabled: searchQuery.length >= 2 }
  );

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === item.productId);
      if (existing) {
        return prev.map((c) =>
          c.productId === item.productId
            ? { ...c, quantity: c.quantity + item.quantity }
            : c
        );
      }
      return [...prev, item];
    });
  }, []);

  const lookupBarcode = useCallback(
    async (barcode: string) => {
      try {
        // We'll use a direct fetch approach since getByBarcode is a query
        // Instead, use the search to find by barcode
        const results = await utils.product.getByBarcode.fetch({ barcode });
        if (!results) {
          toast.error("Product not found", { description: "Barcode not recognized" });
          return;
        }
        const product = results;
        if (product.stock <= 0) {
          toast.error("Out of stock", { description: `${product.name} is currently unavailable` });
          return;
        }
        addToCart({
          productId: product.id,
          name: product.name,
          barcode: product.barcode,
          price: parseFloat(product.price as string),
          quantity: 1,
        });
        toast.success(`Added: ${product.name}`, { duration: 1500 });
      } catch {
        toast.error("Scan failed", { description: "Product not found or try again" });
      }
    },
    [addToCart, utils]
  );

  const checkoutMutation = trpc.transaction.create.useMutation({
    onSuccess: (result) => {
      setCompletedTxId(result.id);
      setStep("complete");
    },
    onError: (err) => {
      toast.error("Checkout failed", { description: err.message });
      setStep("failed");
    },
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.productId === productId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeItem = (productId: number) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  // Barcode scanner: listens for rapid keystrokes (hardware scanners type fast)
  const handleBarcodeInput = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length >= 4) {
        lookupBarcode(trimmed);
      }
      setBarcodeInput("");
    },
    [lookupBarcode]
  );

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBarcodeInput(barcodeInput);
    }
  };

  // Auto-focus barcode input when in scanning mode
  useEffect(() => {
    if (step === "scanning" && barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, [step]);

  // Refocus barcode input when clicking anywhere on the page (kiosk mode)
  useEffect(() => {
    if (step !== "scanning") return;
    const handleClick = () => {
      if (barcodeRef.current && !manualSearchOpen) {
        barcodeRef.current.focus();
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [step, manualSearchOpen]);

  const handlePayment = (method: "cash" | "mpesa" | "card") => {
    setStep("processing");
    const items = cart.map((c) => ({
      productId: c.productId,
      quantity: c.quantity,
      unitPrice: c.price.toString(),
    }));
    checkoutMutation.mutate({
      items,
      paymentMethod: method,
    });
  };

  const handlePrintReceipt = () => {
    if (!completedTxId) return;
    // Build a simple receipt for printing
    const itemsHtml = cart
      .map(
        (item) =>
          `<tr>
            <td style="padding:3px 0">${item.name}</td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:right">KSh ${(item.price * item.quantity).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>Receipt</title></head>
        <body style="font-family:monospace;max-width:280px;margin:0 auto;padding:16px;font-size:12px">
          <div style="text-align:center;margin-bottom:12px">
            <h2 style="margin:0;font-size:16px">SELF-CHECKOUT POS</h2>
            <p style="margin:4px 0">Transaction #${completedTxId}</p>
            <p style="margin:4px 0">${new Date().toLocaleString("en-KE")}</p>
          </div>
          <hr style="border:none;border-top:1px dashed #999"/>
          <table style="width:100%;border-collapse:collapse;margin:8px 0">
            <thead>
              <tr style="border-bottom:1px solid #ccc">
                <th style="text-align:left;padding:3px 0">Item</th>
                <th style="text-align:center">Qty</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <hr style="border:none;border-top:1px dashed #999"/>
          <div style="text-align:right;font-size:14px;font-weight:bold;padding:8px 0">
            TOTAL: KSh ${cartTotal.toFixed(2)}
          </div>
          <hr style="border:none;border-top:1px dashed #999"/>
          <p style="text-align:center;margin-top:12px">Thank you for shopping with us!</p>
          <p style="text-align:center;font-size:10px;color:#999">Powered by Self-Checkout POS</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const resetKiosk = () => {
    setCart([]);
    setStep("scanning");
    setCompletedTxId(null);
    setBarcodeInput("");
  };

  const addFromSearch = (product: { id: number; name: string; barcode: string; price: string | number; stock: number }) => {
    if (product.stock <= 0) {
      toast.error("Out of stock");
      return;
    }
    addToCart({
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      price: parseFloat(product.price as string),
      quantity: 1,
    });
    toast.success(`Added: ${product.name}`, { duration: 1500 });
    setManualSearchOpen(false);
    setSearchQuery("");
  };

  // ─── SCANNING STEP ───
  if (step === "scanning") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Toaster position="top-center" />

        {/* Header */}
        <header className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-7 w-7" />
            <h1 className="text-xl font-bold">Self-Checkout</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                ref={barcodeRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan barcode..."
                className="bg-white/20 text-primary-foreground placeholder:text-primary-foreground/60 rounded-lg px-4 py-2.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-white/40"
                autoFocus
              />
              <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setManualSearchOpen(true)}
              className="gap-1.5"
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Cart Items */}
          <div className="flex-1 p-4 lg:p-6 overflow-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <ScanBarcode className="h-20 w-20 mb-6 opacity-30" />
                <h2 className="text-2xl font-semibold mb-2">Scan to Start</h2>
                <p className="text-lg">
                  Scan a product barcode or tap "Search" to find items
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-w-2xl mx-auto">
                <h2 className="text-lg font-semibold text-muted-foreground mb-4">
                  {cartItemCount} item{cartItemCount !== 1 ? "s" : ""} in cart
                </h2>
                {cart.map((item) => (
                  <Card key={item.productId} className="overflow-hidden">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatKSh(item.price)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full"
                          onClick={() => updateQuantity(item.productId, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center text-lg font-bold">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full"
                          onClick={() => updateQuantity(item.productId, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="font-bold">
                          {formatKSh(item.price * item.quantity)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-destructive hover:text-destructive shrink-0"
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Sidebar */}
          {cart.length > 0 && (
            <div className="lg:w-80 border-t lg:border-t-0 lg:border-l bg-card p-6 flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              <div className="flex-1 space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground truncate mr-2">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-medium shrink-0">
                      {formatKSh(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatKSh(cartTotal)}
                  </span>
                </div>
                <Button
                  size="lg"
                  className="w-full text-lg h-14 gap-2"
                  onClick={() => setStep("payment")}
                >
                  <CreditCard className="h-5 w-5" />
                  Pay Now
                </Button>
                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={resetKiosk}
                >
                  Cancel Order
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Manual Search Dialog */}
        <Dialog open={manualSearchOpen} onOpenChange={setManualSearchOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Search Products</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Type product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="text-lg h-12"
            />
            <div className="max-h-[300px] overflow-auto space-y-1">
              {searchResults?.items.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addFromSearch(product)}
                  className="w-full flex items-center justify-between rounded-lg p-3 hover:bg-accent transition-colors text-left"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.barcode}
                      {product.stock <= 0 && (
                        <span className="text-destructive ml-2">Out of stock</span>
                      )}
                    </p>
                  </div>
                  <span className="font-semibold">{formatKSh(product.price)}</span>
                </button>
              ))}
              {searchQuery.length >= 2 &&
                searchResults?.items.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">
                    No products found
                  </p>
                )}
              {searchQuery.length < 2 && (
                <p className="text-center text-muted-foreground py-6">
                  Type at least 2 characters to search
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── PAYMENT STEP ───
  if (step === "payment") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Toaster position="top-center" />
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Choose Payment</h1>
            <p className="text-xl text-muted-foreground">
              Total: <span className="font-bold text-primary">{formatKSh(cartTotal)}</span>
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handlePayment("mpesa")}
              className="w-full flex items-center gap-4 rounded-xl border-2 border-border p-6 hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="h-14 w-14 rounded-xl bg-green-100 flex items-center justify-center">
                <Smartphone className="h-7 w-7 text-green-700" />
              </div>
              <div>
                <p className="text-xl font-semibold">M-Pesa</p>
                <p className="text-sm text-muted-foreground">
                  Pay via Safaricom M-Pesa
                </p>
              </div>
            </button>

            <button
              onClick={() => handlePayment("card")}
              className="w-full flex items-center gap-4 rounded-xl border-2 border-border p-6 hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center">
                <CreditCard className="h-7 w-7 text-blue-700" />
              </div>
              <div>
                <p className="text-xl font-semibold">Card</p>
                <p className="text-sm text-muted-foreground">
                  Visa, Mastercard, or debit card
                </p>
              </div>
            </button>

            <button
              onClick={() => handlePayment("cash")}
              className="w-full flex items-center gap-4 rounded-xl border-2 border-border p-6 hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="h-14 w-14 rounded-xl bg-amber-100 flex items-center justify-center">
                <Banknote className="h-7 w-7 text-amber-700" />
              </div>
              <div>
                <p className="text-xl font-semibold">Cash</p>
                <p className="text-sm text-muted-foreground">
                  Pay at the counter
                </p>
              </div>
            </button>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setStep("scanning")}
          >
            Back to Cart
          </Button>
        </div>
      </div>
    );
  }

  // ─── PROCESSING STEP ───
  if (step === "processing") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Toaster position="top-center" />
        <div className="text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
            <CreditCard className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Processing Payment</h1>
          <p className="text-lg text-muted-foreground">
            Please wait while we process your payment of{" "}
            <span className="font-semibold text-foreground">{formatKSh(cartTotal)}</span>
          </p>
          <div className="flex justify-center">
            <div className="h-1.5 w-48 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-[loading_1.5s_ease-in-out_infinite]" 
                   style={{ width: "60%", animation: "loading 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(60%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    );
  }

  // ─── COMPLETE STEP ───
  if (step === "complete") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Toaster position="top-center" />
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-14 w-14 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-green-700 mb-2">
              Payment Successful!
            </h1>
            <p className="text-lg text-muted-foreground">
              Total paid: <span className="font-bold text-foreground">{formatKSh(cartTotal)}</span>
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2 h-14 text-base"
              onClick={handlePrintReceipt}
            >
              <Printer className="h-5 w-5" />
              Print Receipt
            </Button>
            <Button
              size="lg"
              className="w-full gap-2 h-14 text-base"
              onClick={resetKiosk}
            >
              <RotateCcw className="h-5 w-5" />
              New Transaction
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── FAILED STEP ───
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Toaster position="top-center" />
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="h-24 w-24 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <XCircle className="h-14 w-14 text-red-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-destructive mb-2">
            Payment Failed
          </h1>
          <p className="text-lg text-muted-foreground">
            Something went wrong. Please try again or ask for assistance.
          </p>
        </div>
        <div className="space-y-3 pt-4">
          <Button
            size="lg"
            className="w-full gap-2 h-14 text-base"
            onClick={() => setStep("payment")}
          >
            Try Again
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 text-base"
            onClick={resetKiosk}
          >
            Start Over
          </Button>
        </div>
      </div>
    </div>
  );
}
