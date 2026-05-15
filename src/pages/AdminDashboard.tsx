import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  AlertCircle, Download, FileText, Loader2, Map as MapIcon,
  Users, BarChart2, Calculator, Activity, TrendingUp, Shield,
  CheckCircle2, XCircle, Search, Plus, ChevronRight, Layers,
  RefreshCw, Globe2, UserCheck, UserX, Building2, X, LogOut,
  LayoutDashboard, Grid3X3, ChevronLeft, Bell, Globe, Database,
  Cpu, MoreHorizontal
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

type AdminTab = 'overview' | 'map' | 'reports' | 'users' | 'more' | 'simulator' | 'cohorts';
type MapLayer = 'density' | 'risk';
type HeatmapRow = { district: string; count: number; avg_risk: number | null };
type PolicyReport = { id: string; title: string; desc: string; date: string; filename: string; content: string };

const DISTRICTS_COORDS: Record<string, [number, number]> = {
  Dhaka: [23.8103, 90.4125], Chittagong: [22.3569, 91.7832], Rajshahi: [24.3745, 88.6042],
  Khulna: [22.8456, 89.5403], Barisal: [22.701, 90.3535], Sylhet: [24.8949, 91.8687],
  Rangpur: [25.7439, 89.2752], Mymensingh: [24.7471, 90.4203], Gazipur: [24.0023, 90.4264],
  Narayanganj: [23.6238, 90.5], Chapainawabganj: [24.5963, 88.2765], Noakhali: [22.8696, 91.0995],
  Comilla: [23.4607, 91.1809], Rajbari: [23.7574, 89.6435], Faridpur: [23.6070, 89.8421],
};
const SIM_DISTRICTS = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh', 'Gazipur', 'Narayanganj', 'Comilla', 'Bogra', 'Dinajpur'];
const ROLE_COLORS: Record<string, string> = { admin: 'bg-purple-100 text-purple-700', doctor: 'bg-blue-100 text-blue-700', patient: 'bg-teal-100 text-teal-700', chw: 'bg-emerald-100 text-emerald-700' };
const PIE_COLORS = ['#1A6B8A', '#F39C12', '#94a3b8'];

function dl(content: string, filename: string, type = 'text/markdown;charset=utf-8;') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

