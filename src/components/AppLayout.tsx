import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { ThemeToggle } from './ThemeToggle';
import { Footer } from './Footer';
import { NotificationCenter } from './NotificationCenter';
import { ModeSwitcher } from './ModeSwitcher';
import { useProfile } from '@/hooks/useProfile';
import { LogoHorizontal } from '@/components/Logo';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile } = useProfile();

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
              <ModeSwitcher isMobile={true} />
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
