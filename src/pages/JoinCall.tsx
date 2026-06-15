import { useState, useEffect, useRef, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Loader2, Clock, AlertTriangle } from 'lucide-react';

interface RoomInfo {
  consultId: number;
  roomId: string;
  joinToken: string;
  doctorName: string;
  patientName?: string;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from([...atob(base64)].map(c => c.charCodeAt(0)));
}

export default function JoinCall({ joinToken }: { joinToken: string }) {
  const [step, setStep]                       = useState<'loading' | 'ready' | 'calling' | 'ended' | 'error'>('loading');
  const [roomInfo, setRoomInfo]               = useState<RoomInfo | null>(null);
  const [errorMsg, setErrorMsg]               = useState('');
  const [isVideoOn, setIsVideoOn]             = useState(true);
  const [isMuted, setIsMuted]                 = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [callDuration, setCallDuration]       = useState(0);
  const [status, setStatus]                   = useState('');

  const localRef   = useRef<HTMLVideoElement>(null);
  const remoteRef  = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const pcRef      = useRef<RTCPeerConnection | null>(null);
  const lastSigRef = useRef(0);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load room info on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/join/${joinToken}`);
        if (!res.ok) { setStep('error'); setErrorMsg('This invite link is invalid or has expired.'); return; }
        const info = await res.json();
        setRoomInfo(info);
        setStep('ready');
      } catch {
        setStep('error');
        setErrorMsg('Could not connect to the server. Please check your internet connection.');
      }
    })();
    return () => { cleanup(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinToken]);

  // Call timer
  useEffect(() => {
    if (step === 'calling') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (step !== 'calling') setCallDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    streamRef.current = null;
    pcRef.current     = null;
  }, []);

  // Polling: fetch signals from doctor
  const startPolling = useCallback((roomId: string, pc: RTCPeerConnection) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/signals/${roomId}?after=${lastSigRef.current}&token=${joinToken}`);
        if (!res.ok) return;
        const sigs = await res.json();
        for (const sig of sigs) {
          if (sig.id > lastSigRef.current) lastSigRef.current = sig.id;
          if (sig.sender === 'patient') continue; // skip our own
          const payload = JSON.parse(sig.payload);
          if (sig.type === 'ice-doctor') {
            try { await pc.addIceCandidate(new RTCIceCandidate(payload)); } catch (_) {}
          }
        }
      } catch (_) {}
    }, 1000);
  }, [joinToken]);

  const postSignal = useCallback(async (roomId: string, type: string, payload: any) => {
    await fetch('/api/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomToken: joinToken, type, sender: 'patient', payload: JSON.stringify(payload) }),
    });
  }, [joinToken]);

  const joinCall = async () => {
    if (!roomInfo) return;
    setStatus('Accessing camera…');
    let stream: MediaStream | null = null;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setIsVideoOn(false);
      }
      streamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err?.name === 'NotAllowedError'
        ? 'Camera/microphone access was denied. Please allow access in your browser settings.'
        : 'Could not access camera or microphone.');
      return;
    }

    setStatus('Connecting to doctor…');
    setStep('calling');

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream!));

    pc.ontrack = (e) => {
      if (remoteRef.current && e.streams[0]) {
        remoteRef.current.srcObject = e.streams[0];
        setRemoteConnected(true);
        setStatus('');
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === 'connected' || s === 'completed') { setRemoteConnected(true); setStatus(''); }
      else if (s === 'failed') setStatus('Connection failed. Try rejoining.');
      else if (s === 'disconnected') { setRemoteConnected(false); setStatus('Reconnecting…'); }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) postSignal(roomInfo.roomId, 'ice-patient', e.candidate.toJSON());
    };

    // Fetch offer from doctor (poll until found)
    setStatus("Waiting for doctor's offer\u2026");
    let offer: RTCSessionDescriptionInit | null = null;
    for (let attempt = 0; attempt < 30 && !offer; attempt++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const res = await fetch(`/api/signals/${roomInfo.roomId}?after=0&token=${joinToken}&type=offer`);
        if (res.ok) {
          const sigs = await res.json();
          const offerSig = sigs.find((s: any) => s.type === 'offer' && s.sender === 'doctor');
          if (offerSig) {
            offer = JSON.parse(offerSig.payload);
            lastSigRef.current = Math.max(lastSigRef.current, offerSig.id);
          }
        }
      } catch (_) {}
    }

    if (!offer) {
      setStatus('Doctor has not started the call yet. Wait a moment…');
      // Keep polling in background
    } else {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await postSignal(roomInfo.roomId, 'answer', answer);
      setStatus('');
    }

    startPolling(roomInfo.roomId, pc);
  };

  const leaveCall = () => {
    cleanup();
    setStep('ended');
    setRemoteConnected(false);
  };

  const toggleVideo = () => {
    const tracks = streamRef.current?.getVideoTracks();
    if (tracks?.length) {
      const next = !isVideoOn;
      tracks.forEach(t => { t.enabled = next; });
      setIsVideoOn(next);
    }
  };

  const toggleMute = () => {
    const tracks = streamRef.current?.getAudioTracks();
    if (tracks?.length) {
      const next = !isMuted;
      tracks.forEach(t => { t.enabled = !next; });
      setIsMuted(next);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (step === 'loading') return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-16 h-16 rounded-2xl bg-[#1A6B8A] flex items-center justify-center text-3xl font-black mx-auto mb-4">K</div>
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 opacity-60" />
        <p className="text-sm opacity-60">Verifying invite link…</p>
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────────
  if (step === 'error') return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="text-center text-white max-w-sm">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Can't Join Call</h2>
        <p className="text-slate-400 text-sm mb-6">{errorMsg}</p>
        <a href="/" className="text-[#1A6B8A] text-sm font-bold hover:underline">← KidneyCare BD</a>
      </div>
    </div>
  );

  // ── Ended ────────────────────────────────────────────────────────────────────
  if (step === 'ended') return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="text-center text-white max-w-sm">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-5">
          <PhoneOff className="w-7 h-7 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">Call ended</h2>
        <p className="text-slate-400 text-sm mb-6">Duration: {formatDuration(callDuration)}</p>
        <a href="/" className="inline-block px-6 py-3 bg-[#1A6B8A] text-white font-bold rounded-xl hover:bg-[#14556e] transition-colors">
          ← Go to KidneyCare BD
        </a>
      </div>
    </div>
  );

  // ── Ready (pre-join lobby) ───────────────────────────────────────────────────
  if (step === 'ready') return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#1A6B8A] flex items-center justify-center text-2xl font-black mx-auto mb-4 shadow-xl shadow-[#1A6B8A]/30">K</div>
          <h1 className="text-xl font-black text-white">KidneyCare BD</h1>
          <p className="text-slate-400 text-sm mt-1">Secure teleconsultation</p>
        </div>

        <div className="bg-slate-800 rounded-3xl p-6 mb-4">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-full bg-[#1A6B8A]/20 text-[#1A6B8A] flex items-center justify-center font-bold text-lg">
              {roomInfo?.doctorName?.split(' ').slice(0, 2).map(n => n[0]).join('') || 'Dr'}
            </div>
            <div>
              <p className="font-bold text-white">{roomInfo?.doctorName || 'Your Doctor'}</p>
              <p className="text-sm text-slate-400">is ready for your consultation</p>
            </div>
          </div>
          <div className="h-px bg-slate-700 mb-5" />
          <ul className="space-y-2 text-sm text-slate-300 mb-6">
            <li className="flex items-center gap-2"><span style={{ color: '#2ECC71' }}>✓</span> End-to-end encrypted video</li>
            <li className="flex items-center gap-2"><span style={{ color: '#2ECC71' }}>✓</span> No account required</li>
            <li className="flex items-center gap-2"><span style={{ color: '#2ECC71' }}>✓</span> Camera & mic access needed</li>
          </ul>
          <button
            onClick={joinCall}
            className="w-full py-3.5 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2" style={{ background: '#2ECC71' }}
          >
            <Video className="w-5 h-5" />
            Join Call
          </button>
        </div>
        <p className="text-center text-xs text-slate-500">
          By joining you consent to video recording for medical records purposes.
        </p>
      </div>
    </div>
  );

  // ── Active call ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#1A6B8A] flex items-center justify-center text-white text-sm font-black">K</div>
          <span className="text-white font-bold text-sm">
            {roomInfo?.doctorName || 'Consultation'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Clock className="w-3.5 h-3.5" />
          {formatDuration(callDuration)}
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative">
        {/* Remote video */}
        <video
          ref={remoteRef}
          autoPlay playsInline
          className={`w-full h-full object-cover transition-opacity ${remoteConnected ? 'opacity-100' : 'opacity-0'}`}
          style={{ position: 'absolute', inset: 0 }}
        />

        {/* Waiting overlay */}
        {!remoteConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-slate-900">
            <Loader2 className="w-8 h-8 animate-spin opacity-40" />
            <p className="text-sm text-slate-400 font-medium">
              {status || 'Waiting for doctor…'}
            </p>
          </div>
        )}

        {/* Local PiP */}
        <video
          ref={localRef}
          autoPlay playsInline muted
          className="absolute bottom-4 right-4 w-28 h-20 rounded-xl object-cover border-2 border-white/20 z-10"
        />
      </div>

      {/* Controls */}
      <div className="bg-slate-800/90 px-4 py-4 flex items-center justify-center gap-4">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleVideo}
          className={`p-4 rounded-2xl transition-all ${!isVideoOn ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
        >
          {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button
          onClick={leaveCall}
          className="px-7 py-4 bg-red-500 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-red-600 transition-all"
        >
          <PhoneOff className="w-5 h-5" />
          Leave
        </button>
      </div>
    </div>
  );
}
