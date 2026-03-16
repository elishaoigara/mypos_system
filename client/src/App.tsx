import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";

// 🛠️ FIX: Explicit relative paths to match your 'src' folder structure
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import { trpc, trpcClient } from "./lib/trpc"; 

// Page Imports
import Home from "./pages/Home";
import Products from "./pages/Products";
import Transactions from "./pages/Transactions";
import Analytics from "./pages/Analytics";
import Kiosks from "./pages/Kiosks";
import NotFound from "./pages/NotFound"; 

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/kiosks" component={Kiosks} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </trpc.Provider>
  );
}