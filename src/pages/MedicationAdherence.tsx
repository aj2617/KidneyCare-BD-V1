import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Pill, CheckCircle2, Circle, Loader2, Calendar, TrendingUp, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, parseISO } from 'date-fns';

interface Medicine {
  name: string;
  dose?: string;
  frequency?: string;
}

interface Prescription {
  id: number;
  doctor_name: string;
  date: string;
  medicines: Medicine[];
  notes: string;
  taken_today: Record<string, boolean>;
}

interface AdherenceDay {
  date: string;
  taken_count: number;
  total_count: number;
}

function getRateColor(rate: number | null): string {
  if (rate === null) return '#e2e8f0';
  if (rate >= 90) return '#2ECC71';
  if (rate >= 70) return '#2ECC71';
  if (rate >= 50) return '#F39C12';
  return '#E74C3C';
}

function getRateLabel(rate: number | null, bn: boolean): string {
  if (rate === null) return bn ? 'তথ্য নেই' : 'No data';
  if (rate >= 90) return bn ? 'চমৎকার' : 'Excellent';
  if (rate >= 70) return bn ? 'ভালো' : 'Good';
  if (rate >= 50) return bn ? 'মাঝারি' : 'Fair';
  return bn ? 'কম' : 'Poor';
}

export default function MedicationAdherence() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [today, setToday] = useState('');
  const [history, setHistory] = useState<AdherenceDay[]>([]);
  const [rate30d, setRate30d] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState<string>('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchToday = useCallback(async () => {
    const res = await fetch('/api/patient/adherence/today', { headers });
    if (res.ok) {
      const data = await res.json();
      setPrescriptions(data.prescriptions);
      setToday(data.date);
    }
  }, [token]);

  const fetchHistory = useCallback(async () => {
    const res = await fetch('/api/patient/adherence/history', { headers });
    if (res.ok) {
      const data = await res.json();
      setHistory(data.history);
      setRate30d(data.rate_30d);
    }
  }, [token]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchToday(), fetchHistory()]).finally(() => setIsLoading(false));
  }, [fetchToday, fetchHistory]);

  const toggleMedicine = async (prescriptionId: number, medicineName: string, currentTaken: boolean) => {
    const key = `${prescriptionId}-${medicineName}`;
    setToggling(key);

    // Optimistic update
    setPrescriptions(prev => prev.map(rx =>
      rx.id === prescriptionId
        ? { ...rx, taken_today: { ...rx.taken_today, [medicineName]: !currentTaken } }
        : rx
    ));

    try {
      await fetch('/api/patient/adherence', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prescription_id: prescriptionId,
          medicine_name: medicineName,
          date: today,
          taken: !currentTaken,
        }),
      });
      await fetchHistory();
    } catch {
      // revert on error
      setPrescriptions(prev => prev.map(rx =>
        rx.id === prescriptionId
          ? { ...rx, taken_today: { ...rx.taken_today, [medicineName]: currentTaken } }
          : rx
      ));
    } finally {
      setToggling('');
    }
  };

  // Build 84-day grid (12 weeks), newest day last
  const buildGrid = () => {
    const map: Record<string, AdherenceDay> = {};
    for (const row of history) map[row.date] = row;

    const cells: Array<{ date: string; rate: number | null }> = [];
    for (let i = 83; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const row = map[d];
      const rate = row
        ? row.total_count > 0 ? Math.round((row.taken_count / row.total_count) * 100) : null
        : null;
      cells.push({ date: d, rate });
    }
    return cells;
  };

  const grid = buildGrid();
  const weekRows = Array.from({ length: Math.ceil(grid.length / 7) }, (_, weekIndex) =>
    grid.slice(weekIndex * 7, weekIndex * 7 + 7)
  );

  // Week labels
  const weekLabels = [
    bn ? 'রব' : 'Su',
    bn ? 'সোম' : 'Mo',
    bn ? 'মঙ্গ' : 'Tu',
    bn ? 'বুধ' : 'We',
    bn ? 'বৃহ' : 'Th',
    bn ? 'শুক্র' : 'Fr',
    bn ? 'শনি' : 'Sa',
  ];

  // Calculate today's progress
  const todayMeds = prescriptions.flatMap(rx =>
    rx.medicines.map(m => ({ ...m, taken: rx.taken_today[m.name] === true, rxId: rx.id }))
  );
  const takenCount = todayMeds.filter(m => m.taken).length;
  const totalCount = todayMeds.length;
  const todayPct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A6B8A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Pill className="w-7 h-7 text-[#1A6B8A]" />
          {bn ? 'ওষুধ অ্যাডহেরেন্স ট্র্যাকার' : 'Medication Adherence Tracker'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {bn
            ? 'প্রতিদিনের ওষুধ চেক করুন এবং আপনার অ্যাডহেরেন্স ইতিহাস দেখুন'
            : 'Check off your daily medications and view your adherence history'}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's progress */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-500">
              {bn ? 'আজকের অগ্রগতি' : "Today's Progress"}
            </span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900">{takenCount}</span>
            <span className="text-slate-400 text-lg mb-0.5">/ {totalCount}</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#1A6B8A]"
              initial={{ width: 0 }}
              animate={{ width: `${todayPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">{todayPct}% {bn ? 'সম্পন্ন' : 'complete'}</p>
        </div>

        {/* 30-day rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-500">
              {bn ? '৩০ দিনের হার' : '30-Day Rate'}
            </span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900">
              {rate30d !== null ? `${rate30d}%` : '—'}
            </span>
          </div>
          <p className={`text-sm font-semibold mt-2 ${
            rate30d === null ? 'text-slate-400'
            : rate30d >= 90 ? 'text-[#2ECC71]'
            : rate30d >= 70 ? 'text-[#2ECC71]'
            : rate30d >= 50 ? 'text-[#F39C12]'
            : 'text-red-500'
          }`}>
            {getRateLabel(rate30d, bn)}
          </p>
        </div>

        {/* Streak / encouragement */}
        <div className="bg-[#1A6B8A]/5 rounded-2xl border border-[#1A6B8A]/15 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#1A6B8A]">
              {bn ? 'অনুপ্রেরণা' : 'Tip'}
            </span>
            <Award className="w-4 h-4 text-[#1A6B8A]" />
          </div>
          <p className="text-sm text-[#1A6B8A] font-medium leading-relaxed">
            {rate30d !== null && rate30d >= 90
              ? (bn ? 'অসাধারণ! আপনি খুব ভালো ওষুধ মেনে চলছেন।' : 'Outstanding! You have excellent medication compliance.')
              : rate30d !== null && rate30d >= 70
              ? (bn ? 'ভালো চলছে! ধারাবাহিকতা বজায় রাখুন।' : 'Good going! Keep up the consistency.')
              : (bn ? 'প্রতিদিন ওষুধ খেলে কিডনি সুস্থ থাকে।' : 'Taking medicines daily keeps your kidneys healthier.')}
          </p>
        </div>
      </div>

      {/* Today's Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#1A6B8A]" />
          <h2 className="font-bold text-slate-900">
            {bn ? 'আজকের ওষুধ তালিকা' : "Today's Medication Checklist"}
          </h2>
          <span className="ml-auto text-xs text-slate-400">
            {today ? format(parseISO(today), 'dd MMM yyyy') : ''}
          </span>
        </div>

        {prescriptions.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400">
            <Pill className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {bn ? 'কোনো সক্রিয় প্রেসক্রিপশন নেই।' : 'No active prescriptions found.'}
            </p>
            <p className="text-sm mt-1">
              {bn ? 'ডাক্তার প্রেসক্রিপশন দিলে এখানে দেখা যাবে।' : 'Prescriptions from your doctor will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {prescriptions.map(rx => (
              <div key={rx.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      {bn ? 'ডাক্তার' : 'Prescribed by'} {rx.doctor_name}
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {format(new Date(rx.date), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {rx.medicines.map((med: Medicine) => {
                    const isTaken = rx.taken_today[med.name] === true;
                    const key = `${rx.id}-${med.name}`;
                    const isToggling = toggling === key;
                    return (
                      <motion.button
                        key={med.name}
                        onClick={() => toggleMedicine(rx.id, med.name, isTaken)}
                        disabled={isToggling}
                        whileTap={{ scale: 0.97 }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                          isTaken
                            ? 'bg-[#EAFAF1] border-[#2ECC71]'
                            : 'bg-slate-50 border-slate-200 hover:border-[#1A6B8A]/30 hover:bg-[#1A6B8A]/5'
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {isToggling ? (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              <Loader2 className="w-5 h-5 animate-spin text-slate-400 flex-shrink-0" />
                            </motion.div>
                          ) : isTaken ? (
                            <motion.div key="checked" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                              <CheckCircle2 className="w-5 h-5 text-[#2ECC71] flex-shrink-0" />
                            </motion.div>
                          ) : (
                            <motion.div key="unchecked" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                              <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${isTaken ? 'line-through text-[#1a7a44] decoration-[#2ECC71]' : 'text-slate-800'}`}>
                            {med.name}
                          </p>
                          {(med.dose || med.frequency) && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {[med.dose, med.frequency].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        {isTaken && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: '#1a7a44', background: '#EAFAF1' }}>
                            {bn ? 'নেওয়া হয়েছে' : 'Taken'}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                {rx.notes && (
                  <p className="text-xs text-slate-400 mt-3 bg-slate-50 rounded-lg px-3 py-2">
                    {bn ? 'নোট:' : 'Notes:'} {rx.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 12-Week Heatmap */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#1A6B8A]" />
          <h2 className="font-bold text-sm sm:text-base text-slate-900">
            {bn ? '১২ সপ্তাহের অ্যাডহেরেন্স হিটম্যাপ' : '12-Week Adherence Heatmap'}
          </h2>
        </div>

        {/* Vertical week rows */}
        <div className="flex flex-col items-start gap-1.5">
          {weekRows.map((week, weekIndex) => (
            <div key={weekIndex} className="flex items-center gap-2">
              <div className="w-8 shrink-0 text-[10px] font-semibold text-slate-400">
                {bn ? `সপ্তা ${weekIndex + 1}` : `W${weekIndex + 1}`}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {week.map((cell) => {
                  const hex = getRateColor(cell.rate);
                  return (
                    <div
                      key={cell.date}
                      title={`${cell.date}: ${cell.rate !== null ? cell.rate + '%' : (bn ? 'তথ্য নেই' : 'No data')}`}
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] cursor-default transition-opacity hover:opacity-80"
                      style={{ background: hex.startsWith('#') ? hex : undefined }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4 flex-wrap">
          <span className="text-[10px] sm:text-xs text-slate-400">{bn ? 'কম' : 'Less'}</span>
          {[null, 40, 60, 80, 95].map((val, i) => {
            const hex = getRateColor(val);
            return <div key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] sm:rounded-[3px]" style={{ background: hex.startsWith('#') ? hex : '#e2e8f0' }} />;
          })}
          <span className="text-[10px] sm:text-xs text-slate-400">{bn ? 'বেশি' : 'More'}</span>
          <span className="text-[10px] sm:text-xs text-slate-300 ml-1 sm:ml-2">
            {bn ? '(প্রতিটি ঘর = ১ দিন)' : '(each cell = 1 day)'}
          </span>
        </div>
      </div>
    </div>
  );
}
