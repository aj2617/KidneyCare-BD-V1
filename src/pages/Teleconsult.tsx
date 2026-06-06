import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Activity,
  Loader2, Phone, Users, ChevronRight, Clock, Save, CheckCircle2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TeleconsultProps {
  patientId?: number;
  patientName?: string;
  onEnd?: () => void;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Teleconsult({ patientId, patientName, onEnd }: TeleconsultProps) {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [consultId, setConsultId]               = useState<number | null>(null);
  const [isCallActive, setIsCallActive]         = useState(false);
  const [isVideoOn, setIsVideoOn]               = useState(true);
  const [isMuted, setIsMuted]                   = useState(false);
  const [isConnecting, setIsConnecting]         = useState(false);
  const [patientData, setPatientData]           = useState<any>(null);
  const [history, setHistory]                   = useState<any[]>([]);
  const [notes, setNotes]                       = useState('');
  const [notesSaved, setNotesSaved]             = useState(false);
  const [callDuration, setCallDuration]         = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'connecting' | 'good' | 'fair' | 'poor'>('connecting');
  const [remoteConnected, setRemoteConnected]   = useState(false);
  const [selectedPatient, setSelectedPatient]   = useState<{ id: number; name: string } | null>(
    patientId ? { id: patientId, name: patientName || '' } : null
  );
  const [patients, setPatients]                 = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients]   = useState(false);
  const [mediaError, setMediaError]             = useState('');

  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const peerRef        = useRef<RTCPeerConnection | null>(null);
  const consultIdRef   = useRef<number | null>(null); // stable ref for cleanup
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep ref in sync so cleanup always has the latest id
  useEffect(() => { consultIdRef.current = consultId; }, [consultId]);

  useEffect(() => {
    fetchHistory();
    if (patientId) fetchPatientData(patientId);
    // If no patient preset, load patient list for picker
    if (!patientId && user?.role === 'doctor') fetchPatients();
    return () => { cleanupCall(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    if (selectedPatient?.id) fetchPatientData(selectedPatient.id);
  }, [selectedPatient?.id]);

  // Call duration timer
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isCallActive]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/teleconsult/history', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setHistory(await res.json());
    } catch (_) {}
  };

  const fetchPatientData = async (id: number) => {
    if (!id || user?.role !== 'doctor') return;
    try {
      const res = await fetch(`/api/doctor/patient/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPatientData(await res.json());
    } catch (_) {}
  };

  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      const res = await fetch('/api/doctor/patients', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const list = await res.json();
        setPatients(Array.isArray(list) ? list : []);
      }
    } catch (_) {}
    setLoadingPatients(false);
  };

  const cleanupCall = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current?.close();
    streamRef.current = null;
    peerRef.current   = null;
  }, []);

  const startCall = async () => {
    setIsConnecting(true);
    setMediaError('');
    let stream: MediaStream | null = null;
    try {
      // Try camera + mic first, fall back to mic only
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setIsVideoOn(false);
      }
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Record teleconsult session in DB
      if (user?.role === 'doctor' && selectedPatient?.id) {
        const res = await fetch('/api/teleconsult/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ patient_id: selectedPatient.id }),
        });
        if (res.ok) {
          const data = await res.json();
          setConsultId(data.id);
          consultIdRef.current = data.id;
        }
      }

      // WebRTC setup (STUN only — signaling would be needed for real P2P)
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      peerRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream!));

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0];
          setRemoteConnected(true);
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'connected' || state === 'completed') {
          setConnectionQuality('good');
          setRemoteConnected(true);
        } else if (state === 'checking') {
          setConnectionQuality('fair');
        } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          setConnectionQuality('poor');
          setRemoteConnected(false);
        }
      };

      setIsCallActive(true);
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? (bn ? 'ক্যামেরা/মাইক্রোফোন অ্যাক্সেস অস্বীকার করা হয়েছে। ব্রাউজার সেটিংস চেক করুন।' : 'Camera/microphone access denied. Please check browser settings.')
        : (bn ? 'ক্যামেরা বা মাইক্রোফোন পাওয়া যায়নি।' : 'Camera or microphone not found.');
      setMediaError(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const stopCall = async () => {
    cleanupCall();
    const cid = consultIdRef.current;
    if (cid) {
      try {
        await fetch(`/api/teleconsult/${cid}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ notes }),
        });
      } catch (_) {}
    }
    setIsCallActive(false);
    setConsultId(null);
    consultIdRef.current = null;
    setRemoteConnected(false);
    setConnectionQuality('connecting');
    fetchHistory();
    if (onEnd) onEnd();
  };

  const toggleVideo = () => {
    const tracks = streamRef.current?.getVideoTracks();
    if (tracks?.length) {
      const newState = !isVideoOn;
      tracks.forEach(t => { t.enabled = newState; });
      setIsVideoOn(newState);
    }
  };

  const toggleMute = () => {
    const tracks = streamRef.current?.getAudioTracks();
    if (tracks?.length) {
      const newMuted = !isMuted;
      tracks.forEach(t => { t.enabled = !newMuted; });
      setIsMuted(newMuted);
    }
  };

  const saveNotes = async () => {
    const cid = consultIdRef.current;
    if (!cid) return;
    try {
      await fetch(`/api/teleconsult/${cid}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes }),
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (_) {}
  };

  const qualityConfig = {
    connecting: { color: 'text-slate-400',   dot: 'bg-slate-400',   label: bn ? 'সংযোগ হচ্ছে' : 'Connecting' },
    good:       { color: 'text-emerald-400', dot: 'bg-emerald-400', label: bn ? 'ভালো সংযোগ' : 'Good' },
    fair:       { color: 'text-amber-400',   dot: 'bg-amber-400',   label: bn ? 'মোটামুটি' : 'Fair' },
    poor:       { color: 'text-red-400',     dot: 'bg-red-400',     label: bn ? 'দুর্বল' : 'Poor' },
  }[connectionQuality];

  // ── Patient Picker ──────────────────────────────────────────────────────────
  if (!selectedPatient && user?.role === 'doctor') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {bn ? 'টেলিকনসালটেশন' : 'Teleconsultation'}
          </h1>
          <p className="text-slate-500 text-sm">
            {bn ? 'শুরু করতে একজন রোগী নির্বাচন করুন' : 'Select a patient to start a consultation'}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loadingPatients ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">
                {bn ? 'কোনো রোগী নেই' : 'No patients assigned'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {patients.map((p: any) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSelectedPatient({ id: p.id, name: p.name })}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#1A6B8A]/10 text-[#1A6B8A] flex items-center justify-center font-bold text-sm shrink-0">
                      {p.name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {bn ? 'ঝুঁকি' : 'Risk'}: {p.risk_score || 0}/100
                        {p.ckd_stage ? ` · CKD Stage ${p.ckd_stage}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ── Main Teleconsult UI ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {bn ? 'টেলিকনসালটেশন' : 'Teleconsultation'}
          </h1>
          <p className="text-slate-500 text-sm">
            {selectedPatient?.name
              ? `${bn ? 'রোগী:' : 'Patient:'} ${selectedPatient.name}`
              : (bn ? 'নিরাপদ ভিডিও কল' : 'Secure video consultation')}
          </p>
        </div>
        {!isCallActive && !patientId && (
          <button
            onClick={() => { setSelectedPatient(null); fetchPatients(); }}
            className="text-xs font-bold text-[#1A6B8A] hover:underline"
          >
            {bn ? 'রোগী পরিবর্তন করুন' : 'Change patient'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Video Panel ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 rounded-3xl overflow-hidden aspect-video relative select-none">

            {/* Remote video (shows when connected) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${remoteConnected ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Waiting/pre-call overlay */}
            {!remoteConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                {isCallActive ? (
                  <>
                    {/* Show local stream as large preview while waiting */}
                    <video
                      ref={undefined}
                      autoPlay playsInline muted
                      className="absolute inset-0 w-full h-full object-cover opacity-40"
                      srcObject={streamRef.current as any}
                      onLoadedMetadata={(e) => {
                        const v = e.currentTarget;
                        if (streamRef.current) v.srcObject = streamRef.current;
                      }}
                    />
                    <div className="relative z-10 text-center">
                      <div className="w-12 h-12 rounded-full border-2 border-white/30 mx-auto mb-3 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin opacity-70" />
                      </div>
                      <p className="text-sm font-semibold opacity-80">
                        {bn ? 'রোগীর জন্য অপেক্ষা করছেন...' : 'Waiting for patient to join...'}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <Video className="w-14 h-14 mx-auto mb-3 opacity-20" />
                    <p className="text-base opacity-50 font-medium">
                      {bn ? 'কল শুরু হয়নি' : 'Call not started'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Connection quality badge */}
            {isCallActive && (
              <div className={`absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 text-xs font-bold ${qualityConfig.color}`}>
                <span className={`w-2 h-2 rounded-full ${qualityConfig.dot}`} />
                {qualityConfig.label}
              </div>
            )}

            {/* Call timer */}
            {isCallActive && (
              <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-mono font-bold">
                <Clock className="w-3 h-3" />
                {formatDuration(callDuration)}
              </div>
            )}

            {/* Local PiP */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute bottom-3 right-3 z-20 w-28 h-20 rounded-xl object-cover border-2 border-white/20 transition-opacity ${isCallActive ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>

          {/* Media error */}
          {mediaError && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-medium">
              {mediaError}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {!isCallActive ? (
              <button
                onClick={startCall}
                disabled={isConnecting}
                className="px-8 py-3.5 bg-emerald-500 text-white rounded-2xl font-bold flex items-center gap-2.5 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 min-h-[52px]"
              >
                {isConnecting
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Phone className="w-5 h-5" />}
                {isConnecting
                  ? (bn ? 'সংযোগ হচ্ছে...' : 'Connecting...')
                  : (bn ? 'কল শুরু করুন' : 'Start Call')}
              </button>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  title={isMuted ? (bn ? 'আনমিউট করুন' : 'Unmute') : (bn ? 'মিউট করুন' : 'Mute')}
                  className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleVideo}
                  title={isVideoOn ? (bn ? 'ভিডিও বন্ধ করুন' : 'Turn off video') : (bn ? 'ভিডিও চালু করুন' : 'Turn on video')}
                  className={`p-4 rounded-2xl transition-all ${!isVideoOn ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={stopCall}
                  className="px-7 py-4 bg-red-500 text-white rounded-2xl font-bold flex items-center gap-2.5 hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
                >
                  <PhoneOff className="w-5 h-5" />
                  {bn ? 'কল শেষ করুন' : 'End Call'}
                </button>
              </>
            )}
          </div>

          {/* Notes */}
          {isCallActive && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">
                  {bn ? 'কনসালটেশন নোট' : 'Consultation Notes'}
                </label>
                <button
                  onClick={saveNotes}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#1A6B8A] hover:text-[#14556e] transition-colors"
                >
                  {notesSaved
                    ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {bn ? 'সংরক্ষিত' : 'Saved'}</>
                    : <><Save className="w-3.5 h-3.5" /> {bn ? 'সংরক্ষণ করুন' : 'Save notes'}</>
                  }
                </button>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20"
                placeholder={bn ? 'কনসালটেশনের সময় নোট লিখুন...' : 'Take notes during the consultation...'}
              />
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-5">
          {/* Patient summary */}
          {patientData && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-[#1A6B8A]" />
                {bn ? 'রোগীর সারসংক্ষেপ' : 'Patient Summary'}
              </h3>
              {patientData.patient && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">{bn ? 'পর্যায়' : 'CKD Stage'}</span>
                    <span className="text-sm font-bold">Stage {patientData.patient.ckd_stage || '--'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">{bn ? 'ঝুঁকি' : 'Risk Score'}</span>
                    <span className="text-sm font-bold">{patientData.patient.risk_score || 0}/100</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {patientData.patient.diabetes    && <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-md font-medium">Diabetes</span>}
                    {patientData.patient.hypertension && <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md font-medium">Hypertension</span>}
                  </div>
                </div>
              )}
              {patientData.gfr?.length > 0 && (
                <div className="h-36">
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">{bn ? 'জিএফআর ট্রেন্ড' : 'GFR Trend'}</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...patientData.gfr].reverse().slice(-6)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="date" hide />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="ckd_epi" stroke="#1A6B8A" strokeWidth={2} dot={{ r: 3 }} name="GFR" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {patientData.vitals?.[0] && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-slate-700">{bn ? 'সর্বশেষ ভাইটালস' : 'Latest Vitals'}</p>
                  <p>BP: {patientData.vitals[0].systolic}/{patientData.vitals[0].diastolic} mmHg</p>
                  <p>Creatinine: {patientData.vitals[0].creatinine} mg/dL</p>
                  <p>Sugar: {patientData.vitals[0].blood_sugar} mmol/L</p>
                </div>
              )}
            </div>
          )}

          {/* Previous consultations */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3 text-sm">
              {bn ? 'পূর্ববর্তী কনসালটেশন' : 'Previous Consultations'}
            </h3>
            <div className="space-y-2.5">
              {history.slice(0, 5).map(h => (
                <div key={h.id} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-sm font-semibold text-slate-800">{h.patient_name || h.doctor_name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(h.start_time).toLocaleDateString(bn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    <span className={h.status === 'ended' ? 'text-emerald-600' : 'text-amber-600'}>{h.status}</span>
                  </p>
                  {h.notes && (
                    <p className="text-xs text-slate-500 mt-1 italic line-clamp-2">{h.notes}</p>
                  )}
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">
                  {bn ? 'কোনো পূর্ববর্তী কনসালটেশন নেই।' : 'No previous consultations.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
