
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, Send, Plus, Search, RefreshCw, Download, FileText, ChevronRight, ShieldAlert, BookOpen, Globe, Briefcase, Calendar, ChevronLeft, Save, Trash2, Check, Lightbulb, Printer, Settings as SettingsIcon, MessageCircle, Mail, X, Bell, Database, Upload, Pin, PinOff, BarChart2, Sparkles, Copy, Lock, ShieldCheck, Fingerprint, Eye, Paperclip, XCircle, Bookmark, BookmarkCheck, LayoutGrid, ListFilter, Wand2, Map, ExternalLink, ImageIcon, Target, User, Phone, FileUp, Key, AlertTriangle, EyeIcon, CloudDownload, WifiOff, Newspaper, Zap, Activity, CheckCircle2, ArrowUpDown, History, Clock, Eraser } from 'lucide-react';
import Navigation from './components/Navigation.tsx';
import MarkdownRenderer from './components/MarkdownRenderer.tsx';
import ShareButton from './components/ShareButton.tsx';
import IncidentChart from './components/IncidentChart.tsx';
import { View, ChatMessage, Template, SecurityRole, StoredReport, WeeklyTip, UserProfile, KnowledgeDocument, SavedTrend, StoredTrainingModule, NewsItem, ChatSession } from './types.ts';
import { STATIC_TEMPLATES, SECURITY_TRAINING_DB } from './constants.ts';
import { generateAdvisorResponseStream, generateTrainingModule, analyzeReport, fetchBestPractices, generateWeeklyTip, fetchTopicSuggestions, fetchSecurityNews, analyzePatrolPatterns } from './services/geminiService.ts';

