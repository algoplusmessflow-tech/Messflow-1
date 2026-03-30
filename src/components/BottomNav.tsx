import { Home, Users, UtensilsCrossed, Receipt, Settings, MoreHorizontal, UserCog, LogOut, Package, CreditCard, FileBarChart, Truck, FileText, UserPlus, ChefHat, Gift, MapPin } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAppMode } from '@/contexts/ModeContext';

const getMainNavItems = (mode: string) => {
  switch (mode) {
    case 'restaurant':
      return [
        { to: '/dashboard', icon: Home, label: 'Home' },
        { to: '/tables', icon: UtensilsCrossed, label: 'Tables' }, // Mock route
        { to: '/orders', icon: Receipt, label: 'Orders' }, // Mock route
        { to: '/kitchen-prep', icon: ChefHat, label: 'Kitchen' },
      ];
    case 'canteen':
      return [
        { to: '/dashboard', icon: Home, label: 'Home' },
        { to: '/members', icon: Users, label: 'Members' },
        { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
        { to: '/tokens', icon: Receipt, label: 'Tokens' }, // Mock route
      ];
    case 'cloud_kitchen':
      return [
        { to: '/dashboard', icon: Home, label: 'Home' },
        { to: '/orders', icon: Receipt, label: 'Orders' }, // Mock route
        { to: '/kitchen-prep', icon: ChefHat, label: 'Kitchen' },
        { to: '/inventory', icon: Package, label: 'Inventory' },
      ];
    case 'mess':
    default:
      return [
        { to: '/dashboard', icon: Home, label: 'Home' },
        { to: '/members', icon: Users, label: 'Members' },
        { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
        { to: '/expenses', icon: Receipt, label: 'Expenses' },
      ];
  }
};

const getMoreNavItems = (mode: string) => {
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
        { to: '/inventory', icon: Package, label: 'Inventory' },
        { to: '/staff', icon: UserCog, label: 'Staff' },
        { to: '/invoices', icon: FileText, label: 'Invoices' },
        ...commonEnd,
      ];
    case 'canteen':
      return [
        { to: '/inventory', icon: Package, label: 'Inventory' },
        { to: '/staff', icon: UserCog, label: 'Staff' },
        { to: '/kitchen-prep', icon: ChefHat, label: 'Kitchen Prep' },
        { to: '/invoices', icon: FileText, label: 'Invoices' },
        ...commonEnd,
      ];
    case 'cloud_kitchen':
      return [
        { to: '/delivery', icon: Truck, label: 'Delivery' },
        { to: '/zones', icon: MapPin, label: 'Zones' },
        { to: '/staff', icon: UserCog, label: 'Staff' },
        { to: '/expenses', icon: Receipt, label: 'Expenses' },
        { to: '/invoices', icon: FileText, label: 'Invoices' },
        ...commonEnd,
      ];
    case 'mess':
    default:
      return [
        { to: '/inventory', icon: Package, label: 'Inventory' },
        { to: '/staff', icon: UserCog, label: 'Staff' },
        { to: '/delivery', icon: Truck, label: 'Delivery' },
        { to: '/zones', icon: MapPin, label: 'Zones' },
        { to: '/kitchen-prep', icon: ChefHat, label: 'Kitchen Prep' },
        { to: '/invoices', icon: FileText, label: 'Invoices' },
        ...commonEnd,
      ];
  }
};

export function BottomNav() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { mode } = useAppMode();
  const mainNavItems = getMainNavItems(mode);
  const moreNavItems = getMoreNavItems(mode);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border z-50 md:hidden pb-safe">
      <div className="flex justify-around items-center h-16">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}

        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 mb-2">
            {moreNavItems.map((item) => (
              <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)}>
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
