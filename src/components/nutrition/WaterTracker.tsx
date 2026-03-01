import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Droplets, Plus, Minus } from 'lucide-react';
import { getTodayStr } from '@/lib/store';

const WATER_STORAGE_KEY = 'sahti_water_log';
const GOAL = 8;

interface WaterLog {
  [date: string]: number;
}

const WaterTracker = () => {
  const { t } = useLanguage();
  const today = getTodayStr();

  const [waterLog, setWaterLog] = useState<WaterLog>(() => {
    try {
      const raw = localStorage.getItem(WATER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const glasses = waterLog[today] || 0;

  useEffect(() => {
    localStorage.setItem(WATER_STORAGE_KEY, JSON.stringify(waterLog));
  }, [waterLog]);

  const addGlass = () => {
    setWaterLog(prev => ({ ...prev, [today]: Math.min((prev[today] || 0) + 1, 15) }));
  };

  const removeGlass = () => {
    setWaterLog(prev => ({ ...prev, [today]: Math.max((prev[today] || 0) - 1, 0) }));
  };

  const pct = Math.min(100, (glasses / GOAL) * 100);

  return (
    <div className="medical-card-elevated mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets size={18} className="text-primary" />
          <h3 className="font-bold">{t('nut.waterTitle')}</h3>
        </div>
        <span className="text-sm font-bold text-primary">{glasses}/{GOAL} {t('nut.glasses')}</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <button onClick={removeGlass} disabled={glasses === 0}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center disabled:opacity-30 transition-colors active:scale-95">
          <Minus size={16} />
        </button>

        <div className="flex-1">
          <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct >= 100
                  ? 'linear-gradient(135deg, hsl(142 72% 37%), hsl(142 72% 47%))'
                  : 'linear-gradient(135deg, hsl(200 80% 50%), hsl(217 91% 60%))'
              }} />
          </div>
        </div>

        <button onClick={addGlass}
          className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center transition-colors active:scale-95">
          <Plus size={16} className="text-primary" />
        </button>
      </div>

      <div className="flex justify-center gap-1">
        {Array.from({ length: GOAL }).map((_, i) => (
          <div key={i} className={`text-lg transition-all duration-300 ${i < glasses ? 'opacity-100 scale-110' : 'opacity-20 scale-90'}`}>
            💧
          </div>
        ))}
      </div>

      {glasses >= GOAL && (
        <p className="text-center text-sm font-semibold text-accent mt-2">
          {t('nut.waterGoalReached')} 🎉
        </p>
      )}
    </div>
  );
};

export default WaterTracker;