const AntiRiskLogo = ({ className = "w-10 h-10", light = false }: { className?: string; light?: boolean }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5 L95 85 L5 85 Z" fill={light ? "#ffffff" : "#000000"} />
    <path d="M5 L85 L25 85 L15 65 Z" fill="#dc2626" />
    <path d="M95 85 L75 85 L85 65 Z" fill="#dc2626" />
    <circle cx="50" cy="55" r="30" fill={light ? "#0a0f1a" : "white"} />
    <text x="50" y="68" fontFamily="Arial, sans-serif" fontSize="38" fontWeight="bold" fill={light ? "white" : "black"} textAnchor="middle">AR</text>
    <rect x="0" y="85" width="100" height="15" fill={light ? "#ffffff" : "#000"} />
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
  const [tipsSortOrder, setTipsSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => setIsOfflineMode(!navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('security_app_profile');
    return saved ? JSON.parse(saved) : { name: 'Executive Director', phoneNumber: '', email: '', preferredChannel: 'WhatsApp' };
  });

  // Chat History & Session State
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('security_app_sessions');
    if (saved) return JSON.parse(saved);
    
    // Default initial session
    const initialSession: ChatSession = {
      id: 'default',
      title: 'Initial Command Brief',
      messages: [{
        id: 'welcome',
        role: 'model',
        text: `Hello CEO ${userProfile.name ? userProfile.name : ''}. I am your Command Assistant. I am ready to assist with general tasks or provide strategic security counsel. How may I advise you today?`,
        timestamp: Date.now()
      }],
      lastTimestamp: Date.now(),
      dateStr: new Date().toLocaleDateString()
    };
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => chatSessions[0]?.id || 'default');
  
  const activeSession = useMemo(() => 
    chatSessions.find(s => s.id === activeSessionId) || chatSessions[0], 
  [chatSessions, activeSessionId]);

  const messages = activeSession?.messages || [];

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

  const [customSops, setCustomSops] = useState<Template[]>(() => {
    const saved = localStorage.getItem('security_app_custom_sops');
    return saved ? JSON.parse(saved) : [];
  });

  // Derived State
  const archivedTips = useMemo(() => {
    const archive = weeklyTips.slice(1);
    return [...archive].sort((a, b) => {
      if (tipsSortOrder === 'NEWEST') return b.timestamp - a.timestamp;
      return a.timestamp - b.timestamp;
    });
  }, [weeklyTips, tipsSortOrder]);

  const [inputMessage, setInputMessage] = useState('');
  const [isAdvisorThinking, setIsAdvisorThinking] = useState(false);
  const [advisorViewMode, setAdvisorViewMode] = useState<'CHAT' | 'PINNED' | 'HISTORY'>('CHAT');
  const [showKbModal, setShowKbModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [showSopModal, setShowSopModal] = useState(false);
  const [newSopTitle, setNewSopTitle] = useState('');
  const [newSopDesc, setNewSopDesc] = useState('');
  const [newSopContent, setNewSopContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auditFileInputRef = useRef<HTMLInputElement>(null);

  const [trainingTopic, setTrainingTopic] = useState('');
  const [weeklyTipTopic, setWeeklyTipTopic] = useState('');
  const [trainingWeek, setTrainingWeek] = useState<number>(1);
  const [trainingRole, setTrainingRole] = useState<SecurityRole>(SecurityRole.GUARD);
  const [trainingContent, setTrainingContent] = useState('');
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);
  
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showTrainingSuggestions, setShowTrainingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [toolkitTab, setToolkitTab] = useState<'TEMPLATES' | 'AUDIT'>('TEMPLATES');
  const [reportText, setReportText] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzerTab, setAnalyzerTab] = useState<'DAILY' | 'PATROL' | 'INCIDENT'>('DAILY');
  const [bpTopic, setBpTopic] = useState('');
  const [bpContent, setBpContent] = useState<{ text: string; sources?: Array<{ title: string; url: string }> } | null>(null);
  const [isBpLoading, setIsBpLoading] = useState(false);
  const [isTipLoading, setIsTipLoading] = useState(false);
  const [toolkitSearch, setToolkitSearch] = useState('');
  const [newsBlog, setNewsBlog] = useState<{ text: string; sources?: Array<{ title: string; url: string }> } | null>(null);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('security_app_profile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { 
    localStorage.setItem('security_app_sessions', JSON.stringify(chatSessions)); 
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chatSessions]);
  useEffect(() => { localStorage.setItem('security_app_reports', JSON.stringify(storedReports)); }, [storedReports]);
  useEffect(() => { localStorage.setItem('security_app_weekly_tips', JSON.stringify(weeklyTips)); }, [weeklyTips]);
  useEffect(() => { localStorage.setItem('security_app_kb', JSON.stringify(knowledgeBase)); }, [knowledgeBase]);
  useEffect(() => { localStorage.setItem('security_app_custom_sops', JSON.stringify(customSops)); }, [customSops]);

  useEffect(() => {
    if (appState === 'READY' && !isOfflineMode) {
      const syncIntelligence = async () => {
        try {
          setIsNewsLoading(true);
          setIsBpLoading(true);
          const [news, trends] = await Promise.all([
            fetchSecurityNews(),
            fetchBestPractices()
          ]);
          setNewsBlog(news);
          setBpContent(trends);
        } catch (err) {
          console.error("Sync failed", err);
        } finally {
          setIsNewsLoading(false);
          setIsBpLoading(false);
        }
      };
      syncIntelligence();

      const lastTip = weeklyTips[0];
      const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
      if (!lastTip || (Date.now() - lastTip.timestamp > oneWeekInMs)) {
        handleGenerateWeeklyTip();
      }
    }
  }, [appState]);

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
    const errorMessage = error?.message || "Internal error calling the Gemini API.";
    setApiError(`Operational Hub Failure: ${errorMessage}. Please check your internet connection or API key status.`);
  };

  const handleStartNewConsult = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Command Brief',
      messages: [{
        id: Date.now().toString(),
        role: 'model',
        text: "Command Assistant ready. What is your request, CEO?",
        timestamp: Date.now()
      }],
      lastTimestamp: Date.now(),
      dateStr: new Date().toLocaleDateString()
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setAdvisorViewMode('CHAT');
  };

  const handleDeleteMessage = (messageId: string) => {
    setChatSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const remainingMessages = s.messages.filter(m => m.id !== messageId);
        // If all messages deleted, reset to welcome
        if (remainingMessages.length === 0) {
          return {
            ...s,
            messages: [{
              id: 'welcome-' + Date.now(),
              role: 'model',
              text: "Assistant ready for new strategic counsel.",
              timestamp: Date.now()
            }]
          };
        }
        return { ...s, messages: remainingMessages };
      }
      return s;
    }));
  };

  const handleClearCurrentChat = () => {
    if (messages.length <= 1) return;
    if (!window.confirm("Clear all messages on this screen?")) return;
    setChatSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [{
            id: 'cleared-' + Date.now(),
            role: 'model',
            text: "Chat cleared. Assistant ready for new strategic counsel.",
            timestamp: Date.now()
          }]
        };
      }
      return s;
    }));
  };

  const handleWipeAllHistory = () => {
    if (!window.confirm("CRITICAL: Wipe ALL archived strategic history from this vault? This action cannot be undone.")) return;
    
    const initialSession: ChatSession = {
      id: 'default-' + Date.now(),
      title: 'Initial Command Brief',
      messages: [{
        id: 'welcome-' + Date.now(),
        role: 'model',
        text: `Command vault wiped and reset. All previous strategic threads purged. How may I assist you today, CEO?`,
        timestamp: Date.now()
      }],
      lastTimestamp: Date.now(),
      dateStr: new Date().toLocaleDateString()
    };
    
    setChatSessions([initialSession]);
    setActiveSessionId(initialSession.id);
    setAdvisorViewMode('CHAT');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isOfflineMode) return;
    setApiError(null);
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputMessage, timestamp: Date.now() };
    
    // Update local state and sessions
    setChatSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        // Update title if it's still the default and this is the first user message
        const newTitle = (s.title === 'New Command Brief' || s.title === 'Initial Command Brief') 
          ? (inputMessage.length > 30 ? inputMessage.substring(0, 30) + '...' : inputMessage)
          : s.title;
        return { 
          ...s, 
          messages: [...s.messages, userMsg], 
          lastTimestamp: Date.now(),
          title: newTitle
        };
      }
      return s;
    }));

    setInputMessage('');
    setIsAdvisorThinking(true);

    const aiMsgId = (Date.now() + 1).toString() + 'ai';
    const initialAiMsg: ChatMessage = { id: aiMsgId, role: 'model', text: '', timestamp: Date.now(), isPinned: false };
    
    setChatSessions(prev => prev.map(s => 
      s.id === activeSessionId ? { ...s, messages: [...s.messages, initialAiMsg] } : s
    ));

    try {
      let fullText = "";
      const stream = generateAdvisorResponseStream(messages, inputMessage, knowledgeBase);
      for await (const chunk of stream) {
        if (fullText === "" && chunk !== "") {
          setIsAdvisorThinking(false);
        }
        fullText += chunk;
        setChatSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m)
            };
          }
          return s;
        }));
      }
    } catch (err: any) { 
      handleError(err); 
      setIsAdvisorThinking(false); 
      setChatSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { ...s, messages: s.messages.filter(m => m.id !== aiMsgId) } : s
      ));
    } finally { 
      setIsAdvisorThinking(false); 
    }
  };

  const togglePinMessage = (messageId: string) => {
    setChatSessions(prev => prev.map(s => ({
      ...s,
      messages: s.messages.map(m => m.id === messageId ? { ...m, isPinned: !m.isPinned } : m)
    })));
  };

  const deleteSession = (sessionId: string) => {
    if (chatSessions.length <= 1) return;
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(chatSessions.find(s => s.id !== sessionId)?.id || '');
    }
  };

  const handleAnalyzeReport = async () => {
    if (!reportText || isOfflineMode) return;
    setApiError(null); setIsAnalyzing(true);
    try {
      const auditType = analyzerTab === 'INCIDENT' ? 'INCIDENT' : (analyzerTab === 'PATROL' ? 'PATROL' : 'SHIFT');
      const result = await analyzeReport(reportText, auditType);
      setAnalysisResult(result);
      setStoredReports(prev => [{ id: Date.now().toString(), timestamp: Date.now(), dateStr: new Date().toLocaleDateString(), content: reportText, analysis: result }, ...prev]);
    } catch (err: any) { handleError(err); } finally { setIsAnalyzing(false); }
  };

  const handleFetchBP = async () => {
    if (isOfflineMode) return;
    setApiError(null); setIsBpLoading(true);
    try {
      const result = await fetchBestPractices(bpTopic);
      setBpContent(result);
    } catch (err: any) { handleError(err); } finally { setIsBpLoading(false); }
  };

  const handleGenerateTraining = async () => {
    if (!trainingTopic || isOfflineMode) return;
    setApiError(null); setIsTrainingLoading(true);
    try {
      const result = await generateTrainingModule(trainingTopic, trainingWeek, trainingRole);
      setTrainingContent(result.text);
    } catch (err: any) { handleError(err); } finally { setIsTrainingLoading(false); }
  };

  const handleGenerateWeeklyTip = async () => {
    if (isOfflineMode) return;
    setApiError(null); setIsTipLoading(true);
    try {
      const content = await generateWeeklyTip(weeklyTips, weeklyTipTopic);
      const newTip: WeeklyTip = { 
        id: Date.now().toString(), 
        timestamp: Date.now(), 
        weekDate: new Date().toLocaleDateString(), 
        topic: weeklyTipTopic || "Weekly Strategic Focus", 
        content, 
        isAutoGenerated: !weeklyTipTopic 
      };
      setWeeklyTips(prev => [newTip, ...prev]);
      setShowNewTipAlert(newTip);
      setWeeklyTipTopic(''); 
    } catch (err: any) { handleError(err); } finally { setIsTipLoading(false); }
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

  const handleAuditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setReportText(event.target?.result as string);
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setNewSopContent(event.target?.result as string);
    reader.readAsText(file);
  };

  const formatMessageTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDayLabel = (ts: number) => {
    const date = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const renderDashboard = () => {
    const menuItems = [
      { id: View.ADVISOR, label: 'AI Executive Assistant', desc: 'Direct assistant for any query or counsel.', icon: ShieldAlert, color: 'text-blue-400', bg: 'bg-blue-400/10' },
      { id: View.NEWS_BLOG, label: 'Security News Blog', desc: 'NSCDC, NIMASA & regulatory updates.', icon: Newspaper, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
      { id: View.TRAINING, label: 'Training Builder', desc: 'Audit 10-Million+ Topic database.', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-400/10' },
      { id: View.WEEKLY_TIPS, label: 'Weekly Tips', desc: 'Automated weekly curriculum for guards.', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
      { id: View.TOOLKIT, label: 'Ops Vault (SOPs)', desc: 'Tactical SOPs and Audit Intelligence.', icon: Briefcase, color: 'text-amber-400', bg: 'bg-amber-400/10', subTab: 'TEMPLATES' },
      { id: View.TOOLKIT, label: 'Risk & Audit Log', desc: 'Identify vulnerabilities & gaps.', icon: Fingerprint, color: 'text-red-400', bg: 'bg-red-400/10', subTab: 'AUDIT' },
      { id: View.BEST_PRACTICES, label: 'Global Trends', desc: 'ISO standards and market shifts.', icon: Globe, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
      { id: 'CEO_PROFILE', label: 'CEO Profile', desc: 'Manage identity and sync channels.', icon: User, color: 'text-slate-400', bg: 'bg-slate-400/10' }
    ];

    return (
      <div className="space-y-10 max-w-6xl mx-auto pb-20 animate-in fade-in duration-700">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#122b6a] via-[#1a3a8a] to-[#0a1222] border border-blue-500/20 rounded-[3rem] p-10 sm:p-16 text-white shadow-2xl group">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
            <div className="space-y-6 max-w-xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 rounded-full border border-blue-400/30 text-blue-300 text-[10px] font-black uppercase tracking-widest">
                <Activity size={12} className="animate-pulse" /> Operational Command Active
              </div>
              <h2 className="text-4xl sm:text-6xl font-black mb-4 tracking-tighter leading-tight">Executive Control <br/><span className="text-blue-400">Hub</span></h2>
              <p className="text-blue-100/70 text-lg sm:text-xl font-medium leading-relaxed">Secure access to over 10-Million training vibrations and high-fidelity CEO tactical intelligence.</p>
            </div>
            <div className="flex flex-col gap-4 w-full md:w-auto">
              <button onClick={() => setCurrentView(View.ADVISOR)} className="px-10 py-5 bg-white text-blue-900 rounded-2xl font-black text-lg hover:bg-blue-50 transition-all shadow-xl hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3">
                <Sparkles size={20} /> Strategic Consult
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Menu</h3>
            <span className="h-px flex-1 mx-6 bg-slate-800/60"></span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.id === 'CEO_PROFILE') setShowSettings(true);
                  else {
                    setCurrentView(item.id as View);
                    if (item.subTab) setToolkitTab(item.subTab as 'TEMPLATES' | 'AUDIT');
                  }
                }}
                className="group relative bg-[#1b2537] p-8 rounded-[2.5rem] border border-slate-700/40 hover:border-blue-500/50 hover:bg-slate-800 transition-all duration-300 shadow-lg"
              >
                <div className={`w-14 h-14 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center mb-6`}>
                  <item.icon size={28} />
                </div>
                <h3 className="text-xl font-black text-white mb-2 tracking-tight group-hover:text-blue-400">{item.label}</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed flex-1">{item.desc}</p>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                  Access Vault <ChevronRight size={12} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAdvisor = () => (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-slate-800/50 rounded-3xl border border-slate-700/50 overflow-hidden shadow-xl">
      <div className="p-6 border-b border-slate-700/50 bg-slate-900/40 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView(View.DASHBOARD)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h2 className="font-bold text-white flex items-center gap-3">
              <Sparkles className="text-blue-400" size={24} /> Executive Assistant
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {advisorViewMode === 'CHAT' && (
              <button onClick={handleClearCurrentChat} className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 text-slate-400 rounded-lg hover:text-red-400 transition-all group" title="Clear Screen">
                <Eraser size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Clear Screen</span>
              </button>
            )}
            <button onClick={handleStartNewConsult} className="p-2 bg-blue-600/10 text-blue-400 rounded-lg hover:bg-blue-600/20 transition-all" title="New Assistant Thread">
              <Plus size={20} />
            </button>
            <button onClick={() => setShowKbModal(true)} className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-4 py-2 rounded-xl uppercase tracking-widest border border-blue-400/20">Archive</button>
            <button onClick={() => setCurrentView(View.DASHBOARD)} className="p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex gap-2 p-1 bg-slate-900/60 rounded-2xl border border-slate-800 w-fit overflow-x-auto no-scrollbar">
          <button onClick={() => setAdvisorViewMode('CHAT')} className={`px-6 py-2 rounded-xl font-bold text-xs whitespace-nowrap ${advisorViewMode === 'CHAT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Command Chat</button>
          <button onClick={() => setAdvisorViewMode('HISTORY')} className={`px-6 py-2 rounded-xl font-bold text-xs whitespace-nowrap flex items-center gap-2 ${advisorViewMode === 'HISTORY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}><History size={14} /> History</button>
          <button onClick={() => setAdvisorViewMode('PINNED')} className={`px-6 py-2 rounded-xl font-bold text-xs whitespace-nowrap flex items-center gap-2 ${advisorViewMode === 'PINNED' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Briefs {chatSessions.flatMap(s => s.messages).filter(m => m.isPinned).length > 0 && <span className="bg-slate-900/50 px-1.5 py-0.5 rounded text-[10px]">{chatSessions.flatMap(s => s.messages).filter(m => m.isPinned).length}</span>}</button>
        </div>
      </div>
      
      {advisorViewMode === 'CHAT' ? (
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            {messages.map((msg, idx) => {
              const showDateHeader = idx === 0 || getDayLabel(msg.timestamp) !== getDayLabel(messages[idx-1].timestamp);
              
              return (
                <React.Fragment key={msg.id}>
                  {showDateHeader && (
                    <div className="flex items-center justify-center my-8">
                      <div className="h-px flex-1 bg-slate-800/50"></div>
                      <span className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{getDayLabel(msg.timestamp)}</span>
                      <div className="h-px flex-1 bg-slate-800/50"></div>
                    </div>
                  )}
                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`group relative max-w-[85%] p-5 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700 shadow-sm'}`}>
                      <div className="absolute -right-12 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {msg.role === 'model' && msg.text && (
                          <button onClick={() => togglePinMessage(msg.id)} className={`p-2 transition-all ${msg.isPinned ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-500'}`}>
                            {msg.isPinned ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                          </button>
                        )}
                        <button onClick={() => handleDeleteMessage(msg.id)} className="p-2 text-slate-600 hover:text-red-500 transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <MarkdownRenderer content={msg.text} />
                      <div className={`mt-2 flex items-center gap-1.5 text-[9px] font-bold ${msg.role === 'user' ? 'text-blue-100/60 justify-end' : 'text-slate-500 justify-start'}`}>
                        <Clock size={10} /> {formatMessageTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            {isAdvisorThinking && (
              <div className="flex flex-col items-start animate-pulse">
                <div className="bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-700 flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-6 border-t border-slate-700/50 flex gap-3 bg-slate-900/20">
            <input disabled={isOfflineMode || isAdvisorThinking} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Ask anything or request strategic counsel..." className="flex-1 bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner text-sm sm:text-base" />
            <button onClick={handleSendMessage} disabled={!inputMessage.trim() || isAdvisorThinking || isOfflineMode} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-4 rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95"><Send size={24} /></button>
          </div>
        </>
      ) : advisorViewMode === 'HISTORY' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Archived Conversations</h3>
            <button onClick={handleStartNewConsult} className="flex items-center gap-2 text-[10px] font-black text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-lg border border-blue-400/20 active:scale-95 transition-all">
              <Plus size={12} /> Start New
            </button>
          </div>
          <div className="space-y-3">
            {chatSessions.map(session => (
              <div 
                key={session.id} 
                className={`group flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${session.id === activeSessionId ? 'bg-blue-600/10 border-blue-500/50' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}
                onClick={() => { setActiveSessionId(session.id); setAdvisorViewMode('CHAT'); }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${session.id === activeSessionId ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <MessageCircle size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-bold truncate ${session.id === activeSessionId ? 'text-white' : 'text-slate-200'}`}>{session.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-500">{session.dateStr}</span>
                    <span className="text-[10px] font-medium text-slate-600">•</span>
                    <span className="text-[10px] font-bold text-slate-500">{session.messages.length} messages</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all text-slate-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-8 mt-6 border-t border-slate-800/60">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center mb-4">Danger Zone</h4>
            <button 
              onClick={handleWipeAllHistory}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500/10 transition-all active:scale-[0.98]"
            >
              <Trash2 size={16} /> Clear All Archives
            </button>
            <p className="text-[9px] text-slate-600 text-center mt-3 font-bold uppercase tracking-tighter">Warning: This action will permanently delete all strategic sessions.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
          {chatSessions.flatMap(s => s.messages).filter(m => m.isPinned).length > 0 ? (
            chatSessions.flatMap(s => s.messages).filter(m => m.isPinned).map(msg => (
              <div key={msg.id} className="bg-[#1b2537] rounded-[2rem] border border-slate-700/50 overflow-hidden shadow-lg p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2"><Pin size={16} className="text-yellow-400" /> Strategic Intelligence Brief</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{getDayLabel(msg.timestamp)}</span>
                    <ShareButton content={msg.text} title="Secured Executive Brief" />
                  </div>
                </div>
                <MarkdownRenderer content={msg.text} />
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-40 opacity-20 text-slate-600">
              <Bookmark size={80} strokeWidth={1} />
              <p className="text-xl font-bold mt-6 italic">No intel briefings pinned yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderWeeklyTips = () => {
    const isProfileIncomplete = !userProfile.email || !userProfile.phoneNumber;
    
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentView(View.DASHBOARD)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors -ml-2">
                <ChevronLeft size={24} />
              </button>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Lightbulb className="text-yellow-500" size={32} />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Weekly Training Tips</h2>
                <p className="text-slate-400 font-medium text-sm sm:text-base">Automated weekly curriculum for guards.</p>
              </div>
            </div>
            <button onClick={() => setCurrentView(View.DASHBOARD)} className="p-3 bg-slate-800/50 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              value={weeklyTipTopic}
              onChange={(e) => setWeeklyTipTopic(e.target.value)}
              placeholder="Specific Topic (Optional)" 
              className="flex-1 bg-slate-900/50 border border-slate-700/60 rounded-xl px-5 py-3 text-slate-100 focus:outline-none focus:border-yellow-500/50"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setWeeklyTipTopic('')}
                className="flex-1 sm:flex-none px-6 py-3 bg-slate-800 text-slate-400 font-bold rounded-xl hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                Clear
              </button>
              <button 
                onClick={handleGenerateWeeklyTip}
                disabled={isTipLoading}
                className="flex-1 sm:flex-none px-6 py-3 bg-[#d97706] hover:bg-yellow-600 text-white font-black rounded-xl shadow-lg shadow-yellow-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isTipLoading ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
                Generate New Week
              </button>
            </div>
          </div>
        </div>

        {isProfileIncomplete && (
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center justify-between p-4 bg-red-950/30 border border-red-900/30 rounded-2xl text-red-200 text-left hover:bg-red-950/40 transition-all"
          >
            <div className="flex items-center gap-4">
              <Bell size={20} className="text-red-500" />
              <p className="text-xs sm:text-sm font-bold">CEO Alert Profile Incomplete. Configure settings to receive automatic push notifications.</p>
            </div>
            <ChevronRight size={16} className="text-red-500" />
          </button>
        )}

        <div className="bg-[#1b2537] rounded-[2.5rem] border border-slate-700/40 shadow-2xl overflow-hidden">
          {weeklyTips.length > 0 ? (
            <div className="p-8 sm:p-12 space-y-10">
              <div className="flex justify-between items-center pb-8 border-b border-slate-800">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white">{weeklyTips[0].topic}</h3>
                  <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mt-1">Status: Operational</p>
                </div>
                <ShareButton content={weeklyTips[0].content} title={weeklyTips[0].topic} view={View.WEEKLY_TIPS} id={weeklyTips[0].id} />
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-4">
                <MarkdownRenderer content={weeklyTips[0].content} />
              </div>
              <div className="pt-10 flex gap-4">
                <button 
                  onClick={() => setCurrentView(View.DASHBOARD)}
                  className="flex-1 py-4 bg-slate-800 text-slate-300 font-bold rounded-2xl border border-slate-700 hover:bg-slate-700 transition-all"
                >
                  Return to Command
                </button>
              </div>
            </div>
          ) : (
            <div className="py-24 px-8 flex flex-col items-center justify-center text-center space-y-8 opacity-40">
              <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center">
                <Lightbulb size={64} className="text-slate-600" />
              </div>
              <div className="max-w-sm space-y-3">
                <h3 className="text-2xl font-black text-white">No Training Tips Generated Yet</h3>
                <p className="text-slate-400 font-medium">Start by generating this week's security focus. The AI will use global standards to create a complete briefing.</p>
              </div>
              <button 
                onClick={handleGenerateWeeklyTip}
                disabled={isTipLoading}
                className="px-10 py-5 bg-[#d97706] text-white font-black text-lg rounded-[2rem] shadow-2xl shadow-yellow-900/40 hover:scale-105 active:scale-95 transition-all"
              >
                {isTipLoading ? "Synchronizing..." : "Start Automation"}
              </button>
            </div>
          )}
        </div>

        <div className="bg-[#1b2537] rounded-[2rem] border border-slate-700/40 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-slate-500" />
              <h4 className="font-black text-white uppercase text-xs tracking-widest">Training Archive</h4>
            </div>
            
            {weeklyTips.length > 1 && (
              <button 
                onClick={() => setTipsSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border border-slate-800 rounded-lg text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-tighter"
              >
                <ArrowUpDown size={12} />
                {tipsSortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}
              </button>
            )}
          </div>
          <div className="p-8">
            {archivedTips.length > 0 ? (
              <div className="space-y-4">
                {archivedTips.map(tip => (
                  <button 
                    key={tip.id} 
                    onClick={() => setShowNewTipAlert(tip)}
                    className="w-full flex items-center justify-between p-5 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-yellow-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-yellow-500 transition-colors">
                          <FileText size={20} />
                       </div>
                       <div className="text-left">
                         <p className="text-white font-bold">{tip.topic}</p>
                         <p className="text-slate-500 text-xs font-medium">{tip.weekDate}</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-600 group-hover:text-yellow-500" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center py-10 text-slate-600 font-bold italic">Past trainings will appear here.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTrainingView = () => {
    const roles = [
      { id: SecurityRole.GUARD, label: 'Security Guard' },
      { id: SecurityRole.SUPERVISOR, label: 'Site Supervisor' },
      { id: SecurityRole.GEN_SUPERVISOR, label: 'General Supervisor' }
    ];
    const weeks = [1, 2, 3];

    return (
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 animate-in fade-in h-full pb-10">
        <div className="w-full lg:w-[380px] shrink-0">
          <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-8 shadow-2xl flex flex-col h-fit">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView(View.DASHBOARD)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors -ml-1">
                  <ChevronLeft size={20} />
                </button>
                <BookOpen className="text-emerald-400" size={24} />
                <h2 className="text-xl font-black text-white tracking-tight">Intel Engine</h2>
              </div>
              <button onClick={() => setCurrentView(View.DASHBOARD)} className="text-slate-500 hover:text-white transition-colors p-1 bg-slate-800/50 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10">Endless Database Enabled</p>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Domain Search</label>
                <div className="relative group">
                  <input 
                    value={trainingTopic} 
                    onChange={(e) => {
                      setTrainingTopic(e.target.value);
                      if (e.target.value.length > 2) {
                        setIsFetchingSuggestions(true);
                        fetchTopicSuggestions(e.target.value).then(s => {
                          setAiSuggestions(s);
                          setShowTrainingSuggestions(true);
                          setIsFetchingSuggestions(false);
                        });
                      }
                    }} 
                    placeholder="Search tactics..." 
                    className="w-full bg-[#1e293b]/50 border border-slate-700/50 group-hover:border-blue-500/50 rounded-xl px-5 py-4 text-white font-bold transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-blue-400 transition-colors" size={20} />
                  
                  {showTrainingSuggestions && aiSuggestions.length > 0 && (
                    <div ref={suggestionsRef} className="absolute z-20 top-full left-0 w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                      {aiSuggestions.map(s => (
                        <button key={s} onClick={() => { setTrainingTopic(s); setShowTrainingSuggestions(false); }} className="w-full text-left px-5 py-3 text-sm text-slate-300 hover:bg-blue-600 hover:text-white transition-colors border-b border-slate-800 last:border-0">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Training Week</label>
                <div className="flex bg-[#1e293b]/50 p-1.5 rounded-xl border border-slate-700/50">
                  {weeks.map(w => (
                    <button
                      key={w}
                      onClick={() => setTrainingWeek(w)}
                      className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${trainingWeek === w ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Week {w}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Focus Role</label>
                <div className="space-y-2">
                  {roles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => setTrainingRole(role.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        trainingRole === role.id 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                          : 'bg-[#1e293b]/30 border-slate-700/50 text-slate-500 hover:border-slate-600'
                      }`}
                    >
                      <span className="font-bold text-sm tracking-tight">{role.label}</span>
                      {trainingRole === role.id && <CheckCircle2 size={18} className="text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleGenerateTraining} 
                disabled={isTrainingLoading || !trainingTopic} 
                className="w-full bg-[#1e293b] hover:bg-slate-800 text-white border border-slate-700/50 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
              >
                {isTrainingLoading ? <RefreshCw className="animate-spin" size={16} /> : null}
                Build Domain
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 h-full min-h-[600px]">
          <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-full">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#1e293b]/20">
              <h3 className="font-black text-white flex items-center gap-3 tracking-widest text-xs uppercase">
                <ShieldCheck className="text-emerald-400" size={20} /> Tactical Brief
              </h3>
              {trainingContent && <ShareButton content={trainingContent} title={`Training Brief: ${trainingTopic}`} />}
            </div>
            <div className="flex-1 p-10 overflow-y-auto scrollbar-hide">
              {trainingContent ? (
                <div className="animate-in fade-in duration-700">
                  <MarkdownRenderer content={trainingContent} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-20 text-center gap-8 py-20">
                  <BookOpen size={100} strokeWidth={1} />
                  <p className="text-lg font-bold tracking-tight">Search for a tactical domain to<br/>deploy a briefing.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBestPractices = () => (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in pb-10">
      <div className="bg-[#1b2537] p-12 rounded-[3rem] border border-slate-700/50 shadow-xl flex flex-col md:flex-row justify-between items-center gap-10 relative">
        <button onClick={() => setCurrentView(View.DASHBOARD)} className="absolute top-6 right-6 p-3 bg-slate-800/50 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all">
          <X size={24} />
        </button>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView(View.DASHBOARD)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors -ml-2">
              <ChevronLeft size={28} />
            </button>
            <h2 className="text-4xl font-black text-white flex items-center gap-5"><Globe className="text-cyan-400" size={48} /> Global Trend Audit</h2>
          </div>
          <p className="text-slate-400 text-lg font-medium">Real-time ISO standards monitoring and market analysis.</p>
        </div>
        <div className="flex w-full md:w-auto gap-4">
           <input value={bpTopic} onChange={(e) => setBpTopic(e.target.value)} placeholder="Audit topic (e.g. ISO 18788)..." className="flex-1 md:w-80 bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:border-cyan-500 shadow-inner font-bold" />
           <button onClick={handleFetchBP} disabled={isBpLoading} className="bg-cyan-600 hover:bg-cyan-700 p-5 rounded-2xl text-white shadow-xl transition-all active:scale-95">{isBpLoading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={20} />}</button>
        </div>
      </div>
      <div className="bg-[#1b2537] rounded-[3rem] border border-slate-700/50 overflow-hidden shadow-2xl min-h-[500px]">
        <div className="p-8 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center"><h3 className="font-bold text-white flex items-center gap-3"><Activity className="text-cyan-400" /> Market Intelligence Brief</h3>{bpContent && <ShareButton content={bpContent.text} title="Global Security Trend Audit" />}</div>
        <div className="p-10">
          {bpContent ? (
            <div className="space-y-8">
              <MarkdownRenderer content={bpContent.text} />
              {bpContent.sources && bpContent.sources.length > 0 && (
                <div className="mt-12 pt-8 border-t border-slate-800">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Intelligence Sources</h4>
                  <div className="flex flex-wrap gap-3">
                    {bpContent.sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-blue-400 hover:bg-slate-800 transition-all"><ExternalLink size={12} /> {s.title || 'Source'}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-40 opacity-20 text-slate-600"><Globe size={100} /><p className="text-2xl font-bold mt-6 italic">Auditing global channels...</p></div>
          )}
        </div>
      </div>
    </div>
  );

  const renderToolkit = () => (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-[#1b2537] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-lg relative">
        <button onClick={() => setCurrentView(View.DASHBOARD)} className="absolute top-6 right-6 p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 rounded-xl transition-all">
          <X size={24} />
        </button>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentView(View.DASHBOARD)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors -ml-2">
            <ChevronLeft size={28} />
          </button>
          <Briefcase size={36} className="text-blue-400" />
          <div>
            <h2 className="text-3xl font-black text-white">Ops Vault</h2>
            <p className="text-slate-400">Tactical SOPs and Strategic Risk Audit.</p>
          </div>
        </div>
        <div className="flex gap-2 p-1 bg-slate-900/60 rounded-2xl border border-slate-800">
          <button onClick={() => setToolkitTab('TEMPLATES')} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${toolkitTab === 'TEMPLATES' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Templates</button>
          <button onClick={() => setToolkitTab('AUDIT')} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${toolkitTab === 'AUDIT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Audit & Risk</button>
        </div>
      </div>

      {toolkitTab === 'TEMPLATES' ? (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-[#1b2537]/50 p-6 rounded-[2rem] border border-slate-800/50">
            <div className="relative flex-1 w-full sm:w-64">
              <input value={toolkitSearch} onChange={(e) => setToolkitSearch(e.target.value)} placeholder="Search templates..." className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-3 text-white focus:border-blue-500" />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            </div>
            <button onClick={() => setShowSopModal(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-2"><Plus size={18} /> New SOP</button>
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
      ) : (
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row gap-4 p-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 w-full md:w-fit mx-auto">
            <button onClick={() => setAnalyzerTab('DAILY')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold transition-all text-xs ${analyzerTab === 'DAILY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>General Briefs</button>
            <button onClick={() => setAnalyzerTab('PATROL')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold transition-all text-xs ${analyzerTab === 'PATROL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Daily Patrol Audit</button>
            <button onClick={() => setAnalyzerTab('INCIDENT')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold transition-all text-xs ${analyzerTab === 'INCIDENT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>5Ws Incident Audit</button>
          </div>
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-6 min-h-0 pb-10">
            <div className="bg-[#1b2537] p-8 rounded-[2rem] border border-slate-700/50 flex flex-col shadow-xl">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white flex items-center gap-3"><ShieldAlert className="text-blue-400" /> Risk Log Intake</h3><div className="flex gap-2"><button onClick={() => auditFileInputRef.current?.click()} className="p-2 bg-slate-800 rounded-lg text-blue-400 hover:bg-slate-700 transition-colors"><Upload size={18} /></button><input ref={auditFileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleAuditFileUpload} /><button onClick={() => setReportText('')} className="p-2 bg-slate-800 rounded-lg text-red-400 hover:bg-slate-700 transition-colors"><Trash2 size={18} /></button></div></div>
              <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} className="w-full h-full bg-slate-900/50 border border-slate-700 rounded-2xl p-6 text-white focus:outline-none resize-none shadow-inner min-h-[350px] text-sm font-mono scrollbar-hide" placeholder="Paste guard logs or incident narratives here for strategic analysis..." />
              <button onClick={handleAnalyzeReport} disabled={isAnalyzing || !reportText} className="mt-6 bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl font-bold text-white shadow-xl active:scale-95 transition-all text-lg flex items-center justify-center gap-3">
                {isAnalyzing ? <RefreshCw className="animate-spin" /> : <Fingerprint />} Execute Risk Audit
              </button>
            </div>
            <div className="bg-[#1b2537] rounded-[2rem] border border-slate-700/50 overflow-hidden flex flex-col shadow-2xl min-h-[400px]">
              <div className="p-6 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-3">
                  <Sparkles className="text-emerald-400" size={18} /> 
                  CEO Strategic Insights
                </h3>
                {analysisResult && <ShareButton content={analysisResult} title="Strategic Security Audit Brief" />}
              </div>
              <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
                {analysisResult ? (
                  <div className="animate-in fade-in duration-700">
                    <MarkdownRenderer content={analysisResult} />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-20 text-center gap-6 py-20">
                    <ShieldCheck size={100} />
                    <p className="text-xl font-bold italic max-w-xs">Upload operational reports to extract ranked actionable intel.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (appState === 'SPLASH') return <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-8 z-[100]"><AntiRiskLogo className="w-32 h-32 mb-12 animate-pulse" light={true} /><div className="w-full max-w-xs space-y-6 text-center"><div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${splashProgress}%` }}></div></div><p className="text-[10px] font-black text-blue-400 tracking-[0.4em] uppercase">Initializing Operational Hub...</p></div></div>;
  if (appState === 'PIN_ENTRY' || appState === 'PIN_SETUP') return <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-6 z-[100]"><AntiRiskLogo className="w-20 h-20 mb-8" /><h2 className="text-2xl font-bold text-white mb-4 tracking-tight">{appState === 'PIN_SETUP' ? 'Initialize Executive PIN' : 'Access Vault'}</h2><div className="flex gap-5 mb-8">{[...Array(4)].map((_, i) => <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pinInput.length > i ? (isPinError ? 'bg-red-500 border-red-500' : 'bg-blue-500 border-blue-500') : 'border-slate-800'}`} />)}</div><div className="grid grid-cols-3 gap-5 w-full max-w-xs mb-10">{[1,2,3,4,5,6,7,8,9,0].map(num => <button key={num} onClick={() => handlePinDigit(num.toString())} className="aspect-square bg-slate-800/30 border border-slate-800/50 rounded-2xl text-2xl font-bold text-white active:scale-90 shadow-inner hover:bg-slate-800/60 flex items-center justify-center">{num}</button>)}<button onClick={() => setPinInput('')} className="aspect-square bg-slate-800/30 border border-slate-800/50 rounded-2xl flex items-center justify-center text-red-500"><Trash2 size={24} /></button></div></div>;

  return (
    <div className="flex min-h-screen bg-[#0a0f1a] text-slate-100 font-sans">
      <Navigation currentView={currentView} setView={setCurrentView} isMobileMenuOpen={isMobileMenuOpen} closeMobileMenu={() => setIsMobileMenuOpen(false)} onOpenSettings={() => setShowSettings(true)} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="lg:hidden p-4 sm:p-6 border-b border-slate-800/40 flex justify-between items-center bg-[#0a0f1a]/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3"><AntiRiskLogo className="w-8 h-8" /><h1 className="font-bold text-xl sm:text-2xl text-white tracking-tighter">AntiRisk</h1></div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white bg-slate-800/50 rounded-xl"><Menu size={28} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 scrollbar-hide">
          {apiError && <div className="max-w-4xl mx-auto mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex items-center justify-between gap-4 animate-in slide-in-from-top"><div className="flex items-center gap-4"><ShieldAlert className="text-red-500 shrink-0" size={28} /><p className="text-red-200 font-bold text-xs sm:text-sm">{apiError}</p></div><button onClick={() => setApiError(null)} className="text-slate-500 hover:text-white p-2 bg-slate-800/50 rounded-lg"><X size={20}/></button></div>}
          {currentView === View.DASHBOARD && renderDashboard()}
          {currentView === View.TRAINING && renderTrainingView()}
          {currentView === View.ADVISOR && renderAdvisor()}
          {currentView === View.BEST_PRACTICES && renderBestPractices()}
          {currentView === View.WEEKLY_TIPS && renderWeeklyTips()}
          {currentView === View.TOOLKIT && renderToolkit()}
          {currentView === View.NEWS_BLOG && (
            <div className="flex flex-col max-w-5xl mx-auto w-full space-y-8 animate-in fade-in pb-10">
              <div className="bg-[#1b2537] p-10 rounded-[2.5rem] border border-slate-700/50 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6 relative">
                <button onClick={() => setCurrentView(View.DASHBOARD)} className="absolute top-6 right-6 p-3 bg-slate-800/50 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all">
                  <X size={24} />
                </button>
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                    <button onClick={() => setCurrentView(View.DASHBOARD)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                      <ChevronLeft size={32} />
                    </button>
                    <h2 className="text-3xl font-black text-white flex items-center gap-4"><Newspaper className="text-blue-400" size={36} /> CEO News Blog</h2>
                  </div>
                  <p className="text-slate-400 text-lg font-medium">Daily briefings from NSCDC, NIMASA, and ISO regulatory boards.</p>
                </div>
                <button onClick={() => fetchSecurityNews().then(setNewsBlog)} disabled={isNewsLoading} className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-2xl font-bold text-white shadow-xl">
                  {isNewsLoading ? <RefreshCw className="animate-spin" size={20} /> : <RefreshCw size={20} />} Sync Intel
                </button>
              </div>
              <div className="bg-[#1b2537] rounded-[2.5rem] border border-slate-700/50 overflow-hidden shadow-xl min-h-[400px]">
                {newsBlog ? <div className="p-10"><MarkdownRenderer content={newsBlog.text} /></div> : <div className="flex-1 flex flex-col items-center justify-center py-40 opacity-20"><Target size={100} /><p className="text-2xl font-bold">operational brief inactive. Sync to start.</p></div>}
              </div>
            </div>
          )}
        </div>
        
        {/* Modals & Settings */}
        {showKbModal && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in"><div className="bg-[#1b2537] rounded-[3rem] border border-slate-700/50 p-10 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-black text-white flex items-center gap-4"><Database className="text-blue-400" /> Policy Archive</h2><button onClick={() => setShowKbModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={28}/></button></div><div className="space-y-6"><input value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} placeholder="Directive Title..." className="w-full bg-slate-900/50 border border-slate-700/50 p-5 rounded-2xl outline-none text-white focus:border-blue-500 text-lg font-bold" /><textarea value={newDocContent} onChange={(e) => setNewDocContent(e.target.value)} placeholder="Content..." className="w-full bg-slate-900/50 border border-slate-700/50 p-6 rounded-2xl h-64 outline-none resize-none text-white focus:border-blue-500 text-lg" /><button onClick={handleAddKbDocument} className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 rounded-2xl font-bold text-xl active:scale-95 transition-all text-white">Ingest to Core Vault</button></div></div></div>}
        {showSopModal && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in"><div className="bg-[#1b2537] rounded-[3rem] border border-slate-700/50 p-10 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"><div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-black text-white flex items-center gap-4"><Briefcase className="text-blue-400" /> SOP Ingestion</h2><button onClick={() => setShowSopModal(false)} className="p-2 text-slate-500 hover:text-white"><X size={28}/></button></div><div className="space-y-6"><button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center gap-3 p-8 border-2 border-dashed border-slate-700 rounded-3xl bg-slate-900/40 hover:border-blue-500/50 text-slate-400"><FileUp size={40} /><span className="text-sm font-bold uppercase tracking-widest">Select Schema</span><input ref={fileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} /></button><div className="space-y-4"><input value={newSopTitle} onChange={(e) => setNewSopTitle(e.target.value)} placeholder="Title..." className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:border-blue-500 font-bold" /><textarea value={newSopContent} onChange={(e) => setNewSopContent(e.target.value)} placeholder="Full content..." className="w-full bg-slate-900/50 border border-slate-700 p-6 rounded-2xl h-48 outline-none resize-none text-white focus:border-blue-500" /></div><button onClick={handleAddCustomSop} disabled={!newSopTitle || !newSopContent} className="w-full bg-blue-600 py-5 rounded-2xl font-bold text-xl shadow-xl text-white">Secure to Vault</button></div></div></div>}
        {showSettings && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in"><div className="bg-[#1b2537] rounded-[3rem] border border-slate-700/50 p-10 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[95vh]"><div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black text-white flex items-center gap-4"><User className="text-blue-400" /> CEO Profile</h2><button onClick={() => setShowSettings(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={28}/></button></div><div className="space-y-6"><div className="grid grid-cols-1 gap-6"><div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Name</label><input value={userProfile.name} onChange={(e) => setUserProfile({...userProfile, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-5 py-3.5 text-white focus:border-blue-500 font-bold" /></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label><input value={userProfile.phoneNumber} onChange={(e) => setUserProfile({...userProfile, phoneNumber: e.target.value})} placeholder="+234..." className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-5 py-3.5 text-white focus:border-blue-500 font-bold" /></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label><input value={userProfile.email} onChange={(e) => setUserProfile({...userProfile, email: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-5 py-3.5 text-white focus:border-blue-500 font-bold" /></div></div><button onClick={() => { setShowSettings(false); alert('Profile updated.'); }} className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold text-lg shadow-xl text-white mt-4">Sync Profile</button></div></div></div>}
        
        {/* Onscreen Notification Modal */}
        {showNewTipAlert && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-[#1b2537] rounded-[2rem] sm:rounded-[3.5rem] border border-yellow-500/30 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-slate-800/60 bg-slate-900/40 flex justify-between items-center">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center shadow-lg">
                    <Bell size={20} sm:size={24} className="text-yellow-400 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">{showNewTipAlert.topic}</h2>
                    <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol Engaged</p>
                  </div>
                </div>
                <button onClick={() => setShowNewTipAlert(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 scrollbar-hide bg-slate-900/10">
                <MarkdownRenderer content={showNewTipAlert.content} />
              </div>
              <div className="p-6 sm:p-8 border-t border-slate-800/60 bg-slate-900/40 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => { setShowNewTipAlert(null); setCurrentView(View.DASHBOARD); }}
                  className="w-full sm:flex-1 bg-slate-800 hover:bg-slate-700 py-3.5 rounded-xl font-bold text-slate-200 transition-all border border-slate-700"
                >
                  Return to Dashboard
                </button>
                <div className="w-full sm:flex-1">
                  <ShareButton 
                    content={showNewTipAlert.content} 
                    title={showNewTipAlert.topic} 
                    view={View.WEEKLY_TIPS} 
                    id={showNewTipAlert.id}
                    triggerClassName="w-full flex items-center justify-center gap-3 bg-[#2563eb] hover:bg-blue-600 text-white py-3.5 rounded-xl transition-all font-bold text-sm sm:text-lg shadow-lg active:scale-95"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
