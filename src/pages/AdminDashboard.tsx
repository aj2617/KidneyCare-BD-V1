import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AlertCircle, Download, FileText, Loader2, Map as MapIcon, Users, BarChart2 } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type HeatmapRow = { district: string; count: number; avg_risk: number | null };
type PolicyReport = { id: string; title: string; desc: string; date: string; filename: string; content: string };

const DISTRICTS_COORDS: Record<string, [number, number]> = {
  Dhaka: [23.8103, 90.4125], Chittagong: [22.3569, 91.7832], Rajshahi: [24.3745, 88.6042],
  Khulna: [22.8456, 89.5403], Barisal: [22.701, 90.3535], Sylhet: [24.8949, 91.8687],
  Rangpur: [25.7439, 89.2752], Mymensingh: [24.7471, 90.4203], Gazipur: [24.0023, 90.4264],
  Narayanganj: [23.6238, 90.5], Chapainawabganj: [24.5963, 88.2765], Noakhali: [22.8696, 91.0995],
  Comilla: [23.4607, 91.1809], Rajbari: [23.7574, 89.6435], Faridpur: [23.6070, 89.8421],
};

function downloadTextFile(content: string, filename: string, type = 'text/markdown;charset=utf-8;') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click();
  document.body.removeChild(link); URL.revokeObjectURL(url);
}

