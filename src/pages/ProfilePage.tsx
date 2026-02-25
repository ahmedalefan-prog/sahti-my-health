import { useStore } from '@/lib/store';
import { CONDITIONS, BLOOD_TYPES } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';
import { Edit2, Phone, Stethoscope, Ruler, Weight, Droplets, Activity } from 'lucide-react';

const ProfilePage = () => {
  const { profile } = useStore();
  const navigate = useNavigate();

  if (!profile) {
    navigate('/onboarding');
    return null;
  }

  const conditionLabels = profile.conditions.map(c => CONDITIONS.find(cd => cd.key === c)?.label || c);

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">👤 ملفي الشخصي</h1>

      {/* Profile Header */}
      <div className="medical-card-elevated mb-4 text-center">
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl text-primary-foreground font-bold">
            {profile.name.charAt(0)}
          </span>
        </div>
        <h2 className="text-xl font-bold">{profile.name}</h2>
        <p className="text-muted-foreground">{profile.age} سنة • {profile.gender === 'male' ? 'ذكر' : 'أنثى'}</p>
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="medical-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Weight size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">الوزن</p>
            <p className="font-bold">{profile.weight} كغ</p>
          </div>
        </div>
        <div className="medical-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Ruler size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">الطول</p>
            <p className="font-bold">{profile.height} سم</p>
          </div>
        </div>
        <div className="medical-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Activity size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">BMI</p>
            <p className="font-bold">{profile.bmi}</p>
          </div>
        </div>
        <div className="medical-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Droplets size={20} className="text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">فصيلة الدم</p>
            <p className="font-bold">{profile.bloodType}</p>
          </div>
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
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope size={18} className="text-primary" />
            <h3 className="font-bold">الأمراض المزمنة</h3>
          </div>
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
            <div>
              <p className="text-xs text-muted-foreground">الطبيب المعالج</p>
              <p className="font-semibold">{profile.doctorName}</p>
            </div>
          </div>
        )}
        {profile.emergencyNumber && (
          <div className="flex items-center gap-3">
            <Phone size={18} className="text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">رقم الطوارئ</p>
              <p className="font-semibold">{profile.emergencyNumber}</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Button */}
      <button onClick={() => navigate('/onboarding')} className="w-full medical-card flex items-center justify-center gap-2 text-primary font-semibold py-3">
        <Edit2 size={18} />
        تعديل الملف الشخصي
      </button>
    </div>
  );
};

export default ProfilePage;
