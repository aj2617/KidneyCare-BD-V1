import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FileText, Plus, Loader2, QrCode, Trash2, Printer, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export default function Prescriptions() {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRx, setSelectedRx] = useState<any>(null);
  const [formData, setFormData] = useState({
    patient_id: '',
    medicines: [{ name: '', dosage: '', frequency: '', duration: '' }] as Medicine[],
    notes: '',
    language: 'bn',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [rxRes, patRes] = await Promise.all([
        fetch('/api/prescriptions', { headers }),
        user?.role === 'doctor' ? fetch('/api/doctor/patients', { headers }) : Promise.resolve({ json: () => [] }),
      ]);
      setPrescriptions(await rxRes.json());
      if (user?.role === 'doctor') setPatients(await patRes.json());
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const addMedicine = () => setFormData(f => ({ ...f, medicines: [...f.medicines, { name: '', dosage: '', frequency: '', duration: '' }] }));
  const removeMedicine = (i: number) => setFormData(f => ({ ...f, medicines: f.medicines.filter((_, idx) => idx !== i) }));
  const updateMedicine = (i: number, field: keyof Medicine, value: string) => {
    setFormData(f => ({ ...f, medicines: f.medicines.map((m, idx) => idx === i ? { ...m, [field]: value } : m) }));
  };

  const submitPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await fetch('/api/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData),
    });
    setIsSubmitting(false);
    if (res.ok) {
      setMessage(language === 'bn' ? 'প্রেসক্রিপশন তৈরি হয়েছে!' : 'Prescription created!');
      setShowForm(false);
      setFormData({ patient_id: '', medicines: [{ name: '', dosage: '', frequency: '', duration: '' }], notes: '', language: 'bn' });
      fetchData();
    }
  };

  const printPrescription = (rx: any) => {
    const medicines = Array.isArray(rx.medicines) ? rx.medicines : [];
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Prescription - ${rx.patient_name}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto}
      h1{color:#1A6B8A;border-bottom:2px solid #1A6B8A;padding-bottom:10px}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{border:1px solid #ddd;padding:10px;text-align:left}
      th{background:#f5f5f5}.qr{text-align:center;margin-top:20px;padding:10px;border:1px solid #eee;border-radius:8px}
      .footer{margin-top:30px;font-size:12px;color:#666;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <h1>🏥 KidneyCare BD</h1>
      <p><strong>${language === 'bn' ? 'রোগীর নাম' : 'Patient'}:</strong> ${rx.patient_name}</p>
      <p><strong>${language === 'bn' ? 'ডাক্তার' : 'Doctor'}:</strong> ${rx.doctor_name || user?.name}</p>
      <p><strong>${language === 'bn' ? 'তারিখ' : 'Date'}:</strong> ${new Date(rx.date).toLocaleDateString()}</p>
      <table>
        <tr><th>${language === 'bn' ? 'ওষুধ' : 'Medicine'}</th><th>${language === 'bn' ? 'ডোজ' : 'Dosage'}</th><th>${language === 'bn' ? 'সময়' : 'Frequency'}</th><th>${language === 'bn' ? 'মেয়াদ' : 'Duration'}</th></tr>
        ${medicines.map((m: Medicine) => `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td></tr>`).join('')}
      </table>
      ${rx.notes ? `<p style="margin-top:15px"><strong>${language === 'bn' ? 'নোট' : 'Notes'}:</strong> ${rx.notes}</p>` : ''}
      <div class="qr"><strong>QR Code:</strong> ${rx.qr_code}</div>
      <div class="footer">KidneyCare BD — Digital Health Monitoring System for CKD Patients in Bangladesh</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {language === 'bn' ? 'ডিজিটাল প্রেসক্রিপশন' : 'Digital Prescriptions'}
          </h1>
          <p className="text-slate-500">{language === 'bn' ? 'কিউআর কোড সহ ই-প্রেসক্রিপশন' : 'E-prescriptions with QR code for pharmacy scanning'}</p>
        </div>
        {user?.role === 'doctor' && (
          <button onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#14556e] transition-all">
            <Plus className="w-5 h-5" />
            {language === 'bn' ? 'নতুন প্রেসক্রিপশন' : 'New Prescription'}
          </button>
        )}
      </div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-medium text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> {message}
        </motion.div>
      )}

      <AnimatePresence>
        {showForm && user?.role === 'doctor' && (
          <motion.form initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            onSubmit={submitPrescription} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900">{language === 'bn' ? 'প্রেসক্রিপশন তৈরি করুন' : 'Create Prescription'}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'রোগী' : 'Patient'}</label>
                <select required value={formData.patient_id} onChange={e => setFormData({ ...formData, patient_id: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="">{language === 'bn' ? '-- রোগী বেছে নিন --' : '-- Select patient --'}</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'ভাষা' : 'Language'}</label>
                <select value={formData.language} onChange={e => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="bn">বাংলা</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'ওষুধসমূহ' : 'Medicines'}</label>
                <button type="button" onClick={addMedicine} className="text-sm text-[#1A6B8A] font-bold hover:underline flex items-center gap-1">
                  <Plus className="w-4 h-4" /> {language === 'bn' ? 'ওষুধ যোগ করুন' : 'Add medicine'}
                </button>
              </div>
              {formData.medicines.map((med, i) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl relative">
                  {formData.medicines.length > 1 && (
                    <button type="button" onClick={() => removeMedicine(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {[
                    { key: 'name', placeholder: language === 'bn' ? 'ওষুধের নাম' : 'Medicine name' },
                    { key: 'dosage', placeholder: language === 'bn' ? 'ডোজ (যেমন: ৫০০mg)' : 'Dosage (e.g., 500mg)' },
                    { key: 'frequency', placeholder: language === 'bn' ? 'কতবার (যেমন: দিনে ২বার)' : 'Frequency (e.g., twice daily)' },
                    { key: 'duration', placeholder: language === 'bn' ? 'মেয়াদ (যেমন: ৭ দিন)' : 'Duration (e.g., 7 days)' },
                  ].map(f => (
                    <input key={f.key} type="text" placeholder={f.placeholder} value={(med as any)[f.key]}
                      onChange={e => updateMedicine(i, f.key as keyof Medicine, e.target.value)}
                      className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm" />
                  ))}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'বিশেষ নির্দেশনা' : 'Special Instructions'}</label>
              <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none text-sm"
                placeholder={language === 'bn' ? 'অতিরিক্ত নির্দেশনা...' : 'Additional notes...'} />
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full py-4 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#14556e] disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              {language === 'bn' ? 'প্রেসক্রিপশন তৈরি করুন' : 'Create Prescription'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {prescriptions.length === 0 ? (
          <div className="md:col-span-2 text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{language === 'bn' ? 'কোনো প্রেসক্রিপশন নেই।' : 'No prescriptions yet.'}</p>
          </div>
        ) : prescriptions.map(rx => (
          <motion.div key={rx.id} whileHover={{ y: -2 }}
            className={`bg-white p-6 rounded-3xl border shadow-sm cursor-pointer transition-all ${selectedRx?.id === rx.id ? 'border-[#1A6B8A] ring-2 ring-[#1A6B8A]/20' : 'border-slate-200'}`}
            onClick={() => setSelectedRx(selectedRx?.id === rx.id ? null : rx)}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-bold text-slate-900">{rx.patient_name || rx.doctor_name}</p>
                <p className="text-xs text-slate-500">{new Date(rx.date).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={e => { e.stopPropagation(); printPrescription(rx); }}
                  className="p-2 text-slate-400 hover:text-[#1A6B8A] transition-colors" title={language === 'bn' ? 'প্রিন্ট করুন' : 'Print'}>
                  <Printer className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {(rx.medicines || []).slice(0, 3).map((m: Medicine, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-[#1A6B8A]" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.dosage} · {m.frequency} · {m.duration}</p>
                  </div>
                </div>
              ))}
              {rx.medicines?.length > 3 && <p className="text-xs text-slate-400 pl-5">+{rx.medicines.length - 3} more medicines</p>}
            </div>

            {selectedRx?.id === rx.id && rx.qr_code && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                <QrCode className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-xs font-bold text-blue-700">{language === 'bn' ? 'ফার্মেসি QR কোড' : 'Pharmacy QR Code'}</p>
                  <p className="text-sm font-mono text-blue-600">{rx.qr_code}</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
