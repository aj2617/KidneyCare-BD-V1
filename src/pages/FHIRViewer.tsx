import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Cpu, Download, RefreshCw, Loader2, CheckCircle2, Users } from 'lucide-react';
import { motion } from 'motion/react';

export default function FHIRViewer() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [fhirPatient, setFhirPatient] = useState<any>(null);
  const [fhirObs, setFhirObs] = useState<any>(null);
  const [fhirCond, setFhirCond] = useState<any>(null);
  const [dhis2Data, setDhis2Data] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'patient' | 'observation' | 'condition' | 'dhis2'>('patient');
  const [isLoading, setIsLoading] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);

  useEffect(() => {
    fetchPatients();
    fetchAdminStats();
    fetchDHIS2();
  }, []);

  const fetchPatients = async () => {
    const res = await fetch('/api/admin/export-research-data', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setPatients(d.slice(0, 20)); }
  };

  const fetchAdminStats = async () => {
    const res = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setAdminStats(await res.json());
  };

  const fetchDHIS2 = async () => {
    const res = await fetch('/api/admin/dhis2-export', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setDhis2Data(await res.json());
  };

  const loadFHIR = async (patient: any) => {
    setSelectedPatient(patient);
    setIsLoading(true);
    const pid = patient.user_id;
    try {
      const [patRes, obsRes, condRes] = await Promise.all([
        fetch(`/api/fhir/Patient/${pid}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/fhir/Observation?patient=${pid}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/fhir/Condition?patient=${pid}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setFhirPatient(await patRes.json());
      setFhirObs(await obsRes.json());
      setFhirCond(await condRes.json());
    } catch { /* offline */ }
    finally { setIsLoading(false); }
  };

  const downloadDHIS2 = () => {
    if (!dhis2Data) return;
    const blob = new Blob([JSON.stringify(dhis2Data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `KidneyCareBD_DHIS2_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadFHIR = (resource: any, name: string) => {
    const blob = new Blob([JSON.stringify(resource, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `FHIR_${name}_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {language === 'bn' ? 'এফএইচআইআর ও ইন্টারঅপারেবিলিটি' : 'FHIR R4 & Interoperability'}
          </h1>
          <p className="text-slate-500">
            {language === 'bn'
              ? 'হাসপাতাল ইএমআর এবং জাতীয় স্বাস্থ্য সিস্টেমের সাথে ডেটা আদান-প্রদান'
              : 'Export patient data in FHIR R4 format for EMR/hospital interoperability and DHIS2 for national reporting'}
          </p>
        </div>
        <button onClick={downloadDHIS2} disabled={!dhis2Data}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50">
          <Download className="w-5 h-5" />
          {language === 'bn' ? 'DHIS2 এক্সপোর্ট' : 'Export DHIS2 JSON'}
        </button>
      </div>

      {adminStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: language === 'bn' ? 'মোট রোগী' : 'Total Patients', value: adminStats.total_patients },
            { label: language === 'bn' ? 'ডাক্তার' : 'Doctors', value: adminStats.total_doctors },
            { label: language === 'bn' ? 'স্বাস্থ্যকর্মী' : 'CHW Workers', value: adminStats.total_chw },
            { label: language === 'bn' ? 'উচ্চ ঝুঁকি' : 'High Risk', value: adminStats.high_risk_patients },
          ].map(s => (
            <div key={s.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-2xl font-black text-slate-900">{s.value ?? '--'}</p>
              <p className="text-xs font-semibold text-slate-400 uppercase mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1A6B8A]" />
            {language === 'bn' ? 'রোগী নির্বাচন করুন' : 'Select Patient'}
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {patients.map((p, i) => (
              <motion.div key={i} whileHover={{ x: 4 }}
                onClick={() => loadFHIR(p)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedPatient?.user_id === p.user_id ? 'border-[#1A6B8A] bg-[#1A6B8A]/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <p className="font-bold text-slate-900 text-sm">Patient #{p.user_id}</p>
                <p className="text-xs text-slate-500">{p.district} · Stage {p.ckd_stage} · Age {p.age}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" /></div>
          ) : selectedPatient ? (
            <>
              <div className="flex border-b border-slate-200 gap-1">
                {[
                  { id: 'patient', label: 'Patient' },
                  { id: 'observation', label: 'Observations' },
                  { id: 'condition', label: 'Conditions' },
                  { id: 'dhis2', label: 'DHIS2' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id ? 'border-[#1A6B8A] text-[#1A6B8A]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="bg-slate-900 rounded-2xl p-6 overflow-auto max-h-96">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-400 text-xs ml-2 font-mono">FHIR R4 JSON</span>
                  </div>
                  <button onClick={() => {
                    const resource = activeTab === 'patient' ? fhirPatient : activeTab === 'observation' ? fhirObs : activeTab === 'condition' ? fhirCond : dhis2Data;
                    if (resource) downloadFHIR(resource, activeTab);
                  }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-600">
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
                <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap overflow-auto">
                  {JSON.stringify(
                    activeTab === 'patient' ? fhirPatient :
                    activeTab === 'observation' ? fhirObs :
                    activeTab === 'condition' ? fhirCond :
                    dhis2Data,
                    null, 2
                  )}
                </pre>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-800">
                    {language === 'bn' ? 'এফএইচআইআর R4 সামঞ্জস্যপূর্ণ' : 'FHIR R4 Compatible'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {language === 'bn'
                      ? 'এই ডেটা যেকোনো FHIR R4 সামঞ্জস্যপূর্ণ হাসপাতাল সিস্টেমে আমদানি করা যাবে।'
                      : 'This data can be imported into any FHIR R4 compatible hospital EMR or lab system.'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-80 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
              <div className="text-center">
                <Cpu className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {language === 'bn' ? 'FHIR ডেটা দেখতে একজন রোগী নির্বাচন করুন' : 'Select a patient to view their FHIR R4 resources'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {dhis2Data && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">
            {language === 'bn' ? 'DHIS2 জেলা-ভিত্তিক সারসংক্ষেপ' : 'DHIS2 District-level CKD Indicators'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dhis2Data.dataValues?.slice(0, 8).map((dv: any, i: number) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 text-sm">{dv.orgUnit}</p>
                <p className="text-xs text-slate-500">Patients: {dv.value}</p>
                <p className="text-xs text-slate-400">{dv.comment}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {language === 'bn' ? `মোট ${dhis2Data.dataValues?.length} জেলার ডেটা • ${dhis2Data.format}` : `${dhis2Data.dataValues?.length} districts · ${dhis2Data.format}`}
          </p>
        </div>
      )}
    </div>
  );
}
