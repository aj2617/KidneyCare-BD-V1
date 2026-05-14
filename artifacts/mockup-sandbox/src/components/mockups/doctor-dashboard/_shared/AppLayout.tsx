import { ReactNode } from "react";
import { Users, Bell, ClipboardList, Wrench, UserCircle } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
  activeTab: "patients" | "alerts" | "today" | "tools" | "profile";
  alertCount?: number;
}

export function AppLayout({ children, activeTab, alertCount = 3 }: AppLayoutProps) {
  const tabs = [
    { id: "patients", label: "Patients", Icon: Users },
    { id: "alerts", label: "Alerts", Icon: Bell },
    { id: "today", label: "Today", Icon: ClipboardList },
    { id: "tools", label: "Tools", Icon: Wrench },
    { id: "profile", label: "Profile", Icon: UserCircle },
  ] as const;

  return (
    <div className="flex flex-col bg-[#F0F4F8] min-h-screen max-w-[390px] mx-auto relative overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Content area — scrollable, padded bottom for nav */}
      <div className="flex-1 overflow-y-auto pb-[72px]">
        {children}
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-slate-200 z-50" style={{ height: 64 }}>
        <div className="flex items-stretch h-full">
          {tabs.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative"
              >
                <div className="relative">
                  <Icon
                    className="w-6 h-6"
                    style={{ color: active ? "#1A6B8A" : "#94A3B8" }}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  {id === "alerts" && alertCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                      {alertCount}
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: active ? "#1A6B8A" : "#94A3B8" }}
                >
                  {label}
                </span>
                {active && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                    style={{ backgroundColor: "#1A6B8A" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
