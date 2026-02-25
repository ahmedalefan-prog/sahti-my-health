import { useState } from 'react';
import { useStore, generateId, type LabResult } from '@/lib/store';
import { LAB_TESTS, getLabStatus } from '@/lib/constants';
import { Plus, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const LabResultsPage = () => {
  const { labResults, addLabResult, profile } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedTest, setSelectedTest] = useState(LAB_TESTS[0].key);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    const testDef = LAB_TESTS.find(t => t.key === selectedTest);
    if (!testDef || !value) return;
    const numVal = Number(value);
    const status = getLabStatus(testDef, numVal, profile?.gender);
    const result: LabResult = {
      id: generateId(), testKey: selectedTest,
      testName: testDef.name, value: numVal,
      unit: testDef.unit, date, notes, status,
    };
    addLabResult(result);
    setShowForm(false);
    setValue('');
    setNotes('');
  };

  // Group results by test
  const groupedResults = LAB_TESTS.map(test => {
    const results = labResults.filter(r => r.testKey === test.key).sort((a, b) => b.date.localeCompare(a.date));
    return { test, results };
  }).filter(g => g.results.length > 0);

  const getTrend = (results: LabResult[], test: typeof LAB_TESTS[0]) => {
    if (results.length < 2) return null;
    const latest = results[0].value;
    const prev = results[1].value;
    const midNormal = (test.normalMin + test.normalMax) / 2;
    const latestDist = Math.abs(latest - midNormal);
    const prevDist = Math.abs(prev - midNormal);
    if (latestDist < prevDist) return 'improving';
    if (latestDist > prevDist) return 'worsening';
    return 'stable';
  };

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🧪 تحاليلي</h1>
        <button onClick={() => setShowForm(true)} className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center touch-target">
          <Plus className="text-primary-foreground" size={20} />
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end">
          <div className="bg-card w-full max-w-lg mx-auto rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">إضافة نتيجة تحليل</h2>
              <button onClick={() => setShowForm(false)} className="touch-target p-2"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">نوع التحليل</label>
                <select value={selectedTest} onChange={e => setSelectedTest(e.target.value)}
                  className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary">
                  {LAB_TESTS.map(t => (
                    <option key={t.key} value={t.key}>{t.name} ({t.unit})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">القيمة</label>
                <input type="number" step="0.1" value={value} onChange={e => setValue(e.target.value)}
                  className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                  placeholder={`مثال: ${LAB_TESTS.find(t => t.key === selectedTest)?.normalMax}`} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">تاريخ التحليل</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">ملاحظات</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none h-20" />
              </div>
              <button onClick={handleSubmit} disabled={!value}
                className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-2xl text-lg touch-target disabled:opacity-40">
                حفظ النتيجة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      {groupedResults.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">🧪</p>
          <p className="text-muted-foreground text-lg">لم تضف أي تحاليل بعد</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-primary font-semibold">أضف أول تحليل</button>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedResults.map(({ test, results }) => {
            const latest = results[0];
            const trend = getTrend(results, test);
            const change = results.length >= 2 ? ((results[0].value - results[1].value) / results[1].value * 100).toFixed(1) : null;

            return (
              <div key={test.key} className="medical-card-elevated">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold">{test.name}</h3>
                    <p className="text-xs text-muted-foreground">النطاق الطبيعي: {test.normalMin}-{test.normalMax} {test.unit}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    latest.status === 'normal' ? 'status-normal' :
                    latest.status === 'warning' ? 'status-warning' : 'status-danger'
                  }`}>
                    {latest.status === 'normal' ? '🟢 طبيعي' : latest.status === 'warning' ? '🟡 مراقبة' : '🔴 خارج النطاق'}
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold">{latest.value}</p>
                    <p className="text-xs text-muted-foreground">{test.unit} • {latest.date}</p>
                  </div>
                  {trend && (
                    <div className={`flex items-center gap-1 text-sm font-semibold ${
                      trend === 'improving' ? 'text-success' : trend === 'worsening' ? 'text-destructive' : 'text-warning'
                    }`}>
                      {trend === 'improving' ? <TrendingUp size={16} /> : trend === 'worsening' ? <TrendingDown size={16} /> : <Minus size={16} />}
                      <span>{change}%</span>
                    </div>
                  )}
                </div>
                {results.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {results.length} نتائج مسجلة • القيمة السابقة: {results[1].value} {test.unit}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LabResultsPage;
