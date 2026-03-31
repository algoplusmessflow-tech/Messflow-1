// PRODUCTION-READY TENANT MANAGEMENT TAB
// File: src/components/TenantManagementTab.tsx
// Enhanced: Members Summary, Mode Activation, Filters, Export

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, Building2, Users, CreditCard, Zap, CheckCircle,
  TrendingUp, Clock, UserPlus, Download, Filter, ChevronDown,
  MoreHorizontal, Mail, Calendar, HardDrive, Activity, AlertTriangle,
  XCircle
} from 'lucide-react';

export interface TenantProfile {
  id: string;
  user_id: string;
  business_name: string;
  owner_email: string;
  plan_type: 'free' | 'pro' | 'enterprise';
  member_count: number;
  payment_status: 'paid' | 'unpaid';
  subscription_status: 'active' | 'trial' | 'expired';
  subscription_expiry: string | null;
  storage_used: number;
  storage_limit: number;
  created_at: string;
}

export interface TenantWithModes extends TenantProfile {
  active_modes: string[];
  max_allowed_modes?: number;
}

const MODE_CONFIG = {
  mess: {
    id: 'mess',
    label: 'Mess',
    icon: '🍱',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    activeColor: 'bg-blue-500/20 text-blue-700 ring-blue-500/50',
    description: 'Meal service management',
    features: ['Member management', 'Menu planning', 'Billing', 'Kitchen portal'],
    price: 'Included'
  },
  restaurant: {
    id: 'restaurant',
    label: 'Restaurant',
    icon: '🍽️',
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    activeColor: 'bg-orange-500/20 text-orange-700 ring-orange-500/50',
    description: 'Table & reservation',
    features: ['Table management', 'Reservations', 'Food menu', 'KOT system'],
    price: '$99.99/mo'
  },
  canteen: {
    id: 'canteen',
    label: 'Canteen',
    icon: '🥘',
    color: 'bg-green-500/10 text-green-600 border-green-500/30',
    activeColor: 'bg-green-500/20 text-green-700 ring-green-500/50',
    description: 'Bulk meal service',
    features: ['Bulk orders', 'Inventory', 'Delivery zones', 'Analytics'],
    price: '$99.99/mo'
  }
} as const;

