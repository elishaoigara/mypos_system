import { useState, useCallback } from "react";

/**
 * Hook for printing receipts via the local ESC/POS print agent.
 *
 * The print agent runs on http://localhost:9100 and accepts POST /print
 * with a JSON receipt payload. If the agent is not running, falls back
 * to browser window.print().
 *
 * See docs/HARDWARE_GUIDE.md for print agent setup instructions.
 */

type ReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

type ReceiptData = {
  receiptNumber: string;
  items: ReceiptItem[];
  total: string;
  paymentMethod: string;
  storeName?: string;
};

const PRINT_AGENT_URL = "http://localhost:9100/print";

export function usePrinter() {
  const [printing, setPrinting] = useState(false);
  const [agentAvailable, setAgentAvailable] = useState<boolean | null>(null);

  /**
   * Check if the local print agent is running
   */
  const checkAgent = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:9100", {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      const available = res.ok;
      setAgentAvailable(available);
      return available;
    } catch {
      setAgentAvailable(false);
      return false;
    }
  }, []);

  /**
   * Print receipt via ESC/POS agent. Falls back to browser print if agent unavailable.
   */
  const printReceipt = useCallback(
    async (receipt: ReceiptData): Promise<{ success: boolean; method: "agent" | "browser" }> => {
      setPrinting(true);
      try {
        // Try ESC/POS agent first
        const isAgentUp = await checkAgent();
        if (isAgentUp) {
          const res = await fetch(PRINT_AGENT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(receipt),
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            return { success: true, method: "agent" };
          }
        }

        // Fallback: browser print
        browserPrint(receipt);
        return { success: true, method: "browser" };
      } catch {
        // Final fallback
        browserPrint(receipt);
        return { success: true, method: "browser" };
      } finally {
        setPrinting(false);
      }
    },
    [checkAgent]
  );

  return { printReceipt, printing, agentAvailable, checkAgent };
}

/**
 * Opens a new window with a formatted receipt and triggers browser print dialog.
 */
function browserPrint(receipt: ReceiptData) {
  const storeName = receipt.storeName || "SELF-CHECKOUT POS";
  const itemsHtml = receipt.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:3px 0">${item.name}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">KSh ${item.totalPrice}</td>
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
          <h2 style="margin:0;font-size:16px">${storeName}</h2>
          <p style="margin:4px 0">Receipt: ${receipt.receiptNumber}</p>
          <p style="margin:4px 0">${new Date().toLocaleString("en-KE")}</p>
          <p style="margin:4px 0">Payment: ${receipt.paymentMethod.toUpperCase()}</p>
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
          TOTAL: KSh ${receipt.total}
        </div>
        <hr style="border:none;border-top:1px dashed #999"/>
        <p style="text-align:center;margin-top:12px">Thank you for shopping with us!</p>
        <p style="text-align:center;font-size:10px;color:#999">Powered by Self-Checkout POS</p>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}
