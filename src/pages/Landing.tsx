import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Activity, Shield, MapPin, ArrowRight, HeartPulse, AlertCircle, Download, Users, Brain, Bell, ChevronRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export default function Landing({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const { language } = useLanguage();
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };
    checkStandalone();
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkStandalone);
      return () => mediaQuery.removeEventListener('change', checkStandalone);
    }
  }, []);

  const statCards = [
    {
      badge: 'Undiagnosed Risk',
      value: '33%',
      desc: 'of rural Bangladeshis are at risk but unaware',
      badgeClass: 'bg-[#FDECEA] text-[#E74C3C]',
    },
    {
      badge: 'Higher Female Risk',
      value: '25.3%',
      desc: 'prevalence in females vs 20.3% in males',
      badgeClass: 'bg-[#FDECEA] text-[#E74C3C]',
    },
    {
      badge: 'Age Factor',
      value: '40+',
      desc: 'years dramatically increases CKD progression',
      badgeClass: 'bg-[#EFF8FB] text-[#1A6B8A]',
    },
  ];

  const features = [
    {
      icon: Activity,
      title: 'Smart GFR Calculator',
      desc: 'Side-by-side comparison of MDRD, CG, and CKD-EPI formulas.',
    },
    {
      icon: Shield,
      title: 'Risk Scoring Engine',
      desc: 'Early detection based on local research risk factors.',
    },
    {
      icon: MapPin,
      title: 'National Heatmap',
      desc: 'District-level CKD burden visualization for policymakers.',
    },
    {
      icon: AlertCircle,
      title: 'Decision Support',
      desc: 'AI-driven clinical alerts for doctors to prevent ESRD.',
    },
  ];

  return (
    <div className="space-y-14 pb-10 md:space-y-20">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 glowing-gradient-bg px-4 py-8 sm:px-6 md:rounded-[32px] md:px-12 md:py-16">
        <div className="absolute -left-10 top-12 h-40 w-40 rounded-full bg-[#1A6B8A]/5 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-slate-300/20 blur-3xl" />

        <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
          <div className="space-y-6 md:space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#1A6B8A]/10 px-4 py-2 text-xs font-bold text-[#1A6B8A] sm:text-sm"
            >
              <HeartPulse className="h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">
                {language === 'en'
                  ? 'Bangladesh CKD Monitoring Platform'
                  : 'বাংলাদেশ সিকেডি মনিটরিং প্ল্যাটফর্ম'}
              </span>
            </motion.div>

            <div className="space-y-5">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="max-w-4xl text-[2.15rem] font-black leading-[1.08] tracking-tight hero-title-gradient sm:text-4xl md:text-6xl"
              >
                Early CKD Detection, Monitoring, and Smarter Care for Bangladesh.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 md:text-xl"
              >
                KidneyCare BD helps patients, doctors, and public health teams track kidney risk,
                compare GFR formulas, monitor district-level burden, and act earlier before CKD becomes critical.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4"
            >
              <button
                onClick={onStart}
                className="inline-flex w-full items-center justify-center gap-3 rounded-[18px] bg-[#1A6B8A] px-6 py-4 text-lg font-black text-white shadow-xl shadow-[#1A6B8A]/20 transition-all hover:bg-[#14556e] glow-btn sm:min-w-[240px] sm:w-auto sm:px-8 sm:py-5 sm:text-xl"
              >
                Get Started Now
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => document.getElementById('care-features')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex w-full items-center justify-center rounded-[18px] border border-slate-200 bg-white px-6 py-4 text-lg font-black text-slate-800 transition-all hover:bg-slate-50 glow-btn sm:min-w-[184px] sm:w-auto sm:px-8 sm:py-5 sm:text-xl"
              >
                Learn More
              </button>
            </motion.div>

            {!isInstalled && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="rounded-[24px] border border-[#1A6B8A]/20 bg-gradient-to-br from-white via-white to-[#1A6B8A]/5 p-5 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2ECC71] inline-block shrink-0" />
                    {language === 'en' ? 'Install App for Offline Monitoring' : 'অফলাইন মনিটরিংয়ের জন্য অ্যাপটি ইনস্টল করুন'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {language === 'en' 
                      ? 'Add KidneyCare BD to your home screen to track health metrics offline, get notifications, and access features instantly.' 
                      : 'হোম স্ক্রিনে কিডনিকেয়ার বিডি যোগ করুন এবং অফলাইনে ভাইটালস ট্র্যাক করুন, রিমাইন্ডার পান ও দ্রুত অ্যাক্সেস করুন।'}
                  </p>
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('kcbd-open-pwa-prompt'))}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-[16px] bg-[#1A6B8A] hover:bg-[#14556e] text-white text-sm font-black shadow-lg shadow-[#1A6B8A]/25 transition-all shrink-0"
                >
                  <Download className="w-4 h-4" />
                  {language === 'en' ? 'Install App' : 'অ্যাপ ইনস্টল করুন'}
                </button>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between"
            >
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 leading-5">
                  22.48% CKD prevalence in Bangladesh
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 leading-5">
                  Supporting patient, clinician, and policy teams
                </span>
              </div>
              <button
                onClick={onLogin}
                className="inline-flex w-full items-center justify-center rounded-full border border-[#1A6B8A]/15 bg-[#1A6B8A]/5 px-5 py-3 text-sm font-bold text-[#1A6B8A] transition-colors hover:bg-[#1A6B8A]/10 md:w-auto"
              >
                Existing account? Sign in to continue
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative lg:pl-2 animate-float"
          >
            <div className="overflow-hidden rounded-[28px] border border-slate-200 hero-glass-card p-4 sm:rounded-[30px] sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-[#1A6B8A] p-5 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">Live Risk</p>
                  <p className="mt-4 text-4xl font-black sm:text-5xl">68</p>
                  <p className="mt-2 text-sm font-medium text-white/80">High risk patient cohort</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Detected Early</p>
                  <p className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">1 in 3</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">rural cases can be flagged sooner</p>
                </div>
                <div className="col-span-1 rounded-3xl border border-slate-100 bg-slate-50 p-5 sm:col-span-2 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">CKD Monitoring Snapshot</p>
                      <p className="mt-1 text-sm text-slate-500">Integrated patient, doctor, and public health dashboard</p>
                    </div>
                    <div className="rounded-2xl bg-[#1A6B8A]/10 p-3 text-[#1A6B8A]">
                      <Activity className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
                        <span>Risk-screened population</span>
                        <span>78%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full w-[78%] rounded-full bg-[#1A6B8A]" />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
                        <span>Follow-up adherence</span>
                        <span>61%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full w-[61%] rounded-full" style={{ background: '#2ECC71' }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
                        <span>Doctor alerts reviewed</span>
                        <span>84%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full w-[84%] rounded-full" style={{ background: '#F39C12' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Redesigned Stat Cards Section with Interactive Visuals */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {statCards.map((card, index) => {
          let pct = 0;
          if (card.value === '33%') pct = 33;
          else if (card.value === '25.3%') pct = 25.3;
          else pct = 40;

          return (
            <motion.div
              key={card.badge}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm glowing-card sm:rounded-[30px] sm:p-8 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className={`inline-flex rounded-full px-3.5 py-1.5 text-xs font-black ${card.badgeClass}`}>
                    {card.badge}
                  </span>
                  
                  {/* Styled Circular SVG Gauge */}
                  <div className="relative h-10 w-10 shrink-0">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={card.value.includes('33') || card.value.includes('25') ? "text-[#E74C3C]" : "text-[#1A6B8A]"}
                        strokeDasharray={`${pct}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                </div>
                
                <p className="mt-6 text-4xl font-black text-slate-950 sm:mt-7 sm:text-5xl">{card.value}</p>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  {card.desc}
                </p>
              </div>

              {/* Sparkline decoration */}
              <div className="mt-6 h-6 w-full opacity-35">
                <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path
                    d={`M0,15 Q25,${index === 0 ? 18 : index === 1 ? 5 : 12} 50,10 T100,${index === 0 ? 3 : index === 1 ? 15 : 2}`}
                    fill="none"
                    stroke={card.value.includes('33') || card.value.includes('25') ? "#E74C3C" : "#1A6B8A"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Timeline: How KidneyCare Works */}
      <section className="space-y-10 pt-4">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <span className="inline-flex rounded-full bg-[#1A6B8A]/10 px-4 py-2 text-sm font-black text-[#1A6B8A]">
            {language === 'en' ? 'The Patient Journey' : 'রোগীর সেবা যাত্রা'}
          </span>
          <h2 className="text-3xl font-black text-slate-950 sm:text-4xl md:text-5xl">
            {language === 'en' ? 'How KidneyCare BD Works' : 'কিডনিকেয়ার বিডি যেভাবে কাজ করে'}
          </h2>
          <p className="text-base text-slate-500 max-w-xl mx-auto">
            An end-to-end community-based screening ecosystem addressing kidney health gaps from rural doorsteps to specialized clinics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          <div className="hidden md:block absolute top-[52px] left-[10%] right-[10%] h-[2px] bg-slate-200/80 -z-10" />

          {[
            {
              step: '01',
              title: language === 'en' ? 'Screening & Enrollment' : 'স্ক্রিনিং ও নিবন্ধন',
              desc: language === 'en' ? 'CHWs register patients offline in rural fields and track initial health telemetry.' : 'স্বাস্থ্যকর্মীরা গ্রামীণ এলাকায় অফলাইনে রোগীদের স্ক্রিনিং ও প্রাথমিক তথ্য সংগ্রহ করেন।',
              icon: Users,
            },
            {
              step: '02',
              title: language === 'en' ? 'AI Risk Calculation' : 'ঝুঁকি পরিমাপ',
              desc: language === 'en' ? 'Dynamic algorithms calculate risk scores based on vitals, demographics, and symptoms.' : 'সিস্টেম রোগীর বয়স, ভাইটালস এবং উপসর্গের ভিত্তিতে কিডনি ঝুঁকির মাত্রা নির্ণয় করে।',
              icon: Brain,
            },
            {
              step: '03',
              title: language === 'en' ? 'Immediate Doctor Alerts' : 'ডাক্তারের সতর্কতা',
              desc: language === 'en' ? 'High-risk logs auto-generate doctor triage alerts for fast clinical review.' : 'উচ্চ ঝুঁকিপূর্ণ রোগীদের তথ্য সরাসরি সংশ্লিষ্ট চিকিৎসকদের ড্যাশবোর্ডে ট্রিয়াজ এলার্ট পাঠায়।',
              icon: Bell,
            },
            {
              step: '04',
              title: language === 'en' ? 'Teleconsult & Plan' : 'টেলিমেডিসিন ও প্রেসক্রিপশন',
              desc: language === 'en' ? 'Doctors call patients via WebRTC video, prescribe therapy, and track compliance.' : 'ডাক্তাররা সরাসরি ভিডিও কলের মাধ্যমে পরামর্শ দেন ও ডিজিটাল প্রেসক্রিপশন প্রদান করেন।',
              icon: HeartPulse,
            },
          ].map((item, idx) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-[24px] border border-slate-200/80 p-5 shadow-sm glowing-card flex flex-col items-center text-center relative"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A6B8A]/10 text-[#1A6B8A] mb-4">
                <item.icon className="h-5 w-5" />
              </div>
              <span className="absolute top-4 right-4 text-xs font-black text-[#1A6B8A]/30">{item.step}</span>
              <h3 className="text-lg font-black text-slate-900 leading-tight">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature Showcases: Side-by-Side Visual Breakdowns */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* Showcase A: GFR Precision Engine */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-sm glowing-card flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-[#1A6B8A]/10 text-[#1A6B8A] flex items-center justify-center">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-black text-slate-950">
              {language === 'en' ? 'eGFR Precision Engine' : 'ই-জিএফআর প্রিসিশন ইঞ্জিন'}
            </h3>
            <p className="text-base text-slate-500 leading-relaxed">
              {language === 'en'
                ? 'Side-by-side comparison using clinical standard formulas: CKD-EPI (2021), MDRD, and Cockcroft-Gault. Maps status to standard CKD staging guidelines.'
                : 'সিকেডি-ইপিআই (২০২১), এমডিআরডি এবং ককক্রফ্ট-গল্ট ফর্মুলার মাধ্যমে দ্রুত ও নির্ভুল ই-জিএফআর হিসাব করুন। কিডনি রোগের পর্যায় নির্ধারণে এটি অত্যন্ত কার্যকরী।'}
            </p>
          </div>

          {/* Calculator Simulation Visual */}
          <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3 font-semibold text-[11px] sm:text-xs text-slate-600">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400">Creatinine Input:</span>
              <span className="font-bold text-slate-900">1.8 mg/dL</span>
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span>CKD-EPI (2021)</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 font-bold border border-amber-200">
                  43 mL/min/1.73m² (Stage 3b)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>MDRD GFR</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 font-bold border border-amber-200">
                  41 mL/min/1.73m² (Stage 3b)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cockcroft-Gault</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 font-bold border border-amber-200">
                  46 mL/min (Stage 3b)
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-amber-800 text-[11px] leading-relaxed flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Clinical Suggestion:</strong> Moderately to severely decreased GFR. Schedule a follow-up test and evaluate potential dietary restrictions.
              </span>
            </div>
          </div>
        </motion.div>

        {/* Showcase B: Epidemiological Map */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-sm glowing-card flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-[#1A6B8A]/10 text-[#1A6B8A] flex items-center justify-center">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-black text-slate-950">
              {language === 'en' ? 'Bangladesh Division Heatmap' : 'বিভাগীয় হটস্পট মানচিত্র'}
            </h3>
            <p className="text-base text-slate-500 leading-relaxed">
              {language === 'en'
                ? 'Track district-level burden statistics. Helps non-profits, public health offices, and clinic managers deploy screening resources, medical camps, and specialist personnel efficiently.'
                : 'বিভাগ এবং জেলা ভিত্তিক সিকেডি প্রাদুর্ভাব মনিটর করুন। এর মাধ্যমে কোন এলাকায় চিকিৎসা ক্যাম্প এবং সম্পদ বেশি প্রয়োজন তা সহজে নির্ধারণ করা যায়।'}
            </p>
          </div>

          {/* Interactive Heatmap list simulation */}
          <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3 font-semibold text-xs text-slate-600">
            <span className="text-slate-400 block mb-1">Prevalence Distribution Snapshot</span>
            
            <div className="space-y-2">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Dhaka Division</span>
                  <span className="font-bold text-[#E74C3C]">24.1% High</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#E74C3C] w-[82%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Chittagong Division</span>
                  <span className="font-bold text-[#E74C3C]">22.8% High</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#E74C3C] w-[77%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Sylhet Division</span>
                  <span className="font-bold text-[#F39C12]">19.5% Moderate</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#F39C12] w-[66%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Rajshahi Division</span>
                  <span className="font-bold text-[#2ECC71]">17.2% Stable</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2ECC71] w-[58%]" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Grid for Core Features */}
      <section id="care-features" className="space-y-8 pt-4">
        <div className="mx-auto max-w-4xl text-center space-y-3">
          <h2 className="text-3xl font-black text-slate-950 sm:text-4xl md:text-5xl">
            {language === 'en' ? 'Key Capabilities' : 'মূল সুবিধাসমূহ'}
          </h2>
          <p className="mx-auto max-w-2xl text-slate-500 text-base leading-relaxed">
            Addressing unique infrastructure challenges with offline-first support, SMS alerts, and dual-Calculated alerts.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            // Define colors based on card index
            let accentBg = "bg-[#1A6B8A]/10 text-[#1A6B8A]";
            let iconColor = "bg-[#1A6B8A]";
            if (index === 1) {
              accentBg = "bg-emerald-50 text-emerald-700 border-emerald-100";
              iconColor = "bg-emerald-600";
            } else if (index === 2) {
              accentBg = "bg-purple-50 text-purple-700 border-purple-100";
              iconColor = "bg-purple-600";
            } else if (index === 3) {
              accentBg = "bg-amber-50 text-amber-700 border-amber-100";
              iconColor = "bg-amber-600";
            }

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm glowing-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white ${iconColor}`}>
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Module {index + 1}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-black leading-tight text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    {feature.desc}
                  </p>

                  {/* Inline visual mockups for each module */}
                  {index === 0 && (
                    <div className="mt-5 rounded-xl bg-slate-50 p-3 space-y-1.5 border border-slate-100">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400">
                        <span>Normal (G1)</span>
                        <span>Failure (G5)</span>
                      </div>
                      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-full relative">
                        <div className="absolute top-1/2 -translate-y-1/2 left-[58%] h-2.5 w-2.5 bg-slate-900 rounded-full border border-white shadow-sm" />
                      </div>
                      <span className="block text-[9px] text-slate-500 text-center font-bold">eGFR Stage: G3a (Moderate)</span>
                    </div>
                  )}

                  {index === 1 && (
                    <div className="mt-5 rounded-xl bg-slate-50 p-3 space-y-2 border border-slate-100">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-400 font-bold">Risk Factors Evaluated:</span>
                        <span className="font-black text-emerald-600">3/3 Screened</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <div className="h-1 rounded-full bg-emerald-500" />
                        <div className="h-1 rounded-full bg-emerald-500" />
                        <div className="h-1 rounded-full bg-emerald-500" />
                      </div>
                      <div className="text-[9px] text-center text-emerald-800 font-black py-0.5 rounded bg-emerald-50 border border-emerald-100">
                        High Risk Cohort Flagged
                      </div>
                    </div>
                  )}

                  {index === 2 && (
                    <div className="mt-5 rounded-xl bg-slate-50 p-3 space-y-1.5 border border-slate-100">
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold">
                        <span>Regional Heatmaps</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 font-black">12 Districts</span>
                      </div>
                      <div className="space-y-1 text-[9px]">
                        <div className="flex justify-between text-slate-700">
                          <span>Dhaka</span>
                          <span className="font-bold">24.1% Burden</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Chittagong</span>
                          <span className="font-bold">22.8% Burden</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {index === 3 && (
                    <div className="mt-5 rounded-xl bg-rose-50/50 border border-rose-100 p-3 space-y-1">
                      <div className="flex items-center gap-1 text-rose-800 text-[9px] font-black">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                        <span>CRITICAL BP DETECTED</span>
                      </div>
                      <p className="text-[8px] text-rose-700 leading-normal font-medium">
                        Patient BP: 160/95 mmHg. Automatic routing to Dr. Rahman triggered.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center text-xs font-bold text-[#1A6B8A] cursor-pointer hover:underline group">
                  <span>Learn more</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
