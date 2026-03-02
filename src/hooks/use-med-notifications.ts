import { useEffect, useRef, useCallback } from 'react';
import { useStore, type Medication, getTodayStr } from '@/lib/store';

function isMedDueToday(med: Medication): boolean {
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayDay = dayNames[now.getDay()];
  switch (med.frequency) {
    case 'daily': return true;
    case 'specific_days': return (med.specificDays || []).includes(todayDay);
    case 'weekly': return med.weeklyDay === todayDay;
    case 'monthly': return now.getDate() === (med.monthlyDay || 1);
    case 'interval': return true;
    default: return true;
  }
}

function isInQuietHours(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (startMin <= endMin) {
    return nowMin >= startMin && nowMin < endMin;
  }
  // overnight quiet hours (e.g. 22:00 - 07:00)
  return nowMin >= startMin || nowMin < endMin;
}

const NOTIFIED_KEY = 'sahti_notified_doses';

function getNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveNotifiedSet(set: Set<string>) {
  // Keep only today's entries
  const today = getTodayStr();
  const filtered = new Set([...set].filter(k => k.startsWith(today)));
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...filtered]));
}

export function useMedNotifications() {
  const { medications, medicationLogs, settings } = useStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAndNotify = useCallback(() => {
    if (!settings.notificationsEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (isInQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) return;

    const today = getTodayStr();
    const now = new Date();
    const nowHHMM = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const notified = getNotifiedSet();

    for (const med of medications) {
      if (!isMedDueToday(med)) continue;

      if (med.frequency === 'interval' && med.intervalHours) {
        // For interval meds, check if next dose time has arrived
        const medLogs = medicationLogs
          .filter(l => l.medicationId === med.id && l.status === 'taken' && l.timestamp)
          .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        const lastDose = medLogs.length > 0 ? new Date(medLogs[0].timestamp!) :
          (med.firstDoseDateTime ? new Date(med.firstDoseDateTime) : null);
        if (!lastDose) continue;
        const intervalMs = med.intervalHours * (med.intervalUnit === 'days' ? 24 : 1) * 60 * 60 * 1000;
        const nextDose = new Date(lastDose.getTime() + intervalMs);
        if (now >= nextDose) {
          const key = `${today}_${med.id}_interval_${Math.floor(nextDose.getTime() / 60000)}`;
          const alreadyTaken = medicationLogs.some(l =>
            l.medicationId === med.id && l.date === today && l.status === 'taken' &&
            l.timestamp && new Date(l.timestamp) >= nextDose
          );
          if (!alreadyTaken && !notified.has(key)) {
            new Notification(`💊 ${med.name}`, {
              body: `حان وقت جرعتك: ${med.dose} ${med.form}`,
              icon: '/favicon.ico',
              tag: key,
            });
            notified.add(key);
          }
        }
      } else {
        // For daily/scheduled meds, check each scheduled time
        for (const time of med.times) {
          const [th, tm] = time.split(':').map(Number);
          const [nh, nm] = nowHHMM.split(':').map(Number);
          const timeDiffMin = (nh * 60 + nm) - (th * 60 + tm);
          // Notify if within 0-5 min window after scheduled time
          if (timeDiffMin >= 0 && timeDiffMin <= 5) {
            const key = `${today}_${med.id}_${time}`;
            const alreadyTaken = medicationLogs.some(l =>
              l.medicationId === med.id && l.date === today && l.time === time && l.status === 'taken'
            );
            if (!alreadyTaken && !notified.has(key)) {
              new Notification(`💊 ${med.name}`, {
                body: `حان وقت جرعتك: ${med.dose} ${med.form} - ${time}`,
                icon: '/favicon.ico',
                tag: key,
              });
              notified.add(key);
            }
          }
        }
      }
    }

    saveNotifiedSet(notified);
  }, [medications, medicationLogs, settings]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Check every 30 seconds
    intervalRef.current = setInterval(checkAndNotify, 30_000);
    // Also check immediately
    checkAndNotify();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkAndNotify]);
}
