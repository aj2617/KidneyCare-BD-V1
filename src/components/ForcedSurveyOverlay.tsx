import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ShieldCheck, ChevronRight, ChevronLeft, ClipboardList } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type Answer = string | number | '';

interface Responses {
  // Section 1 – Demographics
  age: Answer; gender: Answer; education: Answer; occupation: Answer;
  residential_area: Answer; monthly_income: Answer;
  // Section 2 – Medical History
  hypertension_dx: Answer; diabetes_dx: Answer; family_kidney: Answer;
  kidney_stones: Answer; kidney_disease_prior: Answer; kidney_disease_type: Answer;
  bp_medication: Answer; diabetes_medication: Answer; dialysis: Answer;
  // Section 3 – Symptoms
  urine_changes: Answer; foamy_urine: Answer; leg_swelling: Answer;
  fatigue: Answer; nausea: Answer; appetite_loss: Answer;
  weight_loss: Answer; shortness_breath: Answer;
  // Section 4 – Lifestyle
  smoker: Answer; alcohol: Answer; water_intake: Answer;
  salty_food: Answer; exercise: Answer; sleep_hours: Answer;
  // Section 5 – Clinical
  bp_systolic: Answer; bp_diastolic: Answer; creatinine: Answer;
  urine_test: Answer; kidney_function_test: Answer;
  // Section 6 – Awareness
  aware_risk_factors: Answer; health_checkup_freq: Answer;
  received_advice: Answer; dietary_restrictions: Answer;
  tested_creatinine: Answer; knows_htn_dm_damage: Answer; painkillers: Answer;
}

const EMPTY: Responses = {
  age: '', gender: '', education: '', occupation: '', residential_area: '', monthly_income: '',
  hypertension_dx: '', diabetes_dx: '', family_kidney: '', kidney_stones: '',
  kidney_disease_prior: '', kidney_disease_type: '', bp_medication: '', diabetes_medication: '', dialysis: '',
  urine_changes: '', foamy_urine: '', leg_swelling: '', fatigue: '', nausea: '',
  appetite_loss: '', weight_loss: '', shortness_breath: '',
  smoker: '', alcohol: '', water_intake: '', salty_food: '', exercise: '', sleep_hours: '',
  bp_systolic: '', bp_diastolic: '', creatinine: '', urine_test: '', kidney_function_test: '',
  aware_risk_factors: '', health_checkup_freq: '', received_advice: '', dietary_restrictions: '',
  tested_creatinine: '', knows_htn_dm_damage: '', painkillers: '',
};

function isSectionComplete(responses: Responses, section: number) {
  if (section === 1) return !!(responses.age && responses.gender && responses.education && responses.occupation && responses.residential_area);
  if (section === 2) return !!(responses.hypertension_dx && responses.diabetes_dx && responses.family_kidney && responses.kidney_stones && responses.kidney_disease_prior && responses.bp_medication && responses.diabetes_medication && responses.dialysis);
  if (section === 3) return !!(responses.urine_changes && responses.foamy_urine && responses.leg_swelling && responses.fatigue && responses.nausea && responses.appetite_loss && responses.weight_loss && responses.shortness_breath);
  if (section === 4) return !!(responses.smoker && responses.alcohol && responses.water_intake && responses.salty_food && responses.exercise && responses.sleep_hours);
  if (section === 5) return !!(responses.urine_test && responses.kidney_function_test);
  if (section === 6) return !!(responses.aware_risk_factors && responses.health_checkup_freq && responses.received_advice && responses.dietary_restrictions && responses.tested_creatinine && responses.knows_htn_dm_damage && responses.painkillers);
  return false;
}

function getResumeSection(responses: Responses) {
  for (let section = 1; section <= TOTAL_SECTIONS; section += 1) {
    if (!isSectionComplete(responses, section)) return section;
  }
  return 1;
}

