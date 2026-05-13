import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Activity, Loader2, Phone } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TeleconsultProps {
  patientId?: number;
  patientName?: string;
  onEnd?: () => void;
}

export default function Teleconsult({ patientId, patientName, onEnd }: TeleconsultProps) {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const [consultId, setConsultId] = useState<number | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchHistory();
    if (patientId) fetchPatientData();
    return () => { stopCall(); };
  }, [patientId]);

  const fetchHistory = async () => {
    const res = await fetch('/api/teleconsult/history', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setHistory(await res.json());
  };

  const fetchPatientData = async () => {
    if (!patientId || user?.role !== 'doctor') return;
    const res = await fetch(`/api/doctor/patient/${patientId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPatientData(await res.json());
  };

  const startCall = async () => {
    setIsConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoOn, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      if (user?.role === 'doctor' && patientId) {
        const res = await fetch('/api/teleconsult/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ patient_id: patientId }),
        });
        const data = await res.json();
        setConsultId(data.id);
      }

      // WebRTC setup (STUN only — no TURN for free tier)
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (e) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };

      // Monitor connection quality via ICE candidate pairs
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'connected') setConnectionQuality('good');
        else if (state === 'checking') setConnectionQuality('fair');
        else if (state === 'failed' || state === 'disconnected') setConnectionQuality('poor');
      };

      setIsCallActive(true);
    } catch (err) {
      console.error('Failed to start call:', err);
      alert(language === 'bn' ? 'ক্যামেরা বা মাইক্রোফোন অ্যাক্সেস করা যায়নি।' : 'Could not access camera or microphone.');
    } finally {
      setIsConnecting(false);
    }
  };

  const stopCall = async () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current?.close();
    wsRef.current?.close();
    streamRef.current = null;
    peerRef.current = null;

    if (consultId) {
      await fetch(`/api/teleconsult/${consultId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes }),
      });
    }

    setIsCallActive(false);
    setConsultId(null);
    fetchHistory();
    if (onEnd) onEnd();
  };

  const toggleVideo = () => {
    const videoTracks = streamRef.current?.getVideoTracks();
    if (videoTracks) {
      videoTracks.forEach(t => { t.enabled = isVideoOn; });
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleMute = () => {
    const audioTracks = streamRef.current?.getAudioTracks();
    if (audioTracks) {
      audioTracks.forEach(t => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };

  const qualityColor = connectionQuality === 'good' ? 'text-emerald-500' : connectionQuality === 'fair' ? 'text-amber-500' : 'text-red-500';
  const qualityLabel = connectionQuality === 'good' ? (language === 'bn' ? 'ভালো সংযোগ' : 'Good') : connectionQuality === 'fair' ? (language === 'bn' ? 'মোটামুটি' : 'Fair') : (language === 'bn' ? 'দুর্বল' : 'Poor');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {language === 'bn' ? 'টেলিকনসালটেশন' : 'Teleconsultation'}
        </h1>
        <p className="text-slate-500">
          {patientName ? `${language === 'bn' ? 'রোগী:' : 'Patient:'} ${patientName}` : language === 'bn' ? 'নিরাপদ ভিডিও কল' : 'Secure video consultation'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 rounded-3xl overflow-hidden aspect-video relative">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {!isCallActive && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg opacity-60">{language === 'bn' ? 'কল শুরু হয়নি' : 'Call not started'}</p>
                </div>
              </div>
            )}
            {isCallActive && (
              <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-800/80 ${qualityColor}`}>
                ● {qualityLabel}
              </div>
            )}
            <video ref={localVideoRef} autoPlay playsInline muted
              className="absolute bottom-4 right-4 w-32 h-24 rounded-xl object-cover border-2 border-white/20" />
          </div>

          <div className="flex items-center justify-center gap-4">
            {!isCallActive ? (
              <button onClick={startCall} disabled={isConnecting}
                className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50">
                {isConnecting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Phone className="w-6 h-6" />}
                {isConnecting ? (language === 'bn' ? 'সংযোগ হচ্ছে...' : 'Connecting...') : (language === 'bn' ? 'কল শুরু করুন' : 'Start Call')}
              </button>
            ) : (
              <>
                <button onClick={toggleMute} className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button onClick={toggleVideo} className={`p-4 rounded-2xl transition-all ${!isVideoOn ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                  {!isVideoOn ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
                <button onClick={stopCall} className="px-8 py-4 bg-red-500 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-red-600 transition-all shadow-lg shadow-red-500/30">
                  <PhoneOff className="w-6 h-6" />
                  {language === 'bn' ? 'কল শেষ করুন' : 'End Call'}
                </button>
              </>
            )}
          </div>

          {isCallActive && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <label className="text-sm font-semibold text-slate-700">{language === 'bn' ? 'কনসালটেশন নোট' : 'Consultation Notes'}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none text-sm"
                placeholder={language === 'bn' ? 'কনসালটেশনের সময় নোট লিখুন...' : 'Take notes during the consultation...'} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {patientData && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#1A6B8A]" />
                {language === 'bn' ? 'রোগীর সারসংক্ষেপ' : 'Patient Summary'}
              </h3>
              {patientData.patient && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">{language === 'bn' ? 'পর্যায়' : 'CKD Stage'}</span>
                    <span className="text-sm font-bold">Stage {patientData.patient.ckd_stage || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">{language === 'bn' ? 'ঝুঁকি' : 'Risk Score'}</span>
                    <span className="text-sm font-bold">{patientData.patient.risk_score || 0}/100</span>
                  </div>
                  {patientData.patient.diabetes && <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-md">Diabetes</span>}
                  {patientData.patient.hypertension && <span className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-md ml-1">Hypertension</span>}
                </div>
              )}
              {patientData.gfr?.length > 0 && (
                <div className="h-40">
                  <p className="text-xs font-semibold text-slate-500 mb-2">{language === 'bn' ? 'জিএফআর ট্রেন্ড' : 'GFR Trend'}</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...patientData.gfr].reverse().slice(-6)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="date" tickFormatter={v => new Date(v).toLocaleDateString(undefined, { month: 'short' })} hide />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="mdrd" stroke="#1A6B8A" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {patientData.vitals?.[0] && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs">
                  <p className="font-bold text-slate-700 mb-1">{language === 'bn' ? 'সর্বশেষ ভাইটালস' : 'Latest Vitals'}</p>
                  <p>BP: {patientData.vitals[0].systolic}/{patientData.vitals[0].diastolic} mmHg</p>
                  <p>Creatinine: {patientData.vitals[0].creatinine} mg/dL</p>
                  <p>Sugar: {patientData.vitals[0].blood_sugar} mmol/L</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">{language === 'bn' ? 'পূর্ববর্তী কনসালটেশন' : 'Previous Consultations'}</h3>
            <div className="space-y-3">
              {history.slice(0, 5).map(h => (
                <div key={h.id} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-sm font-semibold text-slate-800">{h.patient_name || h.doctor_name}</p>
                  <p className="text-xs text-slate-500">{new Date(h.start_time).toLocaleDateString()} · {h.status}</p>
                  {h.notes && <p className="text-xs text-slate-600 mt-1 italic">{h.notes.slice(0, 80)}{h.notes.length > 80 ? '...' : ''}</p>}
                </div>
              ))}
              {history.length === 0 && <p className="text-sm text-slate-400 text-center py-4">{language === 'bn' ? 'কোনো পূর্ববর্তী কনসালটেশন নেই।' : 'No previous consultations.'}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
