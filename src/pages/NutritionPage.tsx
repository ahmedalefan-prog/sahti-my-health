import { useState, useMemo } from 'react';
import { useAnimatedModal } from '@/hooks/use-animated-modal';
import { useStore, generateId, getTodayStr, type FoodLogEntry } from '@/lib/store';
import { FOOD_DATABASE, rateFoodForConditions, type FoodItem } from '@/lib/constants';
import { useLanguage } from '@/lib/i18n';
import { Search, Plus, X, Trash2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WaterTracker from '@/components/nutrition/WaterTracker';
import WeeklyChart from '@/components/nutrition/WeeklyChart';
import SmartRecommendations from '@/components/nutrition/SmartRecommendations';
import BarcodeScanner from '@/components/nutrition/BarcodeScanner';

const NutritionPage = () => {
  const { profile, foodLog, addFoodLogEntry, removeFoodLogEntry, customFoods, addCustomFood } = useStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const searchModal = useAnimatedModal();
  const [showCustomFood, setShowCustomFood] = useState(false);
  const today = getTodayStr();

  const MEALS = [
    { value: 'breakfast' as const, labelKey: 'meal.breakfast' },
    { value: 'lunch' as const, labelKey: 'meal.lunch' },
    { value: 'dinner' as const, labelKey: 'meal.dinner' },
    { value: 'snack' as const, labelKey: 'meal.snack' },
  ];

  const [cfName, setCfName] = useState('');
  const [cfCalories, setCfCalories] = useState('');
  const [cfCarbs, setCfCarbs] = useState('');
  const [cfProtein, setCfProtein] = useState('');
  const [cfFat, setCfFat] = useState('');
  const [cfSodium, setCfSodium] = useState('');
  const [cfPotassium, setCfPotassium] = useState('');
  const [cfSugar, setCfSugar] = useState('');

  const todayLog = foodLog.filter(f => f.date === today);
  const totalCalories = todayLog.reduce((s, f) => s + f.calories, 0);
  const totalSodium = todayLog.reduce((s, f) => s + f.sodium, 0);
  const totalSugar = todayLog.reduce((s, f) => s + f.sugar, 0);
  const totalPotassium = todayLog.reduce((s, f) => s + f.potassium, 0);
  const conditions = profile?.conditions || [];
  const allFoods = useMemo(() => [...FOOD_DATABASE, ...customFoods], [customFoods]);
  const filteredFoods = useMemo(() => !search ? allFoods : allFoods.filter(f => f.name.includes(search)), [search, allFoods]);

  const handleAddFood = (food: FoodItem) => {
    const entry: FoodLogEntry = {
      id: generateId(), date: today, meal: selectedMeal, foodName: food.name, calories: food.calories,
      carbs: food.carbs, protein: food.protein, fat: food.fat, sodium: food.sodium, potassium: food.potassium, sugar: food.sugar,
    };
    addFoodLogEntry(entry); searchModal.close(); setSearch('');
  };

  const handleAddCustomFood = () => {
    if (!cfName || !cfCalories) return;
    const newFood: FoodItem = {
      name: cfName, calories: Number(cfCalories), carbs: Number(cfCarbs) || 0,
      protein: Number(cfProtein) || 0, fat: Number(cfFat) || 0, sodium: Number(cfSodium) || 0,
      potassium: Number(cfPotassium) || 0, phosphorus: 0, sugar: Number(cfSugar) || 0, fiber: 0,
    };
    addCustomFood(newFood); handleAddFood(newFood); setShowCustomFood(false);
    setCfName(''); setCfCalories(''); setCfCarbs(''); setCfProtein('');
    setCfFat(''); setCfSodium(''); setCfPotassium(''); setCfSugar('');
  };

  const calorieTarget = profile?.dailyCalories || 2000;
  const caloriePct = Math.min(100, (totalCalories / calorieTarget) * 100);

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('nut.title')}</h1>
        <div className="flex gap-2">
          <BarcodeScanner selectedMeal={selectedMeal} />
          <button onClick={() => navigate('/meal-plan')} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center touch-target">
            <Calendar size={20} className="text-primary" />
          </button>
          <button onClick={() => setShowSearch(true)} className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center touch-target">
            <Plus className="text-primary-foreground" size={20} />
          </button>
        </div>
      </div>

      {/* Today Summary */}
      <div className="medical-card-elevated mb-4">
        <h3 className="font-bold mb-3">{t('nut.todaySummary')}</h3>
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>{t('nut.caloriesLabel')}</span>
            <span className="font-bold">{totalCalories} / {calorieTarget}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${caloriePct > 100 ? 'bg-destructive' : 'gradient-success'}`}
              style={{ width: `${Math.min(100, caloriePct)}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center bg-secondary/50 rounded-xl p-2">
            <p className="text-xs text-muted-foreground">{t('nut.sodium')}</p>
            <p className={`font-bold ${totalSodium > 2300 ? 'text-destructive' : ''}`}>{totalSodium}mg</p>
          </div>
          <div className="text-center bg-secondary/50 rounded-xl p-2">
            <p className="text-xs text-muted-foreground">{t('nut.sugar')}</p>
            <p className={`font-bold ${totalSugar > 50 ? 'text-destructive' : ''}`}>{totalSugar}g</p>
          </div>
          <div className="text-center bg-secondary/50 rounded-xl p-2">
            <p className="text-xs text-muted-foreground">{t('nut.potassium')}</p>
            <p className="font-bold">{totalPotassium}mg</p>
          </div>
        </div>
      </div>

      {/* Water Tracker */}
      <WaterTracker />

      {/* Weekly Chart */}
      <WeeklyChart />

      {/* Smart Recommendations */}
      <SmartRecommendations />

      {/* Meal Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {MEALS.map(m => {
          const mealItems = todayLog.filter(f => f.meal === m.value);
          return (
            <button key={m.value} onClick={() => setSelectedMeal(m.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedMeal === m.value ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}>
              {t(m.labelKey)} {mealItems.length > 0 && `(${mealItems.length})`}
            </button>
          );
        })}
      </div>

      {/* Meal Items */}
      <div className="space-y-2 mb-4">
        {todayLog.filter(f => f.meal === selectedMeal).map(entry => (
          <div key={entry.id} className="medical-card flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">{entry.foodName}</p>
              <p className="text-xs text-muted-foreground">
                {entry.calories} {t('calories')} • {entry.protein}g {t('protein')} • {entry.carbs}g {t('carbs')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">{entry.calories}</span>
              <button onClick={() => removeFoodLogEntry(entry.id)} className="p-1 hover:bg-destructive/10 rounded-lg transition-colors">
                <Trash2 size={14} className="text-destructive" />
              </button>
            </div>
          </div>
        ))}
        {todayLog.filter(f => f.meal === selectedMeal).length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('nut.noFood')}</p>
            <button onClick={() => setShowSearch(true)} className="mt-2 text-primary font-semibold text-sm">{t('nut.addFoodBtn')}</button>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end animate-backdrop-in">
          <div className="bg-card w-full max-w-lg mx-auto rounded-t-3xl p-6 pb-8 max-h-[90vh] flex flex-col animate-sheet-up overflow-y-auto">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold">{t('nut.addFood')}</h2>
              <button onClick={() => { setShowSearch(false); setSearch(''); setShowCustomFood(false); }} className="touch-target p-2"><X size={20} /></button>
            </div>
            {!showCustomFood ? (
              <>
                <div className="relative mb-3 flex-shrink-0">
                  <Search size={18} className="absolute start-3 top-3.5 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} autoFocus
                    className="w-full bg-secondary rounded-xl px-4 py-3 ps-10 outline-none focus:ring-2 focus:ring-primary"
                    placeholder={t('nut.searchPlaceholder')} />
                </div>
                <button onClick={() => setShowCustomFood(true)} className="mb-3 text-primary text-sm font-semibold flex-shrink-0">{t('nut.addCustomFood')}</button>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {filteredFoods.map((food, i) => {
                    const rating = conditions.length > 0 ? rateFoodForConditions(food, conditions) : null;
                    return (
                      <button key={i} onClick={() => handleAddFood(food)}
                        className="w-full text-start medical-card flex items-center justify-between hover:border-primary/30 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{food.name}</p>
                            {rating && <span className="text-sm">{rating.rating === 'safe' ? '🟢' : rating.rating === 'caution' ? '🟡' : '🔴'}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {food.calories} {t('calories')} • {food.protein}g {t('protein')} • {food.carbs}g {t('carbs')} • {food.fat}g {t('fat')}
                          </p>
                          {rating && rating.reasons.length > 0 && <p className="text-xs text-muted-foreground mt-1">{rating.reasons.join(' • ')}</p>}
                        </div>
                        <Plus size={18} className="text-primary flex-shrink-0 ms-2" />
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3">
                <h3 className="font-bold">{t('nut.customFoodTitle')}</h3>
                <input value={cfName} onChange={e => setCfName(e.target.value)} placeholder={`${t('nut.foodName')} *`} className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
                <input type="number" value={cfCalories} onChange={e => setCfCalories(e.target.value)} placeholder={`${t('nut.caloriesLabel')} *`} className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={cfCarbs} onChange={e => setCfCarbs(e.target.value)} placeholder={`${t('carbs')} (g)`} className="bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
                  <input type="number" value={cfProtein} onChange={e => setCfProtein(e.target.value)} placeholder={`${t('protein')} (g)`} className="bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
                  <input type="number" value={cfFat} onChange={e => setCfFat(e.target.value)} placeholder={`${t('fat')} (g)`} className="bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
                  <input type="number" value={cfSugar} onChange={e => setCfSugar(e.target.value)} placeholder={`${t('nut.sugar')} (g)`} className="bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
                  <input type="number" value={cfSodium} onChange={e => setCfSodium(e.target.value)} placeholder={`${t('nut.sodium')} (mg)`} className="bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
                  <input type="number" value={cfPotassium} onChange={e => setCfPotassium(e.target.value)} placeholder={`${t('nut.potassium')} (mg)`} className="bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="flex gap-2 sticky bottom-0 bg-card pt-2">
                  <button onClick={handleAddCustomFood} disabled={!cfName || !cfCalories}
                    className="flex-1 gradient-primary text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-40">{t('nut.saveAndAdd')}</button>
                  <button onClick={() => setShowCustomFood(false)} className="flex-1 bg-secondary font-bold py-3 rounded-xl">{t('back')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionPage;
