import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  AlertCircle, Download, FileText, Loader2, Map as MapIcon, Users,
  BarChart2, Calculator, Activity, TrendingUp, Shield, CheckCircle2,
  XCircle, Search, Plus, ChevronRight, Layers, RefreshCw, Globe2,
  UserCheck, UserX, Building2, X
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

type AdminTab = 'overview' | 'map' | 'reports' | 'simulator' | 'cohorts' | 'users';
type HeatmapRow = { district: string; count: number; avg_risk: number | null };
type PolicyReport = { id: string; title: string; desc: string; date: string; filename: string; content: string };
type MapLayer = 'density' | 'risk';

const DISTRICTS_COORDS: Record<string, [number, number]> = {
  Dhaka: [23.8103, 90.4125], Chittagong: [22.3569, 91.7832], Rajshahi: [24.3745, 88.6042],
  Khulna: [22.8456, 89.5403], Barisal: [22.701, 90.3535], Sylhet: [24.8949, 91.8687],
  Rangpur: [25.7439, 89.2752], Mymensingh: [24.7471, 90.4203], Gazipur: [24.0023, 90.4264],
  Narayanganj: [23.6238, 90.5], Chapainawabganj: [24.5963, 88.2765], Noakhali: [22.8696, 91.0995],
  Comilla: [23.4607, 91.1809], Rajbari: [23.7574, 89.6435], Faridpur: [23.6070, 89.8421],
};

const DISTRICTS_SIM = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh', 'Gazipur', 'Narayanganj', 'Comilla', 'Bogra', 'Dinajpur'];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-[#1A6B8A]/10 text-[#1A6B8A]',
  doctor: 'bg-[#1A6B8A]/10 text-[#1A6B8A]',
  patient: 'bg-[#EAFAF1] text-[#1a7a44]',
  chw: 'bg-[#EAFAF1] text-[#1a7a44]',
};

function downloadTextFile(content: string, filename: string, type = 'text/markdown;charset=utf-8;') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click();
  document.body.removeChild(link); URL.revokeObjectURL(url);
}

function generateSparkline(total: number, days = 30): { day: string; value: number }[] {
  const data = [];
  let val = Math.max(0, total - Math.floor(total * 0.18));
  for (let i = 0; i < days; i++) {
    val += Math.floor(Math.random() * 3);
    data.push({ day: `D${i + 1}`, value: val });
  }
  data[data.length - 1].value = total;
  return data;
}

