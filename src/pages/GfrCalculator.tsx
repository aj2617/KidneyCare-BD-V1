import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Calculator, Info, CheckCircle2, AlertTriangle, Loader2, Upload, Zap, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function GfrCalculator() {
  const { token } = useAuth();
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({ creatinine: '', age: '', sex: 'male', weight: '', uacr: '' });
  const [result, setResult] = useState<any>(null);
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
          creatinine: cr,
          age: parseInt(formData.age),
          sex: formData.sex,
          weight: parseFloat(formData.weight),
          uacr: formData.uacr ? parseFloat(formData.uacr) : undefined,
        }),
      });
      setResult(await res.json());
    } catch { /* offline */ }
    finally { setIsLoading(false); }
  };

  const stageColors = ['', 'bg-emerald-50 border-emerald-200 text-emerald-700', 'bg-blue-50 border-blue-200 text-blue-700',
    'bg-amber-50 border-amber-200 text-amber-700', 'bg-orange-50 border-orange-200 text-orange-700', 'bg-red-50 border-red-200 text-red-700'];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{t('gfr.title')}</h1>
          <p className="text-slate-500 mt-2">{language === 'bn' ? 'এমডিআরডি, কককক্রফট-গল্ট, সিকেডি-ইপিআই সূত্র' : 'MDRD, Cockcroft-Gault, CKD-EPI equations + KDIGO UACR staging'}</p>
        </div>
        <button onClick={() => setShowOcr(!showOcr)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-100 transition-all">
          <Camera className="w-4 h-4" />
          {language === 'bn' ? 'ল্যাব স্ক্যান' : 'Scan Lab Report'}
        </button>
      </div>

      <AnimatePresence>
        {showOcr && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-purple-50 p-6 rounded-3xl border border-purple-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-purple-900 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                {language === 'bn' ? 'ল্যাব রিপোর্ট স্ক্যান করুন' : 'Scan or paste your lab report'}
              </h3>
              <button onClick={() => { setShowOcr(false); setOcrPreviewUrl(''); setOcrText(''); setOcrStatus(''); }}
                className="p-1 text-purple-400 hover:text-purple-700"><X className="w-4 h-4" /></button>
            </div>

            {/* Photo Upload */}
            <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl cursor-pointer transition-all
              ${isOcrProcessing ? 'opacity-50 pointer-events-none' : 'hover:bg-purple-100/50'}
              ${ocrPreviewUrl ? 'border-purple-400 p-2' : 'border-purple-300 p-6'}`}>
              {ocrPreviewUrl ? (
                <div className="w-full relative">
                  <img src={ocrPreviewUrl} alt="Lab report" className="max-h-44 w-full object-contain rounded-xl" />
                  <div className="absolute top-1 right-1 bg-purple-600 text-white rounded-full p-1">
                    <Camera className="w-3 h-3" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-purple-600">
                  <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                    <Camera className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-semibold">{language === 'bn' ? 'ছবি তুলুন বা ফাইল বেছে নিন' : 'Take photo or choose file'}</span>
                  <span className="text-xs text-purple-400">JPG, PNG — Creatinine & UACR will be auto-extracted</span>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageOcr} disabled={isOcrProcessing} />
            </label>

            {/* OCR Status */}
            {(isOcrProcessing || ocrStatus) && (
              <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl ${isOcrProcessing ? 'bg-purple-100 text-purple-700' : ocrHighlighted.length > 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {isOcrProcessing && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
                {!isOcrProcessing && ocrHighlighted.length > 0 && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                <span>{ocrStatus || (ocrHighlighted.length > 0 ? `✓ Auto-filled: ${ocrHighlighted.join(', ')}` : '')}</span>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-purple-200" />
              <span className="text-xs text-purple-400 font-medium">{language === 'bn' ? 'অথবা সরাসরি টেক্সট পেস্ট করুন' : 'or paste text directly'}</span>
              <div className="flex-1 h-px bg-purple-200" />
            </div>

            {/* Text fallback */}
            <textarea value={ocrText} onChange={e => setOcrText(e.target.value)} rows={3}
              className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl resize-none text-sm focus:ring-2 focus:ring-purple-300"
              placeholder={language === 'bn' ? 'ল্যাব রিপোর্টের টেক্সট এখানে পেস্ট করুন...\nযেমন: Creatinine: 1.4 mg/dL' : 'Paste lab report text here...\ne.g., Creatinine: 1.4 mg/dL\nUACR: 45 mg/g'} />

            <button onClick={handleOcrPrefill} disabled={isOcrProcessing || !ocrText.trim()}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50">
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
              <input type="number" step="0.01" required value={formData.creatinine}
                onChange={e => { setFormData({ ...formData, creatinine: e.target.value }); setOcrHighlighted(h => h.filter(x => x !== 'creatinine')); }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] transition-all ${ocrHighlighted.includes('creatinine') ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200' : 'bg-slate-50 border-slate-200'}`}
                placeholder="e.g. 1.2" />
              {ocrHighlighted.includes('creatinine') && (
                <p className="text-xs text-purple-600 font-medium">✓ {language === 'bn' ? 'স্বয়ংক্রিয়ভাবে পূরণ হয়েছে' : 'Auto-filled from lab report'}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t('gfr.uacr')}</label>
              <input type="number" step="0.1" value={formData.uacr}
                onChange={e => { setFormData({ ...formData, uacr: e.target.value }); setOcrHighlighted(h => h.filter(x => x !== 'uacr')); }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A] transition-all ${ocrHighlighted.includes('uacr') ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200' : 'bg-slate-50 border-slate-200'}`}
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
                <input type="number" required value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20" placeholder="45" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{t('gfr.weight')}</label>
                <input type="number" required value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20" placeholder="70" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t('gfr.sex')}</label>
              <div className="grid grid-cols-2 gap-4">
                {['male', 'female'].map(s => (
                  <button key={s} type="button" onClick={() => setFormData({ ...formData, sex: s })}
                    className={`py-3 rounded-xl border font-medium transition-all capitalize ${formData.sex === s ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]' : 'bg-white text-slate-600 border-slate-200'}`}>
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
          {result ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-bold text-slate-900">{language === 'bn' ? 'ফলাফল' : 'Calculation Results'}</h3>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'MDRD Equation', value: result.mdrd },
                  { label: 'Cockcroft-Gault', value: result.cg },
                  { label: 'CKD-EPI Equation', value: result.ckdEpi },
                ].map(eq => (
                  <div key={eq.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                    <p className="text-sm text-slate-500 font-medium">{eq.label}</p>
                    <p className="text-2xl font-black text-[#1A6B8A]">{Math.round(eq.value)} <span className="text-xs font-normal text-slate-400">mL/min</span></p>
                  </div>
                ))}
              </div>

              {result.avgGfr && (
                <div className="p-3 bg-[#1A6B8A]/5 rounded-xl text-center">
                  <p className="text-xs text-slate-500">{language === 'bn' ? 'গড় জিএফআর' : 'Average GFR'}</p>
                  <p className="text-xl font-black text-[#1A6B8A]">{Math.round(result.avgGfr)} mL/min/1.73m²</p>
                </div>
              )}

              <div className={`p-6 rounded-2xl border ${stageColors[result.stage] || 'bg-slate-50 border-slate-200'}`}>
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
