import { useState, useMemo } from 'react';
import { useStore, generateId, getTodayStr, type JournalEntry } from '@/lib/store';
import { MOODS } from '@/lib/constants';
import { Search } from 'lucide-react';

const JournalPage = () => {
  const { journalEntries, addJournalEntry, updateJournalEntry } = useStore();
  const today = getTodayStr();
  const [searchQuery, setSearchQuery] = useState('');

  const todayEntry = journalEntries.find(e => e.date === today);
  const [notes, setNotes] = useState(todayEntry?.notes || '');
  const [mood, setMood] = useState(todayEntry?.mood || 0);

  const handleSave = () => {
    if (todayEntry) {
      updateJournalEntry({ ...todayEntry, notes, mood });
    } else {
      addJournalEntry({ id: generateId(), date: today, notes, mood });
    }
  };

  const filteredEntries = useMemo(() => {
    const sorted = [...journalEntries].sort((a, b) => b.date.localeCompare(a.date));
    if (!searchQuery) return sorted;
    return sorted.filter(e => e.notes.includes(searchQuery));
  }, [journalEntries, searchQuery]);

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">📔 يومياتي</h1>

      {/* Today's Entry */}
      <div className="medical-card-elevated mb-6">
        <h3 className="font-bold mb-3">كيف حالك اليوم؟</h3>
        <div className="flex justify-around mb-4">
          {MOODS.map(m => (
            <button key={m.value} onClick={() => setMood(m.value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                mood === m.value ? 'bg-primary/10 scale-110' : 'opacity-60'
              }`}>
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-xs font-medium">{m.label}</span>
            </button>
          ))}
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full bg-secondary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none h-28"
          placeholder="اكتب ملاحظاتك عن يومك..." />
        <button onClick={handleSave} disabled={!mood && !notes}
          className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-xl mt-3 touch-target disabled:opacity-40">
          حفظ
        </button>
      </div>

      {/* Search */}
      {journalEntries.length > 0 && (
        <div className="relative mb-4">
          <Search size={18} className="absolute right-3 top-3.5 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-secondary rounded-xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-primary"
            placeholder="ابحث في يومياتك..." />
        </div>
      )}

      {/* Past Entries */}
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
