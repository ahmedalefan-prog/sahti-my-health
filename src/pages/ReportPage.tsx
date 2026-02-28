import { useStore, getTodayStr } from '@/lib/store';
import { CONDITIONS, LAB_TESTS, MOODS } from '@/lib/constants';
import { Download, FileText, Loader2, Settings, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useRef, useMemo } from 'react';
import { PDF_LAB_MAPPINGS } from '@/lib/pdfLabMapping';

type ReportPeriod = '1week' | '1month' | '3months' | '6months' | 'custom';

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: '1week', label: 'آخر أسبوع' },
  { value: '1month', label: 'آخر شهر' },
  { value: '3months', label: 'آخر 3 أشهر' },
  { value: '6months', label: 'آخر 6 أشهر' },
  { value: 'custom', label: 'فترة مخصصة' },
];

const CONTENT_OPTIONS = [
  { key: 'patient', label: 'معلومات المريض' },
  { key: 'medications', label: 'الأدوية ونسبة الالتزام' },
  { key: 'labResults', label: 'نتائج التحاليل' },
  { key: 'labComparison', label: 'مقارنة التحاليل (قبل وبعد)' },
  { key: 'charts', label: 'الرسوم البيانية' },
  { key: 'nutrition', label: 'النظام الغذائي' },
  { key: 'journal', label: 'اليوميات والملاحظات' },
  { key: 'sideEffects', label: 'الأعراض الجانبية' },
];

function getDateRange(period: ReportPeriod, customFrom: string, customTo: string): { from: string; to: string } {
  const to = getTodayStr();
  if (period === 'custom') return { from: customFrom || to, to: customTo || to };
  const d = new Date();
  if (period === '1week') d.setDate(d.getDate() - 7);
  else if (period === '1month') d.setMonth(d.getMonth() - 1);
  else if (period === '3months') d.setMonth(d.getMonth() - 3);
  else if (period === '6months') d.setMonth(d.getMonth() - 6);
  return { from: d.toISOString().split('T')[0], to };
}

const statusLabel = (s: string) => s === 'normal' ? '🟢 طبيعي' : s === 'warning' ? '🟡 مراقبة' : '🔴 خارج النطاق';

