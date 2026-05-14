import React from "react";
import { AppLayout } from "./_shared/AppLayout";
import {
  Calculator,
  FileText,
  Video,
  BarChart2,
  ClipboardList,
  Activity,
  WifiOff,
  CheckCircle2
} from "lucide-react";

export function Tools() {
  const tools = [
    {
      id: "gfr",
      title: "GFR Calculator",
      subtitle: "MDRD · CG · CKD-EPI",
      icon: <Calculator className="w-8 h-8 mb-3" />,
      colorClass: "bg-teal-50 text-teal-900 border-teal-200",
      iconColor: "text-teal-600",
      offline: true,
    },
    {
      id: "rx",
      title: "Issue Prescription",
      subtitle: "Bengali PDF + QR",
      icon: <FileText className="w-8 h-8 mb-3" />,
      colorClass: "bg-blue-50 text-blue-900 border-blue-200",
      iconColor: "text-blue-600",
      offline: false,
    },
    {
      id: "tele",
      title: "Teleconsult",
      subtitle: "Start video call",
      icon: <Video className="w-8 h-8 mb-3" />,
      colorClass: "bg-green-50 text-green-900 border-green-200",
      iconColor: "text-green-600",
      offline: false,
    },
    {
      id: "compare",
      title: "Compare Equations",
      subtitle: "Side-by-side GFR",
      icon: <BarChart2 className="w-8 h-8 mb-3" />,
      colorClass: "bg-purple-50 text-purple-900 border-purple-200",
      iconColor: "text-purple-600",
      offline: false,
    },
    {
      id: "staging",
      title: "CKD Staging",
      subtitle: "Quick reference",
      icon: <ClipboardList className="w-8 h-8 mb-3" />,
      colorClass: "bg-amber-50 text-amber-900 border-amber-200",
      iconColor: "text-amber-600",
      offline: true,
    },
    {
      id: "risk",
      title: "Risk Score",
      subtitle: "AI-powered",
      icon: <Activity className="w-8 h-8 mb-3" />,
      colorClass: "bg-rose-50 text-rose-900 border-rose-200",
      iconColor: "text-rose-600",
      offline: false,
    },
  ];

  return (
    <AppLayout activeTab="tools" alertCount={3}>
      <div className="p-4 flex-1 overflow-y-auto pb-24 bg-gray-50">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Clinical Tools</h1>
          <p className="text-sm text-gray-500 mt-1">Quick access to essential utilities</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {tools.map((tool) => (
            <button
              key={tool.id}
              className={`relative flex flex-col items-start justify-center p-4 rounded-2xl border min-h-[140px] shadow-sm transition-transform active:scale-95 text-left ${tool.colorClass}`}
            >
              {tool.offline && (
                <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-black/5">
                  <WifiOff className="w-3 h-3 text-gray-600" />
                  <span className="text-[10px] font-medium text-gray-700">Offline</span>
                </div>
              )}
              <div className={tool.iconColor}>{tool.icon}</div>
              <h3 className="font-bold text-base leading-tight">{tool.title}</h3>
              <p className="text-xs opacity-80 mt-1">{tool.subtitle}</p>
            </button>
          ))}
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-emerald-900 text-sm">Offline mode ready</h4>
            <p className="text-emerald-700 text-xs mt-0.5 leading-relaxed">
              4 tools available without signal. GFR Calculator, Equations, Staging, and partial Prescriptions are cached.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
