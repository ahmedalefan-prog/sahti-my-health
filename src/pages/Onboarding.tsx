import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, calculateBMI, calculateCalories, type Profile } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { BLOOD_TYPES, CONDITIONS } from '@/lib/constants';
import { Heart, ChevronLeft } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const { setProfile } = useStore();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', age: '', gender: 'male' as 'male' | 'female',
    weight: '', height: '', bloodType: 'O+',
    conditions: [] as string[], doctorName: '', emergencyNumber: '',
  });

  const toggleCondition = (key: string) => {
    setForm(prev => ({
      ...prev,
      conditions: prev.conditions.includes(key)
        ? prev.conditions.filter(c => c !== key)
        : [...prev.conditions, key],
    }));
  };

  const handleSubmit = () => {
    const weight = Number(form.weight);
    const height = Number(form.height);
    const age = Number(form.age);
    const bmi = calculateBMI(weight, height);
    const dailyCalories = calculateCalories(form.gender, weight, height, age);
    const profile: Profile = {
      name: form.name, age, gender: form.gender,
      weight, height, bloodType: form.bloodType,
      conditions: form.conditions, doctorName: form.doctorName,
      emergencyNumber: form.emergencyNumber, bmi, dailyCalories,
    };
    setProfile(profile);
    navigate('/');
  };

  const steps = [
    <div key="welcome" className="flex flex-col items-center justify-center min-h-screen px-6 animate-fade-in">
      <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-6">
        <Heart className="text-primary-foreground" size={36} />
      </div>
      <h1 className="text-3xl font-bold mb-3">{t('onb.welcome')}</h1>
      <p className="text-muted-foreground text-center text-lg mb-10 leading-relaxed">
        {t('onb.welcomeDesc')}
      </p>
      <button onClick={() => setStep(1)} className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg touch-target">
        {t('onb.start')}
      </button>
    </div>,

    <div key="basic" className="px-6 pt-12 animate-fade-in">
      <h2 className="text-2xl font-bold mb-1">{t('onb.basicInfo')}</h2>
      <p className="text-muted-foreground mb-6">{t('onb.tellUs')}</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">{t('prof.fullName')}</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary touch-target"
            placeholder={t('onb.namePlaceholder')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">{t('prof.age')}</label>
            <input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary touch-target" placeholder="30" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">{t('prof.gender')}</label>
            <div className="flex gap-2">
              {(['male', 'female'] as const).map(g => (
                <button key={g} onClick={() => setForm(p => ({ ...p, gender: g }))}
                  className={`flex-1 py-3 rounded-xl font-semibold touch-target transition-colors ${form.gender === g ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
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
              className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary touch-target" placeholder="70" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">{t('prof.height')} ({t('cm')})</label>
            <input type="number" value={form.height} onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary touch-target" placeholder="170" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">{t('prof.bloodType')}</label>
          <div className="flex flex-wrap gap-2">
            {BLOOD_TYPES.map(bt => (
              <button key={bt} onClick={() => setForm(p => ({ ...p, bloodType: bt }))}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${form.bloodType === bt ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                {bt}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={() => setStep(2)} disabled={!form.name || !form.age || !form.weight || !form.height}
        className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg mt-8 touch-target disabled:opacity-40">
        {t('next')}
      </button>
    </div>,

    <div key="medical" className="px-6 pt-12 animate-fade-in">
      <button onClick={() => setStep(1)} className="flex items-center gap-1 text-primary mb-4">
        <ChevronLeft size={20} /> {t('back')}
      </button>
      <h2 className="text-2xl font-bold mb-1">{t('onb.medicalInfo')}</h2>
      <p className="text-muted-foreground mb-6">{t('onb.healthStatus')}</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">{t('prof.conditions')}</label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(c => (
              <button key={c.key} onClick={() => toggleCondition(c.key)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${form.conditions.includes(c.key) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                {t('condition.' + c.key)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">{t('prof.doctorName')}</label>
          <input value={form.doctorName} onChange={e => setForm(p => ({ ...p, doctorName: e.target.value }))}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary touch-target" placeholder={t('onb.doctorPlaceholder')} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">{t('prof.emergencyNumber')}</label>
          <input type="tel" value={form.emergencyNumber} onChange={e => setForm(p => ({ ...p, emergencyNumber: e.target.value }))}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary touch-target" placeholder={t('onb.emergencyPlaceholder')} />
        </div>
      </div>
      <button onClick={handleSubmit}
        className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg mt-8 touch-target">
        {t('onb.startUsing')}
      </button>
    </div>,
  ];

  return <div className="max-w-lg mx-auto min-h-screen">{steps[step]}</div>;
};

export default Onboarding;
