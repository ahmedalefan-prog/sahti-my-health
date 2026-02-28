import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Types
export interface Profile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  weight: number;
  height: number;
  bloodType: string;
  conditions: string[];
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
  // Advanced scheduling
  intervalHours?: number; // for 'interval' frequency
  intervalUnit?: 'hours' | 'days'; // hours or days
  firstDoseDateTime?: string; // ISO datetime for interval start
  specificDays?: string[]; // for 'specific_days' frequency: ['saturday','monday',...]
  weeklyDay?: string; // for 'weekly': 'saturday'
  monthlyDay?: number; // for 'monthly': 1-31
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  date: string;
  time: string;
  status: 'taken' | 'missed' | 'snoozed';
  timestamp?: string; // ISO datetime of when dose was actually taken
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
  day: string; // 'saturday' | 'sunday' | ...
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

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`sahti_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveLS(key: string, value: unknown) {
  localStorage.setItem(`sahti_${key}`, JSON.stringify(value));
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, _setProfile] = useState<Profile | null>(loadLS('profile', null));
  const [medications, setMedications] = useState<Medication[]>(loadLS('medications', []));
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>(loadLS('medicationLogs', []));
  const [sideEffects, setSideEffects] = useState<SideEffect[]>(loadLS('sideEffects', []));
  const [labResults, setLabResults] = useState<LabResult[]>(loadLS('labResults', []));
  const [foodLog, setFoodLog] = useState<FoodLogEntry[]>(loadLS('foodLog', []));
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(loadLS('journalEntries', []));
  const [customLabTests, setCustomLabTests] = useState<import('@/lib/constants').LabTestDef[]>(loadLS('customLabTests', []));
  const [customFoods, setCustomFoods] = useState<import('@/lib/constants').FoodItem[]>(loadLS('customFoods', []));
  const [mealPlan, setMealPlanState] = useState<MealPlanDay[]>(loadLS('mealPlan', []));
  const [settings, setSettings] = useState<AppSettings>(loadLS('settings', DEFAULT_SETTINGS));

  useEffect(() => { saveLS('profile', profile); }, [profile]);
  useEffect(() => { saveLS('medications', medications); }, [medications]);
  useEffect(() => { saveLS('medicationLogs', medicationLogs); }, [medicationLogs]);
  useEffect(() => { saveLS('sideEffects', sideEffects); }, [sideEffects]);
  useEffect(() => { saveLS('labResults', labResults); }, [labResults]);
  useEffect(() => { saveLS('foodLog', foodLog); }, [foodLog]);
  useEffect(() => { saveLS('journalEntries', journalEntries); }, [journalEntries]);
  useEffect(() => { saveLS('customLabTests', customLabTests); }, [customLabTests]);
  useEffect(() => { saveLS('customFoods', customFoods); }, [customFoods]);
  useEffect(() => { saveLS('mealPlan', mealPlan); }, [mealPlan]);
  useEffect(() => { saveLS('settings', settings); }, [settings]);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  const setProfile = useCallback((p: Profile) => _setProfile(p), []);
  const addMedication = useCallback((m: Medication) => setMedications(prev => [...prev, m]), []);
  const removeMedication = useCallback((id: string) => setMedications(prev => prev.filter(m => m.id !== id)), []);
  const addMedicationLog = useCallback((l: MedicationLog) => setMedicationLogs(prev => [...prev, l]), []);
  const addSideEffect = useCallback((s: SideEffect) => setSideEffects(prev => [...prev, s]), []);
  const addLabResult = useCallback((r: LabResult) => setLabResults(prev => [...prev, r]), []);
  const updateLabResult = useCallback((r: LabResult) => setLabResults(prev => prev.map(l => l.id === r.id ? r : l)), []);
  const removeLabResult = useCallback((id: string) => setLabResults(prev => prev.filter(l => l.id !== id)), []);
  const addFoodLogEntry = useCallback((e: FoodLogEntry) => setFoodLog(prev => [...prev, e]), []);
  const removeFoodLogEntry = useCallback((id: string) => setFoodLog(prev => prev.filter(f => f.id !== id)), []);
  const addJournalEntry = useCallback((e: JournalEntry) => setJournalEntries(prev => [...prev, e]), []);
  const updateJournalEntry = useCallback((e: JournalEntry) => setJournalEntries(prev => prev.map(j => j.id === e.id ? e : j)), []);
  const addCustomLabTest = useCallback((t: import('@/lib/constants').LabTestDef) => setCustomLabTests(prev => [...prev, t]), []);
  const addCustomFood = useCallback((f: import('@/lib/constants').FoodItem) => setCustomFoods(prev => [...prev, f]), []);
  const setMealPlan = useCallback((plan: MealPlanDay[]) => setMealPlanState(plan), []);
  const updateSettings = useCallback((s: Partial<AppSettings>) => setSettings(prev => ({ ...prev, ...s })), []);
  const resetAllData = useCallback(() => {
    const keys = ['profile', 'medications', 'medicationLogs', 'sideEffects', 'labResults', 'foodLog', 'journalEntries', 'customLabTests', 'customFoods', 'mealPlan', 'settings'];
    keys.forEach(k => localStorage.removeItem(`sahti_${k}`));
    window.location.reload();
  }, []);

  return (
    <StoreContext.Provider value={{
      profile, medications, medicationLogs, sideEffects, labResults, foodLog, journalEntries,
      customLabTests, customFoods, mealPlan, settings,
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
