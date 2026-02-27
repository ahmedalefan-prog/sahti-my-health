import { useStore, getTodayStr } from '@/lib/store';
import { CONDITIONS, LAB_TESTS, MOODS } from '@/lib/constants';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useRef } from 'react';

const ReportPage = () => {
  const { profile, medications, medicationLogs, labResults, foodLog, journalEntries, sideEffects } = useStore();
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const today = getTodayStr();

  if (!profile) return null;

  const conditionLabels = profile.conditions.map(c => CONDITIONS.find(cd => cd.key === c)?.label || c);

  const getMedAdherence = (medId: string) => {
    const logs = medicationLogs.filter(l => l.medicationId === medId);
    if (logs.length === 0) return 0;
    return Math.round((logs.filter(l => l.status === 'taken').length / logs.length) * 100);
  };

  const latestLabsByTest = [...LAB_TESTS].map(test => {
    const results = labResults.filter(r => r.testKey === test.key).sort((a, b) => b.date.localeCompare(a.date));
    return { test, latest: results[0] || null, previous: results[1] || null };
  }).filter(g => g.latest);

  // Also include PDF-imported results
  const pdfTestKeys = new Set(labResults.filter(r => r.testKey.startsWith('pdf_')).map(r => r.testKey));
  const pdfLabsByTest = Array.from(pdfTestKeys).map(testKey => {
    const results = labResults.filter(r => r.testKey === testKey).sort((a, b) => b.date.localeCompare(a.date));
    return { test: { key: testKey, name: results[0].testName, unit: results[0].unit, normalMin: 0, normalMax: 0 }, latest: results[0], previous: results[1] || null };
  });

  const allLabsByTest = [...latestLabsByTest, ...pdfLabsByTest];

  const recentJournal = [...journalEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
  const avgCalories = Math.round(
    last7Days.reduce((sum, day) => sum + foodLog.filter(f => f.date === day).reduce((s, f) => s + f.calories, 0), 0) / 7
  );

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { default: jsPDF } = await import('jspdf');

      const container = reportRef.current;
      if (!container) throw new Error('No report container');

      // Make visible temporarily for rendering
      container.style.display = 'block';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width at 96dpi
      });

      container.style.display = 'none';

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;

      let position = 0;
      let remaining = imgH;

      while (remaining > 0) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -position, pdfW, imgH);
        position += pdfH;
        remaining -= pdfH;
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

  const statusLabel = (s: string) => s === 'normal' ? '🟢 طبيعي' : s === 'warning' ? '🟡 مراقبة' : '🔴 خارج النطاق';

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">📄 التقرير الطبي</h1>

      {/* Preview Card */}
      <div className="medical-card-elevated mb-4">
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <FileText size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold">تقرير {profile.name}</h2>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="font-semibold mb-1">معلومات المريض</p>
            <p className="text-muted-foreground">{profile.name} • {profile.age} سنة • BMI: {profile.bmi}</p>
            {conditionLabels.length > 0 && <p className="text-muted-foreground">الأمراض: {conditionLabels.join('، ')}</p>}
          </div>
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="font-semibold mb-1">الأدوية ({medications.length})</p>
            {medications.slice(0, 3).map(m => (
              <p key={m.id} className="text-muted-foreground">{m.name} - {m.dose} - التزام: {getMedAdherence(m.id)}%</p>
            ))}
          </div>
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="font-semibold mb-1">التحاليل ({allLabsByTest.length})</p>
            {allLabsByTest.slice(0, 4).map(({ test, latest }) => (
              <p key={test.key} className="text-muted-foreground">
                {statusLabel(latest!.status)} {test.name}: {latest!.value} {test.unit}
              </p>
            ))}
          </div>
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="font-semibold mb-1">التغذية (آخر 7 أيام)</p>
            <p className="text-muted-foreground">متوسط السعرات: {avgCalories} / {profile.dailyCalories}</p>
          </div>
        </div>
      </div>

      <button onClick={handleGeneratePDF} disabled={generating}
        className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg touch-target disabled:opacity-60 flex items-center justify-center gap-2">
        {generating ? <Loader2 size={22} className="animate-spin" /> : <Download size={22} />}
        {generating ? 'جاري إنشاء التقرير...' : 'تحميل التقرير PDF'}
      </button>

      {/* Hidden HTML Report for PDF generation */}
      <div ref={reportRef} style={{ display: 'none', width: '794px', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ direction: 'rtl', padding: '40px', backgroundColor: '#fff', color: '#1a1a1a' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '3px solid #2563EB', paddingBottom: '20px' }}>
            <h1 style={{ fontSize: '28px', color: '#2563EB', margin: '0 0 5px' }}>تقرير صحتي الطبي</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>التاريخ: {today}</p>
          </div>

          {/* Patient Info */}
          <div style={{ marginBottom: '25px', backgroundColor: '#f0f7ff', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '18px', color: '#2563EB', margin: '0 0 12px' }}>معلومات المريض</h2>
            <table style={{ width: '100%', fontSize: '14px' }}>
              <tbody>
                <tr><td style={{ padding: '4px 0', fontWeight: 'bold', width: '140px' }}>الاسم:</td><td>{profile.name}</td></tr>
                <tr><td style={{ padding: '4px 0', fontWeight: 'bold' }}>العمر:</td><td>{profile.age} سنة</td></tr>
                <tr><td style={{ padding: '4px 0', fontWeight: 'bold' }}>الجنس:</td><td>{profile.gender === 'male' ? 'ذكر' : 'أنثى'}</td></tr>
                <tr><td style={{ padding: '4px 0', fontWeight: 'bold' }}>مؤشر كتلة الجسم:</td><td>{profile.bmi}</td></tr>
                <tr><td style={{ padding: '4px 0', fontWeight: 'bold' }}>فصيلة الدم:</td><td>{profile.bloodType}</td></tr>
                <tr><td style={{ padding: '4px 0', fontWeight: 'bold' }}>السعرات المطلوبة:</td><td>{profile.dailyCalories} سعرة/يوم</td></tr>
                {conditionLabels.length > 0 && (
                  <tr><td style={{ padding: '4px 0', fontWeight: 'bold' }}>الأمراض المزمنة:</td><td>{conditionLabels.join('، ')}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Medications */}
          {medications.length > 0 && (
            <div style={{ marginBottom: '25px' }}>
              <h2 style={{ fontSize: '18px', color: '#2563EB', margin: '0 0 12px' }}>الأدوية</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2563EB', color: '#fff' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>الدواء</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>الجرعة</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>التكرار</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>نسبة الالتزام</th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map((m, i) => (
                    <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>{m.name}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>{m.dose}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>{m.frequency}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>{getMedAdherence(m.id)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Lab Results */}
          {allLabsByTest.length > 0 && (
            <div style={{ marginBottom: '25px' }}>
              <h2 style={{ fontSize: '18px', color: '#2563EB', margin: '0 0 12px' }}>نتائج التحاليل</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2563EB', color: '#fff' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>التحليل</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>القيمة</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>التاريخ</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {allLabsByTest.map(({ test, latest }, i) => (
                    <tr key={test.key} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>{test.name}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>{latest!.value} {test.unit}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>{latest!.date}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>{statusLabel(latest!.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Nutrition */}
          <div style={{ marginBottom: '25px', backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '18px', color: '#16A34A', margin: '0 0 8px' }}>التغذية (متوسط 7 أيام)</h2>
            <p style={{ fontSize: '14px', margin: 0 }}>متوسط السعرات اليومية: {avgCalories} / {profile.dailyCalories} سعرة</p>
          </div>

          {/* Side Effects */}
          {sideEffects.length > 0 && (
            <div style={{ marginBottom: '25px' }}>
              <h2 style={{ fontSize: '18px', color: '#2563EB', margin: '0 0 12px' }}>الآثار الجانبية</h2>
              {sideEffects.slice(-10).map(se => {
                const med = medications.find(m => m.id === se.medicationId);
                return (
                  <p key={se.id} style={{ fontSize: '13px', margin: '4px 0' }}>
                    {se.date} - {med?.name || 'غير معروف'}: {se.description} ({se.severity === 'mild' ? 'خفيف' : se.severity === 'moderate' ? 'متوسط' : 'شديد'})
                  </p>
                );
              })}
            </div>
          )}

          {/* Journal */}
          {recentJournal.length > 0 && (
            <div style={{ marginBottom: '25px' }}>
              <h2 style={{ fontSize: '18px', color: '#2563EB', margin: '0 0 12px' }}>اليوميات (آخر 7 أيام)</h2>
              {recentJournal.map(j => {
                const moodInfo = MOODS.find(m => m.value === j.mood);
                return (
                  <p key={j.id} style={{ fontSize: '13px', margin: '4px 0' }}>
                    {j.date} {moodInfo?.emoji} - {j.notes || 'لا ملاحظات'}
                  </p>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', paddingTop: '20px', borderTop: '2px solid #e5e7eb', fontSize: '12px', color: '#999' }}>
            <p>تم إنشاء هذا التقرير بواسطة تطبيق صحتي • {today}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
