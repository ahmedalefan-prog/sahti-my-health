export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const CONDITIONS = [
  { key: 'diabetes', label: 'السكري' },
  { key: 'hypertension', label: 'ضغط الدم' },
  { key: 'kidney', label: 'أمراض الكلى' },
  { key: 'cholesterol', label: 'الكوليسترول' },
  { key: 'other', label: 'أخرى' },
];

export const MED_FORMS = [
  { value: 'pill', label: 'حبة' },
  { value: 'syrup', label: 'شراب' },
  { value: 'injection', label: 'إبرة' },
  { value: 'inhaler', label: 'بخاخ' },
];

export const MED_FREQUENCIES = [
  { value: 'daily', label: 'يومي' },
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'custom', label: 'أيام محددة' },
];

export interface LabTestDef {
  key: string;
  name: string;
  unit: string;
  normalMin: number;
  normalMax: number;
  genderSpecific?: { male: { min: number; max: number }; female: { min: number; max: number } };
}

export const LAB_TESTS: LabTestDef[] = [
  { key: 'fasting_glucose', name: 'سكر الدم الصائم', unit: 'mg/dL', normalMin: 70, normalMax: 100 },
  { key: 'hba1c', name: 'HbA1c', unit: '%', normalMin: 0, normalMax: 5.7 },
  { key: 'systolic_bp', name: 'ضغط الدم الانقباضي', unit: 'mmHg', normalMin: 0, normalMax: 120 },
  { key: 'diastolic_bp', name: 'ضغط الدم الانبساطي', unit: 'mmHg', normalMin: 0, normalMax: 80 },
  { key: 'creatinine', name: 'الكرياتينين', unit: 'mg/dL', normalMin: 0.6, normalMax: 1.2 },
  { key: 'total_cholesterol', name: 'الكوليسترول الكلي', unit: 'mg/dL', normalMin: 0, normalMax: 200 },
  { key: 'ldl', name: 'LDL', unit: 'mg/dL', normalMin: 0, normalMax: 100 },
  { key: 'hdl', name: 'HDL', unit: 'mg/dL', normalMin: 40, normalMax: 999, genderSpecific: { male: { min: 40, max: 999 }, female: { min: 50, max: 999 } } },
  { key: 'sodium', name: 'الصوديوم', unit: 'mEq/L', normalMin: 136, normalMax: 145 },
  { key: 'potassium', name: 'البوتاسيوم', unit: 'mEq/L', normalMin: 3.5, normalMax: 5.0 },
];

export function getLabStatus(test: LabTestDef, value: number, gender?: 'male' | 'female'): 'normal' | 'warning' | 'danger' {
  let min = test.normalMin;
  let max = test.normalMax;
  if (test.genderSpecific && gender) {
    min = test.genderSpecific[gender].min;
    max = test.genderSpecific[gender].max;
  }
  if (value >= min && value <= max) return 'normal';
  const diff = value < min ? min - value : value - max;
  const range = max - min || max;
  if (diff / range < 0.15) return 'warning';
  return 'danger';
}

export interface FoodItem {
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  sodium: number;
  potassium: number;
  phosphorus: number;
  sugar: number;
  fiber: number;
}

