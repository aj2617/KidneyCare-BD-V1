import React, { useState } from "react";
import { AppLayout } from "./_shared/AppLayout";
import { Search, ChevronRight, User, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Patient {
  id: string;
  name: string;
  age: number;
  sex: "M" | "F";
  risk: "Critical" | "High" | "Moderate" | "Low";
  egfr: number;
  egfrTrend: "up" | "down" | "stable";
  lastLogged: string;
}

const mockPatients: Patient[] = [
  { id: "P-1042", name: "Rahim Mia", age: 52, sex: "M", risk: "Critical", egfr: 28, egfrTrend: "down", lastLogged: "2h ago" },
  { id: "P-1043", name: "Fatima Begum", age: 64, sex: "F", risk: "High", egfr: 35, egfrTrend: "down", lastLogged: "1d ago" },
  { id: "P-1044", name: "Abdul Karim", age: 48, sex: "M", risk: "Moderate", egfr: 45, egfrTrend: "stable", lastLogged: "4h ago" },
  { id: "P-1045", name: "Salma Akter", age: 55, sex: "F", risk: "Critical", egfr: 22, egfrTrend: "down", lastLogged: "8d ago" },
  { id: "P-1046", name: "Hasan Mahmud", age: 60, sex: "M", risk: "Low", egfr: 72, egfrTrend: "up", lastLogged: "12h ago" },
  { id: "P-1047", name: "Ayesha Siddiqa", age: 41, sex: "F", risk: "High", egfr: 38, egfrTrend: "stable", lastLogged: "3d ago" },
];

const riskColors = {
  Critical: "#E74C3C",
  High: "#F39C12",
  Moderate: "#F39C12", // using warning for moderate, or maybe a lighter orange? let's stick to warning
  Low: "#2ECC71",
};

const riskBadgeColors = {
  Critical: { bg: "#FDECEA", text: "#E74C3C" },
  High: { bg: "#FEF5E7", text: "#F39C12" },
  Moderate: { bg: "#FEF5E7", text: "#F39C12" },
  Low: { bg: "#EAFAF1", text: "#2ECC71" },
};

export function Patients() {
  const [activeFilter, setActiveFilter] = useState("All");
  
  const filters = ["All", "Critical", "Stage 3+", "Unlogged >7d"];

  return (
    <AppLayout activeTab="patients" alertCount={3}>
      <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
        {/* Header */}
        <header 
          className="flex items-center justify-between px-4 py-3 text-white shadow-sm z-10"
          style={{ backgroundColor: "#1A6B8A" }}
        >
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">KidneyCare MD</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 text-white/90" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border border-[#1A6B8A]">
                3
              </span>
            </div>
            <Avatar className="h-8 w-8 border border-white/20">
              <AvatarImage src="https://i.pravatar.cc/150?u=dr_ahmed" />
              <AvatarFallback className="bg-white/20 text-white text-xs">Dr</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Search */}
        <div className="px-4 py-3 bg-white border-b border-slate-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-slate-300 sm:text-sm transition-all"
              placeholder="Search by name or ID..."
            />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-slate-200 py-2 pb-3">
          <div className="flex overflow-x-auto px-4 gap-2 no-scrollbar pb-1">
            {filters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === filter 
                    ? "text-white shadow-sm" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                style={activeFilter === filter ? { backgroundColor: "#1A6B8A" } : {}}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Patient List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
          {mockPatients.map((patient) => (
            <div 
              key={patient.id} 
              className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <Avatar className="h-12 w-12 border-2" style={{ borderColor: riskColors[patient.risk] }}>
                <AvatarFallback className="font-semibold text-slate-700 bg-slate-50">
                  {patient.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-slate-900 truncate pr-2">
                    {patient.name}, <span className="font-normal text-slate-500">{patient.age}{patient.sex}</span>
                  </h3>
                  <span 
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide shrink-0"
                    style={{ 
                      backgroundColor: riskBadgeColors[patient.risk].bg,
                      color: riskBadgeColors[patient.risk].text
                    }}
                  >
                    {patient.risk}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="text-slate-500">eGFR</span>
                    <span>{patient.egfr}</span>
                    {patient.egfrTrend === 'down' && <span className="text-red-500 text-lg leading-none">↓</span>}
                    {patient.egfrTrend === 'up' && <span className="text-green-500 text-lg leading-none">↑</span>}
                    {patient.egfrTrend === 'stable' && <span className="text-slate-400 text-lg leading-none">-</span>}
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    Logged {patient.lastLogged}
                  </span>
                </div>
              </div>
              
              <div className="pl-1 flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
