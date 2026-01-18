
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, Send, Plus, Search, RefreshCw, Download, FileText, ChevronRight, ShieldAlert, BookOpen, Globe, Briefcase, Calendar, ChevronLeft, Save, Trash2, Check, Lightbulb, Printer, Settings as SettingsIcon, MessageCircle, Mail, X, Bell, Database, Upload, Pin, PinOff, BarChart2, Sparkles, Copy, Lock, ShieldCheck, Fingerprint, Eye, Paperclip, XCircle, Bookmark, BookmarkCheck, LayoutGrid, ListFilter, Wand2, Map, ExternalLink, Image as ImageIcon, Target, User, Phone, FileUp, Key, AlertTriangle, Eye as EyeIcon, CloudDownload, WifiOff, Newspaper } from 'lucide-react';
import Navigation from './components/Navigation';
import MarkdownRenderer from './components/MarkdownRenderer';
import ShareButton from './components/ShareButton';
import IncidentChart from './components/IncidentChart';
import { View, ChatMessage, Template, SecurityRole, StoredReport, WeeklyTip, UserProfile, KnowledgeDocument, SavedTrend, StoredTrainingModule, NewsItem } from './types';
import { STATIC_TEMPLATES, SECURITY_TRAINING_DB } from './constants';
import { generateAdvisorResponse, generateTrainingModule, analyzeReport, fetchBestPractices, generateWeeklyTip, getTrainingSuggestions, analyzePatrolEffectiveness, fetchTopicSuggestions, fetchSecurityNews } from './services/geminiService';

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
    
    // Load offline modules list
    getOfflineModules().then(modules => {
      setOfflineIds(new Set(modules.map(m => m.id)));
    });

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
  
  // Vault Upload State
  const [showSopModal, setShowSopModal] = useState(false);
  const [newSopTitle, setNewSopTitle] = useState('');
  const [newSopDesc, setNewSopDesc] = useState('');
  const [newSopContent, setNewSopContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Training Engine State
  const [trainingTopic, setTrainingTopic] = useState('');
  const [trainingWeek, setTrainingWeek] = useState<number>(1);
  const [trainingRole, setTrainingRole] = useState<SecurityRole>(SecurityRole.GUARD);
  const [trainingContent, setTrainingContent] = useState('');
  const [trainingSources, setTrainingSources] = useState<Array<{ title: string; url: string }> | undefined>(undefined);
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);
  const [isSmartSuggesting, setIsSmartSuggesting] = useState(false);
  const [trainingCategory, setTrainingCategory] = useState<string | null>(null);
  const [hasSavedCurrentModule, setHasSavedCurrentModule] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);

  const [reportText, setReportText] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzerTab, setAnalyzerTab] = useState<'DAILY' | 'PATROL'>('DAILY');
  const [bpTopic, setBpTopic] = useState('');
  const [bpContent, setBpContent] = useState<{ text: string } | null>(null);
  const [isBpLoading, setIsBpLoading] = useState(false);
  const [isTipLoading, setIsTipLoading] = useState(false);

  const [toolkitSearch, setToolkitSearch] = useState('');
  const [toolkitFilter, setToolkitFilter] = useState<'ALL' | 'OFFLINE'>('ALL');

  // News Blog State
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  // Intelligence Topic Engine State
  const [isTopicSearchFocused, setIsTopicSearchFocused] = useState(false);
  const [placeholderTopic, setPlaceholderTopic] = useState('');
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const topicDropdownRef = useRef<HTMLDivElement>(null);

  const allTopicsSorted = useMemo(() => {
    const staticTopics = Object.values(SECURITY_TRAINING_DB).flat();
    return Array.from(new Set([...staticTopics, ...aiSuggestions])).sort((a, b) => a.localeCompare(b));
  }, [aiSuggestions]);

  const filteredTopics = useMemo(() => {
    if (!trainingTopic) return allTopicsSorted.slice(0, 15);
    const search = trainingTopic.toLowerCase();
    return allTopicsSorted.filter(t => t.toLowerCase().includes(search)).slice(0, 20);
  }, [trainingTopic, allTopicsSorted]);

  const isTopicInDatabase = useMemo(() => {
    return allTopicsSorted.some(t => t.toLowerCase() === trainingTopic.toLowerCase());
  }, [trainingTopic, allTopicsSorted]);

  useEffect(() => {
    if (!trainingTopic || trainingTopic.length < 3) return;
    const timeout = setTimeout(async () => {
      setIsAiSuggesting(true);
      try {
        const suggestions = await fetchTopicSuggestions(trainingTopic);
        setAiSuggestions(prev => Array.from(new Set([...prev, ...suggestions])));
      } catch (err) {
        // Silent fail for suggestions to avoid intrusive errors while typing
      } finally {
        setIsAiSuggesting(false);
      }
    }, 1200);
    return () => clearTimeout(timeout);
  }, [trainingTopic]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (topicDropdownRef.current && !topicDropdownRef.current.contains(event.target as Node)) {
        setIsTopicSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let timeout: any;
    let charIndex = 0;
    const topicsToRotate = allTopicsSorted.length > 0 ? allTopicsSorted : ["Vehicle Search Protocols", "ISO 18788 Audit Readiness", "Perimeter Integrity", "Conflict De-escalation"];
    const targetTopic = topicsToRotate[currentTopicIndex % topicsToRotate.length];
    
    const typeWriter = () => {
      if (charIndex <= targetTopic.length) {
        setPlaceholderTopic(`e.g. ${targetTopic.substring(0, charIndex)}`);
        charIndex++;
        timeout = setTimeout(typeWriter, 40);
      } else {
        timeout = setTimeout(() => {
          setCurrentTopicIndex((prev) => prev + 1);
          charIndex = 0;
        }, 3000);
      }
    };
    typeWriter();
    // Fix: Using clearTimeout instead of setTimeout in the effect cleanup to prevent type mismatch and correctly dispose of the timer.
    return () => clearTimeout(timeout);
  }, [currentTopicIndex, allTopicsSorted]);

  useEffect(() => {
    if (currentView === View.NEWS_BLOG && newsItems.length === 0 && !isOfflineMode) {
      handleLoadNews();
    }
  }, [currentView, isOfflineMode]);

  const handleLoadNews = async () => {
    setIsNewsLoading(true);
    setApiError(null);
    try {
      const news = await fetchSecurityNews();
      setNewsItems(news);
    } catch (err) {
      handleError(err);
    } finally {
      setIsNewsLoading(false);
    }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('security_app_profile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('security_app_chat', JSON.stringify(messages)); chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { localStorage.setItem('security_app_reports', JSON.stringify(storedReports)); }, [storedReports]);
  useEffect(() => { localStorage.setItem('security_app_weekly_tips', JSON.stringify(weeklyTips)); }, [weeklyTips]);
  useEffect(() => { localStorage.setItem('security_app_kb', JSON.stringify(knowledgeBase)); }, [knowledgeBase]);
  useEffect(() => { localStorage.setItem('security_app_training', JSON.stringify(savedTraining)); }, [savedTraining]);
  useEffect(() => { localStorage.setItem('security_app_custom_sops', JSON.stringify(customSops)); }, [customSops]);

  // Automated Weekly Tip Logic
  useEffect(() => {
    if (appState === 'READY' && !isOfflineMode) {
      const checkAutomation = async () => {
        const lastAutoCheck = localStorage.getItem('security_app_last_auto_tip');
        const today = new Date().toLocaleDateString();
        
        if (lastAutoCheck === today) return; // Already checked today

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
        if (newPin === storedPin) {
          setAppState('READY');
        }
        else { setIsPinError(true); setTimeout(() => setPinInput(''), 500); }
      } else {
        if (setupStep === 1) { setTempPin(newPin); setSetupStep(2); setPinInput(''); }
        else {
          if (newPin === tempPin) { 
            localStorage.setItem('security_app_vault_pin', newPin); 
            setStoredPin(newPin); 
            setAppState('READY');
          }
          else { setIsPinError(true); setSetupStep(1); setPinInput(''); }
        }
      }
    }
  };

  const handleError = (error: any) => {
    const errorMsg = error?.message || String(error);
    setApiError(`Operational Link Error: ${errorMsg}`);
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
      const aiMsg: ChatMessage = { id: Date.now().toString() + 'ai', role: 'model', text: response.text, timestamp: Date.now(), isPinned: false };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      handleError(err);
    } finally {
      setIsAdvisorThinking(false);
    }
  };

  const togglePinMessage = (messageId: string) => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg));
  };

  const pinnedMessages = useMemo(() => messages.filter(msg => msg.isPinned), [messages]);

  const handleAnalyzeReport = async () => {
    if (!reportText || isOfflineMode) return;
    setApiError(null);
    setIsAnalyzing(true);
    try {
      const result = await analyzeReport(reportText, storedReports);
      setAnalysisResult(result);
      setStoredReports(prev => [{ id: Date.now().toString(), timestamp: Date.now(), dateStr: new Date().toLocaleDateString(), content: reportText, analysis: result }, ...prev]);
    } catch (err) {
      handleError(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzePatrols = async () => {
    if (isOfflineMode) return;
    setApiError(null);
    setIsAnalyzing(true);
    try {
      const result = await analyzePatrolEffectiveness(storedReports, knowledgeBase);
      setAnalysisResult(result);
    } catch (err) {
      handleError(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateTraining = async () => {
    if (!trainingTopic || isOfflineMode) return;
    setApiError(null);
    setIsTrainingLoading(true);
    setTrainingSources(undefined);
    setIsTopicSearchFocused(false);
    setHasSavedCurrentModule(false);
    setCurrentModuleId(null);
    try {
      const result = await generateTrainingModule(trainingTopic, trainingWeek, trainingRole);
      setTrainingContent(result.text);
      setTrainingSources(result.sources);
    } catch (err) {
      handleError(err);
    } finally {
      setIsTrainingLoading(false);
    }
  };

  const handleSmartAutoGenerate = async () => {
    if (isOfflineMode) return;
    setApiError(null);
    setIsSmartSuggesting(true);
    try {
      const suggestions = await getTrainingSuggestions(storedReports);
      const selectedTopic = suggestions[0] || (allTopicsSorted.length > 0 ? allTopicsSorted[0] : "Industrial Security Best Practices");
      setTrainingTopic(selectedTopic);
      setIsTrainingLoading(true);
      setHasSavedCurrentModule(false);
      setCurrentModuleId(null);
      const result = await generateTrainingModule(selectedTopic, 1, trainingRole);
      setTrainingContent(result.text);
      setTrainingSources(result.sources);
    } catch (err) {
      handleError(err);
    } finally {
      setIsSmartSuggesting(false);
      setIsTrainingLoading(false);
    }
  };

  const handleSaveTraining = () => {
    if (!trainingContent || !trainingTopic || hasSavedCurrentModule) return;
    const newId = Date.now().toString();
    const newModule: StoredTrainingModule = {
      id: newId,
      topic: `${trainingTopic} (${trainingRole})`,
      targetAudience: trainingRole,
      content: trainingContent,
      generatedDate: new Date().toLocaleDateString(),
      timestamp: Date.now()
    };
    setSavedTraining(prev => [newModule, ...prev]);
    setHasSavedCurrentModule(true);
    setCurrentModuleId(newId);
  };

  const handleDownloadOffline = async () => {
    if (!trainingContent || !trainingTopic) return;
    
    // Ensure it's saved first
    let moduleToDownload: StoredTrainingModule;
    if (currentModuleId) {
      moduleToDownload = savedTraining.find(m => m.id === currentModuleId)!;
    } else {
      const newId = Date.now().toString();
      moduleToDownload = {
        id: newId,
        topic: `${trainingTopic} (${trainingRole})`,
        targetAudience: trainingRole,
        content: trainingContent,
        generatedDate: new Date().toLocaleDateString(),
        timestamp: Date.now()
      };
      setSavedTraining(prev => [moduleToDownload, ...prev]);
      setHasSavedCurrentModule(true);
      setCurrentModuleId(newId);
    }

    try {
      await saveOfflineModule(moduleToDownload);
      setOfflineIds(prev => new Set([...prev, moduleToDownload.id]));
      alert('Module successfully archived for offline tactical access.');
    } catch (err) {
      console.error("Offline Save Error:", err);
      alert('Failed to archive module offline.');
    }
  };

  const handleFetchBP = async () => {
    if (isOfflineMode) return;
    setApiError(null);
    setIsBpLoading(true);
    try {
      const result = await fetchBestPractices(bpTopic);
      setBpContent(result);
    } catch (err) {
      handleError(err);
    } finally {
      setIsBpLoading(false);
    }
  };

  const handleGenerateWeeklyTip = async () => {
    if (isOfflineMode) return;
    setApiError(null);
    setIsTipLoading(true);
    try {
      const content = await generateWeeklyTip(weeklyTips);
      const newTip: WeeklyTip = { id: Date.now().toString(), timestamp: Date.now(), weekDate: new Date().toLocaleDateString(), topic: "Weekly Strategic Focus", content, isAutoGenerated: true };
      setWeeklyTips(prev => [newTip, ...prev]);
      setShowNewTipAlert(newTip);
    } catch (err) {
      handleError(err);
    } finally {
      setIsTipLoading(false);
    }
  };

  const handleAddKbDocument = () => {
    if (!newDocTitle || !newDocContent) return;
    const newDoc: KnowledgeDocument = { id: Date.now().toString(), title: newDocTitle, content: newDocContent, dateAdded: new Date().toLocaleDateString() };
    setKnowledgeBase(prev => [...prev, newDoc]);
    setNewDocTitle(''); setNewDocContent('');
    setShowKbModal(false);
  };

  const handleAddCustomSop = () => {
    if (!newSopTitle || !newSopContent) return;
    const newSop: Template = { 
      id: Date.now().toString(), 
      title: newSopTitle, 
      description: newSopDesc || 'Custom Deployment Protocol', 
      content: newSopContent 
    };
    setCustomSops(prev => [newSop, ...prev]);
    setNewSopTitle(''); setNewSopDesc(''); setNewSopContent('');
    setShowSopModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setNewSopContent(content);
      if (!newSopTitle) {
        setNewSopTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsText(file);
  };

  const deleteCustomSop = (id: string) => {
    setCustomSops(prev => prev.filter(s => s.id !== id));
  };

  const deleteSavedModule = async (id: string) => {
    setSavedTraining(prev => prev.filter(m => m.id !== id));
    if (offlineIds.has(id)) {
      await removeOfflineModuleFromDB(id);
      setOfflineIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const extractImageDescriptions = (markdown: string) => {
    const sectionMatch = markdown.match(/### 🖼️ Visual Illustration Suggestions([\s\S]*?)(?:###|$)/);
    if (!sectionMatch) return [];
    return sectionMatch[1].trim().split('\n').filter(line => line.includes('Visual Guide'));
  };

  const renderTrainingView = () => {
    const imageCards = extractImageDescriptions(trainingContent);
    
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] max-w-7xl mx-auto w-full gap-6 animate-in fade-in duration-500">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-4 flex flex-col gap-6 overflow-hidden">
            <div className={`bg-[#1b2537] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-lg shrink-0 overflow-visible z-[100] ${isOfflineMode ? 'opacity-60 grayscale' : ''}`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3"><BookOpen size={28} className="text-emerald-400" /> Training Builder</h2>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1.5"><Sparkles size={10} className="text-blue-400"/> 1M+ TOPIC DATA BANK ACTIVE</p>
                </div>
                {!isOfflineMode && (
                  <button onClick={handleSmartAutoGenerate} disabled={isSmartSuggesting || isTrainingLoading} className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-2xl transition-all">
                    {isSmartSuggesting ? <RefreshCw className="animate-spin" size={20} /> : <Wand2 size={20} />}
                  </button>
                )}
              </div>
              
              <div className="space-y-4 relative" ref={topicDropdownRef}>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Industrial Intelligence Search</label>
                  <div className="relative group/input">
                    <input 
                      disabled={isOfflineMode}
                      value={trainingTopic} 
                      onChange={(e) => { setTrainingTopic(e.target.value); setIsTopicSearchFocused(true); }} 
                      onFocus={() => setIsTopicSearchFocused(true)}
                      onKeyDown={(e) => e.key === 'Enter' && trainingTopic && handleGenerateTraining()}
                      placeholder={isOfflineMode ? "Searching disabled offline" : placeholderTopic} 
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl px-5 py-3.5 text-white focus:border-blue-500/50 outline-none text-base transition-all placeholder:text-slate-600 font-medium pr-14 shadow-inner" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {isAiSuggesting && <RefreshCw size={14} className="animate-spin text-blue-400" />}
                      <Search size={22} className="text-slate-500" />
                    </div>
                  </div>

                  {isTopicSearchFocused && !isOfflineMode && (
                    <div className="absolute z-[110] left-0 right-0 mt-3 bg-[#0a1222] border border-slate-700 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in zoom-in duration-200 origin-top flex flex-col max-h-[400px]">
                      <div className="p-3 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center shrink-0">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Data Bank Suggestions</span>
                        <div className="flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                           <span className="text-[8px] font-bold text-emerald-400">READY</span>
                        </div>
                      </div>
                      <div className="overflow-y-auto scrollbar-hide py-1">
                        {filteredTopics.length > 0 ? filteredTopics.map(t => (
                          <button key={t} onClick={() => { setTrainingTopic(t); setIsTopicSearchFocused(false); }} className="w-full text-left px-5 py-4 hover:bg-slate-800/60 text-sm text-slate-300 transition-colors flex items-center gap-4 group border-b border-slate-800/20 last:border-none">
                            <div className="w-2 h-2 rounded-full bg-slate-700 group-hover:bg-blue-400 transition-colors shrink-0"></div>
                            <span className="truncate flex-1 font-semibold">{t}</span>
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-blue-400 translate-x-[-4px] group-hover:translate-x-0 transition-all" />
                          </button>
                        )) : (
                          <div className="px-5 py-10 text-center text-slate-500 italic text-xs flex flex-col items-center gap-3">
                            <Search size={32} className="opacity-20 animate-pulse" />
                            <p className="font-bold tracking-tight">AI is accessing specialized industrial protocols...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Level</label>
                    <div className="flex gap-1.5 bg-slate-900/40 p-1 rounded-2xl border border-slate-700/50">
                      {[1, 2, 3].map(w => (
                        <button 
                          key={w} 
                          disabled={isOfflineMode}
                          onClick={() => setTrainingWeek(w)} 
                          className={`flex-1 py-2 rounded-xl font-bold text-[10px] transition-all ${trainingWeek === w ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          W{w}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Role</label>
                    <select 
                      disabled={isOfflineMode}
                      value={trainingRole} 
                      onChange={(e) => setTrainingRole(e.target.value as SecurityRole)}
                      className="w-full bg-slate-900/40 border border-slate-700/50 rounded-2xl px-4 py-2.5 text-[10px] font-bold text-slate-300 outline-none focus:border-blue-500/50"
                    >
                      <option value={SecurityRole.GUARD}>Guard</option>
                      <option value={SecurityRole.SUPERVISOR}>Supervisor</option>
                      <option value={SecurityRole.GEN_SUPERVISOR}>Manager</option>
                    </select>
                  </div>
                </div>

                <button onClick={handleGenerateTraining} disabled={isTrainingLoading || !trainingTopic || isOfflineMode} className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold text-white transition-all shadow-lg text-lg active:scale-[0.98] flex items-center justify-center gap-3 group">
                  {isTrainingLoading ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />}
                  {isTrainingLoading ? 'Analyzing Data Bank...' : 'Assemble Training'}
                </button>
                
                {isOfflineMode && (
                  <p className="text-[9px] text-yellow-400 font-bold text-center mt-2 flex items-center justify-center gap-2">
                    <WifiOff size={12} /> Live intelligence bank requires internet connectivity.
                  </p>
                )}
              </div>
            </div>
            
            <div className="bg-[#1b2537] rounded-[2.5rem] border border-slate-700/50 flex-1 flex flex-col overflow-hidden shadow-lg">
              <div className="p-5 border-b border-slate-700/50 bg-slate-900/40 flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Globe size={16} className="text-blue-400"/> Industrial Standards</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-3">
                {trainingCategory === null ? (
                  Object.keys(SECURITY_TRAINING_DB).map(cat => (
                    <button key={cat} onClick={() => setTrainingCategory(cat)} className="w-full p-4 rounded-2xl bg-slate-800/40 border border-slate-700/30 hover:border-blue-500/30 hover:bg-slate-800 transition-all flex items-center justify-between group">
                      <span className="text-sm font-bold text-slate-200">{cat}</span>
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-blue-400" />
                    </button>
                  ))
                ) : (
                  <div className="space-y-2">
                    <button onClick={() => setTrainingCategory(null)} className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 hover:translate-x-1 transition-transform">
                      <ChevronLeft size={14}/> All Standards
                    </button>
                    {(SECURITY_TRAINING_DB as any)[trainingCategory].map((topic: string) => (
                      <button key={topic} onClick={() => { setTrainingTopic(topic); setIsTopicSearchFocused(false); }} className="w-full text-left p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs font-semibold text-slate-400 hover:text-white transition-all border-l-2 border-l-transparent hover:border-l-blue-500">
                        {topic}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-8 flex flex-col gap-6 overflow-hidden">
            <div className="bg-[#1b2537] rounded-[2.5rem] border border-slate-700/50 overflow-hidden shadow-2xl flex flex-col flex-1">
              <div className="p-6 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={22} className="text-emerald-400" />
                  <h3 className="font-bold text-white text-lg">Industrial Execution Brief</h3>
                </div>
                {trainingContent && (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveTraining} 
                      disabled={hasSavedCurrentModule}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-bold text-sm border ${hasSavedCurrentModule ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 active:scale-95'}`}
                    >
                      {hasSavedCurrentModule ? <BookmarkCheck size={18}/> : <Save size={18}/>}
                      {hasSavedCurrentModule ? 'Archived' : 'Archive'}
                    </button>
                    
                    <button 
                      onClick={handleDownloadOffline} 
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-bold text-sm border ${currentModuleId && offlineIds.has(currentModuleId) ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20 active:scale-95'}`}
                    >
                      <CloudDownload size={18} />
                      {currentModuleId && offlineIds.has(currentModuleId) ? 'Offline Ready' : 'Download Offline'}
                    </button>

                    <ShareButton content={trainingContent} title={trainingTopic} />
                  </div>
                )}
              </div>
              <div className="flex-1 p-8 overflow-y-auto bg-slate-900/10 scrollbar-hide">
                {trainingContent ? (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {imageCards.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                          <ImageIcon className="text-blue-400" size={20} />
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">World-Best Visual Reference Standards</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {imageCards.map((desc, idx) => {
                            const cleanDesc = desc.includes(':') ? desc.split(':')[1].trim() : desc.replace(/^- \*\*/, '').replace(/\*\*$/, '');
                            const guideName = `Protocol Standard ${idx + 1}`;
                            return (
                              <div key={idx} className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 flex flex-col gap-3 group hover:border-blue-500/50 transition-all shadow-md">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{guideName}</span>
                                <p className="text-xs font-bold text-slate-200 leading-relaxed italic">
                                  {cleanDesc}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <MarkdownRenderer content={trainingContent} />
                    {trainingSources && (
                      <div className="pt-8 border-t border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {trainingSources.map((s, idx) => (
                          <a key={idx} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-slate-900/40 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all group">
                            <ExternalLink size={14} className="text-slate-600 group-hover:text-blue-400"/>
                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-white line-clamp-1">{s.title}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700 text-center max-w-sm mx-auto gap-6 opacity-30">
                    <Target size={80} strokeWidth={1} />
                    <p className="text-lg font-bold">Access the 1M topic bank or select an industrial standard to deploy training.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBestPractices = () => (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full space-y-8">
      <div className={`bg-[#1b2537] p-10 rounded-[2.5rem] border border-slate-700/50 shadow-lg flex flex-col md:flex-row gap-8 items-center ${isOfflineMode ? 'opacity-60 grayscale' : ''}`}>
        <div className="flex-1 space-y-2">
          <h2 className="text-3xl font-black text-white flex items-center gap-4"><Globe className="text-blue-400" size={32} /> Global Intelligence</h2>
          <p className="text-slate-400 text-lg">Synthesizing real-time security standards and fresh tactical trends.</p>
        </div>
        <div className="w-full md:w-96 flex gap-3">
          <input 
            disabled={isOfflineMode}
            value={bpTopic} 
            onChange={(e) => setBpTopic(e.target.value)} 
            placeholder={isOfflineMode ? "Searching disabled offline" : "Search specific trend..."} 
            className="flex-1 bg-slate-900/60 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-all font-medium shadow-inner" 
          />
          <button onClick={handleFetchBP} disabled={isBpLoading || isOfflineMode} className="bg-blue-600 hover:bg-blue-700 p-4 rounded-2xl shadow-lg transition-all active:scale-95">
            {isBpLoading ? <RefreshCw className="animate-spin" size={24} /> : <Search size={24} />}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#1b2537] rounded-[2.5rem] border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-400" />
            <h3 className="font-bold text-white text-lg">Autonomous Trend Brief</h3>
          </div>
          {bpContent && <ShareButton content={bpContent.text} title="Global Security Trend" />}
        </div>
        <div className="flex-1 p-10 overflow-y-auto scrollbar-hide bg-slate-900/5">
          {isBpLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 animate-pulse">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center"><Globe className="text-blue-500" size={32}/></div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Accessing Global Intelligence Hub...</p>
            </div>
          ) : bpContent ? (
            <div className="space-y-12 pb-10">
              <MarkdownRenderer content={bpContent.text} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-700 text-center max-w-sm mx-auto gap-6 opacity-30">
              <Globe size={64} strokeWidth={1}/>
              <p className="text-lg font-bold">Synchronizing Global Intelligence...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderNewsBlog = () => (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <div className="bg-[#1b2537] p-10 rounded-[2.5rem] border border-slate-700/50 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1 space-y-2 text-center md:text-left">
          <h2 className="text-3xl font-black text-white flex items-center justify-center md:justify-start gap-4">
            <Newspaper className="text-blue-400" size={36} /> 
            CEO Security News Blog
          </h2>
          <p className="text-slate-400 text-lg">Real-time intelligence from NSCDC, ISO, and global security hubs.</p>
        </div>
        <button 
          onClick={handleLoadNews} 
          disabled={isNewsLoading || isOfflineMode} 
          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-2xl font-bold text-white shadow-xl transition-all active:scale-95 disabled:opacity-50"
        >
          {isNewsLoading ? <RefreshCw className="animate-spin" size={20} /> : <RefreshCw size={20} />}
          Synchronize Blog
        </button>
      </div>

      {isOfflineMode && (
        <div className="bg-yellow-600/10 border border-yellow-500/30 p-6 rounded-[2rem] flex items-center gap-4 text-yellow-200">
          <WifiOff size={24} />
          <p className="font-bold">Real-time intelligence feed is disabled offline. Connect to synchronize latest updates.</p>
        </div>
      )}

      <div className="space-y-6">
        {isNewsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6 opacity-50">
            <Newspaper className="text-blue-400 animate-pulse" size={64} />
            <p className="text-slate-400 font-black uppercase tracking-[0.2em]">Assembling Latest Intelligence...</p>
          </div>
        ) : newsItems.length > 0 ? (
          newsItems.map((item, index) => (
            <div key={item.id || index} className="bg-[#1b2537] rounded-[2.5rem] border border-slate-700/50 overflow-hidden shadow-xl hover:border-blue-500/30 transition-all group">
              <div className="p-8 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        item.category === 'Risk' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        item.category === 'Policy' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        item.category === 'Training' || item.category === 'Certification' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {item.category}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.date}</span>
                    </div>
                    <h3 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors leading-tight">{item.headline}</h3>
                  </div>
                  <ShareButton content={`*${item.headline}*\nSource: ${item.source}\n\n${item.summary}\n\nLink: ${item.link}`} title={item.headline} />
                </div>
                
                <div className="space-y-4">
                  <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">CEO Intelligence & Business Impact</h4>
                    <p className="text-slate-300 leading-relaxed font-medium">{item.summary}</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Globe size={14} />
                      <span className="text-xs font-bold italic">Source: {item.source}</span>
                    </div>
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold text-sm border-b border-blue-400/30 pb-0.5"
                    >
                      Read Full Report <ChevronRight size={16} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-40 gap-8 opacity-20">
            <Target size={100} strokeWidth={1} />
            <p className="text-2xl font-bold max-w-md text-center">Intelligence hub is ready. Click "Synchronize" to pull the latest security blog.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderToolkit = () => {
    const searchLower = toolkitSearch.toLowerCase();
    
    let filteredStatic = STATIC_TEMPLATES.filter(tmpl => tmpl.title.toLowerCase().includes(searchLower));
    let filteredSaved = savedTraining.filter(mod => mod.topic.toLowerCase().includes(searchLower));
    let filteredCustom = customSops.filter(sop => sop.title.toLowerCase().includes(searchLower));

    if (toolkitFilter === 'OFFLINE') {
      filteredStatic = []; // Static templates are local anyway
      filteredSaved = filteredSaved.filter(mod => offlineIds.has(mod.id));
      filteredCustom = [];
    }

    return (
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white">Operations Vault</h2>
            <p className="text-slate-400">Ready-to-deploy SOPs and tactical templates.</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex gap-2 p-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 mr-4">
              <button onClick={() => setToolkitFilter('ALL')} className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${toolkitFilter === 'ALL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>All</button>
              <button onClick={() => setToolkitFilter('OFFLINE')} className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 ${toolkitFilter === 'OFFLINE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><CloudDownload size={14}/> Offline</button>
            </div>
            <div className="relative flex-1 md:w-80 group">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                value={toolkitSearch}
                onChange={(e) => setToolkitSearch(e.target.value)}
                placeholder="Search vault..."
                className="w-full bg-slate-800/40 border border-slate-700 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
              />
            </div>
            <button 
              onClick={() => setShowSopModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center gap-2 font-bold"
            >
              <Plus size={24} />
              <span className="hidden sm:inline">Upload SOP</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Upload Card */}
          {toolkitFilter === 'ALL' && (
            <button 
              onClick={() => setShowSopModal(true)}
              className="bg-[#1b2537] p-8 rounded-[2.5rem] border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/40 transition-all group flex flex-col items-center justify-center text-center gap-4 min-h-[280px]"
            >
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileUp size={32} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">New Deployment SOP</h3>
                <p className="text-slate-500 text-sm">Upload or create a custom tactical template.</p>
              </div>
            </button>
          )}

          {filteredStatic.map((tmpl) => (
            <div key={tmpl.id} className="bg-[#1b2537] p-8 rounded-[2.5rem] border border-slate-700/50 hover:bg-slate-800/80 transition-all group shadow-lg flex flex-col h-full">
              <FileText size={28} className="text-blue-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">{tmpl.title}</h3>
              <p className="text-slate-400 text-sm mb-8 flex-1">{tmpl.description}</p>
              <div className="flex gap-3">
                <button onClick={() => { navigator.clipboard.writeText(tmpl.content); alert('Copied'); }} className="flex-1 py-3 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 border border-slate-700">Copy SOP</button>
                <ShareButton content={tmpl.content} title={tmpl.title} />
              </div>
            </div>
          ))}

          {filteredCustom.map((sop) => (
            <div key={sop.id} className="bg-[#1b2537] p-8 rounded-[2.5rem] border border-blue-500/20 hover:bg-slate-800/80 transition-all group shadow-lg flex flex-col h-full relative">
              <button onClick={() => deleteCustomSop(sop.id)} className="absolute top-6 right-6 p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={18} />
              </button>
              <ShieldCheck size={28} className="text-blue-500 mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">{sop.title}</h3>
              <p className="text-slate-400 text-sm mb-8 flex-1">{sop.description}</p>
              <div className="flex gap-3">
                <button onClick={() => { navigator.clipboard.writeText(sop.content); alert('Copied'); }} className="flex-1 py-3 bg-slate-900 rounded-xl text-xs font-bold text-blue-400 border border-blue-500/20">Copy Custom SOP</button>
                <ShareButton content={sop.content} title={sop.title} />
              </div>
            </div>
          ))}

          {filteredSaved.map((mod) => {
            const isOffline = offlineIds.has(mod.id);
            return (
              <div key={mod.id} className={`bg-[#1b2537] p-8 rounded-[2.5rem] border transition-all group shadow-lg flex flex-col h-full relative ${isOffline ? 'border-emerald-500/30' : 'border-slate-700/50 hover:bg-slate-800/80'}`}>
                <div className="flex justify-between items-start mb-6">
                  <BookOpen size={28} className="text-emerald-400" />
                  <div className="flex items-center gap-2">
                    {isOffline && (
                      <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md flex items-center gap-1.5 text-[10px] font-black uppercase">
                        <CloudDownload size={12}/> Offline
                      </div>
                    )}
                    <button onClick={() => deleteSavedModule(mod.id)} className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 line-clamp-1">{mod.topic}</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6">Generated on {mod.generatedDate}</p>
                <div className="flex gap-3 mt-auto">
                  <button onClick={() => { setTrainingTopic(mod.topic); setTrainingContent(mod.content); setCurrentView(View.TRAINING); setCurrentModuleId(mod.id); setHasSavedCurrentModule(true); }} className="flex-1 py-3 bg-emerald-500/10 rounded-xl text-xs font-bold text-emerald-400 border border-emerald-500/20">View Module</button>
                  <ShareButton content={mod.content} title={mod.topic} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6 max-w-4xl mx-auto">
      {isOfflineMode && (
        <div className="bg-yellow-600/10 border border-yellow-500/30 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top">
          <div className="flex items-center gap-3">
            <WifiOff className="text-yellow-400" size={20} />
            <p className="text-yellow-200 font-bold text-sm">Offline Tactical Mode Active. Access archived SOPs and training in the Vault.</p>
          </div>
          <button onClick={() => setCurrentView(View.TOOLKIT)} className="text-[10px] font-black text-yellow-400 uppercase tracking-widest border-b border-yellow-400/30">Go to Vault</button>
        </div>
      )}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#21439c] to-[#122b6a] border border-blue-500/20 rounded-[2.5rem] p-12 text-white shadow-2xl">
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">Intelligence Control Hub</h2>
          <p className="text-blue-100/90 text-xl leading-relaxed mb-10 max-w-2xl">AntiRisk Global Core is managing site progression. Accessing industrial best practices across 1M topics.</p>
          <div className="flex gap-4">
            <button onClick={() => setCurrentView(View.ADVISOR)} disabled={isOfflineMode} className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all active:scale-95 shadow-xl disabled:opacity-50">Executive Consultation</button>
            <button onClick={() => setCurrentView(View.NEWS_BLOG)} disabled={isOfflineMode} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-95 shadow-xl disabled:opacity-50">Security News Blog</button>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-5"><ShieldAlert size={200} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div onClick={() => setCurrentView(View.TRAINING)} className="bg-[#1b2537] p-8 rounded-[2.5rem] border border-slate-700/40 cursor-pointer hover:bg-slate-800 transition-all group shadow-md">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><BookOpen className="text-emerald-400" size={28} /></div>
          <h3 className="text-2xl font-bold text-white mb-2">Training Builder</h3>
          <p className="text-slate-400">Search 1M topics for specialized guard and industrial SOPs.</p>
        </div>
        <div onClick={() => setCurrentView(View.BEST_PRACTICES)} className={`bg-[#1b2537] p-8 rounded-[2.5rem] border border-slate-700/40 cursor-pointer hover:bg-slate-800 transition-all group shadow-md ${isOfflineMode ? 'opacity-60 grayscale' : ''}`}>
          <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Globe className="text-blue-400" size={28} /></div>
          <h3 className="text-2xl font-bold text-white mb-2">Global Standards</h3>
          <p className="text-slate-400">Direct grounding in global ASIS and ISO intelligence streams.</p>
        </div>
      </div>
    </div>
  );

  if (appState === 'SPLASH') {
    return (
      <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-8 z-[100]">
        <AntiRiskLogo className="w-32 h-32 mb-12 animate-pulse" light={true} />
        <div className="w-full max-w-xs space-y-6 text-center">
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 shadow-[0_0_15px_#2563eb] transition-all" style={{ width: `${splashProgress}%` }}></div>
          </div>
          <p className="text-[10px] font-black text-blue-400 tracking-[0.4em] uppercase">Initializing 1M Topic Data Bank...</p>
        </div>
      </div>
    );
  }

  if (appState === 'PIN_ENTRY' || appState === 'PIN_SETUP') {
    return (
      <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-6 z-[100]">
        <AntiRiskLogo className="w-20 h-20 mb-8" />
        <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">{appState === 'PIN_SETUP' ? 'Create Secure PIN' : 'Vault Access'}</h2>
        
        {apiError && (
          <div className="w-full max-w-xs mb-6 p-4 bg-red-600/10 border border-red-500/30 rounded-2xl flex items-start gap-3 animate-in fade-in">
             <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
             <p className="text-[11px] font-bold text-red-200">{apiError}</p>
          </div>
        )}

        <div className="flex gap-5 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pinInput.length > i ? (isPinError ? 'bg-red-500 border-red-500' : 'bg-blue-500 border-blue-500 shadow-[0_0_10px_#3b82f6]') : 'border-slate-800'}`} />)}
        </div>
        
        <div className="grid grid-cols-3 gap-5 w-full max-w-xs mb-10">
          {[1,2,3,4,5,6,7,8,9,0].map(num => <button key={num} onClick={() => handlePinDigit(num.toString())} className="aspect-square bg-slate-800/30 border border-slate-800/50 rounded-2xl text-2xl font-bold text-white active:scale-90 transition-all shadow-inner hover:bg-slate-800/60">{num}</button>)}
          <button onClick={() => setPinInput('')} className="aspect-square bg-slate-800/30 border border-slate-800/50 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-900/10"><Trash2 size={24} /></button>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          {isOfflineMode && (
            <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest text-center">Offline: Limited Intelligence Access</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0f1a] text-slate-100 selection:bg-blue-600 selection:text-white">
      <Navigation currentView={currentView} setView={setCurrentView} isMobileMenuOpen={isMobileMenuOpen} closeMobileMenu={() => setIsMobileMenuOpen(false)} onOpenSettings={() => setShowSettings(true)} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="lg:hidden p-6 border-b border-slate-800/40 flex justify-between items-center bg-[#0a0f1a]/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <AntiRiskLogo className="w-8 h-8" />
            <h1 className="font-bold text-2xl text-white">AntiRisk Global</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white bg-slate-800/50 rounded-xl"><Menu size={32} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-12 scrollbar-hide">
          {apiError && (
             <div className="max-w-4xl mx-auto mb-8 bg-red-500/10 border border-red-500/30 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-top duration-300">
               <div className="flex items-center gap-4">
                 <ShieldAlert className="text-red-500 shrink-0" size={32} />
                 <p className="text-red-200 font-bold">{apiError}</p>
               </div>
             </div>
          )}
          
          {currentView === View.DASHBOARD && renderDashboard()}
          {currentView === View.NEWS_BLOG && renderNewsBlog()}
          {currentView === View.TRAINING && renderTrainingView()}
          {currentView === View.BEST_PRACTICES && renderBestPractices()}
          {currentView === View.TOOLKIT && renderToolkit()}
          {currentView === View.ADVISOR && (
            <div className="flex flex-col h-full max-w-4xl mx-auto bg-slate-800/50 rounded-3xl border border-slate-700/50 overflow-hidden shadow-xl">
               <div className="p-6 border-b border-slate-700/50 bg-slate-900/40 flex flex-col gap-6">
                 <div className="flex justify-between items-center">
                   <h2 className="font-bold text-white flex items-center gap-3"><ShieldAlert className="text-blue-400" size={24} /> Strategic Advisor</h2>
                   <button onClick={() => setShowKbModal(true)} className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-blue-400/20 transition-all">Knowledge Archive</button>
                 </div>
                 
                 <div className="flex gap-2 p-1 bg-slate-900/60 rounded-2xl border border-slate-800 w-fit">
                    <button onClick={() => setAdvisorViewMode('CHAT')} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${advisorViewMode === 'CHAT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Consultation</button>
                    <button onClick={() => setAdvisorViewMode('PINNED')} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${advisorViewMode === 'PINNED' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Pinned Briefs {pinnedMessages.length > 0 && <span className="bg-slate-900/50 px-2 py-0.5 rounded-md text-[10px]">{pinnedMessages.length}</span>}</button>
                 </div>
               </div>

               {advisorViewMode === 'CHAT' ? (
                 <>
                   <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                     {messages.map(msg => (
                       <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`group relative max-w-[85%] p-5 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'}`}>
                           {msg.role === 'model' && (
                             <button onClick={() => togglePinMessage(msg.id)} className={`absolute -right-10 top-2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${msg.isPinned ? 'text-yellow-400' : 'text-slate-600 hover:text-slate-400'}`}>
                               {msg.isPinned ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                             </button>
                           )}
                           <MarkdownRenderer content={msg.text} />
                         </div>
                       </div>
                     ))}
                     {isAdvisorThinking && <div className="flex gap-2 p-4 bg-slate-800 rounded-xl w-fit animate-pulse"><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div></div>}
                     <div ref={chatEndRef} />
                   </div>
                   <div className="p-6 border-t border-slate-700/50 flex gap-3 bg-slate-900/20">
                     <input disabled={isOfflineMode} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={isOfflineMode ? "Advisor disabled offline" : "Consult strategic intel..."} className="flex-1 bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner disabled:opacity-40" />
                     <button onClick={handleSendMessage} disabled={!inputMessage.trim() || isAdvisorThinking || isOfflineMode} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-4 rounded-2xl shadow-lg flex items-center justify-center transition-all"><Send size={24} /></button>
                   </div>
                 </>
               ) : (
                 <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
                   {pinnedMessages.length > 0 ? pinnedMessages.map(msg => (
                     <div key={msg.id} className="bg-[#1b2537] rounded-[2rem] border border-slate-700/50 overflow-hidden shadow-lg">
                       <div className="p-6 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center">
                         <h3 className="text-sm font-bold text-white">Secured Intel Brief</h3>
                         <div className="flex gap-2">
                           <button onClick={() => togglePinMessage(msg.id)} className="p-2.5 bg-slate-800 rounded-xl text-red-400 border border-slate-700"><PinOff size={18} /></button>
                           <ShareButton content={msg.text} title="Secured Brief" />
                         </div>
                       </div>
                       <div className="p-8"><MarkdownRenderer content={msg.text} /></div>
                     </div>
                   )) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-30 mt-20"><Bookmark size={64} /><p className="text-lg font-bold">No pinned briefs.</p></div>
                   )}
                 </div>
               )}
            </div>
          )}
          {currentView === View.REPORT_ANALYZER && (
             <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] max-w-6xl mx-auto w-full space-y-6">
               <div className="flex gap-2 p-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 w-fit mx-auto">
                 <button onClick={() => setAnalyzerTab('DAILY')} className={`px-8 py-3 rounded-xl font-bold transition-all text-sm ${analyzerTab === 'DAILY' ? 'bg-blue-600 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:text-white'}`}>Shift Analysis</button>
                 <button onClick={() => setAnalyzerTab('PATROL')} className={`px-8 py-3 rounded-xl font-bold transition-all text-sm ${analyzerTab === 'PATROL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:text-white'}`}>Patrol Strategy</button>
               </div>
               <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-6 min-h-0">
                 <div className={`bg-[#1b2537] p-8 rounded-[2.5rem] border border-slate-700/50 flex flex-col shadow-lg ${isOfflineMode ? 'opacity-60 grayscale' : ''}`}>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><FileText className="text-blue-400" /> Dispatch Log Intake</h3>
                    {analyzerTab === 'PATROL' ? (
                       <div className="flex-1 flex flex-col gap-6">
                         <IncidentChart reports={storedReports} />
                         <button disabled={isOfflineMode} onClick={handleAnalyzePatrols} className="w-full bg-blue-600 py-4 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-all disabled:opacity-50">Recalculate Routes</button>
                       </div>
                    ) : (
                      <>
                        <textarea disabled={isOfflineMode} value={reportText} onChange={(e) => setReportText(e.target.value)} className="flex-1 bg-slate-900/50 border border-slate-700 rounded-2xl p-6 text-white focus:outline-none focus:border-blue-500 resize-none shadow-inner disabled:opacity-40" placeholder={isOfflineMode ? "Analysis disabled offline" : "Paste daily dispatch logs..."} />
                        <button onClick={handleAnalyzeReport} disabled={isAnalyzing || !reportText || isOfflineMode} className="mt-6 bg-blue-600 py-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50">{isAnalyzing ? 'Extracting Patterns...' : 'Analyze Shift'}</button>
                      </>
                    )}
                 </div>
                 <div className="bg-[#1b2537] rounded-[2.5rem] border border-slate-700/50 overflow-hidden flex flex-col shadow-xl">
                   <div className="p-6 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center">
                     <h3 className="font-bold text-white">Strategic Assessment</h3>
                     {analysisResult && <ShareButton content={analysisResult} title="Security Brief" />}
                   </div>
                   <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
                     {analysisResult ? <MarkdownRenderer content={analysisResult} /> : <p className="text-center text-slate-600 italic mt-20">Assessments will populate after log intake.</p>}
                   </div>
                 </div>
               </div>
             </div>
          )}
          {currentView === View.WEEKLY_TIPS && (
            <div className="max-w-4xl mx-auto space-y-6 h-full flex flex-col">
              <div className="flex justify-between items-center bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-700/50 shadow-lg">
                <div><h2 className="text-3xl font-bold text-white mb-2">Weekly Briefings</h2><p className="text-slate-400">Strategic automated directives.</p></div>
                <div className="flex gap-4">
                  {weeklyTips[0] && <ShareButton content={weeklyTips[0].content} title={weeklyTips[0].topic} />}
                  <button onClick={handleGenerateWeeklyTip} disabled={isTipLoading || isOfflineMode} className="bg-yellow-600 hover:bg-yellow-700 px-6 py-4 rounded-2xl font-bold text-white shadow-xl flex items-center gap-2 disabled:opacity-50"><Plus /> New Briefing</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-800/40 rounded-[2.5rem] border border-slate-700/50 p-10 shadow-inner scrollbar-hide">
                {weeklyTips[0] ? <MarkdownRenderer content={weeklyTips[0].content} /> : <p className="text-center text-slate-600 italic mt-20">No active briefings.</p>}
              </div>
            </div>
          )}
        </div>

        {/* Global Modals */}
        {showKbModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-[#1b2537] rounded-[3rem] border border-slate-700/50 p-10 w-full max-w-2xl shadow-2xl">
              <div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-bold text-white">Policy Archives</h2><button onClick={() => setShowKbModal(false)} className="p-2 text-slate-500 hover:text-white"><X size={28}/></button></div>
              <div className="space-y-6">
                <input value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} placeholder="Protocol Title..." className="w-full bg-slate-900/50 border border-slate-700/50 p-5 rounded-2xl outline-none text-white focus:border-blue-500 text-lg shadow-inner" />
                <textarea value={newDocContent} onChange={(e) => setNewDocContent(e.target.value)} placeholder="Paste policy text..." className="w-full bg-slate-900/50 border border-slate-700/50 p-6 rounded-2xl h-64 outline-none resize-none text-white focus:border-blue-500 text-lg shadow-inner" />
                <button onClick={handleAddKbDocument} className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 rounded-2xl font-bold text-xl active:scale-95 transition-all shadow-lg">Sync to Core</button>
              </div>
            </div>
          </div>
        )}

        {showSopModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-[#1b2537] rounded-[3rem] border border-slate-700/50 p-10 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[95vh] scrollbar-hide">
              <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-bold text-white">Upload Deployment SOP</h2><button onClick={() => setShowSopModal(false)} className="p-2 text-slate-500 hover:text-white"><X size={28}/></button></div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center gap-3 p-8 border-2 border-dashed border-slate-700 rounded-3xl bg-slate-900/40 hover:border-blue-500/50 hover:bg-slate-800/40 transition-all text-slate-400 hover:text-blue-400 group"
                  >
                    <FileUp size={40} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold">Select PDF, TXT, or Markdown</span>
                    <input ref={fileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">SOP Title</label>
                    <input value={newSopTitle} onChange={(e) => setNewSopTitle(e.target.value)} placeholder="Title of protocol..." className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:border-blue-500 shadow-inner" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Brief Description</label>
                    <input value={newSopDesc} onChange={(e) => setNewSopDesc(e.target.value)} placeholder="What is this SOP for?" className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:border-blue-500 shadow-inner" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Protocol Content</label>
                    <textarea value={newSopContent} onChange={(e) => setNewSopContent(e.target.value)} placeholder="Full SOP text or file content..." className="w-full bg-slate-900/50 border border-slate-700 p-6 rounded-2xl h-48 outline-none resize-none text-white focus:border-blue-500 shadow-inner" />
                  </div>
                </div>

                <button onClick={handleAddCustomSop} disabled={!newSopTitle || !newSopContent} className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl font-bold text-xl active:scale-95 transition-all shadow-lg">Archive to Vault</button>
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-[#1b2537] rounded-[3rem] border border-slate-700/50 p-10 w-full max-w-xl shadow-2xl">
              <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold text-white">CEO Profile</h2><button onClick={() => setShowSettings(false)} className="p-2 text-slate-500 hover:text-white"><X size={28}/></button></div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Name</label><input value={userProfile.name} onChange={(e) => setUserProfile({...userProfile, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:border-blue-500 transition-all font-medium shadow-inner" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label><input value={userProfile.phoneNumber} onChange={(e) => setUserProfile({...userProfile, phoneNumber: e.target.value})} placeholder="+234..." className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:border-blue-500 transition-all font-medium shadow-inner" /></div>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label><input value={userProfile.email} onChange={(e) => setUserProfile({...userProfile, email: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:border-blue-500 transition-all font-medium shadow-inner" /></div>
                
                <button onClick={() => { setShowSettings(false); alert('Profile Updated'); }} className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl font-bold text-lg active:scale-95 shadow-xl transition-all mt-4">Save Strategic Profile</button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Strategic Alert Modal */}
        {showNewTipAlert && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-[#1b2537] rounded-[3.5rem] border border-yellow-500/30 w-full max-w-2xl shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-800/60 bg-slate-900/40 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
                    <Bell size={24} className="text-yellow-400 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Strategic Directive</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">New Automated Intelligence Brief</p>
                  </div>
                </div>
                <button onClick={() => setShowNewTipAlert(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 scrollbar-hide bg-slate-900/10">
                <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-500/20 rounded-full">
                  <ShieldCheck size={14} className="text-blue-400" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Authenticated Protocol</span>
                </div>
                <MarkdownRenderer content={showNewTipAlert.content} />
              </div>

              <div className="p-8 border-t border-slate-800/60 bg-slate-900/40 flex gap-4">
                <button 
                  onClick={() => { setShowNewTipAlert(null); setCurrentView(View.WEEKLY_TIPS); }} 
                  className="flex-1 bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-bold text-slate-200 transition-all flex items-center justify-center gap-3 border border-slate-700"
                >
                  <EyeIcon size={20} />
                  Archive & Review
                </button>
                <div className="flex-1">
                  <ShareButton 
                    content={showNewTipAlert.content} 
                    title={showNewTipAlert.topic} 
                    onPrint={() => { setShowNewTipAlert(null); window.print(); }}
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
