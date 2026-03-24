import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }

        // Handle signed out
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }

        // Handle signed in
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          setSession(session);
          setUser(session?.user ?? null);

          // Auto-enable Google Drive and persist tokens for Google sign-in users
          if (session?.provider_token && session?.user) {
            const uid = session.user.id;
            const updateData: Record<string, any> = {
              google_connected: true,
              storage_provider: 'google_drive',
              google_access_token: session.provider_token,
            };
            // Store refresh token only on initial sign-in (it's only provided once)
            if ((session as any).provider_refresh_token) {
              updateData.google_refresh_token = (session as any).provider_refresh_token;
            }
            // Fire and forget — don't block auth flow
            supabase
              .from('profiles')
              .update(updateData as any)
              .eq('user_id', uid)
              .then(() => {});
          }
        }

        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
