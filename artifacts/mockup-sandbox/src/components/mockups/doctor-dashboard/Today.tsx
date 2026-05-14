import React from "react";
import { AppLayout } from "./_shared/AppLayout";
import { ChevronRight, Calendar as CalendarIcon, Clock, Video, AlertTriangle } from "lucide-react";

export function Today() {
  return (
    <AppLayout activeTab="today" alertCount={3}>
      <div className="flex flex-col min-h-full bg-slate-50 pb-20">
        
        {/* Header Section */}
        <div 
          className="px-5 pt-8 pb-6 rounded-b-[2rem] text-white shadow-sm"
          style={{ backgroundColor: "#1A6B8A" }}
        >
          <p className="text-sm font-medium text-white/80 uppercase tracking-wider mb-1">
            Wednesday, 14 May
          </p>
          <h1 className="text-2xl font-bold mb-6">Good morning, Dr. Rahman</h1>
          
          {/* Stat Chips */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
            <div className="snap-start shrink-0 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 flex flex-col justify-center border border-white/10 min-w-[110px]">
              <span className="text-2xl font-semibold mb-0.5">4</span>
              <span className="text-xs font-medium text-white/90">Follow-ups</span>
            </div>
            <div className="snap-start shrink-0 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 flex flex-col justify-center border border-white/10 min-w-[110px]">
              <span className="text-2xl font-semibold mb-0.5">2</span>
              <span className="text-xs font-medium text-white/90">Teleconsults</span>
            </div>
            <div className="snap-start shrink-0 bg-rose-500/80 backdrop-blur-sm rounded-xl px-4 py-3 flex flex-col justify-center border border-white/20 min-w-[110px]">
              <span className="text-2xl font-semibold mb-0.5">3</span>
              <span className="text-xs font-medium text-white/90">Overdue</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-6 flex-1 flex flex-col gap-6">
          
          {/* Calendar Widget (Subtle) */}
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            {['S','M','T','W','T','F','S'].map((day, i) => {
              const isToday = i === 3; // Wednesday
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-400">{day}</span>
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
                    isToday ? 'bg-[#1A6B8A] text-white shadow-sm' : 'text-slate-700'
                  }`}>
                    {11 + i}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scheduled Follow-ups */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📋</span>
              <h2 className="font-semibold text-slate-800">Scheduled Follow-ups</h2>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                    AK
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Abdul Karim</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">CKD Stage 3</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 10:00 AM</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-medium">Tap to open</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    RH
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Rahima Begum</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">CKD Stage 4</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 11:30 AM</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-medium">Tap to open</span>
                </div>
              </div>
            </div>
          </section>

          {/* Upcoming Teleconsults */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📹</span>
              <h2 className="font-semibold text-slate-800">Upcoming Teleconsults</h2>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm relative">
                    SA
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Syed Ali</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Routine Checkup</p>
                  </div>
                </div>
                <div className="bg-slate-50 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 border border-slate-100 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> 2:30 PM
                </div>
              </div>
              <button 
                className="w-full py-2.5 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-opacity active:opacity-90"
                style={{ backgroundColor: "#1A6B8A" }}
              >
                <Video className="w-4 h-4" />
                Join Call
              </button>
            </div>
          </section>

          {/* Overdue - No vitals >7 days */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⏰</span>
              <h2 className="font-semibold text-slate-800">Overdue — No vitals &gt;7 days</h2>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-rose-50/50 rounded-2xl p-4 shadow-sm border border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white text-slate-700 flex items-center justify-center font-bold text-sm border border-rose-100">
                    FA
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Farid Ahmed</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Last log: 4 May</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-rose-600 bg-rose-100 px-2 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    10 days
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              
              <div className="bg-rose-50/50 rounded-2xl p-4 shadow-sm border border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white text-slate-700 flex items-center justify-center font-bold text-sm border border-rose-100">
                    NH
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Nurul Hasan</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Last log: 6 May</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-rose-600 bg-rose-100 px-2 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    8 days
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </div>
          </section>

          {/* Empty State / Caught up */}
          <div className="mt-4 mb-8 text-center flex flex-col items-center justify-center opacity-80">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
              <span className="text-2xl">✨</span>
            </div>
            <p className="text-sm font-medium text-slate-600">All caught up! আপনি সব দেখেছেন</p>
            <p className="text-xs text-slate-400 mt-1">Great job managing your patients today.</p>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