function KpiCard({ label, value, sub, color, bg, icon: Icon, trend, sparkData }: {
  label: string; value: string | number; sub?: string; color: string; bg: string;
  icon: any; trend?: string; sparkData?: { v: number }[];
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border-0" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className={`w-4.5 h-4.5 ${color}`} style={{ width: '18px', height: '18px' }} />
        </div>
        {trend && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${color} ${bg}`}>{trend}</span>}
      </div>
      <p className="text-[22px] font-black text-slate-900 leading-none">{value}</p>
      <p className="text-[11px] font-semibold text-slate-400 uppercase mt-1 tracking-wide">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      {sparkData && (
        <div className="h-8 mt-2 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs><linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1A6B8A" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#1A6B8A" stopOpacity={0} />
              </linearGradient></defs>
              <Area type="monotone" dataKey="v" stroke="#1A6B8A" strokeWidth={1.5} fill={`url(#sg-${label})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, sub, back, onBack }: { title: string; sub?: string; back?: string; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {onBack && (
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <div>
        {back && <p className="text-xs text-slate-400 mb-0.5">{back}</p>}
        <h1 className="text-xl font-black text-slate-900">{title}</h1>
        {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard({ initialTab = 'overview' }: { initialTab?: AdminTab }) {
  const { token, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  const [heatmapData, setHeatmapData] = useState<HeatmapRow[]>([]);
  const [chwPoints, setChwPoints] = useState<any[]>([]);
  const [reports, setReports] = useState<PolicyReport[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [mapLayer, setMapLayer] = useState<MapLayer>('density');
  const [selectedDistrict, setSelectedDistrict] = useState<HeatmapRow | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isResearchExporting, setIsResearchExporting] = useState(false);
  const [isDHIS2Exporting, setIsDHIS2Exporting] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  const [simForm, setSimForm] = useState({ population: '100000', district: 'Rangpur', years: '5', screening_coverage: '0.3' });
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

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
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setIsLoading(true);
    try {
      const [hRes, rRes, sRes] = await Promise.all([
        fetch('/api/admin/heatmap', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [hJson, rJson, sJson] = await Promise.all([hRes.json(), rRes.json(), sRes.json()]);
      setHeatmapData(Array.isArray(hJson.districts) ? hJson.districts : (Array.isArray(hJson) ? hJson : []));
      setChwPoints(Array.isArray(hJson.chw_points) ? hJson.chw_points : []);
      setReports(Array.isArray(rJson) ? rJson : []);
      setStats(sJson);
    } catch (e: any) { setError(e.message || 'Failed to load.'); }
    finally { setIsLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    if (!token) return;
    fetchData();
    fetch('/api/admin/cohorts', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setCohorts(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/admin/export-research-data', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setCohortPatients(d.slice(0, 100)); }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (activeTab === 'users' && allUsers.length === 0 && !usersLoading) loadUsers();
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
      const res = await fetch(`/api/admin/users/${userId}/toggle`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
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
      dl(data.content, data.filename);
    } catch (e: any) { setError(e.message); }
    finally { setIsExporting(false); }
  };

  const handleResearchExport = async () => {
    setIsResearchExporting(true);
    try {
      const res = await fetch('/api/admin/export-research-data', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed.');
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) throw new Error('No data available.');
      const headers = Object.keys(data[0]);
      const csv = [headers.join(','), ...data.map((row: any) => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      dl(csv, `KidneyCareBD_Research_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    } catch (e: any) { setError(e.message); }
    finally { setIsResearchExporting(false); }
  };

  const handleDHIS2Export = async () => {
    setIsDHIS2Exporting(true);
    try {
      const res = await fetch('/api/admin/dhis2-export', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed.');
      const data = await res.json();
      dl(JSON.stringify(data, null, 2), `KidneyCareBD_DHIS2_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    } catch (e: any) { setError(e.message); }
    finally { setIsDHIS2Exporting(false); }
  };

  const runSimulation = async (e: React.FormEvent) => {
    e.preventDefault(); setSimLoading(true);
    try {
      const res = await fetch('/api/admin/budget-simulator', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(simForm),
      });
      if (!res.ok) throw new Error('Simulation failed');
      setSimResult(await res.json());
    } catch { setSimResult(null); }
    finally { setSimLoading(false); }
  };

  const submitCohort = async (e: React.FormEvent) => {
    e.preventDefault(); setCohortSubmitting(true);
    const res = await fetch('/api/admin/cohorts', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(cohortForm),
    });
    setCohortSubmitting(false);
    if (res.ok) {
      setCohortMessage(language === 'bn' ? 'কোহর্ট তৈরি হয়েছে!' : 'Cohort created!');
      setShowCohortForm(false);
      setCohortForm({ name: '', description: '', patient_ids: [], end_date: '' });
      fetch('/api/admin/cohorts', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setCohorts).catch(() => {});
    }
  };

  const loadCohortReport = async (c: any) => {
    setSelectedCohort(c); setCohortReportLoading(true);
    try {
      const res = await fetch(`/api/admin/cohorts/${c.id}/report`, { headers: { Authorization: `Bearer ${token}` } });
      setCohortReport(await res.json());
    } finally { setCohortReportLoading(false); }
  };

  const formatBDT = (n: number) => n >= 10000000 ? `৳${(n / 10000000).toFixed(1)}cr` : n >= 100000 ? `৳${(n / 100000).toFixed(1)}L` : `৳${n.toLocaleString()}`;

  const sortedHeatmap = useMemo(() => [...heatmapData].sort((a, b) => b.count - a.count), [heatmapData]);
  const totalPatients = useMemo(() => heatmapData.reduce((s, r) => s + r.count, 0), [heatmapData]);
  const highRiskCount = useMemo(() => stats?.high_risk_patients ?? 0, [stats]);
  const highRiskPct = totalPatients > 0 ? Math.round((highRiskCount / totalPatients) * 100) : 0;
  const districtsCovered = heatmapData.filter(r => r.count > 0).length;

  const sparkData = useMemo(() => {
    let v = Math.max(0, totalPatients - Math.floor(totalPatients * 0.15));
    return Array.from({ length: 20 }, (_, i) => { v += Math.floor(Math.random() * 2); return { v: i === 19 ? totalPatients : v }; });
  }, [totalPatients]);

  const filteredUsers = useMemo(() =>
    allUsers.filter(u => {
      const ms = userSearch === '' || [u.name, u.email, u.district].some(s => s?.toLowerCase().includes(userSearch.toLowerCase()));
      return ms && (userRoleFilter === 'all' || u.role === userRoleFilter);
    }), [allUsers, userSearch, userRoleFilter]);

  const genderData = useMemo(() => {
    const g = stats?.gender_stats ?? [];
    return g.map((d: any) => ({ name: d.sex === 'male' ? (language === 'bn' ? 'পুরুষ' : 'Male') : d.sex === 'female' ? (language === 'bn' ? 'মহিলা' : 'Female') : 'Other', value: d.count }));
  }, [stats, language]);

  const weeklyData = useMemo(() => {
    const regs: any[] = stats?.weekly_registrations ?? [];
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];
      const found = regs.find((r: any) => r.day === key);
      return { day: d.toLocaleDateString('en', { weekday: 'short' }), count: found?.count ?? 0 };
    });
    return days;
  }, [stats]);

  const SIDEBAR_NAV = [
    { id: 'overview' as AdminTab, icon: LayoutDashboard, label: 'Home', labelBn: 'হোম' },
    { id: 'map' as AdminTab, icon: MapIcon, label: 'Map', labelBn: 'মানচিত্র' },
    { id: 'reports' as AdminTab, icon: FileText, label: 'Reports', labelBn: 'রিপোর্ট' },
    { id: 'users' as AdminTab, icon: Users, label: 'Users', labelBn: 'ব্যবহারকারী' },
    { id: 'more' as AdminTab, icon: Grid3X3, label: 'More', labelBn: 'আরও' },
  ];

  const L = (en: string, bn: string) => language === 'bn' ? bn : en;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#1A6B8A]" />
      <p className="text-sm text-slate-500">{L('Loading dashboard…', 'লোড হচ্ছে…')}</p>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">{L('Public Health Overview', 'জনস্বাস্থ্য সারসংক্ষেপ')}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{L('Bangladesh CKD monitoring at a glance', 'বাংলাদেশের সিকেডি পর্যবেক্ষণ')}</p>
        </div>
        <button onClick={() => fetchData(true)} disabled={refreshing}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors disabled:opacity-50" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label={L('Total Patients', 'মোট রোগী')} value={totalPatients.toLocaleString()} icon={Users} color="text-blue-600" bg="bg-blue-50" trend="+12%" sparkData={sparkData} />
        <KpiCard label={L('High Risk', 'উচ্চ ঝুঁকি')} value={`${highRiskPct}%`} sub={`${highRiskCount} ${L('patients', 'রোগী')}`} icon={AlertCircle} color="text-red-500" bg="bg-red-50" />
        <KpiCard label={L('Avg Risk Score', 'গড় ঝুঁকি')} value={stats?.avg_risk_score ?? '—'} icon={Activity} color="text-amber-600" bg="bg-amber-50" />
        <KpiCard label={L('Districts', 'জেলা')} value={districtsCovered} sub={`${L('of', 'মধ্যে')} 64`} icon={Globe2} color="text-emerald-600" bg="bg-emerald-50" trend={`${Math.round((districtsCovered / 64) * 100)}%`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm sm:col-span-2" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-slate-400 uppercase mb-3">{L('New Registrations (7 days)', 'নতুন নিবন্ধন (৭ দিন)')}</p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" fill="#1A6B8A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">{L('Gender Distribution', 'লিঙ্গ বিতরণ')}</p>
          {genderData.length > 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <PieChart width={100} height={80}>
                <Pie data={genderData} cx={50} cy={40} innerRadius={22} outerRadius={36} dataKey="value" paddingAngle={2}>
                  {genderData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
              </PieChart>
              <div className="space-y-1 ml-2">
                {genderData.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-slate-600">{d.name} <strong>{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">{L('No data', 'ডেটা নেই')}</div>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-slate-400 uppercase mb-3">{L('Platform Stats', 'প্ল্যাটফর্ম পরিসংখ্যান')}</p>
          <div className="space-y-2">
            {[
              { label: L('Doctors', 'ডাক্তার'), value: stats?.total_doctors ?? 0, color: 'bg-blue-500' },
              { label: 'CHW', value: stats?.total_chw ?? 0, color: 'bg-emerald-500' },
              { label: L('Alerts Today', 'আজকের অ্যালার্ট'), value: stats?.alerts_today ?? 0, color: 'bg-red-400' },
              { label: L('Vitals Logs', 'ভাইটালস রেকর্ড'), value: stats?.total_vitals_logs ?? 0, color: 'bg-purple-500' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <div className={`w-1.5 h-5 rounded-full ${s.color} shrink-0`} />
                <span className="text-xs text-slate-600 flex-1">{s.label}</span>
                <span className="text-sm font-bold text-slate-900">{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-slate-900">{L('Top 5 High-Burden Districts', 'শীর্ষ ৫ উচ্চ-বোঝা জেলা')}</p>
          <button onClick={() => setActiveTab('map')} className="text-xs text-[#1A6B8A] font-semibold hover:underline flex items-center gap-1">
            {L('View Map', 'মানচিত্র')} <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {sortedHeatmap.slice(0, 5).map((d, i) => (
            <div key={d.district} className="flex items-center gap-3">
              <span className="text-xs font-black text-slate-300 w-4">{i + 1}</span>
              <span className="text-sm text-slate-700 w-24 truncate">{d.district}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full" style={{ width: `${Math.min((d.count / (sortedHeatmap[0]?.count || 1)) * 100, 100)}%`, background: (d.avg_risk ?? 0) > 50 ? '#E74C3C' : '#1A6B8A' }} />
              </div>
              <span className="text-sm font-bold text-slate-800 w-8 text-right">{d.count}</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${(d.avg_risk ?? 0) > 50 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{Math.round(d.avg_risk ?? 0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMap = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-black text-slate-900">{L('CKD Heatmap', 'সিকেডি হিটম্যাপ')}</h1>
        <div className="flex items-center gap-2">
          {([
            { id: 'density' as MapLayer, label: L('Density', 'ঘনত্ব') },
            { id: 'risk' as MapLayer, label: L('Risk', 'ঝুঁকি') },
          ]).map(l => (
            <button key={l.id} onClick={() => setMapLayer(l.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${mapLayer === l.id ? 'bg-[#1A6B8A] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              <Layers className="w-3 h-3" /> {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="bg-white rounded-xl overflow-hidden shadow-sm h-[340px] sm:h-[440px] lg:h-[520px]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {heatmapData.length ? (
            <MapContainer center={[23.685, 90.3563]} zoom={7} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
              {heatmapData.map(district => {
                const coords = DISTRICTS_COORDS[district.district] || [23.8103, 90.4125];
                const isHigh = (district.avg_risk ?? 0) > 50;
                const radius = mapLayer === 'density' ? Math.max(8, Math.min(district.count * 5, 40)) : Math.max(8, Math.min((district.avg_risk ?? 0) / 2, 40));
                return (
                  <CircleMarker key={district.district} center={coords} radius={radius}
                    fillColor={isHigh ? '#E74C3C' : '#F39C12'} color="#fff" weight={2} fillOpacity={0.75}
                    eventHandlers={{ click: () => setSelectedDistrict(district) }}>
                    <Popup><div className="text-sm"><p className="font-bold">{district.district}</p><p>{L('Patients', 'রোগী')}: <strong>{district.count}</strong></p><p>{L('Avg Risk', 'গড় ঝুঁকি')}: <strong>{Math.round(district.avg_risk ?? 0)}</strong></p></div></Popup>
                  </CircleMarker>
                );
              })}
              {chwPoints.map((pt, i) => (
                <CircleMarker key={i} center={[pt.lat, pt.lng]} radius={5} fillColor="#10b981" color="#fff" weight={1} fillOpacity={0.9}>
                  <Popup><p className="font-bold text-emerald-700 text-sm">CHW Visit</p><p className="text-xs">{pt.patient_name}</p></Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">{L('No location data available.', 'রোগীর অবস্থান ডেটা নেই।')}</div>
          )}
        </div>

        <div className="absolute bottom-3 left-3 flex items-center gap-2 z-[1000] bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 shadow-sm text-xs font-semibold">
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-[#E74C3C]" /><span>{L('High', 'উচ্চ')}</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-[#F39C12]" /><span>{L('Moderate', 'মধ্যম')}</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /><span>CHW</span></div>
        </div>
      </div>

      <AnimatePresence>
        {selectedDistrict && (
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
            className="bg-white rounded-xl p-5 shadow-md border border-[#1A6B8A]/20" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-black text-slate-900 text-lg">{selectedDistrict.district}</h3>
              <button onClick={() => setSelectedDistrict(null)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: L('Patients', 'রোগী'), value: selectedDistrict.count },
                { label: L('Avg Risk', 'গড় ঝুঁকি'), value: Math.round(selectedDistrict.avg_risk ?? 0) },
                { label: L('Rank', 'র‍্যাংক'), value: `#${sortedHeatmap.findIndex(d => d.district === selectedDistrict.district) + 1}` },
              ].map(s => (
                <div key={s.label} className={`p-3 rounded-xl ${(selectedDistrict.avg_risk ?? 0) > 50 ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <p className="text-xl font-black text-slate-900">{s.value}</p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5 uppercase">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${(selectedDistrict.avg_risk ?? 0) > 50 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {(selectedDistrict.avg_risk ?? 0) > 50 ? L('High Risk District', 'উচ্চ ঝুঁকি জেলা') : L('Moderate Risk', 'মধ্যম ঝুঁকি')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedDistrict && (
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-slate-400 uppercase mb-3">{L('Top Districts', 'শীর্ষ জেলা')}</p>
          <div className="space-y-1">
            {sortedHeatmap.slice(0, 6).map((d, i) => (
              <button key={d.district} onClick={() => setSelectedDistrict(d)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left">
                <span className="text-xs font-black text-slate-300 w-4">{i + 1}</span>
                <span className="text-sm text-slate-700 flex-1">{d.district}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${(d.avg_risk ?? 0) > 50 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{d.count}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderReports = () => (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-slate-900">{L('Reports & Exports', 'রিপোর্ট ও রপ্তানি')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { title: L('National Report', 'জাতীয় রিপোর্ট'), sub: L('Full CKD burden analysis', 'সম্পূর্ণ সিকেডি বোঝা বিশ্লেষণ'), icon: FileText, color: 'bg-[#1A6B8A] text-white', action: handleExport, loading: isExporting },
          { title: L('Research CSV', 'গবেষণা CSV'), sub: L('Anonymized dataset for researchers', 'গবেষকদের জন্য অনামী ডেটাসেট'), icon: Database, color: 'bg-emerald-600 text-white', action: handleResearchExport, loading: isResearchExporting },
          { title: L('DHIS2 Export', 'DHIS2 রপ্তানি'), sub: L('District aggregates for DHIS2', 'DHIS2-এর জন্য জেলা সারাংশ'), icon: Cpu, color: 'bg-purple-600 text-white', action: handleDHIS2Export, loading: isDHIS2Exporting },
        ].map(card => (
          <button key={card.title} onClick={card.action} disabled={card.loading}
            className={`${card.color} rounded-xl p-5 text-left flex flex-col gap-3 hover:opacity-90 transition-opacity disabled:opacity-60 shadow-sm`}>
            <card.icon className="w-6 h-6 opacity-80" />
            <div>
              <p className="font-bold text-sm">{card.title}</p>
              <p className="text-[12px] opacity-75 mt-0.5">{card.sub}</p>
            </div>
            {card.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 opacity-60" />}
          </button>
        ))}
      </div>

      <div>
        <p className="text-sm font-bold text-slate-900 mb-3">{L('Policy Reports', 'পলিসি রিপোর্ট')}</p>
        {reports.length > 0 ? (
          <div className="space-y-2">
            {reports.map(report => (
              <div key={report.id} className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{report.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{report.desc}</p>
                  <p className="text-xs text-slate-400 mt-1">{report.date}</p>
                </div>
                <button onClick={() => { setDownloadingReportId(report.id); dl(report.content, report.filename); setDownloadingReportId(null); }}
                  disabled={downloadingReportId === report.id}
                  className="shrink-0 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50">
                  {downloadingReportId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-10 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">{L('No policy reports yet.', 'কোনো পলিসি রিপোর্ট নেই।')}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4">
      <h1 className="text-xl font-black text-slate-900">{L('User Management', 'ব্যবহারকারী ব্যবস্থাপনা')}</h1>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
            placeholder={L('Search name, email or district…', 'নাম, ইমেইল বা জেলা খুঁজুন…')}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20" />
        </div>
        <div className="flex gap-2">
          <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20">
            <option value="all">{L('All Roles', 'সব ভূমিকা')}</option>
            <option value="patient">{L('Patient', 'রোগী')}</option>
            <option value="doctor">{L('Doctor', 'ডাক্তার')}</option>
            <option value="chw">CHW</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={loadUsers} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {usersLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#1A6B8A]" /></div>
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">{L('No users found.', 'কোনো ব্যবহারকারী পাওয়া যায়নি।')}</div>
            ) : filteredUsers.map(u => (
              <div key={u.id} className={`bg-white rounded-xl p-4 shadow-sm transition-opacity ${!u.active ? 'opacity-60' : ''}`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1A6B8A]/10 text-[#1A6B8A] flex items-center justify-center font-bold text-sm shrink-0">
                    {u.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 text-sm truncate">{u.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize shrink-0 ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{u.district || u.email}</p>
                  </div>
                  <button onClick={() => toggleUserStatus(u.id)} disabled={togglingUser === u.id}
                    className={`shrink-0 p-2 rounded-lg transition-colors ${u.active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'} disabled:opacity-50`}>
                    {togglingUser === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2 ml-13 pl-13">
                  <span className={`flex items-center gap-1 text-xs font-medium ${u.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {u.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {u.active ? L('Active', 'সক্রিয়') : L('Disabled', 'নিষ্ক্রিয়')}
                  </span>
                  {u.created_at && <span className="text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-xl overflow-hidden shadow-sm" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase">{L('User', 'ব্যবহারকারী')}</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">{L('Role', 'ভূমিকা')}</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">{L('District', 'জেলা')}</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">{L('Status', 'স্ট্যাটাস')}</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase">{L('Action', 'অ্যাকশন')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">{L('No users found.', 'কোনো ব্যবহারকারী পাওয়া যায়নি।')}</td></tr>
                ) : filteredUsers.map(u => (
                  <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${!u.active ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1A6B8A]/10 text-[#1A6B8A] flex items-center justify-center font-bold text-xs shrink-0">{u.name?.charAt(0) || '?'}</div>
                        <div><p className="font-semibold text-slate-900 text-sm">{u.name}</p><p className="text-xs text-slate-400">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>{u.role}</span></td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{u.district || '—'}</td>
                    <td className="px-4 py-3.5">
                      {u.active
                        ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" />{L('Active', 'সক্রিয়')}</span>
                        : <span className="flex items-center gap-1 text-xs font-semibold text-slate-400"><XCircle className="w-3.5 h-3.5" />{L('Disabled', 'নিষ্ক্রিয়')}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => toggleUserStatus(u.id)} disabled={togglingUser === u.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${u.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'} disabled:opacity-50`}>
                        {togglingUser === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : u.active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {u.active ? L('Disable', 'নিষ্ক্রিয়') : L('Enable', 'সক্রিয়')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <p className="text-xs text-slate-400">{filteredUsers.length} {L('users shown', 'জন দেখাচ্ছে')}</p>
              <div className="flex gap-3 text-xs text-slate-400">
                <span>{allUsers.filter(u => u.active).length} {L('active', 'সক্রিয়')}</span>
                <span>·</span>
                <span>{allUsers.filter(u => !u.active).length} {L('disabled', 'নিষ্ক্রিয়')}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderMore = () => {
    const tools = [
      { id: 'simulator', icon: Calculator, title: L('Budget Simulator', 'বাজেট সিমুলেটর'), sub: L('Model intervention cost savings', 'হস্তক্ষেপের সাশ্রয় মডেল'), color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => setActiveTab('simulator') },
      { id: 'cohorts', icon: Users, title: L('Cohort Tracking', 'কোহর্ট ট্র্যাকিং'), sub: L('Create & monitor patient groups', 'রোগী দল তৈরি ও পর্যবেক্ষণ'), color: 'text-emerald-600', bg: 'bg-emerald-50', onClick: () => setActiveTab('cohorts') },
      { id: 'research', icon: Download, title: L('Research Export', 'গবেষণা রপ্তানি'), sub: L('Anonymized CSV for researchers', 'গবেষকদের অনামী CSV'), color: 'text-purple-600', bg: 'bg-purple-50', onClick: handleResearchExport },
      { id: 'dhis2', icon: Database, title: L('DHIS2 Export', 'DHIS2 রপ্তানি'), sub: L('District aggregates for DHIS2', 'জেলা পরিসংখ্যান রপ্তানি'), color: 'text-amber-600', bg: 'bg-amber-50', onClick: handleDHIS2Export },
      { id: 'fhir', icon: Cpu, title: L('National Report', 'জাতীয় রিপোর্ট'), sub: L('Generate & download full report', 'সম্পূর্ণ রিপোর্ট তৈরি করুন'), color: 'text-red-500', bg: 'bg-red-50', onClick: handleExport },
      { id: 'lang', icon: Globe, title: language === 'en' ? 'বাংলা' : 'English', sub: language === 'en' ? 'বাংলায় পরিবর্তন করুন' : 'Switch to English', color: 'text-slate-600', bg: 'bg-slate-100', onClick: () => setLanguage(language === 'en' ? 'bn' : 'en') },
    ];
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-black text-slate-900">{L('More Tools', 'আরও টুলস')}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tools.map(tool => (
            <button key={tool.id} onClick={tool.onClick}
              className="bg-white rounded-xl p-5 shadow-sm text-left hover:shadow-md transition-shadow active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className={`w-10 h-10 rounded-xl ${tool.bg} flex items-center justify-center mb-3`}>
                <tool.icon className={`w-5 h-5 ${tool.color}`} />
              </div>
              <p className="font-bold text-slate-900 text-sm">{tool.title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tool.sub}</p>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl overflow-hidden shadow-sm" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <button onClick={logout} className="w-full flex items-center gap-4 p-5 hover:bg-red-50 transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-bold text-red-600 text-sm">{L('Sign Out', 'সাইন আউট')}</p>
              <p className="text-xs text-slate-400 mt-0.5">{L('Log out of the admin console', 'অ্যাডমিন কনসোল থেকে বের হন')}</p>
            </div>
          </button>
        </div>
      </div>
    );
  };

  const renderSimulator = () => (
    <div className="space-y-5">
      <SectionHeader
        title={L('Budget Impact Simulator', 'বাজেট প্রভাব সিমুলেটর')}
        sub={L('Model projected dialysis demand and cost savings', 'অনুমানিত সঞ্চয় মডেল করুন')}
        back={L('More', 'আরও')}
        onBack={() => setActiveTab('more')} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form onSubmit={runSimulation} className="bg-white rounded-xl p-5 shadow-sm space-y-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 className="font-bold text-slate-900 text-sm">{L('Parameters', 'প্যারামিটার')}</h3>
          {[
            { label: L('District', 'জেলা'), type: 'select', key: 'district', options: SIM_DISTRICTS.map(d => ({ v: d, l: d })) },
            { label: L('Planning Horizon', 'পরিকল্পনার মেয়াদ'), type: 'select', key: 'years', options: [3, 5, 10].map(y => ({ v: String(y), l: `${y} ${L('years', 'বছর')}` })) },
          ].map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">{f.label}</label>
              <select value={(simForm as any)[f.key]} onChange={e => setSimForm({ ...simForm, [f.key]: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20">
                {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">{L('Target Population', 'লক্ষ্য জনগোষ্ঠী')}</label>
            <input type="number" value={simForm.population} onChange={e => setSimForm({ ...simForm, population: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">
              {L('Screening Coverage', 'স্ক্রিনিং কভারেজ')}: <span className="text-[#1A6B8A] font-bold">{(parseFloat(simForm.screening_coverage) * 100).toFixed(0)}%</span>
            </label>
            <input type="range" min="0.1" max="1" step="0.05" value={simForm.screening_coverage} onChange={e => setSimForm({ ...simForm, screening_coverage: e.target.value })} className="w-full accent-[#1A6B8A]" />
          </div>
          <button type="submit" disabled={simLoading} className="w-full py-3 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#14556e] disabled:opacity-50 transition-all text-sm" style={{ minHeight: '48px' }}>
            {simLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            {L('Run Simulation', 'সিমুলেশন চালান')}
          </button>
        </form>
        <div className="lg:col-span-2 space-y-4">
          {simResult ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: L('Est. CKD', 'অনুমানিত সিকেডি'), value: simResult.estimated_ckd?.toLocaleString(), color: 'bg-blue-50 text-blue-800' },
                  { label: L('Screened', 'স্ক্রিন হওয়া'), value: simResult.screened_patients?.toLocaleString(), color: 'bg-purple-50 text-purple-800' },
                  { label: L('Dialysis Prevented', 'ডায়ালাইসিস প্রতিরোধ'), value: simResult.dialysis_cases_prevented?.toLocaleString(), color: 'bg-emerald-50 text-emerald-800' },
                  { label: 'ROI', value: `${simResult.roi_percent}%`, color: simResult.net_saving_bdt > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800' },
                ].map(c => (
                  <div key={c.label} className={`p-4 rounded-xl ${c.color}`}>
                    <p className="text-xl font-black">{c.value}</p>
                    <p className="text-xs font-semibold mt-0.5 opacity-80">{c.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <p className="text-sm font-bold text-slate-900 mb-3">{L('Cost Analysis (BDT)', 'খরচ বিশ্লেষণ (BDT)')}</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'Cost', Screening: simResult.screening_cost_bdt, Medication: simResult.medication_cost_bdt, Savings: simResult.dialysis_cost_saved_bdt }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={v => formatBDT(v)} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatBDT(v)} />
                      <Legend />
                      <Bar dataKey="Screening" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Medication" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Savings" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={`p-5 rounded-xl border ${simResult.net_saving_bdt > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className="text-xs font-bold uppercase opacity-60 mb-1">{L('Net Economic Impact', 'নেট অর্থনৈতিক প্রভাব')}</p>
                <p className={`text-3xl font-black ${simResult.net_saving_bdt > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{simResult.net_saving_bdt > 0 ? '+' : ''}{formatBDT(simResult.net_saving_bdt)}</p>
                <p className="text-sm opacity-70 mt-1">{formatBDT(simResult.dialysis_cost_saved_bdt)} {L('saved over', 'সাশ্রয়')} {simResult.years} {L('yrs vs.', 'বছরে')} {formatBDT(simResult.total_intervention_cost_bdt)} {L('investment', 'বিনিয়োগ')}</p>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-72 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <div className="text-center"><Calculator className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-sm">{L('Configure parameters and run', 'প্যারামিটার দিয়ে সিমুলেশন চালান')}</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCohorts = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader
          title={L('Outcome Cohorts', 'ফলাফল কোহর্ট')}
          sub={L('Define patient groups and track outcomes', 'রোগীর দল তৈরি করুন')}
          back={L('More', 'আরও')}
          onBack={() => setActiveTab('more')} />
        <button onClick={() => setShowCohortForm(!showCohortForm)}
          className="px-4 py-2 bg-[#1A6B8A] text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-[#14556e] text-sm shrink-0" style={{ minHeight: '44px' }}>
          <Plus className="w-4 h-4" />{L('New', 'নতুন')}
        </button>
      </div>

      {cohortMessage && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {cohortMessage}</div>}

      <AnimatePresence>
        {showCohortForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={submitCohort} className="bg-white rounded-xl p-5 shadow-sm space-y-4 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 className="font-bold text-slate-900 text-sm">{L('New Cohort', 'নতুন কোহর্ট')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-xs font-semibold text-slate-600">{L('Name', 'নাম')}</label>
                <input required type="text" value={cohortForm.name} onChange={e => setCohortForm({ ...cohortForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20" /></div>
              <div className="space-y-1"><label className="text-xs font-semibold text-slate-600">{L('End Date', 'শেষ তারিখ')}</label>
                <input type="date" value={cohortForm.end_date} onChange={e => setCohortForm({ ...cohortForm, end_date: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20" /></div>
            </div>
            <div className="space-y-1"><label className="text-xs font-semibold text-slate-600">{L('Description', 'বিবরণ')}</label>
              <textarea value={cohortForm.description} onChange={e => setCohortForm({ ...cohortForm, description: e.target.value })} rows={2} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20" /></div>
            <div className="space-y-1"><label className="text-xs font-semibold text-slate-600">{L('Select Patients', 'রোগী নির্বাচন')} ({cohortForm.patient_ids.length})</label>
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1">
                {cohortPatients.map((p: any, i: number) => (
                  <label key={i} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer text-xs">
                    <input type="checkbox" checked={cohortForm.patient_ids.includes(p.user_id)}
                      onChange={() => setCohortForm(f => ({ ...f, patient_ids: f.patient_ids.includes(p.user_id) ? f.patient_ids.filter(id => id !== p.user_id) : [...f.patient_ids, p.user_id] }))}
                      className="accent-[#1A6B8A]" />
                    <span className="text-slate-700">{p.district} · Age {p.age} · {p.sex} · Stage {p.ckd_stage}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={cohortSubmitting} className="flex-1 py-3 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                {cohortSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}{L('Create', 'তৈরি করুন')}
              </button>
              <button type="button" onClick={() => setShowCohortForm(false)} className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200">{L('Cancel', 'বাতিল')}</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {cohorts.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-sm">{L('No cohorts yet.', 'কোনো কোহর্ট নেই।')}</p>
            </div>
          ) : cohorts.map(c => (
            <button key={c.id} onClick={() => loadCohortReport(c)} className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm ${selectedCohort?.id === c.id ? 'border-[#1A6B8A] bg-[#1A6B8A]/5' : 'border-slate-100 bg-white'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0"><p className="font-bold text-slate-900 text-sm">{c.name}</p>{c.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{c.description}</p>}</div>
                <span className="ml-2 text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold shrink-0">{c.patient_ids?.length || 0} pts</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">{new Date(c.start_date).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
        <div>
          {cohortReportLoading ? <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#1A6B8A]" /></div>
            : cohortReport ? (
              <div className="bg-white rounded-xl p-5 shadow-sm space-y-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="flex justify-between items-center">
                  <p className="font-bold text-slate-900">{cohortReport.cohort?.name}</p>
                  <button onClick={() => { if (!cohortReport) return; const { cohort: c, patients: pts, summary: s } = cohortReport; dl([`# ${c.name}`, `Total: ${s.total} | Avg Risk: ${s.avg_risk}`, ...Object.entries(s.stage_distribution || {}).map(([st, ct]) => `Stage ${st}: ${ct}`)].join('\n'), `Cohort_${c.name.replace(/\s+/g, '_')}.md`); }} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"><Download className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[{ l: L('Total', 'মোট'), v: cohortReport.summary?.total }, { l: L('Avg Risk', 'গড় ঝুঁকি'), v: cohortReport.summary?.avg_risk }, { l: L('Diabetic', 'ডায়াবেটিক'), v: cohortReport.summary?.diabetic_count }, { l: L('Hypert.', 'উচ্চ রক্তচাপ'), v: cohortReport.summary?.hypertensive_count }].map(s => (
                    <div key={s.l} className="p-3 bg-slate-50 rounded-xl"><p className="text-xl font-black text-slate-900">{s.v ?? '—'}</p><p className="text-[11px] font-semibold text-slate-400 mt-0.5">{s.l}</p></div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">{L('Stage Distribution', 'পর্যায় বিতরণ')}</p>
                  {Object.entries(cohortReport.summary?.stage_distribution || {}).map(([s, c]: any) => (
                    <div key={s} className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-slate-500 w-12">Stage {s}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2"><div className="bg-[#1A6B8A] h-2 rounded-full" style={{ width: `${(c / cohortReport.summary.total) * 100}%` }} /></div>
                      <span className="text-xs font-bold text-slate-700 w-4 text-right">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-56 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <div className="text-center"><BarChart2 className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-sm">{L('Select a cohort to view report', 'কোহর্ট নির্বাচন করুন')}</p></div>
              </div>
            )}
        </div>
      </div>
    </div>
  );

  const sectionMap: Record<AdminTab, () => JSX.Element> = {
    overview: renderOverview,
    map: renderMap,
    reports: renderReports,
    users: renderUsers,
    more: renderMore,
    simulator: renderSimulator,
    cohorts: renderCohorts,
  };

  const mainNav = SIDEBAR_NAV;

  return (
    <div className="flex -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 min-h-[calc(100vh-4rem)] bg-[#F8FAFC]">
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-slate-100 sticky top-16 h-[calc(100vh-4rem)] shrink-0 overflow-hidden">
        <div className="px-4 py-4 border-b border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{L('Admin Console', 'অ্যাডমিন কনসোল')}</p>
          <p className="text-xs text-slate-500 mt-0.5">{L('Public Health Dashboard', 'জনস্বাস্থ্য ড্যাশবোর্ড')}</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {mainNav.map(item => {
            const active = activeTab === item.id || (item.id === 'more' && ['more', 'simulator', 'cohorts'].includes(activeTab));
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${active ? 'bg-[#1A6B8A]/10 text-[#1A6B8A]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                <item.icon className="w-4 h-4 shrink-0" />
                {language === 'bn' ? item.labelBn : item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-0.5">
          <button onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <Globe className="w-4 h-4 shrink-0" />
            {language === 'en' ? 'বাংলা' : 'English'}
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4 shrink-0" />
            {L('Sign Out', 'সাইন আউট')}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {sectionMap[activeTab]?.()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
