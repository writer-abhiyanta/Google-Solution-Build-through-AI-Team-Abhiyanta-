/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  ChevronRight, 
  Activity, 
  ShieldAlert, 
  Network, 
  BarChart3, 
  Cpu, 
  Layers, 
  Menu,
  X,
  Search,
  Zap,
  Info,
  Sparkles,
  Scale,
  Rocket,
  Globe,
  CheckCircle2,
  AlertCircle,
  XCircle,
  LogOut,
  User as UserIcon,
  GraduationCap,
  Briefcase as WorkIcon,
  ThumbsUp,
  ThumbsDown,
  Star,
  Send,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';

import { analyzeDecision } from './services/gemini';
import { DecisionResult, MicroAgent } from './types';
import { MICRO_AGENTS, getIcon } from './constants';
import { auth, signInWithGoogle, logout, saveDecision, getDecisions, saveFeedback, getUserProfile, onboardUser, onAuthStateChanged, User, createLiveSession, updateLiveSession, subscribeToLiveSession } from './services/firebase';
import { exportToPDF, exportToCSV, exportToJSON } from './services/export';
import { Download, FileText, Table, History, Database, Code, Filter, Calendar, SlidersHorizontal, Users, Share2, Copy, Check, Award } from 'lucide-react';

import { XAITree } from './components/XAITree';

const GoogleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [intuition, setIntuition] = useState(50);
  const [selectedAgent, setSelectedAgent] = useState<MicroAgent>(MICRO_AGENTS[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detectBiases, setDetectBiases] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  // Live Session Features
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [sessionShareUrl, setSessionShareUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const isRemoteUpdateRef = React.useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgentId, setFilterAgentId] = useState<string>('all');
  const [filterMinScore, setFilterMinScore] = useState<number>(0);
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [currentDecisionId, setCurrentDecisionId] = useState<string | null>(null);
  const [feedbackAccuracy, setFeedbackAccuracy] = useState(0);
  const [feedbackUsefulness, setFeedbackUsefulness] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const fetchProfile = async (uid: string) => {
    const profile = await getUserProfile(uid);
    setUserProfile(profile);
    return profile;
  };

  useEffect(() => {
    let unsubHistory: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthInitializing(true);
      if (currentUser) {
        const profile = await fetchProfile(currentUser.uid);
        setUser(currentUser);
        
        // Subscribe to history
        unsubHistory = getDecisions(currentUser.uid, (data) => {
          setHistory(data);
        });
      } else {
        setUser(null);
        setUserProfile(null);
        if (unsubHistory) {
          unsubHistory();
          unsubHistory = undefined;
        }
        setHistory([]);
      }
      setAuthInitializing(false);
    });

    return () => {
      unsubscribe();
      if (unsubHistory) {
        unsubHistory();
      }
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    
    let unsubSession: (() => void) | undefined;
    
    if (session) {
      setLiveSessionId(session);
      unsubSession = subscribeToLiveSession(session, (data) => {
        if (!data) return; // session might be deleted
        // Flag to prevent looping back updates we just received
        isRemoteUpdateRef.current = true;
        if (data.prompt !== undefined) setPrompt(data.prompt);
        if (data.intuition !== undefined) setIntuition(data.intuition);
        if (data.agentId) {
            const agent = MICRO_AGENTS.find(a => a.id === data.agentId);
            if (agent) setSelectedAgent(agent);
        }
        if (data.result !== undefined) setResult(data.result);
        if (user && data.creatorId === user.uid) {
           setIsCreator(true);
        } else {
           setIsCreator(false);
        }
        // Small delay to allow react re-render
        setTimeout(() => { isRemoteUpdateRef.current = false; }, 50);
      });
    }

    return () => {
      if (unsubSession) unsubSession();
    };
  }, [user]);

  // Sync back local changes if in session
  const debouncedSync = React.useMemo(() => {
     let timeout: any;
     return (sessionUrlId: string, payload: any) => {
        if (isRemoteUpdateRef.current) return;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          updateLiveSession(sessionUrlId, payload);
        }, 300);
     };
  }, []);

  useEffect(() => {
     if (liveSessionId && !isRemoteUpdateRef.current) {
        debouncedSync(liveSessionId, {
           prompt,
           intuition,
           agentId: selectedAgent.id,
           result
        });
     }
  }, [prompt, intuition, selectedAgent, result, liveSessionId, debouncedSync]);

  const handleLogin = async (requestedRole: 'student' | 'employee') => {
    try {
      setLoginLoading(true);
      setAuthError(null);
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        let profile = await fetchProfile(loggedInUser.uid);
        
        if (!profile || profile.role !== requestedRole) {
          // If the profile doesn't exist or role is mismatched, fix it
          await onboardUser(loggedInUser, requestedRole);
          profile = await fetchProfile(loggedInUser.uid);
        }

        // Just to be absolutely sure the UI updates sequentially
        setUser(loggedInUser);
        setUserProfile(profile);
      }
    } catch (error: any) {
      if (error?.code === 'auth/unauthorized-domain') {
        setAuthError("This domain is not authorized. If you deployed this app, add this URL to the Firebase Console -> Authentication -> Authorized Domains.");
      } else if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/popup-blocked') {
         setAuthError("Sign-in popup was blocked or closed. Please try again. If the issue persists in this preview, try opening the app in a new tab.");
      } else {
        setAuthError(error.message || "An error occurred during sign in.");
      }
      console.error(error);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setShowHistory(false);
    setAnalyzeError(null);
    try {
      const data = await analyzeDecision(prompt, 'Advanced Reasoning', intuition, selectedAgent.domain, detectBiases);
      setResult(data);
      setFeedbackSubmitted(false);
      setFeedbackAccuracy(0);
      setFeedbackUsefulness(0);
      setFeedbackComment('');
      
      if (user) {
        const id = await saveDecision(user.uid, prompt, selectedAgent.id, intuition, data);
        setCurrentDecisionId(id);
      }
    } catch (error: any) {
      console.error(error);
      let errMsg = error.message || "An error occurred during analysis.";
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed && parsed.error) errMsg = parsed.error;
      } catch (e) {}
      setAnalyzeError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const q = searchQuery.toLowerCase();
    const agent = MICRO_AGENTS.find(a => a.id === item.agentId)?.name.toLowerCase() || '';
    if (q && !item.prompt.toLowerCase().includes(q) && !agent.includes(q)) return false;

    if (filterAgentId !== 'all' && item.agentId !== filterAgentId) return false;

    if (item.result?.finalScore !== undefined) {
      if (item.result.finalScore < filterMinScore) return false;
    }

    if (filterDateRange !== 'all') {
      const date = item.createdAt?.toMillis ? item.createdAt.toMillis() : (item.createdAt?.seconds ? item.createdAt.seconds * 1000 : item.createdAt);
      if (!date) return true;
      const now = Date.now();
      const diff = now - date;
      const day = 24 * 60 * 60 * 1000;
      if (filterDateRange === 'today' && diff > day) return false;
      if (filterDateRange === 'week' && diff > 7 * day) return false;
      if (filterDateRange === 'month' && diff > 30 * day) return false;
    }

    return true;
  });

  const selectFromHistory = (item: any) => {
    setPrompt(item.prompt);
    setIntuition(item.intuition);
    const agent = MICRO_AGENTS.find(a => a.id === item.agentId);
    if (agent) setSelectedAgent(agent);
    setResult(item.result);
    setCurrentDecisionId(item.id);
    setFeedbackSubmitted(false);
    setFeedbackAccuracy(0);
    setFeedbackUsefulness(0);
    setFeedbackComment('');
    setShowHistory(false);
  };

  const handleSubmitFeedback = async () => {
    if (!user || !currentDecisionId || (feedbackAccuracy === 0 && feedbackUsefulness === 0)) return;
    setFeedbackLoading(true);
    try {
      await saveFeedback(user.uid, currentDecisionId, feedbackAccuracy, feedbackUsefulness, feedbackComment);
      setFeedbackSubmitted(true);
    } catch (error) {
      console.error(error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (authInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex shadow-inner items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !userProfile?.role) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-600/20 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10"
        >
          {/* Left Side: Branding & Illustration */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                <Brain className="text-white w-8 h-8" />
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tight text-white">Neutral-IQ</h1>
                <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-xs">Decision Intelligence Engine</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              <h2 className="text-4xl lg:text-6xl font-bold leading-tight">
                Decide with <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Precision.</span><br />
                Think with <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Clarity.</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
                The world's first open-innovation platform for cross-disciplinary decision making. Powered by adversarial swarm intelligence.
              </p>
            </motion.div>

            <motion.div 
              className="grid grid-cols-2 gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.1, delayChildren: 0.6 } }
              }}
            >
              {[
                { icon: <ShieldAlert className="w-4 h-4" />, label: "Bias Protection" },
                { icon: <Network className="w-4 h-4" />, label: "Adversarial Swarm" },
                { icon: <Search className="w-4 h-4" />, label: "Explainable logic" },
                { icon: <Zap className="w-4 h-4" />, label: "Instant Simulation" }
              ].map((feature, i) => (
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, scale: 0.9 },
                    visible: { opacity: 1, scale: 1 }
                  }}
                  key={i} 
                  className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center gap-3 backdrop-blur-sm"
                >
                  <div className="text-emerald-400">{feature.icon}</div>
                  <span className="text-xs font-semibold text-slate-300">{feature.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Side: Login Card */}
          <div className="flex justify-center lg:justify-end">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-emerald-500/10 p-10 rounded-[2.5rem] shadow-2xl shadow-emerald-500/5 relative group"
            >
              <div className="absolute top-0 right-0 p-8">
                <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
              </div>
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Initiate Synchronization
                </h3>
                <p className="text-slate-500 text-sm">
                  Choose your identity profile to begin.
                </p>
              </div>

              {authError && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-300">{authError}</p>
                </div>
              )}
              
              <div className="space-y-4">
                 <button 
                   onClick={() => handleLogin('student')}
                   disabled={loginLoading}
                   className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded-2xl font-bold flex items-center justify-center gap-4 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 group relative overflow-hidden"
                 >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    {loginLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <GoogleIcon />
                        <GraduationCap className="w-5 h-5 group-hover:rotate-12 transition-transform relative z-10 flex-shrink-0" />
                        <span className="relative z-10">Login as Student</span>
                      </>
                    )}
                 </button>
                 <button 
                   onClick={() => handleLogin('employee')}
                   disabled={loginLoading}
                   className="w-full py-4 bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:bg-slate-900 disabled:cursor-not-allowed text-white rounded-2xl font-bold flex items-center justify-center gap-4 transition-all active:scale-95 shadow-xl group"
                 >
                    {loginLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <GoogleIcon />
                        <WorkIcon className="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0 text-amber-400" />
                        <span>Login as Employee</span>
                      </>
                    )}
                  </button>
              </div>
              
              <div className="mt-10 flex items-center justify-center gap-2 text-slate-600">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">End-to-End Decision Integrity</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sidebar - Micro-Agent Marketplace */}
      <aside 
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-72 bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Brain className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Neutral-IQ</h1>
            <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">Decision Engine</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Marketplace</span>
            <div className="group relative">
               <Info className="w-3 h-3 cursor-help text-slate-600 hover:text-slate-400" />
               <div className="absolute left-full ml-2 w-48 p-2 bg-slate-800 text-[10px] text-slate-300 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                 Marketplace of domain-specific reasoning engines.
               </div>
            </div>
          </div>
          {MICRO_AGENTS.map((agent) => (
            <button
              key={agent.id}
              onClick={() => { setSelectedAgent(agent); setShowHistory(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                selectedAgent.id === agent.id && !showHistory
                  ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-transparent'
              }`}
            >
              <div className={`p-2 rounded-md ${selectedAgent.id === agent.id && !showHistory ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-100'}`}>
                {getIcon(agent.icon)}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{agent.name}</div>
                <div className="text-[10px] opacity-60 uppercase tracking-tighter">{agent.domain}</div>
              </div>
              
              {/* Tooltip on hover */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Switch to {agent.name}
              </div>
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-slate-800">
             <button
                onClick={() => setShowHistory(!showHistory)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                  showHistory 
                    ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-transparent'
                }`}
              >
                <div className={`p-2 rounded-md ${showHistory ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-100'}`}>
                  <History className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">Brain Storage</div>
                  <div className="text-[10px] opacity-60 uppercase tracking-tighter">Neural backup</div>
                </div>
              </button>
          </div>
        </div>

          {/* User Info in Sidebar */}
          <div className="p-4 border-t border-slate-800">
             <div className="flex items-center gap-3 mb-4">
                <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-emerald-500/30" />
                <div className="overflow-hidden">
                   <div className="text-xs font-bold text-white truncate">{user.displayName}</div>
                   <div className="text-[10px] text-emerald-400/70 font-mono uppercase">Sync ID: {user.uid.slice(0, 8)}</div>
                </div>
             </div>
             <button 
               onClick={() => logout()}
               className="w-full py-2 bg-slate-800 hover:bg-rose-900/30 hover:text-rose-400 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2"
             >
                <LogOut className="w-3 h-3" /> Terminate Session
             </button>
          </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-0'} p-8 max-w-7xl mx-auto min-h-screen flex flex-col`}>
        
        {/* Top Navigation Bar */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 group"
            >
              {sidebarOpen ? <X className="group-hover:rotate-90 transition-transform" /> : <Menu />}
            </button>
            <div className="relative flex-1 md:w-80 lg:w-96 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search decisions by prompt or agent..." 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value) setShowHistory(true);
                  }}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
            </div>
          </div>
          
          <div className="flex items-center gap-6 self-end md:self-auto no-underline">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-black">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              SENSORS: <span className="text-emerald-400">NOMINAL</span>
            </div>
            {liveSessionId && (
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-900 border border-indigo-500 rounded-full text-[10px] font-black text-indigo-200">
                <Users className="w-3 h-3 text-indigo-400 animate-pulse" />
                <span>LIVE SESSION ACTIVE</span>
              </div>
            )}
            {!liveSessionId ? (
              <button
                onClick={async () => {
                   if (!user) return;
                   const id = await createLiveSession(user.uid, prompt, selectedAgent.id, intuition);
                   if (id) {
                     setLiveSessionId(id);
                     setIsCreator(true);
                     const url = new URL(window.location.href);
                     url.searchParams.set('session', id);
                     window.history.replaceState({}, '', url.toString());
                   }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-400 rounded-full text-[10px] font-black transition-colors"
                title="Start a collaborative session"
              >
                <Share2 className="w-3 h-3" />
                START LIVE SESSION
              </button>
            ) : (
                <button
                onClick={() => {
                   const url = new URL(window.location.href);
                   url.searchParams.set('session', liveSessionId);
                   navigator.clipboard.writeText(url.toString());
                   setCopiedUrl(true);
                   setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 rounded-full text-[10px] font-black text-white transition-colors"
              >
                {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedUrl ? 'COPIED LINK' : 'SHARE LINK'}
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner group hover:border-emerald-500 transition-colors cursor-help">
              <Zap className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </header>

        {showHistory ? (
           <section className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                 <h2 className="text-2xl font-black flex items-center gap-3 italic text-emerald-400">
                   <History className="w-8 h-8" />
                   {searchQuery ? `MATCHES: "${searchQuery}"` : 'BRAIN_STORAGE_INDEX'}
                 </h2>
                 <button 
                  onClick={() => setShowHistory(false)}
                  className="text-[10px] font-black text-slate-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
                 >
                   [EXIT_STORAGE]
                 </button>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                 <div className="flex-1 flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-widest"><Filter className="w-3 h-3"/> Agent ID</label>
                    <div className="relative">
                       <select 
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-3 pr-8 text-xs text-slate-200 appearance-none focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
                          value={filterAgentId}
                          onChange={e => setFilterAgentId(e.target.value)}
                       >
                         <option value="all">ALL AGENTS</option>
                         {MICRO_AGENTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                       </select>
                       <ChevronRight className="w-3 h-3 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                 </div>
                 
                 <div className="flex-1 flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-widest"><Calendar className="w-3 h-3"/> Timeframe</label>
                    <div className="relative">
                       <select 
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-3 pr-8 text-xs text-slate-200 appearance-none focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
                          value={filterDateRange}
                          onChange={e => setFilterDateRange(e.target.value as any)}
                       >
                         <option value="all">ALL TIME</option>
                         <option value="today">PAST 24 HOURS</option>
                         <option value="week">PAST 7 DAYS</option>
                         <option value="month">PAST 30 DAYS</option>
                       </select>
                       <ChevronRight className="w-3 h-3 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                 </div>

                 <div className="flex-1 flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 flex items-center justify-between uppercase tracking-widest">
                      <span className="flex items-center gap-2"><SlidersHorizontal className="w-3 h-3"/> Min Confidence</span>
                      <span className="text-emerald-400">{filterMinScore}%</span>
                    </label>
                    <div className="flex items-center h-full pb-1">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={filterMinScore}
                        onChange={e => setFilterMinScore(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHistory.length > 0 ? filteredHistory.map((item) => {
                  const agent = MICRO_AGENTS.find(a => a.id === item.agentId);
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={item.id}
                      onClick={() => selectFromHistory(item)}
                      className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-emerald-500/40 cursor-pointer transition-all group hover:bg-slate-800/50 hover:shadow-2xl hover:shadow-emerald-500/5"
                    >
                       <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-slate-800 rounded-lg text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            {agent ? getIcon(agent.icon) : <Zap className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-white uppercase tracking-widest">{agent?.name || 'Unknown Agent'}</div>
                            <div className="text-[10px] text-slate-500 font-mono italic">{item.createdAt ? new Date(item.createdAt?.toMillis ? item.createdAt.toMillis() : (item.createdAt?.seconds ? item.createdAt.seconds * 1000 : item.createdAt)).toLocaleDateString() : 'Just now'}</div>
                          </div>
                          <div className="ml-auto text-emerald-400 font-black text-xs">
                            {item.result?.finalScore || 0}%
                          </div>
                       </div>
                       <p className="text-xs text-slate-300 line-clamp-3 mb-4 leading-relaxed italic">"{item.prompt}"</p>
                       <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                          <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{item.domain || agent?.domain}</span>
                          <div className="flex items-center gap-2">
                             <button 
                               onClick={(e) => { e.stopPropagation(); exportToPDF(item.prompt, agent?.name || 'Agent', item.result); }}
                               className="p-1.5 hover:bg-slate-800 rounded-md text-slate-500 hover:text-emerald-400 transition-colors"
                               title="Export PDF"
                             >
                                <FileText className="w-3 h-3" />
                             </button>
                             <button 
                               onClick={(e) => { e.stopPropagation(); exportToCSV(item.prompt, agent?.name || 'Agent', item.result); }}
                               className="p-1.5 hover:bg-slate-800 rounded-md text-slate-500 hover:text-teal-400 transition-colors"
                               title="Export CSV"
                             >
                                <Table className="w-3 h-3" />
                             </button>
                             <button 
                               onClick={(e) => { e.stopPropagation(); exportToJSON(item.prompt, agent?.name || 'Agent', item.result); }}
                               className="p-1.5 hover:bg-slate-800 rounded-md text-slate-500 hover:text-emerald-400 transition-colors"
                               title="Export JSON Neural Schema"
                             >
                                <Code className="w-3 h-3" />
                             </button>
                             <div className="w-[1px] h-3 bg-slate-800 mx-1"></div>
                             <span className="text-[10px] text-emerald-400 font-black flex items-center gap-1 group-hover:underline uppercase tracking-tighter">
                                LOAD_SYNC <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                             </span>
                          </div>
                       </div>
                    </motion.div>
                  )
                }) : (
                  <div className="col-span-full py-32 text-center space-y-6">
                    <div className="w-20 h-20 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-700 animate-pulse">
                       <Search className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">NO ARCHIVAL DATA MATCHES</p>
                      <p className="text-[10px] text-slate-600 font-mono">Verify indexing parameters and try again.</p>
                    </div>
                  </div>
                )}
              </div>
           </section>
        ) : (
          <>
            {/* Action Center */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          
          {/* Input Box */}
          <div className="lg:col-span-8 space-y-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-slate-900 rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-semibold">Decision Parameters</h2>
                </div>
                
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your decision context, query, or problem statement..."
                  className="w-full h-40 bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none transition-all"
                />

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                   <div className="flex items-center gap-3">
                      <div className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${detectBiases ? 'bg-emerald-500' : 'bg-slate-700'}`} onClick={() => setDetectBiases(!detectBiases)}>
                         <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${detectBiases ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${detectBiases ? 'text-emerald-400' : 'text-slate-500'}`}>
                        Cognitive Bias Protection {detectBiases ? 'Active' : 'Disabled'}
                      </span>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <Globe className="w-3 h-3" /> DATA_SOURCE: GLOBAL_FEDERATED
                   </div>
                </div>

                <div className="mt-8 flex flex-col md:flex-row md:items-center gap-8">
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between text-xs font-medium uppercase tracking-wider">
                      <span className="text-slate-400">Strict Logic</span>
                      <span className="text-emerald-400">Abstract Intuition</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={intuition}
                      onChange={(e) => setIntuition(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="text-[10px] text-slate-500 text-center uppercase tracking-widest">
                       Setting: {intuition}% Intuition Mode
                    </div>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={loading || !prompt.trim()}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 rounded-xl font-bold text-white shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-3 active:scale-95"
                  >
                    {loading ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                    ) : (
                      <Cpu className="w-5 h-5" />
                    )}
                    Synchronize Thoughts
                  </button>
                </div>
                
                {analyzeError && (
                  <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-300">
                      <strong>Analysis Failed:</strong> {analyzeError}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats/Agent Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-tight">
                <Info className="w-4 h-4" /> Active Micro-Agent
              </h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
                   <div className="scale-150 text-emerald-400">
                    {getIcon(selectedAgent.icon)}
                   </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold">{selectedAgent.name}</h4>
                  <p className="text-xs text-emerald-400">{selectedAgent.domain} Expert</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                {selectedAgent.description} This agent provides specialized knowledge hooks for the core engine.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-emerald-900/20 rounded-xl border border-emerald-500/20 p-6">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2 uppercase tracking-tight">
                <Sparkles className="w-4 h-4" /> Swarm Logic
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aetheris leverages an adversarial debating system where three distinct personas compete to provide the most robust conclusion.
              </p>
            </div>
          </div>
        </section>

        {/* Results Area */}
        <AnimatePresence mode="wait">
          {loading ? (
             <motion.div 
               key="loading"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               className="flex flex-col items-center justify-center py-20"
             >
                <div className="relative">
                  <div className="w-20 h-20 border-w-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                  <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-400 w-8 h-8 animate-pulse" />
                </div>
                <p className="mt-6 text-slate-400 font-medium animate-pulse">Running Adversarial Debate Swarm...</p>
             </motion.div>
          ) : result ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8 pb-20"
            >
              {/* Consensus Hero */}
              <div className="relative p-[1px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-300 rounded-2xl overflow-hidden">
                <div className="bg-slate-900 rounded-[15px] p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div className="space-y-1">
                      <div className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Final Consensus</div>
                      <h2 className="text-3xl font-black text-white">Consensual Decision Reach</h2>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Confidence</div>
                        <div className="text-2xl font-black text-emerald-400">{result?.finalScore || 0}%</div>
                      </div>
                      <div className="w-[2px] h-10 bg-slate-800"></div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Alignment</div>
                        <div className={`text-sm font-black transition-colors ${
                          result?.overallAlignment === 'High' ? 'text-emerald-400' :
                          result?.overallAlignment === 'Medium' ? 'text-amber-400' :
                          'text-rose-400'
                        }`}>
                          {typeof result?.overallAlignment === 'string' ? result.overallAlignment : 'Unknown'}
                        </div>
                      </div>
                      <div className="w-[2px] h-10 bg-slate-800"></div>
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Activity className="w-8 h-8 text-emerald-400" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Export Options */}
                  <div className="flex flex-wrap items-center gap-4 mt-6 pt-6 border-t border-slate-800/50">
                    <button 
                      onClick={() => exportToPDF(prompt, selectedAgent.name, result)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-400 transition-all group"
                    >
                      <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" /> Intelligence Report (PDF)
                    </button>
                    <button 
                      onClick={() => exportToCSV(prompt, selectedAgent.name, result)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-400 transition-all group"
                    >
                      <Table className="w-4 h-4 group-hover:scale-110 transition-transform" /> Data Set (CSV)
                    </button>
                    <button 
                      onClick={() => exportToJSON(prompt, selectedAgent.name, result)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400/70 hover:text-emerald-400 transition-all group"
                    >
                      <Database className="w-4 h-4 group-hover:scale-110 transition-transform" /> Neural Schema (JSON)
                    </button>
                    <div className="hidden md:block ml-auto text-[10px] text-slate-600 font-mono italic">
                      SECURE_EXPORT_PROTOCOL_V5.0
                    </div>
                  </div>

                  <p className="text-lg text-slate-200 mt-8 leading-relaxed">
                    {typeof result?.consensus === 'string' ? result.consensus : JSON.stringify(result?.consensus || '')}
                  </p>
                  
                  {Array.isArray(result?.grades) && result.grades.length > 0 && (
                    <div className="mt-10 border-t border-slate-800 pt-8">
                       <div className="flex items-center gap-3 mb-6">
                         <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                           <Award className="w-5 h-5" />
                         </div>
                         <h3 className="text-xl font-bold">AI Evaluation Scorecard</h3>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {result.grades.map((grade, idx) => (
                             <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/30 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                   <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{typeof grade?.category === 'string' ? grade.category : 'Metric'}</div>
                                   <div className="text-sm font-black text-white">
                                      <span className={grade?.score >= 8 ? 'text-emerald-400' : grade?.score >= 5 ? 'text-amber-400' : 'text-rose-400'}>{grade?.score || 0}</span>
                                      <span className="text-slate-600">/10</span>
                                   </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden mb-4">
                                   <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${((grade?.score || 0) / 10) * 100}%` }}
                                      transition={{ duration: 1, delay: 0.2 + (idx * 0.1) }}
                                      className={`h-full ${grade?.score >= 8 ? 'bg-emerald-500' : grade?.score >= 5 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                   />
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed normal-case">
                                   {typeof grade?.feedback === 'string' ? grade.feedback : JSON.stringify(grade?.feedback || '')}
                                </p>
                             </div>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Swarm Analytics Chart */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold">Adversarial Variance Analysis</h3>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono tracking-widest">
                    SYNC_RESOLUTION: DYNAMIC_WEIGHTING
                  </div>
                </div>

                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Array.isArray(result.swarm) ? result.swarm : []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="persona" 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => value.toUpperCase()}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        cursor={{ fill: '#1e293b', opacity: 0.4 }}
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: '1px solid #1e293b', 
                          borderRadius: '12px', 
                          fontSize: '12px',
                          color: '#fff'
                        }}
                        itemStyle={{ fontWeight: 'bold' }}
                        formatter={(value: number) => [`${value}%`, 'Contribution Score']}
                      />
                      <Bar 
                        dataKey="score" 
                        radius={[6, 6, 0, 0]} 
                        barSize={60}
                        animationDuration={1500}
                      >
                        {Array.isArray(result.swarm) && result.swarm.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry?.persona === 'Pragmatist' ? '#10b981' : 
                              entry?.persona === 'Skeptic' ? '#f43f5e' : 
                              '#a855f7'
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-8">
                  {(Array.isArray(result.swarm) ? result.swarm : []).map((s, i) => (
                    <div key={s?.persona || i} className="text-center group">
                       <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter mb-1 transition-colors group-hover:text-slate-400">{typeof s?.persona === 'string' ? s.persona : 'Agent'}</div>
                       <div className={`h-1 w-full rounded-full opacity-20 ${
                         s?.persona === 'Pragmatist' ? 'bg-emerald-500' : 
                         s?.persona === 'Skeptic' ? 'bg-rose-500' : 
                         'bg-purple-500'
                       }`}></div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Swarm Debate */}
              <div className="flex flex-col gap-6">
                {(Array.isArray(result.swarm) ? result.swarm : []).map((member, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={typeof member?.persona === 'string' ? member.persona : i} 
                    className="bg-slate-900 border border-slate-800 p-8 rounded-2xl relative group overflow-hidden flex flex-col gap-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <h4 className="font-bold text-2xl flex items-center gap-3 text-white">
                           {member?.persona === 'Pragmatist' && <BarChart3 className="w-7 h-7 text-emerald-400" />}
                           {member?.persona === 'Skeptic' && <ShieldAlert className="w-7 h-7 text-rose-400" />}
                           {member?.persona === 'Creative' && <Sparkles className="w-7 h-7 text-purple-400" />}
                           {typeof member?.persona === 'string' ? member.persona : 'Agent'}
                        </h4>
                        <div className="flex items-center gap-3 bg-slate-950/50 p-2 rounded-xl border border-slate-800/50">
                           <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-wider ${
                             member?.verdict === 'Supportive' ? 'bg-emerald-500/10 text-emerald-400' :
                             member?.verdict === 'Critical' ? 'bg-rose-500/10 text-rose-400' :
                             'bg-amber-500/10 text-amber-400'
                           }`}>
                             {typeof member?.verdict === 'string' ? member.verdict : 'Unknown'}
                           </span>
                           <div className="h-4 w-[1px] bg-slate-800"></div>
                           <div className="flex items-center gap-2 pr-2">
                             <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                               member?.alignment === 'High' ? 'text-emerald-400' :
                               member?.alignment === 'Medium' ? 'text-amber-400' :
                               'text-rose-400'
                             }`}>
                               {typeof member?.alignment === 'string' ? member.alignment : 'Unknown'} Alignment
                             </span>
                             <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-current" style={{ color: 
                               member?.alignment === 'High' ? '#10b981' : 
                               member?.alignment === 'Medium' ? '#f59e0b' : 
                               '#f43f5e' 
                             }}></div>
                           </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] block mb-1">Neural Impact</span>
                          <div className="text-3xl font-black text-white">{member.score}<span className="text-xs text-slate-600 font-normal ml-1">/100</span></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500/50 to-transparent rounded-full opacity-30"></div>
                      <p className="text-lg text-slate-300 leading-relaxed italic pl-6 py-1">"{typeof member?.thought === 'string' ? member.thought : JSON.stringify(member?.thought || '')}"</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Middle Section: Bias & XAI Tree */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Bias Detector */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold">Cognitive Bias Shield</h3>
                  </div>
                  <div className="space-y-4">
                    {Array.isArray(result.biases) && result.biases.length > 0 ? result.biases.map((bias, i) => (
                      <div key={typeof bias?.name === 'string' ? bias.name : i} className="p-4 bg-slate-950 rounded-lg border border-slate-800 group hover:border-rose-500/30 transition-colors">
                        <h4 className="text-rose-400 font-bold flex items-center justify-between relative group/bias">
                          <span className="cursor-help underline decoration-rose-500/30 underline-offset-4 decoration-dotted group-hover:decoration-rose-500">
                            {typeof bias?.name === 'string' ? bias.name : 'Unknown Bias'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-rose-400 transition-transform group-hover:translate-x-1" />
                          
                          {/* Detailed Tooltip */}
                          <div className="absolute bottom-full left-0 mb-4 w-72 p-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl opacity-0 group-hover/bias:opacity-100 transition-all pointer-events-none z-50 translate-y-2 group-hover/bias:translate-y-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 bg-rose-500/10 rounded-md text-rose-400">
                                <Info className="w-3 h-3" />
                              </div>
                              <div className="text-[10px] text-rose-400 font-black uppercase tracking-widest">Bias Definition</div>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed font-medium normal-case">
                              {typeof bias?.definition === 'string' ? bias.definition : JSON.stringify(bias?.definition || 'A cognitive shortcut that can lead to systematic deviations from logic or objective judgment.')}
                            </p>
                            <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-slate-900 border-r border-b border-slate-700 rotate-45"></div>
                          </div>
                        </h4>
                        <p className="text-sm text-slate-200 mt-2">{typeof bias?.description === 'string' ? bias.description : JSON.stringify(bias?.description || '')}</p>
                        <div className="mt-3 text-[10px] text-slate-500 font-mono">DETECTED IN: {typeof bias?.detectedIn === 'string' ? bias.detectedIn : JSON.stringify(bias?.detectedIn || '')}</div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-slate-500 text-sm italic">
                        No significant cognitive biases detected in current synchronization.
                      </div>
                    )}
                  </div>
                </div>

                {/* XAI Tree */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <Network className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold">Explainable AI (XAI) Node</h3>
                  </div>
                  
                  <div className="flex-1 bg-slate-950 rounded-lg p-6 border border-slate-800 overflow-auto max-h-[500px]">
                     {result.xaiTree && <XAITree node={result.xaiTree} />}
                  </div>
                  {/* END_XAI */}
                </div>
              </div>

              {/* Simulation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                        <Search className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold">What-If Multi-Modal Simulator</h3>
                    </div>
                  </div>

                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={(Array.isArray(result.simulation?.labels) ? result.simulation.labels : []).map((l, i) => ({ name: l, value: Array.isArray(result.simulation?.data) ? result.simulation.data[i] || 0 : 0 }))}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#10b981' }}
                        />
                        <Legend verticalAlign="top" height={36}/>
                        <Area 
                          name="Projected Outcome"
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10b981" 
                          fillOpacity={1} 
                          fill="url(#colorValue)" 
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <Scale className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold">Ethical Guardrails</h3>
                   </div>
                   <div className="space-y-4">
                      {(Array.isArray(result.ethicalChecks) ? result.ethicalChecks : []).map((check, i) => (
                        <div key={typeof check?.framework === 'string' ? check.framework : i} className="bg-slate-950 p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all group">
                           <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${
                                  check?.alignment === 'High' ? 'bg-emerald-500/10 text-emerald-400' :
                                  check?.alignment === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                                  'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {check?.alignment === 'High' ? <CheckCircle2 className="w-4 h-4" /> :
                                   check?.alignment === 'Medium' ? <AlertCircle className="w-4 h-4" /> :
                                   <XCircle className="w-4 h-4" />}
                                </div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{typeof check?.framework === 'string' ? check.framework : 'Framework'}</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                check?.alignment === 'High' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                check?.alignment === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {typeof check?.alignment === 'string' ? check.alignment : 'Unknown'} ALIGNMENT
                              </span>
                           </div>
                           <div className="space-y-3">
                              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                                <p className="text-[11px] text-slate-400 font-medium italic">
                                  {typeof check?.frameworkDescription === 'string' ? check.frameworkDescription : JSON.stringify(check?.frameworkDescription || '')}
                                </p>
                              </div>
                              <h5 className="text-sm font-bold text-slate-100 leading-snug group-hover:text-emerald-400 transition-colors">
                                {typeof check?.summary === 'string' ? check.summary : JSON.stringify(check?.summary || '')}
                              </h5>
                              <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800/30">
                                <p className="text-xs text-slate-300 leading-relaxed">
                                  {typeof check?.analysis === 'string' ? check.analysis : JSON.stringify(check?.analysis || '')}
                                </p>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              {/* Emerging Tech: Biometric & Neuromorphic */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <Activity className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold">Ambient IoT & Biometrics</h3>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                       <span className="text-[10px] text-emerald-500 font-mono tracking-widest uppercase">Live Sync Active</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-center items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">Cognitive Load</span>
                        <div className="text-xl font-black text-white">42%</div>
                        <div className="w-full h-1 bg-slate-800 rounded-full mt-2"><div className="h-full bg-emerald-500 rounded-full w-[42%]"></div></div>
                     </div>
                     <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-center items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">Micro-Stress</span>
                        <div className="text-xl font-black text-emerald-400">Low</div>
                        <div className="w-full h-1 bg-slate-800 rounded-full mt-2"><div className="h-full bg-emerald-400 rounded-full w-[20%]"></div></div>
                     </div>
                     <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-center items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">Visual Focus</span>
                        <div className="text-xl font-black text-white">Sharp</div>
                        <div className="w-full h-1 bg-slate-800 rounded-full mt-2"><div className="h-full bg-teal-500 rounded-full w-[85%]"></div></div>
                     </div>
                     <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-center items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">Edge IoT Nodes</span>
                        <div className="text-xl font-black text-teal-400">3 Active</div>
                        <div className="w-full h-1 bg-slate-800 rounded-full mt-2"><div className="h-full bg-teal-500 rounded-full w-[100%]"></div></div>
                     </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <Brain className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold">Neuromorphic Adaptation</h3>
                  </div>
                  <div className="space-y-6">
                     <p className="text-sm text-slate-400 leading-relaxed">
                        Output complexity has been automatically modulated based on real-time cognitive state analysis. Delivery is optimized for <strong className="text-slate-200">Focused Flow State</strong>.
                     </p>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs">
                           <span className="text-slate-400 font-bold uppercase tracking-widest">Vocabulary Density</span>
                           <span className="text-emerald-400 font-mono">EXPANSIVE (85%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                           <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 w-[85%]"></div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                           <span className="text-slate-400 font-bold uppercase tracking-widest">Structural Formatting</span>
                           <span className="text-teal-400 font-mono">DEEP_DIVE (Level 4)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                           <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-300 w-[70%]"></div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              {/* Quantum Probability Map */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <Network className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold">Quantum-Inspired Probability Cloud</h3>
                    </div>
                  </div>
                  <div className="relative w-full h-[400px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
                     <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.8),transparent_70%)]"></div>
                     <div className="relative w-full h-full">
                       {/* Faux Quantum Nodes */}
                       {[...Array(30)].map((_, i) => (
                         <motion.div
                           key={`quantum-node-${i}`}
                           className="absolute rounded-full"
                           style={{
                             width: Math.random() * 60 + 10 + 'px',
                             height: Math.random() * 60 + 10 + 'px',
                             backgroundColor: ['#10b981', '#34d399', '#059669', '#6ee7b7', '#047857'][Math.floor(Math.random() * 5)],
                             filter: 'blur(8px)',
                             top: Math.random() * 100 + '%',
                             left: Math.random() * 100 + '%',
                           }}
                           animate={{
                             top: [`${Math.random() * 100}%`, `${Math.random() * 100}%`, `${Math.random() * 100}%`],
                             left: [`${Math.random() * 100}%`, `${Math.random() * 100}%`, `${Math.random() * 100}%`],
                             scale: [1, 1.8, 1],
                             opacity: [0.2, 0.8, 0.2]
                           }}
                           transition={{
                             duration: Math.random() * 20 + 20,
                             repeat: Infinity,
                             ease: "linear",
                             times: [0, 0.5, 1]
                           }}
                         />
                       ))}
                     </div>
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-slate-900/80 backdrop-blur-md px-8 py-6 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col items-center gap-3">
                           <span className="text-emerald-400 font-bold uppercase tracking-[0.2em] text-xs flex items-center gap-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Primary Timeline Locked
                           </span>
                           <span className="text-5xl font-black text-white">{result?.finalScore || 0}% <span className="text-sm text-slate-500 font-normal">viability</span></span>
                        </div>
                     </div>
                     <div className="absolute bottom-4 left-4 text-[10px] font-mono text-slate-500 uppercase">
                        Visualizing 1,024 multidimensional variable interactions
                     </div>
                     <div className="absolute top-4 right-4 flex items-center gap-2">
                        <span className="px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-[10px] text-emerald-400">STATE: SUPERPOSITION</span>
                     </div>
                  </div>
              </div>

              {/* Strategic Roadmap */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
                 <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                      <Rocket className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold">Strategic Implementation Roadmap</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    <div className="hidden md:block absolute top-[44px] left-0 w-full h-[2px] bg-slate-800 z-0"></div>
                    {(Array.isArray(result.roadmap) ? result.roadmap : []).map((step, idx) => (
                      <div key={typeof step?.phase === 'string' ? step.phase : idx} className="relative z-10 flex flex-col items-center text-center">
                         <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-4 border-emerald-500/50 flex items-center justify-center font-black text-emerald-400 text-lg mb-4 shadow-xl shadow-emerald-500/20">
                            {idx + 1}
                         </div>
                         <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-widest">{typeof step?.phase === 'string' ? step.phase : 'Phase ' + (idx + 1)}</h4>
                         <p className="text-sm text-slate-300 mb-4">{typeof step?.action === 'string' ? step.action : JSON.stringify(step?.action || '')}</p>
                         <div className="w-full p-3 bg-slate-950/50 rounded-lg border border-slate-800 flex items-center gap-2">
                           <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                           <span className="text-[10px] text-rose-400 font-medium text-left">CRITICAL RISK: {typeof step?.risk === 'string' ? step.risk : JSON.stringify(step?.risk || '')}</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

               {/* Feedback Mechanism */}
               <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 mb-12 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3 mb-10 pb-6 border-b border-slate-800/50">
                     <div className="flex items-center gap-3">
                       <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                         <MessageSquare className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="text-xl font-bold text-white">Feedback Loop</h3>
                         <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Continuous Improvement Protocol v1.0</p>
                       </div>
                     </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {feedbackSubmitted ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-500/5 border border-emerald-500/20 p-12 rounded-2xl text-center"
                      >
                         <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                            <CheckCircle2 className="w-8 h-8" />
                         </div>
                         <h4 className="text-xl font-bold text-white mb-3">Protocol Synchronized</h4>
                         <p className="text-sm text-slate-400 max-w-md mx-auto">Your feedback has been logged into the neural refinement engine. These data points will be used to calibrate future adversarial swarm simulations.</p>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-12"
                      >
                         <div className="flex flex-col gap-12">
                            <div className="space-y-6">
                               <div className="flex flex-col gap-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Accuracy of Analysis</label>
                                 <p className="text-xs text-slate-600">How closely does the logic reflect reality?</p>
                               </div>
                               <div className="flex items-center gap-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <motion.button
                                      key={`acc-${star}`}
                                      onClick={() => setFeedbackAccuracy(star)}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      animate={{
                                        scale: feedbackAccuracy >= star ? 1.2 : 1,
                                        filter: feedbackAccuracy >= star ? 'drop-shadow(0 0 10px rgba(251,191,36,0.6))' : 'drop-shadow(0 0 0px rgba(0,0,0,0))'
                                      }}
                                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                      className={`p-2.5 rounded-xl transition-all duration-300 ${feedbackAccuracy >= star ? 'bg-amber-400/20 text-amber-400' : 'bg-slate-800/50 text-slate-700 hover:text-slate-500'}`}
                                    >
                                      <Star className={`w-7 h-7 ${feedbackAccuracy >= star ? 'fill-current' : ''}`} />
                                    </motion.button>
                                  ))}
                                  <span className="ml-4 text-xs font-mono font-bold text-amber-500 bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10">{feedbackAccuracy}/5</span>
                               </div>
                            </div>

                            <div className="space-y-6">
                               <div className="flex flex-col gap-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Usefulness of Decision</label>
                                 <p className="text-xs text-slate-600">Did this provide actionable clarity?</p>
                               </div>
                               <div className="flex items-center gap-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <motion.button
                                      key={`use-${star}`}
                                      onClick={() => setFeedbackUsefulness(star)}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      animate={{
                                        scale: feedbackUsefulness >= star ? 1.2 : 1,
                                        filter: feedbackUsefulness >= star ? 'drop-shadow(0 0 10px rgba(52,211,153,0.6))' : 'drop-shadow(0 0 0px rgba(0,0,0,0))'
                                      }}
                                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                      className={`p-2.5 rounded-xl transition-all duration-300 ${feedbackUsefulness >= star ? 'bg-emerald-400/20 text-emerald-400' : 'bg-slate-800/50 text-slate-700 hover:text-slate-500'}`}
                                    >
                                      <CheckCircle2 className={`w-7 h-7 ${feedbackUsefulness >= star ? 'fill-current' : ''}`} />
                                    </motion.button>
                                  ))}
                                  <span className="ml-4 text-xs font-mono font-bold text-emerald-500 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10">{feedbackUsefulness}/5</span>
                                </div>
                            </div>
                         </div>

                         <div className="space-y-6 pt-10 border-t border-slate-800">
                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Refinement Notes</label>
                               <textarea
                                 value={feedbackComment}
                                 onChange={(e) => setFeedbackComment(e.target.value)}
                                 placeholder="Submit specific critiques or edge cases discovered in this reasoning path..."
                                 className="w-full h-40 bg-slate-950/50 border border-slate-800 rounded-2xl p-6 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 resize-none transition-all placeholder:text-slate-700 font-mono"
                               />
                            </div>
                            <div className="flex justify-end">
                              <motion.button
                                onClick={handleSubmitFeedback}
                                disabled={feedbackLoading || (feedbackAccuracy === 0 && feedbackUsefulness === 0)}
                                whileHover={{ scale: feedbackLoading ? 1 : 1.02 }}
                                whileTap={{ scale: feedbackLoading ? 1 : 0.98 }}
                                className="group relative px-10 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:grayscale rounded-2xl font-black uppercase tracking-widest text-[10px] text-white flex items-center gap-3 transition-all overflow-hidden shadow-lg shadow-emerald-900/20"
                              >
                                 <AnimatePresence mode="wait">
                                   {feedbackLoading ? (
                                     <motion.div
                                       key="loading"
                                       initial={{ opacity: 0, rotate: -180 }}
                                       animate={{ opacity: 1, rotate: 0 }}
                                       exit={{ opacity: 0, scale: 0.5 }}
                                       className="flex items-center"
                                     >
                                       <Loader2 className="w-4 h-4 animate-spin" />
                                     </motion.div>
                                   ) : (
                                     <motion.div
                                       key="ready"
                                       initial={{ opacity: 0, scale: 0.5 }}
                                       animate={{ opacity: 1, scale: 1 }}
                                       exit={{ opacity: 0, x: 20 }}
                                     >
                                       <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                     </motion.div>
                                   )}
                                 </AnimatePresence>
                                 <span>{feedbackLoading ? 'Processing Feedback' : 'Activate Feedback Loop'}</span>
                                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                              </motion.button>
                            </div>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>

            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center">
               <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mb-8 border border-slate-800">
                  <Cpu className="w-10 h-10 text-slate-700" />
               </div>
               <h3 className="text-2xl font-bold text-slate-400">Core Engine Awaiting Synchronicity</h3>
               <p className="max-w-md mt-2 text-slate-500">
                 Neutral-IQ is ready. Select a domain expert and provide a decision context to begin the adversarial analysis.
               </p>
            </div>
          )}
        </AnimatePresence>
          </>
        )}
      </main>

      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/30 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-600/20 blur-[120px] rounded-full"></div>
      </div>
    </div>
  );
}
