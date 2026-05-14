import React, { useState } from "react";
import { AppLayout } from "./_shared/AppLayout";
import { AlertCircle, AlertTriangle, ChevronRight, CheckCircle2 } from "lucide-react";

export function Alerts() {
  const [filter, setFilter] = useState("All");
  
  return (
    <AppLayout activeTab="alerts" alertCount={3}>
      <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans pb-20">
        
        {/* Header Section */}
        <div className="bg-white px-4 pt-6 pb-4 border-b border-slate-200 sticky top-0 z-10">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-slate-800">Clinical Alerts</h1>
            <button className="text-sm font-medium flex items-center gap-1" style={{ color: "#1A6B8A" }}>
              <CheckCircle2 size={16} />
              Mark all read
            </button>
          </div>
          
          {/* Summary Chips */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 hide-scrollbar">
            <div className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold whitespace-nowrap">
              Total 8
            </div>
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1" style={{ backgroundColor: "#fceeea", color: "#E74C3C" }}>
              <AlertCircle size={12} /> Critical 3
            </div>
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1" style={{ backgroundColor: "#fef5e7", color: "#F39C12" }}>
              <AlertTriangle size={12} /> Warning 5
            </div>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex border-b border-slate-200 mt-2">
            {["All", "Critical", "Warning"].map(tab => (
              <button 
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${filter === tab ? "text-slate-900" : "text-slate-500"}`}
              >
                {tab}
                {filter === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ backgroundColor: "#1A6B8A" }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          
          {/* CRITICAL SECTION */}
          {(filter === "All" || filter === "Critical") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#E74C3C" }} />
                <h2 className="text-xs font-bold tracking-wider uppercase" style={{ color: "#E74C3C" }}>Critical Actions Required</h2>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#E74C3C" }} />
                <div className="p-4 pl-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md" style={{ backgroundColor: "#fceeea" }}>
                        <AlertCircle size={16} style={{ color: "#E74C3C" }} />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">Rahim Mia</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">1h ago</span>
                  </div>
                  <p className="text-slate-700 text-sm font-medium leading-snug mb-3">eGFR dropped 22% in 30 days</p>
                  <button className="text-xs font-bold flex items-center gap-1 group" style={{ color: "#1A6B8A" }}>
                    View Patient <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#E74C3C" }} />
                <div className="p-4 pl-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md" style={{ backgroundColor: "#fceeea" }}>
                        <AlertCircle size={16} style={{ color: "#E74C3C" }} />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">Fatema Begum</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">3h ago</span>
                  </div>
                  <p className="text-slate-700 text-sm font-medium leading-snug mb-3">Creatinine 6.1 mg/dL (critical)</p>
                  <button className="text-xs font-bold flex items-center gap-1 group" style={{ color: "#1A6B8A" }}>
                    View Patient <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WARNING SECTION */}
          {(filter === "All" || filter === "Warning") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#F39C12" }} />
                <h2 className="text-xs font-bold tracking-wider uppercase" style={{ color: "#F39C12" }}>Warnings</h2>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#F39C12" }} />
                <div className="p-4 pl-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md" style={{ backgroundColor: "#fef5e7" }}>
                        <AlertTriangle size={16} style={{ color: "#F39C12" }} />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">Karim Ahmed</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">6h ago</span>
                  </div>
                  <p className="text-slate-700 text-sm font-medium leading-snug mb-3">No vitals logged in 9 days</p>
                  <button className="text-xs font-bold flex items-center gap-1 group" style={{ color: "#1A6B8A" }}>
                    View Patient <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#F39C12" }} />
                <div className="p-4 pl-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md" style={{ backgroundColor: "#fef5e7" }}>
                        <AlertTriangle size={16} style={{ color: "#F39C12" }} />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">Rokeya Khatun</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">8h ago</span>
                  </div>
                  <p className="text-slate-700 text-sm font-medium leading-snug mb-3">BP 158/98 mmHg (elevated)</p>
                  <button className="text-xs font-bold flex items-center gap-1 group" style={{ color: "#1A6B8A" }}>
                    View Patient <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#F39C12" }} />
                <div className="p-4 pl-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md" style={{ backgroundColor: "#fef5e7" }}>
                        <AlertTriangle size={16} style={{ color: "#F39C12" }} />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">Jabbar Ali</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">Yesterday</span>
                  </div>
                  <p className="text-slate-700 text-sm font-medium leading-snug mb-3">eGFR 31, Stage 3b reached</p>
                  <button className="text-xs font-bold flex items-center gap-1 group" style={{ color: "#1A6B8A" }}>
                    View Patient <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-center pt-4 pb-8">
            <span className="text-xs text-slate-400 font-medium">Swipe cards left to dismiss</span>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
