// src/pages/SuperAdminModeManagement.tsx
// SUPERADMIN MODE MANAGEMENT - Control which modes are available to each tenant
// SuperAdmin-only page to manage mode activation, pricing, and upgrades

import React, { useState, useEffect } from "react";
import {
  Settings,
  Lock,
  Unlock,
  DollarSign,
  Users,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionPlan {
  id: string;
  name: string;
  price_usd: number;
  available_modes: string[];
  max_venues: number;
}

interface TenantModeAccess {
  id: string;
  tenant_id: string;
  manager_id: string;
  active_modes: string[];
  max_allowed_modes: number;
  plan_id: string;
}

interface TenantInfo {
  id: string;
  name: string;
  manager_id: string;
  email: string;
  active_modes: string[];
  plan_name: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SuperAdminModeManagement = () => {
  const [activeTab, setActiveTab] = useState("plans");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load subscription plans
      const { data: plansData } = await supabase
        .from("mode_activation.subscription_plans")
        .select("*");
      setPlans(plansData || []);

      // Load tenants with mode access
      const { data: tenantsData } = await supabase
        .from("mode_activation.tenant_mode_access")
        .select("*, subscription_plans(name)");
      setTenants(tenantsData || []);

      // Load upgrade requests
      const { data: requestsData } = await supabase
        .from("mode_activation.mode_upgrade_requests")
        .select("*")
        .eq("request_status", "pending");
      setUpgradeRequests(requestsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings size={32} className="text-blue-600" />
            <h1 className="text-3xl font-bold">Mode Management</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            SuperAdmin controls for subscription plans, mode activation, and upgrades
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-gray-800 p-1 rounded-lg">
            <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="upgrades">Upgrade Requests</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* PLANS TAB */}
          <TabsContent value="plans" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Subscription Plans</h2>
              <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus size={18} className="mr-2" />
                    Create Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Subscription Plan</DialogTitle>
                  </DialogHeader>
                  <CreatePlanForm onSuccess={loadData} />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-3xl font-bold text-blue-600 mb-4">
                    ${plan.price_usd}/month
                  </p>

                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Modes:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {plan.available_modes.map((mode) => (
                          <Badge key={mode}>{mode}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Max Venues: {plan.max_venues || "Unlimited"}
                      </p>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Edit2 size={16} className="mr-2" />
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TENANTS TAB */}
          <TabsContent value="tenants" className="space-y-4">
            <h2 className="text-2xl font-bold">Tenant Mode Access</h2>

            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Active Modes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.id}</TableCell>
                      <TableCell>{tenant.email}</TableCell>
                      <TableCell>{tenant.plan_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {tenant.active_modes.map((mode) => (
                            <Badge key={mode} variant="secondary">
                              {mode}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Edit2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* UPGRADE REQUESTS TAB */}
          <TabsContent value="upgrades" className="space-y-4">
            <h2 className="text-2xl font-bold">Pending Upgrade Requests</h2>

            {upgradeRequests.length === 0 ? (
              <div className="text-center py-12">
                <Unlock size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No pending upgrade requests
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upgradeRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center justify-between border border-amber-200 dark:border-amber-900"
                  >
                    <div>
                      <h3 className="font-bold mb-1">
                        Request to unlock {request.requested_mode}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Tenant: {request.tenant_id}
                      </p>
                      <p className="text-lg font-bold text-amber-600 mt-2">
                        ${request.payment_required}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        onClick={() => handleApproveUpgrade(request.id, loadData)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleRejectUpgrade(request.id, loadData)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="space-y-4">
            <h2 className="text-2xl font-bold">Analytics</h2>

            <div className="grid grid-cols-4 gap-4">
              <AnalyticsCard
                title="Total Tenants"
                value={tenants.length}
                icon={<Users />}
              />
              <AnalyticsCard
                title="Active Modes"
                value={new Set(tenants.flatMap((t) => t.active_modes)).size}
                icon={<Unlock />}
              />
              <AnalyticsCard
                title="Pending Upgrades"
                value={upgradeRequests.length}
                icon={<TrendingUp />}
              />
              <AnalyticsCard
                title="Monthly Revenue"
                value={`$${calculateMonthlyRevenue(tenants, plans)}`}
                icon={<DollarSign />}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, value, icon }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </div>
      <div className="text-4xl text-gray-400">{icon}</div>
    </div>
  </div>
);

const CreatePlanForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  return (
    <div className="space-y-4">
      <Input placeholder="Plan name" />
      <Input type="number" placeholder="Price (USD)" />
      <Textarea placeholder="Description" />
      <div>
        <label className="text-sm font-semibold">Available Modes</label>
        <div className="flex gap-2 mt-2">
          {["mess", "restaurant", "canteen"].map((mode) => (
            <label key={mode} className="flex items-center gap-2">
              <input type="checkbox" defaultChecked={mode === "mess"} />
              <span className="text-sm">{mode}</span>
            </label>
          ))}
        </div>
      </div>
      <Button onClick={onSuccess} className="w-full">
        Create Plan
      </Button>
    </div>
  );
};

// ============================================================================
// HANDLERS
// ============================================================================

const handleApproveUpgrade = async (requestId: string, onSuccess: () => void) => {
  try {
    await supabase
      .from("mode_activation.mode_upgrade_requests")
      .update({
        request_status: "payment_pending",
        approved_at: new Date(),
      })
      .eq("id", requestId);
    onSuccess();
  } catch (error) {
    console.error("Error approving upgrade:", error);
  }
};

const handleRejectUpgrade = async (requestId: string, onSuccess: () => void) => {
  try {
    await supabase
      .from("mode_activation.mode_upgrade_requests")
      .update({ request_status: "rejected" })
      .eq("id", requestId);
    onSuccess();
  } catch (error) {
    console.error("Error rejecting upgrade:", error);
  }
};

const calculateMonthlyRevenue = (
  tenants: TenantInfo[],
  plans: SubscriptionPlan[]
): number => {
  return tenants.reduce((total, tenant) => {
    const plan = plans.find((p) => p.name === tenant.plan_name);
    return total + (plan?.price_usd || 0);
  }, 0);
};

export default SuperAdminModeManagement;
