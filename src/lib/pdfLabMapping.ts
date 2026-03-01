import { generateId, type LabResult } from '@/lib/store';
import type { LabTestDef } from '@/lib/constants';

export interface PdfLabTestMapping {
  key: string;
  arabicName: string;
  unit: string;
  patterns: RegExp[];
  normalMin: number;
  normalMax: number;
  genderSpecific?: { male: { min: number; max: number }; female: { min: number; max: number } };
}

export const PDF_LAB_MAPPINGS: PdfLabTestMapping[] = [
  // CBC
  { key: 'wbc', arabicName: 'كريات الدم البيضاء', unit: '×10⁹/L', patterns: [/\bWBC\b/i], normalMin: 4, normalMax: 11 },
  { key: 'rbc', arabicName: 'كريات الدم الحمراء', unit: '×10¹²/L', patterns: [/\bRBC\b/i], normalMin: 3.8, normalMax: 5.5, genderSpecific: { male: { min: 4.5, max: 5.5 }, female: { min: 3.8, max: 5.0 } } },
  { key: 'hgb', arabicName: 'الهيموغلوبين', unit: 'g/dl', patterns: [/\bHGB\b/i, /\bHemoglobin\b/i, /\bHb\b(?!\.?A1)/i], normalMin: 11.5, normalMax: 17.5, genderSpecific: { male: { min: 13.5, max: 17.5 }, female: { min: 11.5, max: 15.5 } } },
  { key: 'hct', arabicName: 'الهيماتوكريت', unit: '%', patterns: [/\bHCT\b/i, /\bHematocrit\b/i], normalMin: 36, normalMax: 53, genderSpecific: { male: { min: 41, max: 53 }, female: { min: 36, max: 46 } } },
  { key: 'mcv', arabicName: 'حجم الكرية', unit: 'fl', patterns: [/\bMCV\b/i], normalMin: 80, normalMax: 100 },
  { key: 'mch', arabicName: 'هيموغلوبين الكرية', unit: 'pg', patterns: [/\bMCH\b(?!C)/i], normalMin: 27, normalMax: 32 },
  { key: 'mchc', arabicName: 'تركيز الهيموغلوبين', unit: 'g/dl', patterns: [/\bMCHC\b/i], normalMin: 32, normalMax: 36 },
  { key: 'rdw_cv', arabicName: 'توزيع الكريات RDW-CV', unit: '%', patterns: [/\bRDW[\s-]?CV\b/i], normalMin: 11, normalMax: 16 },
  { key: 'rdw_sd', arabicName: 'توزيع الكريات RDW-SD', unit: 'fL', patterns: [/\bRDW[\s-]?SD\b/i], normalMin: 35, normalMax: 56 },
  { key: 'plt', arabicName: 'الصفائح الدموية', unit: '×10⁹/L', patterns: [/\bPLT\b/i, /\bPlatelets?\b/i], normalMin: 100, normalMax: 400 },
  { key: 'mpv', arabicName: 'حجم الصفيحة', unit: 'fl', patterns: [/\bMPV\b/i], normalMin: 7, normalMax: 11 },
  { key: 'pdw', arabicName: 'توزيع الصفائح PDW', unit: '', patterns: [/\bPDW\b/i], normalMin: 9, normalMax: 17 },
  { key: 'pct', arabicName: 'نسبة الصفائح', unit: '%', patterns: [/\bPCT\b/i], normalMin: 0.1, normalMax: 0.28 },
  { key: 'neu_abs', arabicName: 'العدلات', unit: '×10⁹/L', patterns: [/\bNEU#\b/i, /\bNEU\s*#/i], normalMin: 2, normalMax: 7 },
  { key: 'neu_pct', arabicName: 'نسبة العدلات', unit: '%', patterns: [/\bNEU%\b/i, /\bNEU\s*%/i], normalMin: 50, normalMax: 70 },
  { key: 'lym_abs', arabicName: 'الليمفاويات', unit: '×10⁹/L', patterns: [/\bLYM\b(?!\s*%)/i], normalMin: 1, normalMax: 4 },
  { key: 'lym_pct', arabicName: 'نسبة الليمفاويات', unit: '%', patterns: [/\bLYM\s*%/i], normalMin: 20, normalMax: 50 },
  { key: 'mon_abs', arabicName: 'الوحيدات', unit: '×10⁹/L', patterns: [/\bMON#\b/i, /\bMON\s*#/i], normalMin: 0.2, normalMax: 1.2 },
  { key: 'mon_pct', arabicName: 'نسبة الوحيدات', unit: '%', patterns: [/\bMON\s*%/i], normalMin: 3, normalMax: 12 },
  { key: 'eos_abs', arabicName: 'الحمضات', unit: '×10⁹/L', patterns: [/\bEOS#\b/i, /\bEOS\s*#/i], normalMin: 0.02, normalMax: 0.5 },
  { key: 'eos_pct', arabicName: 'نسبة الحمضات', unit: '%', patterns: [/\bEOS\s*%/i], normalMin: 0.5, normalMax: 5 },
  { key: 'bas_abs', arabicName: 'القاعدات', unit: '×10⁹/L', patterns: [/\bBAS#\b/i, /\bBAS\s*#/i], normalMin: 0, normalMax: 1 },
  { key: 'bas_pct', arabicName: 'نسبة القاعدات', unit: '%', patterns: [/\bBAS\s*%/i], normalMin: 0, normalMax: 1 },

  // Renal
  { key: 'blood_urea', arabicName: 'يوريا الدم', unit: 'mg/dl', patterns: [/\bBlood\s*Urea\b/i, /\bBUN\b/i], normalMin: 17, normalMax: 49 },
  { key: 's_creatinine', arabicName: 'الكرياتينين', unit: 'mg/dl', patterns: [/\bS\.?\s*Creatinine\b/i, /\bCreatinine\b/i], normalMin: 0.5, normalMax: 1.2, genderSpecific: { male: { min: 0.7, max: 1.2 }, female: { min: 0.5, max: 0.9 } } },
  { key: 'uric_acid', arabicName: 'حمض اليوريك', unit: 'mg/dl', patterns: [/\bUric\s*Acid\b/i], normalMin: 0, normalMax: 7, genderSpecific: { male: { min: 0, max: 7 }, female: { min: 0, max: 5.7 } } },
  { key: 'egfr', arabicName: 'معدل الترشيح الكلوي', unit: 'ml/min', patterns: [/\beGFR\b/i], normalMin: 60, normalMax: 999 },

  // Electrolytes - specific patterns for "(Electrolyte)" suffix
  { key: 'sodium', arabicName: 'الصوديوم', unit: 'mmol/L', patterns: [/\bSodium\s*\(?Electrolyte\)?/i, /\bSodium\b/i, /\bNa\b/i], normalMin: 135, normalMax: 148 },
  { key: 'potassium', arabicName: 'البوتاسيوم', unit: 'mmol/L', patterns: [/\bPotassium\s*\(?Electrolyte\)?/i, /\bPotassium\b/i, /\bK\+?\b(?!\s)/i], normalMin: 3.5, normalMax: 5.1 },
  { key: 'chloride', arabicName: 'الكلوريد', unit: 'mmol/L', patterns: [/\bChloride\s*\(?Electrolyte\)?/i, /\bChloride\b/i, /\bCl\b/i], normalMin: 96, normalMax: 110 },
  { key: 's_calcium', arabicName: 'كالسيوم', unit: 'mg/dl', patterns: [/\bS\.?\s*Calcium\b/i, /\bCalcium\b(?!\s*Ion)/i], normalMin: 8.6, normalMax: 10.2 },
  { key: 'ionized_calcium', arabicName: 'كالسيوم أيوني', unit: 'mg/dl', patterns: [/\bIonized\s*Ca(?:lcium)?\b/i, /\bCalcium\s*Ion/i], normalMin: 4.40, normalMax: 5.21 },

  // Liver
  { key: 'alt', arabicName: 'إنزيم الكبد ALT', unit: 'U/L', patterns: [/\bALT\b/i, /\bSGPT\b/i], normalMin: 7, normalMax: 56 },
  { key: 'ast', arabicName: 'إنزيم الكبد AST', unit: 'U/L', patterns: [/\bAST\b/i, /\bSGOT\b/i], normalMin: 10, normalMax: 40 },
  { key: 'alp', arabicName: 'الفوسفاتاز القلوي', unit: 'U/L', patterns: [/\bALP\b/i], normalMin: 44, normalMax: 147 },
  { key: 'total_bilirubin', arabicName: 'البيليروبين الكلي', unit: 'mg/dl', patterns: [/\bTotal\s*Bilirubin\b/i], normalMin: 0.1, normalMax: 1.2 },
  { key: 'direct_bilirubin', arabicName: 'البيليروبين المباشر', unit: 'mg/dl', patterns: [/\bDirect\s*Bilirubin\b/i], normalMin: 0, normalMax: 0.3 },
  { key: 'total_protein', arabicName: 'البروتين الكلي', unit: 'g/dl', patterns: [/\bTotal\s*Protein\b/i], normalMin: 6.3, normalMax: 8.2 },
  { key: 'albumin', arabicName: 'الألبومين', unit: 'g/dl', patterns: [/\bAlbumin\b/i], normalMin: 3.5, normalMax: 5.0 },

  // Lipids
  { key: 'total_cholesterol', arabicName: 'الكوليسترول الكلي', unit: 'mg/dl', patterns: [/\bTotal\s*Cholesterol\b/i], normalMin: 0, normalMax: 200 },
  { key: 'ldl', arabicName: 'الكوليسترول الضار', unit: 'mg/dl', patterns: [/\bLDL\b/i], normalMin: 0, normalMax: 100 },
  { key: 'hdl', arabicName: 'الكوليسترول النافع', unit: 'mg/dl', patterns: [/\bHDL\b/i], normalMin: 40, normalMax: 999, genderSpecific: { male: { min: 40, max: 999 }, female: { min: 50, max: 999 } } },
  { key: 'triglycerides', arabicName: 'الدهون الثلاثية', unit: 'mg/dl', patterns: [/\bTriglycerides?\b/i], normalMin: 0, normalMax: 150 },

  // Diabetes
  { key: 'fbs', arabicName: 'سكر الدم الصائم', unit: 'mg/dl', patterns: [/\bFBS\b/i, /\bFasting\s*Blood\s*Sugar\b/i, /\bFasting\s*Glucose\b/i], normalMin: 70, normalMax: 100 },
  { key: 'rbs', arabicName: 'سكر الدم العشوائي', unit: 'mg/dl', patterns: [/\bRBS\b/i, /\bRandom\s*Blood\s*Sugar\b/i], normalMin: 0, normalMax: 140 },
  { key: 'hba1c', arabicName: 'السكر التراكمي', unit: '%', patterns: [/\bHbA1[cC]\b/i, /\bHb\.?\s*A1[cC]\b/i, /\bA1[cC]\b/i], normalMin: 0, normalMax: 5.7 },
  { key: 'insulin', arabicName: 'الأنسولين', unit: 'μU/ml', patterns: [/\bInsulin\b/i], normalMin: 2.6, normalMax: 24.9 },

  // Thyroid
  { key: 'tsh', arabicName: 'هرمون الغدة الدرقية', unit: 'mIU/L', patterns: [/\bTSH\b/i], normalMin: 0.4, normalMax: 4.0 },
  { key: 't3', arabicName: 'ثلاثي اليود', unit: 'ng/dl', patterns: [/\bT3\b(?!\s*الحر)(?!\s*Free)/i], normalMin: 80, normalMax: 200 },
  { key: 't4', arabicName: 'الثيروكسين', unit: 'μg/dl', patterns: [/\bT4\b(?!\s*الحر)(?!\s*Free)/i, /\bThyroxine\b/i], normalMin: 5.1, normalMax: 14.1 },
  { key: 'free_t3', arabicName: 'T3 الحر', unit: 'pg/ml', patterns: [/\bFree\s*T3\b/i], normalMin: 2.3, normalMax: 4.2 },
  { key: 'free_t4', arabicName: 'T4 الحر', unit: 'ng/dl', patterns: [/\bFree\s*T4\b/i], normalMin: 0.89, normalMax: 1.76 },

  // Vitamins
  { key: 'vitamin_d', arabicName: 'فيتامين د', unit: 'ng/ml', patterns: [/\bVitamin\s*D3?\b/i, /\b25[\s-]?OH\s*Vitamin\s*D\b/i], normalMin: 30, normalMax: 70 },
  { key: 'vitamin_b12', arabicName: 'فيتامين ب12', unit: 'pg/ml', patterns: [/\bVitamin\s*B12\b/i], normalMin: 200, normalMax: 900 },
  { key: 'ferritin', arabicName: 'الفيريتين', unit: 'ng/ml', patterns: [/\bFerritin\b/i], normalMin: 11, normalMax: 336, genderSpecific: { male: { min: 24, max: 336 }, female: { min: 11, max: 307 } } },
  { key: 'iron', arabicName: 'الحديد', unit: 'μg/dl', patterns: [/\bIron\b/i, /\bFe\b/i], normalMin: 50, normalMax: 175, genderSpecific: { male: { min: 65, max: 175 }, female: { min: 50, max: 170 } } },
  { key: 'tibc', arabicName: 'طاقة ربط الحديد', unit: 'μg/dl', patterns: [/\bTIBC\b/i], normalMin: 250, normalMax: 370 },

  // Inflammation
  { key: 'crp', arabicName: 'بروتين سي التفاعلي', unit: 'mg/L', patterns: [/\bCRP\b/i, /\bC[\s-]?Reactive\s*Protein\b/i], normalMin: 0, normalMax: 5 },
  { key: 'esr', arabicName: 'سرعة الترسيب', unit: 'mm/hr', patterns: [/\bESR\b/i], normalMin: 0, normalMax: 20, genderSpecific: { male: { min: 0, max: 15 }, female: { min: 0, max: 20 } } },

  // Drug Monitoring
  { key: 'cyclosporin', arabicName: 'سيكلوسبورين', unit: 'ng/ml', patterns: [/\bCyclosporin\b/i, /\bCyclosporine?\b/i, /\bCyclosporin\s*C[\s-]*2\b/i], normalMin: 700, normalMax: 2000 },
  { key: 'tacrolimus', arabicName: 'تاكروليموس', unit: 'ng/ml', patterns: [/\bTacrolimus\b/i], normalMin: 5, normalMax: 15 },
  { key: 'vancomycin', arabicName: 'فانكومايسين', unit: 'mg/L', patterns: [/\bVancomycin\b/i], normalMin: 10, normalMax: 20 },
];

export interface ExtractedLabResult {
  key: string;
  arabicName: string;
  value: number;
  unit: string;
  normalMin: number;
  normalMax: number;
  status: 'normal' | 'warning' | 'danger';
  selected: boolean;
  rawText: string;
}

export interface PdfExtraction {
  patientName: string;
  gender: 'male' | 'female' | null;
  age: number | null;
  sampleDate: string;
  results: ExtractedLabResult[];
}

function getStatus(value: number, min: number, max: number): 'normal' | 'warning' | 'danger' {
  if (value >= min && value <= max) return 'normal';
  const range = max - min || max || 1;
  const diff = value < min ? min - value : value - max;
  if (diff / range < 0.1) return 'warning';
  return 'danger';
}

// Header phrases — lines containing these are skipped entirely
const HEADER_PHRASES = [
  'Sample Code:',
  'Patient Name:',
  'Gender / Age:',
  'Gender/Age:',
  'Ref By:',
  'Sample In:',
  'Sample Out:',
];

function isHeaderLine(line: string): boolean {
  return HEADER_PHRASES.some(p => line.includes(p));
}

export function extractLabResultsFromText(text: string, profileGender?: 'male' | 'female'): PdfExtraction {
  const extraction: PdfExtraction = {
    patientName: '',
    gender: null,
    age: null,
    sampleDate: '',
    results: [],
  };

  // Extract patient info from full text first
  const nameMatch = text.match(/Patient\s*Name\s*[:\s]+([^\n\r]+)/i);
  if (nameMatch) extraction.patientName = nameMatch[1].trim();

  const genderAgeMatch = text.match(/Gender\s*\/?\s*Age\s*[:\s]+\s*(M|F)\s*\/?\s*(\d+)/i);
  if (genderAgeMatch) {
    extraction.gender = genderAgeMatch[1].toUpperCase() === 'M' ? 'male' : 'female';
    extraction.age = parseInt(genderAgeMatch[2]);
  }

  const dateMatch = text.match(/Sample\s*In\s*[:\s]+\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i);
  if (dateMatch) {
    extraction.sampleDate = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
  }
  if (!extraction.sampleDate) {
    const altDate = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (altDate) {
      extraction.sampleDate = `${altDate[3]}-${altDate[2].padStart(2, '0')}-${altDate[1].padStart(2, '0')}`;
    }
  }
  if (!extraction.sampleDate) {
    extraction.sampleDate = new Date().toISOString().split('T')[0];
  }

  const gender = profileGender || extraction.gender || 'male';
  const patientAge = extraction.age;
  const foundKeys = new Set<string>();

  // Remove header lines, then work with the cleaned text
  const lines = text.split(/\n/);
  const cleanedLines: string[] = [];
  for (const line of lines) {
    // Split long lines (from pdfjs joining) on double-spaces to get pseudo-lines
    const parts = line.split(/\s{2,}/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed && !isHeaderLine(trimmed)) {
        cleanedLines.push(trimmed);
      }
    }
  }

  // Join everything back so we can search across boundaries
  const cleanedText = cleanedLines.join('  ');

  // For each mapping, search the cleaned text
  for (const mapping of PDF_LAB_MAPPINGS) {
    if (foundKeys.has(mapping.key)) continue;

    for (const pattern of mapping.patterns) {
      const match = cleanedText.match(pattern);
      if (!match || match.index === undefined) continue;

      const afterName = cleanedText.substring(match.index + match[0].length);
      let value: number | null = null;
      let notes = '';

      // Special: handle ">2000" for cyclosporin
      if (mapping.key === 'cyclosporin') {
        const gtMatch = afterName.match(/^\s*[:\s]*>\s*(\d+\.?\d*)/);
        if (gtMatch) {
          value = parseFloat(gtMatch[1]);
          notes = '⚠️ أكثر من ' + gtMatch[1] + ' - يرجى المراجعة';
        }
      }

      // Primary: first number right after the test name
      if (value === null) {
        // Take a small window after the test name to avoid grabbing numbers from other tests
        const window = afterName.substring(0, 60);
        const numMatches = window.match(/[:\s]+([<>]?\d+\.?\d*)/);
        if (numMatches) {
          const parsed = parseFloat(numMatches[1].replace(/[<>]/g, ''));
          if (!isNaN(parsed) && parsed > 0 && (patientAge === null || parsed !== patientAge)) {
            value = parsed;
          }
        }
      }

      // Fallback: any number in a wider window
      if (value === null) {
        const window = afterName.substring(0, 80);
        const allNums = window.match(/\b(\d+\.?\d*)\b/g);
        if (allNums) {
          for (const n of allNums) {
            const parsed = parseFloat(n);
            if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
              if (patientAge !== null && parsed === patientAge) continue;
              value = parsed;
              break;
            }
          }
        }
      }

      if (value !== null) {
        let min = mapping.normalMin;
        let max = mapping.normalMax;
        if (mapping.genderSpecific) {
          min = mapping.genderSpecific[gender].min;
          max = mapping.genderSpecific[gender].max;
        }

        extraction.results.push({
          key: mapping.key,
          arabicName: mapping.arabicName,
          value,
          unit: mapping.unit,
          normalMin: min,
          normalMax: max,
          status: getStatus(value, min, max),
          selected: true,
          rawText: notes || match[0],
        });
        foundKeys.add(mapping.key);
        break;
      }
    }
  }

  return extraction;
}

export function convertToLabResults(extraction: PdfExtraction): LabResult[] {
  return extraction.results
    .filter(r => r.selected)
    .map(r => ({
      id: generateId(),
      testKey: r.key,
      testName: r.arabicName,
      value: r.value,
      unit: r.unit,
      date: extraction.sampleDate,
      notes: `مستورد من PDF`,
      status: r.status,
    }));
}
