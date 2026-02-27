import { useState, useMemo } from 'react';
import { useStore, generateId, type LabResult } from '@/lib/store';
import { LAB_TESTS, getLabStatus, type LabTestDef } from '@/lib/constants';
import { PDF_LAB_MAPPINGS } from '@/lib/pdfLabMapping';
import { Plus, X, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Pencil, Trash2, FileUp, Calendar } from 'lucide-react';
import PdfImportModal from '@/components/PdfImportModal';

type ViewMode = 'byTest' | 'byDate';

const LabResultsPage = () => {
  const { labResults, addLabResult, updateLabResult, removeLabResult, profile, customLabTests, addCustomLabTest } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [showCustomTestForm, setShowCustomTestForm] = useState(false);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [editingResult, setEditingResult] = useState<LabResult | null>(null);
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('byDate');

  // Build complete test definitions: LAB_TESTS + customLabTests + PDF mappings for any result keys
  const allTests = useMemo(() => {
    const base: LabTestDef[] = [...LAB_TESTS, ...customLabTests];
    const knownKeys = new Set(base.map(t => t.key));

    // Add PDF mapping definitions for any results that use PDF keys
    for (const r of labResults) {
      if (knownKeys.has(r.testKey)) continue;
      const pdfMapping = PDF_LAB_MAPPINGS.find(m => m.key === r.testKey);
      if (pdfMapping) {
        base.push({
          key: pdfMapping.key,
          name: pdfMapping.arabicName,
          unit: pdfMapping.unit,
          normalMin: pdfMapping.normalMin,
          normalMax: pdfMapping.normalMax,
          genderSpecific: pdfMapping.genderSpecific,
        });
        knownKeys.add(pdfMapping.key);
      } else {
        // Fallback: create a test def from the result itself
        base.push({
          key: r.testKey,
          name: r.testName,
          unit: r.unit,
          normalMin: 0,
          normalMax: 999,
        });
        knownKeys.add(r.testKey);
      }
    }
    return base;
  }, [customLabTests, labResults]);

  const [selectedTest, setSelectedTest] = useState(LAB_TESTS[0]?.key || '');
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

  // Group by test (for byTest view)
  const groupedByTest = useMemo(() => {
    return allTests.map(test => {
      const results = labResults.filter(r => r.testKey === test.key).sort((a, b) => b.date.localeCompare(a.date));
      return { test, results };
    }).filter(g => g.results.length > 0);
  }, [allTests, labResults]);

  // Group by date (for byDate view)
  const groupedByDate = useMemo(() => {
    const dateMap = new Map<string, LabResult[]>();
    for (const r of labResults) {
      const existing = dateMap.get(r.date) || [];
      existing.push(r);
      dateMap.set(r.date, existing);
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, results]) => {
        const isPdf = results.some(r => r.notes?.includes('PDF'));
        return { date, results, source: isPdf ? 'PDF' : 'يدوي' };
      });
  }, [labResults]);

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

  const getStatusBadge = (status: string) => {
    if (status === 'normal') return { text: '🟢 طبيعي', cls: 'status-normal' };
    if (status === 'warning') return { text: '🟡 مراقبة', cls: 'status-warning' };
    return { text: '🔴 خارج النطاق', cls: 'status-danger' };
  };

  const getTestDef = (testKey: string): LabTestDef | undefined => allTests.find(t => t.key === testKey);

  const formatDate = (d: string) => {
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">🧪 تحاليلي</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPdfImport(true)} className="h-10 px-3 rounded-xl bg-secondary flex items-center gap-1.5 touch-target text-sm font-semibold">
            <FileUp size={16} className="text-primary" />
            <span>استيراد PDF</span>
          </button>
          <button onClick={() => { setEditingResult(null); setShowForm(true); }} className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center touch-target">
            <Plus className="text-primary-foreground" size={20} />
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      {labResults.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setViewMode('byDate')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${viewMode === 'byDate' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
            <Calendar size={14} /> حسب التاريخ
          </button>
          <button onClick={() => setViewMode('byTest')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${viewMode === 'byTest' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
            🧪 حسب التحليل
          </button>
        </div>
      )}

      <PdfImportModal open={showPdfImport} onClose={() => setShowPdfImport(false)} />

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

      {/* Empty State */}
      {labResults.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">🧪</p>
          <p className="text-muted-foreground text-lg">لم تضف أي تحاليل بعد</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-primary font-semibold">أضف أول تحليل</button>
        </div>
      ) : viewMode === 'byDate' ? (
        /* ═══ BY DATE VIEW ═══ */
        <div className="space-y-4">
          {groupedByDate.map(({ date, results, source }) => {
            const isExpanded = expandedDate === date;
            return (
              <div key={date} className="medical-card-elevated">
                <button onClick={() => setExpandedDate(isExpanded ? null : date)} className="w-full text-right">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatDate(date)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${source === 'PDF' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                        {source}
                      </span>
                      <span className="text-xs text-muted-foreground">({results.length} تحليل)</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>
                </button>

                {/* Always show summary */}
                <div className={`mt-3 space-y-2 ${!isExpanded ? '' : 'mb-2'}`}>
                  {results.map(r => {
                    const badge = getStatusBadge(r.status);
                    const testDef = getTestDef(r.testKey);
                    return (
                      <div key={r.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${badge.cls}`}>
                            {r.status === 'normal' ? '🟢' : r.status === 'warning' ? '🟡' : '🔴'}
                          </span>
                          <span className="text-sm font-semibold truncate">{r.testName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${r.status === 'normal' ? 'text-success' : r.status === 'warning' ? 'text-warning' : 'text-destructive'}`}>
                            {r.value}
                          </span>
                          <span className="text-xs text-muted-foreground">{r.unit}</span>
                          {isExpanded && (
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors">
                                <Pencil size={12} className="text-primary" />
                              </button>
                              <button onClick={() => removeLabResult(r.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                                <Trash2 size={12} className="text-destructive" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Expanded: show normal ranges */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">النطاقات الطبيعية:</p>
                    <div className="grid grid-cols-2 gap-1">
                      {results.map(r => {
                        const testDef = getTestDef(r.testKey);
                        if (!testDef) return null;
                        return (
                          <div key={r.id} className="text-xs text-muted-foreground">
                            {r.testName}: {testDef.normalMin}-{testDef.normalMax}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ═══ BY TEST VIEW ═══ */
        <div className="space-y-3">
          {groupedByTest.map(({ test, results }) => {
            const latest = results[0];
            const trend = getTrend(results, test);
            const change = results.length >= 2 ? ((results[0].value - results[1].value) / results[1].value * 100).toFixed(1) : null;
            const isExpanded = expandedTest === test.key;
            const isPdf = latest.notes?.includes('PDF');

            return (
              <div key={test.key} className="medical-card-elevated">
                <button onClick={() => setExpandedTest(isExpanded ? null : test.key)} className="w-full text-right">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{test.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isPdf ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                          {isPdf ? 'PDF' : 'يدوي'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">النطاق: {test.normalMin}-{test.normalMax} {test.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusBadge(latest.status).cls}`}>
                        {getStatusBadge(latest.status).text}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold">{latest.value}</p>
                      <p className="text-xs text-muted-foreground">{test.unit} • {formatDate(latest.date)}</p>
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
                    <h4 className="text-sm font-bold text-muted-foreground mb-2">السجل كامل ({results.length} نتائج)</h4>
                    {results.map(r => (
                      <div key={r.id} className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${
                              r.status === 'normal' ? 'text-success' : r.status === 'warning' ? 'text-warning' : 'text-destructive'
                            }`}>{r.value} {test.unit}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(r.date)}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.notes?.includes('PDF') ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                              {r.notes?.includes('PDF') ? 'PDF' : 'يدوي'}
                            </span>
                          </div>
                          {r.notes && !r.notes.includes('PDF') && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
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