import { useMemo } from 'react';
import { useStore, getTodayStr } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

const WeeklyChart = () => {
  const { foodLog, profile } = useStore();
  const { t } = useLanguage();

  const data = useMemo(() => {
    const today = new Date();
    const days: { name: string; date: string; calories: number; protein: number; carbs: number; fat: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('ar-SA', { weekday: 'short' });
      const dayLog = foodLog.filter(f => f.date === dateStr);

      days.push({
        name: dayName,
        date: dateStr,
        calories: dayLog.reduce((s, f) => s + f.calories, 0),
        protein: dayLog.reduce((s, f) => s + f.protein, 0),
        carbs: dayLog.reduce((s, f) => s + f.carbs, 0),
        fat: dayLog.reduce((s, f) => s + f.fat, 0),
      });
    }
    return days;
  }, [foodLog]);

  const calorieTarget = profile?.dailyCalories || 2000;
  const hasData = data.some(d => d.calories > 0);

  if (!hasData) return null;

  return (
    <div className="medical-card-elevated mb-4">
      <h3 className="font-bold mb-3">{t('nut.weeklyChart')}</h3>
      <div className="h-48" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                fontSize: '12px',
                direction: 'rtl',
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  calories: t('nut.caloriesLabel'),
                  protein: t('protein'),
                  carbs: t('carbs'),
                  fat: t('fat'),
                };
                return [value, labels[name] || name];
              }}
            />
            <ReferenceLine y={calorieTarget} stroke="hsl(142 72% 42%)" strokeDasharray="5 5" label="" />
            <Bar dataKey="calories" fill="hsl(217 91% 53%)" radius={[6, 6, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'hsl(217 91% 53%)' }} />
          <span>{t('nut.caloriesLabel')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-0.5 rounded" style={{ background: 'hsl(142 72% 42%)', borderTop: '2px dashed hsl(142 72% 42%)' }} />
          <span>{t('nut.targetLine')}</span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyChart;
