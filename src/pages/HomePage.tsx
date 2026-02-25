import { useStore, getTodayStr } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { Pill, FlaskConical, UtensilsCrossed, BookOpen, BarChart3, FileText, CheckCircle2, Circle } from 'lucide-react';

const HomePage = () => {
  const { profile, medications, medicationLogs, labResults, foodLog } = useStore();
  const navigate = useNavigate();
  const today = getTodayStr();

  if (!profile) return null;

  // Today's medication schedule
  const todayLogs = medicationLogs.filter(l => l.date === today);
  const totalDoses = medications.reduce((sum, m) => sum + m.times.length, 0);
  const takenDoses = todayLogs.filter(l => l.status === 'taken').length;
  const progressPct = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  // Today's nutrition
  const todayFood = foodLog.filter(f => f.date === today);
  const totalCalories = todayFood.reduce((sum, f) => sum + f.calories, 0);

  // Latest lab
  const latestLab = labResults.length > 0 ? labResults[labResults.length - 1] : null;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  };

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <p className="text-muted-foreground text-lg">{greeting()}</p>
        <h1 className="text-2xl font-bold">{profile.name} 👋</h1>
      </div>

      {/* Medication Progress */}
      <div className="medical-card-elevated mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Pill className="text-primary-foreground" size={20} />
            </div>
            <div>
              <h3 className="font-bold">أدوية اليوم</h3>
              <p className="text-sm text-muted-foreground">{takenDoses} من {totalDoses} جرعات</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-primary">{progressPct}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3">
          <div className="h-3 rounded-full gradient-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>

        {medications.length > 0 && (
          <div className="mt-4 space-y-2">
            {medications.slice(0, 3).map(med => {
              const isTaken = todayLogs.some(l => l.medicationId === med.id && l.status === 'taken');
              return (
                <div key={med.id} className="flex items-center justify-between bg-secondary/50 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    {isTaken ? <CheckCircle2 size={18} className="text-success" /> : <Circle size={18} className="text-muted-foreground" />}
                    <span className={`font-medium ${isTaken ? 'line-through text-muted-foreground' : ''}`}>{med.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{med.dose}</span>
                </div>
              );
            })}
          </div>
        )}

        {medications.length === 0 && (
          <button onClick={() => navigate('/medications')} className="mt-3 w-full py-2 text-primary font-semibold text-sm">
            + أضف أدويتك
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Nutrition */}
        <div className="medical-card cursor-pointer" onClick={() => navigate('/nutrition')}>
          <div className="flex items-center gap-2 mb-2">
            <UtensilsCrossed size={18} className="text-accent" />
            <span className="font-semibold text-sm">تغذية اليوم</span>
          </div>
          <p className="text-2xl font-bold">{totalCalories}</p>
          <p className="text-xs text-muted-foreground">من {profile.dailyCalories} سعرة</p>
          <div className="w-full bg-secondary rounded-full h-2 mt-2">
            <div className="h-2 rounded-full gradient-success transition-all" style={{ width: `${Math.min(100, (totalCalories / profile.dailyCalories) * 100)}%` }} />
          </div>
        </div>

        {/* Latest Lab */}
        <div className="medical-card cursor-pointer" onClick={() => navigate('/lab-results')}>
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical size={18} className="text-primary" />
            <span className="font-semibold text-sm">آخر تحليل</span>
          </div>
          {latestLab ? (
            <>
              <p className="text-sm font-medium truncate">{latestLab.testName}</p>
              <p className="text-2xl font-bold">{latestLab.value}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                latestLab.status === 'normal' ? 'status-normal' :
                latestLab.status === 'warning' ? 'status-warning' : 'status-danger'
              }`}>
                {latestLab.status === 'normal' ? '🟢 طبيعي' : latestLab.status === 'warning' ? '🟡 مراقبة' : '🔴 خارج النطاق'}
              </span>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">لا توجد تحاليل</p>
          )}
        </div>
      </div>

      {/* BMI Card */}
      <div className="medical-card mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">مؤشر كتلة الجسم (BMI)</p>
            <p className="text-3xl font-bold">{profile.bmi}</p>
          </div>
          <div className={`px-3 py-1 rounded-xl text-sm font-semibold ${
            profile.bmi < 18.5 ? 'status-warning' :
            profile.bmi <= 24.9 ? 'status-normal' :
            profile.bmi <= 29.9 ? 'status-warning' : 'status-danger'
          }`}>
            {profile.bmi < 18.5 ? 'نقص وزن' :
             profile.bmi <= 24.9 ? 'طبيعي' :
             profile.bmi <= 29.9 ? 'زيادة وزن' : 'سمنة'}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => navigate('/progress')} className="medical-card flex flex-col items-center gap-2 py-4">
          <BarChart3 size={24} className="text-primary" />
          <span className="text-xs font-semibold">تقدمي</span>
        </button>
        <button onClick={() => navigate('/journal')} className="medical-card flex flex-col items-center gap-2 py-4">
          <BookOpen size={24} className="text-accent" />
          <span className="text-xs font-semibold">يومياتي</span>
        </button>
        <button onClick={() => navigate('/report')} className="medical-card flex flex-col items-center gap-2 py-4">
          <FileText size={24} className="text-muted-foreground" />
          <span className="text-xs font-semibold">التقرير</span>
        </button>
      </div>
    </div>
  );
};

export default HomePage;
