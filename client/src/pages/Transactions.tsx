import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { formatKSh } from "@shared/currency";
import { useState } from "react";
import {
  Receipt,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  refunded: "bg-gray-100 text-gray-800 border-gray-200",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  mpesa: "M-Pesa",
  stripe: "Stripe",
};

export default function Transactions() {
  return (
    <DashboardLayout>
      <TransactionsContent />
    </DashboardLayout>
  );
}

function TransactionsContent() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const PAGE_SIZE = 20;

  const { data, isLoading } = trpc.transaction.list.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    status: statusFilter || undefined,
  });

  const { data: txDetail } = trpc.transaction.getById.useQuery(
    { id: selectedTxId! },
    { enabled: selectedTxId !== null }
  );

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const handlePrint = () => {
    if (!txDetail) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHtml = txDetail.items
      .map(
        (item) =>
          `<tr>
            <td style="padding:4px 8px;border-bottom:1px solid #eee">${item.productName}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">KSh ${parseFloat(item.unitPrice as string).toFixed(2)}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">KSh ${parseFloat(item.totalPrice as string).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head><title>Receipt ${txDetail.receiptNumber}</title></head>
        <body style="font-family:monospace;max-width:300px;margin:0 auto;padding:20px">
          <div style="text-align:center;margin-bottom:16px">
            <h2 style="margin:0">SELF-CHECKOUT POS</h2>
            <p style="margin:4px 0;font-size:12px">Receipt #${txDetail.receiptNumber}</p>
            <p style="margin:4px 0;font-size:12px">${new Date(txDetail.createdAt).toLocaleString("en-KE")}</p>
          </div>
          <hr/>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr>
                <th style="text-align:left;padding:4px 8px">Item</th>
                <th style="text-align:center;padding:4px 8px">Qty</th>
                <th style="text-align:right;padding:4px 8px">Price</th>
                <th style="text-align:right;padding:4px 8px">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <hr/>
          <div style="text-align:right;font-size:14px;font-weight:bold;padding:8px">
            TOTAL: KSh ${parseFloat(txDetail.totalAmount as string).toFixed(2)}
          </div>
          <div style="text-align:center;font-size:11px;margin-top:8px">
            <p>Payment: ${PAYMENT_LABELS[txDetail.paymentMethod] ?? txDetail.paymentMethod}</p>
            <p style="margin-top:12px">Thank you for shopping with us!</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all sales transactions
          </p>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v === "all" ? "" : v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No transactions found</p>
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <code className="text-xs">{tx.receiptNumber ?? "-"}</code>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(tx.createdAt).toLocaleString("en-KE", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{tx.itemCount}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PAYMENT_LABELS[tx.paymentMethod] ?? tx.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${STATUS_COLORS[tx.paymentStatus] ?? ""}`}
                      >
                        {tx.paymentStatus}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatKSh(tx.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedTxId(tx.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}-
            {Math.min((page + 1) * PAGE_SIZE, data?.total ?? 0)} of{" "}
            {data?.total ?? 0}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Transaction Detail Dialog */}
      <Dialog
        open={selectedTxId !== null}
        onOpenChange={() => setSelectedTxId(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Transaction Details</span>
              {txDetail && (
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {txDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Receipt #</span>
                  <p className="font-medium">{txDetail.receiptNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">
                    {new Date(txDetail.createdAt).toLocaleString("en-KE")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment</span>
                  <p className="font-medium">
                    {PAYMENT_LABELS[txDetail.paymentMethod] ?? txDetail.paymentMethod}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${STATUS_COLORS[txDetail.paymentStatus] ?? ""}`}
                    >
                      {txDetail.paymentStatus}
                    </span>
                  </p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txDetail.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{item.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.productBarcode}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatKSh(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatKSh(item.totalPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">
                  {formatKSh(txDetail.totalAmount)}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
