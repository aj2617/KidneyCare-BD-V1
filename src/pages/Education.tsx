import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { BookOpen, Search, ChevronRight, FileText, Activity, Shield, Calculator } from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';

export default function Education() {
  const { language, t } = useLanguage();
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    const res = await fetch('/api/articles');
    setArticles(await res.json());
  };

  const filteredArticles = articles.filter(a => {
    const matchesSearch = (language === 'en' ? a.title_en : a.title_bn).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || a.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'basics', label: 'CKD Basics', icon: BookOpen },
    { id: 'diet', label: 'Diet & Nutrition', icon: Activity },
    { id: 'management', label: 'Management', icon: Shield },
    { id: 'treatment', label: 'Treatments', icon: Calculator }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('edu.title')}</h1>
          <p className="text-slate-500">Learn how to manage your kidney health</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#1A6B8A]/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Categories */}
        <div className="space-y-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all ${
              !selectedCategory ? 'bg-white text-[#1A6B8A] shadow-sm' : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <FileText className="w-5 h-5" />
            All Articles
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all ${
                selectedCategory === cat.id ? 'bg-white text-[#1A6B8A] shadow-sm' : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <cat.icon className="w-5 h-5" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedArticle ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
            >
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-sm font-bold text-[#1A6B8A] mb-6 flex items-center gap-1 hover:underline"
              >
                ← Back to Library
              </button>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                {language === 'en' ? selectedArticle.title_en : selectedArticle.title_bn}
              </h2>
              <div className="prose prose-slate max-w-none">
                <Markdown>
                  {language === 'en' ? selectedArticle.content_en : selectedArticle.content_bn}
                </Markdown>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredArticles.map((article) => (
                <motion.div
                  key={article.id}
                  whileHover={{ y: -4 }}
                  onClick={() => setSelectedArticle(article)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer group"
                >
                  <div className="w-full aspect-video bg-slate-100 rounded-xl mb-4 overflow-hidden">
                    <img 
                      src={`https://picsum.photos/seed/${article.id}/400/225`} 
                      alt="Article" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[#1A6B8A] uppercase tracking-widest px-2 py-1 bg-[#1A6B8A]/10 rounded-md">
                    {article.category}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-3 mb-2 group-hover:text-[#1A6B8A] transition-colors">
                    {language === 'en' ? article.title_en : article.title_bn}
                  </h3>
                  <p className="text-slate-500 text-sm line-clamp-2">
                    {language === 'en' ? article.content_en.substring(0, 100) : article.content_bn.substring(0, 100)}...
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm font-bold text-[#1A6B8A]">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      5 min read
                    </span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))}
              
              {filteredArticles.length === 0 && (
                <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No articles found matching your search.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
