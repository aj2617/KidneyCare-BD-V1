import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Mail, Lock, ArrowRight, Loader2, Zap } from 'lucide-react';
import { motion } from 'motion/react';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@kidneycare.bd', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200' },
  { label: 'Doctor', email: 'doctor@kidneycare.bd', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200' },
  { label: 'CHW', email: 'chw@kidneycare.bd', color: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' },
  { label: 'Patient', email: 'patient_dhaka1@kidneycare.bd', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200' },
];

export default function Login({ onRegister }: { onRegister: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const doLogin = async (e: string, p: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, password: p }),
    });
    const data = await res.json();
    if (res.ok) {
      login(data.token, data.user);
    } else {
      setError(data.error || 'Login failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await doLogin(email, password);
    } catch {
      setError('Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, label: string) => {
    setDemoLoading(label);
    setError('');
    try {
      await doLogin(demoEmail, 'password123');
    } catch {
      setError('Connection failed');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1A6B8A]/10 rounded-2xl text-[#1A6B8A] mb-4">
            <Activity className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
          <p className="text-slate-500 mt-2">Sign in to your KidneyCare account</p>
        </div>

        {/* Demo Quick Login */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-700">Demo — one-click login</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(({ label, email: demoEmail, color }) => (
              <button
                key={label}
                onClick={() => handleDemoLogin(demoEmail, label)}
                disabled={!!demoLoading || isLoading}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${color}`}
              >
                {demoLoading === label
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : label}
              </button>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-2 text-center">Password for all accounts: <span className="font-mono font-bold">password123</span></p>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">or sign in manually</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] transition-all"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !!demoLoading}
            className="w-full py-4 bg-[#1A6B8A] text-white rounded-xl font-bold hover:bg-[#14556e] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-500">
            Don't have an account?{' '}
            <button
              onClick={onRegister}
              className="text-[#1A6B8A] font-bold hover:underline"
            >
              Register Now
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
