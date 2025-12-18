/**
 * ========================================
 * APP COMPONENT (ROOT)
 * ========================================
 * 
 * This is the root component of the application. It sets up all the
 * global providers and routing infrastructure that the entire app needs.
 * 
 * PROVIDERS (in order, outer to inner):
 * 
 * 1. **QueryClientProvider** (TanStack Query)
 *    - Manages server state and data fetching
 *    - Provides caching, background updates, and request deduplication
 *    - Used by components that fetch external data
 * 
 * 2. **TooltipProvider** (Radix UI)
 *    - Enables tooltips throughout the application
 *    - Manages tooltip timing and positioning
 * 
 * 3. **Toaster** (shadcn/ui)
 *    - Displays toast notifications (success, error, info messages)
 *    - Positioned automatically at screen corners
 * 
 * 4. **Sonner** (sonner library)
 *    - Alternative toast system with richer features
 *    - Used for more prominent notifications
 * 
 * 5. **BrowserRouter** (React Router)
 *    - Enables client-side routing
 *    - Manages URL navigation without page reloads
 * 
 * ROUTING:
 * - "/" → Index page (main name library interface)
 * - "*" → NotFound page (catch-all for invalid URLs)
 * 
 * NOTE: Add any new routes ABOVE the catch-all "*" route
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

/**
 * Create QueryClient instance
 * This manages all data fetching and caching for the application
 */
const queryClient = new QueryClient();

/**
 * App Component
 * Sets up all providers and routing
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
