import { useState, useMemo } from 'react';
import { useStore, generateId, type LabResult } from '@/lib/store';
import { LAB_TESTS, getLabStatus, type LabTestDef } from '@/lib/constants';
import { Plus, X, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';

const LabResultsPage = () => {
  const { labResults, addLabResult, updateLabResult, removeLabResult, profile, customLabTests, addCustomLabTest } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [showCustomTestForm, setShowCustomTestForm] = useState(false);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [editingResult, setEditingResult] = useState<LabResult | null>(null);

  // Form state
  const allTests = useMemo(() => [...LAB_TESTS, ...customLabTests], [customLabTests]);
  const [selectedTest, setSelectedTest] = useState(allTests[0]?.key || '');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Custom test form state
  const [ctName, setCtName] = useState('');
  const [ctUnit, setCtUnit] = useState('');
  const [ctMin, setCtMin] = useState('');
  const [ctMax, setCtMax] = useState('');

  const handleSubmit = () => {
    const testDef = allTests.find(t => t.key === selectedTest);
    if (!testDef || !value) return;
    const numVal = Number(value);
    const status = getLabStatus(testDef, numVal, profile?.gender);

    if (editingResult) {
      updateLabResult({ ...editingResult, value: numVal, date, notes, status, testKey: selectedTest, testName: testDef.name, unit: testDef.unit });
    } else {
      const result: LabResult = {
        id: generateId(), testKey: selectedTest,
        testName: testDef.name, value: numVal,
        unit: testDef.unit, date, notes, status,
      };
      addLabResult(result);
    }
    closeForm();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingResult(null);
    setValue('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const openEdit = (r: LabResult) => {
    setEditingResult(r);
    setSelectedTest(r.testKey);
    setValue(String(r.value));
    setDate(r.date);
    setNotes(r.notes);
    setShowForm(true);
  };

  const handleAddCustomTest = () => {
    if (!ctName || !ctUnit || !ctMin || !ctMax) return;
    const key = 'custom_' + generateId();
    const newTest: LabTestDef = { key, name: ctName, unit: ctUnit, normalMin: Number(ctMin), normalMax: Number(ctMax) };
    addCustomLabTest(newTest);
    setSelectedTest(key);
    setShowCustomTestForm(false);
    setCtName(''); setCtUnit(''); setCtMin(''); setCtMax('');
  };

  const groupedResults = allTests.map(test => {
    const results = labResults.filter(r => r.testKey === test.key).sort((a, b) => b.date.localeCompare(a.date));
    return { test, results };
  }).filter(g => g.results.length > 0);

  const getTrend = (results: LabResult[], test: LabTestDef) => {
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
        <button onClick={() => { setEditingResult(null); setShowForm(true); }} className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center touch-target">
          <Plus className="text-primary-foreground" size={20} />
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end">
          <div className="bg-card w-full max-w-lg mx-auto rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{editingResult ? 'تعديل النتيجة' : 'إضافة نتيجة تحليل'}</h2>
              <button onClick={closeForm} className="touch-target p-2"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">نوع التحليل</label>
                <select value={selectedTest} onChange={e => setSelectedTest(e.target.value)}
                  className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary">
                  {allTests.map(t => (
                    <option key={t.key} value={t.key}>{t.name} ({t.unit})</option>
                  ))}
                </select>
                <button onClick={() => setShowCustomTestForm(true)} className="mt-2 text-primary text-sm font-semibold">+ إضافة نوع تحليل جديد</button>
              </div>

              {showCustomTestForm && (
                <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-sm">تحليل مخصص جديد</h4>
                  <input value={ctName} onChange={e => setCtName(e.target.value)} placeholder="اسم التحليل" className="w-full bg-card rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary text-sm" />
                  <input value={ctUnit} onChange={e => setCtUnit(e.target.value)} placeholder="الوحدة (مثال: mg/dL)" className="w-full bg-card rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary text-sm" />
                  <div className="flex gap-2">
                    <input type="number" value={ctMin} onChange={e => setCtMin(e.target.value)} placeholder="أقل قيمة طبيعية" className="flex-1 bg-card rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary text-sm" />
                    <input type="number" value={ctMax} onChange={e => setCtMax(e.target.value)} placeholder="أعلى قيمة طبيعية" className="flex-1 bg-card rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddCustomTest} className="flex-1 bg-primary text-primary-foreground font-bold py-2 rounded-xl text-sm">إضافة</button>
                    <button onClick={() => setShowCustomTestForm(false)} className="flex-1 bg-secondary font-bold py-2 rounded-xl text-sm">إلغاء</button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">القيمة</label>
                <input type="number" step="0.1" value={value} onChange={e => setValue(e.target.value)}
                  className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                  placeholder={`مثال: ${allTests.find(t => t.key === selectedTest)?.normalMax}`} />
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
                {editingResult ? 'تحديث النتيجة' : 'حفظ النتيجة'}
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
            const isExpanded = expandedTest === test.key;

            return (
              <div key={test.key} className="medical-card-elevated">
                <button onClick={() => setExpandedTest(isExpanded ? null : test.key)} className="w-full text-right">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold">{test.name}</h3>
                      <p className="text-xs text-muted-foreground">النطاق الطبيعي: {test.normalMin}-{test.normalMax} {test.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        latest.status === 'normal' ? 'status-normal' :
                        latest.status === 'warning' ? 'status-warning' : 'status-danger'
                      }`}>
                        {latest.status === 'normal' ? '🟢 طبيعي' : latest.status === 'warning' ? '🟡 مراقبة' : '🔴 خارج النطاق'}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </div>
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
                </button>

                {/* Expanded History */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
                    <h4 className="text-sm font-bold text-muted-foreground mb-2">السجل السابق ({results.length} نتائج)</h4>
                    {results.map(r => (
                      <div key={r.id} className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${
                              r.status === 'normal' ? 'text-success' : r.status === 'warning' ? 'text-warning' : 'text-destructive'
                            }`}>{r.value} {test.unit}</span>
                            <span className="text-xs text-muted-foreground">{r.date}</span>
                          </div>
                          {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-2 hover:bg-primary/10 rounded-lg transition-colors">
                            <Pencil size={14} className="text-primary" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); removeLabResult(r.id); }} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
                            <Trash2 size={14} className="text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
