import { useStore, getTodayStr } from '@/lib/store';
import { CONDITIONS, LAB_TESTS, MOODS } from '@/lib/constants';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

const ReportPage = () => {
  const { profile, medications, medicationLogs, labResults, foodLog, journalEntries, sideEffects } = useStore();
  const [generating, setGenerating] = useState(false);
  const today = getTodayStr();

  if (!profile) return null;

  const conditionLabels = profile.conditions.map(c => CONDITIONS.find(cd => cd.key === c)?.label || c);

  // Medication adherence
  const getMedAdherence = (medId: string) => {
    const logs = medicationLogs.filter(l => l.medicationId === medId);
    if (logs.length === 0) return 0;
    const taken = logs.filter(l => l.status === 'taken').length;
    return Math.round((taken / logs.length) * 100);
  };

  // Latest lab results per test
  const latestLabsByTest = [...LAB_TESTS].map(test => {
    const results = labResults.filter(r => r.testKey === test.key).sort((a, b) => b.date.localeCompare(a.date));
    return { test, latest: results[0] || null, previous: results[1] || null };
  }).filter(g => g.latest);

  // Last 7 days journal
  const recentJournal = [...journalEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  // Avg daily nutrition last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
  const avgCalories = Math.round(
    last7Days.reduce((sum, day) => sum + foodLog.filter(f => f.date === day).reduce((s, f) => s + f.calories, 0), 0) / 7
  );

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Use default font (no Arabic font embedding for simplicity)
      doc.setFont('helvetica');
      
      let y = 20;
      const pageWidth = 210;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235);
      doc.text('Sahti Medical Report', pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Date: ${today}`, pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Patient Info
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Patient Information', margin, y);
      y += 8;
      doc.setFontSize(10);
      const patientInfo = [
        `Name: ${profile.name}`,
        `Age: ${profile.age} | Gender: ${profile.gender === 'male' ? 'Male' : 'Female'}`,
        `BMI: ${profile.bmi} | Blood: ${profile.bloodType}`,
        `Calories Target: ${profile.dailyCalories}`,
        `Conditions: ${conditionLabels.join(', ') || 'None'}`,
      ];
      patientInfo.forEach(line => {
        doc.text(line, margin, y);
        y += 6;
      });
      y += 5;

      // Medications
      if (medications.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(37, 99, 235);
        doc.text('Medications', margin, y);
        y += 8;
        doc.setFontSize(9);
        doc.setTextColor(0);
        medications.forEach(med => {
          const adherence = getMedAdherence(med.id);
          doc.text(`${med.name} - ${med.dose} - Adherence: ${adherence}%`, margin, y);
          y += 5;
          if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 5;
      }

      // Lab Results
      if (latestLabsByTest.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(37, 99, 235);
        doc.text('Lab Results', margin, y);
        y += 8;
        doc.setFontSize(9);
        doc.setTextColor(0);
        latestLabsByTest.forEach(({ test, latest, previous }) => {
          const change = previous ? ` (prev: ${previous.value})` : '';
          const statusIcon = latest!.status === 'normal' ? '[OK]' : latest!.status === 'warning' ? '[!]' : '[X]';
          doc.text(`${statusIcon} ${test.name}: ${latest!.value} ${test.unit}${change} - ${latest!.date}`, margin, y);
          y += 5;
          if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 5;
      }

      // Nutrition
      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235);
      doc.text('Nutrition (7-day avg)', margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(`Average daily calories: ${avgCalories} / ${profile.dailyCalories}`, margin, y);
      y += 10;

      // Side Effects
      if (sideEffects.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(37, 99, 235);
        doc.text('Side Effects', margin, y);
        y += 8;
        doc.setFontSize(9);
        doc.setTextColor(0);
        sideEffects.slice(-10).forEach(se => {
          const med = medications.find(m => m.id === se.medicationId);
          doc.text(`${se.date} - ${med?.name || 'Unknown'}: ${se.description} (${se.severity})`, margin, y);
          y += 5;
          if (y > 270) { doc.addPage(); y = 20; }
        });
      }

      doc.save(`sahti-report-${today}.pdf`);
      toast.success('تم تحميل التقرير بنجاح 📄');
    } catch (err) {
      toast.error('حدث خطأ أثناء إنشاء التقرير');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">📄 التقرير الطبي</h1>

      {/* Preview */}
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
            {medications.length > 3 && <p className="text-muted-foreground">... و {medications.length - 3} أدوية أخرى</p>}
          </div>

          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="font-semibold mb-1">التحاليل ({latestLabsByTest.length})</p>
            {latestLabsByTest.slice(0, 3).map(({ test, latest }) => (
              <p key={test.key} className="text-muted-foreground">
                {latest!.status === 'normal' ? '🟢' : latest!.status === 'warning' ? '🟡' : '🔴'} {test.name}: {latest!.value} {test.unit}
              </p>
            ))}
          </div>

          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="font-semibold mb-1">التغذية (آخر 7 أيام)</p>
            <p className="text-muted-foreground">متوسط السعرات: {avgCalories} / {profile.dailyCalories}</p>
          </div>

          {recentJournal.length > 0 && (
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="font-semibold mb-1">اليوميات (آخر 7 أيام)</p>
              {recentJournal.slice(0, 3).map(j => {
                const moodInfo = MOODS.find(m => m.value === j.mood);
                return (
                  <p key={j.id} className="text-muted-foreground">
                    {j.date} {moodInfo?.emoji || ''} {j.notes.substring(0, 40)}{j.notes.length > 40 ? '...' : ''}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <button onClick={handleGeneratePDF} disabled={generating}
        className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg touch-target disabled:opacity-60 flex items-center justify-center gap-2">
        <Download size={22} />
        {generating ? 'جاري إنشاء التقرير...' : 'تحميل التقرير PDF'}
      </button>
    </div>
  );
};

export default ReportPage;
