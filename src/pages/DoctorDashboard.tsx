import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, Search, Bell, Filter, ChevronRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function DoctorDashboard({ onSelectPatient }: { onSelectPatient: (id: number) => void }) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [patients, setPatients] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, [assignedOnly]);

  const fetchData = async () => {
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const [pRes, aRes] = await Promise.all([
        fetch(`/api/doctor/patients?assignedOnly=${assignedOnly}`, { headers }),
        fetch('/api/doctor/alerts', { headers })
      ]);
      setPatients(await pRes.json());
      setAlerts(await aRes.json());
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
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.district.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = !filterStage || p.ckd_stage === parseInt(filterStage);
    return matchesSearch && matchesStage;
  });

  const getRiskBadge = (score: number) => {
    if (score <= 25) return 'bg-emerald-100 text-emerald-700';
    if (score <= 50) return 'bg-amber-100 text-amber-700';
    if (score <= 75) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('doctor.patients')}</h1>
          <p className="text-slate-500">Manage your assigned patients and monitor their progress</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button
            onClick={() => setAssignedOnly(!assignedOnly)}
            className={`px-4 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
              assignedOnly ? 'bg-[#1A6B8A] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            {assignedOnly ? 'My Patients' : 'All Patients'}
          </button>
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#1A6B8A]/20"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 border rounded-2xl transition-all ${
                showFilters || filterStage ? 'bg-[#1A6B8A] border-[#1A6B8A] text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-6 h-6" />
            </button>
            
            {showFilters && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-10 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase">Filter by Stage</p>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4, 5].map(stage => (
                    <button
                      key={stage}
                      onClick={() => setFilterStage(filterStage === stage.toString() ? null : stage.toString())}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filterStage === stage.toString() ? 'bg-[#1A6B8A] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Stage {stage}
                    </button>
                  ))}
                </div>
                {filterStage && (
                  <button 
                    onClick={() => setFilterStage(null)}
                    className="w-full text-center text-[10px] font-bold text-red-500 hover:underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Patient List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredPatients.length > 0 ? filteredPatients.map((patient) => (
            <motion.div
              key={patient.id}
              whileHover={{ x: 4 }}
              onClick={() => onSelectPatient(patient.id)}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-lg">
                  {patient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-[#1A6B8A] transition-colors">{patient.name}</h3>
                  <p className="text-xs text-slate-500">{patient.district}, {patient.sex}, {patient.age}y</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">CKD Stage</p>
                  <p className="font-black text-slate-700">Stage {patient.ckd_stage || '--'}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskBadge(patient.risk_score)}`}>
                  Risk: {patient.risk_score || 0}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#1A6B8A] transition-colors" />
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No patients found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Alerts Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#1A6B8A]" />
                {t('doctor.alerts')}
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-md">
                  {alerts.filter(a => !a.is_read).length} NEW
                </span>
                {alerts.some(a => !a.is_read) && (
                  <button 
                    onClick={() => markAsRead()}
                    className="text-[10px] font-bold text-[#1A6B8A] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              {alerts.length > 0 ? alerts.filter(a => !a.is_read).slice(0, 5).map((alert) => (
                <div key={alert.id} className={`p-4 rounded-2xl border relative group ${
                  alert.type === 'CRITICAL' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                }`}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); markAsRead(alert.id); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-[#1A6B8A]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`w-5 h-5 shrink-0 ${
                      alert.type === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'
                    }`} />
                    <div>
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">{alert.type}</p>
                      <p className="text-sm font-bold text-slate-800 mb-1">{alert.patient_name}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{alert.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{new Date(alert.triggered_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm">No new alerts.</p>
                </div>
              )}
              {alerts.length > 5 && (
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'doctor-alerts' }))}
                  className="w-full text-center text-xs font-bold text-[#1A6B8A] hover:underline"
                >
                  View all alerts
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
