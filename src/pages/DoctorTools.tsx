import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Calculator, FileText, Video, BarChart2,
  ClipboardList, Activity, WifiOff, CheckCircle2,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── CKD Staging Quick Reference ────────────────────────────────────────────
const CKD_STAGES = [
  { stage: '1', gfr: '≥ 90', label: 'Normal', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: 'Kidney damage with normal or high GFR' },
  { stage: '2', gfr: '60–89', label: 'Mildly Reduced', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', desc: 'Kidney damage with mildly decreased GFR' },
  { stage: '3a', gfr: '45–59', label: 'Mild–Moderate', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', desc: 'Moderate CKD — monitor closely' },
  { stage: '3b', gfr: '30–44', label: 'Moderate–Severe', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', desc: 'Significant loss of kidney function' },
  { stage: '4', gfr: '15–29', label: 'Severely Reduced', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', desc: 'Severe CKD — prepare for RRT' },
  { stage: '5', gfr: '< 15', label: 'Kidney Failure', color: 'text-red-900', bg: 'bg-red-100', border: 'border-red-300', desc: 'Kidney failure — dialysis or transplant' },
];

function CKDStagingSheet({ bn, onClose }: { bn: boolean; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-white rounded-t-3xl w-full max-w-2xl max-h-[80vh] overflow-y-auto pb-safe"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-black text-slate-900">
              {bn ? 'সিকেডি স্টেজিং রেফারেন্স' : 'CKD Staging Reference'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">KDIGO 2012 Guidelines</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          <div className="grid grid-cols-3 gap-1 px-2 mb-3">
            <p className="text-[10px] font-black text-slate-400 uppercase">Stage</p>
            <p className="text-[10px] font-black text-slate-400 uppercase">eGFR (mL/min)</p>
            <p className="text-[10px] font-black text-slate-400 uppercase">Category</p>
          </div>
          {CKD_STAGES.map(s => (
            <div key={s.stage} className={`rounded-xl border p-3 ${s.bg} ${s.border}`}>
              <div className="grid grid-cols-3 gap-1 items-center">
                <div className={`text-lg font-black ${s.color}`}>G{s.stage}</div>
                <div className={`text-sm font-bold ${s.color}`}>{s.gfr}</div>
                <div className={`text-xs font-bold ${s.color}`}>{s.label}</div>
              </div>
              <p className="text-xs text-slate-500 mt-1 col-span-3">{s.desc}</p>
            </div>
          ))}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 mt-4">
            <p className="text-xs text-slate-500 font-medium">
              {bn
                ? 'দ্রষ্টব্য: অ্যালবুমিনুরিয়া ক্যাটেগরি (A1/A2/A3) প্রতিটি স্টেজের সাথে মূল্যায়ন করুন।'
                : 'Note: Albuminuria category (A1/A2/A3) should be assessed alongside each stage.'}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Tool Card ──────────────────────────────────────────────────────────────
interface Tool {
  id: string;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  Icon: React.ElementType;
  cardCls: string;
  iconCls: string;
  offline: boolean;
  navigate?: string;
  action?: string;
}

const TOOLS: Tool[] = [
  {
    id: 'gfr',
    titleEn: 'GFR Calculator',
    titleBn: 'জিএফআর ক্যালকুলেটর',
    subtitleEn: 'MDRD · CG · CKD-EPI',
    subtitleBn: 'MDRD · CG · CKD-EPI',
    Icon: Calculator,
    cardCls: 'bg-teal-50 border-teal-200 text-teal-900',
    iconCls: 'text-teal-600',
    offline: true,
    navigate: 'gfr',
  },
  {
    id: 'rx',
    titleEn: 'Issue Prescription',
    titleBn: 'প্রেসক্রিপশন',
    subtitleEn: 'Bengali PDF + QR',
    subtitleBn: 'বাংলা PDF + QR',
    Icon: FileText,
    cardCls: 'bg-blue-50 border-blue-200 text-blue-900',
    iconCls: 'text-blue-600',
    offline: false,
    navigate: 'prescriptions',
  },
  {
    id: 'tele',
    titleEn: 'Teleconsult',
    titleBn: 'টেলিকনসালট',
    subtitleEn: 'Start video call',
    subtitleBn: 'ভিডিও কল শুরু করুন',
    Icon: Video,
    cardCls: 'bg-green-50 border-green-200 text-green-900',
    iconCls: 'text-green-600',
    offline: false,
    navigate: 'teleconsult',
  },
  {
    id: 'compare',
    titleEn: 'Compare Equations',
    titleBn: 'সমীকরণ তুলনা',
    subtitleEn: 'Side-by-side GFR',
    subtitleBn: 'পাশাপাশি GFR',
    Icon: BarChart2,
    cardCls: 'bg-purple-50 border-purple-200 text-purple-900',
    iconCls: 'text-purple-600',
    offline: false,
    navigate: 'gfr',
  },
  {
    id: 'staging',
    titleEn: 'CKD Staging',
    titleBn: 'সিকেডি স্টেজিং',
    subtitleEn: 'Quick reference',
    subtitleBn: 'দ্রুত রেফারেন্স',
    Icon: ClipboardList,
    cardCls: 'bg-amber-50 border-amber-200 text-amber-900',
    iconCls: 'text-amber-600',
    offline: true,
    action: 'staging-sheet',
  },
  {
    id: 'risk',
    titleEn: 'Risk Score',
    titleBn: 'ঝুঁকি স্কোর',
    subtitleEn: 'AI-powered',
    subtitleBn: 'এআই-চালিত',
    Icon: Activity,
    cardCls: 'bg-rose-50 border-rose-200 text-rose-900',
    iconCls: 'text-rose-600',
    offline: false,
    navigate: 'doctor-dashboard',
  },
];

export default function DoctorTools() {
  const { language } = useLanguage();
  const [showStaging, setShowStaging] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const bn = language === 'bn';

  const handleTool = (tool: Tool) => {
    if (tool.action === 'staging-sheet') {
      setShowStaging(true);
      return;
    }
    if (tool.navigate) {
      window.dispatchEvent(new CustomEvent('navigate', { detail: tool.navigate }));
    }
  };

  return (
    <div className="pb-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-black text-slate-900">
          {bn ? 'ক্লিনিকাল টুলস' : 'Clinical Tools'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {bn ? 'প্রয়োজনীয় সরঞ্জামে দ্রুত প্রবেশ' : 'Quick access to essential utilities'}
        </p>
      </motion.div>

      {/* 2-column tool grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {TOOLS.map((tool, i) => (
          <motion.button
            key={tool.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => {
              setActiveId(tool.id);
              setTimeout(() => setActiveId(null), 150);
              handleTool(tool);
            }}
            className={`relative flex flex-col items-start justify-end p-4 rounded-2xl border min-h-[140px] shadow-sm text-left transition-transform active:scale-95 ${tool.cardCls} ${
              activeId === tool.id ? 'scale-95' : ''
            }`}
          >
            {/* Offline badge */}
            {tool.offline && (
              <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-black/5">
                <WifiOff className="w-3 h-3 text-slate-600" />
                <span className="text-[10px] font-medium text-slate-700">
                  {bn ? 'অফলাইন' : 'Offline'}
                </span>
              </div>
            )}

            {/* Icon */}
            <div className={`mb-3 ${tool.iconCls}`}>
              <tool.Icon className="w-8 h-8" />
            </div>

            {/* Label */}
            <h3 className="font-bold text-base leading-tight">
              {bn ? tool.titleBn : tool.titleEn}
            </h3>
            <p className="text-xs opacity-75 mt-1">
              {bn ? tool.subtitleBn : tool.subtitleEn}
            </p>
          </motion.button>
        ))}
      </div>

      {/* Offline-ready banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm"
      >
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-emerald-900 text-sm">
            {bn ? 'অফলাইন মোড প্রস্তুত' : 'Offline mode ready'}
          </h4>
          <p className="text-emerald-700 text-xs mt-0.5 leading-relaxed">
            {bn
              ? '৪টি টুল সিগন্যাল ছাড়াই ব্যবহারযোগ্য। GFR ক্যালকুলেটর, সমীকরণ, স্টেজিং ও আংশিক প্রেসক্রিপশন ক্যাশড।'
              : '4 tools available without signal. GFR Calculator, Equations, Staging, and partial Prescriptions are cached.'}
          </p>
        </div>
      </motion.div>

      {/* CKD Staging bottom sheet */}
      <AnimatePresence>
        {showStaging && (
          <CKDStagingSheet bn={bn} onClose={() => setShowStaging(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
