import { useState, useCallback } from 'react';
import { useStore, getTodayStr } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`;

const SmartRecommendations = () => {
  const { profile, foodLog, medications } = useStore();
  const { t, lang } = useLanguage();
  const [recommendations, setRecommendations] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const today = getTodayStr();

  const todayLog = foodLog.filter(f => f.date === today);
  const totalCalories = todayLog.reduce((s, f) => s + f.calories, 0);
  const calorieTarget = profile?.dailyCalories || 2000;
  const remaining = calorieTarget - totalCalories;

  const fetchRecommendations = useCallback(async () => {
    if (!profile || loading) return;
    setLoading(true);
    setRecommendations('');

    const todaySummary = todayLog.length > 0
      ? todayLog.map(f => `${f.foodName} (${f.calories} سعرة)`).join('، ')
      : 'لم يأكل شيئاً بعد';

    const prompt = `بناءً على حالتي الصحية وأمراضي المزمنة:
- أكلت اليوم: ${todaySummary}
- السعرات المتبقية: ${remaining} سعرة من أصل ${calorieTarget}
- أدويتي: ${medications.map(m => m.name).join('، ') || 'لا يوجد'}

اقترح لي 3-4 وجبات/أطعمة مناسبة للوجبة القادمة. لكل اقتراح اذكر:
- اسم الوجبة
- السعرات التقريبية
- لماذا مناسبة لحالتي
اجعل الاقتراحات قصيرة ومباشرة.`;

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          patientContext: {
            name: profile.name,
            age: profile.age,
            gender: profile.gender,
            conditions: profile.conditions?.join('، ') || 'لا يوجد',
            customConditions: profile.customConditions?.join('، ') || '',
            dailyCalories: profile.dailyCalories,
          },
        }),
      });

      if (!resp.ok) throw new Error('Failed');
      if (!resp.body) throw new Error('No body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              result += content;
              setRecommendations(result);
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setRecommendations(lang === 'ar' ? '❌ حدث خطأ، حاول مرة أخرى' : '❌ Error, try again');
    } finally {
      setLoading(false);
    }
  }, [profile, todayLog, remaining, calorieTarget, medications, loading, lang]);

  return (
    <div className="medical-card-elevated mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h3 className="font-bold">{t('nut.smartSuggestions')}</h3>
        </div>
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold transition-colors active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {loading ? t('nut.loading') : t('nut.getSuggestions')}
        </button>
      </div>

      {remaining > 0 && !recommendations && !loading && (
        <p className="text-sm text-muted-foreground text-center py-3">
          {t('nut.remainingCalories')}: <span className="font-bold text-primary">{remaining}</span> {t('calories')}
          <br />
          <span className="text-xs">{t('nut.tapForSuggestions')}</span>
        </p>
      )}

      {recommendations && (
        <div className="text-sm leading-relaxed whitespace-pre-wrap bg-secondary/50 rounded-xl p-3">
          {recommendations}
        </div>
      )}
    </div>
  );
};

export default SmartRecommendations;