const ReportPage = () => {
  const { profile, medications, medicationLogs, labResults, foodLog, journalEntries, sideEffects } = useStore();
  const [generating, setGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);
  const today = getTodayStr();

  const [period, setPeriod] = useState<ReportPeriod>('1month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedContent, setSelectedContent] = useState<string[]>(CONTENT_OPTIONS.map(c => c.key));

  const toggleContent = (key: string) => {
    setSelectedContent(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const dateRange = useMemo(() => getDateRange(period, customFrom, customTo), [period, customFrom, customTo]);

  if (!profile) return <div className="px-4 pt-6"><p className="text-muted-foreground">يرجى إعداد الملف الشخصي أولاً</p></div>;

  const conditionLabels = profile.conditions.map(c => CONDITIONS.find(cd => cd.key === c)?.label || c);

  const getMedAdherence = (medId: string) => {
    const logs = medicationLogs.filter(l => l.medicationId === medId && l.date >= dateRange.from && l.date <= dateRange.to);
    if (logs.length === 0) return 0;
    return Math.round((logs.filter(l => l.status === 'taken').length / logs.length) * 100);
  };

  const filteredLabs = labResults.filter(r => r.date >= dateRange.from && r.date <= dateRange.to);
  const filteredFood = foodLog.filter(f => f.date >= dateRange.from && f.date <= dateRange.to);
  const filteredJournal = journalEntries.filter(j => j.date >= dateRange.from && j.date <= dateRange.to).sort((a, b) => b.date.localeCompare(a.date));
  const filteredSideEffects = sideEffects.filter(s => s.date >= dateRange.from && s.date <= dateRange.to);
  const filteredMedLogs = medicationLogs.filter(l => l.date >= dateRange.from && l.date <= dateRange.to);

  // Build all known test definitions
  const allTestDefs = new Map<string, { name: string; unit: string; normalMin: number; normalMax: number }>();
  LAB_TESTS.forEach(t => allTestDefs.set(t.key, t));
  PDF_LAB_MAPPINGS.forEach(m => {
    if (!allTestDefs.has(m.key)) allTestDefs.set(m.key, { name: m.arabicName, unit: m.unit, normalMin: m.normalMin, normalMax: m.normalMax });
  });

  // Group lab results by test key with chronological comparison
  const labsByTest = new Map<string, typeof filteredLabs>();
  filteredLabs.forEach(r => {
    if (!labsByTest.has(r.testKey)) labsByTest.set(r.testKey, []);
    labsByTest.get(r.testKey)!.push(r);
  });
  labsByTest.forEach((results) => results.sort((a, b) => a.date.localeCompare(b.date)));

  // Nutrition averages
  const uniqueFoodDays = new Set(filteredFood.map(f => f.date));
  const numDays = Math.max(uniqueFoodDays.size, 1);
  const avgCalories = Math.round(filteredFood.reduce((s, f) => s + f.calories, 0) / numDays);
  const avgSodium = Math.round(filteredFood.reduce((s, f) => s + f.sodium, 0) / numDays);
  const avgSugar = Math.round(filteredFood.reduce((s, f) => s + f.sugar, 0) / numDays);
  const overCalorieDays = Array.from(uniqueFoodDays).filter(day => {
    const dayTotal = filteredFood.filter(f => f.date === day).reduce((s, f) => s + f.calories, 0);
    return dayTotal > profile.dailyCalories;
  }).length;

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { default: jsPDF } = await import('jspdf');

      const container = reportRef.current;
      if (!container) throw new Error('No report container');

      container.style.display = 'block';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';

      // Wait for fonts
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(container, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794,
      });

      container.style.display = 'none';

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;

      let position = 0;
      let remaining = imgH;
      let pageNum = 1;

      while (remaining > 0) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -position, pdfW, imgH);
        position += pdfH;
        remaining -= pdfH;
        pageNum++;
      }

      pdf.save(`تقرير-صحتي-${today}.pdf`);
      toast.success('تم تحميل التقرير بنجاح 📄');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء إنشاء التقرير');
    } finally {
      setGenerating(false);
    }
  };

  // Settings screen
  if (showSettings) {
    return (
      <div className="px-4 pt-6 pb-4 animate-fade-in">
        <h1 className="text-2xl font-bold mb-6">📄 إعداد التقرير</h1>

        {/* Period Selection */}
        <div className="medical-card-elevated mb-4">
          <h2 className="font-bold mb-3">فترة التقرير</h2>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${period === p.value ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex gap-2 mt-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-1">من</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-1">إلى</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          )}
        </div>

        {/* Content Selection */}
        <div className="medical-card-elevated mb-4">
          <h2 className="font-bold mb-3">محتوى التقرير</h2>
          <div className="space-y-2">
            {CONTENT_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-center gap-3 py-1 cursor-pointer">
                <input type="checkbox" checked={selectedContent.includes(opt.key)}
                  onChange={() => toggleContent(opt.key)}
                  className="w-5 h-5 rounded accent-primary" />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button onClick={() => setShowSettings(false)}
          className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg touch-target flex items-center justify-center gap-2">
          <FileText size={22} />
          معاينة وتوليد التقرير
        </button>
      </div>
    );
  }

  // Report preview + generation
  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setShowSettings(true)} className="p-2 touch-target"><ChevronLeft size={20} /></button>
        <h1 className="text-2xl font-bold">📄 التقرير الطبي</h1>
      </div>

      {/* Preview Card */}
      <div className="medical-card-elevated mb-4">
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <FileText size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold">تقرير {profile.name}</h2>
          <p className="text-sm text-muted-foreground">الفترة: {dateRange.from} إلى {dateRange.to}</p>
        </div>

        <div className="space-y-2 text-sm">
          {selectedContent.includes('patient') && (
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="font-semibold mb-1">معلومات المريض</p>
              <p className="text-muted-foreground">{profile.name} • {profile.age} سنة • BMI: {profile.bmi}</p>
            </div>
          )}
          {selectedContent.includes('medications') && (
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="font-semibold mb-1">الأدوية ({medications.length})</p>
              {medications.slice(0, 3).map(m => (
                <p key={m.id} className="text-muted-foreground">{m.name} - التزام: {getMedAdherence(m.id)}%</p>
              ))}
            </div>
          )}
          {selectedContent.includes('labResults') && (
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="font-semibold mb-1">التحاليل ({filteredLabs.length} نتيجة)</p>
            </div>
          )}
          {selectedContent.includes('nutrition') && (
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="font-semibold mb-1">التغذية</p>
              <p className="text-muted-foreground">متوسط السعرات: {avgCalories} / {profile.dailyCalories}</p>
            </div>
          )}
        </div>
      </div>

      <button onClick={handleGeneratePDF} disabled={generating}
        className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg touch-target disabled:opacity-60 flex items-center justify-center gap-2">
        {generating ? <Loader2 size={22} className="animate-spin" /> : <Download size={22} />}
        {generating ? 'جاري إنشاء التقرير...' : 'تحميل التقرير PDF'}
      </button>

      {/* Hidden HTML Report for PDF generation */}
      <div ref={reportRef} style={{ display: 'none', width: '794px', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ direction: 'rtl', padding: '40px', backgroundColor: '#fff', color: '#1a1a1a', fontSize: '13px' }}>

          {/* Header - repeated concept */}
          <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px solid #2563EB', paddingBottom: '16px' }}>
            <h1 style={{ fontSize: '26px', color: '#2563EB', margin: '0 0 4px' }}>تقرير صحتي الطبي</h1>
            <p style={{ margin: '2px 0', color: '#666' }}>الفترة: من {dateRange.from} إلى {dateRange.to}</p>
            <p style={{ margin: '2px 0', color: '#999', fontSize: '11px' }}>تاريخ الإنشاء: {today}</p>
          </div>

          {/* PAGE 1 - Patient Info */}
          {selectedContent.includes('patient') && (
            <div style={{ marginBottom: '24px', backgroundColor: '#f0f7ff', padding: '16px', borderRadius: '10px' }}>
              <h2 style={{ fontSize: '16px', color: '#2563EB', margin: '0 0 10px' }}>معلومات المريض</h2>
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr><td style={{ padding: '3px 0', fontWeight: 'bold', width: '140px' }}>الاسم:</td><td>{profile.name}</td></tr>
                  <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>العمر:</td><td>{profile.age} سنة</td></tr>
                  <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>الجنس:</td><td>{profile.gender === 'male' ? 'ذكر' : 'أنثى'}</td></tr>
                  <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>الوزن / الطول:</td><td>{profile.weight} كغ / {profile.height} سم</td></tr>
                  <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>مؤشر كتلة الجسم:</td><td>{profile.bmi}</td></tr>
                  <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>فصيلة الدم:</td><td>{profile.bloodType}</td></tr>
                  <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>السعرات المطلوبة:</td><td>{profile.dailyCalories} سعرة/يوم</td></tr>
                  {profile.doctorName && <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>الطبيب المعالج:</td><td>{profile.doctorName}</td></tr>}
                  {conditionLabels.length > 0 && (
                    <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>الأمراض المزمنة:</td><td>{conditionLabels.join('، ')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGE 2 - Medications */}
          {selectedContent.includes('medications') && medications.length > 0 && (
            <div style={{ marginBottom: '24px', pageBreakBefore: 'auto' }}>
              <h2 style={{ fontSize: '16px', color: '#2563EB', margin: '0 0 10px' }}>الأدوية ونسبة الالتزام</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2563EB', color: '#fff' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>الدواء</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>الجرعة</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>التكرار</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>نسبة الالتزام</th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map((m, i) => {
                    const freqLabel = m.frequency === 'daily' ? 'يومي'
                      : m.frequency === 'interval' ? `كل ${m.intervalHours} ${m.intervalUnit === 'hours' ? 'ساعة' : 'يوم'}`
                      : m.frequency === 'weekly' ? 'أسبوعي'
                      : m.frequency === 'monthly' ? 'شهري'
                      : 'أيام محددة';
                    return (
                      <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #e5e7eb' }}>{m.name}</td>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #e5e7eb' }}>{m.dose}</td>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #e5e7eb' }}>{freqLabel}</td>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #e5e7eb' }}>{getMedAdherence(m.id)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Dose log table */}
              {filteredMedLogs.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <h3 style={{ fontSize: '14px', color: '#2563EB', margin: '0 0 6px' }}>سجل الجرعات</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e0e7ff' }}>
                        <th style={{ padding: '4px 8px', textAlign: 'right', fontSize: '12px' }}>الدواء</th>
                        <th style={{ padding: '4px 8px', textAlign: 'right', fontSize: '12px' }}>التاريخ</th>
                        <th style={{ padding: '4px 8px', textAlign: 'right', fontSize: '12px' }}>الوقت</th>
                        <th style={{ padding: '4px 8px', textAlign: 'right', fontSize: '12px' }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMedLogs.slice(-20).map((log, i) => {
                        const med = medications.find(m => m.id === log.medicationId);
                        return (
                          <tr key={log.id} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                            <td style={{ padding: '3px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '11px' }}>{med?.name || '-'}</td>
                            <td style={{ padding: '3px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '11px' }}>{log.date}</td>
                            <td style={{ padding: '3px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '11px' }}>{log.time}</td>
                            <td style={{ padding: '3px 8px', borderBottom: '1px solid #e5e7eb', fontSize: '11px' }}>
                              {log.status === 'taken' ? '✓ تم الأخذ' : log.status === 'snoozed' ? '⏰ مؤجل' : '✗ فائت'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PAGE 3 - Lab Results with Comparison */}
          {selectedContent.includes('labResults') && filteredLabs.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', color: '#2563EB', margin: '0 0 10px' }}>نتائج التحاليل</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2563EB', color: '#fff' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>التحليل</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>القيمة</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>التاريخ</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLabs.sort((a, b) => a.testName.localeCompare(b.testName) || a.date.localeCompare(b.date)).map((r, i) => (
                    <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                      <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{r.testName}</td>
                      <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{r.value} {r.unit}</td>
                      <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{r.date}</td>
                      <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{statusLabel(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Lab Comparison */}
          {selectedContent.includes('labComparison') && (() => {
            const multiTests = Array.from(labsByTest.entries()).filter(([, results]) => results.length > 1);
            if (multiTests.length === 0) return null;
            return (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '16px', color: '#2563EB', margin: '0 0 10px' }}>مقارنة التحاليل</h2>
                {multiTests.map(([testKey, results]) => {
                  const testDef = allTestDefs.get(testKey);
                  const first = results[0];
                  const last = results[results.length - 1];
                  const change = last.value - first.value;
                  const changePct = first.value !== 0 ? ((change / first.value) * 100).toFixed(1) : '0';
                  const isImprovement = last.status === 'normal' || (first.status === 'danger' && last.status === 'warning');
                  const trendIcon = change > 0 ? '↑' : change < 0 ? '↓' : '→';
                  const trendLabel = Math.abs(change) < 0.01 ? 'مستقر' : isImprovement ? 'تحسن' : 'تدهور';
                  const trendColor = trendLabel === 'تحسن' ? '#16A34A' : trendLabel === 'تدهور' ? '#DC2626' : '#666';

                  return (
                    <div key={testKey} style={{ marginBottom: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                        {testDef?.name || first.testName}
                        {testDef && <span style={{ color: '#999', fontWeight: 'normal', marginRight: '8px' }}>النطاق: {testDef.normalMin}-{testDef.normalMax} {testDef.unit}</span>}
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f0f7ff' }}>
                            <th style={{ padding: '3px 6px', textAlign: 'right' }}>التاريخ</th>
                            <th style={{ padding: '3px 6px', textAlign: 'right' }}>القيمة</th>
                            <th style={{ padding: '3px 6px', textAlign: 'right' }}>الحالة</th>
                            <th style={{ padding: '3px 6px', textAlign: 'right' }}>التغير</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((r, i) => {
                            const prev = i > 0 ? results[i - 1] : null;
                            const diff = prev ? r.value - prev.value : 0;
                            const diffStr = prev ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)}` : '-';
                            return (
                              <tr key={r.id}>
                                <td style={{ padding: '2px 6px', borderBottom: '1px solid #f0f0f0' }}>{r.date}</td>
                                <td style={{ padding: '2px 6px', borderBottom: '1px solid #f0f0f0' }}>{r.value} {r.unit}</td>
                                <td style={{ padding: '2px 6px', borderBottom: '1px solid #f0f0f0' }}>{statusLabel(r.status)}</td>
                                <td style={{ padding: '2px 6px', borderBottom: '1px solid #f0f0f0', color: diff > 0 ? '#DC2626' : diff < 0 ? '#16A34A' : '#666' }}>{diffStr}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: trendColor, fontWeight: 'bold' }}>
                        {trendIcon} التغير الكلي: {change > 0 ? '+' : ''}{change.toFixed(2)} ({changePct}%) - {trendLabel}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Nutrition */}
          {selectedContent.includes('nutrition') && (
            <div style={{ marginBottom: '24px', backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '10px' }}>
              <h2 style={{ fontSize: '16px', color: '#16A34A', margin: '0 0 8px' }}>ملخص التغذية خلال الفترة</h2>
              <table style={{ width: '100%', fontSize: '13px' }}>
                <tbody>
                  <tr><td style={{ padding: '2px 0', fontWeight: 'bold' }}>متوسط السعرات اليومية:</td><td>{avgCalories} / {profile.dailyCalories} سعرة</td></tr>
                  <tr><td style={{ padding: '2px 0', fontWeight: 'bold' }}>متوسط الصوديوم:</td><td>{avgSodium} mg</td></tr>
                  <tr><td style={{ padding: '2px 0', fontWeight: 'bold' }}>متوسط السكر:</td><td>{avgSugar} g</td></tr>
                  <tr><td style={{ padding: '2px 0', fontWeight: 'bold' }}>أيام تجاوز الحد:</td><td>{overCalorieDays} يوم</td></tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Side Effects */}
          {selectedContent.includes('sideEffects') && filteredSideEffects.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', color: '#2563EB', margin: '0 0 10px' }}>الأعراض الجانبية</h2>
              {(() => {
                const byMed = new Map<string, typeof filteredSideEffects>();
                filteredSideEffects.forEach(se => {
                  const medName = medications.find(m => m.id === se.medicationId)?.name || 'غير معروف';
                  if (!byMed.has(medName)) byMed.set(medName, []);
                  byMed.get(medName)!.push(se);
                });
                return Array.from(byMed.entries()).map(([medName, effects]) => (
                  <div key={medName} style={{ marginBottom: '8px' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '13px', margin: '0 0 4px' }}>{medName}:</p>
                    {effects.map(se => (
                      <p key={se.id} style={{ margin: '2px 0 2px 12px', fontSize: '12px' }}>
                        {se.date} - {se.description} ({se.severity === 'mild' ? 'خفيف' : se.severity === 'moderate' ? 'متوسط' : 'شديد'})
                      </p>
                    ))}
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Journal */}
          {selectedContent.includes('journal') && filteredJournal.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', color: '#2563EB', margin: '0 0 10px' }}>اليوميات والملاحظات</h2>
              {filteredJournal.slice(0, 15).map(j => {
                const moodInfo = MOODS.find(m => m.value === j.mood);
                return (
                  <p key={j.id} style={{ margin: '3px 0', fontSize: '12px' }}>
                    {j.date} {moodInfo?.emoji} {moodInfo?.label} - {j.notes || 'لا ملاحظات'}
                  </p>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '2px solid #e5e7eb', fontSize: '11px', color: '#999' }}>
            <p style={{ margin: 0 }}>تم إنشاء هذا التقرير بواسطة تطبيق صحتي • {today}</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px' }}>الفترة: {dateRange.from} إلى {dateRange.to} | {profile.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
