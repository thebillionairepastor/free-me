import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, Send, Plus, Search, RefreshCw, Download, FileText, ChevronRight, ShieldAlert, BookOpen, Globe, Briefcase, Calendar, ChevronLeft, Save, Trash2, Check, Lightbulb, Printer, Settings as SettingsIcon, MessageCircle, Mail, X, Bell, Database, Upload, Pin, PinOff, BarChart2, Sparkles, Copy, Lock, ShieldCheck, Fingerprint, Eye, Paperclip, XCircle, Bookmark, BookmarkCheck, LayoutGrid, ListFilter, Wand2, Map, ExternalLink, ImageIcon, Target, User, Phone, FileUp, Key, AlertTriangle, EyeIcon, CloudDownload, WifiOff, Newspaper, History } from 'lucide-react';
import Navigation from './components/Navigation.tsx';
import MarkdownRenderer from './components/MarkdownRenderer.tsx';
import ShareButton from './components/ShareButton.tsx';
import IncidentChart from './components/IncidentChart.tsx';
import { View, ChatMessage, Template, SecurityRole, StoredReport, WeeklyTip, UserProfile, KnowledgeDocument, SavedTrend, StoredTrainingModule, NewsItem } from './types.ts';
import { STATIC_TEMPLATES, SECURITY_TRAINING_DB } from './constants.ts';
import { generateAdvisorResponse, generateTrainingModule, analyzeReport, fetchBestPractices, generateWeeklyTip, getTrainingSuggestions, fetchTopicSuggestions, fetchSecurityNews, analyzePatrolPatterns } from './services/geminiService.ts';

