import { useState, useMemo, useEffect } from 'react';
import { useStore, generateId, getTodayStr, type JournalEntry } from '@/lib/store';
import { MOODS } from '@/lib/constants';
import { useLanguage } from '@/lib/i18n';
import { Search, Check } from 'lucide-react';
import { toast } from 'sonner';

const JournalPage = () => {
  const { journalEntries, addJournalEntry, updateJournalEntry } = useStore();
  const { t } = useLanguage();
  const today = getTodayStr();
  const [searchQuery, setSearchQuery] = useState('');

  const todayEntry = journalEntries.find(e => e.date === today);
  const [notes, setNotes] = useState(todayEntry?.notes || '');
  const [mood, setMood] = useState(todayEntry?.mood || 0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (todayEntry) {
      setNotes(todayEntry.notes);
      setMood(todayEntry.mood);
    }
  }, [todayEntry?.id]);

  const handleSave = () => {
    if (!mood && !notes.trim()) return;
    if (todayEntry) {
      updateJournalEntry({ ...todayEntry, notes: notes.trim(), mood });
    } else {
      addJournalEntry({ id: generateId(), date: today, notes: notes.trim(), mood });
    }
    setSaved(true);
    toast.success(t('jour.savedSuccess'));
    setTimeout(() => setSaved(false), 2000);
  };

  const filteredEntries = useMemo(() => {
    const sorted = [...journalEntries].sort((a, b) => b.date.localeCompare(a.date));
    if (!searchQuery) return sorted;
    return sorted.filter(e => e.notes.includes(searchQuery));
  }, [journalEntries, searchQuery]);

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">{t('jour.title')}</h1>

      <div className="medical-card-elevated mb-6">
        <h3 className="font-bold mb-3">{t('jour.howAreYou')}</h3>
        <div className="flex justify-around mb-4">
          {MOODS.map(m => (
            <button key={m.value} onClick={() => setMood(m.value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                mood === m.value ? 'bg-primary/10 scale-110' : 'opacity-60'
              }`}>
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-xs font-medium">{t('mood.' + m.value)}</span>
            </button>
          ))}
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none h-28"
          placeholder={t('jour.writePlaceholder')} />
        <button onClick={handleSave} disabled={!mood && !notes.trim()}
          className={`w-full font-bold py-3 rounded-xl mt-3 touch-target disabled:opacity-40 flex items-center justify-center gap-2 transition-all ${
            saved ? 'bg-success text-white' : 'gradient-primary text-primary-foreground'
          }`}>
          {saved ? <><Check size={20} /> {t('jour.saved')}</> : t('save')}
        </button>
      </div>

      {journalEntries.length > 0 && (
        <div className="relative mb-4">
          <Search size={18} className="absolute start-3 top-3.5 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-secondary rounded-xl px-4 py-3 ps-10 outline-none focus:ring-2 focus:ring-primary"
            placeholder={t('jour.searchPlaceholder')} />
        </div>
      )}

      <div className="space-y-3">
        {filteredEntries.filter(e => e.date !== today).map(entry => {
          const moodInfo = MOODS.find(m => m.value === entry.mood);
          return (
            <div key={entry.id} className="medical-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{entry.date}</span>
                {moodInfo && <span className="text-xl">{moodInfo.emoji}</span>}
              </div>
              {entry.notes && <p className="text-sm leading-relaxed">{entry.notes}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JournalPage;
