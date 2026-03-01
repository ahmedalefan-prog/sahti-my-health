import { useState } from 'react';
import { useStore, calculateBMI, calculateCalories, type Profile } from '@/lib/store';
import { CONDITIONS, BLOOD_TYPES } from '@/lib/constants';
import { useLanguage } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { Edit2, Phone, Stethoscope, Ruler, Weight, Droplets, Activity, X, Check, Settings } from 'lucide-react';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { profile, setProfile } = useStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '', age: '', gender: 'male' as 'male' | 'female',
    weight: '', height: '', bloodType: 'O+',
    conditions: [] as string[], customConditions: [] as string[],
    customConditionInput: '', surgeries: '',
    doctorName: '', emergencyNumber: '',
  });

  if (!profile) { navigate('/onboarding'); return null; }

  const conditionLabels = profile.conditions.map(c => t('condition.' + c));

  const startEdit = () => {
    setForm({
      name: profile.name, age: String(profile.age), gender: profile.gender,
      weight: String(profile.weight), height: String(profile.height), bloodType: profile.bloodType,
      conditions: [...profile.conditions], customConditions: [...(profile.customConditions || [])],
      customConditionInput: '', surgeries: profile.surgeries || '',
      doctorName: profile.doctorName, emergencyNumber: profile.emergencyNumber,
    });
    setEditing(true);
  };

  const toggleCondition = (key: string) => {
    setForm(prev => ({ ...prev, conditions: prev.conditions.includes(key) ? prev.conditions.filter(c => c !== key) : [...prev.conditions, key] }));
  };

  const handleSave = () => {
    const weight = Number(form.weight); const height = Number(form.height); const age = Number(form.age);
    if (!form.name || !age || !weight || !height) return;
    const bmi = calculateBMI(weight, height);
    const dailyCalories = calculateCalories(form.gender, weight, height, age);
    setProfile({ name: form.name, age, gender: form.gender, weight, height, bloodType: form.bloodType,
      conditions: form.conditions, customConditions: form.customConditions, surgeries: form.surgeries,
      doctorName: form.doctorName, emergencyNumber: form.emergencyNumber, bmi, dailyCalories });
    setEditing(false);
    toast.success(t('prof.savedSuccess'));
  };

  if (editing) {
    return (
      <div className="px-4 pt-6 pb-4 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('prof.editTitle')}</h1>
          <button onClick={() => setEditing(false)} className="p-2"><X size={22} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">{t('prof.fullName')}</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">{t('prof.age')}</label>
              <input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">{t('prof.gender')}</label>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map(g => (
                  <button key={g} onClick={() => setForm(p => ({ ...p, gender: g }))}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${form.gender === g ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                    {t(g)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">{t('prof.weight')} ({t('kg')})</label>
              <input type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">{t('prof.height')} ({t('cm')})</label>
              <input type="number" value={form.height} onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">{t('prof.bloodType')}</label>
            <div className="flex flex-wrap gap-2">
              {BLOOD_TYPES.map(bt => (
                <button key={bt} onClick={() => setForm(p => ({ ...p, bloodType: bt }))}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${form.bloodType === bt ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {bt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">{t('prof.conditions')}</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(c => (
                <button key={c.key} onClick={() => toggleCondition(c.key)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${form.conditions.includes(c.key) ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {t('condition.' + c.key)}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-xs text-muted-foreground mb-1">{t('prof.addCustomCondition')}</label>
              <div className="flex gap-2">
                <input value={form.customConditionInput} onChange={e => setForm(p => ({ ...p, customConditionInput: e.target.value }))}
                  className="flex-1 bg-secondary rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder={t('prof.customConditionPlaceholder')} />
                <button onClick={() => { if (form.customConditionInput.trim()) { setForm(p => ({ ...p, customConditions: [...p.customConditions, p.customConditionInput.trim()], customConditionInput: '' })); } }}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">{t('add')}</button>
              </div>
              {form.customConditions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.customConditions.map((c, i) => (
                    <span key={i} className="px-3 py-1 bg-primary text-primary-foreground rounded-xl text-sm font-semibold flex items-center gap-1">
                      {c} <button onClick={() => setForm(p => ({ ...p, customConditions: p.customConditions.filter((_, j) => j !== i) }))} className="text-primary-foreground/70 hover:text-primary-foreground">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">{t('prof.surgeries')}</label>
            <input value={form.surgeries} onChange={e => setForm(p => ({ ...p, surgeries: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('prof.surgeriesPlaceholder')} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">{t('prof.doctorName')}</label>
            <input value={form.doctorName} onChange={e => setForm(p => ({ ...p, doctorName: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">{t('prof.emergencyNumber')}</label>
            <input type="tel" value={form.emergencyNumber} onChange={e => setForm(p => ({ ...p, emergencyNumber: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <button onClick={handleSave} disabled={!form.name || !form.age || !form.weight || !form.height}
            className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg touch-target disabled:opacity-40 flex items-center justify-center gap-2">
            <Check size={20} /> {t('prof.saveChanges')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('prof.title')}</h1>
        <button onClick={() => navigate('/settings')} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <Settings size={22} className="text-muted-foreground" />
        </button>
      </div>

      <div className="medical-card-elevated mb-4 text-center">
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl text-primary-foreground font-bold">{profile.name.charAt(0)}</span>
        </div>
        <h2 className="text-xl font-bold">{profile.name}</h2>
        <p className="text-muted-foreground">{profile.age} {t('year')} • {profile.gender === 'male' ? t('male') : t('female')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="medical-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Weight size={20} className="text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">{t('prof.weight')}</p><p className="font-bold">{profile.weight} {t('kg')}</p></div>
        </div>
        <div className="medical-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Ruler size={20} className="text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">{t('prof.height')}</p><p className="font-bold">{profile.height} {t('cm')}</p></div>
        </div>
        <div className="medical-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Activity size={20} className="text-accent" /></div>
          <div><p className="text-xs text-muted-foreground">BMI</p><p className="font-bold">{profile.bmi}</p></div>
        </div>
        <div className="medical-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><Droplets size={20} className="text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">{t('prof.bloodType')}</p><p className="font-bold">{(() => { const bt = profile.bloodType; if (bt && bt.length >= 2 && (bt[0] === '+' || bt[0] === '-')) return bt.slice(1) + bt[0]; return bt; })()}</p></div>
        </div>
      </div>

      <div className="medical-card mb-4">
        <p className="text-sm text-muted-foreground">{t('prof.dailyCalories')}</p>
        <p className="text-3xl font-bold text-primary">{profile.dailyCalories} <span className="text-base font-normal text-muted-foreground">{t('calories')}</span></p>
      </div>

      {(conditionLabels.length > 0 || (profile.customConditions && profile.customConditions.length > 0)) && (
        <div className="medical-card mb-4">
          <div className="flex items-center gap-2 mb-3"><Stethoscope size={18} className="text-primary" /><h3 className="font-bold">{t('prof.conditions')}</h3></div>
          <div className="flex flex-wrap gap-2">
            {conditionLabels.map((label, i) => (
              <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-semibold">{label}</span>
            ))}
            {(profile.customConditions || []).map((c, i) => (
              <span key={`custom-${i}`} className="px-3 py-1 bg-accent/10 text-accent rounded-lg text-sm font-semibold">{c}</span>
            ))}
          </div>
        </div>
      )}

      {profile.surgeries && (
        <div className="medical-card mb-4">
          <div className="flex items-center gap-2 mb-3"><Stethoscope size={18} className="text-destructive" /><h3 className="font-bold">{t('prof.surgeries')}</h3></div>
          <p className="text-sm">{profile.surgeries}</p>
        </div>
      )}

      <div className="medical-card mb-4 space-y-3">
        {profile.doctorName && (
          <div className="flex items-center gap-3">
            <Stethoscope size={18} className="text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">{t('prof.treatingDoctor')}</p><p className="font-semibold">{profile.doctorName}</p></div>
          </div>
        )}
        {profile.emergencyNumber && (
          <div className="flex items-center gap-3">
            <Phone size={18} className="text-destructive" />
            <div><p className="text-xs text-muted-foreground">{t('prof.emergencyNumber')}</p><p className="font-semibold">{profile.emergencyNumber}</p></div>
          </div>
        )}
      </div>

      <button onClick={startEdit} className="w-full medical-card flex items-center justify-center gap-2 text-primary font-semibold py-3">
        <Edit2 size={18} /> {t('prof.editProfile')}
      </button>
    </div>
  );
};

export default ProfilePage;