// --- Offline Storage Service (IndexedDB) ---
const DB_NAME = 'AntiRiskOfflineVault';
const STORE_NAME = 'offline_training';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveOfflineModule = async (module: StoredTrainingModule) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(module);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const getOfflineModules = async (): Promise<StoredTrainingModule[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const removeOfflineModuleFromDB = async (id: string) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const AntiRiskLogo = ({ className = "w-24 h-24", light = false }: { className?: string; light?: boolean }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5 L95 85 L5 85 Z" fill={light ? "#1e293b" : "#000000"} />
    <path d="M50 15 L85 80 L15 80 Z" fill={light ? "#334155" : "#000000"} />
    <circle cx="50" cy="55" r="30" fill="white" />
    <text x="50" y="68" fontFamily="Arial, sans-serif" fontSize="38" fontWeight="bold" fill="black" textAnchor="middle">AR</text>
    <rect x="0" y="85" width="100" height="15" fill="#000" />
    <text x="50" y="96" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">ANTI-RISK SECURITY</text>
  </svg>
);

function App() {
  const [appState, setAppState] = useState<'SPLASH' | 'PIN_ENTRY' | 'PIN_SETUP' | 'READY'>('SPLASH');
  const [pinInput, setPinInput] = useState('');
  const [setupStep, setSetupStep] = useState(1);
  const [tempPin, setTempPin] = useState('');
  const [isPinError, setIsPinError] = useState(false);
  const [splashProgress, setSplashProgress] = useState(0);
  const [storedPin, setStoredPin] = useState<string | null>(() => localStorage.getItem('security_app_vault_pin'));
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewTipAlert, setShowNewTipAlert] = useState<WeeklyTip | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Offline Storage State
  const [offlineIds, setOfflineIds] = useState<Set<string>>(new Set());
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => setIsOfflineMode(!navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    getOfflineModules().then(modules => setOfflineIds(new Set(modules.map(m => m.id))));
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('security_app_profile');
    return saved ? JSON.parse(saved) : { name: 'Executive Director', phoneNumber: '', email: '', preferredChannel: 'WhatsApp' };
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('security_app_chat');
    return saved ? JSON.parse(saved) : [{
      id: 'welcome',
      role: 'model',
      text: `Hello CEO ${userProfile.name ? userProfile.name : ''}. AntiRisk Intelligence Vault is active. How can I assist with your strategic security operations today?`,
      timestamp: Date.now()
    }];
  });

  const [storedReports, setStoredReports] = useState<StoredReport[]>(() => {
    const saved = localStorage.getItem('security_app_reports');
    return saved ? JSON.parse(saved) : [];
  });

  const [weeklyTips, setWeeklyTips] = useState<WeeklyTip[]>(() => {
    const saved = localStorage.getItem('security_app_weekly_tips');
    return saved ? JSON.parse(saved) : [];
  });

  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeDocument[]>(() => {
    const saved = localStorage.getItem('security_app_kb');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedTraining, setSavedTraining] = useState<StoredTrainingModule[]>(() => {
    const saved = localStorage.getItem('security_app_training');
    return saved ? JSON.parse(saved) : [];
  });

  const [customSops, setCustomSops] = useState<Template[]>(() => {
    const saved = localStorage.getItem('security_app_custom_sops');
    return saved ? JSON.parse(saved) : [];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isAdvisorThinking, setIsAdvisorThinking] = useState(false);
  const [advisorViewMode, setAdvisorViewMode] = useState<'CHAT' | 'PINNED'>('CHAT');
  const [showKbModal, setShowKbModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [showSopModal, setShowSopModal] = useState(false);
  const [newSopTitle, setNewSopTitle] = useState('');
  const [newSopDesc, setNewSopDesc] = useState('');
  const [newSopContent, setNewSopContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [trainingTopic, setTrainingTopic] = useState('');
  const [trainingWeek, setTrainingWeek] = useState<number>(1);
  const [trainingRole, setTrainingRole] = useState<SecurityRole>(SecurityRole.GUARD);
  const [trainingContent, setTrainingContent] = useState('');
  const [trainingSources, setTrainingSources] = useState<Array<{ title: string; url: string }> | undefined>(undefined);
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);
  
  // Training View specific states
  const [trainingViewMode, setTrainingViewMode] = useState<'GENERATE' | 'HISTORY'>('GENERATE');
  const [trainingSuggestions, setTrainingSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showTrainingSuggestions, setShowTrainingSuggestions] = useState(false);

  const [reportText, setReportText] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzerTab, setAnalyzerTab] = useState<'DAILY' | 'PATROL'>('DAILY');
  const [bpTopic, setBpTopic] = useState('');
  const [bpContent, setBpContent] = useState<{ text: string; sources?: Array<{ title: string; url: string }> } | null>(null);
  const [isBpLoading, setIsBpLoading] = useState(false);
  const [isTipLoading, setIsTipLoading] = useState(false);

  const [toolkitSearch, setToolkitSearch] = useState('');

  const [newsBlog, setNewsBlog] = useState<{ text: string; sources?: Array<{ title: string; url: string }> } | null>(null);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('security_app_profile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('security_app_chat', JSON.stringify(messages)); chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { localStorage.setItem('security_app_reports', JSON.stringify(storedReports)); }, [storedReports]);
  useEffect(() => { localStorage.setItem('security_app_weekly_tips', JSON.stringify(weeklyTips)); }, [weeklyTips]);
  useEffect(() => { localStorage.setItem('security_app_kb', JSON.stringify(knowledgeBase)); }, [knowledgeBase]);
  useEffect(() => { localStorage.setItem('security_app_training', JSON.stringify(savedTraining)); }, [savedTraining]);
  useEffect(() => { localStorage.setItem('security_app_custom_sops', JSON.stringify(customSops)); }, [customSops]);

  // Handle Training Suggestions Debounce
  useEffect(() => {
    if (trainingTopic.trim().length < 3 || isOfflineMode || !showTrainingSuggestions) {
      setTrainingSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const suggestions = await fetchTopicSuggestions(trainingTopic);
        setTrainingSuggestions(suggestions);
      } catch (err) {
        console.error("Suggestion fetch failed", err);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [trainingTopic, isOfflineMode, showTrainingSuggestions]);

  useEffect(() => {
    if (appState === 'READY' && !isOfflineMode) {
      const checkAutomation = async () => {
        const lastAutoCheck = localStorage.getItem('security_app_last_auto_tip');
        const today = new Date().toLocaleDateString();
        if (lastAutoCheck === today) return; 
        const mostRecentTip = weeklyTips[0];
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        if (!mostRecentTip || (Date.now() - mostRecentTip.timestamp > sevenDaysInMs)) {
           handleGenerateWeeklyTip();
        }
        localStorage.setItem('security_app_last_auto_tip', today);
      };
      checkAutomation();
    }
  }, [appState, isOfflineMode]);

  useEffect(() => {
    if (appState === 'SPLASH') {
      const startTime = Date.now();
      const duration = 2000;
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        setSplashProgress(progress);
        if (progress >= 100) {
          clearInterval(timer);
          setTimeout(() => setAppState(storedPin ? 'PIN_ENTRY' : 'PIN_SETUP'), 300);
        }
      }, 30);
      return () => clearInterval(timer);
    }
  }, [appState, storedPin]);

  const handlePinDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    const newPin = pinInput + digit;
    setPinInput(newPin);
    setIsPinError(false);
    if (newPin.length === 4) {
      if (appState === 'PIN_ENTRY') {
        if (newPin === storedPin) setAppState('READY');
        else { setIsPinError(true); setTimeout(() => setPinInput(''), 500); }
      } else {
        if (setupStep === 1) { setTempPin(newPin); setSetupStep(2); setPinInput(''); }
        else {
          if (newPin === tempPin) { 
            localStorage.setItem('security_app_vault_pin', newPin); 
            setStoredPin(newPin); 
            setAppState('READY');
          } else { setIsPinError(true); setSetupStep(1); setPinInput(''); }
        }
      }
    }
  };

  const handleError = (error: any) => {
    const errorStr = JSON.stringify(error).toUpperCase();
    const isQuota = errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('QUOTA') || errorStr.includes('429') || errorStr.includes('LIMIT');
    if (isQuota) {
      setApiError("Intelligence Core is under high load. Stabilization link active. Please wait...");
    } else {
      setApiError(`Communication Breach: ${error?.message || "Internal failure."}`);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isOfflineMode) return;
    setApiError(null);
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputMessage, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsAdvisorThinking(true);
    try {
      const response = await generateAdvisorResponse(messages, inputMessage, knowledgeBase);
      const aiMsg: ChatMessage = { id: Date.now().toString() + 'ai', role: 'model', text: response.text, timestamp: Date.now(), isPinned: false, sources: response.sources };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) { handleError(err); } finally { setIsAdvisorThinking(false); }
  };

  const togglePinMessage = (messageId: string) => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg));
  };

  const handleAnalyzeReport = async () => {
    if (!reportText || isOfflineMode) return;
    setApiError(null); setIsAnalyzing(true);
    try {
      const result = await analyzeReport(reportText, storedReports);
      setAnalysisResult(result);
      setStoredReports(prev => [{ id: Date.now().toString(), timestamp: Date.now(), dateStr: new Date().toLocaleDateString(), content: reportText, analysis: result }, ...prev]);
    } catch (err: any) { handleError(err); } finally { setIsAnalyzing(false); }
  };

  const handleAnalyzePatrols = async () => {
    if (storedReports.length === 0 || isOfflineMode) return;
    setApiError(null); setIsAnalyzing(true);
    try {
      const result = await analyzePatrolPatterns(storedReports);
      setAnalysisResult(result);
    } catch (err: any) { handleError(err); } finally { setIsAnalyzing(false); }
  };

  const handleGenerateTraining = async () => {
    if (!trainingTopic || isOfflineMode) return;
    setApiError(null); setIsTrainingLoading(true); setTrainingSources(undefined);
    setShowTrainingSuggestions(false);
    try {
      const result = await generateTrainingModule(trainingTopic, trainingWeek, trainingRole);
      setTrainingContent(result.text);
      setTrainingSources(result.sources);
      
      // AUTO-SAVE to Local Intelligence Database
      const newModule: StoredTrainingModule = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        topic: trainingTopic,
        targetAudience: trainingRole,
        content: result.text,
        generatedDate: new Date().toLocaleDateString()
      };
      setSavedTraining(prev => [newModule, ...prev]);
    } catch (err: any) { handleError(err); } finally { setIsTrainingLoading(false); }
  };

  const handleDeleteTraining = (id: string) => {
    setSavedTraining(prev => prev.filter(m => m.id !== id));
  };

  const handleFetchBP = async () => {
    if (isOfflineMode) return;
    setApiError(null); setIsBpLoading(true);
    try {
      const result = await fetchBestPractices(bpTopic);
      setBpContent(result);
    } catch (err: any) { handleError(err); } finally { setIsBpLoading(false); }
  };

  const handleGenerateWeeklyTip = async () => {
    if (isOfflineMode) return;
    setApiError(null); setIsTipLoading(true);
    try {
      const content = await generateWeeklyTip(weeklyTips);
      const newTip: WeeklyTip = { id: Date.now().toString(), timestamp: Date.now(), weekDate: new Date().toLocaleDateString(), topic: "Weekly Strategic Focus", content, isAutoGenerated: true };
      setWeeklyTips(prev => [newTip, ...prev]);
      setShowNewTipAlert(newTip);
    } catch (err: any) { handleError(err); } finally { setIsTipLoading(false); }
  };

  const handleLoadNews = async () => {
    setIsNewsLoading(true); setApiError(null);
    try {
      const news = await fetchSecurityNews();
      setNewsBlog(news);
    } catch (err: any) { handleError(err); } finally { setIsNewsLoading(false); }
  };

  const handleAddKbDocument = () => {
    if (!newDocTitle || !newDocContent) return;
    const newDoc: KnowledgeDocument = { id: Date.now().toString(), title: newDocTitle, content: newDocContent, dateAdded: new Date().toLocaleDateString() };
    setKnowledgeBase(prev => [...prev, newDoc]);
    setNewDocTitle(''); setNewDocContent(''); setShowKbModal(false);
  };

  const handleAddCustomSop = () => {
    if (!newSopTitle || !newSopContent) return;
    const newSop: Template = { id: Date.now().toString(), title: newSopTitle, description: newSopDesc || 'Custom Protocol', content: newSopContent };
    setCustomSops(prev => [newSop, ...prev]);
    setNewSopTitle(''); setNewSopDesc(''); setNewSopContent(''); setShowSopModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setNewSopContent(content);
      if (!newSopTitle) setNewSopTitle(file.name.replace(/\.[^/.]+$/, ""));
    };
    reader.readAsText(file);
  };

  // --- Views ---

  const renderDashboard = () => (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#21439c] to-[#122b6a] border border-blue-500/20 rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl">
        <div className="relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Intelligence Control</h2>
          <p className="text-blue-100 text-lg sm:text-xl mb-8 font-medium">Over 10-Million Training Vibrations and High-Fidelity CEO Intel.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => setCurrentView(View.ADVISOR)} className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all">Strategic Consultation</button>
            <button onClick={() => setCurrentView(View.TRAINING)} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all">Audit 10M Vault</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div onClick={() => setCurrentView(View.NEWS_BLOG)} className="bg-[#1b2537] p-8 rounded-[2rem] border border-slate-700/40 cursor-pointer hover:bg-slate-800 transition-all group">
          <Newspaper className="text-emerald-400 mb-6" size={36} />
          <h3 className="text-2xl font-bold text-white mb-2">News Blog</h3>
          <p className="text-slate-400">NSCDC, NIMASA, and ISO regulatory updates.</p>
        </div>
        <div onClick={() => setCurrentView(View.BEST_PRACTICES)} className="bg-[#1b2537] p-8 rounded-[2rem] border border-slate-700/40 cursor-pointer hover:bg-slate-800 transition-all group">
          <Globe className="text-blue-400 mb-6" size={36} />
          <h3 className="text-2xl font-bold text-white mb-2">Global Trends</h3>
          <p className="text-slate-400">Industry standards and tactical shifts.</p>
        </div>
      </div>
    </div>
  );

  const renderTrainingView = () => (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-full max-w-7xl mx-auto">
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-[#1b2537] p-8 rounded-[2rem] border border-slate-700/50 shadow-lg relative">
          <div className="absolute -top-3 -right-3 bg-blue-600 text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg z-10 border border-blue-400/30 animate-pulse uppercase tracking-widest">10M+ Bank</div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3"><BookOpen size={28} className="text-emerald-400" /> Training Vault</h2>
          
          <div className="flex gap-2 p-1 bg-slate-900/60 rounded-xl mb-6 border border-slate-800">
            <button onClick={() => setTrainingViewMode('GENERATE')} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${trainingViewMode === 'GENERATE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>Generate</button>
            <button onClick={() => setTrainingViewMode('HISTORY')} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${trainingViewMode === 'HISTORY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>Database {savedTraining.length > 0 && <span className="bg-slate-800/50 px-1.5 py-0.5 rounded text-[10px]">{savedTraining.length}</span>}</button>
          </div>

          {trainingViewMode === 'GENERATE' ? (
            <div className="space-y-4">
              <div className="space-y-1 relative">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Deep Intelligence Search</label>
                <div className="relative">
                  <input 
                    value={trainingTopic} 
                    onChange={(e) => {
                      setTrainingTopic(e.target.value);
                      setShowTrainingSuggestions(true);
                    }} 
                    onFocus={() => setShowTrainingSuggestions(true)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-blue-500 transition-all text-sm" 
                    placeholder="Search 10-Million+ Topics..." 
                  />
                  {isFetchingSuggestions ? (
                    <RefreshCw size={14} className="absolute right-4 top-4 text-blue-500 animate-spin" />
                  ) : (
                    <Search size={14} className="absolute right-4 top-4 text-slate-500" />
                  )}
                </div>
                
                {/* Auto-suggestions Dropdown */}
                {showTrainingSuggestions && trainingSuggestions.length > 0 && (
                  <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#0a1222] border border-slate-700 rounded-2xl shadow-2xl z-[50] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-blue-500/20">
                    <div className="p-2 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-2">Vibration Stream</span>
                      <button onClick={() => setShowTrainingSuggestions(false)} className="text-slate-500 hover:text-white p-1"><X size={12}/></button>
                    </div>
                    <div className="max-h-60 overflow-y-auto scrollbar-hide">
                      {trainingSuggestions.map((suggestion, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => {
                            setTrainingTopic(suggestion);
                            setShowTrainingSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-bold text-slate-300 hover:bg-blue-600/10 hover:text-blue-400 transition-colors flex items-center gap-3 border-b border-slate-800/40 last:border-0"
                        >
                          <Wand2 size={12} className="shrink-0 text-blue-500 opacity-60" />
                          <span className="truncate">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Role</label>
                  <select value={trainingRole} onChange={(e) => setTrainingRole(e.target.value as SecurityRole)} className="w-full bg-slate-900/40 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 focus:border-blue-500 outline-none">
                    <option value={SecurityRole.GUARD}>Guard</option>
                    <option value={SecurityRole.SUPERVISOR}>Supervisor</option>
                    <option value={SecurityRole.GEN_SUPERVISOR}>Director</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Progression</label>
                  <select value={trainingWeek} onChange={(e) => setTrainingWeek(parseInt(e.target.value))} className="w-full bg-slate-900/40 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 focus:border-blue-500 outline-none">
                    <option value={1}>Week 1</option>
                    <option value={2}>Week 2</option>
                    <option value={3}>Week 3</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleGenerateTraining} 
                disabled={isTrainingLoading || !trainingTopic} 
                className="w-full bg-blue-600 py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {isTrainingLoading ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                Audit Internet & Generate
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px] scrollbar-hide pr-1">
              {savedTraining.length > 0 ? (
                savedTraining.map(module => (
                  <div key={module.id} className="group p-4 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-blue-500/30 transition-all cursor-pointer flex justify-between items-center" onClick={() => setTrainingContent(module.content)}>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 truncate pr-2">{module.topic}</h4>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase">{module.generatedDate}</span>
                        <span className="text-[9px] font-black text-blue-500 uppercase">W{module.timestamp % 3 + 1}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTraining(module.id); }} className="p-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-20"><History size={48} /><p className="text-[10px] font-black uppercase mt-4">Database Empty</p></div>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#1b2537] rounded-[2rem] border border-slate-700/50 flex-1 flex flex-col overflow-hidden shadow-inner hidden lg:flex">
          <div className="p-4 border-b border-slate-700/50 bg-slate-900/40 text-xs font-black text-slate-400 uppercase tracking-widest">Global Sector Indices</div>
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-2">
            {Object.keys(SECURITY_TRAINING_DB).map(cat => (
              <button key={cat} onClick={() => {
                setTrainingTopic(cat);
                setShowTrainingSuggestions(false);
              }} className={`w-full text-left p-3 rounded-xl text-sm font-bold transition-all border ${trainingTopic === cat ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800/20 text-slate-300 hover:bg-slate-800 border-slate-700/30'}`}>{cat}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 flex flex-col gap-6 min-h-[500px]">
        <div className="bg-[#1b2537] rounded-[2rem] border border-slate-700/50 overflow-hidden flex flex-col flex-1 shadow-2xl">
          <div className="p-6 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-3">
              <ShieldCheck className="text-blue-400" /> 
              {trainingContent ? 'Intelligence Brief Generated' : 'Waiting for Query'}
            </h3>
            {trainingContent && <ShareButton content={trainingContent} title={`${trainingTopic} - Strategic Brief`} />}
          </div>
          <div className="flex-1 p-8 overflow-y-auto bg-slate-900/10 scrollbar-hide">
            {trainingContent ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <MarkdownRenderer content={trainingContent} />
                {trainingSources && trainingSources.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-800">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Verified Grounding Sources</h4>
                    <div className="flex flex-wrap gap-3">
                      {trainingSources.map((source, idx) => (
                        <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg text-[10px] font-bold text-blue-400 border border-slate-700 hover:border-blue-500 transition-all">
                          <ExternalLink size={12} /> {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-center gap-8 py-20 max-w-sm mx-auto">
                <div className="relative">
                  <Database size={80} className="text-slate-400" />
                  <div className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-xl shadow-lg animate-bounce"><Search size={24} className="text-white" /></div>
                </div>
                <p className="text-lg font-medium leading-relaxed">Search for any topic. If not in our core database, we will audit the global intelligence stream to generate a deep-dive training for you.</p>
                <div className="flex gap-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase border border-slate-800 px-3 py-1.5 rounded-lg">10M+ Topics</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase border border-slate-800 px-3 py-1.5 rounded-lg">Real-time Grounding</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBestPractices = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div className="bg-[#1b2537] p-10 rounded-[2.5rem] border border-slate-700/50 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1 space-y-2">
          <h2 className="text-3xl font-black text-white flex items-center gap-4"><Globe className="text-blue-400" size={36} /> Global Security Trends</h2>
          <p className="text-slate-400 text-lg font-medium">Deep intelligence on ISO standards and market shifts.</p>
        </div>
        <div className="w-full md:w-72 relative">
          <input value={bpTopic} onChange={(e) => setBpTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFetchBP()} placeholder="Search trends..." className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-blue-500" />
          <button onClick={handleFetchBP} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><Search size={20} /></button>
        </div>
      </div>
      <div className="bg-[#1b2537] rounded-[2.5rem] border border-slate-700/50 overflow-hidden shadow-xl min-h-[400px] flex flex-col">
        {isBpLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6 opacity-50"><RefreshCw className="text-blue-400 animate-spin" size={48} /><p className="text-slate-400 font-black uppercase tracking-widest">Querying Vault...</p></div>
        ) : bpContent ? (
          <div className="p-10">
            <div className="flex justify-end mb-6"><ShareButton content={bpContent.text} title="Global Trend Brief" /></div>
            <MarkdownRenderer content={bpContent.text} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-700 opacity-20 p-20 text-center gap-6"><Globe size={100} /><p className="text-2xl font-bold">Intelligence feed ready. Search for strategic global updates.</p></div>
        )}
      </div>
    </div>
  );

  const renderAdvisor = () => (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-slate-800/50 rounded-3xl border border-slate-700/50 overflow-hidden shadow-xl">
      <div className="p-6 border-b border-slate-700/50 bg-slate-900/40 flex flex-col gap-6">
        <div className="flex justify-between items-center"><h2 className="font-bold text-white flex items-center gap-3"><ShieldAlert className="text-blue-400" size={24} /> Executive Advisor</h2><button onClick={() => setShowKbModal(true)} className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-4 py-2 rounded-xl uppercase tracking-widest border border-blue-400/20">Archive</button></div>
        <div className="flex gap-2 p-1 bg-slate-900/60 rounded-2xl border border-slate-800 w-fit">
          <button onClick={() => setAdvisorViewMode('CHAT')} className={`px-6 py-2 rounded-xl font-bold text-xs ${advisorViewMode === 'CHAT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Direct Consult</button>
          <button onClick={() => setAdvisorViewMode('PINNED')} className={`px-6 py-2 rounded-xl font-bold text-xs flex items-center gap-2 ${advisorViewMode === 'PINNED' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Briefs {messages.filter(m => m.isPinned).length > 0 && <span className="bg-slate-900/50 px-1.5 py-0.5 rounded text-[10px]">{messages.filter(m => m.isPinned).length}</span>}</button>
        </div>
      </div>
      {advisorViewMode === 'CHAT' ? (
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`group relative max-w-[85%] p-5 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700 shadow-sm'}`}>
                  {msg.role === 'model' && <button onClick={() => togglePinMessage(msg.id)} className={`absolute -right-8 top-0 p-2 transition-all opacity-0 group-hover:opacity-100 ${msg.isPinned ? 'text-yellow-400 opacity-100' : 'text-slate-600'}`}>{msg.isPinned ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button>}
                  <MarkdownRenderer content={msg.text} />
                </div>
              </div>
            ))}
            {isAdvisorThinking && <div className="flex gap-2 p-4 bg-slate-800 rounded-xl w-fit animate-pulse border border-slate-700/50"><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div></div>}
            <div ref={chatEndRef} />
          </div>
          <div className="p-6 border-t border-slate-700/50 flex gap-3 bg-slate-900/20">
            <input disabled={isOfflineMode} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Consult with Advisor..." className="flex-1 bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner text-sm sm:text-base" />
            <button onClick={handleSendMessage} disabled={!inputMessage.trim() || isAdvisorThinking || isOfflineMode} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95"><Send size={24} /></button>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
          {messages.filter(m => m.isPinned).map(msg => (
            <div key={msg.id} className="bg-[#1b2537] rounded-[2rem] border border-slate-700/50 overflow-hidden shadow-lg p-8">
              <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-bold text-white flex items-center gap-2"><Pin size={16} className="text-yellow-400" /> Strategic Intelligence Brief</h3><ShareButton content={msg.text} title="Secured Executive Brief" /></div>
              <MarkdownRenderer content={msg.text} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- Main Render ---

  if (appState === 'SPLASH') return <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-8 z-[100]"><AntiRiskLogo className="w-32 h-32 mb-12 animate-pulse" light={true} /><div className="w-full max-w-xs space-y-6 text-center"><div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600 shadow-[0_0_15px_#2563eb] transition-all" style={{ width: `${splashProgress}%` }}></div></div><p className="text-[10px] font-black text-blue-400 tracking-[0.4em] uppercase">Synchronizing Vault Assets...</p></div></div>;
  if (appState === 'PIN_ENTRY' || appState === 'PIN_SETUP') return <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-6 z-[100]"><AntiRiskLogo className="w-20 h-20 mb-8" /><h2 className="text-2xl font-bold text-white mb-4 tracking-tight">{appState === 'PIN_SETUP' ? 'Initialize Executive PIN' : 'Access Vault'}</h2><div className="flex gap-5 mb-8">{[...Array(4)].map((_, i) => <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pinInput.length > i ? (isPinError ? 'bg-red-500 border-red-500' : 'bg-blue-500 border-blue-500 shadow-[0_0_10px_#3b82f6]') : 'border-slate-800'}`} />)}</div><div className="grid grid-cols-3 gap-5 w-full max-w-xs mb-10">{[1,2,3,4,5,6,7,8,9,0].map(num => <button key={num} onClick={() => handlePinDigit(num.toString())} className="aspect-square bg-slate-800/30 border border-slate-800/50 rounded-2xl text-2xl font-bold text-white active:scale-90 transition-all shadow-inner hover:bg-slate-800/60 flex items-center justify-center">{num}</button>)}<button onClick={() => setPinInput('')} className="aspect-square bg-slate-800/30 border border-slate-800/50 rounded-2xl flex items-center justify-center text-red-500"><Trash2 size={24} /></button></div></div>;

  return (
    <div className="flex min-h-screen bg-[#0a0f1a] text-slate-100">
      <Navigation currentView={currentView} setView={setCurrentView} isMobileMenuOpen={isMobileMenuOpen} closeMobileMenu={() => setIsMobileMenuOpen(false)} onOpenSettings={() => setShowSettings(true)} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="lg:hidden p-4 sm:p-6 border-b border-slate-800/40 flex justify-between items-center bg-[#0a0f1a]/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3"><AntiRiskLogo className="w-8 h-8" /><h1 className="font-bold text-xl sm:text-2xl text-white">AntiRisk</h1></div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white bg-slate-800/50 rounded-xl"><Menu size={28} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 scrollbar-hide">
          {apiError && <div className="max-w-4xl mx-auto mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in slide-in-from-top"><div className="flex items-center gap-4"><ShieldAlert className="text-red-500 shrink-0" size={24} /><p className="text-red-200 font-bold text-xs sm:text-sm">{apiError}</p></div><button onClick={() => setApiError(null)} className="text-slate-500 hover:text-white"><X size={20}/></button></div>}
          {currentView === View.DASHBOARD && renderDashboard()}
          {currentView === View.TRAINING && renderTrainingView()}
          {currentView === View.ADVISOR && renderAdvisor()}
          {currentView === View.BEST_PRACTICES && renderBestPractices()}
          {currentView === View.NEWS_BLOG && (
            <div className="flex flex-col max-w-5xl mx-auto w-full space-y-8 animate-in fade-in">
              <div className="bg-[#1b2537] p-10 rounded-[2.5rem] border border-slate-700/50 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <h2 className="text-3xl font-black text-white flex items-center justify-center md:justify-start gap-4"><Newspaper className="text-blue-400" size={36} /> CEO News Blog</h2>
                  <p className="text-slate-400 text-lg font-medium">Daily briefings from NSCDC, NIMASA, and ISO regulatory boards.</p>
                </div>
                <button onClick={handleLoadNews} disabled={isNewsLoading} className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-2xl font-bold text-white shadow-xl">
                  {isNewsLoading ? <RefreshCw className="animate-spin" size={20} /> : <RefreshCw size={20} />} Sync Intel
                </button>
              </div>
              <div className="bg-[#1b2537] rounded-[2.5rem] border border-slate-700/50 overflow-hidden shadow-xl min-h-[400px]">
                {newsBlog ? <div className="p-10"><MarkdownRenderer content={newsBlog.text} /></div> : <div className="flex-1 flex flex-col items-center justify-center py-40 opacity-20"><Target size={100} /><p className="text-2xl font-bold">operational brief inactive. Sync to start.</p></div>}
              </div>
            </div>
          )}
          {currentView === View.REPORT_ANALYZER && (
            <div className="flex flex-col h-full max-w-6xl mx-auto space-y-6">
              <div className="flex gap-2 p-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 w-fit mx-auto">
                <button onClick={() => setAnalyzerTab('DAILY')} className={`px-10 py-3.5 rounded-xl font-bold transition-all text-sm ${analyzerTab === 'DAILY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Shift Analysis</button>
                <button onClick={() => setAnalyzerTab('PATROL')} className={`px-10 py-3.5 rounded-xl font-bold transition-all text-sm ${analyzerTab === 'PATROL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Patrol Strategy</button>
              </div>
              <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-6 min-h-0">
                <div className="bg-[#1b2537] p-8 rounded-[2rem] border border-slate-700/50 flex flex-col shadow-xl">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><FileText className="text-blue-400" /> Dispatch Log Intake</h3>
                  {analyzerTab === 'DAILY' ? (
                    <>
                      <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} className="flex-1 bg-slate-900/50 border border-slate-700 rounded-2xl p-6 text-white focus:outline-none resize-none shadow-inner" placeholder="Paste logs for pattern analysis..." />
                      <button onClick={handleAnalyzeReport} disabled={isAnalyzing || !reportText} className="mt-6 bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl font-bold text-white shadow-xl active:scale-95 transition-all text-lg">{isAnalyzing ? 'Extracting Patterns...' : 'Audit Log Analysis'}</button>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col gap-6">
                      <IncidentChart reports={storedReports} />
                      <button onClick={handleAnalyzePatrols} className="w-full bg-blue-600 py-5 rounded-2xl font-bold text-white shadow-xl active:scale-95 transition-all text-lg">Optimize Patrol Routes</button>
                    </div>
                  )}
                </div>
                <div className="bg-[#1b2537] rounded-[2rem] border border-slate-700/50 overflow-hidden flex flex-col shadow-2xl min-h-[400px]">
                  <div className="p-6 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center"><h3 className="font-bold text-white flex items-center gap-3"><Sparkles className="text-blue-400" size={18} /> Strategic Audit Assessment</h3>{analysisResult && <ShareButton content={analysisResult} title="Security Log Audit" />}</div>
                  <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">{analysisResult ? <MarkdownRenderer content={analysisResult} /> : <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-20 text-center gap-4 py-20"><ShieldCheck size={80} /><p className="text-xl font-bold italic">Audit Briefs will appear here.</p></div>}</div>
                </div>
              </div>
            </div>
          )}
          {currentView === View.WEEKLY_TIPS && (
             <div className="max-w-4xl mx-auto space-y-6 h-full flex flex-col">
               <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-800/40 p-8 rounded-[3rem] border border-slate-700/50 shadow-xl gap-6">
                 <div><h2 className="text-3xl font-black text-white mb-2">Weekly Directives</h2><p className="text-slate-400 font-medium">Strategic briefings for tactical deployment.</p></div>
                 <button onClick={handleGenerateWeeklyTip} disabled={isTipLoading} className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 px-6 py-4 rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"><Plus /> New Directive</button>
               </div>
               <div className="flex-1 overflow-y-auto bg-slate-800/40 rounded-[3rem] border border-slate-700/50 p-10 shadow-inner scrollbar-hide">
                 {weeklyTips[0] ? <div className="animate-in fade-in slide-in-from-bottom-4 duration-700"><MarkdownRenderer content={weeklyTips[0].content} /></div> : <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-20 text-center gap-8 py-20"><Lightbulb size={120} strokeWidth={1} /><p className="text-2xl font-bold">No strategic directives in vault.</p></div>}
               </div>
             </div>
          )}
          {currentView === View.TOOLKIT && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-[#1b2537] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-lg">
                <div className="flex items-center gap-4"><Briefcase size={36} className="text-blue-400" /><div><h2 className="text-3xl font-black text-white">Operations Vault</h2><p className="text-slate-400">Tactical SOPs and deployment checklists.</p></div></div>
                <div className="flex gap-4 w-full md:w-auto">
                  <div className="relative flex-1 sm:w-64"><input value={toolkitSearch} onChange={(e) => setToolkitSearch(e.target.value)} placeholder="Search..." className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-3 text-white focus:border-blue-500" /><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} /></div>
                  <button onClick={() => setShowSopModal(true)} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl font-bold text-white shadow-xl flex items-center gap-2"><Plus size={18} /> SOP</button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {[...STATIC_TEMPLATES, ...customSops].filter(s => s.title.toLowerCase().includes(toolkitSearch.toLowerCase())).map(sop => (
                  <div key={sop.id} className="bg-[#1b2537] rounded-3xl border border-slate-700/40 p-6 flex flex-col gap-4 shadow-md group hover:border-blue-500/30 transition-all">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400"><FileText size={24} /></div>
                    <div><h3 className="text-xl font-bold text-white mb-1">{sop.title}</h3><p className="text-sm text-slate-400 line-clamp-2">{sop.description}</p></div>
                    <button onClick={() => { navigator.clipboard.writeText(sop.content); alert('Template copied.'); }} className="mt-2 w-full bg-slate-800/60 py-3 rounded-xl font-bold text-slate-300 border border-slate-700 hover:bg-slate-800 transition-all">Copy Plain Text</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* --- Modals --- */}
        {showKbModal && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in"><div className="bg-[#1b2537] rounded-[3rem] border border-slate-700/50 p-10 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-black text-white flex items-center gap-4"><Database className="text-blue-400" /> Policy Archive</h2><button onClick={() => setShowKbModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={28}/></button></div><div className="space-y-6"><input value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} placeholder="Directive Title..." className="w-full bg-slate-900/50 border border-slate-700/50 p-5 rounded-2xl outline-none text-white focus:border-blue-500 text-lg font-bold" /><textarea value={newDocContent} onChange={(e) => setNewDocContent(e.target.value)} placeholder="Content..." className="w-full bg-slate-900/50 border border-slate-700/50 p-6 rounded-2xl h-64 outline-none resize-none text-white focus:border-blue-500 text-lg" /><button onClick={handleAddKbDocument} className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 rounded-2xl font-bold text-xl active:scale-95 transition-all text-white">Ingest to Core Vault</button></div></div></div>}
        {showSopModal && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in"><div className="bg-[#1b2537] rounded-[3rem] border border-slate-700/50 p-10 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"><div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-black text-white flex items-center gap-4"><Briefcase className="text-blue-400" /> SOP Ingestion</h2><button onClick={() => setShowSopModal(false)} className="p-2 text-slate-500 hover:text-white"><X size={28}/></button></div><div className="space-y-6"><button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center gap-3 p-8 border-2 border-dashed border-slate-700 rounded-3xl bg-slate-900/40 hover:border-blue-500/50 text-slate-400"><FileUp size={40} /><span className="text-sm font-bold uppercase tracking-widest">Select Schema</span><input ref={fileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} /></button><div className="space-y-4"><input value={newSopTitle} onChange={(e) => setNewSopTitle(e.target.value)} placeholder="Title..." className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:border-blue-500 font-bold" /><textarea value={newSopContent} onChange={(e) => setNewSopContent(e.target.value)} placeholder="Full content..." className="w-full bg-slate-900/50 border border-slate-700 p-6 rounded-2xl h-48 outline-none resize-none text-white focus:border-blue-500" /></div><button onClick={handleAddCustomSop} disabled={!newSopTitle || !newSopContent} className="w-full bg-blue-600 py-5 rounded-2xl font-bold text-xl shadow-xl text-white">Secure to Vault</button></div></div></div>}
        {showSettings && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in"><div className="bg-[#1b2537] rounded-[3rem] border border-slate-700/50 p-10 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[95vh]"><div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black text-white flex items-center gap-4"><User className="text-blue-400" /> CEO Profile</h2><button onClick={() => setShowSettings(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={28}/></button></div><div className="space-y-6"><div className="grid grid-cols-1 gap-6"><div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Name</label><input value={userProfile.name} onChange={(e) => setUserProfile({...userProfile, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-5 py-3.5 text-white focus:border-blue-500 font-bold" /></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label><input value={userProfile.phoneNumber} onChange={(e) => setUserProfile({...userProfile, phoneNumber: e.target.value})} placeholder="+234..." className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-5 py-3.5 text-white focus:border-blue-500 font-bold" /></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label><input value={userProfile.email} onChange={(e) => setUserProfile({...userProfile, email: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-5 py-3.5 text-white focus:border-blue-500 font-bold" /></div></div><button onClick={() => { setShowSettings(false); alert('Profile updated.'); }} className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold text-lg shadow-xl text-white mt-4">Sync Profile</button></div></div></div>}
        {showNewTipAlert && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in"><div className="bg-[#1b2537] rounded-[2rem] sm:rounded-[3.5rem] border border-yellow-500/30 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"><div className="p-6 sm:p-8 border-b border-slate-800/60 bg-slate-900/40 flex justify-between items-center"><div className="flex items-center gap-3 sm:gap-4"><div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center shadow-lg"><Bell size={20} sm:size={24} className="text-yellow-400 animate-pulse" /></div><div><h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">Direct Brief</h2><p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol Engaged</p></div></div><button onClick={() => setShowNewTipAlert(null)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={24} /></button></div><div className="flex-1 overflow-y-auto p-6 sm:p-10 scrollbar-hide bg-slate-900/10"><MarkdownRenderer content={showNewTipAlert.content} /></div><div className="p-6 sm:p-8 border-t border-slate-800/60 bg-slate-900/40 flex flex-col sm:flex-row gap-3"><button onClick={() => { setShowNewTipAlert(null); setCurrentView(View.WEEKLY_TIPS); }} className="w-full sm:flex-1 bg-slate-800 hover:bg-slate-700 py-3.5 rounded-xl font-bold text-slate-200 transition-all border border-slate-700">Archive</button><div className="w-full sm:flex-1"><ShareButton content={showNewTipAlert.content} title={showNewTipAlert.topic} view={View.WEEKLY_TIPS} id={showNewTipAlert.id} triggerClassName="w-full flex items-center justify-center gap-3 bg-[#2563eb] hover:bg-blue-600 text-white py-3.5 rounded-xl transition-all font-bold text-sm sm:text-lg shadow-lg active:scale-95" /></div></div></div></div>}
      </main>
    </div>
  );
}

export default App;
