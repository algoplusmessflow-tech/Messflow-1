import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function SalesPersonLogin() {
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalizedCode = accessCode.trim().toUpperCase();
    
    if (!normalizedCode) {
      toast.error('Please enter your access code');
      return;
    }

    if (normalizedCode.length !== 6) {
      toast.error('Access code must be 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      // First query: Find the sales person by access token
      const { data: salesPerson, error: spError } = await supabase
        .from('sales_persons')
        .select('id, name, email, phone, owner_id, access_token, is_active')
        .eq('access_token', normalizedCode)
        .single();

      if (spError || !salesPerson) {
        toast.error('Invalid access code');
        setIsLoading(false);
        return;
      }

      if (!salesPerson.is_active) {
        toast.error('Your account is inactive. Contact your manager.');
        setIsLoading(false);
        return;
      }

      // Second query: Get profile info separately (bypassing join RLS issues)
      let businessName = 'Your Business';
      let businessSlug = '';

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, business_slug')
        .eq('user_id', salesPerson.owner_id)
        .single();

      if (profile) {
        businessName = profile.business_name || 'Your Business';
        businessSlug = profile.business_slug || '';
      }

      // Create session
      const session = {
        id: salesPerson.id,
        name: salesPerson.name,
        email: salesPerson.email,
        phone: salesPerson.phone,
        owner_id: salesPerson.owner_id,
        access_token: salesPerson.access_token,
        business_name: businessName,
        business_slug: businessSlug,
        logged_in_at: new Date().toISOString(),
      };

      localStorage.setItem('sales_person_session', JSON.stringify(session));
      toast.success('Login successful!');
      navigate('/sales-portal', { replace: true });
    } catch (err: any) {
      console.error('[SalesPortal Login] Error:', err);
      toast.error('Login failed: ' + (err.message || 'Unknown error'));
      setIsLoading(false);
    }
  };

  const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setAccessCode(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 border-indigo-200">
        <CardHeader className="space-y-3 pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-foreground">
            Sales Portal Login
          </CardTitle>
          <CardDescription className="text-center text-sm text-muted-foreground">
            Enter your 6-character access code to login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessCode" className="text-sm font-semibold text-foreground">
                Access Code
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="accessCode"
                  type="text"
                  value={accessCode}
                  onChange={handleAccessCodeChange}
                  placeholder="ABC123"
                  className="pl-10 h-14 text-center text-2xl tracking-[0.3em] font-mono font-bold border-2 border-indigo-200 focus:border-indigo-400"
                  disabled={isLoading}
                  autoComplete="off"
                  autoCapitalize="characters"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {accessCode.length}/6 characters
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-xl border-0"
              disabled={isLoading || accessCode.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>

            <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-800">
                  Your 6-character access code was provided by the business owner.
                </p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
