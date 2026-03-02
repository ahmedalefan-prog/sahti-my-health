import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

// Types
export interface Profile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  weight: number;
  height: number;
  bloodType: string;
  conditions: string[];
  customConditions: string[];
  surgeries: string;
  doctorName: string;
  emergencyNumber: string;
  bmi: number;
  dailyCalories: number;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  form: string;
  frequency: string;
  times: string[];
  startDate: string;
  endDate: string;
  notes: string;
  intervalHours?: number;
  intervalUnit?: 'hours' | 'days';
  firstDoseDateTime?: string;
  specificDays?: string[];
  weeklyDay?: string;
  monthlyDay?: number;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  date: string;
  time: string;
  status: 'taken' | 'missed' | 'snoozed';
  timestamp?: string;
}

export interface SideEffect {
  id: string;
  medicationId: string;
  date: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface LabResult {
  id: string;
  testKey: string;
  testName: string;
  value: number;
  unit: string;
  date: string;
  notes: string;
  status: 'normal' | 'warning' | 'danger';
}

export interface FoodLogEntry {
  id: string;
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  sodium: number;
  potassium: number;
  sugar: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  mood: number;
  notes: string;
}

export interface MealPlanDay {
  day: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
  snack: string[];
}

export interface AppSettings {
  darkMode: boolean;
  notificationsEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  notificationsEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

interface StoreState {
  profile: Profile | null;
  medications: Medication[];
  medicationLogs: MedicationLog[];
  sideEffects: SideEffect[];
  labResults: LabResult[];
  foodLog: FoodLogEntry[];
  journalEntries: JournalEntry[];
  customLabTests: import('@/lib/constants').LabTestDef[];
  customFoods: import('@/lib/constants').FoodItem[];
  mealPlan: MealPlanDay[];
  settings: AppSettings;
  loading: boolean;
  setProfile: (p: Profile) => void;
  addMedication: (m: Medication) => void;
  removeMedication: (id: string) => void;
  addMedicationLog: (l: MedicationLog) => void;
  addSideEffect: (s: SideEffect) => void;
  addLabResult: (r: LabResult) => void;
  updateLabResult: (r: LabResult) => void;
  removeLabResult: (id: string) => void;
  addFoodLogEntry: (e: FoodLogEntry) => void;
  removeFoodLogEntry: (id: string) => void;
  addJournalEntry: (e: JournalEntry) => void;
  updateJournalEntry: (e: JournalEntry) => void;
  addCustomLabTest: (t: import('@/lib/constants').LabTestDef) => void;
  addCustomFood: (f: import('@/lib/constants').FoodItem) => void;
  setMealPlan: (plan: MealPlanDay[]) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  resetAllData: () => void;
}

const StoreContext = createContext<StoreState | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, _setProfile] = useState<Profile | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [sideEffects, setSideEffects] = useState<SideEffect[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [foodLog, setFoodLog] = useState<FoodLogEntry[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [customLabTests, setCustomLabTests] = useState<import('@/lib/constants').LabTestDef[]>([]);
  const [customFoods, setCustomFoods] = useState<import('@/lib/constants').FoodItem[]>([]);
  const [mealPlan, setMealPlanState] = useState<MealPlanDay[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load all data from Supabase when user changes
  useEffect(() => {
    if (!user) {
      _setProfile(null);
      setMedications([]);
      setMedicationLogs([]);
      setSideEffects([]);
      setLabResults([]);
      setFoodLog([]);
      setJournalEntries([]);
      setCustomLabTests([]);
      setCustomFoods([]);
      setMealPlanState([]);
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      const uid = user.id;

      const [profileRes, medsRes, logsRes, seRes, labsRes, foodRes, journalRes, mealRes, settingsRes, cltRes, cfRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', uid).single(),
        supabase.from('medications').select('*').eq('user_id', uid),
        supabase.from('medication_logs').select('*').eq('user_id', uid),
        supabase.from('side_effects').select('*').eq('user_id', uid),
        supabase.from('lab_results').select('*').eq('user_id', uid),
        supabase.from('food_log').select('*').eq('user_id', uid),
        supabase.from('journal_entries').select('*').eq('user_id', uid),
        supabase.from('meal_plans').select('*').eq('user_id', uid),
        supabase.from('app_settings').select('*').eq('user_id', uid).single(),
        supabase.from('custom_lab_tests').select('*').eq('user_id', uid),
        supabase.from('custom_foods').select('*').eq('user_id', uid),
      ]);

      if (profileRes.data && profileRes.data.name) {
        _setProfile({
          name: profileRes.data.name,
          age: profileRes.data.age,
          gender: profileRes.data.gender as 'male' | 'female',
          weight: Number(profileRes.data.weight),
          height: Number(profileRes.data.height),
          bloodType: profileRes.data.blood_type,
          conditions: profileRes.data.conditions || [],
          customConditions: profileRes.data.custom_conditions || [],
          surgeries: profileRes.data.surgeries,
          doctorName: profileRes.data.doctor_name,
          emergencyNumber: profileRes.data.emergency_number,
          bmi: Number(profileRes.data.bmi),
          dailyCalories: profileRes.data.daily_calories,
        });
      }

      if (medsRes.data) {
        setMedications(medsRes.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          dose: m.dose,
          form: m.form,
          frequency: m.frequency,
          times: m.times || [],
          startDate: m.start_date,
          endDate: m.end_date,
          notes: m.notes,
          intervalHours: m.interval_hours,
          intervalUnit: m.interval_unit as any,
          firstDoseDateTime: m.first_dose_date_time,
          specificDays: m.specific_days,
          weeklyDay: m.weekly_day,
          monthlyDay: m.monthly_day,
        })));
      }

      if (logsRes.data) {
        setMedicationLogs(logsRes.data.map((l: any) => ({
          id: l.id,
          medicationId: l.medication_id,
          date: l.date,
          time: l.time,
          status: l.status as any,
          timestamp: l.timestamp,
        })));
      }

      if (seRes.data) {
        setSideEffects(seRes.data.map((s: any) => ({
          id: s.id,
          medicationId: s.medication_id,
          date: s.date,
          description: s.description,
          severity: s.severity as any,
        })));
      }

      if (labsRes.data) {
        setLabResults(labsRes.data.map((r: any) => ({
          id: r.id,
          testKey: r.test_key,
          testName: r.test_name,
          value: Number(r.value),
          unit: r.unit,
          date: r.date,
          notes: r.notes,
          status: r.status as any,
        })));
      }

      if (foodRes.data) {
        setFoodLog(foodRes.data.map((f: any) => ({
          id: f.id,
          date: f.date,
          meal: f.meal as any,
          foodName: f.food_name,
          calories: Number(f.calories),
          carbs: Number(f.carbs),
          protein: Number(f.protein),
          fat: Number(f.fat),
          sodium: Number(f.sodium),
          potassium: Number(f.potassium),
          sugar: Number(f.sugar),
        })));
      }

      if (journalRes.data) {
        setJournalEntries(journalRes.data.map((j: any) => ({
          id: j.id,
          date: j.date,
          mood: j.mood,
          notes: j.notes,
        })));
      }

      if (mealRes.data) {
        setMealPlanState(mealRes.data.map((m: any) => ({
          day: m.day,
          breakfast: m.breakfast || [],
          lunch: m.lunch || [],
          dinner: m.dinner || [],
          snack: m.snack || [],
        })));
      }

      if (settingsRes.data) {
        setSettings({
          darkMode: settingsRes.data.dark_mode,
          notificationsEnabled: settingsRes.data.notifications_enabled,
          quietHoursStart: settingsRes.data.quiet_hours_start,
          quietHoursEnd: settingsRes.data.quiet_hours_end,
        });
      }

      if (cltRes.data) {
        setCustomLabTests(cltRes.data.map((t: any) => ({
          key: t.key,
          name: t.name,
          unit: t.unit,
          normalMin: Number(t.min),
          normalMax: Number(t.max),
        })));
      }

      if (cfRes.data) {
        setCustomFoods(cfRes.data.map((f: any) => ({
          name: f.name,
          calories: Number(f.calories),
          protein: Number(f.protein),
          carbs: Number(f.carbs),
          fat: Number(f.fat),
          sodium: Number(f.sodium),
          potassium: Number(f.potassium),
          phosphorus: 0,
          sugar: Number(f.sugar),
          fiber: 0,
        })));
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  const setProfile = useCallback(async (p: Profile) => {
    _setProfile(p);
    if (!user) return;
    await supabase.from('profiles').update({
      name: p.name, age: p.age, gender: p.gender, weight: p.weight, height: p.height,
      blood_type: p.bloodType, conditions: p.conditions, custom_conditions: p.customConditions,
      surgeries: p.surgeries, doctor_name: p.doctorName, emergency_number: p.emergencyNumber,
      bmi: p.bmi, daily_calories: p.dailyCalories,
    }).eq('user_id', user.id);
  }, [user]);

  const addMedication = useCallback(async (m: Medication) => {
    if (!user) return;
    const { data } = await supabase.from('medications').insert({
      user_id: user.id, name: m.name, dose: m.dose, form: m.form, frequency: m.frequency,
      times: m.times, start_date: m.startDate, end_date: m.endDate, notes: m.notes,
      interval_hours: m.intervalHours, interval_unit: m.intervalUnit,
      first_dose_date_time: m.firstDoseDateTime, specific_days: m.specificDays,
      weekly_day: m.weeklyDay, monthly_day: m.monthlyDay,
    }).select().single();
    if (data) setMedications(prev => [...prev, { ...m, id: data.id }]);
  }, [user]);

  const removeMedication = useCallback(async (id: string) => {
    setMedications(prev => prev.filter(m => m.id !== id));
    await supabase.from('medications').delete().eq('id', id);
  }, []);

  const addMedicationLog = useCallback(async (l: MedicationLog) => {
    if (!user) return;
    const { data } = await supabase.from('medication_logs').insert({
      user_id: user.id, medication_id: l.medicationId, date: l.date, time: l.time,
      status: l.status, timestamp: l.timestamp,
    }).select().single();
    if (data) setMedicationLogs(prev => [...prev, { ...l, id: data.id }]);
  }, [user]);

  const addSideEffect = useCallback(async (s: SideEffect) => {
    if (!user) return;
    const { data } = await supabase.from('side_effects').insert({
      user_id: user.id, medication_id: s.medicationId, date: s.date,
      description: s.description, severity: s.severity,
    }).select().single();
    if (data) setSideEffects(prev => [...prev, { ...s, id: data.id }]);
  }, [user]);

  const addLabResult = useCallback(async (r: LabResult) => {
    if (!user) return;
    const { data } = await supabase.from('lab_results').insert({
      user_id: user.id, test_key: r.testKey, test_name: r.testName, value: r.value,
      unit: r.unit, date: r.date, notes: r.notes, status: r.status,
    }).select().single();
    if (data) setLabResults(prev => [...prev, { ...r, id: data.id }]);
  }, [user]);

  const updateLabResult = useCallback(async (r: LabResult) => {
    setLabResults(prev => prev.map(l => l.id === r.id ? r : l));
    await supabase.from('lab_results').update({
      test_key: r.testKey, test_name: r.testName, value: r.value,
      unit: r.unit, date: r.date, notes: r.notes, status: r.status,
    }).eq('id', r.id);
  }, []);

  const removeLabResult = useCallback(async (id: string) => {
    setLabResults(prev => prev.filter(l => l.id !== id));
    await supabase.from('lab_results').delete().eq('id', id);
  }, []);

  const addFoodLogEntry = useCallback(async (e: FoodLogEntry) => {
    if (!user) return;
    const { data } = await supabase.from('food_log').insert({
      user_id: user.id, date: e.date, meal: e.meal, food_name: e.foodName,
      calories: e.calories, carbs: e.carbs, protein: e.protein, fat: e.fat,
      sodium: e.sodium, potassium: e.potassium, sugar: e.sugar,
    }).select().single();
    if (data) setFoodLog(prev => [...prev, { ...e, id: data.id }]);
  }, [user]);

  const removeFoodLogEntry = useCallback(async (id: string) => {
    setFoodLog(prev => prev.filter(f => f.id !== id));
    await supabase.from('food_log').delete().eq('id', id);
  }, []);

  const addJournalEntry = useCallback(async (e: JournalEntry) => {
    if (!user) return;
    const { data } = await supabase.from('journal_entries').insert({
      user_id: user.id, date: e.date, mood: e.mood, notes: e.notes,
    }).select().single();
    if (data) setJournalEntries(prev => [...prev, { ...e, id: data.id }]);
  }, [user]);

  const updateJournalEntry = useCallback(async (e: JournalEntry) => {
    setJournalEntries(prev => prev.map(j => j.id === e.id ? e : j));
    await supabase.from('journal_entries').update({
      mood: e.mood, notes: e.notes,
    }).eq('id', e.id);
  }, []);

  const addCustomLabTest = useCallback(async (t: import('@/lib/constants').LabTestDef) => {
    if (!user) return;
    await supabase.from('custom_lab_tests').insert({
      user_id: user.id, key: t.key, name: t.name, unit: t.unit,
      min: t.normalMin, max: t.normalMax,
    });
    setCustomLabTests(prev => [...prev, t]);
  }, [user]);

  const addCustomFood = useCallback(async (f: import('@/lib/constants').FoodItem) => {
    if (!user) return;
    await supabase.from('custom_foods').insert({
      user_id: user.id, name: f.name, calories: f.calories, protein: f.protein,
      carbs: f.carbs, fat: f.fat, sodium: f.sodium, potassium: f.potassium, sugar: f.sugar,
    });
    setCustomFoods(prev => [...prev, f]);
  }, [user]);

  const setMealPlan = useCallback(async (plan: MealPlanDay[]) => {
    setMealPlanState(plan);
    if (!user) return;
    // Upsert each day
    for (const day of plan) {
      await supabase.from('meal_plans').upsert({
        user_id: user.id, day: day.day,
        breakfast: day.breakfast, lunch: day.lunch, dinner: day.dinner, snack: day.snack,
      }, { onConflict: 'user_id,day' });
    }
  }, [user]);

  const updateSettings = useCallback(async (s: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...s };
      if (user) {
        supabase.from('app_settings').update({
          dark_mode: next.darkMode,
          notifications_enabled: next.notificationsEnabled,
          quiet_hours_start: next.quietHoursStart,
          quiet_hours_end: next.quietHoursEnd,
        }).eq('user_id', user.id);
      }
      return next;
    });
  }, [user]);

