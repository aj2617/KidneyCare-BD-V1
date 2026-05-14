import { AppLayout } from "./_shared/AppLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Building2, 
  Stethoscope, 
  Award,
  Users,
  Bell,
  Clock,
  RefreshCw,
  Download,
  CheckCircle2,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Globe
} from "lucide-react";

export function Profile() {
  return (
    <AppLayout activeTab="profile" alertCount={3}>
      <div className="flex flex-col min-h-full bg-slate-50 pb-8 font-sans">
        
        {/* Header Area */}
        <div className="bg-[#1A6B8A] pt-12 pb-16 px-4 rounded-b-3xl relative">
          <h1 className="text-white text-xl font-semibold mb-6">Doctor Profile</h1>
        </div>

        {/* Profile Card (Overlapping header) */}
        <div className="px-4 -mt-12 relative z-10">
          <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col items-center p-6 border-b border-slate-100">
                <Avatar className="h-20 w-20 ring-4 ring-white mb-4 bg-slate-100">
                  <AvatarFallback className="text-[#1A6B8A] text-2xl font-bold bg-slate-100">DR</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold text-slate-900">Dr. Aminur Rahman</h2>
                <div className="flex items-center text-slate-500 mt-1 mb-2">
                  <Stethoscope className="w-4 h-4 mr-1.5" />
                  <span className="text-sm font-medium">Nephrologist</span>
                </div>
                
                <div className="w-full mt-4 space-y-2 bg-slate-50 p-3 rounded-xl text-sm">
                  <div className="flex items-start text-slate-600">
                    <Building2 className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-slate-400" />
                    <span>Dhaka Medical College Hospital</span>
                  </div>
                  <div className="flex items-start text-slate-600">
                    <Award className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-slate-400" />
                    <span>BMDC: A-49281</span>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white">
                <div className="flex flex-col items-center p-3 text-center">
                  <Users className="w-5 h-5 text-[#1A6B8A] mb-1" />
                  <span className="text-sm font-bold text-slate-900">12</span>
                  <span className="text-xs text-slate-500 font-medium">Patients</span>
                </div>
                <div className="flex flex-col items-center p-3 text-center">
                  <Bell className="w-5 h-5 text-[#1A6B8A] mb-1" />
                  <span className="text-sm font-bold text-slate-900">3</span>
                  <span className="text-xs text-slate-500 font-medium">Alerts</span>
                </div>
                <div className="flex flex-col items-center p-3 text-center">
                  <Clock className="w-5 h-5 text-[#1A6B8A] mb-1" />
                  <span className="text-sm font-bold text-slate-900">2h</span>
                  <span className="text-xs text-slate-500 font-medium">Since sync</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Sections */}
        <div className="px-4 mt-6 space-y-6">
          
          {/* Language Section */}
          <div>
            <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2 ml-2">Language & Region</h3>
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-white">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                    <Globe className="w-4 h-4 text-[#1A6B8A]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Language / ভাষা</p>
                    <p className="text-xs text-slate-500 mt-0.5">English (EN)</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-slate-400">EN</span>
                  <Switch checked={false} />
                  <span className="text-xs font-medium text-slate-400">বাংলা</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Sync & Offline Section */}
          <div>
            <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2 ml-2">Sync & Offline</h3>
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-100">
                
                <div className="flex items-center justify-between p-4 bg-white">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                      <RefreshCw className="w-4 h-4 text-[#1A6B8A]" />
                    </div>
                    <div>
                      <div className="flex items-center">
                        <p className="text-sm font-semibold text-slate-900">Sync Status</p>
                        <span className="flex w-2 h-2 rounded-full bg-emerald-500 ml-2"></span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Last synced: 2 min ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs border-[#1A6B8A] text-[#1A6B8A] rounded-full px-4">
                    Sync Now
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                      <Download className="w-4 h-4 text-[#1A6B8A]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Offline Data</p>
                      <p className="text-xs text-slate-500 mt-0.5">47 records cached</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>

                <div className="flex items-center justify-between p-4 bg-white">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                      <CheckCircle2 className="w-4 h-4 text-[#1A6B8A]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Pending Actions</p>
                      <p className="text-xs text-slate-500 mt-0.5">0 pending uploads</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>

              </div>
            </Card>
          </div>

          {/* Account Section */}
          <div>
            <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2 ml-2">Account</h3>
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-100">
                
                <div className="flex items-center justify-between p-4 bg-white active:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mr-3">
                      <HelpCircle className="w-4 h-4 text-slate-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">Help & Support</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>

                <div className="flex items-center justify-between p-4 bg-white active:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mr-3">
                      <Info className="w-4 h-4 text-slate-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">About KidneyCare MD</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>

                <div className="flex items-center justify-between p-4 bg-white active:bg-red-50 transition-colors cursor-pointer group">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-red-50 group-active:bg-red-100 flex items-center justify-center mr-3 transition-colors">
                      <LogOut className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-sm font-semibold text-red-600">Logout</p>
                  </div>
                </div>

              </div>
            </Card>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 mb-4 text-center">
          <p className="text-xs font-medium text-slate-400">KidneyCare BD © 2026</p>
          <p className="text-[10px] text-slate-400 mt-0.5">v2.1.4</p>
        </div>

      </div>
    </AppLayout>
  );
}
