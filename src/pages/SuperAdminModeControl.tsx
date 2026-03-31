// src/pages/SuperAdminModeControl.tsx
// SUPERADMIN DASHBOARD - Manage user mode activation and subscriptions

import React, { useState, useEffect } from "react";
import {
  Settings,
  Users,
  Lock,
  Unlock,
  Crown,
  ChefHat,
  Users as UsersIcon,
  ShoppingCart,
  Toggle2,
  Zap,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Mode, PlanTier } from "@/contexts/ModeContext";

interface UserWithModes {
  id: string;
  email: string;
  name?: string;
  modes: {
    restaurant: { isActive: boolean; planTier: PlanTier };
    mess: { isActive: boolean; planTier: PlanTier };
    canteen: { isActive: boolean; planTier: PlanTier };
  };
}

const MODE_INFO = {
  restaurant: {
    label: "Restaurant",
    icon: ChefHat,
    color: "blue",
  },
  mess: {
    label: "Mess/Catering",
    icon: UsersIcon,
    color: "purple",
  },
  canteen: {
    label: "Canteen",
    icon: ShoppingCart,
    color: "orange",
  },
};

export const SuperAdminModeControl: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<UserWithModes[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithModes | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load users and their mode statuses
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Get all users from Supabase
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      // Fetch mode subscriptions for each user
      const usersData: UserWithModes[] = [];

      for (const user of authUsers || []) {
        const { data: modes, error: modesError } = await supabase
          .from("user_subscription_modes")
          .select("mode_name, is_active, plan_tier")
          .eq("user_id", user.id);

        if (modesError) throw modesError;

        const userModes: UserWithModes["modes"] = {
          restaurant: { isActive: false, planTier: "free" },
          mess: { isActive: false, planTier: "free" },
          canteen: { isActive: false, planTier: "free" },
        };

        modes?.forEach((mode: any) => {
          userModes[mode.mode_name as Mode] = {
            isActive: mode.is_active,
            planTier: mode.plan_tier,
          };
        });

        usersData.push({
          id: user.id,
          email: user.email || "",
          name: user.user_metadata?.name,
          modes: userModes,
        });
      }

      setUsers(usersData);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = async (
    userId: string,
    mode: Mode,
    isActive: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("user_subscription_modes")
        .upsert(
          {
            user_id: userId,
            mode_name: mode,
            is_active: !isActive,
            plan_tier: "pro",
          },
          { onConflict: "user_id,mode_name" }
        );

      if (error) throw error;

      // Update local state
      setUsers(
        users.map((u) =>
          u.id === userId
            ? {
                ...u,
                modes: {
                  ...u.modes,
                  [mode]: {
                    ...u.modes[mode],
                    isActive: !isActive,
                  },
                },
              }
            : u
        )
      );
    } catch (err) {
      console.error("Error toggling mode:", err);
    }
  };

  const handleChangePlan = async (
    userId: string,
    mode: Mode,
    newTier: PlanTier
  ) => {
    try {
      const { error } = await supabase
        .from("user_subscription_modes")
        .update({ plan_tier: newTier })
        .eq("user_id", userId)
        .eq("mode_name", mode);

      if (error) throw error;

      setUsers(
        users.map((u) =>
          u.id === userId
            ? {
                ...u,
                modes: {
                  ...u.modes,
                  [mode]: {
                    ...u.modes[mode],
                    planTier: newTier,
                  },
                },
              }
            : u
        )
      );
    } catch (err) {
      console.error("Error changing plan:", err);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin">
          <Zap size={32} className="text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Crown size={32} className="text-amber-600" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Mode Control Dashboard
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage user access to Restaurant, Mess, and Canteen modes
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search users by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  User
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Restaurant
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Mess
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Canteen
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {user.name || "User"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                  </td>

                  {/* Restaurant Mode */}
                  <td className="px-6 py-4">
                    <ModeCell
                      isActive={user.modes.restaurant.isActive}
                      planTier={user.modes.restaurant.planTier}
                      onClick={() => {
                        setSelectedUser(user);
                        setIsModalOpen(true);
                      }}
                      onToggle={() =>
                        handleToggleMode(
                          user.id,
                          "restaurant",
                          user.modes.restaurant.isActive
                        )
                      }
                    />
                  </td>

                  {/* Mess Mode */}
                  <td className="px-6 py-4">
                    <ModeCell
                      isActive={user.modes.mess.isActive}
                      planTier={user.modes.mess.planTier}
                      onClick={() => {
                        setSelectedUser(user);
                        setIsModalOpen(true);
                      }}
                      onToggle={() =>
                        handleToggleMode(
                          user.id,
                          "mess",
                          user.modes.mess.isActive
                        )
                      }
                    />
                  </td>

                  {/* Canteen Mode */}
                  <td className="px-6 py-4">
                    <ModeCell
                      isActive={user.modes.canteen.isActive}
                      planTier={user.modes.canteen.planTier}
                      onClick={() => {
                        setSelectedUser(user);
                        setIsModalOpen(true);
                      }}
                      onToggle={() =>
                        handleToggleMode(
                          user.id,
                          "canteen",
                          user.modes.canteen.isActive
                        )
                      }
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setIsModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Edit Modal */}
      {selectedUser && (
        <UserEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          user={selectedUser}
          onChangePlan={handleChangePlan}
          onToggleMode={handleToggleMode}
        />
      )}
    </div>
  );
};

// ============================================================================
// MODE CELL COMPONENT
// ============================================================================

interface ModeCellProps {
  isActive: boolean;
  planTier: PlanTier;
  onClick: () => void;
  onToggle: () => void;
}

const ModeCell: React.FC<ModeCellProps> = ({
  isActive,
  planTier,
  onClick,
  onToggle,
}) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        className={`p-2 rounded-lg transition-all ${
          isActive
            ? "bg-green-100 text-green-600"
            : "bg-gray-100 text-gray-400"
        }`}
      >
        {isActive ? <Unlock size={16} /> : <Lock size={16} />}
      </button>
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        {isActive ? planTier.toUpperCase() : "LOCKED"}
      </span>
    </div>
  );
};

// ============================================================================
// USER EDIT MODAL
// ============================================================================

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithModes;
  onChangePlan: (userId: string, mode: Mode, tier: PlanTier) => void;
  onToggleMode: (userId: string, mode: Mode, isActive: boolean) => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onChangePlan,
  onToggleMode,
}) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Edit Modes for {user.email}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {(["restaurant", "mess", "canteen"] as Mode[]).map((mode) => (
            <div key={mode} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {MODE_INFO[mode].label}
                </h3>
                <button
                  onClick={() => onToggleMode(user.id, mode, user.modes[mode].isActive)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    user.modes[mode].isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {user.modes[mode].isActive ? "ACTIVE" : "LOCKED"}
                </button>
              </div>

              {user.modes[mode].isActive && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Plan Tier
                  </label>
                  <select
                    value={user.modes[mode].planTier}
                    onChange={(e) =>
                      onChangePlan(user.id, mode, e.target.value as PlanTier)
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SuperAdminModeControl;