export const FOOD_DATABASE: FoodItem[] = [
  { name: 'أرز أبيض (كوب)', calories: 206, carbs: 45, protein: 4, fat: 0.4, sodium: 1, potassium: 55, phosphorus: 68, sugar: 0, fiber: 0.6 },
  { name: 'خبز عربي', calories: 165, carbs: 33, protein: 5, fat: 1, sodium: 322, potassium: 72, phosphorus: 58, sugar: 1, fiber: 1.3 },
  { name: 'دجاج مشوي (100غ)', calories: 165, carbs: 0, protein: 31, fat: 3.6, sodium: 74, potassium: 256, phosphorus: 228, sugar: 0, fiber: 0 },
  { name: 'سمك مشوي (100غ)', calories: 130, carbs: 0, protein: 26, fat: 2.7, sodium: 60, potassium: 400, phosphorus: 250, sugar: 0, fiber: 0 },
  { name: 'لحم بقر (100غ)', calories: 250, carbs: 0, protein: 26, fat: 15, sodium: 66, potassium: 318, phosphorus: 198, sugar: 0, fiber: 0 },
  { name: 'بيض مسلوق', calories: 78, carbs: 0.6, protein: 6, fat: 5, sodium: 62, potassium: 63, phosphorus: 86, sugar: 0.6, fiber: 0 },
  { name: 'حليب كامل (كوب)', calories: 149, carbs: 12, protein: 8, fat: 8, sodium: 105, potassium: 322, phosphorus: 233, sugar: 12, fiber: 0 },
  { name: 'لبن زبادي (كوب)', calories: 100, carbs: 17, protein: 6, fat: 0.7, sodium: 75, potassium: 234, phosphorus: 168, sugar: 17, fiber: 0 },
  { name: 'تمر (3 حبات)', calories: 70, carbs: 18, protein: 0.4, fat: 0, sodium: 0, potassium: 167, phosphorus: 15, sugar: 16, fiber: 1.6 },
  { name: 'موز', calories: 105, carbs: 27, protein: 1.3, fat: 0.4, sodium: 1, potassium: 422, phosphorus: 26, sugar: 14, fiber: 3.1 },
  { name: 'تفاح', calories: 95, carbs: 25, protein: 0.5, fat: 0.3, sodium: 2, potassium: 195, phosphorus: 20, sugar: 19, fiber: 4.4 },
  { name: 'برتقال', calories: 62, carbs: 15, protein: 1.2, fat: 0.2, sodium: 0, potassium: 237, phosphorus: 18, sugar: 12, fiber: 3.1 },
  { name: 'خيار', calories: 16, carbs: 3.6, protein: 0.7, fat: 0.1, sodium: 2, potassium: 152, phosphorus: 24, sugar: 1.7, fiber: 0.5 },
  { name: 'طماطم', calories: 22, carbs: 4.8, protein: 1.1, fat: 0.2, sodium: 6, potassium: 292, phosphorus: 30, sugar: 3.2, fiber: 1.5 },
  { name: 'حمص (كوب)', calories: 269, carbs: 45, protein: 15, fat: 4.2, sodium: 11, potassium: 474, phosphorus: 276, sugar: 8, fiber: 12.5 },
  { name: 'فول مدمس (كوب)', calories: 187, carbs: 33, protein: 13, fat: 0.7, sodium: 5, potassium: 456, phosphorus: 216, sugar: 1.8, fiber: 9.2 },
  { name: 'سلطة خضراء', calories: 20, carbs: 4, protein: 1.5, fat: 0.2, sodium: 10, potassium: 200, phosphorus: 30, sugar: 2, fiber: 2 },
  { name: 'زيت زيتون (ملعقة)', calories: 119, carbs: 0, protein: 0, fat: 14, sodium: 0, potassium: 0, phosphorus: 0, sugar: 0, fiber: 0 },
  { name: 'جبنة بيضاء (30غ)', calories: 75, carbs: 0.4, protein: 5, fat: 6, sodium: 316, potassium: 27, phosphorus: 105, sugar: 0.4, fiber: 0 },
  { name: 'عصير برتقال (كوب)', calories: 112, carbs: 26, protein: 1.7, fat: 0.5, sodium: 2, potassium: 496, phosphorus: 42, sugar: 21, fiber: 0.5 },
  { name: 'شاي بدون سكر', calories: 2, carbs: 0.5, protein: 0, fat: 0, sodium: 0, potassium: 36, phosphorus: 2, sugar: 0, fiber: 0 },
  { name: 'قهوة عربية (فنجان)', calories: 5, carbs: 0, protein: 0.3, fat: 0, sodium: 2, potassium: 49, phosphorus: 3, sugar: 0, fiber: 0 },
  { name: 'عدس (كوب)', calories: 230, carbs: 40, protein: 18, fat: 0.8, sodium: 4, potassium: 731, phosphorus: 356, sugar: 3.6, fiber: 15.6 },
  { name: 'شوربة خضار', calories: 72, carbs: 12, protein: 2.6, fat: 1.9, sodium: 480, potassium: 300, phosphorus: 50, sugar: 4, fiber: 2 },
  { name: 'كبسة دجاج (حصة)', calories: 450, carbs: 55, protein: 25, fat: 14, sodium: 550, potassium: 350, phosphorus: 250, sugar: 2, fiber: 2 },
];

export function rateFoodForConditions(food: FoodItem, conditions: string[]): { rating: 'safe' | 'caution' | 'avoid'; reasons: string[] } {
  const reasons: string[] = [];
  let worstRating: 'safe' | 'caution' | 'avoid' = 'safe';

  const setWorst = (r: 'caution' | 'avoid') => {
    if (r === 'avoid') worstRating = 'avoid';
    else if (worstRating !== 'avoid') worstRating = 'caution';
  };

  if (conditions.includes('diabetes')) {
    if (food.sugar > 15) { setWorst('avoid'); reasons.push('نسبة سكر عالية'); }
    else if (food.sugar > 8) { setWorst('caution'); reasons.push('سكر متوسط'); }
    if (food.fiber >= 5) reasons.push('غني بالألياف ✓');
  }

  if (conditions.includes('hypertension')) {
    if (food.sodium > 400) { setWorst('avoid'); reasons.push('صوديوم عالي'); }
    else if (food.sodium > 200) { setWorst('caution'); reasons.push('صوديوم متوسط'); }
    if (food.potassium > 300) reasons.push('غني بالبوتاسيوم ✓');
  }

  if (conditions.includes('kidney')) {
    if (food.potassium > 400) { setWorst('avoid'); reasons.push('بوتاسيوم عالي'); }
    else if (food.potassium > 250) { setWorst('caution'); reasons.push('بوتاسيوم متوسط'); }
    if (food.phosphorus > 250) { setWorst('avoid'); reasons.push('فسفور عالي'); }
    else if (food.phosphorus > 150) { setWorst('caution'); reasons.push('فسفور متوسط'); }
  }

  if (conditions.includes('cholesterol')) {
    if (food.fat > 12) { setWorst('avoid'); reasons.push('دهون عالية'); }
    else if (food.fat > 6) { setWorst('caution'); reasons.push('دهون متوسطة'); }
    if (food.fiber >= 5) reasons.push('ألياف مفيدة ✓');
  }

  return { rating: worstRating, reasons };
}

export const MOODS = [
  { value: 1, emoji: '😞', label: 'سيء جداً' },
  { value: 2, emoji: '😕', label: 'سيء' },
  { value: 3, emoji: '😐', label: 'عادي' },
  { value: 4, emoji: '🙂', label: 'جيد' },
  { value: 5, emoji: '😄', label: 'ممتاز' },
];
