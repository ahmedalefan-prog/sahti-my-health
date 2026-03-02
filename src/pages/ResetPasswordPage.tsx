import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Lock, Loader2 } from 'lucide-react';

const ResetPasswordPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error(t('auth.passwordMin')); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('auth.passwordUpdated'));
    navigate('/');
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-muted-foreground">{t('auth.invalidResetLink')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm medical-card-elevated space-y-4">
        <h2 className="text-lg font-bold text-center">{t('auth.newPassword')}</h2>
        <div className="relative">
          <Lock size={16} className="absolute start-3 top-3 text-muted-foreground" />
          <Input
            type="password"
            placeholder={t('auth.newPasswordPlaceholder')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="ps-9"
            minLength={6}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin me-2" />}
          {t('auth.updatePassword')}
        </Button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
