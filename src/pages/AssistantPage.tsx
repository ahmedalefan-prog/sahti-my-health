import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Copy, Check, Trash2 } from 'lucide-react';
import { useStore, generateId, type LabResult } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

type QuickFormType = 'mealPlan' | null;

const CHAT_STORAGE_KEY = 'sahti_chat_history';
const MAX_STORED_MESSAGES = 50;

const loadChatHistory = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const saveChatHistory = (msgs: ChatMessage[]) => {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_STORED_MESSAGES)));
  } catch { /* storage full */ }
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`;

const AssistantPage = () => {
  const { profile, labResults, medications, addLabResult, addJournalEntry } = useStore();
  const { t, lang } = useLanguage();

  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(() => localStorage.getItem('sahti_ai_disclaimer') !== 'true');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [quickForm, setQuickForm] = useState<QuickFormType>(null);
  const [mealFormData, setMealFormData] = useState({ meals: 3, fasting: false, dislikes: '' });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persist messages to localStorage
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    toast.success(lang === 'ar' ? 'تم مسح المحادثة' : 'Chat cleared');
  };

  const getPatientContext = useCallback(() => {
    if (!profile) return null;
    const labSummary = labResults.slice(0, 15).map(l =>
      `- ${l.testName}: ${l.value} ${l.unit} (${l.testKey}) - ${l.status}`
    ).join('\n') || 'لا توجد تحاليل';

    const medSummary = medications.map(m =>
      `- ${m.name}: ${m.dose} - ${m.frequency}`
    ).join('\n') || 'لا توجد أدوية';

    return {
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      height: profile.height,
      weight: profile.weight,
      bloodType: profile.bloodType,
      bmi: profile.bmi,
      conditions: profile.conditions?.length ? profile.conditions.join('، ') : 'لا يوجد',
      customConditions: profile.customConditions?.length ? profile.customConditions.join('، ') : '',
      surgeries: profile.surgeries || '',
      doctorName: profile.doctorName,
      dailyCalories: profile.dailyCalories,
      labSummary,
      medSummary,
    };
  }, [profile, labResults, medications]);

  const streamChat = async (userText: string) => {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: userText }],
        patientContext: getPatientContext(),
      }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
      throw new Error(errData.error || `HTTP ${resp.status}`);
    }

    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantSoFar = '';
    const assistantId = generateId();

    // Add empty assistant message
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', text: '', timestamp: Date.now() }]);

    let streamDone = false;
    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') { streamDone = true; break; }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            setMessages(prev =>
              prev.map(m => m.id === assistantId ? { ...m, text: assistantSoFar } : m)
            );
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            setMessages(prev =>
              prev.map(m => m.id === assistantId ? { ...m, text: assistantSoFar } : m)
            );
          }
        } catch { /* ignore */ }
      }
    }

    return assistantSoFar;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { id: generateId(), role: 'user', text: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      await streamChat(text.trim());
    } catch (err: any) {
      console.error('sendMessage error:', err);
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', text: `❌ خطأ: ${err.message}`, timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const acceptDisclaimer = () => {
    setShowDisclaimer(false);
    localStorage.setItem('sahti_ai_disclaimer', 'true');
  };

  const handleQuickAction = (action: string) => {
    const doctor = profile?.doctorName || (lang === 'ar' ? 'الطبيب' : 'the doctor');

    switch (action) {
      case 'analyze':
        sendMessage('حللي تحاليلي الأخيرة وأخبريني بشكل مبسط:\n📋 ما الذي يحتاج انتباهاً؟\n📈 ماذا تحسن وماذا ساء مقارنة بالسابق؟\n💡 ماذا يعني كل رقم خارج النطاق الطبيعي؟');
        break;
      case 'questions':
        sendMessage(`بناءً على تحاليلي وأدويتي الحالية، جهزي لي قائمة أسئلة مهمة لزيارتي القادمة للطبيب ${doctor}. ركزي على النتائج غير الطبيعية وأي مخاوف.`);
        break;
      case 'meal':
        setQuickForm('mealPlan');
        break;
      case 'tips':
        sendMessage('أعطني نصائح صحية يومية مخصصة لحالتي الصحية وأدويتي وتحاليلي. ركز على التغذية والنشاط البدني ونمط الحياة.');
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
    { key: 'analyze', emoji: '📊', label: lang === 'ar' ? 'حلل تحاليلي' : 'Analyze Labs', subtitle: lang === 'ar' ? 'الأخيرة' : 'latest', bg: 'bg-green-500/10 dark:bg-green-500/20', border: 'border-green-500/20' },
    { key: 'questions', emoji: '❓', label: lang === 'ar' ? 'أسئلة' : 'Doctor', subtitle: lang === 'ar' ? 'للطبيب' : 'Questions', bg: 'bg-orange-500/10 dark:bg-orange-500/20', border: 'border-orange-500/20' },
    { key: 'meal', emoji: '🍽️', label: lang === 'ar' ? 'جدول' : 'Meal', subtitle: lang === 'ar' ? 'غذائي' : 'Plan', bg: 'bg-purple-500/10 dark:bg-purple-500/20', border: 'border-purple-500/20' },
    { key: 'tips', emoji: '💡', label: lang === 'ar' ? 'نصائح' : 'Health', subtitle: lang === 'ar' ? 'صحية' : 'Tips', bg: 'bg-blue-500/10 dark:bg-blue-500/20', border: 'border-blue-500/20' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{lang === 'ar' ? 'مساعد صحتي 🧠' : 'Health Assistant 🧠'}</h1>
          {messages.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={18} />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{lang === 'ar' ? 'هل تريد مسح المحادثة؟' : 'Clear chat history?'}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {lang === 'ar' ? 'سيتم حذف جميع الرسائل نهائياً.' : 'All messages will be permanently deleted.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                  <AlertDialogAction onClick={clearChat}>{lang === 'ar' ? 'مسح' : 'Clear'}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === 'ar' ? 'كيف يمكنني مساعدتك اليوم؟' : 'How can I help you today?'}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">
            {lang === 'ar' ? 'جاهز' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-3 flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickActions.map(action => (
            <button
              key={action.key}
              onClick={() => handleQuickAction(action.key)}
              className={`${action.bg} border ${action.border} rounded-xl px-3 py-2 flex items-center gap-2 whitespace-nowrap transition-transform active:scale-95`}
            >
              <span className="text-base">{action.emoji}</span>
              <span className="font-semibold text-xs">{action.label} {action.subtitle}</span>
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
              {msg.role === 'assistant' && msg.text && (
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
            disabled={loading}
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center disabled:opacity-40">
            <Send size={18} className="text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
