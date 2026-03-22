/**
 * Google OAuth callback page.
 * Supabase handles the token exchange automatically.
 * This page just enables Google Drive and redirects to Settings.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle } from 'lucide-react';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Connecting...');

  useEffect(() => {
    const handle = async () => {
      // Supabase automatically processes the OAuth callback
      // We just need to enable Google Drive for the user
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.provider_token) {
        // User has a Google token — enable Drive
        await supabase
          .from('profiles')
          .update({ google_connected: true, storage_provider: 'google_drive' } as any)
          .eq('user_id', session.user.id);
        setMessage('Google Drive connected! Redirecting...');
      } else {
        setMessage('Redirecting...');
      }

      setTimeout(() => navigate('/settings'), 1500);
    };
    handle();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
        <p className="text-lg font-medium">{message}</p>
      </div>
    </div>
  );
}
