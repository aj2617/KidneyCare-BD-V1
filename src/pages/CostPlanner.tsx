import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { DollarSign, TrendingUp, Hospital, Info, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function CostPlanner() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetch('/api/patient/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).then(setProfile);
  }, []);

  const costData = [
    { stage: 1, label: 'Stage 1-2 Management', cost: '1,000 - 3,000', items: ['Regular checkups', 'Basic medication', 'Dietary changes'] },
    { stage: 3, label: 'Stage 3 Management', cost: '3,000 - 8,000', items: ['Specialist visits', 'Advanced medication', 'Lab tests'] },
    { stage: 4, label: 'Stage 4 Management', cost: '8,000 - 20,000', items: ['ESRD preparation', 'Frequent monitoring', 'Erythropoietin'] },
    { stage: 5, label: 'Hemodialysis', cost: '15,000 - 25,000', items: ['2-3 sessions per week', 'Consumables', 'Hospital fees'], per: 'session' },
    { stage: 5, label: 'Kidney Transplant', cost: '5,00,000 - 15,00,000', items: ['Surgery', 'Donor costs', 'Post-op meds'], per: 'one-time' }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900">{t('cost.title')}</h1>
        <p className="text-slate-500 mt-2">Estimate potential treatment costs and plan your financial journey in Bangladesh.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Estimated Monthly Costs (BDT)</h3>
            <div className="space-y-4">
              {costData.map((item, i) => (
                <div 
                  key={i}
                  className={`p-6 rounded-2xl border transition-all ${
                    profile?.ckd_stage === item.stage ? 'bg-[#1A6B8A]/5 border-[#1A6B8A] ring-1 ring-[#1A6B8A]' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500">CKD Stage {item.stage}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-[#1A6B8A]">Tk. {item.cost}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{item.per || 'per month'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.items.map((tag, j) => (
                      <span key={j} className="text-[10px] font-bold bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-3xl">
            <TrendingUp className="w-10 h-10 text-emerald-400 mb-6" />
            <h3 className="text-xl font-bold mb-4">Financial Planning</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Early diagnosis and management can reduce long-term costs by up to 60%. Following your treatment plan strictly is the best way to avoid expensive emergency procedures.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Save for ESRD preparation
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Explore NGO assistance
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Subsidized Centers</h3>
            <div className="space-y-4">
              {[
                { name: 'BSMMU (PG Hospital)', location: 'Dhaka' },
                { name: 'National Institute of Kidney Diseases', location: 'Dhaka' },
                { name: 'Kidney Foundation', location: 'Mirpur, Dhaka' }
              ].map((h, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <Hospital className="w-5 h-5 text-[#1A6B8A]" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{h.name}</p>
                    <p className="text-xs text-slate-500">{h.location}</p>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => window.open('https://www.google.com/maps/search/kidney+centers+in+bangladesh', '_blank')}
              className="w-full mt-6 py-3 text-[#1A6B8A] font-bold text-sm flex items-center justify-center gap-2 hover:underline"
            >
              View All Centers
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
