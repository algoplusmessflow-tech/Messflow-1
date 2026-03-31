import { Home, Users, UtensilsCrossed, Package, LogOut, Receipt, UserCog, Settings, CreditCard, FileBarChart, Truck, FileText, UserPlus, ChefHat, Gift, MapPin, ArrowLeftRight } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';
import { NotificationCenter } from '@/components/NotificationCenter';

import { useAppMode } from '@/contexts/ModeContext';

const commonEnd = [
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/sales', icon: UserPlus, label: 'Sales Team' },
  { to: '/referrals', icon: Gift, label: 'Referrals' },
  { to: '/pricing', icon: CreditCard, label: 'Pricing' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const navigationMap: Record<string, any[]> = {
  restaurant: [
    { to: '/tables', icon: UtensilsCrossed, label: 'Tables' },
    { to: '/restaurant-menu', icon: UtensilsCrossed, label: 'Menu' },
    { to: '/orders', icon: Receipt, label: 'Orders (POS)' },
    { to: '/kitchen-prep', icon: ChefHat, label: 'Kitchen (KDS)' },
    { to: '/invoices', icon: FileText, label: 'Invoices' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/staff', icon: UserCog, label: 'Staff' },
    ...commonEnd,
  ],
  mess: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/members', icon: Users, label: 'Members' },
    { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
    { to: '/delivery', icon: Truck, label: 'Delivery' },
    { to: '/zones', icon: MapPin, label: 'Zones' },
    { to: '/invoices', icon: FileText, label: 'Invoices' },
    { to: '/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/staff', icon: UserCog, label: 'Staff' },
    ...commonEnd,
  ],
  canteen: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/members', icon: Users, label: 'Members' },
    { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
    { to: '/tokens', icon: Receipt, label: 'Tokens' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/staff', icon: UserCog, label: 'Staff' },
    ...commonEnd,
  ],
  cloud_kitchen: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/orders', icon: Receipt, label: 'Orders' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/kitchen-prep', icon: ChefHat, label: 'Kitchen Prep' },
    { to: '/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/delivery', icon: Truck, label: 'Delivery' },
    { to: '/zones', icon: MapPin, label: 'Zones' },
    { to: '/staff', icon: UserCog, label: 'Staff' },
    { to: '/invoices', icon: FileText, label: 'Invoices' },
    ...commonEnd,
  ]
};

const getNavItems = (mode: string) => {
  return navigationMap[mode] || navigationMap.mess;
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
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => navigate('/mode-selection')}
          >
            <ArrowLeftRight size={18} />
            <span>Switch Mode</span>
          </Button>
        </div>

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {getNavItems(mode).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-3 min-h-[44px] text-sm font-medium transition-colors rounded-md',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground/80 hover:bg-accent hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-foreground")} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 mt-auto pb-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 min-h-[44px] text-foreground/80 hover:text-foreground hover:bg-accent rounded-md"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 text-foreground" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );
}
