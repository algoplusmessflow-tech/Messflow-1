// src/pages/SuperAdminModeActivation.tsx
// SUPERADMIN MODE ACTIVATION - Activate/Deactivate modes for tenants

import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Utensils,
  UtensilsCrossed,
  ShoppingCart,
  Lock,
  Unlock,
  Zap,
} from "lucide-react";

interface TenantWithModes {
  id: string;
  tenant_id: string;
  manager_id: string;
  active_modes: string[];
  max_allowed_modes: number;
  plan_id: string;
}

interface LockedMode {
  id: string;
  tenant_id: string;
  mode_name: string;
  upgrade_price_usd: number;
  is_locked: boolean;
}

const MODES_INFO = {
  mess: {
    label: "Mess",
    icon: <Utensils size={18} />,
    color: "bg-blue-100 dark:bg-blue-900",
    description: "Meal plans & subscriptions",
  },
  restaurant: {
    label: "Restaurant",
    icon: <UtensilsCrossed size={18} />,
    color: "bg-orange-100 dark:bg-orange-900",
    description: "Full-service dining",
  },
  canteen: {
    label: "Canteen",
    icon: <ShoppingCart size={18} />,
    color: "bg-green-100 dark:bg-green-900",
    description: "Quick service",
  },
};

export const SuperAdminModeActivation = () => {
  const [tenants, setTenants] = useState<TenantWithModes[]>([]);
  const [lockedModes, setLockedModes] = useState<LockedMode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: tenantsData } = await supabase
        .from("mode_activation.tenant_mode_access")
        .select("*");

      setTenants(tenantsData || []);

      const { data: lockedData } = await supabase
        .from("mode_activation.locked_modes")
        .select("*");

      setLockedModes(lockedData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateMode = async (tenantId: string, mode: string) => {
    try {
      const { error } = await supabase.rpc(
        "mode_activation.activate_mode",
        {
          p_tenant_id: tenantId,
          p_mode: mode,
        }
      );

      if (error) {
        console.error("Activation error:", error);
        alert("Failed to activate mode");
        return;
      }

      loadData();
      setSelectedTenant(null);
      alert("Mode activated successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert("Error activating mode");
    }
  };

  const getAvailableModesToActivate = (tenant: TenantWithModes) => {
    const allModes = ["mess", "restaurant", "canteen"];
    const activeModes = tenant.active_modes || [];
    const canActivate = activeModes.length < tenant.max_allowed_modes;

    return allModes.filter(
      (mode) => !activeModes.includes(mode) && canActivate
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Mode Activation</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Activate or deactivate modes for tenants
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p>Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Tenants</h2>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant ID</TableHead>
                    <TableHead>Active Modes</TableHead>
                    <TableHead>Max Allowed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-mono text-sm">
                        {tenant.tenant_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {tenant.active_modes?.map((mode) => (
                            <Badge
                              key={mode}
                              className={
                                MODES_INFO[mode as keyof typeof MODES_INFO]
                                  ?.color || ""
                              }
                            >
                              {
                                MODES_INFO[mode as keyof typeof MODES_INFO]
                                  ?.icon
                              }
                              {
                                MODES_INFO[mode as keyof typeof MODES_INFO]
                                  ?.label
                              }
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{tenant.max_allowed_modes}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => setSelectedTenant(tenant.id)}
                            >
                              <Zap size={16} className="mr-2" />
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Manage Tenant Modes</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4">
                              <div>
                                <h3 className="font-bold mb-2">Active Modes</h3>
                                <div className="space-y-2">
                                  {tenant.active_modes?.map((mode) => (
                                    <div
                                      key={mode}
                                      className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded"
                                    >
                                      <span className="flex items-center gap-2">
                                        {
                                          MODES_INFO[
                                            mode as keyof typeof MODES_INFO
                                          ]?.icon
                                        }
                                        {
                                          MODES_INFO[
                                            mode as keyof typeof MODES_INFO
                                          ]?.label
                                        }
                                      </span>
                                      <Badge variant="default">Active</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h3 className="font-bold mb-2">
                                  Activate Mode
                                </h3>
                                {getAvailableModesToActivate(tenant).length >
                                0 ? (
                                  <div className="space-y-2">
                                    {getAvailableModesToActivate(tenant).map(
                                      (mode) => (
                                        <Button
                                          key={mode}
                                          onClick={() =>
                                            handleActivateMode(
                                              tenant.tenant_id,
                                              mode
                                            )
                                          }
                                          className="w-full justify-start"
                                        >
                                          <Unlock size={16} className="mr-2" />
                                          Activate{" "}
                                          {
                                            MODES_INFO[
                                              mode as keyof typeof MODES_INFO
                                            ]?.label
                                          }
                                        </Button>
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    All available modes are already active
                                  </p>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Locked Modes</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lockedModes.map((locked) => (
                    <TableRow key={locked.id}>
                      <TableCell className="font-mono text-sm">
                        {locked.tenant_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {
                          MODES_INFO[
                            locked.mode_name as keyof typeof MODES_INFO
                          ]?.label
                        }
                      </TableCell>
                      <TableCell>${locked.upgrade_price_usd}/month</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            locked.is_locked ? "secondary" : "default"
                          }
                        >
                          {locked.is_locked ? (
                            <Lock size={12} className="mr-1" />
                          ) : (
                            <Unlock size={12} className="mr-1" />
                          )}
                          {locked.is_locked ? "Locked" : "Unlocked"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminModeActivation;