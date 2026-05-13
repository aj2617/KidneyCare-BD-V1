import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Calculator, Info, CheckCircle2, AlertTriangle, Loader2, Upload, Zap } from 'lucide-react';
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

  useEffect(() => {
    fetch('/api/patient/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data) setFormData(prev => ({ ...prev, age: data.age?.toString() || '', sex: data.sex || 'male', weight: data.weight?.toString() || '' }));
      });
  }, [token]);

  const handleOcrPrefill = async () => {
    if (!ocrText.trim()) return;
    setIsOcrProcessing(true);
    try {
      const res = await fetch('/api/patient/ocr-prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: ocrText }),
      });
      const data = await res.json();
      const filled: string[] = [];
      if (data.extracted.creatinine) { setFormData(f => ({ ...f, creatinine: data.extracted.creatinine })); filled.push('creatinine'); }
      if (data.extracted.uacr) { setFormData(f => ({ ...f, uacr: data.extracted.uacr })); filled.push('uacr'); }
      setOcrHighlighted(filled);
      setShowOcr(false);
      if (data.confidence === 'none') alert(language === 'bn' ? 'কোনো মান খুঁজে পাওয়া যায়নি।' : 'No values could be extracted from the text.');
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
          <Upload className="w-4 h-4" />
          {language === 'bn' ? 'ল্যাব রিপোর্ট স্ক্যান' : 'Scan Lab Report'}
        </button>
      </div>

      <AnimatePresence>
        {showOcr && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-purple-50 p-6 rounded-3xl border border-purple-200 space-y-4">
            <h3 className="font-bold text-purple-900 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              {language === 'bn' ? 'ল্যাব রিপোর্ট থেকে মান স্বয়ংক্রিয়ভাবে পূরণ করুন' : 'Auto-fill values from your lab report text'}
            </h3>
            <p className="text-sm text-purple-700">
              {language === 'bn'
                ? 'আপনার ল্যাব রিপোর্টের টেক্সট নীচে পেস্ট করুন। সিস্টেম স্বয়ংক্রিয়ভাবে ক্রিয়েটিনিন ও ইউএসিআর মান খুঁজে বের করবে।'
                : 'Paste or type text from your physical lab report below. The system will extract creatinine and UACR values automatically.'}
            </p>
            <textarea value={ocrText} onChange={e => setOcrText(e.target.value)} rows={4}
              className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl resize-none text-sm focus:ring-2 focus:ring-purple-300"
              placeholder={language === 'bn' ? 'ল্যাব রিপোর্টের টেক্সট এখানে পেস্ট করুন...\nযেমন: Creatinine: 1.4 mg/dL\nBlood Sugar: 6.2 mmol/L' : 'Paste lab report text here...\ne.g., Creatinine: 1.4 mg/dL\nBP: 140/90 mmHg'} />
            <button onClick={handleOcrPrefill} disabled={isOcrProcessing || !ocrText.trim()}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50">
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
                <div className="grid grid-cols-3 gap-1 text-center">
                  {['A1 (<30)', 'A2 (30-300)', 'A3 (≥300)'].map((a, ai) => (
                    ['G1 (≥90)', 'G2 (60-89)', 'G3a (45-59)', 'G3b (30-44)', 'G4 (15-29)', 'G5 (<15)'].map((g, gi) => {
                      const risk = ai + gi < 2 ? 'bg-emerald-100' : ai + gi < 4 ? 'bg-yellow-100' : ai + gi < 6 ? 'bg-orange-100' : 'bg-red-100';
                      return gi === 0 ? <div key={`${ai}-${gi}`} className={`text-xs py-1 px-0.5 rounded ${risk} font-medium`}>{a}</div> : null;
                    })
                  ))}
                </div>
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
                {language === 'bn' ? 'ঐচ্ছিকভাবে ইউএসিআর যোগ করুন আরও সঠিক সিকেডি পর্যায় নির্ধারণের জন্য।' : 'Optionally add UACR for more accurate KDIGO staging.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