const T = {
  en: {
    heading: 'Complete Health Survey',
    subheading: 'Required for Better Care',
    sectionOf: (s: number, t: number) => `Section ${s} of ${t}`,
    next: 'Next', back: 'Back', submit: 'Submit Survey', submitting: 'Submitting…',
    optional: '(optional)',
    sections: ['Demographics', 'Medical History', 'Clinical Symptoms', 'Lifestyle', 'Clinical Test Knowledge', 'Awareness & Access'],
    s1: {
      age: 'Age', gender: 'Gender', education: 'Education Level',
      occupation: 'Occupation', area: 'Residential Area', income: 'Monthly Household Income (BDT)',
      genderOpts: ['Male', 'Female', 'Other'],
      educationOpts: ['No formal schooling', 'Primary', 'Secondary', 'Higher Secondary', 'Graduate or above'],
      occupationOpts: ['Farmer', 'Housewife', 'Student', 'Service', 'Business', 'Unemployed', 'Other'],
      areaOpts: ['Urban', 'Rural'],
    },
    s2: {
      hypertension: 'Diagnosed with high blood pressure?',
      diabetes: 'Diagnosed with diabetes?',
      familyKidney: 'Family history of kidney disease?',
      kidneyStones: 'History of kidney stones?',
      kidneyPrior: 'Previously diagnosed with any kidney-related disease?',
      kidneyType: 'If yes, specify type',
      kidneyTypeOpts: ['CKD', 'Glomerulonephritis', 'PKD', 'Other'],
      bpMed: 'Currently taking BP medication?',
      dmMed: 'Currently taking diabetes medication?',
      dialysis: 'Ever undergone dialysis?',
      ynd: ['Yes', 'No', "Don't Know"],
      yn: ['Yes', 'No'],
    },
    s3: {
      title: 'During the last 3 months:',
      q: [
        'Frequent changes in urination?',
        'Foamy / bubbly urine?',
        'Swelling in legs / ankles / feet?',
        'Persistent fatigue or weakness?',
        'Nausea or vomiting?',
        'Loss of appetite?',
        'Unexplained weight loss?',
        'Shortness of breath?',
      ],
      yn: ['Yes', 'No'],
    },
    s4: {
      smoker: 'Current smoker?',
      smokerOpts: ['Yes', 'No', 'Former'],
      alcohol: 'Alcohol consumption?',
      alcoholOpts: ['Never', 'Occasionally', 'Regularly'],
      water: 'Daily water intake (glasses)?',
      waterOpts: ['Less than 4', '4–7', '8–10', 'More than 10'],
      salty: 'Salty / processed food frequency?',
      saltyOpts: ['Never', 'Occasionally', 'Frequently'],
      exercise: 'Regular exercise?', yn: ['Yes', 'No'],
      sleep: 'Average sleep per night (hours)',
    },
    s5: {
      bpSys: 'Most recent systolic BP (mmHg)', bpDia: 'Most recent diastolic BP (mmHg)',
      creatinine: 'Most recent serum creatinine (mg/dL)',
      urineTest: 'Urine test in last 6 months?',
      kfTest: 'Kidney function test in last year?',
      ynd: ['Yes', 'No', "Don't Know"],
    },
    s6: {
      awareRisk: 'Aware of kidney disease risk factors?',
      checkup: 'Routine health check-up frequency?',
      checkupOpts: ['Never', 'Yearly', 'Only when sick'],
      advice: 'Received medical advice on kidney health?',
      diet: 'Follow dietary restrictions?',
      dietOpts: ['Yes', 'No', 'Not applicable'],
      creatinineTested: 'Ever been tested for serum creatinine before?',
      knowsDmHtn: 'Do you know uncontrolled diabetes/hypertension can damage kidneys?',
      painkillers: 'Regularly take painkillers (ibuprofen/diclofenac)?',
      yn: ['Yes', 'No'],
    },
    encrypted: 'Your answers are stored securely and anonymized for research.',
  },
  bn: {
    heading: 'স্বাস্থ্য জরিপ সম্পূর্ণ করুন',
    subheading: 'ভালো যত্নের জন্য প্রয়োজনীয়',
    sectionOf: (s: number, t: number) => `বিভাগ ${s} / ${t}`,
    next: 'পরবর্তী', back: 'পূর্ববর্তী', submit: 'জরিপ জমা দিন', submitting: 'জমা হচ্ছে…',
    optional: '(ঐচ্ছিক)',
    sections: ['জনতাত্ত্বিক', 'চিকিৎসা ইতিহাস', 'ক্লিনিকাল লক্ষণ', 'জীবনযাত্রা', 'ক্লিনিকাল পরীক্ষা', 'সচেতনতা ও প্রবেশাধিকার'],
    s1: {
      age: 'বয়স', gender: 'লিঙ্গ', education: 'শিক্ষাগত যোগ্যতা',
      occupation: 'পেশা', area: 'বাসস্থান এলাকা', income: 'মাসিক পারিবারিক আয় (টাকা)',
      genderOpts: ['পুরুষ', 'মহিলা', 'অন্যান্য'],
      educationOpts: ['প্রাতিষ্ঠানিক শিক্ষা নেই', 'প্রাথমিক', 'মাধ্যমিক', 'উচ্চ মাধ্যমিক', 'স্নাতক বা উচ্চতর'],
      occupationOpts: ['কৃষক', 'গৃহিণী', 'ছাত্র', 'চাকরিজীবী', 'ব্যবসায়ী', 'বেকার', 'অন্যান্য'],
      areaOpts: ['শহর', 'গ্রাম'],
    },
    s2: {
      hypertension: 'উচ্চ রক্তচাপ নির্ণয় হয়েছে?',
      diabetes: 'ডায়াবেটিস নির্ণয় হয়েছে?',
      familyKidney: 'পরিবারে কিডনি রোগের ইতিহাস?',
      kidneyStones: 'কিডনিতে পাথরের ইতিহাস?',
      kidneyPrior: 'আগে কোনো কিডনি-সম্পর্কিত রোগ নির্ণয় হয়েছিল?',
      kidneyType: 'হ্যাঁ হলে, ধরন উল্লেখ করুন',
      kidneyTypeOpts: ['সিকেডি', 'গ্লোমেরুলোনেফ্রাইটিস', 'পিকেডি', 'অন্যান্য'],
      bpMed: 'বর্তমানে রক্তচাপের ওষুধ খাচ্ছেন?',
      dmMed: 'বর্তমানে ডায়াবেটিসের ওষুধ খাচ্ছেন?',
      dialysis: 'কখনো ডায়ালাইসিস হয়েছে?',
      ynd: ['হ্যাঁ', 'না', 'জানি না'],
      yn: ['হ্যাঁ', 'না'],
    },
    s3: {
      title: 'গত ৩ মাসে:',
      q: [
        'প্রস্রাবে ঘন ঘন পরিবর্তন?',
        'প্রস্রাবে ফেনা বা বুদবুদ?',
        'পা/গোড়ালি/পায়ে ফোলা?',
        'ক্রমাগত ক্লান্তি বা দুর্বলতা?',
        'বমি বমি ভাব বা বমি?',
        'ক্ষুধামন্দা?',
        'অস্বাভাবিক ওজন হ্রাস?',
        'শ্বাসকষ্ট?',
      ],
      yn: ['হ্যাঁ', 'না'],
    },
    s4: {
      smoker: 'বর্তমানে ধূমপান করেন?',
      smokerOpts: ['হ্যাঁ', 'না', 'আগে করতাম'],
      alcohol: 'মদ্যপান করেন?',
      alcoholOpts: ['কখনো না', 'মাঝে মাঝে', 'নিয়মিত'],
      water: 'দৈনিক পানির পরিমাণ (গ্লাস)?',
      waterOpts: ['৪ গ্লাসের কম', '৪–৭ গ্লাস', '৮–১০ গ্লাস', '১০ গ্লাসের বেশি'],
      salty: 'লবণাক্ত/প্রক্রিয়াজাত খাবার কতটা?',
      saltyOpts: ['কখনো না', 'মাঝে মাঝে', 'ঘন ঘন'],
      exercise: 'নিয়মিত ব্যায়াম করেন?', yn: ['হ্যাঁ', 'না'],
      sleep: 'রাতে গড়ে কত ঘণ্টা ঘুমান',
    },
    s5: {
      bpSys: 'সর্বশেষ সিস্টোলিক রক্তচাপ (mmHg)', bpDia: 'সর্বশেষ ডায়াস্টোলিক রক্তচাপ (mmHg)',
      creatinine: 'সর্বশেষ সিরাম ক্রিয়েটিনিন (mg/dL)',
      urineTest: 'গত ৬ মাসে প্রস্রাব পরীক্ষা?',
      kfTest: 'গত বছরে কিডনির কার্যকারিতা পরীক্ষা?',
      ynd: ['হ্যাঁ', 'না', 'জানি না'],
    },
    s6: {
      awareRisk: 'কিডনি রোগের ঝুঁকির কারণ সম্পর্কে সচেতন?',
      checkup: 'নিয়মিত স্বাস্থ্য পরীক্ষার ফ্রিকোয়েন্সি?',
      checkupOpts: ['কখনো না', 'বছরে একবার', 'শুধু অসুস্থ হলে'],
      advice: 'কিডনি স্বাস্থ্য বিষয়ে চিকিৎসা পরামর্শ পেয়েছেন?',
      diet: 'খাদ্যতালিকায় নিয়ন্ত্রণ মেনে চলেন?',
      dietOpts: ['হ্যাঁ', 'না', 'প্রযোজ্য নয়'],
      creatinineTested: 'আগে কখনো সিরাম ক্রিয়েটিনিন পরীক্ষা হয়েছে?',
      knowsDmHtn: 'নিয়ন্ত্রণহীন ডায়াবেটিস/উচ্চ রক্তচাপ কিডনির ক্ষতি করে — জানেন?',
      painkillers: 'নিয়মিত ব্যথানাশক ওষুধ (আইবুপ্রোফেন/ডাইক্লোফেনাক) খান?',
      yn: ['হ্যাঁ', 'না'],
    },
    encrypted: 'আপনার উত্তরগুলি নিরাপদে সংরক্ষিত এবং গবেষণার জন্য বেনামী করা হয়েছে।',
  },
};

function RadioGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all min-h-[44px] ${
            value === opt
              ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]'
              : 'bg-white text-slate-600 border-slate-200 hover:border-[#1A6B8A]/40'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SelectField({ options, value, onChange, placeholder }: {
  options: string[]; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-4 py-3 border rounded-xl text-[15px] appearance-none focus:outline-none focus:ring-2 transition-all mt-1.5 ${
        value ? 'text-slate-900 border-slate-200 focus:ring-[#1A6B8A]/15 focus:border-[#1A6B8A]'
               : 'text-slate-400 border-slate-200 focus:ring-[#1A6B8A]/15 focus:border-[#1A6B8A]'
      }`}
    >
      <option value="">{placeholder || '—'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Q({ label, required, children, optional }: {
  label: string; required?: boolean; children: React.ReactNode; optional?: boolean;
}) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <p className="text-sm font-semibold text-slate-800">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {optional && <span className="ml-1 text-xs text-slate-400 font-normal">(optional)</span>}
      </p>
      {children}
    </div>
  );
}

interface Props {
  token: string;
  patientName: string;
  onComplete: () => void;
}

const TOTAL_SECTIONS = 6;

export default function ForcedSurveyOverlay({ token, patientName, onComplete }: Props) {
  const { language, setLanguage } = useLanguage();
  const tx = T[language as 'en' | 'bn'];
  const bn = language === 'bn';

  const [section, setSection] = useState(1);
  const [responses, setResponses] = useState<Responses>({ ...EMPTY });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimer = useRef<number | null>(null);
  const lastSavedSnapshot = useRef('');

  const set = (k: keyof Responses, v: string | number) =>
    setResponses(r => ({ ...r, [k]: v }));

  const isSectionValid = () => {
    return isSectionComplete(responses, section);
  };

  useEffect(() => {
    let cancelled = false;

    const loadSurvey = async () => {
      try {
        const res = await fetch('/api/patient/survey', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data) return;
        const hydrated = { ...EMPTY, ...data };
        setResponses(hydrated);
        setSection(getResumeSection(hydrated));
        lastSavedSnapshot.current = JSON.stringify(hydrated);
      } catch {
        // Drafts are best-effort; leave the form usable if the request fails.
      } finally {
        if (!cancelled) setDraftLoaded(true);
      }
    };

    loadSurvey();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!draftLoaded || submitting) return;
    const snapshot = JSON.stringify(responses);
    if (snapshot === lastSavedSnapshot.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = window.setTimeout(async () => {
      try {
        await fetch('/api/patient/survey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ responses, completed: false }),
        });
        lastSavedSnapshot.current = snapshot;
        setSaveState('saved');
        window.setTimeout(() => setSaveState('idle'), 1200);
      } catch {
        setSaveState('idle');
      }
    }, 500);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [responses, draftLoaded, submitting, token]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    try {
      const res = await fetch('/api/patient/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ responses, completed: true }),
      });
      if (!res.ok) throw new Error('Failed to save survey');
      onComplete();
    } catch {
      setError(bn ? 'জমা দিতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const r = responses;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[300] bg-[#F4F7FB] overflow-y-auto"
    >
      <div className="min-h-screen flex flex-col items-center py-6 px-4">
        <div className="w-full max-w-[480px]">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#1A6B8A] flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">
                  {tx.sectionOf(section, TOTAL_SECTIONS)}
                </p>
                <p className="text-sm font-black text-slate-900">{tx.sections[section - 1]}</p>
              </div>
            </div>
            <button
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              {language === 'en' ? 'বাংলা' : 'English'}
            </button>
          </div>

          {/* Heading */}
          <div className="text-center mb-5">
            <h1 className="text-xl font-black text-slate-900">{tx.heading}</h1>
            <p className="text-sm text-slate-500">{tx.subheading}</p>
            <p className="mt-2 text-xs font-medium text-slate-400">
              {saveState === 'saving'
                ? (bn ? 'à¦¸à¦‚à¦°à¦•à§à¦·à¦£ à¦¹à¦šà§à¦›à§‡â€¦' : 'Saving progress...')
                : (bn ? 'à¦ªà§à¦°à¦¸à§à¦¥à¦¾à¦¨ à¦¸à§à¦¬à¦¯à¦¼à¦‚à¦•à§à¦°à¦¿à¦¯à¦¼ à¦­à¦¾à¦¬à§‡ à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦¹à¦¯à¦¼à§‡' : 'Progress is saved automatically')}
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-200 rounded-full mb-6 overflow-hidden">
            <motion.div
              animate={{ width: `${(section / TOTAL_SECTIONS) * 100}%` }}
              transition={{ duration: 0.35 }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #1A6B8A, #2ECC71)' }}
            />
          </div>

          {/* Section dots */}
          <div className="flex justify-center gap-1.5 mb-6">
            {Array.from({ length: TOTAL_SECTIONS }, (_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i + 1 === section ? 20 : 8,
                  height: 8,
                  background: i + 1 <= section ? '#1A6B8A' : '#E2E8F0',
                }}
              />
            ))}
          </div>

          {/* Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 mb-4"
            >

              {/* SECTION 1 */}
              {section === 1 && (
                <div>
                  <Q label={tx.s1.age} required>
                    <input type="number" min={18} max={120} inputMode="numeric"
                      value={r.age as string}
                      onChange={e => set('age', e.target.value)}
                      placeholder="18–120"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[15px] mt-1.5 focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/15 focus:border-[#1A6B8A]"
                    />
                  </Q>
                  <Q label={tx.s1.gender} required>
                    <RadioGroup options={tx.s1.genderOpts} value={r.gender as string} onChange={v => set('gender', v)} />
                  </Q>
                  <Q label={tx.s1.education} required>
                    <SelectField options={tx.s1.educationOpts} value={r.education as string} onChange={v => set('education', v)} />
                  </Q>
                  <Q label={tx.s1.occupation} required>
                    <SelectField options={tx.s1.occupationOpts} value={r.occupation as string} onChange={v => set('occupation', v)} />
                  </Q>
                  <Q label={tx.s1.area} required>
                    <RadioGroup options={tx.s1.areaOpts} value={r.residential_area as string} onChange={v => set('residential_area', v)} />
                  </Q>
                  <Q label={tx.s1.income} optional>
                    <input type="number" inputMode="numeric"
                      value={r.monthly_income as string}
                      onChange={e => set('monthly_income', e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[15px] mt-1.5 focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/15 focus:border-[#1A6B8A]"
                    />
                  </Q>
                </div>
              )}

              {/* SECTION 2 */}
              {section === 2 && (
                <div>
                  {[
                    { label: tx.s2.hypertension, key: 'hypertension_dx', opts: tx.s2.ynd },
                    { label: tx.s2.diabetes, key: 'diabetes_dx', opts: tx.s2.ynd },
                    { label: tx.s2.familyKidney, key: 'family_kidney', opts: tx.s2.ynd },
                    { label: tx.s2.kidneyStones, key: 'kidney_stones', opts: tx.s2.yn },
                    { label: tx.s2.kidneyPrior, key: 'kidney_disease_prior', opts: tx.s2.yn },
                  ].map(q => (
                    <Q key={q.key} label={q.label} required>
                      <RadioGroup options={q.opts} value={r[q.key as keyof Responses] as string} onChange={v => set(q.key as keyof Responses, v)} />
                    </Q>
                  ))}
                  {r.kidney_disease_prior === tx.s2.yn[0] && (
                    <Q label={tx.s2.kidneyType} required>
                      <RadioGroup options={tx.s2.kidneyTypeOpts} value={r.kidney_disease_type as string} onChange={v => set('kidney_disease_type', v)} />
                    </Q>
                  )}
                  {[
                    { label: tx.s2.bpMed, key: 'bp_medication', opts: tx.s2.yn },
                    { label: tx.s2.dmMed, key: 'diabetes_medication', opts: tx.s2.yn },
                    { label: tx.s2.dialysis, key: 'dialysis', opts: tx.s2.yn },
                  ].map(q => (
                    <Q key={q.key} label={q.label} required>
                      <RadioGroup options={q.opts} value={r[q.key as keyof Responses] as string} onChange={v => set(q.key as keyof Responses, v)} />
                    </Q>
                  ))}
                </div>
              )}

              {/* SECTION 3 */}
              {section === 3 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{tx.s3.title}</p>
                  {[
                    ['urine_changes', 0], ['foamy_urine', 1], ['leg_swelling', 2], ['fatigue', 3],
                    ['nausea', 4], ['appetite_loss', 5], ['weight_loss', 6], ['shortness_breath', 7],
                  ].map(([key, idx]) => (
                    <Q key={key as string} label={tx.s3.q[idx as number]} required>
                      <RadioGroup options={tx.s3.yn} value={r[key as keyof Responses] as string} onChange={v => set(key as keyof Responses, v)} />
                    </Q>
                  ))}
                </div>
              )}

              {/* SECTION 4 */}
              {section === 4 && (
                <div>
                  <Q label={tx.s4.smoker} required>
                    <RadioGroup options={tx.s4.smokerOpts} value={r.smoker as string} onChange={v => set('smoker', v)} />
                  </Q>
                  <Q label={tx.s4.alcohol} required>
                    <RadioGroup options={tx.s4.alcoholOpts} value={r.alcohol as string} onChange={v => set('alcohol', v)} />
                  </Q>
                  <Q label={tx.s4.water} required>
                    <RadioGroup options={tx.s4.waterOpts} value={r.water_intake as string} onChange={v => set('water_intake', v)} />
                  </Q>
                  <Q label={tx.s4.salty} required>
                    <RadioGroup options={tx.s4.saltyOpts} value={r.salty_food as string} onChange={v => set('salty_food', v)} />
                  </Q>
                  <Q label={tx.s4.exercise} required>
                    <RadioGroup options={tx.s4.yn} value={r.exercise as string} onChange={v => set('exercise', v)} />
                  </Q>
                  <Q label={tx.s4.sleep} required>
                    <input type="number" min={4} max={12} inputMode="numeric"
                      value={r.sleep_hours as string}
                      onChange={e => set('sleep_hours', e.target.value)}
                      placeholder="4–12"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[15px] mt-1.5 focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/15 focus:border-[#1A6B8A]"
                    />
                  </Q>
                </div>
              )}

              {/* SECTION 5 */}
              {section === 5 && (
                <div>
                  {[
                    { label: tx.s5.bpSys, key: 'bp_systolic', ph: 'e.g. 130' },
                    { label: tx.s5.bpDia, key: 'bp_diastolic', ph: 'e.g. 85' },
                    { label: tx.s5.creatinine, key: 'creatinine', ph: 'e.g. 1.2' },
                  ].map(q => (
                    <Q key={q.key} label={q.label} optional>
                      <input type="number" inputMode="decimal"
                        value={r[q.key as keyof Responses] as string}
                        onChange={e => set(q.key as keyof Responses, e.target.value)}
                        placeholder={q.ph}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[15px] mt-1.5 focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/15 focus:border-[#1A6B8A]"
                      />
                    </Q>
                  ))}
                  <Q label={tx.s5.urineTest} required>
                    <RadioGroup options={tx.s5.ynd} value={r.urine_test as string} onChange={v => set('urine_test', v)} />
                  </Q>
                  <Q label={tx.s5.kfTest} required>
                    <RadioGroup options={tx.s5.ynd} value={r.kidney_function_test as string} onChange={v => set('kidney_function_test', v)} />
                  </Q>
                </div>
              )}

              {/* SECTION 6 */}
              {section === 6 && (
                <div>
                  <Q label={tx.s6.awareRisk} required>
                    <RadioGroup options={tx.s6.yn} value={r.aware_risk_factors as string} onChange={v => set('aware_risk_factors', v)} />
                  </Q>
                  <Q label={tx.s6.checkup} required>
                    <RadioGroup options={tx.s6.checkupOpts} value={r.health_checkup_freq as string} onChange={v => set('health_checkup_freq', v)} />
                  </Q>
                  <Q label={tx.s6.advice} required>
                    <RadioGroup options={tx.s6.yn} value={r.received_advice as string} onChange={v => set('received_advice', v)} />
                  </Q>
                  <Q label={tx.s6.diet} required>
                    <RadioGroup options={tx.s6.dietOpts} value={r.dietary_restrictions as string} onChange={v => set('dietary_restrictions', v)} />
                  </Q>
                  <Q label={tx.s6.creatinineTested} required>
                    <RadioGroup options={tx.s6.yn} value={r.tested_creatinine as string} onChange={v => set('tested_creatinine', v)} />
                  </Q>
                  <Q label={tx.s6.knowsDmHtn} required>
                    <RadioGroup options={tx.s6.yn} value={r.knows_htn_dm_damage as string} onChange={v => set('knows_htn_dm_damage', v)} />
                  </Q>
                  <Q label={tx.s6.painkillers} required>
                    <RadioGroup options={tx.s6.yn} value={r.painkillers as string} onChange={v => set('painkillers', v)} />
                  </Q>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {error && (
            <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-4 border border-red-100">
              {error}
            </p>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mb-6">
            {section > 1 && (
              <button
                onClick={() => setSection(s => s - 1)}
                className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {tx.back}
              </button>
            )}
            {section < TOTAL_SECTIONS ? (
              <button
                onClick={() => { if (isSectionValid()) setSection(s => s + 1); }}
                disabled={!isSectionValid()}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl font-bold text-white transition-all disabled:opacity-50"
                style={{ background: isSectionValid() ? 'linear-gradient(135deg, #1A6B8A, #155E75)' : '#94a3b8' }}
              >
                {tx.next}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !isSectionValid()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white transition-all disabled:opacity-50"
                style={{ background: isSectionValid() ? 'linear-gradient(135deg, #2ECC71, #1a9e54)' : '#94a3b8' }}
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {tx.submitting}</>
                  : tx.submit
                }
              </button>
            )}
          </div>

          {/* Trust footer */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2ECC71]" />
            {tx.encrypted}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
