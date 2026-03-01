import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Copy, Check, Settings, Brain } from 'lucide-react';
import { useStore, generateId, type LabResult } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
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

const AssistantPage = () => {
  const { profile, labResults, medications, addLabResult, addJournalEntry } = useStore();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(() => localStorage.getItem('sahti_ai_disclaimer') !== 'true');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ date: string; results: AiLabResult[] } | null>(null);
  const [quickForm, setQuickForm] = useState<QuickFormType>(null);
  const [mealFormData, setMealFormData] = useState({ meals: 3, fasting: false, dislikes: '' });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiKey = localStorage.getItem('sahti_openai_key') || '';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
    const key = localStorage.getItem('sahti_openai_key');
    if (!key) return null;

    const msgs: any[] = [
      { role: 'system', content: pdfBase64 ? 'You are a medical lab report extraction assistant.' : getSystemPrompt() },
    ];

    if (pdfBase64) {
      msgs.push({
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: `data:application/pdf;base64,${pdfBase64}` } }
        ]
      });
    } else {
      msgs.push({ role: 'user', content: userText });
    }

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1500,
          temperature: 0.7,
          messages: msgs,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error('OpenAI API Error:', res.status, errorData);
        if (res.status === 429) throw new Error('RATE_LIMIT');
        throw new Error(errorData?.error?.message || `API Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Full OpenAI error:', error);
      throw error;
    }
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
      console.error('sendMessage error:', err);
      let errorMsg: string;
      if (err.message === 'RATE_LIMIT') {
        errorMsg = lang === 'ar' ? 'تجاوزت الحد مؤقتاً، انتظر دقيقة ⏳' : 'Rate limit reached, wait a minute ⏳';
      } else {
        errorMsg = `❌ خطأ: ${err.message}`;
      }
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', text: errorMsg, timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const acceptDisclaimer = () => {
    setShowDisclaimer(false);
    localStorage.setItem('sahti_ai_disclaimer', 'true');
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
    if (!apiKey) {
      toast.error(lang === 'ar' ? 'أضف مفتاح OpenAI في الإعدادات أولاً 🔑' : 'Add OpenAI key in Settings first 🔑');
      return;
    }
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

  // Disclaimer overlay
  if (showDisclaimer) {
    return (
      <div className="px-4 pt-6 pb-4 animate-fade-in flex items-center justify-center min-h-[70vh]">
        <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-xl border border-border">
          <div className="text-center">
            <p className="text-4xl mb-3">⚕️</p>
            <h3 className="text-lg font-bold mb-3">{lang === 'ar' ? 'تنبيه مهم' : 'Important Notice'}</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed whitespace-pre-line">
              {lang === 'ar'
                ? 'هذا المساعد للأغراض التثقيفية فقط.\nلا يُغني عن استشارة طبيبك المختص.'
                : 'This assistant is for educational purposes only.\nIt does not replace professional medical advice.'}
            </p>
            <button onClick={acceptDisclaimer} className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-2xl text-lg">
              {lang === 'ar' ? 'فهمت، لنبدأ ✓' : "I understand, let's go ✓"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const quickActions = [
    { key: 'pdf', emoji: '📄', label: lang === 'ar' ? 'استيراد PDF' : 'Import PDF', subtitle: lang === 'ar' ? 'بالذكاء' : 'with AI', bg: 'bg-blue-500/10 dark:bg-blue-500/20', border: 'border-blue-500/20' },
    { key: 'analyze', emoji: '📊', label: lang === 'ar' ? 'حلل تحاليلي' : 'Analyze Labs', subtitle: lang === 'ar' ? 'الأخيرة' : 'latest', bg: 'bg-green-500/10 dark:bg-green-500/20', border: 'border-green-500/20' },
    { key: 'questions', emoji: '❓', label: lang === 'ar' ? 'أسئلة' : 'Doctor', subtitle: lang === 'ar' ? 'للطبيب' : 'Questions', bg: 'bg-orange-500/10 dark:bg-orange-500/20', border: 'border-orange-500/20' },
    { key: 'meal', emoji: '🍽️', label: lang === 'ar' ? 'جدول' : 'Meal', subtitle: lang === 'ar' ? 'غذائي' : 'Plan', bg: 'bg-purple-500/10 dark:bg-purple-500/20', border: 'border-purple-500/20' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex-shrink-0">
        <h1 className="text-2xl font-bold">{lang === 'ar' ? 'مساعد صحتي 🧠' : 'Health Assistant 🧠'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === 'ar' ? 'كيف يمكنني مساعدتك اليوم؟' : 'How can I help you today?'}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-destructive'}`} />
          <span className="text-xs text-muted-foreground">
            {apiKey ? (lang === 'ar' ? 'جاهز' : 'Ready') : (lang === 'ar' ? 'يحتاج إعداد' : 'Needs setup')}
          </span>
        </div>
      </div>

      {/* No API Key Banner */}
      {!apiKey && (
        <div className="mx-4 mb-3 p-4 rounded-2xl bg-warning/10 border border-warning/30 flex-shrink-0">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔑</span>
            <div className="flex-1">
              <p className="font-bold text-sm">{lang === 'ar' ? 'فعّل المساعد الذكي' : 'Activate AI Assistant'}</p>
              <p className="text-xs text-muted-foreground mt-1">{lang === 'ar' ? 'أضف مفتاح API في الإعدادات' : 'Add API key in Settings'}</p>
              <button onClick={() => navigate('/settings')} className="mt-2 text-xs font-bold text-primary hover:underline">
                {lang === 'ar' ? 'الذهاب للإعدادات →' : 'Go to Settings →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="px-4 mb-3 flex-shrink-0">
        <div className="grid grid-cols-2 gap-2.5">
          {quickActions.map(action => (
            <button
              key={action.key}
              onClick={() => handleQuickAction(action.key)}
              className={`${action.bg} border ${action.border} rounded-2xl p-3.5 text-start transition-transform active:scale-95`}
            >
              <span className="text-2xl">{action.emoji}</span>
              <p className="font-bold text-sm mt-2">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.subtitle}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-4xl mb-3">🧠</p>
            <p className="font-semibold">{lang === 'ar' ? 'مرحباً! أنا سالم، مساعدك الصحي' : "Hello! I'm Salem, your health assistant"}</p>
            <p className="text-sm mt-1">{lang === 'ar' ? 'اختر من الأزرار أعلاه أو اكتب سؤالك' : 'Choose from buttons above or type your question'}</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
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
                    <span className={`font-bold ${r.status === 'normal' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
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
                className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
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

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder={lang === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...'}
            className="flex-1 bg-secondary rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-ring text-sm"
            disabled={loading || !apiKey}
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading || !apiKey}
            className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center disabled:opacity-40">
            <Send size={18} className="text-primary-foreground" />
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".pdf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfImport(f); e.target.value = ''; }} />
    </div>
  );
};

export default AssistantPage;
