import { useState, useEffect, useMemo } from 'react';
import { useStore, generateId, getTodayStr, type Medication, type MedicationLog } from '@/lib/store';
import { MED_FORMS, MED_FREQUENCIES, WEEK_DAYS } from '@/lib/constants';
import { Plus, X, CheckCircle2, Clock, Trash2, ChevronDown, ChevronUp, Timer, History, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// Helper: get schedule description in Arabic
function getScheduleLabel(med: Medication): string {
  switch (med.frequency) {
    case 'daily':
      return `يومي - ${med.times.join(' ، ')}`;
    case 'interval':
      if (med.intervalUnit === 'hours') return `كل ${med.intervalHours} ساعة`;
      return `كل ${med.intervalHours} يوم`;
    case 'specific_days': {
      const dayLabels = (med.specificDays || []).map(d => WEEK_DAYS.find(w => w.value === d)?.label || d);
      return `أيام: ${dayLabels.join('، ')}`;
    }
    case 'weekly': {
      const dayLabel = WEEK_DAYS.find(w => w.value === med.weeklyDay)?.label || med.weeklyDay;
      return `أسبوعي - ${dayLabel}`;
    }
    case 'monthly':
      return `شهري - يوم ${med.monthlyDay}`;
    default:
      return med.frequency;
  }
}

// Helper: calculate next dose for interval medications
function getNextDose(med: Medication, logs: MedicationLog[]): { nextDose: Date | null; lastDose: Date | null; progress: number } {
  const medLogs = logs
    .filter(l => l.medicationId === med.id && l.status === 'taken' && l.timestamp)
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  const lastDose = medLogs.length > 0 ? new Date(medLogs[0].timestamp!) : null;

  if (med.frequency === 'interval' && med.intervalHours) {
    const intervalMs = med.intervalHours * (med.intervalUnit === 'days' ? 24 : 1) * 60 * 60 * 1000;
    const baseTime = lastDose || (med.firstDoseDateTime ? new Date(med.firstDoseDateTime) : null);
    if (!baseTime) return { nextDose: null, lastDose, progress: 0 };

    const nextDose = new Date(baseTime.getTime() + intervalMs);
    const now = Date.now();
    const elapsed = now - baseTime.getTime();
    const progress = Math.min(100, (elapsed / intervalMs) * 100);
    return { nextDose, lastDose, progress };
  }

  return { nextDose: null, lastDose, progress: 0 };
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'حان الموعد!';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainH = hours % 24;
    return `${days} يوم و ${remainH} ساعة`;
  }
  return `${hours} ساعة و ${mins} دقيقة`;
}

function formatDateTime(dt: Date): string {
  return dt.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) + ' ' +
    dt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

// Check if medication is due today
function isMedDueToday(med: Medication): boolean {
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayDay = dayNames[now.getDay()];

  switch (med.frequency) {
    case 'daily': return true;
    case 'specific_days': return (med.specificDays || []).includes(todayDay);
    case 'weekly': return med.weeklyDay === todayDay;
    case 'monthly': return now.getDate() === (med.monthlyDay || 1);
    case 'interval': return true; // always show interval meds
    default: return true;
  }
}

