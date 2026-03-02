import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, calculateBMI, calculateCalories, type Profile } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { BLOOD_TYPES, CONDITIONS } from '@/lib/constants';
import { Heart, ChevronLeft, AlertCircle } from 'lucide-react';

interface ValidationErrors {
  name?: string;
  age?: string;
  weight?: string;
  height?: string;
}

const Onboarding = () => {
  const navigate = useNavigate();
  const { setProfile } = useStore();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [form, setForm] = useState({
    name: '', age: '', gender: 'male' as 'male' | 'female',
    weight: '', height: '', bloodType: 'O+',
    conditions: [] as string[], customConditions: [] as string[],
    customConditionInput: '', surgeries: '',
    doctorName: '', emergencyNumber: '',
  });

  const toggleCondition = (key: string) => {
    setForm(prev => ({
      ...prev,
      conditions: prev.conditions.includes(key)
        ? prev.conditions.filter(c => c !== key)
        : [...prev.conditions, key],
    }));
  };

  const validateStep1 = (): boolean => {
    const newErrors: ValidationErrors = {};
    const name = form.name.trim();
    const age = Number(form.age);
    const weight = Number(form.weight);
    const height = Number(form.height);

    if (!name || name.length < 2) newErrors.name = t('val.nameMin');
    else if (name.length > 50) newErrors.name = t('val.nameMax');

    if (!form.age || isNaN(age)) newErrors.age = t('val.ageRequired');
    else if (age < 1 || age > 150) newErrors.age = t('val.ageRange');
    else if (!Number.isInteger(age)) newErrors.age = t('val.ageInteger');

    if (!form.weight || isNaN(weight)) newErrors.weight = t('val.weightRequired');
    else if (weight < 10 || weight > 500) newErrors.weight = t('val.weightRange');

    if (!form.height || isNaN(height)) newErrors.height = t('val.heightRequired');
    else if (height < 50 || height > 300) newErrors.height = t('val.heightRange');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = () => {
    const weight = Number(form.weight);
    const height = Number(form.height);
    const age = Number(form.age);
    const bmi = calculateBMI(weight, height);
    const dailyCalories = calculateCalories(form.gender, weight, height, age);
    const profile: Profile = {
      name: form.name.trim(), age, gender: form.gender,
      weight, height, bloodType: form.bloodType,
      conditions: form.conditions, customConditions: form.customConditions,
      surgeries: form.surgeries.trim(), doctorName: form.doctorName.trim(),
      emergencyNumber: form.emergencyNumber.trim(), bmi, dailyCalories,
    };
    setProfile(profile);
    navigate('/');
  };

  const ErrorMsg = ({ msg }: { msg?: string }) => {
    if (!msg) return null;
    return (
      <p className="text-destructive text-xs mt-1 flex items-center gap-1">
        <AlertCircle size={12} /> {msg}
      </p>
    );
  };

  const inputClass = (field: keyof ValidationErrors) =>
    `w-full bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 touch-target ${
      errors[field] ? 'ring-2 ring-destructive focus:ring-destructive' : 'focus:ring-primary'
    }`;

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
          <input value={form.name} onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: undefined })); }}
            className={inputClass('name')} maxLength={50}
            placeholder={t('onb.namePlaceholder')} />
          <ErrorMsg msg={errors.name} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">{t('prof.age')}</label>
            <input type="number" value={form.age} min={1} max={150}
              onChange={e => { setForm(p => ({ ...p, age: e.target.value })); setErrors(p => ({ ...p, age: undefined })); }}
              className={inputClass('age')} placeholder="30" />
            <ErrorMsg msg={errors.age} />
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
            <input type="number" value={form.weight} min={10} max={500}
              onChange={e => { setForm(p => ({ ...p, weight: e.target.value })); setErrors(p => ({ ...p, weight: undefined })); }}
              className={inputClass('weight')} placeholder="70" />
            <ErrorMsg msg={errors.weight} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">{t('prof.height')} ({t('cm')})</label>
            <input type="number" value={form.height} min={50} max={300}
              onChange={e => { setForm(p => ({ ...p, height: e.target.value })); setErrors(p => ({ ...p, height: undefined })); }}
              className={inputClass('height')} placeholder="170" />
            <ErrorMsg msg={errors.height} />
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
      <button onClick={handleNext}
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
          <div className="mt-3">
            <label className="block text-xs text-muted-foreground mb-1">{t('prof.addCustomCondition')}</label>
            <div className="flex gap-2">
              <input value={form.customConditionInput} onChange={e => setForm(p => ({ ...p, customConditionInput: e.target.value }))}
                className="flex-1 bg-secondary rounded-xl px-4 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary text-sm"
                maxLength={100}
                placeholder={t('prof.customConditionPlaceholder')} />
              <button onClick={() => { if (form.customConditionInput.trim() && form.customConditions.length < 20) { setForm(p => ({ ...p, customConditions: [...p.customConditions, p.customConditionInput.trim()], customConditionInput: '' })); } }}
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
            className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary touch-target"
            maxLength={200}
            placeholder={t('prof.surgeriesPlaceholder')} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">{t('prof.doctorName')}</label>
          <input value={form.doctorName} onChange={e => setForm(p => ({ ...p, doctorName: e.target.value }))}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary touch-target"
            maxLength={100} placeholder={t('onb.doctorPlaceholder')} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">{t('prof.emergencyNumber')}</label>
          <input type="tel" value={form.emergencyNumber} onChange={e => setForm(p => ({ ...p, emergencyNumber: e.target.value }))}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary touch-target"
            maxLength={20} placeholder={t('onb.emergencyPlaceholder')} />
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
