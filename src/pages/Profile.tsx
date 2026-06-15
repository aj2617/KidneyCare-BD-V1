import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { User, Scale, Calendar, Shield, Loader2, CheckCircle2, Phone } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    age: '',
    sex: 'male',
    weight: '',
    diabetes: false,
    hypertension: false,
    family_history: false,
    caregiver_phone: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/patient/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          setFormData({
            age: data.age || '',
            sex: data.sex || 'male',
            weight: data.weight || '',
            diabetes: !!data.diabetes,
            hypertension: !!data.hypertension,
            family_history: !!data.family_history,
            caregiver_phone: data.caregiver_phone || '',
          });
        }
        setIsLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/patient/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          age: parseInt(formData.age as string),
          weight: parseFloat(formData.weight as string)
        }),
      });
      if (res.ok) {
        setMessage('Profile updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Health Profile</h1>
        <p className="text-slate-500 mt-2">Complete your profile for more accurate risk scoring and GFR calculations.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {message && (
            <div className="p-4 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: '#EAFAF1', color: '#1a7a44' }}>
              <CheckCircle2 className="w-5 h-5" />
              {message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Age
              </label>
              <input
                type="number"
                required
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20"
                placeholder="45"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Scale className="w-4 h-4" /> Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20"
                placeholder="70"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4" /> Sex
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, sex: 'male' })}
                className={`py-3 rounded-xl border font-medium transition-all ${
                  formData.sex === 'male' ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, sex: 'female' })}
                className={`py-3 rounded-xl border font-medium transition-all ${
                  formData.sex === 'female' ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Female
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#1A6B8A]" /> Health Conditions
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.diabetes}
                  onChange={(e) => setFormData({ ...formData, diabetes: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-[#1A6B8A] focus:ring-[#1A6B8A]"
                />
                <span className="text-sm font-medium text-slate-700">Do you have Diabetes?</span>
              </label>

              <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.hypertension}
                  onChange={(e) => setFormData({ ...formData, hypertension: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-[#1A6B8A] focus:ring-[#1A6B8A]"
                />
                <span className="text-sm font-medium text-slate-700">Do you have Hypertension (High BP)?</span>
              </label>

              <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.family_history}
                  onChange={(e) => setFormData({ ...formData, family_history: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-[#1A6B8A] focus:ring-[#1A6B8A]"
                />
                <span className="text-sm font-medium text-slate-700">Any family history of Kidney Disease?</span>
              </label>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Phone className="w-5 h-5 text-[#1A6B8A]" /> Caregiver Contact
            </h3>
            <label className="text-sm font-semibold text-slate-700">Caregiver Phone Number</label>
            <input
              type="tel"
              value={formData.caregiver_phone}
              onChange={(e) => setFormData({ ...formData, caregiver_phone: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20"
              placeholder="+880 1700-000000"
            />
            <p className="text-xs text-slate-400">Your caregiver will be notified if you miss logging for 3+ days.</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#14556e] transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
}