export default function AdminDashboard({ initialTab = 'heatmap' }: { initialTab?: 'heatmap' | 'reports' }) {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [heatmapData, setHeatmapData] = useState<HeatmapRow[]>([]);
  const [chwPoints, setChwPoints] = useState<any[]>([]);
  const [reports, setReports] = useState<PolicyReport[]>([]);
  const [activeTab, setActiveTab] = useState<'heatmap' | 'reports'>(initialTab);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isResearchExporting, setIsResearchExporting] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setIsLoading(true);
    setError('');

    Promise.all([
      fetch('/api/admin/heatmap', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(async ([hRes, rRes]) => {
      if (!hRes.ok || !rRes.ok) throw new Error('Failed to load admin data.');
      const [hJson, rJson] = await Promise.all([hRes.json(), rRes.json()]);
      if (!isMounted) return;
      setHeatmapData(Array.isArray(hJson.districts) ? hJson.districts : (Array.isArray(hJson) ? hJson : []));
      setChwPoints(Array.isArray(hJson.chw_points) ? hJson.chw_points : []);
      setReports(Array.isArray(rJson) ? rJson : []);
    }).catch(err => {
      if (isMounted) setError(err.message || 'Failed to load admin data.');
    }).finally(() => { if (isMounted) setIsLoading(false); });

    return () => { isMounted = false; };
  }, [token]);

  const sortedHeatmap = [...heatmapData].sort((a, b) => b.count - a.count);
  const totalPatients = heatmapData.reduce((sum, row) => sum + row.count, 0);

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
    setError('');
    try {
      const res = await fetch('/api/admin/export-research-data', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed.');
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error('No patient data available.');
      const headers = Object.keys(data[0]);
      const csv = [headers.join(','), ...data.map((row: any) => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      downloadTextFile(csv, `KidneyCareBD_Research_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    } catch (err) { setError(err instanceof Error ? err.message : 'Export failed.'); }
    finally { setIsResearchExporting(false); }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {language === 'bn' ? 'জনস্বাস্থ্য ড্যাশবোর্ড' : 'Public Health Dashboard'}
          </h1>
          <p className="text-slate-500">
            {language === 'bn' ? 'বাংলাদেশের জেলা জুড়ে সিকেডি পর্যবেক্ষণ' : 'Monitor CKD burden across Bangladesh districts'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleResearchExport} disabled={isResearchExporting}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50 text-sm">
            {isResearchExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isResearchExporting ? 'Exporting...' : 'Research CSV'}
          </button>
          <button onClick={handleExport} disabled={isExporting}
            className="px-5 py-2.5 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#14556e] transition-all disabled:opacity-50 text-sm">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Generating...' : 'National Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="flex border-b border-slate-200">
        {[
          { id: 'heatmap', label: language === 'bn' ? 'সিকেডি হিটম্যাপ' : 'CKD Heatmap', icon: MapIcon },
          { id: 'reports', label: language === 'bn' ? 'পলিসি রিপোর্ট' : 'Policy Reports', icon: FileText },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === tab.id ? 'border-[#1A6B8A] text-[#1A6B8A]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'heatmap' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Users className="w-6 h-6" /></div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{totalPatients}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase">{language === 'bn' ? 'মোট রোগী' : 'Total Patients'}</p>
                </div>
              </div>
              {chwPoints.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase">{language === 'bn' ? 'সিএইচডব্লিউ পয়েন্ট' : 'CHW GPS Points'}</p>
                  <p className="text-lg font-black text-emerald-600">{chwPoints.length}</p>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#1A6B8A]" />
                {language === 'bn' ? 'শীর্ষ জেলা' : 'Top Districts'}
              </h3>
              {sortedHeatmap.length ? (
                <div className="space-y-3">
                  {sortedHeatmap.slice(0, 8).map(district => (
                    <div key={district.district}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-slate-600">{district.district}</span>
                        <span className="text-sm font-bold text-slate-900">{district.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.min((district.count / (sortedHeatmap[0]?.count || 1)) * 100, 100)}%`,
                            background: (district.avg_risk ?? 0) > 50 ? '#E74C3C' : '#F39C12'
                          }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">{language === 'bn' ? 'কোনো ডেটা নেই।' : 'No district data available.'}</p>}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm h-[600px] overflow-hidden relative">
              {heatmapData.length ? (
                <>
                  <MapContainer center={[23.685, 90.3563] as [number, number]} zoom={7} style={{ height: '100%', width: '100%', borderRadius: '20px' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                    {heatmapData.map(district => {
                      const coords = DISTRICTS_COORDS[district.district] || [23.8103, 90.4125];
                      return (
                        <CircleMarker key={district.district} center={coords}
                          radius={Math.max(8, district.count * 4)}
                          fillColor={(district.avg_risk ?? 0) > 50 ? '#E74C3C' : '#F39C12'}
                          color="#fff" weight={2} fillOpacity={0.7}>
                          <Popup>
                            <p className="font-bold">{district.district}</p>
                            <p className="text-xs">Patients: {district.count}</p>
                            <p className="text-xs">Avg Risk: {Math.round(district.avg_risk ?? 0)}</p>
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                    {chwPoints.map((pt, i) => (
                      <CircleMarker key={`chw-${i}`} center={[pt.lat, pt.lng]} radius={5}
                        fillColor="#10b981" color="#fff" weight={1} fillOpacity={0.9}>
                        <Popup>
                          <p className="font-bold text-emerald-700">CHW Visit</p>
                          <p className="text-xs">{pt.patient_name}</p>
                          <p className="text-xs">Risk: {pt.risk_score}</p>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                  <div className="absolute bottom-8 right-8 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 z-[1000]">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Legend</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#E74C3C]" /><span className="text-xs text-slate-600">High Risk (&gt;50)</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#F39C12]" /><span className="text-xs text-slate-600">Moderate Risk</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]" /><span className="text-xs text-slate-600">CHW GPS Visit</span></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-slate-500 px-6">
                  {language === 'bn' ? 'এখনো কোনো রোগীর অবস্থান ডেটা নেই।' : 'No patient location data available yet.'}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {reports.length ? reports.map(report => (
            <div key={report.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-[#1A6B8A] group-hover:text-white transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400">{report.date}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#1A6B8A] transition-colors">{report.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{report.desc}</p>
              <button onClick={() => { setDownloadingReportId(report.id); downloadTextFile(report.content, report.filename); setDownloadingReportId(null); }}
                disabled={downloadingReportId === report.id}
                className="mt-6 text-sm font-bold text-[#1A6B8A] flex items-center gap-2 hover:underline disabled:opacity-50">
                {downloadingReportId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {language === 'bn' ? 'সম্পূর্ণ রিপোর্ট ডাউনলোড করুন' : 'Download Full Report'}
              </button>
            </div>
          )) : (
            <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-500">
              {language === 'bn' ? 'কোনো পলিসি রিপোর্ট নেই।' : 'No policy reports available yet.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
