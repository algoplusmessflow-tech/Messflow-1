// src/components/restaurant/RestaurantKitchenPortal.tsx
// STANDALONE KITCHEN ORDER MANAGEMENT FOR RESTAURANT MODE
// Real-time KOT (Kitchen Order Ticket) display with status management

import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  Zap,
  Pause,
  RotateCcw,
  Filter,
  Bell,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// TYPES
// ============================================================================

interface OrderItem {
  name: string;
  quantity: number;
  notes?: string;
}

interface KitchenOrder {
  id: string;
  order_number: number;
  table_id?: string;
  customer_name?: string;
  items: OrderItem[];
  status: "pending" | "in_progress" | "ready" | "served" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_COLORS = {
  pending: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  in_progress: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  ready: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  served: "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800",
  cancelled: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700",
};

const STATUS_ICONS = {
  pending: <AlertCircle className="text-red-600 dark:text-red-400" />,
  in_progress: <ChefHat className="text-yellow-600 dark:text-yellow-400" />,
  ready: <CheckCircle2 className="text-green-600 dark:text-green-400" />,
  served: <CheckCircle2 className="text-gray-600 dark:text-gray-400" />,
  cancelled: <RotateCcw className="text-gray-600 dark:text-gray-400" />,
};

const PRIORITY_COLORS = {
  low: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100",
  normal: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100",
  high: "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100",
  urgent: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100",
};

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_ORDERS: KitchenOrder[] = [
  {
    id: "1",
    order_number: 101,
    table_id: "t-4",
    customer_name: "Table 4",
    items: [
      { name: "Butter Chicken", quantity: 2, notes: "Extra spicy" },
      { name: "Naan", quantity: 3 },
    ],
    status: "pending",
    priority: "high",
    created_at: new Date(Date.now() - 5 * 60000),
  },
  {
    id: "2",
    order_number: 102,
    table_id: "t-2",
    customer_name: "Table 2",
    items: [{ name: "Biriyani", quantity: 1 }, { name: "Raita", quantity: 1 }],
    status: "in_progress",
    priority: "normal",
    created_at: new Date(Date.now() - 12 * 60000),
    started_at: new Date(Date.now() - 10 * 60000),
  },
  {
    id: "3",
    order_number: 103,
    table_id: "t-8",
    customer_name: "Table 8",
    items: [
      { name: "Tandoori Chicken", quantity: 2 },
      { name: "Lemon Rice", quantity: 2 },
    ],
    status: "ready",
    priority: "normal",
    created_at: new Date(Date.now() - 20 * 60000),
    started_at: new Date(Date.now() - 18 * 60000),
    completed_at: new Date(Date.now() - 2 * 60000),
  },
];

// ============================================================================
// ORDER TICKET CARD
// ============================================================================

interface KitchenOrderTicketProps {
  order: KitchenOrder;
  onStatusChange: (orderId: string, status: KitchenOrder["status"]) => void;
  onCancel: (orderId: string) => void;
}

const KitchenOrderTicket: React.FC<KitchenOrderTicketProps> = ({
  order,
  onStatusChange,
  onCancel,
}) => {
  const elapsedMinutes = Math.floor(
    (Date.now() - order.created_at.getTime()) / 60000
  );
  const isUrgent = order.priority === "urgent" && elapsedMinutes > 15;
  const isOverdue = elapsedMinutes > 25;

  return (
    <div
      className={`rounded-lg border-2 p-5 transition-all ${
        STATUS_COLORS[order.status]
      } ${isUrgent || isOverdue ? "ring-2 ring-red-500" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-black text-gray-800 dark:text-white bg-white dark:bg-gray-700 w-12 h-12 rounded-lg flex items-center justify-center">
            {String(order.order_number).padStart(3, "0")}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              {order.customer_name || `Order #${order.order_number}`}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {STATUS_ICONS[order.status]}
              <span className="text-xs font-semibold uppercase tracking-wide">
                {order.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Priority Badge */}
        <Badge className={`${PRIORITY_COLORS[order.priority]} font-semibold`}>
          {order.priority === "urgent" ? (
            <>
              <Zap size={12} className="mr-1" /> URGENT
            </>
          ) : (
            order.priority.toUpperCase()
          )}
        </Badge>
      </div>

      {/* Time Indicator */}
      <div className="mb-4 p-3 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock
            size={16}
            className={
              isOverdue
                ? "text-red-600 dark:text-red-400"
                : "text-gray-600 dark:text-gray-400"
            }
          />
          <span
            className={`font-mono font-bold ${
              isOverdue
                ? "text-red-600 dark:text-red-400"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {elapsedMinutes}m ago
          </span>
        </div>
        {order.status === "in_progress" && (
          <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 px-2 py-1 rounded font-semibold">
            IN PROGRESS
          </span>
        )}
      </div>

      {/* Items List */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
        <h4 className="text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-3 tracking-wide">
          Items
        </h4>
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start">
              <div className="flex-1">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {item.quantity}x {item.name}
                </span>
                {item.notes && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    📝 {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {order.status === "pending" && (
          <Button
            onClick={() => onStatusChange(order.id, "in_progress")}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
          >
            <ChefHat size={16} className="mr-2" />
            Start Cooking
          </Button>
        )}

        {order.status === "in_progress" && (
          <Button
            onClick={() => onStatusChange(order.id, "ready")}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold"
          >
            <CheckCircle2 size={16} className="mr-2" />
            Mark Ready
          </Button>
        )}

        {(order.status === "ready" || order.status === "pending") && (
          <Button
            onClick={() => onCancel(order.id)}
            variant="outline"
            className="flex-1"
          >
            <RotateCcw size={16} className="mr-2" />
            Cancel
          </Button>
        )}

        {order.status === "ready" && (
          <Button
            onClick={() => onStatusChange(order.id, "served")}
            disabled
            variant="secondary"
            className="flex-1 opacity-50"
          >
            <CheckCircle2 size={16} className="mr-2" />
            Served
          </Button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: Restaurant Kitchen Portal
// ============================================================================

interface RestaurantKitchenPortalProps {
  venueId: string;
}

export const RestaurantKitchenPortal: React.FC<RestaurantKitchenPortalProps> = ({
  venueId,
}) => {
  const [orders, setOrders] = useState<KitchenOrder[]>(MOCK_ORDERS);
  const [filterStatus, setFilterStatus] = useState<KitchenOrder["status"] | "all">(
    "all"
  );
  const [soundEnabled, setSoundEnabled] = useState(true);

  const filteredOrders =
    filterStatus === "all"
      ? orders
      : orders.filter((order) => order.status === filterStatus);

  // Sort by priority and time
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.created_at.getTime() - b.created_at.getTime();
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;

  const handleStatusChange = (orderId: string, newStatus: KitchenOrder["status"]) => {
    setOrders(
      orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: newStatus,
              started_at: newStatus === "in_progress" ? new Date() : order.started_at,
              completed_at:
                newStatus === "ready" || newStatus === "served"
                  ? new Date()
                  : order.completed_at,
            }
          : order
      )
    );

    if (soundEnabled && newStatus === "ready") {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBg=="
      );
      audio.play().catch(() => {});
    }
  };

  const handleCancelOrder = (orderId: string) => {
    setOrders(
      orders.map((order) =>
        order.id === orderId ? { ...order, status: "cancelled" } : order
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChefHat size={32} className="text-orange-500" />
              <div>
                <h1 className="text-3xl font-black text-white">Kitchen Portal</h1>
                <p className="text-slate-400 text-sm">
                  {pendingCount} pending • {readyCount} ready
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-3 rounded-lg transition-all ${
                  soundEnabled
                    ? "bg-orange-500 text-white"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                <Volume2 size={20} />
              </button>

              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(
                    e.target.value as KitchenOrder["status"] | "all"
                  )
                }
                className="px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 font-semibold"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="ready">Ready</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {sortedOrders.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">All Caught Up!</h2>
            <p className="text-slate-400">No orders to display</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedOrders.map((order) => (
              <KitchenOrderTicket
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                onCancel={handleCancelOrder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantKitchenPortal;
