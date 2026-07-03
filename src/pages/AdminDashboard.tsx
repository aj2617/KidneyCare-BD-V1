import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  AlertCircle, Download, FileText, Loader2, Map as MapIcon, Users,
  BarChart2, Calculator, Activity, TrendingUp, Shield, CheckCircle2,
  XCircle, Search, Plus, ChevronRight, Layers, RefreshCw, Globe2,
  UserCheck, UserX, Building2, X, CheckCheck, TriangleAlert, Info,
  Filter, Calendar, Database, Sparkles, MapPin, Settings, LayoutDashboard
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
const SafeMapContainer = MapContainer as any;
const SafeTileLayer = TileLayer as any;
const SafeCircleMarker = CircleMarker as any;
const SafePopup = Popup as any;
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
  admin: 'bg-[#EFF8FB] text-[#1A6B8A] border-[#1A6B8A]/20',
  doctor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  patient: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  chw: 'bg-amber-50 text-amber-700 border-amber-100',
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF Generation: Opens a styled print window so the user can save as PDF
// ─────────────────────────────────────────────────────────────────────────────
function printAsPDF(title: string, sections: { heading?: string; body: string }[], metadata?: Record<string, string>) {
  const metaRows = metadata
    ? Object.entries(metadata).map(([k, v]) =>
        `<tr><td style="font-weight:700;color:#555;padding:4px 12px 4px 0;white-space:nowrap">${k}</td><td style="color:#1A6B8A;font-weight:600">${v}</td></tr>`
      ).join('')
    : '';

  const sectionsHTML = sections.map(s => `
    ${s.heading ? `<h2 style="font-size:13px;font-weight:800;color:#1A6B8A;text-transform:uppercase;letter-spacing:.08em;margin:24px 0 8px;border-bottom:2px solid #E0EFF4;padding-bottom:6px">${s.heading}</h2>` : ''}
    <div style="font-size:12px;line-height:1.75;color:#374151;white-space:pre-wrap">${s.body}</div>
  `).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,sans-serif;background:#fff;color:#111;padding:32px 40px;max-width:780px;margin:0 auto}
    @media print{
      body{padding:16px 24px}
      .no-print{display:none!important}
      @page{margin:16mm 14mm;size:A4}
    }
    .header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1A6B8A;padding-bottom:14px;margin-bottom:20px}
    .logo-block{display:flex;align-items:center;gap:10px}
    .logo-circle{width:38px;height:38px;border-radius:10px;background:#1A6B8A;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:15px}
    .org{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em}
    h1{font-size:20px;font-weight:900;color:#111;margin-bottom:4px}
    .meta-table{border-collapse:collapse;margin-bottom:18px;font-size:11px}
    .print-btn{display:inline-flex;align-items:center;gap:8px;margin:18px 0 6px;padding:10px 22px;background:#1A6B8A;color:#fff;font-weight:700;font-size:13px;border:none;border-radius:10px;cursor:pointer;letter-spacing:.03em}
    .print-btn:hover{background:#155e75}
    .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;display:flex;justify-content:space-between}
  </style>
  </head><body>
  <div class="header">
    <div class="logo-block">
      <div class="logo-circle">KC</div>
      <div><div class="org">KidneyCare BD · Public Health Administration</div><h1>${title}</h1></div>
    </div>
    <div style="text-align:right;font-size:10px;color:#9ca3af">Generated<br><strong>${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</strong></div>
  </div>
  ${metaRows ? `<table class="meta-table">${metaRows}</table>` : ''}
  ${sectionsHTML}
  <div class="footer"><span>KidneyCare BD — Confidential Clinical Document</span><span>Page 1</span></div>
  <button class="print-btn no-print" onclick="window.print()">⬇ Save as PDF / Print</button>
  </body></html>`;

  const win = window.open('', '_blank', 'width=860,height=720');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
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
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-inner`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 bg-emerald-50 text-emerald-700">
            <TrendingUp className="w-3.5 h-3.5 animate-pulse" />{trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-black text-slate-800 tracking-tight">{value}</p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</p>
        {sub && <p className="text-xs text-slate-500 font-medium mt-0.5">{sub}</p>}
      </div>
      {sparkData && (
        <div className="h-12 -mx-1 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A6B8A" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1A6B8A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="#1A6B8A" strokeWidth={2}
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

  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; detail?: string } | null>(null);
  const showToast = (type: 'success' | 'error', title: string, detail?: string) => {
    setToast({ type, title, detail });
    setTimeout(() => setToast(null), 5000);
  };

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

      // Build a rich structured PDF
      const sections = [
        { heading: 'Executive Summary', body: data.summary ?? data.content?.split('\n').slice(0,6).join('\n') ?? '' },
        { heading: 'District Patient Distribution', body: (data.districts ?? []).map((d: any, i: number) =>
            `${i+1}. ${d.district} — ${d.count} patients | Avg Risk Score: ${Math.round(d.avg_risk ?? 0)}`
          ).join('\n') || data.content?.split('\n').filter((l: string) => l.match(/^\d+\./)).join('\n') || '' },
        { heading: 'Policy Recommendations', body: data.recommendations ?? '1. Expand screening in the highest-burden districts.\n2. Improve follow-up capacity for districts with elevated average risk.\n3. Use monthly exports to compare district trend movement over time.' },
      ];
      const meta: Record<string, string> = {
        'Report Date': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        'Total Tracked Patients': String(data.total_patients ?? heatmapData.reduce((s,r) => s+r.count,0)),
        'Districts Covered': String(data.districts_count ?? heatmapData.filter(r => r.count > 0).length),
        'National Average Risk Score': String(data.avg_risk ?? Math.round(heatmapData.reduce((s,r) => s+(r.avg_risk??0),0) / (heatmapData.length || 1))),
        'Classification': 'Confidential — For Public Health Administration Only',
      };
      printAsPDF('National CKD Burden & Policy Report', sections, meta);

      showToast('success',
        language === 'bn' ? 'জাতীয় প্রতিবেদন তৈরি হয়েছে' : 'National report opened for PDF download',
        language === 'bn' ? 'নতুন ট্যাবে ব্রাউজারের প্রিন্ট ডায়ালগ ব্যবহার করুন' : 'Use the browser print dialog to save as PDF'
      );
    } catch (err) {
      showToast('error',
        language === 'bn' ? 'রপ্তানি ব্যর্থ হয়েছে' : 'Export failed',
        err instanceof Error ? err.message : undefined
      );
    }
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
      if (!res.ok) throw new Error('Research dataset export failed.');
      
      const text = await res.text();
      const rowCount = Math.max(0, text.split('\n').length - 2); // Exclude header and trailing newline
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      const filename = `KidneyCareBD_Research_${new Date().toISOString().split('T')[0]}${exportDistrict ? '_' + exportDistrict : ''}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
      
      setShowResearchModal(false);
      showToast('success',
        language === 'bn' ? 'গবেষণা ডেটাসেট সফলভাবে রপ্তানি হয়েছে' : 'Research dataset exported successfully',
        language === 'bn'
          ? `${rowCount} রোগীর ডেটা রেকর্ড — ${filename}`
          : `${rowCount} patient records — ${filename}`
      );
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.');
      showToast('error',
        language === 'bn' ? 'রপ্তানি ব্যর্থ হয়েছে' : 'Research export failed',
        err instanceof Error ? err.message : undefined
      );
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
    const sections = [
      {
        heading: 'Cohort Overview',
        body: [
          `Name: ${cohort.name}`,
          `Description: ${cohort.description || 'N/A'}`,
          `Total Patients: ${summary.total}`,
          `Average Risk Score: ${summary.avg_risk}`,
          `Diabetic: ${summary.diabetic_count}  |  Hypertensive: ${summary.hypertensive_count}`,
        ].join('\n'),
      },
      {
        heading: 'CKD Stage Distribution',
        body: Object.entries(summary.stage_distribution || {}).map(([s, c]) =>
          `Stage ${s}: ${c} patients`
        ).join('\n') || 'No stage data available.',
      },
      {
        heading: 'Patient List (Anonymized)',
        body: pts.map((p: any, i: number) =>
          `${i + 1}. ${p.district}, ${p.sex}, Age ${p.age}, Stage ${p.ckd_stage}, Risk ${p.risk_score}`
        ).join('\n') || 'No patients in this cohort.',
      },
    ];
    const meta: Record<string, string> = {
      'Cohort Name': cohort.name,
      'Total Patients': String(summary.total),
      'Avg Risk Score': String(summary.avg_risk),
      'Diabetic Count': String(summary.diabetic_count),
      'Hypertensive Count': String(summary.hypertensive_count),
      'Report Date': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    };
    printAsPDF(`Outcome Cohort Report: ${cohort.name}`, sections, meta);
    showToast('success',
      language === 'bn' ? 'কোহর্ট রিপোর্ট PDF-এ তৈরি হয়েছে' : 'Cohort report opened for PDF download',
      language === 'bn' ? 'নতুন ট্যাবে ব্রাউজারের প্রিন্ট ডায়ালগ ব্যবহার করুন' : `${summary.total} patients — Use browser print dialog to save as PDF`
    );
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#1A6B8A]" />
        <p className="text-slate-500 font-semibold text-sm">{language === 'bn' ? 'ডেটা লোড হচ্ছে...' : 'Loading system dashboard...'}</p>
      </div>
    );
  }

  const bn = language === 'bn';

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-1">

      {/* ── EXPORT TOAST ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed top-5 right-5 z-[9999] max-w-sm w-full shadow-2xl rounded-3xl overflow-hidden"
            style={{
              background: '#fff',
              border: `1.5px solid ${toast.type === 'success' ? '#2ECC71' : '#E74C3C'}`,
            }}
          >
            <div className="flex items-start gap-3 px-4 py-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: toast.type === 'success' ? '#EAFAF1' : '#FEF2F2' }}
              >
                {toast.type === 'success'
                  ? <CheckCheck className="w-5 h-5" style={{ color: '#2ECC71' }} />
                  : <TriangleAlert className="w-5 h-5" style={{ color: '#E74C3C' }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 leading-tight">{toast.title}</p>
                {toast.detail && (
                  <p className="text-xs text-slate-500 mt-1 truncate font-mono">{toast.detail}</p>
                )}
              </div>
              <button
                onClick={() => setToast(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5, ease: 'linear' }}
              style={{
                transformOrigin: 'left',
                height: 4,
                background: toast.type === 'success' ? '#2ECC71' : '#E74C3C',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TEAL HEADER ── */}
      <div
        className="-mx-4 sm:-mx-6 lg:-mx-8 px-6 pt-6 pb-6 mb-2 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #1A6B8A 0%, #0F4A63 100%)', borderRadius: '0 0 2rem 2rem' }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
                {bn ? 'বাংলাদেশ প্রশাসন' : 'Bangladesh Health Admin'}
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1">
              {bn ? 'জনস্বাস্থ্য পর্যবেক্ষণ ও গবেষণা পোর্টাল' : 'Public Health Monitoring & Research'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowResearchModal(true); setExportError(''); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-2xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-md shadow-emerald-950/20 active:scale-95"
            >
              <Database className="w-4 h-4" />
              <span>{bn ? 'গবেষণা CSV রপ্তানি' : 'Export Research Dataset'}</span>
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center p-2.5 bg-white/10 border border-white/20 text-white rounded-2xl hover:bg-white/25 transition-all disabled:opacity-50 active:scale-95"
              title={bn ? 'জাতীয় বোঝা রিপোর্ট ডাউনলোড' : 'Download National Burden Report'}
            >
              {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl px-5 py-4 text-sm font-semibold flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError('')} className="p-1 rounded-lg hover:bg-red-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── TABS NAVIGATION ── */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 rounded-2xl scrollbar-none">
        {([
          { id: 'overview', label: bn ? 'সারসংক্ষেপ' : 'Overview', icon: LayoutDashboard },
          { id: 'map', label: bn ? 'সিকেডি মানচিত্র' : 'CKD Map', icon: MapIcon },
          { id: 'reports', label: bn ? 'রিপোর্ট ও রপ্তানি' : 'Reports & Exports', icon: FileText },
          { id: 'simulator', label: bn ? 'বাজেট সিমুলেটর' : 'Budget Simulator', icon: BarChart2 },
          { id: 'cohorts', label: bn ? 'ফলাফল কোহর্ট' : 'Outcome Cohorts', icon: Users },
          { id: 'users', label: bn ? 'ব্যবহারকারী ব্যবস্থাপনা' : 'Users Management', icon: Shield },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === tab.id ? 'bg-[#1A6B8A] text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/50'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <KpiCard
                  label={bn ? 'মোট নিবন্ধিত রোগী' : 'Total Patients'}
                  value={totalPatients.toLocaleString()}
                  icon={Users}
                  color="bg-[#1A6B8A]/10 text-[#1A6B8A]"
                  sparkData={patientSparkData}
                  trend="+12%"
                />
                <KpiCard
                  label={bn ? 'উচ্চ ঝুঁকি অনুপাত' : 'High Risk Ratio'}
                  value={`${highRiskPct}%`}
                  sub={`${highRiskCount.toLocaleString()} ${bn ? 'রোগী অতি ঝুঁকিপূর্ণ' : 'patients at high risk'}`}
                  icon={AlertCircle}
                  color="bg-red-50 text-red-600"
                  sparkData={riskSparkData}
                />
                <KpiCard
                  label={bn ? 'গড় জিএফআর স্তর' : 'Avg GFR Stage'}
                  value={stats?.stage_distribution?.length ? `Stage ${Math.round(stats.stage_distribution.reduce((s: number, d: any) => s + d.ckd_stage * d.count, 0) / (stats.stage_distribution.reduce((s: number, d: any) => s + d.count, 0) || 1))}` : 'Stage 2'}
                  sub={bn ? 'পর্যায়ভিত্তিক কিডনি অবনতি' : 'Based on latest laboratory inputs'}
                  icon={Activity}
                  color="bg-amber-50 text-amber-600"
                />
              </div>

              {/* Research survey dashboard section */}
              {stats && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-500" />
                        {bn ? 'গবেষণা জরিপ সম্পন্নতার সূচক' : 'Research Survey Completion Status'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {bn ? 'বাধ্যতামূলক সিকেডি এপিডেমিওলজিক্যাল সার্ভে সম্পন্ন করার হার' : 'Completion rate of mandatory survey by registered patients'}
                      </p>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="text-right">
                        <p className="text-4xl font-black text-emerald-600 leading-none">
                          {totalPatients > 0 ? Math.round(((stats.survey_completed_count ?? 0) / totalPatients) * 100) : 0}%
                        </p>
                        <p className="text-xs font-semibold text-slate-400 mt-1">
                          {stats.survey_completed_count ?? 0} / {totalPatients} {bn ? 'জন রোগী' : 'patients'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalPatients > 0 ? Math.round(((stats.survey_completed_count ?? 0) / totalPatients) * 100) : 0}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                    />
                  </div>

                  {Array.isArray(stats.survey_by_district) && stats.survey_by_district.length > 0 ? (
                    <div className="pt-2">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                        {bn ? 'জেলাভিত্তিক জরিপ অংশগ্রহণের হার' : 'District-Wise Participation breakdown'}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                        {(stats.survey_by_district as any[]).map((row: any) => {
                          const pct = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
                          const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
                          const textColor = pct >= 80 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700';
                          return (
                            <div key={row.district} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                              <div className="flex-1 min-w-0 pr-3">
                                <p className="text-xs font-bold text-slate-700 truncate">{row.district}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`text-xs font-black ${textColor}`}>
                                  {pct}%
                                </span>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                  {row.completed}/{row.total} {bn ? 'জন' : 'done'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-6">
                      {bn ? 'কোনো জরিপ ডেটা পাওয়া যায়নি।' : 'No district survey data found.'}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label={bn ? 'মহিলা রোগী অনুপাত' : 'Female Patients %'}
                  value={femalePct !== null ? `${femalePct}%` : 'N/A'}
                  sub={stats?.female_count != null ? `${stats.female_count} ${bn ? 'মহিলা রোগী' : 'female patients'}` : undefined}
                  icon={UserCheck}
                  color="bg-indigo-50 text-indigo-600"
                />
                <KpiCard
                  label={bn ? 'জেলাসমূহে বিস্তৃতি' : 'Districts Covered'}
                  value={`${districtsCovered}/64`}
                  sub={bn ? 'দেশব্যাপী কার্যক্রম বিস্তার' : 'Active clinical networks'}
                  icon={Globe2}
                  color="bg-emerald-50 text-emerald-600"
                  trend={`${Math.round((districtsCovered / 64) * 100)}%`}
                />
                <KpiCard
                  label={bn ? 'গবেষণার ডেটাসেট' : 'Surveys Done'}
                  value={(stats?.survey_completed_count ?? 0).toLocaleString()}
                  sub={bn ? 'রপ্তানির জন্য প্রস্তুত' : 'Records ready for CSV'}
                  icon={CheckCircle2}
                  color="bg-teal-50 text-teal-600"
                  trend={totalPatients > 0 ? `${Math.round(((stats?.survey_completed_count ?? 0) / totalPatients) * 100)}%` : '0%'}
                />
                <KpiCard
                  label={bn ? 'বাকি জরিপসমূহ' : 'Surveys Pending'}
                  value={(totalPatients - (stats?.survey_completed_count ?? 0)).toLocaleString()}
                  sub={bn ? 'রোগীর সাহায্য প্রয়োজন' : 'Action needed via CHW'}
                  icon={AlertCircle}
                  color="bg-rose-50 text-rose-600"
                />
              </div>

              {/* Other infrastructure metrics */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: bn ? 'নিবন্ধিত চিকিৎসক' : 'Active Doctors', value: stats.total_doctors, color: 'bg-indigo-500' },
                    { label: bn ? 'মাঠ পর্যায়ের কর্মী' : 'CHW Field Force', value: stats.total_chw, color: 'bg-emerald-500' },
                    { label: bn ? 'লগকৃত ভাইটালস' : 'Logged Vitals', value: stats.total_vitals_logs?.toLocaleString(), color: 'bg-amber-500' },
                    { label: bn ? 'ঝুঁকি ফিডব্যাক' : 'Risk Feedbacks', value: stats.risk_feedback_count, color: 'bg-rose-500' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                      <div className={`w-3 h-3 rounded-full ${s.color} mb-3`} />
                      <p className="text-2xl font-black text-slate-800 leading-none">{s.value ?? '--'}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2 truncate">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Stage distribution chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm lg:col-span-2">
                  <h3 className="font-black text-slate-800 text-sm mb-4 uppercase tracking-wider">
                    {bn ? 'কিডনি রোগ পর্যায় বণ্টন' : 'CKD Stage Distribution'}
                  </h3>
                  {stats?.stage_distribution?.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.stage_distribution.map((d: any) => ({ name: `Stage ${d.ckd_stage}`, count: d.count }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                          <Bar dataKey="count" fill="#1A6B8A" radius={[8, 8, 0, 0]}
                            label={{ position: 'top', fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm text-center py-12">No stage data currently loaded.</p>
                  )}
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-black text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Filter className="w-4 h-4 text-rose-500" />
                    {bn ? 'সর্বোচ্চ ঝুঁকিপূর্ণ ৩ জেলা' : 'Top 3 High-Risk Districts'}
                  </h3>
                  {top3HighRisk.length > 0 ? (
                    <div className="space-y-3">
                      {top3HighRisk.map((d, i) => (
                        <div key={d.district} className="flex items-center gap-3 p-3 rounded-2xl bg-rose-50/50 border border-rose-100">
                          <span className="text-sm font-black text-rose-600">#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{d.district}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{d.count} {bn ? 'রোগী ট্র্যাকড' : 'patients tracked'}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black text-rose-600">{Math.round(d.avg_risk ?? 0)}</span>
                            <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest leading-none mt-0.5">{bn ? 'গড় ঝুঁকি' : 'avg risk'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm text-center py-12">No risk details calculated.</p>
                  )}
                </div>
              </div>

              {/* District ranking table */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                <h3 className="font-black text-slate-800 text-sm mb-5 uppercase tracking-wider flex items-center gap-2">
                  <Globe2 className="w-4.5 h-4.5 text-[#1A6B8A]" />
                  {bn ? 'জেলাভিত্তিক রোগী ও ঝুঁকি বিস্তার' : 'District Prevalence & Risk Registry'}
                </h3>
                <div className="space-y-3">
                  {sortedHeatmap.slice(0, 8).map((d, i) => (
                    <div key={d.district} className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 w-5">{i + 1}</span>
                        <span className="text-sm font-bold text-slate-700 w-28 truncate">{d.district}</span>
                      </div>
                      <div className="flex-1 max-w-md bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min((d.count / (sortedHeatmap[0]?.count || 1)) * 100, 100)}%`,
                            background: (d.avg_risk ?? 0) > 60 ? '#E74C3C' : '#1A6B8A'
                          }} />
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-slate-800 w-8 text-right">{d.count}</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-black min-w-[36px] text-center ${ (d.avg_risk ?? 0) > 60 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600' }`}>
                          {Math.round(d.avg_risk ?? 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── MAP TAB ── */}
          {activeTab === 'map' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{bn ? 'মানচিত্র স্তর:' : 'Layer:'}</span>
                  {([
                    { id: 'density', label: bn ? 'রোগী ঘনত্ব' : 'Patient Density' },
                    { id: 'risk', label: bn ? 'গড় ঝুঁকি স্তর' : 'Risk Distribution' },
                  ] as const).map(l => (
                    <button key={l.id} onClick={() => setMapLayer(l.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${mapLayer === l.id ? 'bg-[#1A6B8A] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/65'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#E74C3C]" />{bn ? 'উচ্চ ঝুঁকি' : 'High Risk'}</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F39C12]" />{bn ? 'মাঝারি' : 'Moderate'}</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />{bn ? 'কর্মীর পরিদর্শন' : 'CHW Node'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                <div className="lg:col-span-3">
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-[420px] sm:h-[520px] lg:h-[600px] relative z-10">
                    {heatmapData.length ? (
                      <SafeMapContainer center={[23.685, 90.3563]} zoom={7} style={{ height: '100%', width: '100%' }}>
                        <SafeTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                        {heatmapData.map(district => {
                          const coords = DISTRICTS_COORDS[district.district] || [23.8103, 90.4125];
                          const isHighRisk = (district.avg_risk ?? 0) > 50;
                          const radius = mapLayer === 'density'
                            ? Math.max(8, Math.min(district.count * 6, 36))
                            : Math.max(8, Math.min((district.avg_risk ?? 0) / 1.8, 36));
                          return (
                            <SafeCircleMarker key={district.district} center={coords}
                              radius={radius}
                              fillColor={isHighRisk ? '#E74C3C' : '#F39C12'}
                              color="#fff" weight={1.5} fillOpacity={0.7}
                              eventHandlers={{ click: () => setSelectedDistrict(district) }}>
                              <SafePopup>
                                <div className="text-xs p-1 font-sans">
                                  <p className="font-black text-slate-800 text-sm mb-1">{district.district}</p>
                                  <p className="text-slate-500 font-semibold">{bn ? 'নিবন্ধিত রোগী:' : 'Patients:'} <strong className="text-slate-800">{district.count}</strong></p>
                                  <p className="text-slate-500 font-semibold">{bn ? 'গড় ঝুঁকি স্তর:' : 'Avg Risk Score:'} <strong className="text-slate-800">{Math.round(district.avg_risk ?? 0)}/100</strong></p>
                                </div>
                              </SafePopup>
                            </SafeCircleMarker>
                          );
                        })}
                        {chwPoints.map((pt, i) => (
                          <SafeCircleMarker key={`chw-${i}`} center={[pt.lat, pt.lng]} radius={4.5}
                            fillColor="#10b981" color="#fff" weight={1} fillOpacity={0.9}>
                            <SafePopup>
                              <div className="text-[10px]">
                                <p className="font-bold text-emerald-600">{bn ? 'কর্মীর পর্যবেক্ষণ ভিজিট' : 'CHW Patient Node'}</p>
                                <p className="text-slate-500 mt-0.5">{pt.patient_name}</p>
                              </div>
                            </SafePopup>
                          </SafeCircleMarker>
                        ))}
                      </SafeMapContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        {bn ? 'অবস্থান চিত্র লোড হচ্ছে না।' : 'Map coordinate grid not populated.'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedDistrict ? (
                    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border border-[#1A6B8A] p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#1A6B8A]" />
                          {selectedDistrict.district}
                        </h4>
                        <button onClick={() => setSelectedDistrict(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                          <span className="text-lg font-black text-slate-800">{selectedDistrict.count}</span>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{bn ? 'রোগী' : 'patients'}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                          <span className="text-lg font-black text-[#1A6B8A]">{Math.round(selectedDistrict.avg_risk ?? 0)}</span>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{bn ? 'গড় ঝুঁকি' : 'risk index'}</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-5 text-center text-slate-400 text-xs">
                      {bn ? 'মানচিত্রে যেকোনো জেলার ওপর ক্লিক করুন' : 'Click on any district circle on the map to filter details'}
                    </div>
                  )}

                  <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-3 text-xs uppercase tracking-widest">{bn ? 'শীর্ষ ঝুঁকিপূর্ণ এলাকাসমূহ' : 'High Burden Focus Areas'}</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {sortedHeatmap.slice(0, 8).map((d, i) => (
                        <button key={d.district} onClick={() => setSelectedDistrict(d)}
                          className="w-full flex items-center justify-between text-left hover:bg-slate-50 p-2 rounded-xl transition-all border border-transparent hover:border-slate-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-black text-slate-400 w-4">{i + 1}</span>
                            <span className="text-xs font-bold text-slate-700 truncate">{d.district}</span>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-50 text-rose-600">{d.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── REPORTS TAB ── */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-[#1A6B8A] to-[#0A4157] text-white rounded-3xl p-6 shadow-md shadow-[#1A6B8A]/10 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                    <FileText className="w-48 h-48" />
                  </div>
                  <FileText className="w-10 h-10 mb-4 opacity-90" />
                  <h3 className="text-lg font-black mb-1">{bn ? 'জাতীয় কিডনি রোগ বোঝা প্রতিবেদন' : 'National Burden & Policy Report'}</h3>
                  <p className="text-xs opacity-75 mb-6 leading-relaxed">
                    {bn ? 'দেশব্যাপী সিকেডি রোগী বিস্তার, ভৌগোলিক বিস্তৃতি এবং পলিসিগত প্রাধিকার সংক্রান্ত সংক্ষিপ্ত বিবরণ ডাউনলোড করুন।' : 'Full aggregated national report including regional statistics, risk factors, and institutional recommendations.'}
                  </p>
                  <button onClick={handleExport} disabled={isExporting}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-[#1A6B8A] hover:bg-white/95 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-black/10 active:scale-95">
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>{isExporting ? (bn ? 'তৈরি হচ্ছে...' : 'Assembling...') : (bn ? 'PDF রিপোর্ট ডাউনলোড' : 'Download PDF Report')}</span>
                  </button>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner"><Database className="w-6 h-6" /></div>
                      <div>
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">{bn ? 'গবেষণা ডেটাসেট পোর্টাল' : 'Research Dataset Center'}</h3>
                        <p className="text-xs text-slate-400 font-semibold">{bn ? 'জরিপ উত্তর ও ক্লিনিকাল সূচকসমূহ' : 'Anonymized epidemiology & clinical arrays'}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {bn ? 'সার্ভে এবং ক্লিনিকাল ভাইটালস সমন্বিত ডেটা। গবেষক এবং ডাক্তারদের জন্য বেনামী উপায়ে প্রস্তুতকৃত। আপনি বিভাগ, জেলা ও রেজিস্ট্রেশন তারিখ অনুযায়ী ফিল্টার করতে পারবেন।' : 'Access multi-variable patient rows with clinical readings, survey responses, lifestyle inputs, and laboratory GFR values. Fully anonymized.'}
                    </p>
                  </div>
                  <button onClick={() => { setShowResearchModal(true); setExportError(''); }}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm transition-all mt-6 shadow-lg shadow-emerald-500/10 active:scale-95">
                    <Filter className="w-4 h-4" />
                    <span>{bn ? 'রপ্তানি কনফিগার করুন' : 'Configure & Export Dataset'}</span>
                  </button>
                </div>
              </div>

              {/* Policy reports list */}
              <div>
                <h3 className="font-black text-slate-800 text-sm mb-4 uppercase tracking-widest">{bn ? 'পলিসি ও প্রাতিষ্ঠানিক প্রতিবেদনসমূহ' : 'Policy & Institutional Reports'}</h3>
                {reports.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reports.map(report => (
                      <div key={report.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 rounded-2xl bg-slate-50 text-[#1A6B8A] group-hover:bg-[#1A6B8A] group-hover:text-white transition-colors">
                              <FileText className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-slate-400">{report.date}</span>
                          </div>
                          <h4 className="font-bold text-slate-800 mb-1 group-hover:text-[#1A6B8A] transition-colors">{report.title}</h4>
                          <p className="text-slate-500 text-xs leading-relaxed mb-6">{report.desc}</p>
                        </div>
                        <button onClick={() => {
                          const meta: Record<string, string> = {
                            'Report Date': report.date,
                            'Document ID': report.id,
                            'Classification': 'Confidential — For Institutional Use',
                          };
                          const bodyText = report.content
                            .split('\n')
                            .filter((l: string) => !l.startsWith('#'))
                            .join('\n');
                          const sections = [{ heading: report.title, body: bodyText }];
                          printAsPDF(report.title, sections, meta);
                          showToast('success',
                            bn ? 'রিপোর্ট PDF-এ তৈরি হয়েছে' : 'Report opened for PDF download',
                            bn ? 'প্রিন্ট ডায়ালগ ব্যবহার করুন' : 'Use browser print dialog to save as PDF'
                          );
                        }}
                          className="text-xs font-bold text-[#1A6B8A] flex items-center gap-1.5 hover:underline">
                          <Download className="w-3.5 h-3.5" />
                          <span>{bn ? 'PDF ডাউনলোড' : 'Download PDF'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-semibold">{bn ? 'কোনো পলিসি নথি পাওয়া যায়নি।' : 'No policy reports populated.'}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BUDGET IMPACT SIMULATOR ── */}
          {activeTab === 'simulator' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">{bn ? 'বাজেট প্রভাব ও প্রতিরোধ সিমুলেটর' : 'Budget Impact & Dialysis Prevention Simulator'}</h2>
                <p className="text-xs text-slate-400 font-semibold mt-1">{bn ? 'প্রাথমিক স্ক্রিনিং এবং হস্তক্ষেপ থেকে অনুমানিত সরকারি ব্যয় সাশ্রয় মডেল করুন' : 'Model early prevention, CKD slowing, and dialysis demand cost offsets across populations'}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <form onSubmit={runSimulation} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{bn ? 'ইনপুট প্যারামিটার' : 'Simulation Inputs'}</h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">{bn ? 'লক্ষ্য জেলা' : 'Target District'}</label>
                      <select value={simForm.district} onChange={e => setSimForm({ ...simForm, district: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/25">
                        {DISTRICTS_SIM.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">{bn ? 'জনসংখ্যা আকার' : 'District Population size'}</label>
                      <input type="number" value={simForm.population} onChange={e => setSimForm({ ...simForm, population: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/25" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">{bn ? 'পরিকল্পনা হরাইজন' : 'Horizon Years'}</label>
                      <select value={simForm.years} onChange={e => setSimForm({ ...simForm, years: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/25">
                        {[3, 5, 10].map(y => <option key={y} value={y}>{y} {bn ? 'বছর' : 'Years'}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                        <span>{bn ? 'কর্মীদের স্ক্রিনিং কভারেজ' : 'Screening Coverage'}</span>
                        <span className="text-[#1A6B8A] font-black">{(parseFloat(simForm.screening_coverage) * 100).toFixed(0)}%</span>
                      </label>
                      <input type="range" min="0.1" max="1" step="0.05" value={simForm.screening_coverage}
                        onChange={e => setSimForm({ ...simForm, screening_coverage: e.target.value })}
                        className="w-full accent-[#1A6B8A]" />
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold"><span>10%</span><span>100%</span></div>
                    </div>

                    {simError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg font-medium">{simError}</p>}
                    
                    <button type="submit" disabled={simLoading}
                      className="w-full py-3 bg-[#1A6B8A] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#14556e] disabled:opacity-50 transition-all shadow-md active:scale-95">
                      {simLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                      <span>{bn ? 'সিমুলেশন পরিচালনা করুন' : 'Compute Savings'}</span>
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  {simResult ? (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: bn ? 'অনুমানিত আক্রান্ত' : 'Est. CKD', value: simResult.estimated_ckd?.toLocaleString(), bg: 'bg-[#EFF8FB]', color: 'text-[#1A6B8A]' },
                          { label: bn ? 'স্ক্রিনড রোগী' : 'Screened', value: simResult.screened_patients?.toLocaleString(), bg: 'bg-indigo-50', color: 'text-indigo-700' },
                          { label: bn ? 'বাঁচানো ডায়ালাইসিস' : 'Dialysis Saved', value: simResult.dialysis_cases_prevented?.toLocaleString(), bg: 'bg-emerald-50', color: 'text-emerald-700' },
                          { label: 'Projected ROI', value: `${simResult.roi_percent}%`, bg: simResult.net_saving_bdt > 0 ? 'bg-emerald-50' : 'bg-rose-50', color: simResult.net_saving_bdt > 0 ? 'text-emerald-700' : 'text-rose-700' },
                        ].map(c => (
                          <div key={c.label} className={`p-4 rounded-3xl ${c.bg} ${c.color} border border-black/5`}>
                            <p className="text-2xl font-black">{c.value}</p>
                            <p className="text-[10px] font-bold uppercase mt-1 opacity-80">{c.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-4">{bn ? 'ব্যয় বনাম সঞ্চয় বিশ্লেষণ (BDT)' : 'Investment vs. Savings Projection (BDT)'}</h4>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{
                              name: 'BDT Value',
                              [bn ? 'স্ক্রিনিং' : 'Screening']: simResult.screening_cost_bdt,
                              [bn ? 'ওষুধ ও ফলোআপ' : 'Medication']: simResult.medication_cost_bdt,
                              [bn ? 'সাশ্রয়' : 'Savings']: simResult.dialysis_cost_saved_bdt,
                            }]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" />
                              <YAxis tickFormatter={v => formatBDT(v)} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(v: number) => formatBDT(v)} />
                              <Legend />
                              <Bar dataKey={bn ? 'স্ক্রিনিং' : 'Screening'} fill="#1A6B8A" radius={[4, 4, 0, 0]} />
                              <Bar dataKey={bn ? 'ওষুধ ও ফলোআপ' : 'Medication'} fill="#F39C12" radius={[4, 4, 0, 0]} />
                              <Bar dataKey={bn ? 'সাশ্রয়' : 'Savings'} fill="#2ECC71" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className={`p-5 rounded-3xl border ${simResult.net_saving_bdt > 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">{bn ? 'নেট অর্থনৈতিক প্রভাব' : 'Net Economic Impact'}</p>
                        <p className="text-3xl font-black" style={{ color: simResult.net_saving_bdt > 0 ? '#1a7a44' : '#7b1a1a' }}>
                          {simResult.net_saving_bdt > 0 ? '+' : ''}{formatBDT(simResult.net_saving_bdt)}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          {formatBDT(simResult.dialysis_cost_saved_bdt)} {bn ? 'ডায়ালাইসিস সাশ্রয়' : 'dialysis cost avoided'} vs. {formatBDT(simResult.total_intervention_cost_bdt)} {bn ? 'কর্মীদের স্ক্রিনিং ব্যয়' : 'screening input cost'} · {simResult.years} {bn ? 'বছরে' : 'years'}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-center h-80 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <div className="text-center">
                        <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm font-semibold">{bn ? 'বাম পাশে প্যারামিটার দিয়ে সিমুলেট করুন' : 'Configure parameters and execute mathematical model'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── OUTCOME COHORTS ── */}
          {activeTab === 'cohorts' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">{bn ? 'গবেষণা ও ফলাফল পর্যবেক্ষণ কোহর্ট' : 'Longitudinal Outcome Cohorts'}</h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">{bn ? 'নির্দিষ্ট রোগীদের ট্র্যাকিং দল গঠন করে আউটকাম বিশ্লেষণ করুন' : 'Define patient cohort cohorts to monitor clinical progression over time'}</p>
                </div>
                <button onClick={() => setShowCohortForm(!showCohortForm)}
                  className="px-4 py-2.5 bg-[#1A6B8A] hover:bg-[#14556e] text-white rounded-2xl font-bold flex items-center gap-2 transition-all text-xs shadow-md shadow-slate-900/10 active:scale-95">
                  <Plus className="w-4.5 h-4.5" />
                  <span>{bn ? 'নতুন গবেষণা কোহর্ট' : 'Build New Cohort'}</span>
                </button>
              </div>

              {cohortMessage && (
                <div className="p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {cohortMessage}
                </div>
              )}

              <AnimatePresence>
                {showCohortForm && (
                  <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    onSubmit={submitCohort} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 overflow-hidden">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{bn ? 'কোহর্ট ক্রিয়েটর' : 'New Cohort Details'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">{bn ? 'কোহর্ট নাম' : 'Cohort Name'}</label>
                        <input required type="text" value={cohortForm.name} onChange={e => setCohortForm({ ...cohortForm, name: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/25"
                          placeholder={bn ? 'উদা: খাগড়াছড়ি হেভি মেটাল ট্রায়াল ২০২৬' : 'e.g. Arsenic Cohort 2026'} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">{bn ? 'সমাপ্তির তারিখ' : 'Target Observation Date'}</label>
                        <input type="date" value={cohortForm.end_date} onChange={e => setCohortForm({ ...cohortForm, end_date: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/25" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">{bn ? 'উদ্দেশ্য / বিবরণ' : 'Description / Research Hypotheses'}</label>
                      <textarea value={cohortForm.description} onChange={e => setCohortForm({ ...cohortForm, description: e.target.value })}
                        rows={2} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/25" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        {bn ? 'রোগী বাছাই করুন' : 'Add Patients to Cohort'} ({cohortForm.patient_ids.length} {bn ? 'নির্বাচিত' : 'selected'})
                      </label>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-3 bg-slate-50">
                        {cohortPatients.map((p: any, i: number) => (
                          <label key={i} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-xl text-xs transition-colors">
                            <input type="checkbox" checked={cohortForm.patient_ids.includes(p.user_id)}
                              onChange={() => setCohortForm(f => ({
                                ...f,
                                patient_ids: f.patient_ids.includes(p.user_id)
                                  ? f.patient_ids.filter(id => id !== p.user_id)
                                  : [...f.patient_ids, p.user_id]
                              }))} className="accent-[#1A6B8A]" />
                            <span className="text-slate-700 font-medium">{p.district} · Age {p.age} · {p.sex} · Stage {p.ckd_stage} (Risk {p.risk_score})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={cohortSubmitting}
                        className="flex-1 py-3 bg-[#1A6B8A] text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-xs shadow-md active:scale-95">
                        {cohortSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                        <span>{bn ? 'কোহর্ট তৈরি করুন' : 'Confirm Cohort Setup'}</span>
                      </button>
                      <button type="button" onClick={() => setShowCohortForm(false)}
                        className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs">
                        {bn ? 'বাতিল' : 'Cancel'}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">{bn ? 'কোহর্ট রেজিস্ট্রি' : 'Active Cohort Registry'} <span className="text-slate-400 font-normal">({cohorts.length})</span></h3>
                  {cohorts.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm font-semibold">{bn ? 'এখনো কোনো কোহর্ট নেই।' : 'No outcome cohorts established yet.'}</p>
                    </div>
                  ) : cohorts.map(c => (
                    <button key={c.id} onClick={() => loadCohortReport(c)}
                      className={`w-full text-left p-4 rounded-3xl border transition-all hover:shadow-sm ${selectedCohort?.id === c.id ? 'border-[#1A6B8A] bg-[#1A6B8A]/5' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                          {c.description && <p className="text-xs text-slate-500 mt-1 truncate">{c.description}</p>}
                        </div>
                        <span className="ml-2 text-xs px-2.5 py-0.5 bg-slate-100 text-[#1A6B8A] rounded-full font-black shrink-0">
                          {c.patient_ids?.length || 0} {bn ? 'রোগী' : 'pts'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3">{bn ? 'শুরু:' : 'Started:'} {new Date(c.start_date).toLocaleDateString()}</p>
                    </button>
                  ))}
                </div>

                <div>
                  {cohortReportLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#1A6B8A]" /></div>
                  ) : cohortReport ? (
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h3 className="font-black text-slate-800 text-sm">{cohortReport.cohort?.name}</h3>
                        <button onClick={downloadCohortReport}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700">
                          <Download className="w-3.5 h-3.5" />
                          <span>{bn ? 'রিপোর্ট ডাউনলোড' : 'Download report'}</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: bn ? 'মোট রোগী' : 'Cohort Size', value: cohortReport.summary?.total },
                          { label: bn ? 'গড় ঝুঁকি সূচক' : 'Avg Risk Index', value: cohortReport.summary?.avg_risk },
                          { label: bn ? 'ডায়াবেটিক %' : 'Diabetic', value: cohortReport.summary?.diabetic_count },
                          { label: bn ? 'উচ্চ রক্তচাপ %' : 'Hypertensive', value: cohortReport.summary?.hypertensive_count },
                        ].map(s => (
                          <div key={s.label} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-2xl font-black text-slate-800">{s.value ?? '--'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">{bn ? 'কিডনি রোগ পর্যায় বিন্যাস' : 'Cohort GFR Stage Split'}</p>
                        {Object.entries(cohortReport.summary?.stage_distribution || {}).map(([s, c]: any) => (
                          <div key={s} className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-bold text-slate-500 w-16">Stage {s}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-[#1A6B8A] h-full rounded-full" style={{ width: `${(c / cohortReport.summary.total) * 100}%` }} />
                            </div>
                            <span className="text-xs font-black text-slate-700 w-5 text-right">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <div className="text-center">
                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm font-semibold">{bn ? 'বাম পাশ থেকে কোহর্ট নির্বাচন করুন' : 'Select cohort to fetch observation report'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">{bn ? 'ব্যবহারকারী ও কর্মী অনুমোদন উইং' : 'Platform User Access Authority'}</h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">{bn ? 'নিবন্ধিত রোগী, ডাক্তার এবং মাঠ কর্মীদের অ্যাকাউন্ট অনুমোদন ও নিয়ন্ত্রণ' : 'Enable, disable, or audit login permissions for security across the clinical registry'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    placeholder={bn ? 'নাম, ইমেল বা জেলা দিয়ে অনুসন্ধান...' : 'Search by name, email or district location...'}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/25" />
                </div>
                <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/25 font-bold text-slate-600">
                  <option value="all">{bn ? 'সব রোল' : 'All Roles'}</option>
                  <option value="patient">{bn ? 'রোগী' : 'Patient'}</option>
                  <option value="doctor">{bn ? 'চিকিৎসক' : 'Doctor'}</option>
                  <option value="chw">CHW (Health Worker)</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={loadUsers} className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm flex items-center gap-2 hover:bg-slate-50 text-slate-600 font-bold active:scale-95 transition-all">
                  <RefreshCw className="w-4 h-4" />
                  <span>{bn ? 'রিফ্রেশ' : 'Reload'}</span>
                </button>
              </div>

              {usersLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" /></div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="md:hidden p-4 space-y-3">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 font-semibold">
                        {bn ? 'কোনো অ্যাকাউন্ট পাওয়া যায়নি।' : 'No users found matching requirements.'}
                      </div>
                    ) : filteredUsers.map(u => (
                      <div key={u.id} className={`rounded-2xl border p-4 shadow-sm ${u.active ? 'border-slate-100' : 'border-slate-200 bg-slate-50/60'}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-[#1A6B8A]/10 text-[#1A6B8A] flex items-center justify-center font-black text-sm uppercase shrink-0">
                            {u.name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-black text-slate-800 truncate">{u.name}</p>
                                <p className="text-xs text-slate-400 truncate">{u.email}</p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border shrink-0 ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>
                                {u.role}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                              <div className="rounded-xl bg-slate-50 px-3 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{bn ? 'অবস্থান' : 'Location'}</p>
                                <p className="mt-1 font-semibold text-slate-700 flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{u.district || '—'}</span>
                                </p>
                              </div>
                              <div className="rounded-xl bg-slate-50 px-3 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{bn ? 'রেজিস্ট্রেশন' : 'Registered'}</p>
                                <p className="mt-1 font-semibold text-slate-700">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 mt-4">
                              {u.active ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{bn ? 'অনুমোদিত' : 'Approved'}</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                                  <XCircle className="w-4 h-4" />
                                  <span>{bn ? 'স্থগিত' : 'Suspended'}</span>
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => toggleUserStatus(u.id)}
                              disabled={togglingUser === u.id}
                              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 active:scale-95"
                              style={u.active ? { background: '#FFF1F0', color: '#CF1322', border: '1px solid #FFA39E' } : { background: '#F6FFED', color: '#389E0D', border: '1px solid #B7EB8F' }}>
                              {togglingUser === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              <span>{u.active ? (bn ? 'স্থগিত করুন' : 'Suspend') : (bn ? 'পুনরুদ্ধার' : 'Approve')}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse" role="table">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/75">
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">{bn ? 'ব্যবহারকারী' : 'User Detail'}</th>
                          <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">{bn ? 'রোল' : 'Role'}</th>
                          <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">{bn ? 'অবস্থান' : 'Location'}</th>
                          <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">{bn ? 'রেজিস্ট্রেশন' : 'Registered'}</th>
                          <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">{bn ? 'অনুমোদন' : 'Control Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredUsers.length === 0 ? (
                          <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-semibold">{bn ? 'কোনো অ্যাকাউন্ট পাওয়া যায়নি।' : 'No users found matching requirements.'}</td></tr>
                        ) : filteredUsers.map(u => (
                          <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${!u.active ? 'bg-slate-50/30' : ''}`}>
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#1A6B8A]/10 text-[#1A6B8A] flex items-center justify-center font-black text-xs uppercase shrink-0">
                                  {u.name?.charAt(0) || '?'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 truncate">{u.name}</p>
                                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4.5">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-4.5">
                              <span className="text-slate-600 flex items-center gap-1.5 text-xs font-medium">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {u.district || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-4.5 text-xs text-slate-400 font-medium">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-4.5">
                              {u.active ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{bn ? 'অনুমোদিত' : 'Approved'}</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                                  <XCircle className="w-4 h-4" />
                                  <span>{bn ? 'স্থগিত' : 'Suspended'}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <button
                                onClick={() => toggleUserStatus(u.id)}
                                disabled={togglingUser === u.id}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
                                style={u.active ? { background: '#FFF1F0', color: '#CF1322', border: '1px solid #FFA39E' } : { background: '#F6FFED', color: '#389E0D', border: '1px solid #B7EB8F' }}>
                                {togglingUser === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                                  u.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                <span>{u.active ? (bn ? 'স্থগিত করুন' : 'Suspend') : (bn ? 'পুনরুদ্ধার' : 'Approve')}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <p className="text-xs text-slate-500 font-semibold">
                      {bn ? `${filteredUsers.length} জন অ্যাকাউন্ট দেখানো হচ্ছে` : `Showing ${filteredUsers.length} system accounts`}
                    </p>
                    <div className="flex gap-4 text-xs font-bold text-slate-400">
                      <span className="text-emerald-600">{allUsers.filter(u => u.active).length} {bn ? 'সক্রিয়' : 'active'}</span>
                      <span>·</span>
                      <span className="text-rose-600">{allUsers.filter(u => !u.active).length} {bn ? 'স্থগিত' : 'suspended'}</span>
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
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowResearchModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-800">
                    {bn ? 'গবেষণা এপিডেমিওলজিক্যাল ডেটাসেট রপ্তানি' : 'Epidemiological Research CSV Export'}
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {bn ? 'জাতীয় গবেষণার জন্য সম্পূর্ণ বেনামী ক্লিনিকাল এবং সার্ভে বিন্যাস' : 'Anonymized dataset for research analysis & public health trials'}
                  </p>
                </div>
                <button onClick={() => setShowResearchModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Column details chips */}
              <div className="space-y-2 mb-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">{bn ? 'উপাত্তভুক্ত ভেরিয়েবলসমূহ' : 'Export variables included (52 fields)'}</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: bn ? 'জনমিতি' : 'Demographics', count: 6 },
                    { label: bn ? 'অসুস্থতার বিবরণ' : 'History', count: 11 },
                    { label: bn ? 'লক্ষণসমূহ' : 'Symptoms', count: 8 },
                    { label: bn ? 'খাদ্য ও ঔষধ' : 'Lifestyle', count: 6 },
                    { label: bn ? 'জিএফআর/রক্ত' : 'Lab Readings', count: 4 },
                    { label: bn ? 'ভাইটালস সূচক' : 'Vitals', count: 9 },
                    { label: bn ? 'ঝুঁকি ইঞ্জিন' : 'Risk Signals', count: 8 },
                  ].map(c => (
                    <span key={c.label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-xs font-bold">
                      {c.label} <span className="text-[10px] font-black text-[#1A6B8A]">×{c.count}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
                    {bn ? 'জেলা নির্বাচন (ঐচ্ছিক)' : 'District Filter (optional)'}
                  </label>
                  <select
                    value={exportDistrict}
                    onChange={e => setExportDistrict(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/25"
                  >
                    <option value="">{bn ? '— সকল জেলা —' : '— All districts —'}</option>
                    {['Dhaka','Chittagong','Rajshahi','Khulna','Barisal','Sylhet','Rangpur',
                      'Mymensingh','Gazipur','Narayanganj','Comilla','Chapainawabganj','Noakhali',
                      'Faridpur','Rajbari','Bogra','Dinajpur','Jessore','Tangail','Pabna'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
                      {bn ? 'শুরুর তারিখ' : 'Registration Start date'}
                    </label>
                    <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/25" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
                      {bn ? 'শেষ তারিখ' : 'Registration End date'}
                    </label>
                    <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/25" />
                  </div>
                </div>
              </div>

              <div className="bg-[#EFF8FB] rounded-2xl p-4 mb-6 space-y-2">
                <div className="flex gap-2">
                  <Shield className="w-5 h-5 text-[#1A6B8A] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#1A6B8A] font-bold leading-normal">
                    {bn
                      ? 'গোপনীয়তা রক্ষা: রোগীর ব্যক্তিগত আইডেন্টিফায়ার (নাম, ফোন, সুনির্দিষ্ট ইমেইল) অপসারণ করে বেনামে ডেটা প্রস্তুত করা হয়েছে।'
                      : 'Clinical Anonymization Enforced: Direct patient identifiers (names, phone numbers) are stripped to respect privacy under health research regulations.'}
                  </p>
                </div>
              </div>

              {exportError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 font-semibold">
                  {exportError}
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowResearchModal(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors text-xs active:scale-95">
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button onClick={handleResearchExport} disabled={isResearchExporting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white transition-all disabled:opacity-60 text-xs shadow-lg active:scale-95"
                  style={{ background: isResearchExporting ? '#94a3b8' : 'linear-gradient(135deg, #2ECC71, #1a9e54)' }}>
                  {isResearchExporting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> <span>{bn ? 'রপ্তানি হচ্ছে...' : 'Formatting…'}</span></>
                    : <><Download className="w-4 h-4" /> <span>{bn ? 'CSV ডাউনলোড' : 'Download Dataset'}</span></>
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
