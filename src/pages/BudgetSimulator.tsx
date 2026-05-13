import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Calculator, TrendingDown, Loader2, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'motion/react';

const DISTRICTS = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh', 'Gazipur', 'Narayanganj', 'Comilla', 'Bogra', 'Dinajpur'];

export default function BudgetSimulator() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [formData, setFormData] = useState({ population: '100000', district: 'Rangpur', years: '5', screening_coverage: '0.3' });
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const formatBDT = (n: number) => {
    if (n >= 10000000) return `৳${(n / 10000000).toFixed(1)} কোটি`;
    if (n >= 100000) return `৳${(n / 100000).toFixed(1)} লক্ষ`;
    return `৳${n.toLocaleString()}`;
  };

  const runSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/budget-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Simulation failed');
      setResult(await res.json());
    } catch {
      setError('Failed to run simulation.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;
    const content = [
      `# KidneyCare BD Budget Impact Simulation Report`,
      `District: ${result.district}  |  Population: ${result.population.toLocaleString()}  |  Years: ${result.years}`,
      `Screening Coverage: ${(result.screening_coverage * 100).toFixed(0)}%`,
      ``,
      `## Key Projections`,
      `Estimated CKD Patients: ${result.estimated_ckd.toLocaleString()}`,
      `Patients Screened: ${result.screened_patients.toLocaleString()}`,
      `Early Detected: ${result.early_detected.toLocaleString()}`,
      ``,
      `## Dialysis Demand`,
      `Without intervention: ${result.dialysis_without_intervention.toLocaleString()}`,
      `With intervention: ${result.dialysis_with_intervention.toLocaleString()}`,
      `Cases prevented: ${result.dialysis_cases_prevented.toLocaleString()}`,
      ``,
      `## Cost Analysis (BDT)`,
      `Total Intervention Cost: ${result.total_intervention_cost_bdt.toLocaleString()}`,
      `Dialysis Cost Saved: ${result.dialysis_cost_saved_bdt.toLocaleString()}`,
      `Net Saving: ${result.net_saving_bdt.toLocaleString()}`,
      `ROI: ${result.roi_percent}%`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Budget_Impact_${result.district}_${new Date().toISOString().split('T')[0]}.md`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {language === 'bn' ? 'বাজেট প্রভাব সিমুলেটর' : 'Budget Impact Simulator'}
        </h1>
        <p className="text-slate-500">
          {language === 'bn' ? 'প্রাথমিক হস্তক্ষেপ থেকে অনুমানিত সঞ্চয় এবং ডায়ালাইসিস চাহিদা মডেল করুন' : 'Model projected dialysis demand and cost savings from early CKD intervention'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={runSimulation} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="font-bold text-slate-900">{language === 'bn' ? 'সিমুলেশন প্যারামিটার' : 'Simulation Parameters'}</h2>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'জেলা' : 'District'}</label>
              <select value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                {DISTRICTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'লক্ষ্য জনগোষ্ঠী' : 'Target Population'}</label>
              <input type="number" value={formData.population} onChange={e => setFormData({ ...formData, population: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="100000" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'পরিকল্পনার মেয়াদ (বছর)' : 'Planning Horizon (years)'}</label>
              <select value={formData.years} onChange={e => setFormData({ ...formData, years: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                {[3, 5, 10].map(y => <option key={y} value={y}>{y} {language === 'bn' ? 'বছর' : 'years'}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                {language === 'bn' ? 'স্ক্রিনিং কভারেজ' : 'Screening Coverage'}: {(parseFloat(formData.screening_coverage) * 100).toFixed(0)}%
              </label>
              <input type="range" min="0.1" max="1" step="0.05" value={formData.screening_coverage}
                onChange={e => setFormData({ ...formData, screening_coverage: e.target.value })}
                className="w-full accent-[#1A6B8A]" />
              <div className="flex justify-between text-xs text-slate-400"><span>10%</span><span>100%</span></div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={isLoading}
              className="w-full py-4 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#14556e] disabled:opacity-50">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
              {language === 'bn' ? 'সিমুলেশন চালান' : 'Run Simulation'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: language === 'bn' ? 'অনুমানিত সিকেডি রোগী' : 'Est. CKD Patients', value: result.estimated_ckd.toLocaleString(), color: 'bg-blue-50 text-blue-700' },
                  { label: language === 'bn' ? 'স্ক্রিন হওয়া রোগী' : 'Screened Patients', value: result.screened_patients.toLocaleString(), color: 'bg-purple-50 text-purple-700' },
                  { label: language === 'bn' ? 'ডায়ালাইসিস প্রতিরোধ' : 'Dialysis Prevented', value: result.dialysis_cases_prevented.toLocaleString(), color: 'bg-emerald-50 text-emerald-700' },
                  { label: language === 'bn' ? 'বিনিয়োগে রিটার্ন' : 'ROI', value: `${result.roi_percent}%`, color: result.net_saving_bdt > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700' },
                ].map(card => (
                  <div key={card.label} className={`p-4 rounded-2xl ${card.color}`}>
                    <p className="text-2xl font-black">{card.value}</p>
                    <p className="text-xs font-semibold mt-1 opacity-80">{card.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">{language === 'bn' ? 'খরচ বিশ্লেষণ (BDT)' : 'Cost Analysis (BDT)'}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{
                      name: language === 'bn' ? 'খরচ বিশ্লেষণ' : 'Cost Analysis',
                      [language === 'bn' ? 'স্ক্রিনিং খরচ' : 'Screening Cost']: result.screening_cost_bdt,
                      [language === 'bn' ? 'ওষুধ খরচ' : 'Medication Cost']: result.medication_cost_bdt,
                      [language === 'bn' ? 'ডায়ালাইসিস সাশ্রয়' : 'Dialysis Savings']: result.dialysis_cost_saved_bdt,
                    }]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={v => formatBDT(v)} />
                      <Tooltip formatter={(v: number) => formatBDT(v)} />
                      <Legend />
                      <Bar dataKey={language === 'bn' ? 'স্ক্রিনিং খরচ' : 'Screening Cost'} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={language === 'bn' ? 'ওষুধ খরচ' : 'Medication Cost'} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={language === 'bn' ? 'ডায়ালাইসিস সাশ্রয়' : 'Dialysis Savings'} fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`p-6 rounded-3xl border ${result.net_saving_bdt > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <TrendingDown className={`w-6 h-6 ${result.net_saving_bdt > 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <h3 className={`font-bold text-lg ${result.net_saving_bdt > 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {language === 'bn' ? 'নেট অর্থনৈতিক প্রভাব' : 'Net Economic Impact'}
                  </h3>
                </div>
                <p className={`text-3xl font-black ${result.net_saving_bdt > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {result.net_saving_bdt > 0 ? '+' : ''}{formatBDT(result.net_saving_bdt)}
                </p>
                <p className={`text-sm mt-2 ${result.net_saving_bdt > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {language === 'bn'
                    ? `${result.years} বছরে মোট খরচ ${formatBDT(result.total_intervention_cost_bdt)} এর বিপরীতে ${formatBDT(result.dialysis_cost_saved_bdt)} সাশ্রয়`
                    : `${formatBDT(result.dialysis_cost_saved_bdt)} saved over ${result.years} years vs. ${formatBDT(result.total_intervention_cost_bdt)} investment`}
                </p>
              </div>

              <button onClick={downloadReport}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all">
                <Download className="w-5 h-5" />
                {language === 'bn' ? 'রিপোর্ট ডাউনলোড করুন' : 'Download Report'}
              </button>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-96 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
              <div className="text-center">
                <Calculator className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">
                  {language === 'bn' ? 'প্যারামিটার পূরণ করে সিমুলেশন চালান' : 'Fill parameters and run the simulation'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
