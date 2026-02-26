import { useState } from 'react';
import { useStore, calculateBMI, calculateCalories, type Profile } from '@/lib/store';
import { CONDITIONS, BLOOD_TYPES } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';
import { Edit2, Phone, Stethoscope, Ruler, Weight, Droplets, Activity, X, Check, Settings } from 'lucide-react';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { profile, setProfile } = useStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '', age: '', gender: 'male' as 'male' | 'female',
    weight: '', height: '', bloodType: 'O+',
    conditions: [] as string[], doctorName: '', emergencyNumber: '',
  });

  if (!profile) {
    navigate('/onboarding');
    return null;
  }

  const conditionLabels = profile.conditions.map(c => CONDITIONS.find(cd => cd.key === c)?.label || c);

  const startEdit = () => {
    setForm({
      name: profile.name, age: String(profile.age), gender: profile.gender,
      weight: String(profile.weight), height: String(profile.height), bloodType: profile.bloodType,
      conditions: [...profile.conditions], doctorName: profile.doctorName, emergencyNumber: profile.emergencyNumber,
    });
    setEditing(true);
  };

  const toggleCondition = (key: string) => {
    setForm(prev => ({
      ...prev,
      conditions: prev.conditions.includes(key)
        ? prev.conditions.filter(c => c !== key)
        : [...prev.conditions, key],
    }));
  };

  const handleSave = () => {
    const weight = Number(form.weight);
    const height = Number(form.height);
    const age = Number(form.age);
    if (!form.name || !age || !weight || !height) return;
    const bmi = calculateBMI(weight, height);
    const dailyCalories = calculateCalories(form.gender, weight, height, age);
    setProfile({
      name: form.name, age, gender: form.gender,
      weight, height, bloodType: form.bloodType,
      conditions: form.conditions, doctorName: form.doctorName,
      emergencyNumber: form.emergencyNumber, bmi, dailyCalories,
    });
    setEditing(false);
    toast.success('تم تحديث الملف الشخصي ✅');
  };

  if (editing) {
    return (
      <div className="px-4 pt-6 pb-4 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">✏️ تعديل الملف</h1>
          <button onClick={() => setEditing(false)} className="p-2"><X size={22} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">الاسم الكامل</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">العمر</label>
              <input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">الجنس</label>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map(g => (
                  <button key={g} onClick={() => setForm(p => ({ ...p, gender: g }))}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${form.gender === g ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                    {g === 'male' ? 'ذكر' : 'أنثى'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">الوزن (كغ)</label>
              <input type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">الطول (سم)</label>
              <input type="number" value={form.height} onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">فصيلة الدم</label>
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
            <label className="block text-sm font-semibold mb-2">الأمراض المزمنة</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(c => (
                <button key={c.key} onClick={() => toggleCondition(c.key)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${form.conditions.includes(c.key) ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">اسم الطبيب المعالج</label>
            <input value={form.doctorName} onChange={e => setForm(p => ({ ...p, doctorName: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">رقم الطوارئ</label>
            <input type="tel" value={form.emergencyNumber} onChange={e => setForm(p => ({ ...p, emergencyNumber: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <button onClick={handleSave} disabled={!form.name || !form.age || !form.weight || !form.height}
            className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg touch-target disabled:opacity-40 flex items-center justify-center gap-2">
            <Check size={20} /> حفظ التعديلات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">👤 ملفي الشخصي</h1>
        <button onClick={() => navigate('/settings')} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <Settings size={22} className="text-muted-foreground" />
        </button>
      </div>

      {/* Profile Header */}
      <div className="medical-card-elevated mb-4 text-center">
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl text-primary-foreground font-bold">{profile.name.charAt(0)}</span>
        </div>
        <h2 className="text-xl font-bold">{profile.name}</h2>
        <p className="text-muted-foreground">{profile.age} سنة • {profile.gender === 'male' ? 'ذكر' : 'أنثى'}</p>
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="medical-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Weight size={20} className="text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">الوزن</p><p className="font-bold">{profile.weight} كغ</p></div>
        </div>
        <div className="medical-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Ruler size={20} className="text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">الطول</p><p className="font-bold">{profile.height} سم</p></div>
        </div>
        <div className="medical-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Activity size={20} className="text-accent" /></div>
          <div><p className="text-xs text-muted-foreground">BMI</p><p className="font-bold">{profile.bmi}</p></div>
        </div>
        <div className="medical-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><Droplets size={20} className="text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">فصيلة الدم</p><p className="font-bold">{profile.bloodType}</p></div>
        </div>
      </div>

      {/* Daily Calories */}
      <div className="medical-card mb-4">
        <p className="text-sm text-muted-foreground">السعرات اليومية المطلوبة</p>
        <p className="text-3xl font-bold text-primary">{profile.dailyCalories} <span className="text-base font-normal text-muted-foreground">سعرة</span></p>
      </div>

      {/* Conditions */}
      {conditionLabels.length > 0 && (
        <div className="medical-card mb-4">
          <div className="flex items-center gap-2 mb-3"><Stethoscope size={18} className="text-primary" /><h3 className="font-bold">الأمراض المزمنة</h3></div>
          <div className="flex flex-wrap gap-2">
            {conditionLabels.map((label, i) => (
              <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-semibold">{label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Doctor & Emergency */}
      <div className="medical-card mb-4 space-y-3">
        {profile.doctorName && (
          <div className="flex items-center gap-3">
            <Stethoscope size={18} className="text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">الطبيب المعالج</p><p className="font-semibold">{profile.doctorName}</p></div>
          </div>
        )}
        {profile.emergencyNumber && (
          <div className="flex items-center gap-3">
            <Phone size={18} className="text-destructive" />
            <div><p className="text-xs text-muted-foreground">رقم الطوارئ</p><p className="font-semibold">{profile.emergencyNumber}</p></div>
          </div>
        )}
      </div>

      {/* Edit Button */}
      <button onClick={startEdit} className="w-full medical-card flex items-center justify-center gap-2 text-primary font-semibold py-3">
        <Edit2 size={18} /> تعديل الملف الشخصي
      </button>
    </div>
  );
};

export default ProfilePage;
