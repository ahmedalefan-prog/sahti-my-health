import { useState } from 'react';
import { useStore, generateId, getTodayStr, type Medication, type MedicationLog } from '@/lib/store';
import { MED_FORMS, MED_FREQUENCIES } from '@/lib/constants';
import { Plus, X, CheckCircle2, Clock, Trash2 } from 'lucide-react';

const MedicationsPage = () => {
  const { medications, medicationLogs, addMedication, removeMedication, addMedicationLog } = useStore();
  const [showForm, setShowForm] = useState(false);
  const today = getTodayStr();
  const [form, setForm] = useState({
    name: '', dose: '', form: 'pill', frequency: 'daily',
    times: ['08:00'], startDate: '', endDate: '', notes: '',
  });

  const handleAddTime = () => setForm(p => ({ ...p, times: [...p.times, '12:00'] }));
  const handleRemoveTime = (i: number) => setForm(p => ({ ...p, times: p.times.filter((_, idx) => idx !== i) }));

  const handleSubmit = () => {
    if (!form.name || !form.dose) return;
    const med: Medication = { id: generateId(), ...form };
    addMedication(med);
    setShowForm(false);
    setForm({ name: '', dose: '', form: 'pill', frequency: 'daily', times: ['08:00'], startDate: '', endDate: '', notes: '' });
  };

  const handleLogDose = (medId: string, time: string, status: 'taken' | 'snoozed') => {
    const log: MedicationLog = { id: generateId(), medicationId: medId, date: today, time, status };
    addMedicationLog(log);
  };

  const todayLogs = medicationLogs.filter(l => l.date === today);

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
              <div>
                <label className="block text-sm font-semibold mb-1">اسم الدواء</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" placeholder="مثال: ميتفورمين" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">الجرعة</label>
                <input value={form.dose} onChange={e => setForm(p => ({ ...p, dose: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" placeholder="500mg" />
              </div>
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
              <div>
                <label className="block text-sm font-semibold mb-1">التكرار</label>
                <div className="flex flex-wrap gap-2">
                  {MED_FREQUENCIES.map(f => (
                    <button key={f.value} onClick={() => setForm(p => ({ ...p, frequency: f.value }))}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${form.frequency === f.value ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
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
            return (
              <div key={med.id} className="medical-card-elevated">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{med.name}</h3>
                    <p className="text-sm text-muted-foreground">{med.dose} • {medFormLabel}</p>
                  </div>
                  <button onClick={() => removeMedication(med.id)} className="p-2 text-destructive/60 hover:text-destructive touch-target">
                    <Trash2 size={16} />
                  </button>
                </div>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MedicationsPage;
