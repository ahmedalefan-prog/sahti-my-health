
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  age INTEGER NOT NULL DEFAULT 25,
  gender TEXT NOT NULL DEFAULT 'male',
  weight NUMERIC NOT NULL DEFAULT 70,
  height NUMERIC NOT NULL DEFAULT 170,
  blood_type TEXT NOT NULL DEFAULT '',
  conditions TEXT[] NOT NULL DEFAULT '{}',
  custom_conditions TEXT[] NOT NULL DEFAULT '{}',
  surgeries TEXT NOT NULL DEFAULT '',
  doctor_name TEXT NOT NULL DEFAULT '',
  emergency_number TEXT NOT NULL DEFAULT '',
  bmi NUMERIC NOT NULL DEFAULT 0,
  daily_calories INTEGER NOT NULL DEFAULT 2000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Medications table
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dose TEXT NOT NULL DEFAULT '',
  form TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT 'daily',
  times TEXT[] NOT NULL DEFAULT '{}',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  interval_hours INTEGER,
  interval_unit TEXT,
  first_dose_date_time TEXT,
  specific_days TEXT[],
  weekly_day TEXT,
  monthly_day INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Medication logs
CREATE TABLE public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'taken',
  timestamp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Side effects
CREATE TABLE public.side_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'mild',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lab results
CREATE TABLE public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_key TEXT NOT NULL,
  test_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Food log
CREATE TABLE public.food_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  meal TEXT NOT NULL DEFAULT 'breakfast',
  food_name TEXT NOT NULL,
  calories NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  sodium NUMERIC NOT NULL DEFAULT 0,
  potassium NUMERIC NOT NULL DEFAULT 0,
  sugar NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Journal entries
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  mood INTEGER NOT NULL DEFAULT 3,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meal plans
CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  breakfast TEXT[] NOT NULL DEFAULT '{}',
  lunch TEXT[] NOT NULL DEFAULT '{}',
  dinner TEXT[] NOT NULL DEFAULT '{}',
  snack TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, day)
);

-- App settings
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
  quiet_hours_end TEXT NOT NULL DEFAULT '07:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom lab tests
CREATE TABLE public.custom_lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  min NUMERIC NOT NULL DEFAULT 0,
  max NUMERIC NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom foods
CREATE TABLE public.custom_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL DEFAULT '',
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  sodium NUMERIC NOT NULL DEFAULT 0,
  potassium NUMERIC NOT NULL DEFAULT 0,
  sugar NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Water log
CREATE TABLE public.water_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  glasses INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.side_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for all tables (user can only access their own data)
-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);

-- Medications
CREATE POLICY "Users can view own medications" ON public.medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medications" ON public.medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medications" ON public.medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medications" ON public.medications FOR DELETE USING (auth.uid() = user_id);

-- Medication logs
CREATE POLICY "Users can view own medication_logs" ON public.medication_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medication_logs" ON public.medication_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medication_logs" ON public.medication_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medication_logs" ON public.medication_logs FOR DELETE USING (auth.uid() = user_id);

-- Side effects
CREATE POLICY "Users can view own side_effects" ON public.side_effects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own side_effects" ON public.side_effects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own side_effects" ON public.side_effects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own side_effects" ON public.side_effects FOR DELETE USING (auth.uid() = user_id);

-- Lab results
CREATE POLICY "Users can view own lab_results" ON public.lab_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lab_results" ON public.lab_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lab_results" ON public.lab_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lab_results" ON public.lab_results FOR DELETE USING (auth.uid() = user_id);

-- Food log
CREATE POLICY "Users can view own food_log" ON public.food_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own food_log" ON public.food_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own food_log" ON public.food_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own food_log" ON public.food_log FOR DELETE USING (auth.uid() = user_id);

-- Journal entries
CREATE POLICY "Users can view own journal_entries" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own journal_entries" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journal_entries" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own journal_entries" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);

-- Meal plans
CREATE POLICY "Users can view own meal_plans" ON public.meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal_plans" ON public.meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal_plans" ON public.meal_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal_plans" ON public.meal_plans FOR DELETE USING (auth.uid() = user_id);

-- App settings
CREATE POLICY "Users can view own app_settings" ON public.app_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own app_settings" ON public.app_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own app_settings" ON public.app_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own app_settings" ON public.app_settings FOR DELETE USING (auth.uid() = user_id);

-- Custom lab tests
CREATE POLICY "Users can view own custom_lab_tests" ON public.custom_lab_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own custom_lab_tests" ON public.custom_lab_tests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom_lab_tests" ON public.custom_lab_tests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom_lab_tests" ON public.custom_lab_tests FOR DELETE USING (auth.uid() = user_id);

-- Custom foods
CREATE POLICY "Users can view own custom_foods" ON public.custom_foods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own custom_foods" ON public.custom_foods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom_foods" ON public.custom_foods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom_foods" ON public.custom_foods FOR DELETE USING (auth.uid() = user_id);

-- Water log
CREATE POLICY "Users can view own water_log" ON public.water_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own water_log" ON public.water_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own water_log" ON public.water_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own water_log" ON public.water_log FOR DELETE USING (auth.uid() = user_id);

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  INSERT INTO public.app_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