  const resetAllData = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      supabase.from('medications').delete().eq('user_id', user.id),
      supabase.from('medication_logs').delete().eq('user_id', user.id),
      supabase.from('side_effects').delete().eq('user_id', user.id),
      supabase.from('lab_results').delete().eq('user_id', user.id),
      supabase.from('food_log').delete().eq('user_id', user.id),
      supabase.from('journal_entries').delete().eq('user_id', user.id),
      supabase.from('meal_plans').delete().eq('user_id', user.id),
      supabase.from('custom_lab_tests').delete().eq('user_id', user.id),
      supabase.from('custom_foods').delete().eq('user_id', user.id),
    ]);
    window.location.reload();
  }, [user]);

  return (
    <StoreContext.Provider value={{
      profile, medications, medicationLogs, sideEffects, labResults, foodLog, journalEntries,
      customLabTests, customFoods, mealPlan, settings, loading,
      setProfile, addMedication, removeMedication, addMedicationLog, addSideEffect,
      addLabResult, updateLabResult, removeLabResult,
      addFoodLogEntry, removeFoodLogEntry, addJournalEntry, updateJournalEntry,
      addCustomLabTest, addCustomFood, setMealPlan, updateSettings, resetAllData,
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};

export const generateId = () => Math.random().toString(36).substring(2, 10);

export const calculateBMI = (weight: number, height: number) => {
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
};

export const calculateCalories = (gender: 'male' | 'female', weight: number, height: number, age: number) => {
  if (gender === 'male') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  }
  return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
};

export const getTodayStr = () => new Date().toISOString().split('T')[0];