const MODE_COLORS = {
  mess: { bg: 'bg-blue-500', text: 'text-blue-600' },
  restaurant: { bg: 'bg-orange-500', text: 'text-orange-600' },
  canteen: { bg: 'bg-green-500', text: 'text-green-600' }
} as const;

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = {
    active: { class: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', label: 'Active', icon: CheckCircle },
    trial: { class: 'bg-amber-500/15 text-amber-700 border-amber-500/30', label: 'Trial', icon: Clock },
    expired: { class: 'bg-red-500/15 text-red-700 border-red-500/30', label: 'Expired', icon: AlertTriangle }
  }[status] || { class: 'bg-gray-500/15 text-gray-700 border-gray-500/30', label: status, icon: AlertTriangle };

  const Icon = config.icon;

  return (
    <Badge className={`${config.class} border font-medium gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

const PlanBadge: React.FC<{ plan: string }> = ({ plan }) => {
  const config = {
    enterprise: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
    pro: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
    free: 'bg-gray-500/15 text-gray-700 border-gray-500/30'
  }[plan] || 'bg-gray-500/15 text-gray-700 border-gray-500/30';

  return (
    <Badge className={`${config} border font-semibold uppercase text-[10px] tracking-wide`}>
      {plan}
    </Badge>
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (date: string | null): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Stats Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: 'default' | 'emerald' | 'amber' | 'red' | 'blue' | 'purple';
  subtitle?: string;
}> = ({ title, value, icon: Icon, trend, color = 'default', subtitle }) => {
  const colorMap = {
    default: 'text-foreground',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600'
  };

  const iconBgMap = {
    default: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-600',
    red: 'bg-red-500/10 text-red-600',
    blue: 'bg-blue-500/10 text-blue-600',
    purple: 'bg-purple-500/10 text-purple-600'
  };

  return (
    <Card className="border-border/60 hover:border-border/80 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1 text-[10px]">
                <TrendingUp className={`h-3 w-3 ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                <span className={trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
                </span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg ${iconBgMap[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Mode Badge Component
const ModeBadge: React.FC<{ mode: string; active: boolean; showLabel?: boolean }> = ({ mode, active, showLabel = true }) => {
  const config = MODE_CONFIG[mode as keyof typeof MODE_CONFIG];
  if (!config) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
        active
          ? `${MODE_COLORS[mode as keyof typeof MODE_COLORS].bg}/20 ${MODE_COLORS[mode as keyof typeof MODE_COLORS].text} ring-1 ring-offset-1 ${MODE_COLORS[mode as keyof typeof MODE_COLORS].bg}/30`
          : 'bg-muted/50 text-muted-foreground/60 border-transparent'
      }`}
    >
      <span className="text-sm">{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};

// Mode Badge Component (Interactive)
const ModeBadgeInteractive: React.FC<{
  mode: string;
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
}> = ({ mode, active, disabled, onToggle }) => {
  const config = MODE_CONFIG[mode as keyof typeof MODE_CONFIG];
  if (!config) return null;

  const colorClass = MODE_COLORS[mode as keyof typeof MODE_COLORS];

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
        disabled
          ? 'cursor-not-allowed opacity-50 bg-muted/50 text-muted-foreground/60 border-transparent'
          : active
            ? `${colorClass.bg}/20 ${colorClass.text} ring-1 ${colorClass.bg}/30 cursor-pointer hover:opacity-80`
            : 'bg-muted/50 text-muted-foreground/60 border-transparent hover:bg-muted cursor-pointer'
      }`}
      title={disabled ? 'Activate subscription to manage modes' : (active ? `Click to deactivate ${config.label}` : `Click to activate ${config.label}`)}
    >
      <span className="text-sm">{config.icon}</span>
      <span>{config.label}</span>
      {active && !disabled && (
        <CheckCircle className="h-3 w-3 ml-1" />
      )}
    </button>
  );
};

// Tenant Card Component
const TenantCard: React.FC<{
  tenant: TenantWithModes;
  onActivate: (id: string) => Promise<void>;
  onDeactivate: (id: string) => Promise<void>;
  onToggleMode: (tenantId: string, mode: string, isActive: boolean) => Promise<void>;
  onExportMembers: (tenant: TenantWithModes) => void;
  isLoading: boolean;
}> = ({ tenant, onActivate, onDeactivate, onToggleMode, onExportMembers, isLoading }) => {
  const [togglingMode, setTogglingMode] = useState<string | null>(null);
  const isActive = tenant.subscription_status === 'active';
  const storagePercent = tenant.storage_limit > 0 ? (tenant.storage_used / tenant.storage_limit) * 100 : 0;
  const isLowStorage = storagePercent > 80;

  const handleModeToggle = async (mode: string) => {
    if (!isActive || togglingMode) return;
    const isCurrentlyActive = tenant.active_modes.includes(mode);
    
    // Prevent deactivating mess mode (always required)
    if (isCurrentlyActive && mode === 'mess') return;
    
    setTogglingMode(mode);
    try {
      await onToggleMode(tenant.user_id, mode, isCurrentlyActive);
    } finally {
      setTogglingMode(null);
    }
  };

  return (
    <div className={`group relative border rounded-xl bg-gradient-to-br from-card via-card/80 to-muted/20 p-5 transition-all duration-200 ${
      isActive ? 'border-border/60 hover:border-border/90 hover:shadow-md' : 'border-dashed border-muted opacity-75'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-border/40">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate pr-2">{tenant.business_name}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <Mail className="h-3 w-3 text-muted-foreground/70" />
            <p className="text-[11px] text-muted-foreground truncate">{tenant.owner_email}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <PlanBadge plan={tenant.plan_type} />
          <StatusBadge status={tenant.subscription_status} />
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/30">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Members</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground">{tenant.member_count}</span>
            <span className="text-[10px] text-muted-foreground">active</span>
          </div>
        </div>

        <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/30">
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Payment</span>
          </div>
          <Badge className={`text-[10px] ${tenant.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-700' : 'bg-red-500/20 text-red-700'} font-semibold w-fit`}>
            {tenant.payment_status === 'paid' ? '✓ Paid' : '✗ Due'}
          </Badge>
        </div>
      </div>

      {/* Subscription Info */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">
            {tenant.subscription_expiry ? `Expires ${formatDate(tenant.subscription_expiry)}` : 'No expiry'}
          </span>
        </div>
        {isLowStorage && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            Low storage
          </div>
        )}
      </div>

      {/* Modes Section - Clickable */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-foreground">Services</span>
            {!isActive && (
              <span className="text-[10px] text-muted-foreground/60">(inactive)</span>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
            {tenant.active_modes.length}/3
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.values(MODE_CONFIG).map(mode => (
            <ModeBadgeInteractive
              key={mode.id}
              mode={mode.id}
              active={tenant.active_modes.includes(mode.id)}
              disabled={!isActive || (tenant.active_modes.includes(mode.id) && mode.id === 'mess')}
              onToggle={() => handleModeToggle(mode.id)}
            />
          ))}
        </div>
        {!isActive && (
          <p className="text-[10px] text-muted-foreground/60 mt-2">
            Activate subscription to manage services
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border/40">
        {isActive ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeactivate(tenant.id)}
              disabled={isLoading}
              className="flex-1 h-8 text-[11px] border-red-500/30 text-red-600 hover:bg-red-500/10 hover:border-red-500/50"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Deactivate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExportMembers(tenant)}
              className="flex-1 h-8 text-[11px]"
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onActivate(tenant.id)}
            disabled={isLoading}
            className="w-full h-8 text-[11px] border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-500/50"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Activate Subscription
          </Button>
        )}
      </div>
    </div>
  );
};

// Mode Management Dialog
const ModeManagementDialog: React.FC<{
  tenant: TenantWithModes | null;
  isOpen: boolean;
  onClose: () => void;
  onActivateMode: (tenantId: string, mode: string) => Promise<void>;
  onDeactivateMode: (tenantId: string, mode: string) => Promise<void>;
  isLoading: boolean;
}> = ({ tenant, isOpen, onClose, onActivateMode, onDeactivateMode, isLoading }) => {
  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">{tenant.business_name}</DialogTitle>
              <DialogDescription className="text-sm">Configure platform modes for this business owner</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          {Object.values(MODE_CONFIG).map(mode => {
            const isActive = tenant.active_modes.includes(mode.id);

            return (
              <div
                key={mode.id}
                className={`relative border-2 rounded-xl p-5 transition-all ${
                  isActive
                    ? 'border-primary/50 bg-primary/5 shadow-sm'
                    : 'border-border/60 bg-card hover:border-border/80'
                }`}
              >
                {isActive && (
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-primary text-primary-foreground text-[10px] gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{mode.icon}</div>
                  <h4 className="font-bold text-foreground text-sm">{mode.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{mode.description}</p>
                </div>

                <div className="space-y-2 mb-4 py-3 border-y border-border/40">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Features</p>
                  {mode.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-4 text-center">
                  <p className="text-sm font-bold text-primary">{mode.price}</p>
                </div>

                {isActive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDeactivateMode(tenant.user_id, mode.id)}
                    disabled={isLoading}
                    className="w-full h-9 text-xs border-red-500/30 text-red-600 hover:bg-red-500/10"
                  >
                    Deactivate Mode
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onActivateMode(tenant.user_id, mode.id)}
                    disabled={isLoading}
                    className="w-full h-9 text-xs"
                  >
                    Activate Mode
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-muted/40 rounded-lg p-3 border border-border/40">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Mode changes take effect immediately. 
            Deactivated modes will hide from the tenant's dashboard.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
export const TenantManagementTab: React.FC<{
  tenants: TenantWithModes[];
  isLoading: boolean;
  onActivate: (id: string) => Promise<void>;
  onDeactivate: (id: string) => Promise<void>;
  onToggleMode: (tenantId: string, mode: string, isActive: boolean) => Promise<void>;
  onExportMembers: (tenant: TenantWithModes) => void;
}> = ({ tenants, isLoading, onActivate, onDeactivate, onToggleMode, onExportMembers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'expired'>('all');

  const filteredTenants = useMemo(() => {
    return tenants.filter(tenant => {
      const matchesSearch =
        tenant.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.owner_email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || tenant.subscription_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tenants, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const active = tenants.filter(t => t.subscription_status === 'active');
    const trial = tenants.filter(t => t.subscription_status === 'trial');
    const expired = tenants.filter(t => t.subscription_status === 'expired');

    return {
      total: tenants.length,
      active: active.length,
      trial: trial.length,
      expired: expired.length,
      totalMembers: tenants.reduce((sum, t) => sum + (t.member_count || 0), 0),
      activeMembers: active.reduce((sum, t) => sum + (t.member_count || 0), 0),
      totalStorage: tenants.reduce((sum, t) => sum + (t.storage_used || 0), 0),
      modeDistribution: {
        mess: tenants.filter(t => t.active_modes.includes('mess')).length,
        restaurant: tenants.filter(t => t.active_modes.includes('restaurant')).length,
        canteen: tenants.filter(t => t.active_modes.includes('canteen')).length,
      }
    };
  }, [tenants]);

  const filterTabs: { value: 'all' | 'active' | 'trial' | 'expired'; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'active', label: 'Active', count: stats.active },
    { value: 'trial', label: 'Trial', count: stats.trial },
    { value: 'expired', label: 'Expired', count: stats.expired },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total Tenants"
          value={stats.total}
          icon={Building2}
          color="default"
          subtitle={`${stats.totalMembers} total members`}
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={CheckCircle}
          color="emerald"
          subtitle={`${stats.activeMembers} members`}
        />
        <StatCard
          title="Trial"
          value={stats.trial}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Mode Adoption"
          value={`${((stats.modeDistribution.mess + stats.modeDistribution.restaurant + stats.modeDistribution.canteen) / (stats.total * 3) * 100).toFixed(0)}%`}
          icon={Zap}
          color="blue"
          subtitle="across all modes"
        />
      </div>

      {/* Members Summary */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Members Overview
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/40 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Total Members</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalMembers}</p>
              <p className="text-[10px] text-muted-foreground">across all tenants</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-medium">Active Members</p>
              <p className="text-2xl font-bold text-emerald-700">{stats.activeMembers}</p>
              <p className="text-[10px] text-emerald-600/70">in active tenants</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Avg per Tenant</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.total > 0 ? Math.round(stats.totalMembers / stats.total) : 0}
              </p>
              <p className="text-[10px] text-muted-foreground">members average</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Top Tenant</p>
              <p className="text-lg font-bold text-foreground truncate">
                {tenants.sort((a, b) => (b.member_count || 0) - (a.member_count || 0))[0]?.business_name || '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {tenants.sort((a, b) => (b.member_count || 0) - (a.member_count || 0))[0]?.member_count || 0} members
              </p>
            </div>
          </div>

          {/* Mode Distribution */}
          <div className="mt-4 pt-4 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground mb-3">Mode Adoption</p>
            <div className="grid grid-cols-3 gap-3">
              {Object.values(MODE_CONFIG).map(mode => {
                const count = stats.modeDistribution[mode.id as keyof typeof stats.modeDistribution];
                const percent = stats.total > 0 ? (count / stats.total * 100) : 0;
                return (
                  <div key={mode.id} className="p-3 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{mode.icon}</span>
                        <span className="text-xs font-medium">{mode.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${MODE_COLORS[mode.id as keyof typeof MODE_COLORS].bg} transition-all`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{percent.toFixed(0)}% of tenants</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by business name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          {filterTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                statusFilter === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                statusFilter === tab.value ? 'bg-primary/15 text-primary' : 'bg-muted'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredTenants.length} of {tenants.length} tenants
        </span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-primary hover:underline"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Tenant Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[320px] rounded-xl" />
          ))}
        </div>
      ) : filteredTenants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTenants.map(tenant => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onActivate={onActivate}
              onDeactivate={onDeactivate}
              onToggleMode={onToggleMode}
              onExportMembers={onExportMembers}
              isLoading={isLoading}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 bg-muted/10">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No tenants found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {searchQuery ? 'Try adjusting your search terms' : 'No tenants match the selected filter'}
            </p>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default TenantManagementTab;
