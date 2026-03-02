import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/i18n';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Heart, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

const AuthPage = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    if (mode === 'reset') {
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) { toast.error(error); return; }
      toast.success(t('auth.resetSent'));
      setMode('login');
      return;
    }

    if (!password || password.length < 6) {
      toast.error(t('auth.passwordMin'));
      setLoading(false);
      return;
    }

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) { toast.error(t('auth.loginError')); return; }
    } else {
      const { error } = await signUp(email, password);
      setLoading(false);
      if (error) { toast.error(error); return; }
      toast.success(t('auth.signupSuccess'));
      setMode('login');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-lg">
            <Heart className="text-primary-foreground" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('auth.appName')}</h1>
          <p className="text-muted-foreground text-sm">{t('auth.appDesc')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="medical-card-elevated space-y-4">
          <h2 className="text-lg font-bold text-center">
            {mode === 'login' ? t('auth.login') : mode === 'signup' ? t('auth.signup') : t('auth.resetTitle')}
          </h2>

          <div className="relative">
            <Mail size={16} className="absolute start-3 top-3 text-muted-foreground" />
            <Input
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="ps-9"
              required
              autoComplete="email"
            />
          </div>

          {mode !== 'reset' && (
            <div className="relative">
              <Lock size={16} className="absolute start-3 top-3 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="ps-9 pe-9"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-3 text-muted-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 size={16} className="animate-spin me-2" />}
            {mode === 'login' ? t('auth.loginBtn') : mode === 'signup' ? t('auth.signupBtn') : t('auth.resetBtn')}
          </Button>

          {mode === 'login' && (
            <button type="button" onClick={() => setMode('reset')}
              className="text-xs text-primary w-full text-center">
              {t('auth.forgotPassword')}
            </button>
          )}
        </form>

        {/* Google Sign In */}
        {mode !== 'reset' && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (error) toast.error(String(error));
              }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t('auth.googleBtn')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("apple", {
                  redirect_uri: window.location.origin,
                });
                if (error) toast.error(String(error));
              }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              {t('auth.appleBtn')}
            </Button>
          </>
        )}

        {/* Toggle */}
        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-primary font-bold">
            {mode === 'login' ? t('auth.signupLink') : t('auth.loginLink')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
