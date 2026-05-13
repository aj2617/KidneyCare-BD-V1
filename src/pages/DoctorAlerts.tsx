import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Bell, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function DoctorAlerts() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/doctor/alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAlerts(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (alertId?: number) => {
    try {
      await fetch('/api/doctor/alerts/read', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ alertId }),
      });
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('doctor.alerts')}</h1>
          <p className="text-slate-500">Monitor critical patient events and system notifications</p>
        </div>
        <button 
          onClick={() => markAsRead()}
          className="px-4 py-2 text-sm font-bold text-[#1A6B8A] hover:bg-[#1A6B8A]/5 rounded-xl transition-all flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          Mark All as Read
        </button>
      </div>

      <div className="space-y-4">
        {alerts.length > 0 ? alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-3xl border transition-all ${
              alert.is_read 
                ? 'bg-white border-slate-100 opacity-75' 
                : alert.type === 'CRITICAL' 
                  ? 'bg-red-50 border-red-100 shadow-sm' 
                  : 'bg-amber-50 border-amber-100 shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${
                  alert.type === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                      alert.type === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                    }`}>
                      {alert.type}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {new Date(alert.triggered_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{alert.patient_name}</h3>
                  <p className="text-slate-600 leading-relaxed">{alert.message}</p>
                </div>
              </div>
              
              {!alert.is_read && (
                <button 
                  onClick={() => markAsRead(alert.id)}
                  className="p-2 text-slate-400 hover:text-[#1A6B8A] transition-colors"
                  title="Mark as read"
                >
                  <CheckCircle2 className="w-6 h-6" />
                </button>
              )}
            </div>
          </motion.div>
        )) : (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No alerts found. Everything looks good!</p>
          </div>
        )}
      </div>
    </div>
  );
}