function KpiCard({ label, value, sub, color, icon: Icon, sparkData, trend }:
  { label: string; value: string | number; sub?: string; color: string; icon: any; sparkData?: any[]; trend?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#EAFAF1', color: '#1a7a44' }}>
            <TrendingUp className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        <p className="text-xs font-semibold text-slate-400 uppercase mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      {sparkData && (
        <div className="h-10 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A6B8A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1A6B8A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="#1A6B8A" strokeWidth={1.5}
                fill={`url(#grad-${label})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ initialTab = 'overview' }: { initialTab?: AdminTab }) {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  const [heatmapData, setHeatmapData] = useState<HeatmapRow[]>([]);
  const [chwPoints, setChwPoints] = useState<any[]>([]);
  const [reports, setReports] = useState<PolicyReport[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [mapLayer, setMapLayer] = useState<MapLayer>('density');
  const [selectedDistrict, setSelectedDistrict] = useState<HeatmapRow | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isResearchExporting, setIsResearchExporting] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  const [simForm, setSimForm] = useState({ population: '100000', district: 'Rangpur', years: '5', screening_coverage: '0.3' });
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState('');

  const [cohorts, setCohorts] = useState<any[]>([]);
  const [cohortPatients, setCohortPatients] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<any>(null);
  const [cohortReport, setCohortReport] = useState<any>(null);
  const [cohortReportLoading, setCohortReportLoading] = useState(false);
  const [showCohortForm, setShowCohortForm] = useState(false);
  const [cohortForm, setCohortForm] = useState({ name: '', description: '', patient_ids: [] as number[], end_date: '' });
  const [cohortSubmitting, setCohortSubmitting] = useState(false);
  const [cohortMessage, setCohortMessage] = useState('');

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [togglingUser, setTogglingUser] = useState<number | null>(null);

  const [showResearchModal, setShowResearchModal] = useState(false);
  const [exportDistrict, setExportDistrict] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportError, setExportError] = useState('');

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setIsLoading(true);
    Promise.all([
      fetch('/api/admin/heatmap', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(async ([hRes, rRes, sRes]) => {
      if (!alive) return;
      const [hJson, rJson, sJson] = await Promise.all([hRes.json(), rRes.json(), sRes.json()]);
      setHeatmapData(Array.isArray(hJson.districts) ? hJson.districts : (Array.isArray(hJson) ? hJson : []));
      setChwPoints(Array.isArray(hJson.chw_points) ? hJson.chw_points : []);
      setReports(Array.isArray(rJson) ? rJson : []);
      setStats(sJson);
    }).catch(err => { if (alive) setError(err.message || 'Failed to load.'); })
      .finally(() => { if (alive) setIsLoading(false); });

    fetch('/api/admin/cohorts', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (alive) setCohorts(Array.isArray(d) ? d : []); }).catch(() => {});

    fetch('/api/admin/export-research-data', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (alive && Array.isArray(d)) setCohortPatients(d.slice(0, 100)); }).catch(() => {});

    return () => { alive = false; };
  }, [token]);

  useEffect(() => {
    if (activeTab === 'users' && allUsers.length === 0 && !usersLoading) {
      loadUsers();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAllUsers(await res.json());
    } finally { setUsersLoading(false); }
  };

  const toggleUserStatus = async (userId: number) => {
    setTogglingUser(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, active: updated.active } : u));
      }
    } finally { setTogglingUser(null); }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin/export-national-report', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed.');
      const data = await res.json();
      downloadTextFile(data.content, data.filename);
    } catch (err) { setError(err instanceof Error ? err.message : 'Export failed.'); }
    finally { setIsExporting(false); }
  };

  const handleResearchExport = async () => {
    setIsResearchExporting(true);
    setExportError('');
    try {
      const params = new URLSearchParams();
      if (exportDistrict) params.set('district', exportDistrict);
      if (exportStartDate) params.set('start_date', exportStartDate);
      if (exportEndDate) params.set('end_date', exportEndDate);
      const res = await fetch(`/api/admin/research-export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed.');
      const blob = await res.blob();
      const filename = `KidneyCareBD_Research_${new Date().toISOString().split('T')[0]}${exportDistrict ? '_' + exportDistrict : ''}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
      setShowResearchModal(false);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.');
    } finally { setIsResearchExporting(false); }
  };

  const runSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true); setSimError('');
    try {
      const res = await fetch('/api/admin/budget-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(simForm),
      });
      if (!res.ok) throw new Error('Simulation failed');
      setSimResult(await res.json());
    } catch { setSimError(language === 'bn' ? 'সিমুলেশন ব্যর্থ হয়েছে।' : 'Failed to run simulation.'); }
    finally { setSimLoading(false); }
  };

  const formatBDT = (n: number) => {
    if (n >= 10000000) return `৳${(n / 10000000).toFixed(1)}cr`;
    if (n >= 100000) return `৳${(n / 100000).toFixed(1)}L`;
    return `৳${n.toLocaleString()}`;
  };

  const submitCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    setCohortSubmitting(true);
    const res = await fetch('/api/admin/cohorts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(cohortForm),
    });
    setCohortSubmitting(false);
    if (res.ok) {
      setCohortMessage(language === 'bn' ? 'কোহর্ট তৈরি হয়েছে!' : 'Cohort created!');
      setShowCohortForm(false);
      setCohortForm({ name: '', description: '', patient_ids: [], end_date: '' });
      const r = await fetch('/api/admin/cohorts', { headers: { Authorization: `Bearer ${token}` } });
      setCohorts(await r.json());
    }
  };

  const loadCohortReport = async (cohort: any) => {
    setSelectedCohort(cohort); setCohortReportLoading(true);
    try {
      const res = await fetch(`/api/admin/cohorts/${cohort.id}/report`, { headers: { Authorization: `Bearer ${token}` } });
      setCohortReport(await res.json());
    } finally { setCohortReportLoading(false); }
  };

  const downloadCohortReport = () => {
    if (!cohortReport) return;
    const { cohort, patients: pts, summary } = cohortReport;
    const content = [
      `# Outcome Cohort Report: ${cohort.name}`,
      `Description: ${cohort.description}`,
      ``,
      `## Summary`,
      `Total Patients: ${summary.total}  |  Avg Risk: ${summary.avg_risk}`,
      `Diabetic: ${summary.diabetic_count}  |  Hypertensive: ${summary.hypertensive_count}`,
      ``,
      `## Stage Distribution`,
      ...Object.entries(summary.stage_distribution || {}).map(([s, c]) => `Stage ${s}: ${c} patients`),
      ``,
      `## Patient List (Anonymized)`,
      ...pts.map((p: any, i: number) => `${i + 1}. ${p.district}, ${p.sex}, Age ${p.age}, Stage ${p.ckd_stage}, Risk ${p.risk_score}`),
    ].join('\n');
    downloadTextFile(content, `Cohort_${cohort.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`);
  };

  const sortedHeatmap = useMemo(() => [...heatmapData].sort((a, b) => b.count - a.count), [heatmapData]);
  const totalPatients = useMemo(() => heatmapData.reduce((s, r) => s + r.count, 0), [heatmapData]);
  const highRiskCount = useMemo(() => heatmapData.filter(r => (r.avg_risk ?? 0) > 50).reduce((s, r) => s + r.count, 0), [heatmapData]);
  const highRiskPct = totalPatients > 0 ? Math.round((highRiskCount / totalPatients) * 100) : 0;
  const districtsCovered = heatmapData.filter(r => r.count > 0).length;
  const femalePct = (stats?.female_count != null && totalPatients > 0)
    ? Math.round((stats.female_count / totalPatients) * 100)
    : null;
  const top3HighRisk = useMemo(() =>
    [...heatmapData].sort((a, b) => (b.avg_risk ?? 0) - (a.avg_risk ?? 0)).slice(0, 3),
    [heatmapData]);

  const patientSparkData = useMemo(() => generateSparkline(totalPatients), [totalPatients]);
  const riskSparkData = useMemo(() => generateSparkline(highRiskPct, 30).map(d => ({ ...d, value: Math.min(100, d.value) })), [highRiskPct]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchSearch = userSearch === '' ||
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.district?.toLowerCase().includes(userSearch.toLowerCase());
      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [allUsers, userSearch, userRoleFilter]);

  const tabs: { id: AdminTab; label: string; labelBn: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', labelBn: 'সারসংক্ষেপ', icon: BarChart2 },
    { id: 'map', label: 'CKD Map', labelBn: 'মানচিত্র', icon: MapIcon },
    { id: 'reports', label: 'Reports', labelBn: 'রিপোর্ট', icon: FileText },
    { id: 'simulator', label: 'Simulator', labelBn: 'সিমুলেটর', icon: Calculator },
    { id: 'cohorts', label: 'Cohorts', labelBn: 'কোহর্ট', icon: Users },
    { id: 'users', label: 'Users', labelBn: 'ব্যবহারকারী', icon: Shield },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" />
        <p className="text-slate-500 text-sm">{language === 'bn' ? 'ডেটা লোড হচ্ছে...' : 'Loading dashboard data...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
            {language === 'bn' ? 'জনস্বাস্থ্য ড্যাশবোর্ড' : 'Public Health Dashboard'}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 hidden sm:block">
            {language === 'bn' ? 'বাংলাদেশের সিকেডি বোঝা পর্যবেক্ষণ করুন' : 'Monitor CKD burden and drive policy action across Bangladesh'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => { setShowResearchModal(true); setExportError(''); }}
            className="p-2 sm:px-4 sm:py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all text-sm"
            title={language === 'bn' ? 'গবেষণা CSV' : 'Research CSV'}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'গবেষণা CSV' : 'Research CSV'}</span>
          </button>
          <button onClick={handleExport} disabled={isExporting}
            className="p-2 sm:px-4 sm:py-2 bg-[#1A6B8A] text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-[#14556e] transition-all disabled:opacity-50 text-sm"
            title={language === 'bn' ? 'জাতীয় রিপোর্ট' : 'National Report'}>
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span className="hidden sm:inline">{language === 'bn' ? 'জাতীয় রিপোর্ট' : 'National Report'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2" style={{ background: '#FDECEA', border: '1px solid #E74C3C', color: '#7b1a1a' }}>
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="hidden md:block overflow-x-auto -mx-1 px-1">
        <div className="flex border-b border-slate-200 min-w-max">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.id ? 'border-[#1A6B8A] text-[#1A6B8A]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
              <tab.icon className="w-4 h-4" />
              {language === 'bn' ? tab.labelBn : tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="md:hidden flex items-center gap-2 pb-1">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold text-[#1A6B8A] bg-[#1A6B8A]/10`}>
          {(() => { const t = tabs.find(t => t.id === activeTab); return t ? <><t.icon className="w-4 h-4" />{language === 'bn' ? t.labelBn : t.label}</> : null; })()}
        </div>
        <span className="text-xs text-slate-400">{language === 'bn' ? '— নিচে নেভিগেট করুন' : '— use bottom nav to switch'}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard
                  label={language === 'bn' ? 'মোট রোগী' : 'Total Patients'}
                  value={totalPatients.toLocaleString()}
                  icon={Users}
                  color="bg-[#1A6B8A]/10 text-[#1A6B8A]"
                  sparkData={patientSparkData}
                  trend="+12%"
                />
                <KpiCard
                  label={language === 'bn' ? 'উচ্চ ঝুঁকি %' : 'High Risk %'}
                  value={`${highRiskPct}%`}
                  sub={`${highRiskCount.toLocaleString()} ${language === 'bn' ? 'রোগী' : 'patients'}`}
                  icon={AlertCircle}
                  color="bg-[#FDECEA] text-[#E74C3C]"
                  sparkData={riskSparkData}
                />
                <KpiCard
                  label={language === 'bn' ? 'গড় GFR স্তর' : 'Avg GFR Stage'}
                  value={stats?.stage_distribution?.length ? `Stage ${Math.round(stats.stage_distribution.reduce((s: number, d: any) => s + d.ckd_stage * d.count, 0) / (stats.stage_distribution.reduce((s: number, d: any) => s + d.count, 0) || 1))}` : 'N/A'}
                  icon={Activity}
                  color="bg-[#FEF5E7] text-[#F39C12]"
                />
                <KpiCard
                  label={language === 'bn' ? 'মহিলা রোগী %' : 'Female Patients %'}
                  value={femalePct !== null ? `${femalePct}%` : 'N/A'}
                  sub={stats?.female_count != null ? `${stats.female_count} ${language === 'bn' ? 'মহিলা' : 'female'}` : undefined}
                  icon={UserCheck}
                  color="bg-[#1A6B8A]/10 text-[#1A6B8A]"
                />
                <KpiCard
                  label={language === 'bn' ? 'জেলা কভার্ড' : 'Districts Covered'}
                  value={districtsCovered}
                  sub={`${language === 'bn' ? 'মোট' : 'of'} 64 ${language === 'bn' ? 'জেলার মধ্যে' : 'districts'}`}
                  icon={Globe2}
                  color="bg-[#EAFAF1] text-[#1a7a44]"
                  trend={`${Math.round((districtsCovered / 64) * 100)}%`}
                />
              </div>

              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: language === 'bn' ? 'ডাক্তার' : 'Doctors', value: stats.total_doctors, color: 'bg-[#1A6B8A]' },
                    { label: language === 'bn' ? 'স্বাস্থ্যকর্মী' : 'CHW Workers', value: stats.total_chw, color: 'bg-[#2ECC71]' },
                    { label: language === 'bn' ? 'ভাইটালস রেকর্ড' : 'Vitals Records', value: stats.total_vitals_logs?.toLocaleString(), color: 'bg-[#F39C12]' },
                    { label: language === 'bn' ? 'ঝুঁকি প্রতিক্রিয়া' : 'Risk Feedback', value: stats.risk_feedback_count, color: 'bg-[#E74C3C]' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                      <div className={`w-1.5 h-6 rounded-full ${s.color} mb-3`} />
                      <p className="text-2xl font-black text-slate-900">{s.value ?? '--'}</p>
                      <p className="text-xs font-semibold text-slate-400 uppercase mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {stats?.stage_distribution?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">{language === 'bn' ? 'সিকেডি পর্যায় বিতরণ' : 'CKD Stage Distribution'}</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.stage_distribution.map((d: any) => ({ name: `Stage ${d.ckd_stage}`, count: d.count }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1A6B8A" radius={[6, 6, 0, 0]}
                          label={{ position: 'top', fontSize: 11, fill: '#64748b' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {top3HighRisk.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {language === 'bn' ? 'শীর্ষ ৩ উচ্চ-ঝুঁকি জেলা' : 'Top 3 Highest-Risk Districts'}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {top3HighRisk.map((d, i) => (
                      <div key={d.district} className="bg-white rounded-xl p-4 border border-red-100 text-center">
                        <p className="text-xs font-bold text-red-400 uppercase mb-1">#{i + 1}</p>
                        <p className="text-sm font-bold text-slate-900 leading-snug">{d.district}</p>
                        <p className="text-xl font-black text-red-600 mt-1">{Math.round(d.avg_risk ?? 0)}</p>
                        <p className="text-xs text-slate-400">{language === 'bn' ? 'গড় ঝুঁকি' : 'avg risk'}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-1">{d.count} {language === 'bn' ? 'রোগী' : 'patients'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#1A6B8A]" />
                  {language === 'bn' ? 'শীর্ষ জেলা (রোগী সংখ্যা)' : 'Top Districts by Patient Count'}
                </h3>
                <div className="space-y-2">
                  {sortedHeatmap.slice(0, 8).map((d, i) => (
                    <div key={d.district} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                      <span className="text-sm text-slate-700 w-28 truncate">{d.district}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min((d.count / (sortedHeatmap[0]?.count || 1)) * 100, 100)}%`,
                            background: (d.avg_risk ?? 0) > 50 ? '#E74C3C' : '#1A6B8A'
                          }} />
                      </div>
                      <span className="text-sm font-bold text-slate-800 w-8 text-right">{d.count}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={(d.avg_risk ?? 0) > 50 ? { background: '#FDECEA', color: '#7b1a1a' } : { background: '#FEF5E7', color: '#7d5100' }}>
                        {Math.round(d.avg_risk ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-600">{language === 'bn' ? 'স্তর:' : 'Layer:'}</span>
                  {([
                    { id: 'density', label: language === 'bn' ? 'রোগী ঘনত্ব' : 'Patient Density' },
                    { id: 'risk', label: language === 'bn' ? 'ঝুঁকি স্তর' : 'Risk Level' },
                  ] as const).map(l => (
                    <button key={l.id} onClick={() => setMapLayer(l.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all ${mapLayer === l.id ? 'bg-[#1A6B8A] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <Layers className="w-3.5 h-3.5" /> {l.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#E74C3C]" />{language === 'bn' ? 'উচ্চ ঝুঁকি' : 'High Risk'}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#F39C12]" />{language === 'bn' ? 'মধ্যম ঝুঁকি' : 'Moderate'}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#10b981]" />CHW</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[360px] sm:h-[480px] lg:h-[580px]">
                    {heatmapData.length ? (
                      <MapContainer center={[23.685, 90.3563]} zoom={7} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                        {heatmapData.map(district => {
                          const coords = DISTRICTS_COORDS[district.district] || [23.8103, 90.4125];
                          const isHighRisk = (district.avg_risk ?? 0) > 50;
                          const radius = mapLayer === 'density'
                            ? Math.max(8, Math.min(district.count * 5, 40))
                            : Math.max(8, Math.min((district.avg_risk ?? 0) / 2, 40));
                          return (
                            <CircleMarker key={district.district} center={coords}
                              radius={radius}
                              fillColor={isHighRisk ? '#E74C3C' : '#F39C12'}
                              color="#fff" weight={2} fillOpacity={0.75}
                              eventHandlers={{ click: () => setSelectedDistrict(district) }}>
                              <Popup>
                                <div className="text-sm">
                                  <p className="font-bold text-slate-900 mb-1">{district.district}</p>
                                  <p className="text-slate-600">{language === 'bn' ? 'রোগী:' : 'Patients:'} <strong>{district.count}</strong></p>
                                  <p className="text-slate-600">{language === 'bn' ? 'গড় ঝুঁকি:' : 'Avg Risk:'} <strong>{Math.round(district.avg_risk ?? 0)}</strong></p>
                                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold" style={isHighRisk ? { background: '#FDECEA', color: '#7b1a1a' } : { background: '#FEF5E7', color: '#7d5100' }}>
                                    {isHighRisk ? (language === 'bn' ? 'উচ্চ ঝুঁকি' : 'High Risk') : (language === 'bn' ? 'মধ্যম ঝুঁকি' : 'Moderate')}
                                  </span>
                                </div>
                              </Popup>
                            </CircleMarker>
                          );
                        })}
                        {chwPoints.map((pt, i) => (
                          <CircleMarker key={`chw-${i}`} center={[pt.lat, pt.lng]} radius={5}
                            fillColor="#10b981" color="#fff" weight={1} fillOpacity={0.9}>
                            <Popup>
                              <p className="font-bold text-sm" style={{ color: '#2ECC71' }}>CHW Visit</p>
                              <p className="text-xs">{pt.patient_name}</p>
                            </Popup>
                          </CircleMarker>
                        ))}
                      </MapContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        {language === 'bn' ? 'রোগীর অবস্থান ডেটা নেই।' : 'No patient location data available yet.'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedDistrict && (
                    <div className="bg-white rounded-2xl border border-[#1A6B8A] p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900">{selectedDistrict.district}</h4>
                        <button onClick={() => setSelectedDistrict(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-slate-500">{language === 'bn' ? 'রোগী' : 'Patients'}</span><span className="font-bold">{selectedDistrict.count}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">{language === 'bn' ? 'গড় ঝুঁকি' : 'Avg Risk'}</span><span className="font-bold">{Math.round(selectedDistrict.avg_risk ?? 0)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">{language === 'bn' ? 'র‍্যাংক' : 'Rank'}</span>
                          <span className="font-bold">#{sortedHeatmap.findIndex(d => d.district === selectedDistrict.district) + 1}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-3 text-sm">{language === 'bn' ? 'শীর্ষ জেলা' : 'Top Districts'}</h4>
                    <div className="space-y-2">
                      {sortedHeatmap.slice(0, 7).map((d, i) => (
                        <button key={d.district} onClick={() => setSelectedDistrict(d)}
                          className="w-full flex items-center gap-2 text-left hover:bg-slate-50 p-1 rounded-lg transition-colors">
                          <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                          <span className="text-xs text-slate-700 flex-1 truncate">{d.district}</span>
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={(d.avg_risk ?? 0) > 50 ? { background: '#FDECEA', color: '#E74C3C' } : { background: '#FEF5E7', color: '#F39C12' }}>{d.count}</span>
                          <ChevronRight className="w-3 h-3 text-slate-300" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {chwPoints.length > 0 && (
                    <div className="rounded-2xl p-4" style={{ background: '#EAFAF1', border: '1px solid #2ECC71' }}>
                      <p className="text-xs font-bold uppercase" style={{ color: '#1a7a44' }}>{language === 'bn' ? 'সিএইচডব্লিউ পরিদর্শন' : 'CHW Visits'}</p>
                      <p className="text-2xl font-black mt-1" style={{ color: '#1a7a44' }}>{chwPoints.length}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-[#1A6B8A] to-[#0f4a63] text-white rounded-2xl p-6 shadow-md">
                  <FileText className="w-8 h-8 mb-3 opacity-80" />
                  <h3 className="text-lg font-bold mb-1">{language === 'bn' ? 'জাতীয় বোঝা রিপোর্ট' : 'National Burden Report'}</h3>
                  <p className="text-sm opacity-75 mb-4">{language === 'bn' ? 'সমস্ত জেলার সিকেডি ডেটা সম্পূর্ণ জাতীয় বিশ্লেষণ' : 'Full national CKD analysis across all monitored districts'}</p>
                  <button onClick={handleExport} disabled={isExporting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-semibold text-sm transition-all disabled:opacity-50">
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isExporting ? (language === 'bn' ? 'তৈরি হচ্ছে...' : 'Generating...') : (language === 'bn' ? 'ডাউনলোড করুন' : 'Download')}
                  </button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EAFAF1', color: '#2ECC71' }}><Download className="w-5 h-5" /></div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{language === 'bn' ? 'গবেষণা ডেটাসেট' : 'Research Dataset'}</h3>
                      <p className="text-xs text-slate-500">{language === 'bn' ? 'জরিপ + ক্লিনিকাল CSV' : 'Survey + Clinical CSV'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 flex-1 mb-4">
                    {language === 'bn' ? 'জরিপ সম্পূর্ণকারী রোগীদের বেনামী ক্লিনিক্যাল ও জনতাত্ত্বিক ডেটা। জেলা ও তারিখ ফিল্টার সহ।' : 'Anonymized survey + clinical data for patients who completed the mandatory questionnaire. Filter by district and date.'}
                  </p>
                  <button onClick={() => { setShowResearchModal(true); setExportError(''); }}
                    className="flex items-center gap-2 px-5 py-2 text-white rounded-xl font-semibold text-sm transition-all"
                    style={{ background: '#2ECC71' }}>
                    <Download className="w-4 h-4" />
                    {language === 'bn' ? 'রপ্তানি সেট আপ করুন' : 'Configure Export'}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-4">{language === 'bn' ? 'পলিসি রিপোর্টসমূহ' : 'Policy Reports'}</h3>
                {reports.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reports.map(report => (
                      <div key={report.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="p-2.5 rounded-xl group-hover:bg-[#1A6B8A] group-hover:text-white transition-colors" style={{ background: '#EFF8FB', color: '#1A6B8A' }}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-semibold text-slate-400">{report.date}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 mb-1 group-hover:text-[#1A6B8A] transition-colors">{report.title}</h4>
                        <p className="text-slate-500 text-sm leading-relaxed mb-4">{report.desc}</p>
                        <button onClick={() => { setDownloadingReportId(report.id); downloadTextFile(report.content, report.filename); setDownloadingReportId(null); }}
                          disabled={downloadingReportId === report.id}
                          className="text-sm font-semibold text-[#1A6B8A] flex items-center gap-1.5 hover:underline disabled:opacity-50">
                          {downloadingReportId === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          {language === 'bn' ? 'ডাউনলোড করুন' : 'Download Report'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>{language === 'bn' ? 'কোনো পলিসি রিপোর্ট নেই।' : 'No policy reports available yet.'}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'simulator' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{language === 'bn' ? 'বাজেট প্রভাব সিমুলেটর' : 'Budget Impact Simulator'}</h2>
                <p className="text-sm text-slate-500 mt-1">{language === 'bn' ? 'প্রাথমিক হস্তক্ষেপ থেকে অনুমানিত সঞ্চয় মডেল করুন' : 'Model projected dialysis demand and cost savings from early CKD intervention'}</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <form onSubmit={runSimulation} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                    <h3 className="font-bold text-slate-900">{language === 'bn' ? 'সিমুলেশন প্যারামিটার' : 'Simulation Parameters'}</h3>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'জেলা' : 'District'}</label>
                      <select value={simForm.district} onChange={e => setSimForm({ ...simForm, district: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20">
                        {DISTRICTS_SIM.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'লক্ষ্য জনগোষ্ঠী' : 'Target Population'}</label>
                      <input type="number" value={simForm.population} onChange={e => setSimForm({ ...simForm, population: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'পরিকল্পনার মেয়াদ' : 'Planning Horizon'}</label>
                      <select value={simForm.years} onChange={e => setSimForm({ ...simForm, years: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20">
                        {[3, 5, 10].map(y => <option key={y} value={y}>{y} {language === 'bn' ? 'বছর' : 'years'}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        {language === 'bn' ? 'স্ক্রিনিং কভারেজ' : 'Screening Coverage'}: <span className="text-[#1A6B8A] font-bold">{(parseFloat(simForm.screening_coverage) * 100).toFixed(0)}%</span>
                      </label>
                      <input type="range" min="0.1" max="1" step="0.05" value={simForm.screening_coverage}
                        onChange={e => setSimForm({ ...simForm, screening_coverage: e.target.value })}
                        className="w-full accent-[#1A6B8A]" />
                      <div className="flex justify-between text-xs text-slate-400"><span>10%</span><span>100%</span></div>
                    </div>
                    {simError && <p className="text-sm text-red-600">{simError}</p>}
                    <button type="submit" disabled={simLoading}
                      className="w-full py-3 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#14556e] disabled:opacity-50 transition-all">
                      {simLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                      {language === 'bn' ? 'সিমুলেশন চালান' : 'Run Simulation'}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-5">
                  {simResult ? (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: language === 'bn' ? 'অনুমানিত সিকেডি' : 'Est. CKD', value: simResult.estimated_ckd?.toLocaleString(), bg: '#EFF8FB', color: '#1A6B8A' },
                          { label: language === 'bn' ? 'স্ক্রিন হওয়া' : 'Screened', value: simResult.screened_patients?.toLocaleString(), bg: '#EFF8FB', color: '#1A6B8A' },
                          { label: language === 'bn' ? 'ডায়ালাইসিস প্রতিরোধ' : 'Dialysis Prevented', value: simResult.dialysis_cases_prevented?.toLocaleString(), bg: '#EAFAF1', color: '#1a7a44' },
                          { label: 'ROI', value: `${simResult.roi_percent}%`, bg: simResult.net_saving_bdt > 0 ? '#EAFAF1' : '#FDECEA', color: simResult.net_saving_bdt > 0 ? '#1a7a44' : '#7b1a1a' },
                        ].map(c => (
                          <div key={c.label} className="p-4 rounded-2xl" style={{ background: c.bg, color: c.color }}>
                            <p className="text-xl font-black">{c.value}</p>
                            <p className="text-xs font-semibold mt-1 opacity-80">{c.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <h4 className="font-bold text-slate-900 mb-3">{language === 'bn' ? 'খরচ বিশ্লেষণ (BDT)' : 'Cost Analysis (BDT)'}</h4>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{
                              name: 'Costs',
                              [language === 'bn' ? 'স্ক্রিনিং' : 'Screening']: simResult.screening_cost_bdt,
                              [language === 'bn' ? 'ওষুধ' : 'Medication']: simResult.medication_cost_bdt,
                              [language === 'bn' ? 'সাশ্রয়' : 'Savings']: simResult.dialysis_cost_saved_bdt,
                            }]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" />
                              <YAxis tickFormatter={v => formatBDT(v)} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(v: number) => formatBDT(v)} />
                              <Legend />
                              <Bar dataKey={language === 'bn' ? 'স্ক্রিনিং' : 'Screening'} fill="#1A6B8A" radius={[4, 4, 0, 0]} />
                              <Bar dataKey={language === 'bn' ? 'ওষুধ' : 'Medication'} fill="#F39C12" radius={[4, 4, 0, 0]} />
                              <Bar dataKey={language === 'bn' ? 'সাশ্রয়' : 'Savings'} fill="#2ECC71" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="p-5 rounded-2xl border" style={simResult.net_saving_bdt > 0 ? { background: '#EAFAF1', borderColor: '#2ECC71' } : { background: '#FEF5E7', borderColor: '#F39C12' }}>
                        <p className="text-xs font-bold uppercase opacity-60 mb-1">{language === 'bn' ? 'নেট অর্থনৈতিক প্রভাব' : 'Net Economic Impact'}</p>
                        <p className="text-3xl font-black" style={{ color: simResult.net_saving_bdt > 0 ? '#1a7a44' : '#7d5100' }}>
                          {simResult.net_saving_bdt > 0 ? '+' : ''}{formatBDT(simResult.net_saving_bdt)}
                        </p>
                        <p className="text-sm mt-1" style={{ color: simResult.net_saving_bdt > 0 ? '#1a7a44' : '#7d5100' }}>
                          {formatBDT(simResult.dialysis_cost_saved_bdt)} {language === 'bn' ? 'সাশ্রয়' : 'saved'} vs. {formatBDT(simResult.total_intervention_cost_bdt)} {language === 'bn' ? 'বিনিয়োগ' : 'investment'} · {simResult.years} {language === 'bn' ? 'বছর' : 'yrs'}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-center h-80 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <div className="text-center">
                        <Calculator className="w-14 h-14 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">{language === 'bn' ? 'প্যারামিটার পূরণ করে সিমুলেশন চালান' : 'Configure parameters and run the simulation'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cohorts' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{language === 'bn' ? 'ফলাফল ট্র্যাকিং কোহর্ট' : 'Outcome Tracking Cohorts'}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{language === 'bn' ? 'রোগীর দল তৈরি করুন এবং ফলাফল পর্যবেক্ষণ করুন' : 'Define patient cohorts and track longitudinal outcomes'}</p>
                </div>
                <button onClick={() => setShowCohortForm(!showCohortForm)}
                  className="px-4 py-2 bg-[#1A6B8A] text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-[#14556e] transition-all text-sm">
                  <Plus className="w-4 h-4" />{language === 'bn' ? 'নতুন কোহর্ট' : 'New Cohort'}
                </button>
              </div>

              {cohortMessage && (
                <div className="p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: '#EAFAF1', border: '1px solid #2ECC71', color: '#1a7a44' }}>
                  <CheckCircle2 className="w-4 h-4" /> {cohortMessage}
                </div>
              )}

              <AnimatePresence>
                {showCohortForm && (
                  <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    onSubmit={submitCohort} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 overflow-hidden">
                    <h3 className="font-bold text-slate-900">{language === 'bn' ? 'নতুন কোহর্ট তৈরি করুন' : 'Create New Cohort'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'কোহর্টের নাম' : 'Cohort Name'}</label>
                        <input required type="text" value={cohortForm.name} onChange={e => setCohortForm({ ...cohortForm, name: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20"
                          placeholder={language === 'bn' ? 'যেমন: রাজশাহী উচ্চ ঝুঁকি' : 'e.g. Rajshahi High-Risk 2025'} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'শেষ তারিখ' : 'End Date'}</label>
                        <input type="date" value={cohortForm.end_date} onChange={e => setCohortForm({ ...cohortForm, end_date: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'বিবরণ' : 'Description'}</label>
                      <textarea value={cohortForm.description} onChange={e => setCohortForm({ ...cohortForm, description: e.target.value })}
                        rows={2} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        {language === 'bn' ? 'রোগী নির্বাচন' : 'Select Patients'} ({cohortForm.patient_ids.length} {language === 'bn' ? 'নির্বাচিত' : 'selected'})
                      </label>
                      <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-3 bg-slate-50">
                        {cohortPatients.map((p: any, i: number) => (
                          <label key={i} className="flex items-center gap-3 cursor-pointer hover:bg-white p-1.5 rounded-lg text-sm">
                            <input type="checkbox" checked={cohortForm.patient_ids.includes(p.user_id)}
                              onChange={() => setCohortForm(f => ({
                                ...f,
                                patient_ids: f.patient_ids.includes(p.user_id)
                                  ? f.patient_ids.filter(id => id !== p.user_id)
                                  : [...f.patient_ids, p.user_id]
                              }))} className="accent-[#1A6B8A]" />
                            <span className="text-slate-700">{p.district} · Age {p.age} · {p.sex} · Stage {p.ckd_stage}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" disabled={cohortSubmitting}
                        className="flex-1 py-3 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                        {cohortSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                        {language === 'bn' ? 'কোহর্ট তৈরি করুন' : 'Create Cohort'}
                      </button>
                      <button type="button" onClick={() => setShowCohortForm(false)}
                        className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200">
                        {language === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-800">{language === 'bn' ? 'কোহর্টসমূহ' : 'Cohorts'} <span className="text-slate-400 font-normal">({cohorts.length})</span></h3>
                  {cohorts.length === 0 ? (
                    <div className="text-center py-14 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">{language === 'bn' ? 'কোনো কোহর্ট নেই।' : 'No cohorts yet. Create one to get started.'}</p>
                    </div>
                  ) : cohorts.map(c => (
                    <button key={c.id} onClick={() => loadCohortReport(c)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all hover:shadow-sm ${selectedCohort?.id === c.id ? 'border-[#1A6B8A] bg-[#1A6B8A]/5' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                          {c.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{c.description}</p>}
                        </div>
                        <span className="ml-2 text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold shrink-0">
                          {c.patient_ids?.length || 0} {language === 'bn' ? 'রোগী' : 'pts'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">{new Date(c.start_date).toLocaleDateString()}</p>
                    </button>
                  ))}
                </div>

                <div>
                  {cohortReportLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#1A6B8A]" /></div>
                  ) : cohortReport ? (
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-900">{cohortReport.cohort?.name}</h3>
                        <button onClick={downloadCohortReport}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200">
                          <Download className="w-3.5 h-3.5" />{language === 'bn' ? 'ডাউনলোড' : 'Download'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: language === 'bn' ? 'মোট রোগী' : 'Total Patients', value: cohortReport.summary?.total },
                          { label: language === 'bn' ? 'গড় ঝুঁকি' : 'Avg Risk', value: cohortReport.summary?.avg_risk },
                          { label: language === 'bn' ? 'ডায়াবেটিক' : 'Diabetic', value: cohortReport.summary?.diabetic_count },
                          { label: language === 'bn' ? 'উচ্চ রক্তচাপ' : 'Hypertensive', value: cohortReport.summary?.hypertensive_count },
                        ].map(s => (
                          <div key={s.label} className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-xl font-black text-slate-900">{s.value ?? '--'}</p>
                            <p className="text-xs font-semibold text-slate-400 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm mb-3">{language === 'bn' ? 'পর্যায় বিতরণ' : 'Stage Distribution'}</p>
                        {Object.entries(cohortReport.summary?.stage_distribution || {}).map(([s, c]: any) => (
                          <div key={s} className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-semibold text-slate-500 w-14">Stage {s}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-2">
                              <div className="bg-[#1A6B8A] h-2 rounded-full" style={{ width: `${(c / cohortReport.summary.total) * 100}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-700 w-5 text-right">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <div className="text-center">
                        <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">{language === 'bn' ? 'একটি কোহর্ট নির্বাচন করুন' : 'Select a cohort to view its report'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{language === 'bn' ? 'ব্যবহারকারী ও CHW ব্যবস্থাপনা' : 'User & CHW Management'}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{language === 'bn' ? 'সকল ব্যবহারকারীর অনুমোদন ও অ্যাকাউন্ট পরিচালনা করুন' : 'Manage accounts, roles and approval status for all platform users'}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    placeholder={language === 'bn' ? 'নাম, ইমেইল বা জেলা খুঁজুন...' : 'Search by name, email or district...'}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20" />
                </div>
                <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20">
                  <option value="all">{language === 'bn' ? 'সব ভূমিকা' : 'All Roles'}</option>
                  <option value="patient">{language === 'bn' ? 'রোগী' : 'Patient'}</option>
                  <option value="doctor">{language === 'bn' ? 'ডাক্তার' : 'Doctor'}</option>
                  <option value="chw">CHW</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={loadUsers} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm flex items-center gap-2 hover:bg-slate-50 text-slate-600">
                  <RefreshCw className="w-4 h-4" />{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
                </button>
              </div>

              {usersLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#1A6B8A]" /></div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" role="table">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">{language === 'bn' ? 'ব্যবহারকারী' : 'User'}</th>
                          <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">{language === 'bn' ? 'ভূমিকা' : 'Role'}</th>
                          <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">{language === 'bn' ? 'জেলা' : 'District'}</th>
                          <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden lg:table-cell">{language === 'bn' ? 'যোগদান' : 'Joined'}</th>
                          <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                          <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr><td colSpan={6} className="text-center py-12 text-slate-400">{language === 'bn' ? 'কোনো ব্যবহারকারী পাওয়া যায়নি।' : 'No users found matching your criteria.'}</td></tr>
                        ) : filteredUsers.map(u => (
                          <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${!u.active ? 'opacity-60' : ''}`}>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#1A6B8A]/10 text-[#1A6B8A] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {u.name?.charAt(0) || '?'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 truncate">{u.name}</p>
                                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 hidden md:table-cell">
                              <span className="text-slate-600 flex items-center gap-1 text-xs">
                                <Building2 className="w-3 h-3" />{u.district || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-slate-400">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3.5">
                              {u.active ? (
                                <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#2ECC71' }}>
                                  <CheckCircle2 className="w-3.5 h-3.5" />{language === 'bn' ? 'সক্রিয়' : 'Active'}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                                  <XCircle className="w-3.5 h-3.5" />{language === 'bn' ? 'নিষ্ক্রিয়' : 'Disabled'}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => toggleUserStatus(u.id)}
                                disabled={togglingUser === u.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                style={u.active ? { background: '#FDECEA', color: '#E74C3C' } : { background: '#EAFAF1', color: '#2ECC71' }}>
                                {togglingUser === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                  u.active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                                {u.active
                                  ? (language === 'bn' ? 'নিষ্ক্রিয় করুন' : 'Disable')
                                  : (language === 'bn' ? 'সক্রিয় করুন' : 'Enable')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <p className="text-xs text-slate-500">
                      {filteredUsers.length} {language === 'bn' ? 'জন ব্যবহারকারী দেখাচ্ছে' : 'users shown'}
                      {userSearch || userRoleFilter !== 'all' ? ` (${language === 'bn' ? 'ফিল্টার সক্রিয়' : 'filtered'})` : ''}
                    </p>
                    <div className="flex gap-3 text-xs text-slate-400">
                      <span>{allUsers.filter(u => u.active).length} {language === 'bn' ? 'সক্রিয়' : 'active'}</span>
                      <span>·</span>
                      <span>{allUsers.filter(u => !u.active).length} {language === 'bn' ? 'নিষ্ক্রিয়' : 'disabled'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Research Export Modal */}
      <AnimatePresence>
        {showResearchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowResearchModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {language === 'bn' ? 'গবেষণা ডেটা রপ্তানি' : 'Research Data Export'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === 'bn' ? 'জরিপ ও ক্লিনিকাল ডেটা — বেনামী CSV' : 'Survey + Clinical data — Anonymized CSV'}
                  </p>
                </div>
                <button onClick={() => setShowResearchModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-5">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                    {language === 'bn' ? 'জেলা (ঐচ্ছিক)' : 'District (optional)'}
                  </label>
                  <select
                    value={exportDistrict}
                    onChange={e => setExportDistrict(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A]"
                  >
                    <option value="">{language === 'bn' ? '— সব জেলা —' : '— All districts —'}</option>
                    {['Dhaka','Chittagong','Rajshahi','Khulna','Barisal','Sylhet','Rangpur',
                      'Mymensingh','Gazipur','Narayanganj','Comilla','Chapainawabganj','Noakhali',
                      'Faridpur','Rajbari','Bogra','Dinajpur','Jessore','Tangail','Pabna'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                      {language === 'bn' ? 'শুরুর তারিখ' : 'Start date'}
                    </label>
                    <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A]" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                      {language === 'bn' ? 'শেষ তারিখ' : 'End date'}
                    </label>
                    <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A]" />
                  </div>
                </div>
              </div>

              <div className="bg-[#EFF8FB] rounded-2xl p-3 mb-5 flex gap-2.5">
                <Shield className="w-4 h-4 text-[#1A6B8A] shrink-0 mt-0.5" />
                <p className="text-xs text-[#1A6B8A]">
                  {language === 'bn'
                    ? 'সমস্ত ডেটা বেনামী — কোনো নাম, ফোন বা সনাক্তযোগ্য তথ্য নেই।'
                    : 'All data is anonymized — no names, phones, or identifiable info included.'}
                </p>
              </div>

              {exportError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                  {exportError}
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowResearchModal(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors text-sm">
                  {language === 'bn' ? 'বাতিল করুন' : 'Cancel'}
                </button>
                <button onClick={handleResearchExport} disabled={isResearchExporting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white transition-all disabled:opacity-60 text-sm"
                  style={{ background: isResearchExporting ? '#94a3b8' : 'linear-gradient(135deg, #2ECC71, #1a9e54)' }}>
                  {isResearchExporting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {language === 'bn' ? 'রপ্তানি হচ্ছে...' : 'Exporting…'}</>
                    : <><Download className="w-4 h-4" /> {language === 'bn' ? 'CSV ডাউনলোড' : 'Download CSV'}</>
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
