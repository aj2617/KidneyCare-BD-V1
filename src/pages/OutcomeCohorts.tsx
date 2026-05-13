import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, Plus, BarChart2, Loader2, CheckCircle2, Download } from 'lucide-react';
import { motion } from 'motion/react';

export default function OutcomeCohorts() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<any>(null);
  const [cohortReport, setCohortReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', patient_ids: [] as number[], end_date: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [cohortsRes, patientsRes] = await Promise.all([
        fetch('/api/admin/cohorts', { headers }),
        fetch('/api/admin/export-research-data', { headers }),
      ]);
      setCohorts(await cohortsRes.json());
      const pData = await patientsRes.json();
      setPatients(pData.slice(0, 100));
    } catch { /* offline */ }
    finally { setIsLoading(false); }
  };

  const loadReport = async (cohort: any) => {
    setSelectedCohort(cohort);
    setIsReportLoading(true);
    try {
      const res = await fetch(`/api/admin/cohorts/${cohort.id}/report`, { headers: { Authorization: `Bearer ${token}` } });
      setCohortReport(await res.json());
    } catch { /* offline */ }
    finally { setIsReportLoading(false); }
  };

  const togglePatient = (id: number) => {
    setFormData(f => ({
      ...f,
      patient_ids: f.patient_ids.includes(id) ? f.patient_ids.filter(p => p !== id) : [...f.patient_ids, id]
    }));
  };

  const submitCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await fetch('/api/admin/cohorts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData),
    });
    setIsSubmitting(false);
    if (res.ok) {
      setMessage(language === 'bn' ? 'কোহর্ট তৈরি হয়েছে!' : 'Cohort created!');
      setShowForm(false);
      setFormData({ name: '', description: '', patient_ids: [], end_date: '' });
      fetchData();
    }
  };

  const downloadCohortReport = () => {
    if (!cohortReport) return;
    const { cohort, patients: pts, summary } = cohortReport;
    const content = [
      `# Outcome Cohort Report: ${cohort.name}`,
      `Description: ${cohort.description}`,
      `Start Date: ${new Date(cohort.start_date).toLocaleDateString()}`,
      ``,
      `## Summary`,
      `Total Patients: ${summary.total}`,
      `Average Risk Score: ${summary.avg_risk}`,
      `Diabetic Patients: ${summary.diabetic_count}`,
      `Hypertensive Patients: ${summary.hypertensive_count}`,
      ``,
      `## CKD Stage Distribution`,
      ...Object.entries(summary.stage_distribution || {}).map(([s, c]) => `Stage ${s}: ${c} patients`),
      ``,
      `## Patient List (Anonymized)`,
      ...pts.map((p: any, i: number) => `${i + 1}. ${p.district}, ${p.sex}, Age ${p.age}, Stage ${p.ckd_stage}, Risk ${p.risk_score}`),
    ].join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Cohort_${cohort.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {language === 'bn' ? 'ফলাফল ট্র্যাকিং কোহর্ট' : 'Outcome Tracking Cohorts'}
          </h1>
          <p className="text-slate-500">
            {language === 'bn' ? 'রোগীর দল তৈরি করুন এবং ফলাফল পর্যবেক্ষণ করুন' : 'Define patient cohorts and track longitudinal outcomes'}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#14556e]">
          <Plus className="w-5 h-5" />
          {language === 'bn' ? 'নতুন কোহর্ট' : 'New Cohort'}
        </button>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-medium text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> {message}
        </motion.div>
      )}

      {showForm && (
        <form onSubmit={submitCohort} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="font-bold text-slate-900">{language === 'bn' ? 'নতুন কোহর্ট তৈরি করুন' : 'Create New Cohort'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'কোহর্টের নাম' : 'Cohort Name'}</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                placeholder={language === 'bn' ? 'যেমন: রাজশাহী উচ্চ ঝুঁকি গ্রুপ' : 'e.g., Rajshahi High-Risk 2025'} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'শেষ তারিখ' : 'End Date'}</label>
              <input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'বিবরণ' : 'Description'}</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {language === 'bn' ? 'রোগী নির্বাচন করুন' : 'Select Patients'} ({formData.patient_ids.length} {language === 'bn' ? 'নির্বাচিত' : 'selected'})
            </label>
            <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3">
              {patients.map((p: any, i: number) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg">
                  <input type="checkbox" checked={formData.patient_ids.includes(p.user_id)}
                    onChange={() => togglePatient(p.user_id)} className="accent-[#1A6B8A]" />
                  <span className="text-sm text-slate-700">{p.district} · Age {p.age} · {p.sex} · Stage {p.ckd_stage}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={isSubmitting}
            className="w-full py-4 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
            {language === 'bn' ? 'কোহর্ট তৈরি করুন' : 'Create Cohort'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="font-bold text-slate-900">{language === 'bn' ? 'কোহর্টসমূহ' : 'Cohorts'}</h2>
          {cohorts.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">{language === 'bn' ? 'কোনো কোহর্ট নেই।' : 'No cohorts yet.'}</p>
            </div>
          ) : cohorts.map(c => (
            <motion.div key={c.id} whileHover={{ x: 4 }}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${selectedCohort?.id === c.id ? 'border-[#1A6B8A] bg-[#1A6B8A]/5' : 'border-slate-200 bg-white'}`}
              onClick={() => loadReport(c)}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900">{c.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{c.description}</p>
                </div>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                  {c.patient_ids?.length || 0} {language === 'bn' ? 'রোগী' : 'patients'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">{new Date(c.start_date).toLocaleDateString()}</p>
            </motion.div>
          ))}
        </div>

        <div>
          {isReportLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" /></div>
          ) : cohortReport ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-slate-900">{cohortReport.cohort?.name}</h2>
                <button onClick={downloadCohortReport} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-200">
                  <Download className="w-4 h-4" /> {language === 'bn' ? 'ডাউনলোড' : 'Download'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: language === 'bn' ? 'মোট রোগী' : 'Total Patients', value: cohortReport.summary?.total },
                  { label: language === 'bn' ? 'গড় ঝুঁকি' : 'Avg Risk', value: cohortReport.summary?.avg_risk },
                  { label: language === 'bn' ? 'ডায়াবেটিক' : 'Diabetic', value: cohortReport.summary?.diabetic_count },
                  { label: language === 'bn' ? 'উচ্চ রক্তচাপ' : 'Hypertensive', value: cohortReport.summary?.hypertensive_count },
                ].map(s => (
                  <div key={s.label} className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-2xl font-black text-slate-900">{s.value ?? '--'}</p>
                    <p className="text-xs font-semibold text-slate-400 uppercase mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-bold text-slate-900 mb-3 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-[#1A6B8A]" />{language === 'bn' ? 'পর্যায় বিতরণ' : 'Stage Distribution'}</p>
                {Object.entries(cohortReport.summary?.stage_distribution || {}).map(([s, c]: any) => (
                  <div key={s} className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-slate-600 w-16">{language === 'bn' ? 'পর্যায়' : 'Stage'} {s}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-3">
                      <div className="bg-[#1A6B8A] h-3 rounded-full" style={{ width: `${(c / cohortReport.summary.total) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-80 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
              <div className="text-center">
                <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">{language === 'bn' ? 'একটি কোহর্ট নির্বাচন করুন' : 'Select a cohort to view report'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
