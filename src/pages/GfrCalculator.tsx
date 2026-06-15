import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Calculator, Info, CheckCircle2, AlertTriangle, Loader2, Upload, Zap, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function calcOfflineCkdEpi(creatinine: number, age: number, sex: string): number {
  const kappa = sex === 'female' ? 0.7 : 0.9;
  const alpha = sex === 'female' ? -0.241 : -0.302;
  const ratio = creatinine / kappa;
  const base = ratio <= 1
    ? Math.pow(ratio, alpha)
    : Math.pow(ratio, -1.200);
  const femaleMultiplier = sex === 'female' ? 1.012 : 1.0;
  return Math.round(142 * base * Math.pow(0.9938, age) * femaleMultiplier);
}

export default function GfrCalculator() {
  const { token } = useAuth();
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({ creatinine: '', age: '', sex: 'male', weight: '', uacr: '' });
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrHighlighted, setOcrHighlighted] = useState<string[]>([]);
  const [showOcr, setShowOcr] = useState(false);
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState('');
  const [ocrStatus, setOcrStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/patient/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data) setFormData(prev => ({ ...prev, age: data.age?.toString() || '', sex: data.sex || 'male', weight: data.weight?.toString() || '' }));
      });
    fetch('/api/patient/gfr-history', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setHistory(data.slice(-3).reverse()); })
      .catch(() => {});
  }, [token]);

  const runExtraction = async (text: string) => {
    try {
      const res = await fetch('/api/patient/ocr-prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      const filled: string[] = [];
      if (data.extracted.creatinine) { setFormData(f => ({ ...f, creatinine: data.extracted.creatinine })); filled.push('creatinine'); }
      if (data.extracted.uacr) { setFormData(f => ({ ...f, uacr: data.extracted.uacr })); filled.push('uacr'); }
      setOcrHighlighted(filled);
      if (filled.length === 0) setOcrStatus(language === 'bn' ? 'কোনো মান খুঁজে পাওয়া যায়নি। টেক্সট ম্যানুয়ালি সম্পাদনা করুন।' : 'No values found. Edit the text below manually.');
      else { setOcrStatus(''); setShowOcr(false); }
    } catch { /* offline */ }
  };

  const handleImageOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setOcrPreviewUrl(url);
    setOcrStatus(language === 'bn' ? 'ছবি পড়া হচ্ছে...' : 'Reading image with OCR...');
    setIsOcrProcessing(true);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setOcrStatus(`${language === 'bn' ? 'পাঠ্য চিনছে' : 'Recognizing text'}: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      const { data: { text } } = await worker.recognize(url);
      await worker.terminate();
      setOcrText(text);
      setOcrStatus(language === 'bn' ? 'মান খোঁজা হচ্ছে...' : 'Extracting values...');
      await runExtraction(text);
    } catch (err) {
      setOcrStatus(language === 'bn' ? 'ছবি পড়া সম্ভব হয়নি। নীচে টেক্সট পেস্ট করুন।' : 'Could not read image. Paste text below instead.');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleOcrPrefill = async () => {
    if (!ocrText.trim()) return;
    setIsOcrProcessing(true);
    try {
      await runExtraction(ocrText);
    } catch { /* offline */ }
    finally { setIsOcrProcessing(false); }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cr = parseFloat(formData.creatinine);
    const age = parseInt(formData.age);
    const weight = parseFloat(formData.weight);
    if (cr < 0.1 || cr > 30) {
      alert(language === 'bn' ? 'ক্রিয়েটিনিনের মান ০.১–৩০ mg/dL এর মধ্যে হতে হবে।' : 'Creatinine must be between 0.1–30 mg/dL.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/patient/gfr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          creatinine: cr, age, sex: formData.sex, weight,
          uacr: formData.uacr ? parseFloat(formData.uacr) : undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
      setHistory(prev => [data, ...prev].slice(0, 3));
    } catch {
      const offlineEpi = calcOfflineCkdEpi(cr, age, formData.sex);
      const stage = offlineEpi >= 90 ? 1 : offlineEpi >= 60 ? 2 : offlineEpi >= 45 ? 3 : offlineEpi >= 30 ? 4 : 5;
      const offlineResult = {
        ckdEpi: offlineEpi, mdrd: offlineEpi, cg: offlineEpi,
        avgGfr: offlineEpi, stage,
        recommendation: language === 'bn'
          ? 'অফলাইন গণনা (শুধুমাত্র CKD-EPI 2021)। সংযোগ পুনরুদ্ধার হলে পুনরায় সংরক্ষণ করুন।'
          : 'Offline calculation (CKD-EPI 2021 only). Reconnect to save to your record.',
        offline: true,
      };
      setResult(offlineResult);
    } finally { setIsLoading(false); }
  };

  const stageStyleMap: Record<number, { bg: string; border: string; color: string }> = {
    1: { bg: '#EAFAF1', border: '#2ECC71', color: '#1a7a44' },
    2: { bg: '#EFF8FB', border: '#1A6B8A', color: '#1A6B8A' },
    3: { bg: '#FEF5E7', border: '#F39C12', color: '#7d5100' },
    4: { bg: '#FDECEA', border: '#E74C3C', color: '#7b1a1a' },
    5: { bg: '#FDECEA', border: '#E74C3C', color: '#7b1a1a' },
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('gfr.title')}</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">{language === 'bn' ? 'এমডিআরডি, কককক্রফট-গল্ট, সিকেডি-ইপিআই সূত্র' : 'MDRD, Cockcroft-Gault, CKD-EPI equations + KDIGO UACR staging'}</p>
        </div>
        <button onClick={() => setShowOcr(!showOcr)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold transition-all shrink-0" style={{ background: '#EFF8FB', border: '1px solid #1A6B8A', color: '#1A6B8A' }}>
          <Camera className="w-4 h-4" />
          {language === 'bn' ? 'ল্যাব স্ক্যান' : 'Scan Lab Report'}
        </button>
      </div>

      <AnimatePresence>
        {showOcr && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-6 rounded-3xl border space-y-4" style={{ background: '#EFF8FB', borderColor: '#1A6B8A' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2" style={{ color: '#1A6B8A' }}>
                <Zap className="w-5 h-5" />
                {language === 'bn' ? 'ল্যাব রিপোর্ট স্ক্যান করুন' : 'Scan or paste your lab report'}
              </h3>
              <button onClick={() => { setShowOcr(false); setOcrPreviewUrl(''); setOcrText(''); setOcrStatus(''); }}
                className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            {/* Photo Upload */}
            <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl cursor-pointer transition-all
              ${isOcrProcessing ? 'opacity-50 pointer-events-none' : 'hover:bg-[#1A6B8A]/5'}
              ${ocrPreviewUrl ? 'border-[#1A6B8A] p-2' : 'border-[#1A6B8A]/30 p-6'}`}>
              {ocrPreviewUrl ? (
                <div className="w-full relative">
                  <img src={ocrPreviewUrl} alt="Lab report" className="max-h-44 w-full object-contain rounded-xl" />
                  <div className="absolute top-1 right-1 text-white rounded-full p-1" style={{ background: '#1A6B8A' }}>
                    <Camera className="w-3 h-3" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2" style={{ color: '#1A6B8A' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#EFF8FB' }}>
                    <Camera className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-semibold">{language === 'bn' ? 'ছবি তুলুন বা ফাইল বেছে নিন' : 'Take photo or choose file'}</span>
                  <span className="text-xs" style={{ color: '#1A6B8A99' }}>JPG, PNG — Creatinine & UACR will be auto-extracted</span>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageOcr} disabled={isOcrProcessing} />
            </label>

            {/* OCR Status */}
            {(isOcrProcessing || ocrStatus) && (
              <div className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
                style={isOcrProcessing ? { background: '#EFF8FB', color: '#1A6B8A' } : ocrHighlighted.length > 0 ? { background: '#EAFAF1', color: '#1a7a44' } : { background: '#FEF5E7', color: '#7d5100' }}>
                {isOcrProcessing && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
                {!isOcrProcessing && ocrHighlighted.length > 0 && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                <span>{ocrStatus || (ocrHighlighted.length > 0 ? `✓ Auto-filled: ${ocrHighlighted.join(', ')}` : '')}</span>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: '#1A6B8A33' }} />
              <span className="text-xs font-medium" style={{ color: '#1A6B8A99' }}>{language === 'bn' ? 'অথবা সরাসরি টেক্সট পেস্ট করুন' : 'or paste text directly'}</span>
              <div className="flex-1 h-px" style={{ background: '#1A6B8A33' }} />
            </div>

            {/* Text fallback */}
            <textarea value={ocrText} onChange={e => setOcrText(e.target.value)} rows={3}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl resize-none text-sm focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A]"
              placeholder={language === 'bn' ? 'ল্যাব রিপোর্টের টেক্সট এখানে পেস্ট করুন...\nযেমন: Creatinine: 1.4 mg/dL' : 'Paste lab report text here...\ne.g., Creatinine: 1.4 mg/dL\nUACR: 45 mg/g'} />

            <button onClick={handleOcrPrefill} disabled={isOcrProcessing || !ocrText.trim()}
              className="w-full px-6 py-3 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: '#1A6B8A' }}>
              {isOcrProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {language === 'bn' ? 'মান খুঁজুন ও পূরণ করুন' : 'Extract & Pre-fill Values'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <form onSubmit={handleCalculate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t('gfr.creatinine')}</label>
              <input type="number" inputMode="decimal" step="0.01" required value={formData.creatinine}
                onChange={e => { setFormData({ ...formData, creatinine: e.target.value }); setOcrHighlighted(h => h.filter(x => x !== 'creatinine')); }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] transition-all ${ocrHighlighted.includes('creatinine') ? 'bg-[#EFF8FB] border-[#1A6B8A] ring-2 ring-[#1A6B8A]/20' : 'bg-slate-50 border-slate-200'}`}
                placeholder="e.g. 1.2" />
              {ocrHighlighted.includes('creatinine') && (
                <p className="text-xs font-medium" style={{ color: '#1A6B8A' }}>✓ {language === 'bn' ? 'স্বয়ংক্রিয়ভাবে পূরণ হয়েছে' : 'Auto-filled from lab report'}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t('gfr.uacr')}</label>
              <input type="number" inputMode="decimal" step="0.1" value={formData.uacr}
                onChange={e => { setFormData({ ...formData, uacr: e.target.value }); setOcrHighlighted(h => h.filter(x => x !== 'uacr')); }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] transition-all ${ocrHighlighted.includes('uacr') ? 'bg-[#EFF8FB] border-[#1A6B8A] ring-2 ring-[#1A6B8A]/20' : 'bg-slate-50 border-slate-200'}`}
                placeholder={language === 'bn' ? 'যেমন: 45 (ঐচ্ছিক)' : 'e.g. 45 (optional)'} />
              {formData.uacr && (
                <p className="text-xs text-slate-500">
                  {parseFloat(formData.uacr) >= 300 ? '⚠ A3: Severely increased (≥300 mg/g)' :
                   parseFloat(formData.uacr) >= 30 ? '⚠ A2: Moderately increased (30-300 mg/g)' :
                   '✓ A1: Normal to mildly increased (<30 mg/g)'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{t('gfr.age')}</label>
                <input type="number" inputMode="numeric" required value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20" placeholder="45" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{t('gfr.weight')}</label>
                <input type="number" inputMode="decimal" required value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20" placeholder="70" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t('gfr.sex')}</label>
              <div className="grid grid-cols-2 gap-4">
                {['male', 'female'].map(s => (
                  <button key={s} type="button" onClick={() => setFormData({ ...formData, sex: s })}
                    className={`py-3 min-h-[48px] rounded-xl border font-medium transition-all capitalize ${formData.sex === s ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]' : 'bg-white text-slate-600 border-slate-200'}`}>
                    {language === 'bn' ? (s === 'male' ? 'পুরুষ' : 'মহিলা') : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-4 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#14556e] transition-all disabled:opacity-50">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
              {t('gfr.calculate')}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {history.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3">
                {language === 'bn' ? 'সর্বশেষ ৩টি ফলাফল' : 'Last 3 Results'}
              </h4>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={h.stage >= 4 ? { background: '#FDECEA', color: '#7b1a1a' } : h.stage === 3 ? { background: '#FEF5E7', color: '#7d5100' } : { background: '#EAFAF1', color: '#1a7a44' }}>
                        Stage {h.stage}</span>
                      <span className="text-sm font-black text-slate-900">{Math.round(h.ckdEpi ?? h.avgGfr ?? 0)} <span className="text-xs font-normal text-slate-400">mL/min</span></span>
                    </div>
                    {h.created_at && (
                      <span className="text-xs text-slate-400">{new Date(h.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">{language === 'bn' ? 'ফলাফল' : 'Calculation Results'}</h3>
                {result?.offline && (
                  <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#FEF5E7', color: '#7d5100' }}>
                    {language === 'bn' ? 'অফলাইন' : 'Offline'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'MDRD Equation', value: result.mdrd },
                  { label: 'Cockcroft-Gault', value: result.cg },
                  { label: 'CKD-EPI Equation', value: result.ckdEpi },
                ].map(eq => (
                  <div key={eq.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center gap-1">
                    <p className="text-xs text-slate-500 font-medium leading-tight">{eq.label}</p>
                    <p className="text-2xl font-black text-[#1A6B8A]">{Math.round(eq.value)}</p>
                    <p className="text-xs font-normal text-slate-400">mL/min</p>
                  </div>
                ))}
              </div>

              {result.avgGfr && (
                <div className="p-3 bg-[#1A6B8A]/5 rounded-xl text-center">
                  <p className="text-xs text-slate-500">{language === 'bn' ? 'গড় জিএফআর' : 'Average GFR'}</p>
                  <p className="text-xl font-black text-[#1A6B8A]">{Math.round(result.avgGfr)} mL/min/1.73m²</p>
                </div>
              )}

              <div className="p-6 rounded-2xl border" style={stageStyleMap[result.stage] ? { background: stageStyleMap[result.stage].bg, borderColor: stageStyleMap[result.stage].border, color: stageStyleMap[result.stage].color } : { background: '#f8fafc', borderColor: '#e2e8f0' }}>
                <div className="flex items-center gap-2 mb-3">
                  {result.stage >= 4 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  <p className="font-bold text-lg">CKD Stage {result.stage}</p>
                </div>
                <p className="text-sm font-medium">{result.recommendation}</p>
                {result.uacrCategory && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <p className="text-xs font-semibold uppercase opacity-70">UACR Category (KDIGO)</p>
                    <p className="text-sm font-bold mt-1">{result.uacrCategory}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">KDIGO Risk Classification</p>
                <p className="text-xs text-slate-400 mt-2">{language === 'bn' ? 'স্টেজ এবং ইউএসিআর একসাথে ঝুঁকি নির্ধারণ করে।' : 'Stage and UACR together determine overall CKD risk.'}</p>
              </div>
            </motion.div>
          ) : (
            <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <Info className="w-8 h-8" />
              </div>
              <p className="text-slate-500 font-medium">
                {language === 'bn'
                  ? 'আপনার ক্লিনিকাল ডেটা প্রবেশ করুন এবং জিএফআর ফলাফল দেখুন।'
                  : 'Enter your clinical data to see GFR results and KDIGO staging.'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {language === 'bn' ? 'ঐচ্ছিকভাবে ইউএসিআর যোগ করুন আরও সঠিক সিকেডি পর্যায় নির্ধারণের জন্য।' : 'Optionally add UACR for more accurate KDIGO staging. Use the lab scan button to auto-fill from a photo.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
