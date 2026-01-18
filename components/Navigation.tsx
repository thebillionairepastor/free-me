
import React from 'react';
import { View } from '../types';
import { LayoutDashboard, ShieldAlert, Globe, BookOpen, FileText, Briefcase, Lightbulb, Settings, X, User, Newspaper } from 'lucide-react';

interface NavigationProps {
  currentView: View;
  setView: (view: View) => void;
  isMobileMenuOpen: boolean;
  closeMobileMenu: () => void;
  onOpenSettings: () => void;
  bestPracticesBadge?: number;
}

const AntiRiskLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5 L95 85 L5 85 Z" fill="#000000" />
    <path d="M5 L85 L25 85 L15 65 Z" fill="#dc2626" />
    <path d="M95 85 L75 85 L85 65 Z" fill="#dc2626" />
    <circle cx="50" cy="55" r="30" fill="white" />
    <text x="50" y="68" fontFamily="Arial, sans-serif" fontSize="38" fontWeight="bold" fill="black" textAnchor="middle">AR</text>
    <rect x="0" y="85" width="100" height="15" fill="#000" />
  </svg>
);

const Navigation: React.FC<NavigationProps> = ({ 
  currentView, 
  setView, 
  isMobileMenuOpen, 
  closeMobileMenu, 
  onOpenSettings,
  bestPracticesBadge = 0
}) => {
  const navItems = [
    { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: View.NEWS_BLOG, label: 'Security News Blog', icon: Newspaper },
    { id: View.ADVISOR, label: 'AI Advisor', icon: ShieldAlert },
    { id: View.WEEKLY_TIPS, label: 'Weekly Tips', icon: Lightbulb },
    { id: View.BEST_PRACTICES, label: 'Global Security Trend', icon: Globe },
    { id: View.TRAINING, label: 'Training Engine', icon: BookOpen },
    { id: View.REPORT_ANALYZER, label: 'Intelligence Log', icon: FileText },
    { id: View.TOOLKIT, label: 'Operations Vault', icon: Briefcase },
  ];

  const baseClasses = "fixed inset-y-0 left-0 z-[60] w-[85vw] sm:w-80 bg-[#0a0f1a] border-r border-slate-800/40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-2xl lg:shadow-none";
  const mobileClasses = isMobileMenuOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] lg:hidden animate-in fade-in"
          onClick={closeMobileMenu}
        />
      )}

      <div className={`${baseClasses} ${mobileClasses}`}>
        <div className="h-full flex flex-col">
          <div className="p-8 border-b border-slate-800/40 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <AntiRiskLogo />
              <div>
                <h1 className="font-bold text-2xl text-white leading-tight tracking-tight">AntiRisk</h1>
                <p className="text-[10px] text-red-500 font-black tracking-[0.25em] uppercase">MANAGEMENT</p>
              </div>
            </div>
            <button 
              onClick={closeMobileMenu}
              className="lg:hidden p-2 text-slate-500 hover:text-white bg-slate-900/50 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 py-10 px-5 space-y-2 overflow-y-auto scrollbar-hide">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    closeMobileMenu();
                  }}
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-200 group active:scale-[0.97] ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                      : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <Icon size={24} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`} />
                    <span className="font-bold text-lg text-left">{item.label}</span>
                  </div>
                  {item.id === View.BEST_PRACTICES && bestPracticesBadge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                      {bestPracticesBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-8 border-t border-slate-800/40 space-y-6">
            <button 
              onClick={() => { onOpenSettings(); closeMobileMenu(); }}
              className="w-full flex items-center gap-5 px-6 py-4 rounded-2xl text-slate-400 hover:bg-slate-900/50 hover:text-white transition-all active:scale-[0.97]"
            >
              <User size={24} className={currentView === View.DASHBOARD ? "text-slate-500" : "text-blue-400"} />
              <span className="font-bold text-lg">CEO Profile</span>
            </button>
            <div className="bg-slate-900/30 rounded-3xl p-6 border border-slate-800/40">
              <h4 className="text-[10px] font-black text-slate-600 uppercase mb-4 tracking-[0.2em]">System Status</h4>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                <span className="text-sm font-bold text-slate-300">Vault Core Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
