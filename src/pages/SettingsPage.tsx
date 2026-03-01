import { useStore } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { Switch } from '@/components/ui/switch';
import { Moon, Bell, Clock, Trash2, Settings, Languages, Brain, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

const SettingsPage = () => {
  const { settings, updateSettings, resetAllData } = useStore();
  const { t, lang, labLang, setLang, setLabLang } = useLanguage();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem('sahti_openai_key') || '');
  const [showKey, setShowKey] = useState(false);
  const isAiConnected = !!localStorage.getItem('sahti_openai_key');

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error(t('set.notifError'));
        return;
      }
    }
    updateSettings({ notificationsEnabled: enabled });
    toast.success(enabled ? t('set.notifOn') : t('set.notifOff'));
  };

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">{t('set.title')}</h1>

      {/* Language */}
      <div className="medical-card-elevated mb-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Languages size={18} className="text-primary" /> {t('set.language')} / Language
        </h3>
        <div className="mb-4">
          <p className="font-medium mb-2">{t('set.appLanguage')}</p>
          <div className="flex gap-2">
            <button onClick={() => setLang('ar')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${lang === 'ar' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
              عربي
            </button>
            <button onClick={() => setLang('en')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${lang === 'en' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
              English
            </button>
          </div>
        </div>
        <div>
          <p className="font-medium mb-2">{t('set.labTestNames')}</p>
          <div className="flex gap-2">
            <button onClick={() => setLabLang('ar')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${labLang === 'ar' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
              عربي
            </button>
            <button onClick={() => setLabLang('en')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${labLang === 'en' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
              English
            </button>
          </div>
        </div>
      </div>

      {/* AI Assistant */}
      <div className="medical-card-elevated mb-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Brain size={18} className="text-primary" /> {t('set.ai')}
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">{t('set.aiKey')}</p>
            <span className={`text-xs font-bold ${isAiConnected ? 'text-success' : 'text-destructive'}`}>
              {isAiConnected ? t('set.aiConnected') : t('set.aiDisconnected')}
            </span>
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={openaiKey}
              onChange={e => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-secondary rounded-xl px-4 py-3 pe-12 outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
            />
            <button onClick={() => setShowKey(!showKey)} className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button
            onClick={() => {
              if (openaiKey.trim()) {
                localStorage.setItem('sahti_openai_key', openaiKey.trim());
                toast.success(t('set.aiKeySaved'));
              } else {
                localStorage.removeItem('sahti_openai_key');
                toast.info(t('set.aiKeyRemoved'));
              }
              // Force re-render
              window.dispatchEvent(new Event('storage'));
            }}
            className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-2xl"
          >
            {t('set.aiSaveKey')}
          </button>
          <p className="text-xs text-muted-foreground text-center">{t('set.aiFree')}</p>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm font-semibold text-primary hover:underline"
          >
            {t('set.aiGetKey')}
          </a>
        </div>
      </div>

      {/* Appearance */}
      <div className="medical-card-elevated mb-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Moon size={18} className="text-primary" /> {t('set.appearance')}
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{t('set.darkMode')}</p>
            <p className="text-sm text-muted-foreground">{t('set.darkModeDesc')}</p>
          </div>
          <Switch
            checked={settings.darkMode}
            onCheckedChange={(checked) => {
              updateSettings({ darkMode: checked });
              toast.success(checked ? t('set.darkOn') : t('set.darkOff'));
            }}
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="medical-card-elevated mb-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Bell size={18} className="text-primary" /> {t('set.notifications')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('set.medReminders')}</p>
              <p className="text-sm text-muted-foreground">{t('set.medRemindersDesc')}</p>
            </div>
            <Switch
              checked={settings.notificationsEnabled}
              onCheckedChange={handleNotificationToggle}
            />
          </div>

          {settings.notificationsEnabled && (
            <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock size={16} />
                <span>{t('set.quietHours')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">{t('from')}</label>
                  <input type="time" value={settings.quietHoursStart}
                    onChange={e => updateSettings({ quietHoursStart: e.target.value })}
                    className="w-full bg-card rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">{t('to')}</label>
                  <input type="time" value={settings.quietHoursEnd}
                    onChange={e => updateSettings({ quietHoursEnd: e.target.value })}
                    className="w-full bg-card rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data */}
      <div className="medical-card-elevated mb-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Settings size={18} className="text-primary" /> {t('set.data')}
        </h3>
        {!showResetConfirm ? (
          <button onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold">
            <Trash2 size={18} />
            {t('set.clearAll')}
          </button>
        ) : (
          <div className="bg-destructive/10 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-destructive">{t('set.clearConfirm')}</p>
            <div className="flex gap-2">
              <button onClick={resetAllData}
                className="flex-1 bg-destructive text-white font-bold py-3 rounded-xl">{t('set.clearYes')}</button>
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-secondary font-bold py-3 rounded-xl">{t('cancel')}</button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>{t('set.appInfo')}</p>
        <p>{t('set.appDesc')}</p>
      </div>
    </div>
  );
};

export default SettingsPage;
