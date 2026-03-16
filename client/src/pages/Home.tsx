import DashboardLayout from "../components/DashboardLayout"; 
import { useAuth } from "../hooks/useAuth"; 
import { trpc } from "../lib/trpc";
import { formatKSh } from "../../../shared/currency"; 
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { DollarSign, ShoppingCart, Package, TrendingUp } from "lucide-react";

export default function Home() {
  // Bypass redirect to keep the dashboard visible without a session
  useAuth({ redirectOnUnauthenticated: false });

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Store Dashboard</h1>
          <p className="text-muted-foreground">Live Data from Aiven MySQL Instance</p>
        </div>
        
        <DashboardContent />
      </div>
    </DashboardLayout>
  );
}

function DashboardContent() {
  const { data: stats, isLoading, error } = trpc.analytics.stats.useQuery(undefined, {
    retry: false,
  });

  if (isLoading) return <p className="text-muted-foreground animate-pulse">Fetching latest data...</p>;
  
  if (error) return (
    <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg text-sm text-destructive">
      Connected to Aiven MySQL, but could not retrieve financial stats.
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatKSh(stats?.totalSales ?? 0)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
          <ShoppingCart className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalTransactions ?? 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Items Sold</CardTitle>
          <Package className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalItems ?? 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Transaction</CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatKSh(stats?.avgTransaction ?? 0)}</div>
        </CardContent>
      </Card>
    </div>
  );
}