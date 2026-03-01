import { useStore, getTodayStr } from '@/lib/store';
import { CONDITIONS, LAB_TESTS, MOODS } from '@/lib/constants';
import { useLanguage } from '@/lib/i18n';
import { Download, FileText, Loader2, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useRef, useMemo } from 'react';
import { PDF_LAB_MAPPINGS } from '@/lib/pdfLabMapping';

const formatBloodType = (bt: string) => {
  if (!bt) return bt;
  if (bt.length >= 2 && (bt[0] === '+' || bt[0] === '-')) {
    return bt.slice(1) + bt[0];
  }
  return bt;
};

type ReportPeriod = '1week' | '1month' | '3months' | '6months' | 'custom';

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

const ReportPage = () => {
  const { profile, medications, medicationLogs, labResults, foodLog, journalEntries, sideEffects } = useStore();
  const { t, tLabName } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);
  const today = getTodayStr();

  const PERIOD_OPTIONS: { value: ReportPeriod; labelKey: string }[] = [
    { value: '1week', labelKey: 'rep.lastWeek' }, { value: '1month', labelKey: 'rep.lastMonth' },
    { value: '3months', labelKey: 'rep.last3Months' }, { value: '6months', labelKey: 'rep.last6Months' },
    { value: 'custom', labelKey: 'rep.customPeriod' },
  ];

  const CONTENT_OPTIONS = [
    { key: 'patient', labelKey: 'rep.patientInfo' }, { key: 'medications', labelKey: 'rep.medsAdherence' },
    { key: 'labResults', labelKey: 'rep.labResults' }, { key: 'labComparison', labelKey: 'rep.labComparison' },
    { key: 'charts', labelKey: 'rep.charts' }, { key: 'nutrition', labelKey: 'rep.diet' },
    { key: 'journal', labelKey: 'rep.journalNotes' }, { key: 'sideEffects', labelKey: 'rep.sideEffects' },
  ];

  const [period, setPeriod] = useState<ReportPeriod>('1month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedContent, setSelectedContent] = useState<string[]>(CONTENT_OPTIONS.map(c => c.key));
  const toggleContent = (key: string) => setSelectedContent(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const dateRange = useMemo(() => getDateRange(period, customFrom, customTo), [period, customFrom, customTo]);

  if (!profile) return <div className="px-4 pt-6"><p className="text-muted-foreground">{t('rep.setupProfile')}</p></div>;

  const conditionLabels = profile.conditions;
  const getMedAdherence = (medId: string) => {
    const logs = medicationLogs.filter(l => l.medicationId === medId && l.date >= dateRange.from && l.date <= dateRange.to);
    return logs.length === 0 ? 0 : Math.round((logs.filter(l => l.status === 'taken').length / logs.length) * 100);
  };

  const filteredLabs = labResults.filter(r => r.date >= dateRange.from && r.date <= dateRange.to);
  const filteredFood = foodLog.filter(f => f.date >= dateRange.from && f.date <= dateRange.to);
  const filteredJournal = journalEntries.filter(j => j.date >= dateRange.from && j.date <= dateRange.to).sort((a, b) => b.date.localeCompare(a.date));
  const filteredSideEffects = sideEffects.filter(s => s.date >= dateRange.from && s.date <= dateRange.to);
  const filteredMedLogs = medicationLogs.filter(l => l.date >= dateRange.from && l.date <= dateRange.to);

  const allTestDefs = new Map<string, { name: string; unit: string; normalMin: number; normalMax: number }>();
  LAB_TESTS.forEach(td => allTestDefs.set(td.key, td));
  PDF_LAB_MAPPINGS.forEach(m => { if (!allTestDefs.has(m.key)) allTestDefs.set(m.key, { name: m.arabicName, unit: m.unit, normalMin: m.normalMin, normalMax: m.normalMax }); });

  const labsByTest = new Map<string, typeof filteredLabs>();
  filteredLabs.forEach(r => { if (!labsByTest.has(r.testKey)) labsByTest.set(r.testKey, []); labsByTest.get(r.testKey)!.push(r); });
  labsByTest.forEach(results => results.sort((a, b) => a.date.localeCompare(b.date)));

  const uniqueFoodDays = new Set(filteredFood.map(f => f.date));
  const numDays = Math.max(uniqueFoodDays.size, 1);
  const avgCalories = Math.round(filteredFood.reduce((s, f) => s + f.calories, 0) / numDays);
  const avgSodium = Math.round(filteredFood.reduce((s, f) => s + f.sodium, 0) / numDays);
  const avgSugar = Math.round(filteredFood.reduce((s, f) => s + f.sugar, 0) / numDays);
  const overCalorieDays = Array.from(uniqueFoodDays).filter(day => {
    const dayTotal = filteredFood.filter(f => f.date === day).reduce((s, f) => s + f.calories, 0);
    return dayTotal > profile.dailyCalories;
  }).length;

  const statusLabel = (s: string) => s === 'normal' ? `🟢 ${t('status.normal')}` : s === 'warning' ? `🟡 ${t('status.warning')}` : `🔴 ${t('status.danger')}`;

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { default: jsPDF } = await import('jspdf');
      const container = reportRef.current;
      if (!container) throw new Error('No report container');
      container.style.display = 'block'; container.style.position = 'absolute'; container.style.left = '-9999px'; container.style.top = '0';
      await document.fonts.ready; await new Promise(r => setTimeout(r, 500));
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794 });
      container.style.display = 'none';
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth(); const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;
      let position = 0; let remaining = imgH;
      while (remaining > 0) { if (position > 0) pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, -position, pdfW, imgH); position += pdfH; remaining -= pdfH; }
      pdf.save(`report-sahti-${today}.pdf`);
      toast.success(t('rep.downloadSuccess'));
    } catch (err) { console.error(err); toast.error(t('rep.downloadError')); } finally { setGenerating(false); }
  };

  if (showSettings) {
    return (
      <div className="px-4 pt-6 pb-4 animate-fade-in">
        <h1 className="text-2xl font-bold mb-6">{t('rep.title')}</h1>
        <div className="medical-card-elevated mb-4">
          <h2 className="font-bold mb-3">{t('rep.period')}</h2>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${period === p.value ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                {t(p.labelKey)}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex gap-2 mt-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-1">{t('from')}</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-1">{t('to')}</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          )}
        </div>
        <div className="medical-card-elevated mb-4">
          <h2 className="font-bold mb-3">{t('rep.content')}</h2>
          <div className="space-y-2">
            {CONTENT_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-center gap-3 py-1 cursor-pointer">
                <input type="checkbox" checked={selectedContent.includes(opt.key)} onChange={() => toggleContent(opt.key)} className="w-5 h-5 rounded accent-primary" />
                <span className="text-sm font-medium">{t(opt.labelKey)}</span>
              </label>
            ))}
          </div>
        </div>
        <button onClick={() => setShowSettings(false)}
          className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg touch-target flex items-center justify-center gap-2">
          <FileText size={22} /> {t('rep.preview')}
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setShowSettings(true)} className="p-2 touch-target"><ChevronLeft size={20} /></button>
        <h1 className="text-2xl font-bold">{t('rep.medReport')}</h1>
      </div>

      <div className="medical-card-elevated mb-4">
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3"><FileText size={32} className="text-primary" /></div>
          <h2 className="text-xl font-bold">{t('rep.reportOf')} {profile.name}</h2>
          <p className="text-sm text-muted-foreground">{t('rep.periodLabel')}: {dateRange.from} → {dateRange.to}</p>
        </div>
        <div className="space-y-2 text-sm">
          {selectedContent.includes('patient') && (
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="font-semibold mb-1">{t('rep.patientInfo')}</p>
              <p className="text-muted-foreground">{profile.name} • {profile.age} {t('year')} • BMI: {profile.bmi}</p>
            </div>
          )}
          {selectedContent.includes('medications') && (
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="font-semibold mb-1">{t('rep.medsAdherence')} ({medications.length})</p>
              {medications.slice(0, 3).map(m => <p key={m.id} className="text-muted-foreground">{m.name} - {t('rep.adherence')}: {getMedAdherence(m.id)}%</p>)}
            </div>
          )}
          {selectedContent.includes('labResults') && (
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="font-semibold mb-1">{t('rep.labResults')} ({filteredLabs.length} {t('result')})</p>
            </div>
          )}
          {selectedContent.includes('nutrition') && (
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="font-semibold mb-1">{t('rep.diet')}</p>
              <p className="text-muted-foreground">{t('rep.pdfAvgCalories')}: {avgCalories} / {profile.dailyCalories}</p>
            </div>
          )}
        </div>
      </div>

      <button onClick={handleGeneratePDF} disabled={generating}
        className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg touch-target disabled:opacity-60 flex items-center justify-center gap-2">
        {generating ? <Loader2 size={22} className="animate-spin" /> : <Download size={22} />}
        {generating ? t('rep.generating') : t('rep.download')}
      </button>

      {/* Hidden HTML Report for PDF generation */}
      <div ref={reportRef} style={{ display: 'none', width: '794px', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ direction: 'rtl', padding: '40px', backgroundColor: '#fff', color: '#1a1a1a', fontSize: '13px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px solid #2563EB', paddingBottom: '16px' }}>
            <h1 style={{ fontSize: '26px', color: '#2563EB', margin: '0 0 4px' }}>{t('rep.pdfTitle')}</h1>
            <p style={{ margin: '2px 0', color: '#666' }}>{t('rep.periodLabel')}: {dateRange.from} → {dateRange.to}</p>
            <p style={{ margin: '2px 0', color: '#999', fontSize: '11px' }}>{t('rep.pdfCreated')}: {today}</p>
          </div>

          {selectedContent.includes('patient') && (
            <div style={{ marginBottom: '24px', backgroundColor: '#f0f7ff', padding: '16px', borderRadius: '10px' }}>
              <h2 style={{ fontSize: '16px', color: '#2563EB', margin: '0 0 10px' }}>{t('rep.patientInfo')}</h2>
              <table style={{ width: '100%' }}><tbody>
                <tr><td style={{ padding: '3px 0', fontWeight: 'bold', width: '140px' }}>{t('rep.pdfName')}:</td><td>{profile.name}</td></tr>
                <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>{t('rep.pdfAge')}:</td><td>{profile.age} {t('year')}</td></tr>
                <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>{t('rep.pdfGender')}:</td><td>{profile.gender === 'male' ? t('male') : t('female')}</td></tr>
                <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>{t('rep.pdfWeightHeight')}:</td><td>{profile.weight} {t('kg')} / {profile.height} {t('cm')}</td></tr>
                <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>{t('rep.pdfBMI')}:</td><td>{profile.bmi}</td></tr>
                <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>{t('rep.pdfBloodType')}:</td><td>{formatBloodType(profile.bloodType)}</td></tr>
                <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>{t('rep.pdfCaloriesNeeded')}:</td><td>{profile.dailyCalories} {t('calPerDay')}</td></tr>
                {profile.doctorName && <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>{t('rep.pdfDoctor')}:</td><td>{profile.doctorName}</td></tr>}
                {conditionLabels.length > 0 && <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>{t('rep.pdfConditions')}:</td><td>{conditionLabels.join('، ')}{(profile.customConditions && profile.customConditions.length > 0) ? '، ' + profile.customConditions.join('، ') : ''}</td></tr>}
                {profile.surgeries && <tr><td style={{ padding: '3px 0', fontWeight: 'bold' }}>{t('rep.pdfSurgeries')}:</td><td>{profile.surgeries}</td></tr>}
              </tbody></table>
            </div>
          )}

          {selectedContent.includes('medications') && medications.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', color: '#2563EB', margin: '0 0 10px' }}>{t('rep.medsAdherence')}</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ backgroundColor: '#2563EB', color: '#fff' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>{t('rep.pdfMed')}</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>{t('rep.pdfDose')}</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>{t('rep.pdfFreq')}</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>{t('rep.pdfAdherence')}</th>
                </tr></thead>
                <tbody>
                  {medications.map((m, i) => {
                    const freqLabel = m.frequency === 'daily' ? t('sched.daily') : m.frequency === 'interval' ? `${t('every')} ${m.intervalHours} ${m.intervalUnit === 'hours' ? t('hour') : t('day')}` : m.frequency === 'weekly' ? t('medFreq.weekly') : m.frequency === 'monthly' ? t('medFreq.monthly') : t('medFreq.specific_days');
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
            </div>
          )}

          {selectedContent.includes('labResults') && filteredLabs.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', color: '#2563EB', margin: '0 0 10px' }}>{t('rep.labResults')}</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ backgroundColor: '#2563EB', color: '#fff' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>{t('rep.pdfTest')}</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>{t('rep.pdfValue')}</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>{t('rep.pdfDate')}</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>{t('rep.pdfStatus')}</th>
                </tr></thead>
                <tbody>
                  {filteredLabs.sort((a, b) => a.testName.localeCompare(b.testName) || a.date.localeCompare(b.date)).map((r, i) => (
                    <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                      <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{tLabName(r.testKey, r.testName)}</td>
                      <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{r.value} {r.unit}</td>
                      <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{r.date}</td>
                      <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{statusLabel(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedContent.includes('labComparison') && (() => {
            const comparisons: { testName: string; oldVal: number; newVal: number; oldDate: string; newDate: string; unit: string; change: number; trend: string }[] = [];
            labsByTest.forEach((results, testKey) => {
              if (results.length < 2) return;
              const oldest = results[0];
              const newest = results[results.length - 1];
              const change = newest.value - oldest.value;
              const pctChange = oldest.value !== 0 ? Math.abs(change / oldest.value) * 100 : 100;
              const def = allTestDefs.get(testKey);
              let trend = '🟡 مستقر';
              if (pctChange >= 5 && def) {
                const midNormal = (def.normalMin + def.normalMax) / 2;
                const oldDist = Math.abs(oldest.value - midNormal);
                const newDist = Math.abs(newest.value - midNormal);
                trend = newDist < oldDist ? '🟢 تحسن' : '🔴 تدهور';
              } else if (pctChange >= 5) {
                trend = change > 0 ? '🔴 تدهور' : '🟢 تحسن';
              }
              comparisons.push({ testName: tLabName(testKey, newest.testName), oldVal: oldest.value, newVal: newest.value, oldDate: oldest.date, newDate: newest.date, unit: newest.unit, change, trend });
            });
            if (comparisons.length === 0) return null;
            const improved = comparisons.filter(c => c.trend.includes('تحسن')).length;
            const worsened = comparisons.filter(c => c.trend.includes('تدهور')).length;
            const stable = comparisons.filter(c => c.trend.includes('مستقر')).length;
            return (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '16px', color: '#2563EB', margin: '0 0 10px' }}>مقارنة التحاليل (قبل وبعد)</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ backgroundColor: '#2563EB', color: '#fff' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>التحليل</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>القيمة القديمة</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>القيمة الجديدة</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>التغيير</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>الحالة</th>
                  </tr></thead>
                  <tbody>
                    {comparisons.map((c, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                        <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{c.testName}</td>
                        <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{c.oldVal} {c.unit}</td>
                        <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{c.newVal} {c.unit}</td>
                        <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{c.change > 0 ? '+' : ''}{c.change.toFixed(1)}</td>
                        <td style={{ padding: '5px 10px', borderBottom: '1px solid #e5e7eb' }}>{c.trend}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: '12px', marginTop: '8px', color: '#555' }}>
                  تحسّن في {improved} تحليل، تدهور في {worsened}، مستقر {stable}
                </p>
                {/* Mini bar charts for each comparison */}
                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#374151' }}>📊 رسم بياني للتغيرات</h3>
                  {comparisons.map((c, i) => {
                    const maxVal = Math.max(c.oldVal, c.newVal) * 1.2 || 1;
                    const oldPct = Math.round((c.oldVal / maxVal) * 100);
                    const newPct = Math.round((c.newVal / maxVal) * 100);
                    const isImproved = c.trend.includes('تحسن');
                    const isWorsened = c.trend.includes('تدهور');
                    const barColor = isImproved ? '#16A34A' : isWorsened ? '#DC2626' : '#F59E0B';
                    return (
                      <div key={i} style={{ marginBottom: '12px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 4px', color: '#374151' }}>{c.testName} ({c.unit})</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '10px', width: '50px', color: '#666', textAlign: 'left' }}>{c.oldDate.slice(5)}</span>
                          <div style={{ flex: 1, backgroundColor: '#E5E7EB', borderRadius: '4px', height: '14px', position: 'relative' }}>
                            <div style={{ width: `${oldPct}%`, backgroundColor: '#93C5FD', borderRadius: '4px', height: '14px', minWidth: '2px' }} />
                          </div>
                          <span style={{ fontSize: '10px', width: '40px', textAlign: 'right', fontWeight: 'bold' }}>{c.oldVal}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', width: '50px', color: '#666', textAlign: 'left' }}>{c.newDate.slice(5)}</span>
                          <div style={{ flex: 1, backgroundColor: '#E5E7EB', borderRadius: '4px', height: '14px', position: 'relative' }}>
                            <div style={{ width: `${newPct}%`, backgroundColor: barColor, borderRadius: '4px', height: '14px', minWidth: '2px' }} />
                          </div>
                          <span style={{ fontSize: '10px', width: '40px', textAlign: 'right', fontWeight: 'bold' }}>{c.newVal}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {selectedContent.includes('nutrition') && (
            <div style={{ marginBottom: '24px', backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '10px' }}>
              <h2 style={{ fontSize: '16px', color: '#16A34A', margin: '0 0 8px' }}>{t('rep.pdfNutrition')}</h2>
              <table style={{ width: '100%', fontSize: '13px' }}><tbody>
                <tr><td style={{ padding: '2px 0', fontWeight: 'bold' }}>{t('rep.pdfAvgCalories')}:</td><td>{avgCalories} / {profile.dailyCalories} {t('calories')}</td></tr>
                <tr><td style={{ padding: '2px 0', fontWeight: 'bold' }}>{t('rep.pdfAvgSodium')}:</td><td>{avgSodium} mg</td></tr>
                <tr><td style={{ padding: '2px 0', fontWeight: 'bold' }}>{t('rep.pdfAvgSugar')}:</td><td>{avgSugar} g</td></tr>
                <tr><td style={{ padding: '2px 0', fontWeight: 'bold' }}>{t('rep.pdfOverDays')}:</td><td>{overCalorieDays} {t('day')}</td></tr>
              </tbody></table>
            </div>
          )}


          {selectedContent.includes('journal') && filteredJournal.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', color: '#2563EB', margin: '0 0 10px' }}>{t('rep.journalNotes')}</h2>
              {filteredJournal.slice(0, 15).map(j => {
                const moodInfo = MOODS.find(m => m.value === j.mood);
                return <p key={j.id} style={{ margin: '3px 0', fontSize: '12px' }}>{j.date} {moodInfo?.emoji} {t('mood.' + j.mood)} - {j.notes || t('rep.pdfNoNotes')}</p>;
              })}
            </div>
          )}

          {selectedContent.includes('sideEffects') && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', color: '#2563EB', margin: '0 0 10px' }}>الأعراض الجانبية المسجّلة</h2>
              {filteredSideEffects.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#666' }}>لم تُسجَّل أعراض جانبية خلال هذه الفترة</p>
              ) : (() => {
                const byMed = new Map<string, typeof filteredSideEffects>();
                filteredSideEffects.forEach(se => { const medName = medications.find(m => m.id === se.medicationId)?.name || '-'; if (!byMed.has(medName)) byMed.set(medName, []); byMed.get(medName)!.push(se); });
                return Array.from(byMed.entries()).map(([medName, effects]) => (
                  <div key={medName} style={{ marginBottom: '8px' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '13px', margin: '0 0 4px' }}>{medName}:</p>
                    {effects.map(se => (
                      <p key={se.id} style={{ margin: '2px 0 2px 12px', fontSize: '12px' }}>
                        {se.date} - {se.description} ({se.severity === 'mild' ? t('rep.pdfMild') : se.severity === 'moderate' ? t('rep.pdfModerate') : t('rep.pdfSevere')})
                      </p>
                    ))}
                  </div>
                ));
              })()}
            </div>
          )}

          <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '2px solid #e5e7eb', fontSize: '11px', color: '#999' }}>
            <p style={{ margin: 0 }}>{t('rep.pdfFooter')} • {today}</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px' }}>{t('rep.periodLabel')}: {dateRange.from} → {dateRange.to} | {profile.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
