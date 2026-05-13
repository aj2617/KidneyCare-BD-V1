import { useState } from 'react';
import { Activity, Mail, Lock, User, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

const DISTRICTS_BY_DIVISION: Record<string, string[]> = {
  Dhaka: ['Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail'],
  Chittagong: ['Bandarban', 'Brahmanbaria', 'Chandpur', 'Chittagong', 'Comilla', "Cox's Bazar", 'Feni', 'Khagrachari', 'Lakshmipur', 'Noakhali', 'Rangamati'],
  Rajshahi: ['Bogra', 'Joypurhat', 'Naogaon', 'Natore', 'Chapainawabganj', 'Pabna', 'Rajshahi', 'Sirajganj'],
  Khulna: ['Bagerhat', 'Chuadanga', 'Jessore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
  Barisal: ['Barguna', 'Barisal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'],
  Sylhet: ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'],
  Rangpur: ['Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon'],
  Mymensingh: ['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'],
};

const DIVISIONS = Object.keys(DISTRICTS_BY_DIVISION);

const ROLES = [
  { value: 'patient', label: 'Patient', labelBn: 'রোগী', desc: 'Track your CKD health journey' },
  { value: 'doctor', label: 'Doctor', labelBn: 'ডাক্তার', desc: 'Manage and monitor patients' },
  { value: 'chw', label: 'Community Health Worker', labelBn: 'কমিউনিটি স্বাস্থ্যকর্মী', desc: 'Register and visit patients in rural areas' },
];

export default function Register({ onLogin }: { onLogin: () => void }) {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'patient', division: '', district: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const availableDistricts = formData.division ? DISTRICTS_BY_DIVISION[formData.division] ?? [] : [];

  const handleDivisionChange = (division: string) => {
    setFormData(c => ({ ...c, division, district: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        onLogin();
      } else {
        const data = await res.json();
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1A6B8A]/10 rounded-2xl text-[#1A6B8A] mb-4">
            <Activity className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Create Account</h2>
          <p className="text-slate-500 mt-2">Join the KidneyCare BD community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{error}</div>}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Role</label>
            <div className="grid grid-cols-1 gap-2">
              {ROLES.map(r => (
                <label key={r.value} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.role === r.value ? 'border-[#1A6B8A] bg-[#1A6B8A]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="role" value={r.value} checked={formData.role === r.value}
                    onChange={() => setFormData({ ...formData, role: r.value })} className="accent-[#1A6B8A]" />
                  <div>
                    <p className="font-bold text-slate-900">{r.label} <span className="text-slate-400 font-normal">— {r.labelBn}</span></p>
                    <p className="text-xs text-slate-500">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A]"
                  placeholder="Enter your name" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A]"
                  placeholder="name@example.com" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A]"
                  placeholder="••••••••" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Division</label>
              <select required value={formData.division} onChange={e => handleDivisionChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A]">
                <option value="">Select Division</option>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">District</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select required disabled={!formData.division} value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
                  <option value="">{formData.division ? 'Select District' : 'Select Division First'}</option>
                  {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full py-4 bg-[#1A6B8A] text-white rounded-xl font-bold hover:bg-[#14556e] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-500">
            Already have an account?{' '}
            <button onClick={onLogin} className="text-[#1A6B8A] font-bold hover:underline">Sign In</button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
