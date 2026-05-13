import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, MapPin, Star, Plus, CheckCircle2, Loader2, Activity, AlertCircle, Navigation } from 'lucide-react';
import { motion } from 'motion/react';

export default function CHWDashboard() {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'patients' | 'log-visit' | 'add-patient'>('patients');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [visitForm, setVisitForm] = useState({
    visit_type: 'routine',
    notes: '',
    lat: '',
    lng: '',
    vitals: { systolic: '', diastolic: '', blood_sugar: '', creatinine: '', weight: '', edema: false, fatigue: 5, urine_protein: 'Negative' }
  });
  const [logVitals, setLogVitals] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [profRes, patientsRes, allRes, visitsRes] = await Promise.all([
        fetch('/api/chw/profile', { headers }),
        fetch('/api/chw/patients', { headers }),
        fetch('/api/chw/all-patients', { headers }),
        fetch('/api/chw/visits', { headers }),
      ]);
      setProfile(await profRes.json());
      setPatients(await patientsRes.json());
      setAllPatients(await allRes.json());
      setVisits(await visitsRes.json());
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const getGPS = () => {
    setGpsStatus('Getting location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVisitForm(v => ({ ...v, lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }));
        setGpsStatus(`📍 ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      () => setGpsStatus('Location not available')
    );
  };

  const assignPatient = async (patientId: number) => {
    const res = await fetch('/api/chw/assign-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ patient_id: patientId })
    });
    const data = await res.json();
    if (res.ok) { setMessage('Patient added to your roster!'); fetchData(); }
    else setMessage(data.error || 'Error');
  };

  const submitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) { setMessage('Select a patient first'); return; }
    setIsSubmitting(true);
    const payload: any = {
      patient_id: selectedPatient.id,
      lat: visitForm.lat ? parseFloat(visitForm.lat) : null,
      lng: visitForm.lng ? parseFloat(visitForm.lng) : null,
      visit_type: visitForm.visit_type,
      notes: visitForm.notes,
    };
    if (logVitals) payload.vitals = visitForm.vitals;

    const res = await fetch('/api/chw/log-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    setIsSubmitting(false);
    if (res.ok) {
      setMessage(language === 'bn' ? 'ভিজিট সফলভাবে লগ হয়েছে! +১০ পয়েন্ট' : 'Visit logged! +10 points');
      setVisitForm({ visit_type: 'routine', notes: '', lat: '', lng: '', vitals: { systolic: '', diastolic: '', blood_sugar: '', creatinine: '', weight: '', edema: false, fatigue: 5, urine_protein: 'Negative' } });
      setSelectedPatient(null);
      fetchData();
    }
  };

  const getRiskColor = (score: number) => {
    if (score <= 25) return 'text-emerald-600 bg-emerald-50';
    if (score <= 50) return 'text-amber-600 bg-amber-50';
    if (score <= 75) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {language === 'bn' ? 'সিএইচডব্লিউ ড্যাশবোর্ড' : 'CHW Dashboard'}
          </h1>
          <p className="text-slate-500">{language === 'bn' ? 'কমিউনিটি স্বাস্থ্যকর্মী পোর্টাল' : 'Community Health Worker Portal'} — {user?.name}</p>
        </div>
        {profile && (
          <div className="flex gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase">{language === 'bn' ? 'পয়েন্ট' : 'Points'}</p>
                <p className="text-xl font-black text-amber-700">{profile.points || 0}</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3">
              <p className="text-xs font-bold text-slate-500 uppercase">{language === 'bn' ? 'রোগী' : 'Patients'}</p>
              <p className="text-xl font-black text-slate-800">{patients.length}/30</p>
            </div>
          </div>
        )}
      </div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-medium text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> {message}
        </motion.div>
      )}

      <div className="flex border-b border-slate-200 gap-1">
        {[
          { id: 'patients', label: language === 'bn' ? 'আমার রোগীরা' : 'My Patients', icon: Users },
          { id: 'log-visit', label: language === 'bn' ? 'ভিজিট লগ করুন' : 'Log Visit', icon: Activity },
          { id: 'add-patient', label: language === 'bn' ? 'রোগী যোগ করুন' : 'Add Patient', icon: Plus },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === tab.id ? 'border-[#1A6B8A] text-[#1A6B8A]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'patients' && (
        <div className="space-y-4">
          {patients.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">{language === 'bn' ? 'এখনো কোনো রোগী নেই। রোগী যোগ করুন।' : 'No patients yet. Add patients to your roster.'}</p>
            </div>
          ) : patients.map(p => (
            <motion.div key={p.id} whileHover={{ x: 4 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-lg">{p.name?.charAt(0)}</div>
                <div>
                  <p className="font-bold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.district} · Stage {p.ckd_stage || '--'} · Age {p.age}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskColor(p.risk_score || 0)}`}>
                  {language === 'bn' ? 'ঝুঁকি' : 'Risk'} {p.risk_score || 0}
                </span>
                <button onClick={() => { setSelectedPatient(p); setActiveTab('log-visit'); }}
                  className="px-3 py-1.5 bg-[#1A6B8A] text-white text-xs font-bold rounded-lg hover:bg-[#14556e] transition-all">
                  {language === 'bn' ? 'ভিজিট লগ' : 'Log Visit'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'log-visit' && (
        <form onSubmit={submitVisit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
          <h2 className="text-xl font-bold text-slate-900">{language === 'bn' ? 'বাড়ি পরিদর্শন লগ করুন' : 'Log Home Visit'}</h2>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'রোগী নির্বাচন করুন' : 'Select Patient'}</label>
            <select value={selectedPatient?.id || ''} onChange={e => setSelectedPatient(patients.find(p => p.id === parseInt(e.target.value)) || null)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
              <option value="">{language === 'bn' ? '-- রোগী বেছে নিন --' : '-- Choose patient --'}</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.district})</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'পরিদর্শনের ধরন' : 'Visit Type'}</label>
            <select value={visitForm.visit_type} onChange={e => setVisitForm({ ...visitForm, visit_type: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
              <option value="routine">{language === 'bn' ? 'নিয়মিত পরিদর্শন' : 'Routine Visit'}</option>
              <option value="urgent">{language === 'bn' ? 'জরুরি পরিদর্শন' : 'Urgent Visit'}</option>
              <option value="medication">{language === 'bn' ? 'ওষুধ পর্যবেক্ষণ' : 'Medication Check'}</option>
              <option value="followup">{language === 'bn' ? 'ফলো-আপ' : 'Follow-up'}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              {language === 'bn' ? 'জিপিএস অবস্থান' : 'GPS Location'}
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={getGPS} className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-all">
                <MapPin className="w-4 h-4 inline mr-1" />{language === 'bn' ? 'অবস্থান নিন' : 'Get Location'}
              </button>
              {gpsStatus && <span className="flex items-center text-sm text-slate-600">{gpsStatus}</span>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'নোট' : 'Visit Notes'}</label>
            <textarea value={visitForm.notes} onChange={e => setVisitForm({ ...visitForm, notes: e.target.value })}
              rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none"
              placeholder={language === 'bn' ? 'পরিদর্শনের বিবরণ লিখুন...' : 'Describe the visit...'} />
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <input type="checkbox" id="logVitals" checked={logVitals} onChange={e => setLogVitals(e.target.checked)} className="w-5 h-5 accent-[#1A6B8A]" />
            <label htmlFor="logVitals" className="text-sm font-semibold text-slate-700">
              {language === 'bn' ? 'এই পরিদর্শনে ভাইটালস লগ করুন' : 'Log vitals during this visit'}
            </label>
          </div>

          {logVitals && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              {[
                { key: 'systolic', label: language === 'bn' ? 'সিস্টোলিক BP' : 'Systolic BP', placeholder: '120' },
                { key: 'diastolic', label: language === 'bn' ? 'ডায়াস্টোলিক BP' : 'Diastolic BP', placeholder: '80' },
                { key: 'blood_sugar', label: language === 'bn' ? 'রক্তের শর্করা' : 'Blood Sugar', placeholder: '5.6' },
                { key: 'creatinine', label: language === 'bn' ? 'ক্রিয়েটিনিন' : 'Creatinine', placeholder: '1.1' },
                { key: 'weight', label: language === 'bn' ? 'ওজন (কেজি)' : 'Weight (kg)', placeholder: '65' },
              ].map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">{field.label}</label>
                  <input type="number" step="0.01" placeholder={field.placeholder}
                    value={(visitForm.vitals as any)[field.key]}
                    onChange={e => setVisitForm({ ...visitForm, vitals: { ...visitForm.vitals, [field.key]: e.target.value } })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" />
                </div>
              ))}
              <div className="col-span-2 flex items-center gap-3">
                <input type="checkbox" id="chwEdema" checked={visitForm.vitals.edema}
                  onChange={e => setVisitForm({ ...visitForm, vitals: { ...visitForm.vitals, edema: e.target.checked } })}
                  className="w-4 h-4 accent-[#1A6B8A]" />
                <label htmlFor="chwEdema" className="text-sm text-slate-700">
                  {language === 'bn' ? 'পা ফোলা (এডিমা)' : 'Edema / Swelling present'}
                </label>
              </div>
            </div>
          )}

          <button type="submit" disabled={isSubmitting || !selectedPatient}
            className="w-full py-4 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#14556e] transition-all disabled:opacity-50">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {language === 'bn' ? 'ভিজিট জমা দিন' : 'Submit Visit'}
          </button>
        </form>
      )}

      {activeTab === 'add-patient' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {language === 'bn' ? `আপনার রোস্টারে ${patients.length}/30 জন রোগী আছেন।` : `You have ${patients.length}/30 patients in your roster.`}
          </p>
          {allPatients.filter(p => !patients.find(mp => mp.id === p.id)).map(p => (
            <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500">{p.district} · Stage {p.ckd_stage || '--'} · Risk {p.risk_score || 0}</p>
              </div>
              <button onClick={() => assignPatient(p.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${patients.length >= 30 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#1A6B8A] text-white hover:bg-[#14556e]'}`}
                disabled={patients.length >= 30}>
                <Plus className="w-4 h-4 inline mr-1" />
                {language === 'bn' ? 'যোগ করুন' : 'Add'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#1A6B8A]" />
          {language === 'bn' ? 'সাম্প্রতিক পরিদর্শন' : 'Recent Visits'}
        </h3>
        <div className="space-y-3">
          {visits.slice(0, 5).map(v => (
            <div key={v.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{v.patient_name}</p>
                <p className="text-xs text-slate-500">{v.visit_type} · {new Date(v.timestamp).toLocaleDateString()}</p>
              </div>
              {v.lat && <div className="flex items-center gap-1 text-xs text-emerald-600"><MapPin className="w-3 h-3" /> GPS ✓</div>}
            </div>
          ))}
          {visits.length === 0 && <p className="text-sm text-slate-400 text-center py-4">{language === 'bn' ? 'কোনো পরিদর্শন নেই।' : 'No visits logged yet.'}</p>}
        </div>
      </div>

      {profile && profile.points >= 100 && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-400 to-orange-500 text-white p-6 rounded-3xl text-center shadow-lg">
          <Star className="w-10 h-10 mx-auto mb-2" />
          <p className="text-xl font-black">
            {language === 'bn' ? '🏆 চমৎকার পারফরম্যান্স!' : '🏆 Outstanding Performance!'}
          </p>
          <p className="text-sm opacity-90 mt-1">{profile.points} {language === 'bn' ? 'পয়েন্ট অর্জিত হয়েছে' : 'points earned this month'}</p>
        </motion.div>
      )}
    </div>
  );
}
