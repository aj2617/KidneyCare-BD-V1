import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Search, AlertTriangle, CheckCircle2, Loader2, Utensils } from 'lucide-react';
import { motion } from 'motion/react';

export default function DietAssistant() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [recommendations, setRecommendations] = useState<any>(null);
  const [allFoods, setAllFoods] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'search'>('recommendations');

  useEffect(() => { fetchRecommendations(); }, []);

  const fetchRecommendations = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const res = await fetch('/api/diet/recommendations', { headers });
      setRecommendations(await res.json());
    } catch { /* offline */ }
    finally { setIsLoading(false); }
  };

  const searchFoods = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setAllFoods([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/diet/foods?search=${encodeURIComponent(q)}&stage=${recommendations?.stage || 1}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllFoods(await res.json());
    } catch { /* offline */ }
    finally { setSearchLoading(false); }
  };

  const getNutrientBar = (value: number, max: number, color: string) => {
    const pct = Math.min((value / max) * 100, 100);
    return (
      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    );
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {language === 'bn' ? 'ব্যক্তিগত ডায়েট সহকারী' : 'Personalized Diet Assistant'}
        </h1>
        <p className="text-slate-500">
          {language === 'bn'
            ? `আপনার সিকেডি পর্যায় ${recommendations?.stage || '--'} অনুযায়ী বাংলাদেশি খাদ্য পরামর্শ`
            : `Bangladeshi food guidance for CKD Stage ${recommendations?.stage || '--'}`}
        </p>
      </div>

      {recommendations?.stage && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: language === 'bn' ? 'পটাশিয়াম' : 'Potassium', icon: '🍌', limit: language === 'bn' ? recommendations.stage >= 3 ? 'সীমিত করুন' : 'স্বাভাবিক' : recommendations.stage >= 3 ? 'Restrict' : 'Normal', bg: recommendations.stage >= 3 ? '#FDECEA' : '#EAFAF1', border: recommendations.stage >= 3 ? '#E74C3C' : '#2ECC71', color: recommendations.stage >= 3 ? '#7b1a1a' : '#1a7a44' },
            { label: language === 'bn' ? 'সোডিয়াম' : 'Sodium', icon: '🧂', limit: language === 'bn' ? recommendations.stage >= 2 ? 'কম নিন' : 'স্বাভাবিক' : recommendations.stage >= 2 ? 'Restrict' : 'Normal', bg: recommendations.stage >= 2 ? '#FEF5E7' : '#EAFAF1', border: recommendations.stage >= 2 ? '#F39C12' : '#2ECC71', color: recommendations.stage >= 2 ? '#7d5100' : '#1a7a44' },
            { label: language === 'bn' ? 'ফসফরাস' : 'Phosphorus', icon: '🦴', limit: language === 'bn' ? recommendations.stage >= 3 ? 'সীমিত করুন' : 'স্বাভাবিক' : recommendations.stage >= 3 ? 'Restrict' : 'Normal', bg: recommendations.stage >= 3 ? '#FDECEA' : '#EAFAF1', border: recommendations.stage >= 3 ? '#E74C3C' : '#2ECC71', color: recommendations.stage >= 3 ? '#7b1a1a' : '#1a7a44' },
          ].map(item => (
            <div key={item.label} className="p-4 rounded-2xl border text-center" style={{ background: item.bg, borderColor: item.border, color: item.color }}>
              <p className="text-2xl mb-1">{item.icon}</p>
              <p className="text-xs font-bold uppercase">{item.label}</p>
              <p className="text-sm font-semibold mt-1">{item.limit}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex border-b border-slate-200">
        <button onClick={() => setActiveTab('recommendations')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'recommendations' ? 'border-[#1A6B8A] text-[#1A6B8A]' : 'border-transparent text-slate-500'}`}>
          {language === 'bn' ? 'পরামর্শ' : 'Recommendations'}
        </button>
        <button onClick={() => setActiveTab('search')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'search' ? 'border-[#1A6B8A] text-[#1A6B8A]' : 'border-transparent text-slate-500'}`}>
          <Search className="w-4 h-4" />
          {language === 'bn' ? 'খাবার খুঁজুন' : 'Search Foods'}
        </button>
      </div>

      {activeTab === 'recommendations' && recommendations && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {language === 'bn' ? 'এই খাবারগুলো এড়িয়ে চলুন' : 'Avoid These Foods'}
            </h2>
            {recommendations.warnings?.map((w: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-800">
                      {language === 'bn' ? w.food_bn : w.food_en}
                      <span className="text-red-500 text-sm ml-2">({language === 'bn' ? w.food_en : w.food_bn})</span>
                    </p>
                    <p className="text-sm text-red-600 mt-1">{language === 'bn' ? w.reason_bn : w.reason_en}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            {!recommendations.warnings?.length && (
              <p className="text-slate-500 text-sm">{language === 'bn' ? 'সমস্ত খাবার আপনার পর্যায়ে গ্রহণযোগ্য।' : 'All foods are acceptable for your stage.'}</p>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="font-bold flex items-center gap-2" style={{ color: '#1a7a44' }}>
              <CheckCircle2 className="w-5 h-5" />
              {language === 'bn' ? 'নিরাপদ খাবার' : 'Safe Foods'}
            </h2>
            {recommendations.recommendations?.map((r: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl" style={{ background: '#EAFAF1', border: '1px solid #2ECC71' }}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#2ECC71' }} />
                  <div>
                    <p className="font-bold" style={{ color: '#1a7a44' }}>
                      {language === 'bn' ? r.food_bn : r.food_en}
                      <span className="text-sm ml-2" style={{ color: '#2ECC71' }}>({language === 'bn' ? r.food_en : r.food_bn})</span>
                    </p>
                    <p className="text-sm mt-1" style={{ color: '#1a7a44' }}>{r.advice_bn}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder={language === 'bn' ? 'খাবার খুঁজুন (বাংলা বা ইংরেজিতে)...' : 'Search foods in Bengali or English...'}
              value={searchQuery} onChange={e => searchFoods(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A]" />
            {searchLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-[#1A6B8A]" />}
          </div>

          {allFoods.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allFoods.map((food: any) => (
                <div key={food.id} className="p-5 rounded-2xl border" style={food.allowed === false ? { background: '#FDECEA', borderColor: '#E74C3C' } : food.allowed ? { background: '#EAFAF1', borderColor: '#2ECC71' } : { background: '#fff', borderColor: '#e2e8f0' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-slate-900">{language === 'bn' ? food.food_name_bn : food.food_name_en}</p>
                      <p className="text-sm text-slate-500">{language === 'bn' ? food.food_name_en : food.food_name_bn} · {food.category}</p>
                    </div>
                    {food.allowed !== undefined && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold" style={food.allowed ? { background: '#EAFAF1', color: '#1a7a44' } : { background: '#FDECEA', color: '#7b1a1a' }}>
                        {food.allowed ? (language === 'bn' ? '✓ নিরাপদ' : '✓ Safe') : (language === 'bn' ? '✗ এড়িয়ে চলুন' : '✗ Avoid')}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-500"><span>{language === 'bn' ? 'পটাশিয়াম' : 'Potassium'}</span><span>{food.potassium} mg</span></div>
                      {getNutrientBar(food.potassium, 1000, '#F39C12')}
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-500"><span>{language === 'bn' ? 'সোডিয়াম' : 'Sodium'}</span><span>{food.sodium} mg</span></div>
                      {getNutrientBar(food.sodium, 500, '#1A6B8A')}
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-500"><span>{language === 'bn' ? 'ফসফরাস' : 'Phosphorus'}</span><span>{food.phosphorus} mg</span></div>
                      {getNutrientBar(food.phosphorus, 300, '#E74C3C')}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-3 italic">{language === 'bn' ? food.advice_bn : food.advice_en}</p>
                </div>
              ))}
            </div>
          ) : searchQuery && !searchLoading ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
              <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">{language === 'bn' ? 'কোনো খাবার পাওয়া যায়নি।' : 'No foods found.'}</p>
            </div>
          ) : !searchQuery ? (
            <div className="text-center py-16 text-slate-400">
              <Utensils className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>{language === 'bn' ? 'উপরে খাবারের নাম টাইপ করুন' : 'Type a food name above to check its CKD safety'}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
