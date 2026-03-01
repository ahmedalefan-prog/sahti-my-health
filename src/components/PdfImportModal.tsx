import { useState, useRef } from 'react';
import { X, FileUp, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { extractLabResultsFromText, convertToLabResults, type PdfExtraction, type ExtractedLabResult } from '@/lib/pdfLabMapping';
import { useStore } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';

interface Props { open: boolean; onClose: () => void; }
type Step = 'upload' | 'loading' | 'preview' | 'error';

const PdfImportModal = ({ open, onClose }: Props) => {
  const { profile, addLabResult } = useStore();
  const { t, tLabName } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [extraction, setExtraction] = useState<PdfExtraction | null>(null);
  const [results, setResults] = useState<ExtractedLabResult[]>([]);

  const handleFile = async (file: File) => {
    setStep('loading');
    try {
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
      const ext = extractLabResultsFromText(fullText, profile?.gender);
      if (ext.results.length === 0) { setStep('error'); return; }
      setExtraction(ext); setResults(ext.results); setStep('preview');
    } catch (err) { console.error('PDF parse error:', err); setStep('error'); }
  };

  const toggleResult = (key: string) => setResults(prev => prev.map(r => r.key === key ? { ...r, selected: !r.selected } : r));
  const updateValue = (key: string, newVal: string) => {
    const num = parseFloat(newVal); if (isNaN(num)) return;
    setResults(prev => prev.map(r => {
      if (r.key !== key) return r;
      const status = num >= r.normalMin && num <= r.normalMax ? 'normal'
        : (Math.abs(num < r.normalMin ? r.normalMin - num : num - r.normalMax) / ((r.normalMax - r.normalMin) || 1)) < 0.1 ? 'warning' : 'danger';
      return { ...r, value: num, status };
    }));
  };

  const handleSave = () => {
    if (!extraction) return;
    const selectedResults = results.filter(r => r.selected);
    const labResults = convertToLabResults({ ...extraction, results: selectedResults });
    labResults.forEach(r => addLabResult(r));
    toast.success(`${t('pdf.savedCount')} ${labResults.length} ${t('pdf.savedSuffix')}`);
    handleClose();
  };

  const handleClose = () => { setStep('upload'); setExtraction(null); setResults([]); onClose(); };
  if (!open) return null;
  const selectedCount = results.filter(r => r.selected).length;

  return (
    <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full max-w-lg mx-auto rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-lg font-bold">{t('pdf.title')}</h2>
          <button onClick={handleClose} className="p-2"><X size={20} /></button>
        </div>

        {step === 'upload' && (
          <div className="flex-1 flex flex-col items-center justify-center py-10">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4"><FileUp size={36} className="text-primary" /></div>
            <p className="text-lg font-semibold mb-2">{t('pdf.selectFile')}</p>
            <p className="text-sm text-muted-foreground mb-6 text-center">{t('pdf.selectDesc')}</p>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <button onClick={() => fileRef.current?.click()} className="gradient-primary text-primary-foreground font-bold py-3 px-8 rounded-2xl text-lg">{t('pdf.selectBtn')}</button>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center py-10">
            <Loader2 size={40} className="text-primary animate-spin mb-4" />
            <p className="text-lg font-semibold">{t('pdf.loading')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('pdf.loadingDesc')}</p>
          </div>
        )}

        {step === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center py-10">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4"><AlertTriangle size={36} className="text-destructive" /></div>
            <p className="text-lg font-semibold mb-2">{t('pdf.error')}</p>
            <p className="text-sm text-muted-foreground mb-6 text-center">{t('pdf.errorDesc')}</p>
            <div className="flex gap-3">
              <button onClick={() => setStep('upload')} className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-2xl">{t('pdf.tryAgain')}</button>
              <button onClick={handleClose} className="bg-secondary font-bold py-3 px-6 rounded-2xl">{t('pdf.manualEntry')}</button>
            </div>
          </div>
        )}

        {step === 'preview' && extraction && (
          <>
            <div className="bg-secondary/50 rounded-xl p-3 mb-3 flex-shrink-0">
              <h3 className="font-bold text-sm mb-1">{t('pdf.extractedResults')}</h3>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {extraction.patientName && <span>👤 {extraction.patientName}</span>}
                {extraction.gender && <span>• {extraction.gender === 'male' ? t('male') : t('female')}</span>}
                {extraction.age && <span>• {extraction.age} {t('year')}</span>}
                <span>📅 {extraction.sampleDate}</span>
              </div>
            </div>
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
                        <input type="number" step="0.1" value={r.value} onChange={e => updateValue(r.key, e.target.value)}
                          className="w-24 bg-secondary rounded-lg px-2 py-1 text-sm font-bold outline-none focus:ring-1 focus:ring-primary" />
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

export default PdfImportModal;
