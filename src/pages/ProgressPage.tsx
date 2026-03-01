import { useStore } from '@/lib/store';
import { LAB_TESTS } from '@/lib/constants';
import { PDF_LAB_MAPPINGS } from '@/lib/pdfLabMapping';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { useState, useMemo } from 'react';

interface TestDef {
  key: string;
  name: string;
  unit: string;
  normalMin: number;
  normalMax: number;
}

const ProgressPage = () => {
  const { labResults, medications, medicationLogs } = useStore();

  // Build all known test definitions from LAB_TESTS + PDF_LAB_MAPPINGS + results
  const allTestDefs = useMemo(() => {
    const defs: TestDef[] = LAB_TESTS.map(t => ({ key: t.key, name: t.name, unit: t.unit, normalMin: t.normalMin, normalMax: t.normalMax }));
    const knownKeys = new Set(defs.map(d => d.key));

    for (const m of PDF_LAB_MAPPINGS) {
      if (!knownKeys.has(m.key)) {
        defs.push({ key: m.key, name: m.arabicName, unit: m.unit, normalMin: m.normalMin, normalMax: m.normalMax });
        knownKeys.add(m.key);
      }
    }

    // Any remaining unknown keys from results
    for (const r of labResults) {
      if (!knownKeys.has(r.testKey)) {
        defs.push({ key: r.testKey, name: r.testName, unit: r.unit, normalMin: 0, normalMax: 999 });
        knownKeys.add(r.testKey);
      }
    }
    return defs;
  }, [labResults]);

  const testsWithData = useMemo(() =>
    allTestDefs.filter(t => labResults.some(r => r.testKey === t.key)),
    [allTestDefs, labResults]
  );

  const [selectedTest, setSelectedTest] = useState(testsWithData[0]?.key || LAB_TESTS[0].key);
  const currentTest = allTestDefs.find(t => t.key === selectedTest);

  const chartData = labResults
    .filter(r => r.testKey === selectedTest)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => ({ date: r.date.slice(5), value: r.value, fullDate: r.date }));

  // Health score: % of latest results in normal range
  const latestPerTest = allTestDefs.map(test => {
    const results = labResults.filter(r => r.testKey === test.key).sort((a, b) => b.date.localeCompare(a.date));
    return results[0];
  }).filter(Boolean);
  const normalCount = latestPerTest.filter(r => r && r.status === 'normal').length;
  const healthScore = latestPerTest.length > 0 ? Math.round((normalCount / latestPerTest.length) * 100) : 0;

  // Med adherence
  const totalLogs = medicationLogs.length;
  const takenLogs = medicationLogs.filter(l => l.status === 'taken').length;

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">📈 تقدمي</h1>

      {/* Health Score */}
      <div className="medical-card-elevated mb-4 text-center">
        <p className="text-sm text-muted-foreground mb-2">مؤشر الصحة العام</p>
        <div className="relative w-24 h-24 mx-auto mb-2">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke={healthScore >= 70 ? 'hsl(var(--success))' : healthScore >= 40 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
              strokeWidth="3" strokeDasharray={`${healthScore}, 100`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{healthScore}%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {normalCount} من {latestPerTest.length} تحاليل في النطاق الطبيعي
        </p>
      </div>

      {/* Med Adherence */}
      {totalLogs > 0 && (
        <div className="medical-card mb-4">
          <p className="text-sm text-muted-foreground mb-1">التزام الأدوية</p>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold text-primary">{totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 0}%</p>
            <div className="flex-1">
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="h-2 rounded-full gradient-primary" style={{ width: `${totalLogs > 0 ? (takenLogs / totalLogs) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Selector */}
      {testsWithData.length > 0 && (
        <>
          <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
            {testsWithData.map(t => (
              <button key={t.key} onClick={() => setSelectedTest(t.key)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  selectedTest === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}>
                {t.name}
              </button>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 0 && currentTest && (
            <div className="medical-card-elevated">
              <h3 className="font-bold mb-3">{currentTest.name}</h3>
              <div style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={(l) => `التاريخ: ${l}`} formatter={(v: number) => [`${v} ${currentTest.unit}`, currentTest.name]} />
                    <ReferenceLine y={currentTest.normalMax} stroke="hsl(var(--success))" strokeDasharray="5 5" />
                    {currentTest.normalMin > 0 && (
                      <ReferenceLine y={currentTest.normalMin} stroke="hsl(var(--warning))" strokeDasharray="5 5" />
                    )}
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} name="قيمة التحليل" />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="top"
                      iconType="plainline"
                      wrapperStyle={{
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        padding: '8px',
                        backgroundColor: 'hsla(var(--card), 0.95)',
                        fontSize: '12px',
                        lineHeight: '1.8',
                      }}
                      payload={[
                        { value: 'قيمة التحليل', type: 'line' as const, color: 'hsl(var(--primary))' },
                        { value: 'الحد الأعلى الطبيعي', type: 'line' as const, color: 'hsl(var(--success))' },
                        ...(currentTest.normalMin > 0 ? [{ value: 'الحد الأدنى الطبيعي', type: 'line' as const, color: 'hsl(var(--warning))' }] : []),
                      ] as any}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {testsWithData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">أضف تحاليل لعرض التقدم</p>
        </div>
      )}
    </div>
  );
};

export default ProgressPage;