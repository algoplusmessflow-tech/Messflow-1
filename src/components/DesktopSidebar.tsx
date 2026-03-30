import { Home, Users, UtensilsCrossed, Package, LogOut, Receipt, UserCog, Settings, CreditCard, FileBarChart, Truck, FileText, UserPlus, ChefHat, Gift, MapPin } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';
import { NotificationCenter } from '@/components/NotificationCenter';
import { ModeSwitcher } from '@/components/ModeSwitcher';

import { useAppMode } from '@/contexts/ModeContext';

const getNavItems = (mode: string) => {
  const commonEnd = [
    { to: '/reports', icon: FileBarChart, label: 'Reports' },
    { to: '/sales', icon: UserPlus, label: 'Sales Team' },
    { to: '/referrals', icon: Gift, label: 'Referrals' },
    { to: '/pricing', icon: CreditCard, label: 'Pricing' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  switch (mode) {
    case 'restaurant':
      return [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/tables', icon: UtensilsCrossed, label: 'Tables' },
        { to: '/orders', icon: Receipt, label: 'Orders' },
        { to: '/inventory', icon: Package, label: 'Inventory' },
        { to: '/kitchen-prep', icon: ChefHat, label: 'Kitchen Prep' },
        { to: '/staff', icon: UserCog, label: 'Staff & Payroll' },
        { to: '/invoices', icon: FileText, label: 'Invoices' },
        ...commonEnd,
      ];
    case 'canteen':
      return [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/members', icon: Users, label: 'Members' },
        { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
        { to: '/tokens', icon: Receipt, label: 'Tokens' },
        { to: '/inventory', icon: Package, label: 'Inventory' },
        { to: '/kitchen-prep', icon: ChefHat, label: 'Kitchen Prep' },
        { to: '/staff', icon: UserCog, label: 'Staff & Payroll' },
        { to: '/invoices', icon: FileText, label: 'Invoices' },
        ...commonEnd,
      ];
    case 'cloud_kitchen':
      return [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/orders', icon: Receipt, label: 'Orders' },
        { to: '/inventory', icon: Package, label: 'Inventory' },
        { to: '/kitchen-prep', icon: ChefHat, label: 'Kitchen Prep' },
        { to: '/expenses', icon: Receipt, label: 'Expenses' },
        { to: '/delivery', icon: Truck, label: 'Delivery' },
        { to: '/zones', icon: MapPin, label: 'Zones' },
        { to: '/staff', icon: UserCog, label: 'Staff & Payroll' },
        { to: '/invoices', icon: FileText, label: 'Invoices' },
        ...commonEnd,
      ];
    case 'mess':
    default:
      return [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/members', icon: Users, label: 'Members' },
        { to: '/staff', icon: UserCog, label: 'Staff & Payroll' },
        { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
        { to: '/inventory', icon: Package, label: 'Inventory' },
        { to: '/expenses', icon: Receipt, label: 'Expenses' },
        { to: '/delivery', icon: Truck, label: 'Delivery' },
        { to: '/zones', icon: MapPin, label: 'Zones' },
        { to: '/kitchen-prep', icon: ChefHat, label: 'Kitchen Prep' },
        { to: '/invoices', icon: FileText, label: 'Invoices' },
        ...commonEnd,
      ];
  }
};

export function DesktopSidebar() {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { mode } = useAppMode();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-sidebar-background backdrop-blur-xl border-r border-sidebar-border shadow-glass">
      <div className="flex flex-col flex-1 pt-6 pb-4 overflow-y-auto">
        <div className="px-4 mb-8 flex items-center justify-between">
          <div className="flex flex-col items-center">
            <Logo className="h-12 w-auto" showText={true} textClassName="text-lg font-bold text-foreground mt-1" />
            {profile && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {profile.business_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <ThemeToggle />
          </div>
        </div>

        <div className="px-3 mb-4">
          <ModeSwitcher />
        </div>

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {getNavItems(mode).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );
}
