import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Lock, Eye, EyeOff, Mail, Key, User, Shield } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useRateLimiter } from '@/hooks/useRateLimiter';
import { useSecurityLogger } from '@/hooks/useSecurityLogger';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('messflow_remember_me') === 'true';
  });
  const navigate = useNavigate();
  const { isLocked, remainingTime, recordAttempt, reset } = useRateLimiter({ maxAttempts: 3, cooldownMs: 30000 });
  const { logLogin, logFailedLogin, logRateLimitHit } = useSecurityLogger();

  // Handle ephemeral sessions (sign out on tab close if not remembered)
  useEffect(() => {
    localStorage.setItem('messflow_remember_me', String(rememberMe));
  }, [rememberMe]);

  useEffect(() => {
    if (rememberMe) return;

    const handleBeforeUnload = () => {
      // Clear session on tab close when not remembered
      navigator.sendBeacon?.('/api/signout'); // Best-effort cleanup
      localStorage.removeItem('sb-' + window.location.hostname + '-auth-token');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [rememberMe]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      logRateLimitHit('login');
      toast.error(`Too many attempts. Please wait ${remainingTime} seconds.`);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      recordAttempt();
      logFailedLogin(email.trim(), error.message);
      toast.error(error.message);
      return;
    }

    // Reset rate limiter on success
    reset();

    // Log successful login
    logLogin(data.user.id);

    // Check if user is super admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    setLoading(false);

    if (roleData) {
      // Super admin - redirect to admin panel
      navigate('/super-admin');
    } else {
      // Regular user - redirect to mode selection
      navigate('/mode-selection');
    }
  };

  const handleGoogleLogin = async () => {
    if (isLocked) {
      logRateLimitHit('google_login');
      toast.error(`Too many attempts. Please wait ${remainingTime} seconds.`);
      return;
    }

    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
        scopes: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
        redirectTo: import.meta.env.VITE_APP_URL
          ? `${import.meta.env.VITE_APP_URL}/dashboard`
          : `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setGoogleLoading(false);
      recordAttempt();
      logFailedLogin('google', error.message);
      toast.error(error.message);
      return;
    }

    // Reset rate limiter on success
    reset();
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address first');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Password reset link sent to your email!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 px-4 py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-bounce"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <Logo className="h-16 w-auto" showText={true} textClassName="text-lg font-bold text-white mt-1 drop-shadow-lg" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
          <CardDescription className="text-white/80">Sign in to manage your mess</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLocked}
                  className="pl-10 bg-white/10 border-white/30 text-white placeholder-white/60 focus:bg-white/20 focus:border-white/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90">Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLocked}
                  className="pl-10 pr-10 bg-white/10 border-white/30 text-white placeholder-white/60 focus:bg-white/20 focus:border-white/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isLocked && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 text-red-200 text-sm border border-red-400/30">
                <Lock className="h-4 w-4" />
                <span>Too many failed attempts. Try again in {remainingTime}s</span>
              </div>
            )}

            {/* Remember Me */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded border-2 border-white/40 bg-white/10 peer-checked:bg-purple-500 peer-checked:border-purple-400 transition-all duration-200 flex items-center justify-center group-hover:border-white/60">
                  {rememberMe && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-white/80 text-sm font-medium group-hover:text-white transition-colors">Remember me</span>
            </label>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-6 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              disabled={loading || isLocked}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLocked ? `Locked (${remainingTime}s)` : 'Sign In'}
            </Button>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/30"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-white/70">Or continue with</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleLogin}
              disabled={googleLoading || isLocked}
              className="w-full bg-card text-foreground hover:bg-muted font-semibold py-6 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3"
            >
              {googleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </Button>

            <div className="flex justify-between w-full text-sm">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-white/80 hover:text-white transition-colors font-medium"
              >
                Forgot Password?
              </button>
              <Link
                to="/signup"
                className="text-white hover:text-purple-200 transition-colors font-medium"
              >
                Create Account
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