const MedicationsPage = () => {
  const { medications, medicationLogs, addMedication, removeMedication, addMedicationLog } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [expandedMed, setExpandedMed] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const today = getTodayStr();

  // Tick every minute for countdown updates
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const defaultForm = {
    name: '', dose: '', form: 'pill', frequency: 'daily',
    times: ['08:00'], startDate: '', endDate: '', notes: '',
    intervalHours: 48, intervalUnit: 'hours' as 'hours' | 'days',
    firstDoseDateTime: '',
    specificDays: [] as string[],
    weeklyDay: 'saturday',
    monthlyDay: 1,
  };
  const [form, setForm] = useState(defaultForm);

  const handleAddTime = () => setForm(p => ({ ...p, times: [...p.times, '12:00'] }));
  const handleRemoveTime = (i: number) => setForm(p => ({ ...p, times: p.times.filter((_, idx) => idx !== i) }));

  const handleSubmit = () => {
    if (!form.name || !form.dose) return;
    const med: Medication = {
      id: generateId(),
      name: form.name, dose: form.dose, form: form.form,
      frequency: form.frequency, times: form.times,
      startDate: form.startDate, endDate: form.endDate, notes: form.notes,
      intervalHours: form.frequency === 'interval' ? form.intervalHours : undefined,
      intervalUnit: form.frequency === 'interval' ? form.intervalUnit : undefined,
      firstDoseDateTime: form.frequency === 'interval' ? form.firstDoseDateTime : undefined,
      specificDays: form.frequency === 'specific_days' ? form.specificDays : undefined,
      weeklyDay: form.frequency === 'weekly' ? form.weeklyDay : undefined,
      monthlyDay: form.frequency === 'monthly' ? form.monthlyDay : undefined,
    };
    addMedication(med);
    setShowForm(false);
    setForm(defaultForm);
    toast.success('تم إضافة الدواء بنجاح');
  };

  const handleLogDose = (medId: string, time: string, status: 'taken' | 'snoozed') => {
    const now = new Date();
    const log: MedicationLog = {
      id: generateId(), medicationId: medId, date: today, time,
      status, timestamp: now.toISOString(),
    };
    addMedicationLog(log);
    if (status === 'taken') toast.success('تم تسجيل الجرعة ✓');
  };

  const handleTakeNow = (medId: string) => {
    const now = new Date();
    const log: MedicationLog = {
      id: generateId(), medicationId: medId, date: today,
      time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      status: 'taken', timestamp: now.toISOString(),
    };
    addMedicationLog(log);
    toast.success('تم تسجيل الجرعة ✓');
  };

  const todayLogs = medicationLogs.filter(l => l.date === today);

  const toggleSpecificDay = (day: string) => {
    setForm(p => ({
      ...p,
      specificDays: p.specificDays.includes(day)
        ? p.specificDays.filter(d => d !== day)
        : [...p.specificDays, day],
    }));
  };

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">💊 أدويتي</h1>
        <button onClick={() => setShowForm(true)} className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center touch-target">
          <Plus className="text-primary-foreground" size={20} />
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end">
          <div className="bg-card w-full max-w-lg mx-auto rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">إضافة دواء جديد</h2>
              <button onClick={() => setShowForm(false)} className="touch-target p-2"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold mb-1">اسم الدواء</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" placeholder="مثال: ميتفورمين" />
              </div>
              {/* Dose */}
              <div>
                <label className="block text-sm font-semibold mb-1">الجرعة</label>
                <input value={form.dose} onChange={e => setForm(p => ({ ...p, dose: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" placeholder="500mg" />
              </div>
              {/* Form */}
              <div>
                <label className="block text-sm font-semibold mb-1">شكل الدواء</label>
                <div className="flex flex-wrap gap-2">
                  {MED_FORMS.map(f => (
                    <button key={f.value} onClick={() => setForm(p => ({ ...p, form: f.value }))}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${form.form === f.value ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Frequency */}
              <div>
                <label className="block text-sm font-semibold mb-1">التكرار</label>
                <div className="flex flex-wrap gap-2">
                  {MED_FREQUENCIES.map(f => (
                    <button key={f.value} onClick={() => setForm(p => ({ ...p, frequency: f.value }))}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${form.frequency === f.value ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency-specific options */}
              {form.frequency === 'interval' && (
                <div className="bg-secondary/50 rounded-xl p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">كل</span>
                    <input type="number" min={1} value={form.intervalHours}
                      onChange={e => setForm(p => ({ ...p, intervalHours: parseInt(e.target.value) || 1 }))}
                      className="w-20 bg-card rounded-lg px-3 py-2 text-center outline-none focus:ring-2 focus:ring-primary" />
                    <div className="flex gap-1">
                      <button onClick={() => setForm(p => ({ ...p, intervalUnit: 'hours' }))}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold ${form.intervalUnit === 'hours' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                        ساعة
                      </button>
                      <button onClick={() => setForm(p => ({ ...p, intervalUnit: 'days' }))}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold ${form.intervalUnit === 'days' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                        يوم
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">تاريخ وموعد أول جرعة</label>
                    <input type="datetime-local" value={form.firstDoseDateTime}
                      onChange={e => setForm(p => ({ ...p, firstDoseDateTime: e.target.value }))}
                      className="w-full bg-card rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                </div>
              )}

              {form.frequency === 'specific_days' && (
                <div className="bg-secondary/50 rounded-xl p-3">
                  <label className="block text-xs font-semibold mb-2">اختر الأيام</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map(d => (
                      <button key={d.value} onClick={() => toggleSpecificDay(d.value)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${form.specificDays.includes(d.value) ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.frequency === 'weekly' && (
                <div className="bg-secondary/50 rounded-xl p-3">
                  <label className="block text-xs font-semibold mb-2">اختر اليوم</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map(d => (
                      <button key={d.value} onClick={() => setForm(p => ({ ...p, weeklyDay: d.value }))}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${form.weeklyDay === d.value ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.frequency === 'monthly' && (
                <div className="bg-secondary/50 rounded-xl p-3">
                  <label className="block text-xs font-semibold mb-1">يوم الشهر</label>
                  <input type="number" min={1} max={31} value={form.monthlyDay}
                    onChange={e => setForm(p => ({ ...p, monthlyDay: parseInt(e.target.value) || 1 }))}
                    className="w-24 bg-card rounded-lg px-3 py-2 text-center outline-none focus:ring-2 focus:ring-primary" />
                </div>
              )}

              {/* Times (for daily, specific_days, weekly, monthly) */}
              {form.frequency !== 'interval' && (
                <div>
                  <label className="block text-sm font-semibold mb-1">مواعيد الأخذ</label>
                  {form.times.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input type="time" value={t} onChange={e => {
                        const newTimes = [...form.times];
                        newTimes[i] = e.target.value;
                        setForm(p => ({ ...p, times: newTimes }));
                      }} className="flex-1 bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
                      {form.times.length > 1 && (
                        <button onClick={() => handleRemoveTime(i)} className="p-2 text-destructive touch-target">
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={handleAddTime} className="text-primary font-semibold text-sm">+ إضافة وقت آخر</button>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold mb-1">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none h-20" placeholder="ملاحظات إضافية..." />
              </div>
              <button onClick={handleSubmit} disabled={!form.name || !form.dose}
                className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg touch-target disabled:opacity-40">
                إضافة الدواء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medication List */}
      {medications.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">💊</p>
          <p className="text-muted-foreground text-lg">لم تضف أي أدوية بعد</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-primary font-semibold">أضف دواءك الأول</button>
        </div>
      ) : (
        <div className="space-y-3">
          {medications.map(med => {
            const medFormLabel = MED_FORMS.find(f => f.value === med.form)?.label || med.form;
            const isExpanded = expandedMed === med.id;
            const doseInfo = getNextDose(med, medicationLogs);
            const isDueToday = isMedDueToday(med);
            const recentLogs = medicationLogs
              .filter(l => l.medicationId === med.id && l.status === 'taken')
              .sort((a, b) => (b.timestamp || b.date).localeCompare(a.timestamp || a.date))
              .slice(0, 5);

            return (
              <div key={med.id} className="medical-card-elevated">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{med.name}</h3>
                    <p className="text-sm text-muted-foreground">{med.dose} • {medFormLabel}</p>
                    <p className="text-xs text-primary font-semibold mt-1">{getScheduleLabel(med)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setExpandedMed(isExpanded ? null : med.id)} className="p-2 touch-target">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => removeMedication(med.id)} className="p-2 text-destructive/60 hover:text-destructive touch-target">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Interval countdown */}
                {med.frequency === 'interval' && doseInfo.nextDose && (
                  <div className="bg-secondary/50 rounded-xl p-3 mb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer size={16} className="text-primary" />
                      <span className="text-sm font-semibold">
                        {doseInfo.nextDose.getTime() <= Date.now()
                          ? <span className="text-destructive flex items-center gap-1"><AlertCircle size={14} /> حان موعد الجرعة!</span>
                          : `الجرعة القادمة بعد: ${formatCountdown(doseInfo.nextDose.getTime() - Date.now())}`
                        }
                      </span>
                    </div>
                    <Progress value={doseInfo.progress} className="h-2 mb-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {doseInfo.lastDose && <span>آخر جرعة: {formatDateTime(doseInfo.lastDose)}</span>}
                      <span>القادمة: {formatDateTime(doseInfo.nextDose)}</span>
                    </div>
                  </div>
                )}

                {/* Take now button for interval meds */}
                {med.frequency === 'interval' && (
                  <button onClick={() => handleTakeNow(med.id)}
                    className="w-full py-2 bg-success/10 text-success rounded-xl text-sm font-bold mb-2 touch-target">
                    تم الأخذ الآن ✓
                  </button>
                )}

                {/* Daily/scheduled dose tracking */}
                {med.frequency !== 'interval' && isDueToday && (
                  <div className="space-y-2">
                    {med.times.map((time, i) => {
                      const logged = todayLogs.find(l => l.medicationId === med.id && l.time === time);
                      return (
                        <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-muted-foreground" />
                            <span className="font-medium">{time}</span>
                          </div>
                          {logged ? (
                            <span className={`text-sm font-semibold flex items-center gap-1 ${logged.status === 'taken' ? 'text-success' : 'text-warning'}`}>
                              <CheckCircle2 size={16} />
                              {logged.status === 'taken' ? 'تم الأخذ' : 'مؤجل'}
                            </span>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => handleLogDose(med.id, time, 'taken')}
                                className="px-3 py-1 bg-success/10 text-success rounded-lg text-sm font-semibold touch-target">
                                تم ✓
                              </button>
                              <button onClick={() => handleLogDose(med.id, time, 'snoozed')}
                                className="px-3 py-1 bg-warning/10 text-warning rounded-lg text-sm font-semibold touch-target">
                                تأجيل
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isDueToday && med.frequency !== 'interval' && (
                  <p className="text-xs text-muted-foreground text-center py-2">ليس مقرراً لهذا اليوم</p>
                )}

                {/* Expanded: dose history */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <History size={14} className="text-muted-foreground" />
                      <span className="text-sm font-semibold">آخر 5 جرعات</span>
                    </div>
                    {recentLogs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">لا يوجد سجل جرعات بعد</p>
                    ) : (
                      <div className="space-y-1">
                        {recentLogs.map(log => (
                          <div key={log.id} className="flex justify-between text-xs bg-secondary/30 rounded-lg px-3 py-1.5">
                            <span>{log.date} - {log.time}</span>
                            <span className="text-success font-semibold">تم الأخذ ✓</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MedicationsPage;
