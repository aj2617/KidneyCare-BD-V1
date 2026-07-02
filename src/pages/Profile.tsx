import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Scale, Calendar, Shield, Loader2, CheckCircle2, Phone, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';
import ForcedSurveyOverlay from '../components/ForcedSurveyOverlay';

export default function Profile() {
  const { token, user } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
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
  const [surveyCompleted, setSurveyCompleted] = useState<boolean | null>(null);
  const [surveyHasDraft, setSurveyHasDraft] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/patient/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      fetch('/api/patient/survey/status', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(async res => res.ok ? res.json() : { completed: true }).catch(() => ({ completed: true })),
    ])
      .then(([data, survey]) => {
        if (data) {
          setProfileData(data);
          setFormData({
            age: data.age || '',
            sex: data.sex || 'male',
            weight: data.weight || '',
            diabetes: !!data.diabetes,
            hypertension: !!data.hypertension,
            family_history: !!data.family_history,
            caregiver_phone: data.caregiver_phone || '',
          });
          setIsEditing(!data.age || !data.weight || !data.sex);
        }
        setSurveyCompleted(!!survey?.completed);
        setSurveyHasDraft(!!survey?.hasDraft);
      })
      .finally(() => setIsLoading(false));
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
        const savedProfile = {
          ...formData,
          age: parseInt(formData.age as string),
          weight: parseFloat(formData.weight as string)
        };
        setProfileData(savedProfile);
        setIsEditing(false);
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
    <div className="app-shell px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-4xl">
      {showSurvey && (
        <ForcedSurveyOverlay
          token={token}
          patientName={user?.name || ''}
          onComplete={() => { setSurveyCompleted(true); setSurveyHasDraft(false); setShowSurvey(false); }}
        />
      )}

      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Health Profile</h1>
        <p className="text-slate-500 mt-2">Complete your profile for more accurate risk scoring and GFR calculations.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: surveyCompleted ? '#EAFAF1' : '#EFF8FB', color: surveyCompleted ? '#1a7a44' : '#1A6B8A' }}
            >
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Health Survey</p>
              <h2 className="text-lg font-black text-slate-900">
                {surveyCompleted ? 'Survey completed' : surveyHasDraft ? 'Survey in progress' : 'Survey pending'}
              </h2>
              <p className="text-sm text-slate-500">
                {surveyCompleted
                  ? 'You can review or update your survey answers anytime.'
                  : surveyHasDraft
                    ? 'Your answers are saved automatically. Continue where you left off.'
                    : 'Complete the survey to improve risk scoring and care guidance.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSurvey(true)}
            className="shrink-0 px-4 py-2.5 rounded-2xl text-sm font-bold text-white transition-colors"
            style={{ background: surveyCompleted ? '#1A6B8A' : '#F39C12' }}
          >
            {surveyCompleted ? 'Open Survey' : surveyHasDraft ? 'Continue Survey' : 'Complete Survey'}
          </button>
        </div>
      </motion.div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {message && (
          <div className="p-4 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: '#EAFAF1', color: '#1a7a44' }}>
            <CheckCircle2 className="w-5 h-5" />
            {message}
          </div>
        )}

        {!isEditing ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Saved profile</p>
                <h2 className="text-xl font-black text-slate-900">Your details</h2>
                <p className="text-sm text-slate-500 mt-1">We use these values for risk scoring and calculations.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2.5 rounded-2xl text-sm font-bold text-white bg-[#1A6B8A] hover:bg-[#14556e] transition-colors"
              >
                Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Age', value: profileData?.age ?? 'Not set', icon: Calendar },
                { label: 'Weight (kg)', value: profileData?.weight ?? 'Not set', icon: Scale },
                { label: 'Sex', value: profileData?.sex ? String(profileData.sex).charAt(0).toUpperCase() + String(profileData.sex).slice(1) : 'Not set', icon: User },
                { label: 'Caregiver phone', value: profileData?.caregiver_phone || 'Not set', icon: Phone },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                    <Icon className="w-4 h-4 text-[#1A6B8A]" />
                    {label}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#1A6B8A]" /> Health Conditions
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Diabetes', value: profileData?.diabetes },
                  { label: 'Hypertension', value: profileData?.hypertension },
                  { label: 'Family history of kidney disease', value: profileData?.family_history },
                ].map(item => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                    <p className={`text-sm font-bold mt-1 ${item.value ? 'text-[#1a7a44]' : 'text-slate-400'}`}>
                      {item.value ? 'Yes' : 'No'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Edit profile</p>
                <h2 className="text-xl font-black text-slate-900">Update your details</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>

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
        )}
      </div>
    </div>
  );
}
