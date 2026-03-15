import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Transactions from "./pages/Transactions";
import Analytics from "./pages/Analytics";
import Kiosks from "./pages/Kiosks";
import KioskCheckout from "./pages/KioskCheckout";

function Router() {
  return (
    <Switch>
      {/* Admin Dashboard Routes */}
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/kiosks" component={Kiosks} />

      {/* Self-Checkout Kiosk (standalone, no sidebar) */}
      <Route path="/kiosk" component={KioskCheckout} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
