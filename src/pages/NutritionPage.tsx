import { useState, useMemo } from 'react';
import { useStore, generateId, getTodayStr, type FoodLogEntry } from '@/lib/store';
import { FOOD_DATABASE, rateFoodForConditions } from '@/lib/constants';
import { Search, Plus, X } from 'lucide-react';

const MEALS = [
  { value: 'breakfast' as const, label: 'فطور' },
  { value: 'lunch' as const, label: 'غداء' },
  { value: 'dinner' as const, label: 'عشاء' },
  { value: 'snack' as const, label: 'وجبة خفيفة' },
];

const NutritionPage = () => {
  const { profile, foodLog, addFoodLogEntry } = useStore();
  const [search, setSearch] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [showSearch, setShowSearch] = useState(false);
  const today = getTodayStr();

  const todayLog = foodLog.filter(f => f.date === today);
  const totalCalories = todayLog.reduce((s, f) => s + f.calories, 0);
  const totalSodium = todayLog.reduce((s, f) => s + f.sodium, 0);
  const totalSugar = todayLog.reduce((s, f) => s + f.sugar, 0);
  const totalPotassium = todayLog.reduce((s, f) => s + f.potassium, 0);

  const conditions = profile?.conditions || [];

  const filteredFoods = useMemo(() => {
    if (!search) return FOOD_DATABASE;
    return FOOD_DATABASE.filter(f => f.name.includes(search));
  }, [search]);

  const handleAddFood = (food: typeof FOOD_DATABASE[0]) => {
    const entry: FoodLogEntry = {
      id: generateId(), date: today, meal: selectedMeal,
      foodName: food.name, calories: food.calories,
      carbs: food.carbs, protein: food.protein, fat: food.fat,
      sodium: food.sodium, potassium: food.potassium, sugar: food.sugar,
    };
    addFoodLogEntry(entry);
    setShowSearch(false);
    setSearch('');
  };

  const calorieTarget = profile?.dailyCalories || 2000;
  const caloriePct = Math.min(100, (totalCalories / calorieTarget) * 100);

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🍽️ تغذيتي</h1>
        <button onClick={() => setShowSearch(true)} className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center touch-target">
          <Plus className="text-primary-foreground" size={20} />
        </button>
      </div>

      {/* Daily Summary */}
      <div className="medical-card-elevated mb-4">
        <h3 className="font-bold mb-3">ملخص اليوم</h3>
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>السعرات الحرارية</span>
            <span className="font-bold">{totalCalories} / {calorieTarget}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${caloriePct > 100 ? 'bg-destructive' : 'gradient-success'}`}
              style={{ width: `${Math.min(100, caloriePct)}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center bg-secondary/50 rounded-xl p-2">
            <p className="text-xs text-muted-foreground">صوديوم</p>
            <p className={`font-bold ${totalSodium > 2300 ? 'text-destructive' : ''}`}>{totalSodium}mg</p>
          </div>
          <div className="text-center bg-secondary/50 rounded-xl p-2">
            <p className="text-xs text-muted-foreground">سكر</p>
            <p className={`font-bold ${totalSugar > 50 ? 'text-destructive' : ''}`}>{totalSugar}g</p>
          </div>
          <div className="text-center bg-secondary/50 rounded-xl p-2">
            <p className="text-xs text-muted-foreground">بوتاسيوم</p>
            <p className="font-bold">{totalPotassium}mg</p>
          </div>
        </div>
      </div>

      {/* Meal Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {MEALS.map(m => {
          const mealItems = todayLog.filter(f => f.meal === m.value);
          return (
            <button key={m.value} onClick={() => setSelectedMeal(m.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedMeal === m.value ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}>
              {m.label} {mealItems.length > 0 && `(${mealItems.length})`}
            </button>
          );
        })}
      </div>

      {/* Today's Food */}
      <div className="space-y-2 mb-4">
        {todayLog.filter(f => f.meal === selectedMeal).map(entry => (
          <div key={entry.id} className="medical-card flex items-center justify-between">
            <div>
              <p className="font-medium">{entry.foodName}</p>
              <p className="text-xs text-muted-foreground">
                {entry.calories} سعرة • {entry.protein}g بروتين • {entry.carbs}g كربوهيدرات
              </p>
            </div>
            <span className="text-lg font-bold text-primary">{entry.calories}</span>
          </div>
        ))}
        {todayLog.filter(f => f.meal === selectedMeal).length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لم تسجل أي طعام لهذه الوجبة</p>
            <button onClick={() => setShowSearch(true)} className="mt-2 text-primary font-semibold text-sm">+ أضف طعام</button>
          </div>
        )}
      </div>

      {/* Food Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end">
          <div className="bg-card w-full max-w-lg mx-auto rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">إضافة طعام</h2>
              <button onClick={() => { setShowSearch(false); setSearch(''); }} className="touch-target p-2"><X size={20} /></button>
            </div>
            <div className="relative mb-4">
              <Search size={18} className="absolute right-3 top-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} autoFocus
                className="w-full bg-secondary rounded-xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-primary"
                placeholder="ابحث عن طعام..." />
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {filteredFoods.map((food, i) => {
                const rating = conditions.length > 0 ? rateFoodForConditions(food, conditions) : null;
                return (
                  <button key={i} onClick={() => handleAddFood(food)}
                    className="w-full text-right medical-card flex items-center justify-between hover:border-primary/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{food.name}</p>
                        {rating && (
                          <span className="text-sm">
                            {rating.rating === 'safe' ? '🟢' : rating.rating === 'caution' ? '🟡' : '🔴'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {food.calories} سعرة • {food.protein}g بروتين • {food.carbs}g كربوهيدرات • {food.fat}g دهون
                      </p>
                      {rating && rating.reasons.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">{rating.reasons.join(' • ')}</p>
                      )}
                    </div>
                    <Plus size={18} className="text-primary mr-2 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionPage;
