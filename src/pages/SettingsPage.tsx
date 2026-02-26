import { useStore } from '@/lib/store';
import { Switch } from '@/components/ui/switch';
import { Moon, Bell, BellOff, Clock, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

const SettingsPage = () => {
  const { settings, updateSettings, resetAllData } = useStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('يرجى السماح بالإشعارات من إعدادات المتصفح');
        return;
      }
    }
    updateSettings({ notificationsEnabled: enabled });
    toast.success(enabled ? 'تم تفعيل الإشعارات' : 'تم إيقاف الإشعارات');
  };

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">⚙️ الإعدادات</h1>

      {/* Appearance */}
      <div className="medical-card-elevated mb-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Moon size={18} className="text-primary" /> المظهر
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">الوضع الداكن</p>
            <p className="text-sm text-muted-foreground">تغيير مظهر التطبيق</p>
          </div>
          <Switch
            checked={settings.darkMode}
            onCheckedChange={(checked) => {
              updateSettings({ darkMode: checked });
              toast.success(checked ? 'تم تفعيل الوضع الداكن' : 'تم تفعيل الوضع الفاتح');
            }}
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="medical-card-elevated mb-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Bell size={18} className="text-primary" /> الإشعارات
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">تنبيهات الأدوية</p>
              <p className="text-sm text-muted-foreground">تذكير بمواعيد الأدوية</p>
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
                <span>ساعات الهدوء (لا تنبيهات)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">من</label>
                  <input type="time" value={settings.quietHoursStart}
                    onChange={e => updateSettings({ quietHoursStart: e.target.value })}
                    className="w-full bg-card rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">إلى</label>
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
          <Settings size={18} className="text-primary" /> البيانات
        </h3>
        {!showResetConfirm ? (
          <button onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold">
            <Trash2 size={18} />
            مسح جميع البيانات
          </button>
        ) : (
          <div className="bg-destructive/10 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-destructive">هل أنت متأكد؟ سيتم حذف جميع البيانات نهائياً.</p>
            <div className="flex gap-2">
              <button onClick={resetAllData}
                className="flex-1 bg-destructive text-white font-bold py-3 rounded-xl">نعم، احذف</button>
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-secondary font-bold py-3 rounded-xl">إلغاء</button>
            </div>
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>صحتي - الإصدار 1.0</p>
        <p>تطبيق إدارة الصحة الشخصية</p>
      </div>
    </div>
  );
};

export default SettingsPage;
