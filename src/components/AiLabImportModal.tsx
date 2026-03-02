import { useState, useRef } from 'react';
import { X, FileUp, Check, AlertTriangle, Loader2, Brain } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import type { LabResult } from '@/lib/store';

interface AiResult {
  key: string;
  arabicName: string;
  englishName?: string;
  value: number;
  unit: string;
  normalMin: number;
  normalMax: number;
  status: 'normal' | 'warning' | 'danger';
  selected: boolean;
}

interface Props { open: boolean; onClose: () => void; }
type Step = 'upload' | 'loading' | 'preview' | 'error';

const PARSE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-lab-pdf`;

const AiLabImportModal = ({ open, onClose }: Props) => {
  const { profile, addLabResult } = useStore();
  const { t, lang, tLabName } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [results, setResults] = useState<AiResult[]>([]);
  const [patientInfo, setPatientInfo] = useState<{ patientName?: string; sampleDate?: string; gender?: string; age?: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = async (file: File) => {
    setStep('loading');
    setErrorMsg('');
    try {
      // Extract text from PDF
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ') + '\n';
      }

      if (fullText.trim().length < 20) {
        setErrorMsg(lang === 'ar' ? 'لم يتم العثور على نص كافٍ في الملف' : 'Not enough text found in file');
        setStep('error');
        return;
      }

      // Send to AI edge function
      const resp = await fetch(PARSE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ pdfText: fullText, gender: profile?.gender }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        setErrorMsg(err.error || (lang === 'ar' ? 'حدث خطأ' : 'An error occurred'));
        setStep('error');
        return;
      }

      const data = await resp.json();
      if (!data.results || data.results.length === 0) {
        setErrorMsg(lang === 'ar' ? 'لم يتم العثور على نتائج تحاليل في الملف' : 'No lab results found in file');
        setStep('error');
        return;
      }

      setPatientInfo({ patientName: data.patientName, sampleDate: data.sampleDate, gender: data.gender, age: data.age });
      setResults(data.results.map((r: any) => ({ ...r, selected: true })));
      setStep('preview');
    } catch (err) {
      console.error('AI PDF parse error:', err);
      setErrorMsg(lang === 'ar' ? 'حدث خطأ أثناء تحليل الملف' : 'Error parsing file');
      setStep('error');
    }
  };

  const toggleResult = (key: string) => setResults(prev => prev.map(r => r.key === key ? { ...r, selected: !r.selected } : r));

  const handleSave = () => {
    const selected = results.filter(r => r.selected);
    const today = new Date().toISOString().split('T')[0];
    const date = patientInfo?.sampleDate || today;
    
    selected.forEach(r => {
      const labResult: LabResult = {
        id: crypto.randomUUID(),
        testKey: r.key,
        testName: r.arabicName,
        value: r.value,
        unit: r.unit,
        date,
        notes: 'مستورد بالذكاء الاصطناعي 🧠',
        status: r.status,
      };
      addLabResult(labResult);
    });
    
    toast.success(`${lang === 'ar' ? 'تم حفظ' : 'Saved'} ${selected.length} ${lang === 'ar' ? 'نتيجة' : 'results'} ✅`);
    handleClose();
  };

  const handleClose = () => { setStep('upload'); setResults([]); setPatientInfo(null); setErrorMsg(''); onClose(); };
  if (!open) return null;
  const selectedCount = results.filter(r => r.selected).length;

  return (
    <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full max-w-lg mx-auto rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2"><Brain size={20} className="text-primary" />{lang === 'ar' ? 'استيراد بالذكاء الاصطناعي' : 'AI Import'}</h2>
          <button onClick={handleClose} className="p-2"><X size={20} /></button>
        </div>

        {step === 'upload' && (
          <div className="flex-1 flex flex-col items-center justify-center py-10">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4"><Brain size={36} className="text-primary" /></div>
            <p className="text-lg font-semibold mb-2">{lang === 'ar' ? 'استيراد ذكي للتحاليل' : 'Smart Lab Import'}</p>
            <p className="text-sm text-muted-foreground mb-6 text-center">{lang === 'ar' ? 'ارفع ملف PDF وسيقوم الذكاء الاصطناعي باستخراج النتائج تلقائياً' : 'Upload a PDF and AI will extract results automatically'}</p>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <button onClick={() => fileRef.current?.click()} className="gradient-primary text-primary-foreground font-bold py-3 px-8 rounded-2xl text-lg">{t('pdf.selectBtn')}</button>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center py-10">
            <Loader2 size={40} className="text-primary animate-spin mb-4" />
            <p className="text-lg font-semibold">{lang === 'ar' ? 'جاري التحليل بالذكاء الاصطناعي...' : 'AI analyzing...'}</p>
            <p className="text-sm text-muted-foreground mt-2">{lang === 'ar' ? 'يتم استخراج النتائج وتصنيفها' : 'Extracting and classifying results'}</p>
          </div>
        )}

        {step === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center py-10">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4"><AlertTriangle size={36} className="text-destructive" /></div>
            <p className="text-lg font-semibold mb-2">{t('pdf.error')}</p>
            <p className="text-sm text-muted-foreground mb-6 text-center">{errorMsg}</p>
            <div className="flex gap-3">
              <button onClick={() => setStep('upload')} className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-2xl">{t('pdf.tryAgain')}</button>
              <button onClick={handleClose} className="bg-secondary font-bold py-3 px-6 rounded-2xl">{lang === 'ar' ? 'إغلاق' : 'Close'}</button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <>
            {patientInfo && (
              <div className="bg-secondary/50 rounded-xl p-3 mb-3 flex-shrink-0">
                <h3 className="font-bold text-sm mb-1">{t('pdf.extractedResults')}</h3>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {patientInfo.patientName && <span>👤 {patientInfo.patientName}</span>}
                  {patientInfo.gender && <span>• {patientInfo.gender === 'male' ? (lang === 'ar' ? 'ذكر' : 'Male') : (lang === 'ar' ? 'أنثى' : 'Female')}</span>}
                  {patientInfo.age && <span>• {patientInfo.age} {lang === 'ar' ? 'سنة' : 'yrs'}</span>}
                  {patientInfo.sampleDate && <span>📅 {patientInfo.sampleDate}</span>}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {results.map(r => (
                <div key={r.key} className={`rounded-xl p-3 border transition-all ${r.selected ? 'bg-card border-primary/30' : 'bg-secondary/30 border-transparent opacity-60'}`}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleResult(r.key)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${r.selected ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      {r.selected && <Check size={14} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{tLabName(r.key, r.arabicName)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.status === 'normal' ? 'status-normal' : r.status === 'warning' ? 'status-warning' : 'status-danger'}`}>
                          {r.status === 'normal' ? '🟢' : r.status === 'warning' ? '🟡' : '🔴'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold">{r.value}</span>
                        <span className="text-xs text-muted-foreground">{r.unit}</span>
                        <span className="text-xs text-muted-foreground">({r.normalMin}-{r.normalMax})</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleSave} disabled={selectedCount === 0}
              className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg flex-shrink-0 disabled:opacity-40">
              {t('pdf.saveSelected')} ({selectedCount})
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AiLabImportModal;
