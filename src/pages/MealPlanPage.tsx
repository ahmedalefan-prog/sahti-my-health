import { useState, useMemo } from 'react';
import { useStore, type MealPlanDay } from '@/lib/store';
import { FOOD_DATABASE, type FoodItem } from '@/lib/constants';
import { Search, Plus, X, Check, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = [
  { key: 'saturday', label: 'السبت' },
  { key: 'sunday', label: 'الأحد' },
  { key: 'monday', label: 'الاثنين' },
  { key: 'tuesday', label: 'الثلاثاء' },
  { key: 'wednesday', label: 'الأربعاء' },
  { key: 'thursday', label: 'الخميس' },
  { key: 'friday', label: 'الجمعة' },
];

const MEAL_TYPES = [
  { key: 'breakfast' as const, label: 'فطور 🌅' },
  { key: 'lunch' as const, label: 'غداء 🍽️' },
  { key: 'dinner' as const, label: 'عشاء 🌙' },
  { key: 'snack' as const, label: 'وجبة خفيفة 🍎' },
];

const MealPlanPage = () => {
  const { mealPlan, setMealPlan, customFoods } = useStore();
  const [selectedDay, setSelectedDay] = useState(DAYS[0].key);
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  const allFoods = useMemo(() => [...FOOD_DATABASE, ...customFoods], [customFoods]);

  const filteredFoods = useMemo(() => {
    if (!search) return allFoods;
    return allFoods.filter(f => f.name.includes(search));
  }, [search, allFoods]);

  const getDayPlan = (dayKey: string): MealPlanDay => {
    return mealPlan.find(d => d.day === dayKey) || {
      day: dayKey, breakfast: [], lunch: [], dinner: [], snack: [],
    };
  };

  const addFoodToMeal = (food: FoodItem) => {
    const dayPlan = getDayPlan(selectedDay);
    const updated: MealPlanDay = {
      ...dayPlan,
      [selectedMeal]: [...dayPlan[selectedMeal], food.name],
    };
    const newPlan = mealPlan.filter(d => d.day !== selectedDay);
    newPlan.push(updated);
    setMealPlan(newPlan);
    setShowSearch(false);
    setSearch('');
    toast.success('تمت الإضافة ✅');
  };

  const removeFoodFromMeal = (dayKey: string, meal: keyof MealPlanDay, index: number) => {
    const dayPlan = getDayPlan(dayKey);
    const mealItems = [...(dayPlan[meal] as string[])];
    mealItems.splice(index, 1);
    const updated: MealPlanDay = { ...dayPlan, [meal]: mealItems };
    const newPlan = mealPlan.filter(d => d.day !== dayKey);
    if (updated.breakfast.length || updated.lunch.length || updated.dinner.length || updated.snack.length) {
      newPlan.push(updated);
    }
    setMealPlan(newPlan);
  };

  const currentDayPlan = getDayPlan(selectedDay);

  // Calculate day's total calories
  const dayCalories = MEAL_TYPES.reduce((total, mt) => {
    const items = currentDayPlan[mt.key] as string[];
    return total + items.reduce((sum, name) => {
      const food = allFoods.find(f => f.name === name);
      return sum + (food?.calories || 0);
    }, 0);
  }, 0);

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📅 جدول التغذية الأسبوعي</h1>
      </div>

      {/* Day selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {DAYS.map(d => (
          <button key={d.key} onClick={() => setSelectedDay(d.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              selectedDay === d.key ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Day calories */}
      <div className="medical-card mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-primary" />
          <span className="font-semibold">{DAYS.find(d => d.key === selectedDay)?.label}</span>
        </div>
        <span className="text-lg font-bold text-primary">{dayCalories} سعرة</span>
      </div>

      {/* Meals */}
      <div className="space-y-4">
        {MEAL_TYPES.map(mt => {
          const items = currentDayPlan[mt.key] as string[];
          return (
            <div key={mt.key} className="medical-card-elevated">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">{mt.label}</h3>
                <button onClick={() => { setSelectedMeal(mt.key); setShowSearch(true); }}
                  className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus size={16} className="text-primary" />
                </button>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">لم تضف أي طعام</p>
              ) : (
                <div className="space-y-2">
                  {items.map((foodName, i) => {
                    const food = allFoods.find(f => f.name === foodName);
                    return (
                      <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-xl px-3 py-2">
                        <div>
                          <p className="font-medium text-sm">{foodName}</p>
                          {food && <p className="text-xs text-muted-foreground">{food.calories} سعرة</p>}
                        </div>
                        <button onClick={() => removeFoodFromMeal(selectedDay, mt.key, i)}
                          className="p-1 hover:bg-destructive/10 rounded-lg">
                          <X size={14} className="text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Food Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end">
          <div className="bg-card w-full max-w-lg mx-auto rounded-t-3xl p-6 max-h-[80vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">إضافة إلى {MEAL_TYPES.find(m => m.key === selectedMeal)?.label}</h2>
              <button onClick={() => { setShowSearch(false); setSearch(''); }} className="p-2"><X size={20} /></button>
            </div>
            <div className="relative mb-3">
              <Search size={18} className="absolute right-3 top-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} autoFocus
                className="w-full bg-secondary rounded-xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-primary"
                placeholder="ابحث عن طعام..." />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredFoods.map((food, i) => (
                <button key={i} onClick={() => addFoodToMeal(food)}
                  className="w-full text-right flex items-center justify-between bg-secondary/50 rounded-xl px-3 py-3 hover:bg-secondary transition-colors">
                  <div>
                    <p className="font-medium text-sm">{food.name}</p>
                    <p className="text-xs text-muted-foreground">{food.calories} سعرة • {food.protein}g بروتين</p>
                  </div>
                  <Plus size={16} className="text-primary flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanPage;
