import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Activity,
  Loader2, Phone, Users, ChevronRight, Clock, Save, CheckCircle2,
  Link, Share2, MessageCircle, Copy, X
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
  const [joinToken, setJoinToken]               = useState<string | null>(null);
  const [roomId, setRoomId]                     = useState<string | null>(null);
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
  const [linkCopied, setLinkCopied]             = useState(false);
  const [showSharePanel, setShowSharePanel]     = useState(false);

  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const consultIdRef   = useRef<number | null>(null);
  const joinTokenRef   = useRef<string | null>(null);
  const roomIdRef      = useRef<string | null>(null);
  const lastSigRef     = useRef(0);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { consultIdRef.current = consultId; }, [consultId]);
  useEffect(() => { joinTokenRef.current = joinToken; }, [joinToken]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  useEffect(() => {
    fetchHistory();
    if (patientId) fetchPatientData(patientId);
    if (!patientId && user?.role === 'doctor') fetchPatients();
    return () => { cleanupCall(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    if (selectedPatient?.id) fetchPatientData(selectedPatient.id);
  }, [selectedPatient?.id]);

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
      if (res.ok) setPatients(Array.isArray(await res.clone().json()) ? await res.json() : []);
    } catch (_) {}
    setLoadingPatients(false);
  };

  const cleanupCall = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    streamRef.current = null;
    pcRef.current     = null;
  }, []);

  // ── Signaling helpers ───────────────────────────────────────────────────────
  const postSignal = useCallback(async (rId: string, jToken: string, type: string, payload: any) => {
    try {
      await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomToken: jToken, type, sender: 'doctor', payload: JSON.stringify(payload) }),
      });
    } catch (_) {}
  }, []);

  const startPolling = useCallback((rId: string, jToken: string, pc: RTCPeerConnection) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/signals/${rId}?after=${lastSigRef.current}&token=${jToken}`);
        if (!res.ok) return;
        const sigs: any[] = await res.json();
        for (const sig of sigs) {
          if (sig.id > lastSigRef.current) lastSigRef.current = sig.id;
          if (sig.sender === 'doctor') continue; // skip own
          const payload = JSON.parse(sig.payload);
          if (sig.type === 'answer' && pc.signalingState !== 'stable') {
            try { await pc.setRemoteDescription(new RTCSessionDescription(payload)); } catch (_) {}
          } else if (sig.type === 'ice-patient') {
            try { await pc.addIceCandidate(new RTCIceCandidate(payload)); } catch (_) {}
          }
        }
      } catch (_) {}
    }, 1000);
  }, []);

  // ── Start Call ──────────────────────────────────────────────────────────────
  const startCall = async () => {
    setIsConnecting(true);
    setMediaError('');
    let stream: MediaStream | null = null;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setIsVideoOn(false);
      }
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Create session in DB — get joinToken + roomId
      let jToken: string | null = null;
      let rId: string | null    = null;
      let cId: number | null    = null;
      const res = await fetch('/api/teleconsult/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patient_id: selectedPatient?.id || null }),
      });
      if (res.ok) {
        const data = await res.json();
        cId    = data.id;
        jToken = data.joinToken;
        rId    = data.roomId;
        setConsultId(cId);
        setJoinToken(jToken);
        setRoomId(rId);
        consultIdRef.current  = cId;
        joinTokenRef.current  = jToken;
        roomIdRef.current     = rId;
      }

      // WebRTC setup
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream!));

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0];
          setRemoteConnected(true);
        }
      };

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        if (s === 'connected' || s === 'completed') { setConnectionQuality('good'); setRemoteConnected(true); }
        else if (s === 'checking') setConnectionQuality('fair');
        else if (s === 'failed' || s === 'disconnected') { setConnectionQuality('poor'); setRemoteConnected(false); }
        else if (s === 'closed') { setConnectionQuality('connecting'); setRemoteConnected(false); }
      };

      // ICE candidates → send as signal
      pc.onicecandidate = (e) => {
        if (e.candidate && rId && jToken) {
          postSignal(rId, jToken, 'ice-doctor', e.candidate.toJSON());
        }
      };

      // Create and store offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (rId && jToken) {
        await postSignal(rId, jToken, 'offer', offer);
        startPolling(rId, jToken, pc);
      }

      setIsCallActive(true);
      setShowSharePanel(true);
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? (bn ? 'ক্যামেরা/মাইক্রোফোন অ্যাক্সেস অস্বীকার।' : 'Camera/microphone access denied. Check browser settings.')
        : (bn ? 'ক্যামেরা পাওয়া যায়নি।' : 'Camera or microphone not found.');
      setMediaError(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  // ── Stop Call ───────────────────────────────────────────────────────────────
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
    setConsultId(null); setJoinToken(null); setRoomId(null);
    consultIdRef.current = null; joinTokenRef.current = null; roomIdRef.current = null;
    setRemoteConnected(false);
    setConnectionQuality('connecting');
    setShowSharePanel(false);
    lastSigRef.current = 0;
    fetchHistory();
    if (onEnd) onEnd();
  };

  const toggleVideo = () => {
    const tracks = streamRef.current?.getVideoTracks();
    if (tracks?.length) { const n = !isVideoOn; tracks.forEach(t => { t.enabled = n; }); setIsVideoOn(n); }
  };

  const toggleMute = () => {
    const tracks = streamRef.current?.getAudioTracks();
    if (tracks?.length) { const n = !isMuted; tracks.forEach(t => { t.enabled = !n; }); setIsMuted(n); }
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

  // ── Share link helpers ──────────────────────────────────────────────────────
  const joinUrl = joinToken
    ? `${window.location.origin}/?join=${joinToken}`
    : null;

  const copyLink = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const shareViaWhatsApp = () => {
    if (!joinUrl) return;
    const msg = bn
      ? `আপনার ডাক্তার KidneyCare BD-তে একটি ভিডিও কনসালটেশন শুরু করেছেন। এই লিঙ্কে ক্লিক করুন: ${joinUrl}`
      : `Your doctor has started a video consultation on KidneyCare BD. Click to join: ${joinUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareViaSMS = () => {
    if (!joinUrl) return;
    const msg = `Join KidneyCare BD teleconsult: ${joinUrl}`;
    window.open(`sms:?body=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareNative = async () => {
    if (!joinUrl) return;
    if (navigator.share) {
      await navigator.share({ title: 'KidneyCare BD Video Call', url: joinUrl }).catch(() => {});
    } else {
      copyLink();
    }
  };

  const qualityConfig = {
    connecting: { color: 'text-slate-400', dot: 'bg-slate-400', label: bn ? 'সংযোগ হচ্ছে' : 'Waiting' },
    good:       { color: 'text-[#2ECC71]', dot: 'bg-[#2ECC71]', label: bn ? 'ভালো' : 'Good' },
    fair:       { color: 'text-[#F39C12]',   dot: 'bg-[#F39C12]',   label: bn ? 'মোটামুটি' : 'Fair' },
    poor:       { color: 'text-red-400',     dot: 'bg-red-400',     label: bn ? 'দুর্বল' : 'Poor' },
  }[connectionQuality];

  // ── Patient Picker ──────────────────────────────────────────────────────────
  if (!selectedPatient && user?.role === 'doctor') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{bn ? 'টেলিকনসালটেশন' : 'Teleconsultation'}</h1>
          <p className="text-slate-500 text-sm">{bn ? 'শুরু করতে একজন রোগী নির্বাচন করুন' : 'Select a patient to start a consultation'}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loadingPatients ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : patients.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">{bn ? 'কোনো রোগী নেই' : 'No patients assigned'}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {patients.map((p: any) => (
                <li key={p.id}>
                  <button onClick={() => setSelectedPatient({ id: p.id, name: p.name })}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left">
                    <div className="w-10 h-10 rounded-full bg-[#1A6B8A]/10 text-[#1A6B8A] flex items-center justify-center font-bold text-sm shrink-0">
                      {p.name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{bn ? 'ঝুঁকি' : 'Risk'}: {p.risk_score || 0}/100{p.ckd_stage ? ` · CKD Stage ${p.ckd_stage}` : ''}</p>
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

  // ── Main UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{bn ? 'টেলিকনসালটেশন' : 'Teleconsultation'}</h1>
          <p className="text-slate-500 text-sm">
            {selectedPatient?.name ? `${bn ? 'রোগী:' : 'Patient:'} ${selectedPatient.name}` : (bn ? 'নিরাপদ ভিডিও কল' : 'Secure video consultation')}
          </p>
        </div>
        {!isCallActive && !patientId && (
          <button onClick={() => { setSelectedPatient(null); fetchPatients(); }}
            className="text-xs font-bold text-[#1A6B8A] hover:underline shrink-0">
            {bn ? 'রোগী পরিবর্তন' : 'Change patient'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Video + Controls ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video panel */}
          <div className="bg-slate-900 rounded-3xl overflow-hidden aspect-video relative select-none">
            <video ref={remoteVideoRef} autoPlay playsInline
              className={`w-full h-full object-cover transition-opacity duration-500 ${remoteConnected ? 'opacity-100' : 'opacity-0'}`} />

            {/* Pre-call / waiting overlay */}
            {!remoteConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                {isCallActive ? (
                  <>
                    {/* Dim self-view in background while waiting */}
                    <video autoPlay playsInline muted
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                      ref={(el) => { if (el && streamRef.current) el.srcObject = streamRef.current; }} />
                    <div className="relative z-10 text-center">
                      <Loader2 className="w-7 h-7 animate-spin opacity-60 mx-auto mb-2" />
                      <p className="text-sm font-medium opacity-70">
                        {bn ? 'রোগীর সংযোগের অপেক্ষা করছেন...' : 'Waiting for patient to join...'}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <Video className="w-14 h-14 mx-auto mb-3 opacity-20" />
                    <p className="text-base opacity-50 font-medium">{bn ? 'কল শুরু হয়নি' : 'Call not started'}</p>
                  </div>
                )}
              </div>
            )}

            {/* Badges */}
            {isCallActive && (
              <div className={`absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 text-xs font-bold ${qualityConfig.color}`}>
                <span className={`w-2 h-2 rounded-full ${qualityConfig.dot}`} />
                {qualityConfig.label}
              </div>
            )}
            {isCallActive && (
              <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-mono font-bold">
                <Clock className="w-3 h-3" />
                {formatDuration(callDuration)}
              </div>
            )}

            {/* Local PiP */}
            <video ref={localVideoRef} autoPlay playsInline muted
              className={`absolute bottom-3 right-3 z-20 w-28 h-20 rounded-xl object-cover border-2 border-white/20 transition-opacity ${isCallActive ? 'opacity-100' : 'opacity-0'}`} />
          </div>

          {/* Media error */}
          {mediaError && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-medium">{mediaError}</div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {!isCallActive ? (
              <button onClick={startCall} disabled={isConnecting}
                className="px-8 py-3.5 text-white rounded-2xl font-bold flex items-center gap-2.5 transition-all disabled:opacity-50 min-h-[52px]" style={{ background: '#2ECC71' }}>
                {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5" />}
                {isConnecting ? (bn ? 'সংযোগ হচ্ছে...' : 'Starting...') : (bn ? 'কল শুরু করুন' : 'Start Call')}
              </button>
            ) : (
              <>
                <button onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}
                  className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button onClick={toggleVideo} title={isVideoOn ? 'Turn off video' : 'Turn on video'}
                  className={`p-4 rounded-2xl transition-all ${!isVideoOn ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                  {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                <button onClick={() => setShowSharePanel(p => !p)}
                  className={`p-4 rounded-2xl transition-all ${showSharePanel ? 'bg-[#1A6B8A] text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                  title={bn ? 'লিঙ্ক শেয়ার করুন' : 'Share invite link'}>
                  <Share2 className="w-5 h-5" />
                </button>
                <button onClick={stopCall}
                  className="px-7 py-4 bg-red-500 text-white rounded-2xl font-bold flex items-center gap-2.5 hover:bg-red-600 transition-all shadow-lg shadow-red-500/30">
                  <PhoneOff className="w-5 h-5" />
                  {bn ? 'কল শেষ' : 'End Call'}
                </button>
              </>
            )}
          </div>

          {/* ── Share Panel ── */}
          {showSharePanel && joinUrl && (
            <div className="bg-white border border-[#1A6B8A]/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Link className="w-4 h-4 text-[#1A6B8A]" />
                  {bn ? 'রোগীকে এই লিঙ্ক পাঠান' : 'Send this link to patient'}
                </p>
                <button onClick={() => setShowSharePanel(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* URL display */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <span className="text-xs text-slate-600 flex-1 truncate font-mono">{joinUrl}</span>
                <button onClick={copyLink}
                  className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#1A6B8A] hover:text-[#14556e] transition-colors">
                  {linkCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#2ECC71]" /> : <Copy className="w-3.5 h-3.5" />}
                  {linkCopied ? (bn ? 'কপি হয়েছে!' : 'Copied!') : (bn ? 'কপি করুন' : 'Copy')}
                </button>
              </div>

              {/* Share buttons */}
              <div className="flex gap-2">
                <button onClick={shareViaWhatsApp}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white text-xs font-bold rounded-xl transition-colors" style={{ background: '#2ECC71' }}>
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
                <button onClick={shareViaSMS}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white text-xs font-bold rounded-xl transition-colors" style={{ background: '#1A6B8A' }}>
                  <MessageCircle className="w-3.5 h-3.5" />
                  SMS
                </button>
                <button onClick={shareNative}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors">
                  <Share2 className="w-3.5 h-3.5" />
                  {bn ? 'শেয়ার' : 'Share'}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                {bn ? 'রোগী লিঙ্কে ক্লিক করলে লগইন ছাড়াই যোগ দিতে পারবেন।' : 'Patient can join without logging in — link works for this session only.'}
              </p>
            </div>
          )}

          {/* Notes */}
          {isCallActive && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">{bn ? 'কনসালটেশন নোট' : 'Consultation Notes'}</label>
                <button onClick={saveNotes}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#1A6B8A] hover:text-[#14556e] transition-colors">
                  {notesSaved
                    ? <><CheckCircle2 className="w-3.5 h-3.5 text-[#2ECC71]" /> {bn ? 'সংরক্ষিত' : 'Saved'}</>
                    : <><Save className="w-3.5 h-3.5" /> {bn ? 'সংরক্ষণ' : 'Save notes'}</>}
                </button>
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/20"
                placeholder={bn ? 'নোট লিখুন...' : 'Take notes during the consultation...'} />
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-5">
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
                    {patientData.patient.hypertension && <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: '#FEF5E7', color: '#7d5100' }}>Hypertension</span>}
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

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3 text-sm">{bn ? 'পূর্ববর্তী কনসালটেশন' : 'Previous Consultations'}</h3>
            <div className="space-y-2.5">
              {history.slice(0, 5).map(h => (
                <div key={h.id} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-sm font-semibold text-slate-800">{h.patient_name || h.doctor_name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(h.start_time).toLocaleDateString(bn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}<span className={h.status === 'ended' ? 'text-[#2ECC71]' : 'text-[#F39C12]'}>{h.status}</span>
                  </p>
                  {h.notes && <p className="text-xs text-slate-500 mt-1 italic line-clamp-2">{h.notes}</p>}
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">{bn ? 'কোনো পূর্ববর্তী কনসালটেশন নেই।' : 'No previous consultations.'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
