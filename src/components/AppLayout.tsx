import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { ThemeToggle } from './ThemeToggle';
import { Footer } from './Footer';
import { NotificationCenter } from './NotificationCenter';
import { useProfile } from '@/hooks/useProfile';
import { LogoHorizontal } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

export function AppLayout({ children, hideNavigation = false }: AppLayoutProps) {
  const navigate = useNavigate();
  const { profile } = useProfile();

  if (hideNavigation) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <main className="flex-1 flex flex-col overflow-x-hidden min-w-0">
          <div className="w-full max-w-4xl mx-auto px-4 py-6 flex-1 min-w-0">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="flex flex-1">
        <DesktopSidebar />
        <main className="flex-1 pb-20 md:pb-0 md:ml-64 flex flex-col overflow-x-hidden min-w-0">
          {/* Mobile Header */}
          <div className="md:hidden sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border flex flex-col">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogoHorizontal className="h-8 w-auto" showText={true} textClassName="font-bold text-foreground text-sm" />
                {profile && (
                  <div className="backdrop-blur-xl border border-border bg-card/80 px-3 py-1 rounded-lg shadow-lg shadow-glass">
                    <p className="text-xs text-foreground font-medium truncate max-w-[100px]">
                      {profile.business_name}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <NotificationCenter />
                <ThemeToggle />
              </div>
            </div>
            <div className="px-4 pb-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => navigate('/mode-selection')}
              >
                <ArrowLeftRight size={16} />
                <span>Switch Mode</span>
              </Button>
            </div>
          </div>
          <div className="w-full max-w-4xl mx-auto px-4 py-6 flex-1 min-w-0">
            {children}
          </div>
          <Footer />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
