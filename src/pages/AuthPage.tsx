import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/i18n';
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
