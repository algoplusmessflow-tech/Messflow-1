import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { BroadcastModal } from "@/components/BroadcastModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ModeProvider } from "@/contexts/ModeContext";
import { Suspense, lazy } from "react";

// Lazy load pages
const PublicHome = lazy(() => import("./pages/PublicHome"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Members = lazy(() => import("./pages/Members"));
const Menu = lazy(() => import("./pages/Menu"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Reports = lazy(() => import("./pages/Reports"));
const Pricing = lazy(() => import("./pages/Pricing"));
const StaffPayroll = lazy(() => import("./pages/StaffPayroll"));
const Settings = lazy(() => import("./pages/Settings"));
const Renewal = lazy(() => import("./pages/Renewal"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const SuperAdminSecurity = lazy(() => import("./pages/SuperAdminSecurity"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const DeliveryManagement = lazy(() => import("./pages/DeliveryManagement"));
const DeliveryZones = lazy(() => import("./pages/DeliveryZones"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Sales = lazy(() => import("./pages/Sales"));
const Tables = lazy(() => import("./pages/Tables"));
const OrderTaking = lazy(() => import("./pages/OrderTaking"));
const PrintKOT = lazy(() => import("./pages/PrintKOT"));
const Orders = lazy(() => import("./pages/Orders"));
const Tokens = lazy(() => import("./pages/Tokens"));

// Regular imports for new pages (to avoid lazy loading issues)
import Invoices from "./pages/Invoices";
import DriverPortal from "./pages/DriverPortal";
import CustomerPortal from "./pages/CustomerPortal";
import SalesPortal from "./pages/SalesPortal";
import SalesPersonLogin from "./pages/SalesPersonLogin";
import KitchenPrep from "./pages/KitchenPrep";
import KitchenPortal from "./pages/KitchenPortal";
import GoogleCallback from "./pages/GoogleCallback";
import Referrals from "./pages/Referrals";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ModeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
              <Route path="/" element={<PublicHome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/renewal" element={
                <ProtectedRoute>
                  <Renewal />
                </ProtectedRoute>
              } />
              <Route path="/super-admin" element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdmin />
                </ProtectedRoute>
              } />
              <Route path="/super-admin/security" element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminSecurity />
                </ProtectedRoute>
              } />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <BroadcastModal />
                      <Dashboard />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/members"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Members />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/menu"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Menu />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Inventory />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <StaffPayroll />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Expenses />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Reports />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pricing"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Pricing />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Settings />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/delivery"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <DeliveryManagement />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Invoices />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Sales />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tables"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Tables />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kitchen-prep"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <KitchenPrep />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/referrals"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Referrals />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Orders />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tokens"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <Tokens />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              {/* Restaurant order flow */}
              <Route path="/order/new" element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <SubscriptionBanner />
                    <OrderTaking />
                  </SubscriptionGuard>
                </ProtectedRoute>
              } />
              <Route path="/kot/print/:kotId" element={
                <ProtectedRoute>
                  <PrintKOT />
                </ProtectedRoute>
              } />
              <Route
                path="/zones"
                element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <SubscriptionBanner />
                      <DeliveryZones />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/driver/:ownerId" element={<DriverPortal />} />
              <Route path="/customer/:ownerId" element={<CustomerPortal />} />
              <Route path="/:slug/customer" element={<CustomerPortal />} />
              <Route path="/:slug/driver" element={<DriverPortal />} />
              <Route path="/:slug/register" element={<CustomerPortal />} />
              
              {/* Sales Person Routes */}
              <Route path="/sales-login" element={<SalesPersonLogin />} />
              <Route path="/sales-portal" element={<SalesPortal />} />
              <Route path="/sales-portal/*" element={<SalesPortal />} />
              
              {/* Legacy route - redirects to new login */}
              <Route path="/:slug/sales/:token" element={<SalesPortal />} />
              <Route path="/:slug/sales" element={<SalesPortal />} />
              
              <Route path="/:slug/kitchen" element={<KitchenPortal />} />
              <Route path="/auth/google/callback" element={<GoogleCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
      </ModeProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
