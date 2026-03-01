import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Copy, Loader2, Check } from 'lucide-react';
import { useStore, generateId, type LabResult } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
}

interface AiLabResult {
  name_ar: string;
  name_en: string;
  value: number | null;
  unit: string;
  min: number;
  max: number;
  status: string;
}

interface AiPdfResponse {
  date: string;
  results: AiLabResult[];
}

type QuickFormType = 'mealPlan' | null;

const AiAssistant = () => {
  const { profile, labResults, medications, addLabResult, addJournalEntry } = useStore();
  const { t, lang, tLabName } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ date: string; results: AiLabResult[] } | null>(null);
  const [quickForm, setQuickForm] = useState<QuickFormType>(null);
  const [mealFormData, setMealFormData] = useState({ meals: 3, fasting: false, dislikes: '' });
  const [hasSeenDisclaimer, setHasSeenDisclaimer] = useState(() => localStorage.getItem('sahti_ai_disclaimer') === 'true');
  const [hasAnimated, setHasAnimated] = useState(() => localStorage.getItem('sahti_ai_animated') === 'true');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiKey = localStorage.getItem('sahti_openai_key') || '';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!hasAnimated) {
      const timer = setTimeout(() => {
        setHasAnimated(true);
        localStorage.setItem('sahti_ai_animated', 'true');
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [hasAnimated]);

  const getSystemPrompt = useCallback(() => {
    const name = profile?.name || 'المستخدم';
    const age = profile?.age || '?';
    const gender = profile?.gender || 'male';
    const height = profile?.height || '?';
    const weight = profile?.weight || '?';
    const bloodType = profile?.bloodType || '?';
    const bmi = profile?.bmi || '?';
    const conditions = profile?.conditions?.length ? profile.conditions.join('، ') : 'لا يوجد';
    const doctor = profile?.doctorName || 'غير محدد';
    const calories = profile?.dailyCalories || '?';

    const labSummary = labResults.slice(0, 15).map(l =>
      `- ${l.testName}: ${l.value} ${l.unit} (النطاق: ${l.testKey}) - ${l.status}`
    ).join('\n') || 'لا توجد تحاليل';

    const medSummary = medications.map(m =>
      `- ${m.name}: ${m.dose} - ${m.frequency}`
    ).join('\n') || 'لا توجد أدوية';

    return `أنت مساعد صحي ذكي اسمك "سالم" لمريض${gender === 'female' ? 'ة' : ''} اسم${gender === 'female' ? 'ها' : 'ه'} ${name}،
عمر${gender === 'female' ? 'ها' : 'ه'} ${age} سنة، ${gender === 'female' ? 'أنثى' : 'ذكر'}،
طول${gender === 'female' ? 'ها' : 'ه'} ${height} سم، وزن${gender === 'female' ? 'ها' : 'ه'} ${weight} كغ،
فصيلة دم${gender === 'female' ? 'ها' : 'ه'} ${bloodType}، BMI: ${bmi}.
أمراض${gender === 'female' ? 'ها' : 'ه'} المزمنة: ${conditions}.
طبيب${gender === 'female' ? 'ها' : 'ه'} المعالج: ${doctor}.
السعرات اليومية المطلوبة: ${calories}.

آخر نتائج تحاليل${gender === 'female' ? 'ها' : 'ه'}:
${labSummary}

أدوية${gender === 'female' ? 'ها' : 'ه'} الحالية:
${medSummary}

قواعدك:
1. تكلم بالعربية دائماً بلغة بسيطة ومشجعة
2. لا تعطِ تشخيصاً طبياً قاطعاً أبداً
3. دائماً شجع على مراجعة الطبيب للأمور المهمة
4. ردودك منظمة ومختصرة (لا تطول أكثر من اللازم)
5. استخدم الرموز التعبيرية لتجميل الردود
6. أنت تعرف بيانات المريض${gender === 'female' ? 'ة' : ''} الكاملة المذكورة أعلاه`;
  }, [profile, labResults, medications]);

  const callOpenAI = async (userText: string, pdfBase64?: string) => {
    if (!apiKey) return null;

    const messages: any[] = [
      { role: 'system', content: pdfBase64 ? 'You are a medical lab report extraction assistant.' : getSystemPrompt() },
    ];

    if (pdfBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: `data:application/pdf;base64,${pdfBase64}` } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: userText });
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        temperature: 0.7,
        messages,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error('RATE_LIMIT');
      throw new Error('API_ERROR');
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { id: generateId(), role: 'user', text: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await callOpenAI(text);
      if (response) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', text: response, timestamp: Date.now() }]);
      }
    } catch (err: any) {
      const errorMsg = err.message === 'RATE_LIMIT'
        ? (lang === 'ar' ? 'تجاوزت الحد مؤقتاً، انتظر دقيقة ⏳' : 'Rate limit reached, wait a minute ⏳')
        : (lang === 'ar' ? 'حدث خطأ، تحقق من المفتاح وحاول مجدداً ❌' : 'Error occurred, check your key and try again ❌');
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', text: errorMsg, timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (!apiKey) {
      toast.error(lang === 'ar' ? 'أضف مفتاح OpenAI في الإعدادات أولاً 🔑' : 'Add OpenAI key in Settings first 🔑');
      return;
    }
    if (!hasSeenDisclaimer) {
      setShowDisclaimer(true);
    } else {
      setIsOpen(true);
    }
  };

  const acceptDisclaimer = () => {
    setHasSeenDisclaimer(true);
    localStorage.setItem('sahti_ai_disclaimer', 'true');
    setShowDisclaimer(false);
    setIsOpen(true);
  };

  const handlePdfImport = async (file: File) => {
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

      const prompt = `استخرج جميع نتائج التحاليل من هذا التقرير المخبري.
أجب بـ JSON فقط بدون أي نص إضافي:
{
  "date": "YYYY-MM-DD",
  "results": [
    {
      "name_ar": "اسم التحليل بالعربية",
      "name_en": "Test Name",
      "value": 12.5,
      "unit": "g/dl",
      "min": 11.5,
      "max": 15.5,
      "status": "normal|high|low"
    }
  ]
}
تعليمات:
- تجاهل اسم المريض، العمر، رقم العينة
- إذا كانت القيمة ">2000" استخرج 2000 كرقم
- إذا كانت القيمة نصية ضع value: null
- أسماء عربية صحيحة للتحاليل المعروفة
- status: normal إذا ضمن النطاق، high إذا أعلى، low إذا أقل`;

      const response = await callOpenAI(prompt, base64);
      if (!response) throw new Error('No response');

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');

      const parsed: AiPdfResponse = JSON.parse(jsonMatch[0]);
      if (!parsed.results?.length) throw new Error('No results');

      setPdfPreview(parsed);

      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant',
        text: `✅ ${lang === 'ar' ? 'تم استخراج' : 'Extracted'} ${parsed.results.length} ${lang === 'ar' ? 'تحليل - تأكد قبل الحفظ' : 'results - confirm before saving'}`,
        timestamp: Date.now()
      }]);
    } catch (err) {
      console.error('AI PDF import error:', err);
      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant',
        text: lang === 'ar' ? 'لم أتمكن من قراءة التقرير، حاول مرة أخرى ❌' : 'Could not read the report, try again ❌',
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const savePdfResults = () => {
    if (!pdfPreview) return;
    let count = 0;
    for (const r of pdfPreview.results) {
      if (r.value === null) continue;
      const status = r.status === 'normal' ? 'normal' : r.status === 'high' ? 'danger' : 'warning';
      addLabResult({
        id: generateId(),
        testKey: r.name_en.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        testName: r.name_ar,
        value: r.value,
        unit: r.unit,
        date: pdfPreview.date || new Date().toISOString().split('T')[0],
        notes: 'مستورد من PDF بالذكاء الاصطناعي',
        status: status as 'normal' | 'warning' | 'danger',
      });
      count++;
    }
    toast.success(`🎉 ${lang === 'ar' ? `تم حفظ ${count} تحليل بنجاح!` : `${count} results saved!`}`);
    setPdfPreview(null);
  };

  const handleQuickAction = (action: string) => {
    const doctor = profile?.doctorName || (lang === 'ar' ? 'الطبيب' : 'the doctor');

    switch (action) {
      case 'pdf':
        fileRef.current?.click();
        break;
      case 'analyze':
        sendMessage('حللي تحاليلي الأخيرة وأخبريني بشكل مبسط:\n📋 ما الذي يحتاج انتباهاً؟\n📈 ماذا تحسن وماذا ساء مقارنة بالسابق؟\n💡 ماذا يعني كل رقم خارج النطاق الطبيعي؟');
        break;
      case 'questions':
        sendMessage(`بناءً على تحاليلي وأدويتي الحالية، جهزي لي قائمة أسئلة مهمة لزيارتي القادمة للطبيب ${doctor}. ركزي على النتائج غير الطبيعية وأي مخاوف.`);
        break;
      case 'meal':
        setQuickForm('mealPlan');
        break;
    }
  };

  const submitMealPlan = () => {
    const calories = profile?.dailyCalories || 2000;
    const text = `أنشئي لي جدول تغذية أسبوعي مناسب لحالتي الصحية.
${mealFormData.meals} وجبات يومياً.
${mealFormData.fasting ? 'أصوم حالياً (رمضان).' : ''}
${mealFormData.dislikes ? 'لا أحب: ' + mealFormData.dislikes : ''}
راعي السعرات اليومية المطلوبة ${calories} سعرة.
راعي أمراضي المزمنة وتحاليلي.`;
    setQuickForm(null);
    sendMessage(text);
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const saveToJournal = (text: string) => {
    addJournalEntry({ id: generateId(), date: new Date().toISOString().split('T')[0], mood: 3, notes: text });
    toast.success(lang === 'ar' ? 'تم الحفظ في يومياتي 📔' : 'Saved to journal 📔');
  };

  // Floating pill button
  const FloatingButton = () => (
    <button
      onClick={handleOpen}
      className="fixed z-40 flex items-center justify-center gap-2 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 animate-ai-fab-in"
      style={{
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 20px)',
        right: lang === 'ar' ? 'auto' : '16px',
        left: lang === 'ar' ? '16px' : 'auto',
        width: '130px',
        height: '56px',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
        animation: !hasAnimated ? 'ai-fab-in 0.5s ease-out, ai-fab-pulse 3s ease-in-out 1s infinite' : 'ai-fab-pulse 3s ease-in-out infinite',
      }}
    >
      <span className="text-xl">🧠</span>
      <span className="text-white font-bold text-sm">{lang === 'ar' ? 'مساعدي' : 'Assistant'}</span>
    </button>
  );

  // Disclaimer popup
  if (showDisclaimer) {
    return (
      <>
        <FloatingButton />
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-xl animate-fade-in">
            <div className="text-center">
              <p className="text-4xl mb-3">⚕️</p>
              <h3 className="text-lg font-bold mb-3">{lang === 'ar' ? 'تنبيه مهم' : 'Important Notice'}</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {lang === 'ar'
                  ? 'هذا المساعد للأغراض التثقيفية فقط.\nلا يُغني عن استشارة طبيبك المختص.'
                  : 'This assistant is for educational purposes only.\nIt does not replace professional medical advice.'}
              </p>
              <button onClick={acceptDisclaimer} className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-2xl text-lg">
                {lang === 'ar' ? 'فهمت، لنبدأ ✓' : 'I understand, let\'s go ✓'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!isOpen) return <FloatingButton />;

  return (
    <>
      <FloatingButton />
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <h2 className="text-lg font-bold">{lang === 'ar' ? 'مساعد صحتي 🧠' : 'Health Assistant 🧠'}</h2>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-secondary rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-4xl mb-3">🧠</p>
              <p className="font-semibold">{lang === 'ar' ? 'مرحباً! أنا سالم، مساعدك الصحي' : 'Hello! I\'m Salem, your health assistant'}</p>
              <p className="text-sm mt-1">{lang === 'ar' ? 'اختر من الأزرار أدناه أو اكتب سؤالك' : 'Choose from buttons below or type your question'}</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                    <button onClick={() => copyText(msg.id, msg.text)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === msg.id ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? '📋 نسخ' : '📋 Copy')}
                    </button>
                    <button onClick={() => saveToJournal(msg.text)} className="text-xs text-muted-foreground hover:text-foreground">
                      {lang === 'ar' ? '📄 حفظ في اليوميات' : '📄 Save to Journal'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* PDF Preview */}
          {pdfPreview && (
            <div className="bg-card rounded-2xl border border-primary/30 p-4 space-y-3">
              <h4 className="font-bold text-sm flex items-center gap-2">
                ✅ {lang === 'ar' ? `تم استخراج ${pdfPreview.results.length} تحليل` : `${pdfPreview.results.length} results extracted`}
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pdfPreview.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-xl p-2.5 text-sm">
                    <span className="font-semibold">{r.name_ar}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${r.status === 'normal' ? 'text-success' : 'text-destructive'}`}>
                        {r.value ?? 'N/A'}
                      </span>
                      <span className="text-xs text-muted-foreground">{r.unit}</span>
                      <span className="text-xs">{r.status === 'normal' ? '🟢' : r.status === 'high' ? '🔴' : '🟡'}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={savePdfResults} className="flex-1 gradient-primary text-primary-foreground font-bold py-3 rounded-2xl">
                  {lang === 'ar' ? '💾 حفظ في تحاليلي' : '💾 Save to My Labs'}
                </button>
                <button onClick={() => setPdfPreview(null)} className="px-4 bg-secondary font-bold py-3 rounded-2xl">
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Meal Plan Quick Form */}
          {quickForm === 'mealPlan' && (
            <div className="bg-card rounded-2xl border border-primary/30 p-4 space-y-3">
              <h4 className="font-bold text-sm">🍽️ {lang === 'ar' ? 'إعداد جدول غذائي' : 'Create Meal Plan'}</h4>
              <div>
                <p className="text-xs font-semibold mb-2">{lang === 'ar' ? 'كم وجبة يومياً؟' : 'Meals per day?'}</p>
                <div className="flex gap-2">
                  {[2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setMealFormData(p => ({ ...p, meals: n }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold ${mealFormData.meals === n ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={mealFormData.fasting} onChange={e => setMealFormData(p => ({ ...p, fasting: e.target.checked }))} className="rounded" />
                {lang === 'ar' ? 'أصوم رمضان ☪️' : 'Fasting (Ramadan) ☪️'}
              </label>
              <div>
                <p className="text-xs font-semibold mb-1">{lang === 'ar' ? 'أطعمة لا تحبها:' : 'Foods you dislike:'}</p>
                <input value={mealFormData.dislikes} onChange={e => setMealFormData(p => ({ ...p, dislikes: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder={lang === 'ar' ? 'مثال: سمك، باذنجان' : 'e.g. fish, eggplant'} />
              </div>
              <button onClick={submitMealPlan} className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-2xl">
                {lang === 'ar' ? '🍽️ إنشاء الجدول' : '🍽️ Create Plan'}
              </button>
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-2xl px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-4 pt-2 flex gap-2 overflow-x-auto flex-shrink-0">
          <button onClick={() => handleQuickAction('pdf')} className="flex-shrink-0 text-xs font-semibold bg-secondary rounded-full px-3 py-2 hover:bg-secondary/80">
            📄 {lang === 'ar' ? 'استيراد PDF' : 'Import PDF'}
          </button>
          <button onClick={() => handleQuickAction('analyze')} className="flex-shrink-0 text-xs font-semibold bg-secondary rounded-full px-3 py-2 hover:bg-secondary/80">
            📊 {lang === 'ar' ? 'حلل تحاليلي' : 'Analyze Labs'}
          </button>
          <button onClick={() => handleQuickAction('questions')} className="flex-shrink-0 text-xs font-semibold bg-secondary rounded-full px-3 py-2 hover:bg-secondary/80">
            ❓ {lang === 'ar' ? 'أسئلة للطبيب' : 'Doctor Questions'}
          </button>
          <button onClick={() => handleQuickAction('meal')} className="flex-shrink-0 text-xs font-semibold bg-secondary rounded-full px-3 py-2 hover:bg-secondary/80">
            🍽️ {lang === 'ar' ? 'جدول غذائي' : 'Meal Plan'}
          </button>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder={lang === 'ar' ? 'اكتب سؤالك...' : 'Type your question...'}
              className="flex-1 bg-secondary rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary text-sm"
              disabled={loading}
            />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center disabled:opacity-40">
              <Send size={18} className="text-primary-foreground" />
            </button>
          </div>
        </div>

        <input ref={fileRef} type="file" accept=".pdf" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfImport(f); e.target.value = ''; }} />
      </div>
    </>
  );
};

export default AiAssistant;
