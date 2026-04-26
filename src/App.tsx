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
import { auth, signInWithGoogle, logout, saveDecision, getDecisions, saveFeedback, getUserProfile, onboardUser } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { exportToPDF, exportToCSV, exportToJSON } from './services/export';
import { Download, FileText, Table, History, Database, Code } from 'lucide-react';

import { XAITree } from './components/XAITree';

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
  const [authLoading, setAuthLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [currentDecisionId, setCurrentDecisionId] = useState<string | null>(null);
  const [feedbackAccuracy, setFeedbackAccuracy] = useState(0);
  const [feedbackUsefulness, setFeedbackUsefulness] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [roleMismatch, setRoleMismatch] = useState<{ requested: string, actual: string } | null>(null);

  const fetchProfile = async (uid: string) => {
    const profile = await getUserProfile(uid);
    setUserProfile(profile);
    return profile;
  };

  useEffect(() => {
    let unsubHistory: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthLoading(true);
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
      setAuthLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubHistory) {
        unsubHistory();
      }
    };
  }, []);

  const handleLogin = async (requestedRole: 'student' | 'employee' | 'neutral') => {
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        const profile = await fetchProfile(loggedInUser.uid);
        
        if (!profile) {
          // First time user, onboarding
          await onboardUser(loggedInUser, requestedRole);
          await fetchProfile(loggedInUser.uid);
        } else if (profile.role !== requestedRole) {
          // Role mismatch detected
          setRoleMismatch({ requested: requestedRole, actual: profile.role });
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleConfirmRole = async (confirmedRole: 'student' | 'employee' | 'neutral') => {
    if (user) {
      await onboardUser(user, confirmedRole);
      await fetchProfile(user.uid);
      setRoleMismatch(null);
    }
  };

  const handleAnalyze = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setShowHistory(false);
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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const q = searchQuery.toLowerCase();
    const agent = MICRO_AGENTS.find(a => a.id === item.agentId)?.name.toLowerCase() || '';
    return item.prompt.toLowerCase().includes(q) || agent.includes(q);
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex shadow-inner items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !userProfile?.role || roleMismatch) {
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

            {roleMismatch ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <h2 className="text-4xl lg:text-5xl font-bold leading-tight text-amber-400">
                  Role Discrepancy <br />Detected.
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
                  You attempted to log in as a <span className="text-white font-bold">{roleMismatch.requested}</span>, but your profile is currently assigned as <span className="text-emerald-400 font-bold">{roleMismatch.actual}</span>.
                </p>
                <div className="flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertCircle className="text-amber-500 w-6 h-6" />
                  <p className="text-xs text-amber-200">
                    Choosing a new role will update your permanent identity profile in the decision mesh.
                  </p>
                </div>
              </motion.div>
            ) : (
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
            )}

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
              
              <div className="mb-10">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {roleMismatch ? "Resolve Identity" : user ? "Complete Onboarding" : "Initiate Synchronization"}
                </h3>
                <p className="text-slate-500 text-sm">
                  {roleMismatch 
                    ? `Confirm your intended identity profile.` 
                    : user 
                      ? "Select your primary role to activate your account." 
                      : "Choose your identity profile to begin."}
                </p>
              </div>
              
              <div className="space-y-4">
                 <button 
                   onClick={() => roleMismatch ? handleConfirmRole('student') : handleLogin('student')}
                   className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-4 transition-all active:scale-95 group relative overflow-hidden ${
                     roleMismatch?.actual === 'student' ? 'bg-emerald-600 text-white' : 'bg-white text-black hover:bg-slate-200'
                   }`}
                 >
                    <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <GraduationCap className={`w-6 h-6 ${roleMismatch?.actual === 'student' ? 'text-white' : 'text-emerald-600'} group-hover:rotate-12 transition-transform relative z-10`} />
                    <span className="relative z-10">Login as Student {roleMismatch?.actual === 'student' && '(Assigned)'}</span>
                 </button>
                 <button 
                   onClick={() => roleMismatch ? handleConfirmRole('employee') : handleLogin('employee')}
                   className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-4 transition-all active:scale-95 group shadow-xl ${
                     roleMismatch?.actual === 'employee' ? 'bg-emerald-600 text-white shadow-emerald-600/30' : 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700'
                   }`}
                 >
                    <WorkIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span>Login as Employee {roleMismatch?.actual === 'employee' && '(Assigned)'}</span>
                 </button>
                 
                 <div className="flex items-center gap-4 my-6">
                    <div className="h-[1px] flex-1 bg-slate-800"></div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">or</span>
                    <div className="h-[1px] flex-1 bg-slate-800"></div>
                 </div>
                 
                 <button 
                   onClick={() => roleMismatch ? handleConfirmRole('neutral') : handleLogin('neutral')}
                   className="w-full py-4 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
                 >
                    Continue as Neutral {roleMismatch?.actual === 'neutral' && '(Assigned)'}
                 </button>

                 {roleMismatch && (
                   <button 
                     onClick={() => setRoleMismatch(null)}
                     className="w-full py-2 bg-transparent text-slate-600 hover:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4"
                   >
                     Cancel and try again
                   </button>
                 )}
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(searchQuery ? filteredHistory : history).length > 0 ? (searchQuery ? filteredHistory : history).map((item) => {
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
                            <div className="text-[10px] text-slate-500 font-mono italic">{new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</div>
                          </div>
                          <div className="ml-auto text-emerald-400 font-black text-xs">
                            {item.result.finalScore}%
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
                        <div className="text-2xl font-black text-emerald-400">{result.finalScore}%</div>
                      </div>
                      <div className="w-[2px] h-10 bg-slate-800"></div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Alignment</div>
                        <div className={`text-sm font-black transition-colors ${
                          result.overallAlignment === 'High' ? 'text-emerald-400' :
                          result.overallAlignment === 'Medium' ? 'text-amber-400' :
                          'text-rose-400'
                        }`}>
                          {result.overallAlignment}
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
                    {result.consensus}
                  </p>
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
                    <BarChart data={result.swarm} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                        {result.swarm.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.persona === 'Pragmatist' ? '#10b981' : 
                              entry.persona === 'Skeptic' ? '#f43f5e' : 
                              '#a855f7'
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-8">
                  {result.swarm.map((s) => (
                    <div key={s.persona} className="text-center group">
                       <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter mb-1 transition-colors group-hover:text-slate-400">{s.persona}</div>
                       <div className={`h-1 w-full rounded-full opacity-20 ${
                         s.persona === 'Pragmatist' ? 'bg-emerald-500' : 
                         s.persona === 'Skeptic' ? 'bg-rose-500' : 
                         'bg-purple-500'
                       }`}></div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Swarm Debate */}
              <div className="flex flex-col gap-6">
                {result.swarm.map((member, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={member.persona} 
                    className="bg-slate-900 border border-slate-800 p-8 rounded-2xl relative group overflow-hidden flex flex-col gap-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <h4 className="font-bold text-2xl flex items-center gap-3 text-white">
                           {member.persona === 'Pragmatist' && <BarChart3 className="w-7 h-7 text-emerald-400" />}
                           {member.persona === 'Skeptic' && <ShieldAlert className="w-7 h-7 text-rose-400" />}
                           {member.persona === 'Creative' && <Sparkles className="w-7 h-7 text-purple-400" />}
                           {member.persona}
                        </h4>
                        <div className="flex items-center gap-3 bg-slate-950/50 p-2 rounded-xl border border-slate-800/50">
                           <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-wider ${
                             member.verdict === 'Supportive' ? 'bg-emerald-500/10 text-emerald-400' :
                             member.verdict === 'Critical' ? 'bg-rose-500/10 text-rose-400' :
                             'bg-amber-500/10 text-amber-400'
                           }`}>
                             {member.verdict}
                           </span>
                           <div className="h-4 w-[1px] bg-slate-800"></div>
                           <div className="flex items-center gap-2 pr-2">
                             <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                               member.alignment === 'High' ? 'text-emerald-400' :
                               member.alignment === 'Medium' ? 'text-amber-400' :
                               'text-rose-400'
                             }`}>
                               {member.alignment} Alignment
                             </span>
                             <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-current" style={{ color: 
                               member.alignment === 'High' ? '#10b981' : 
                               member.alignment === 'Medium' ? '#f59e0b' : 
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
                      <p className="text-lg text-slate-300 leading-relaxed italic pl-6 py-1">"{member.thought}"</p>
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
                    {result.biases.length > 0 ? result.biases.map((bias) => (
                      <div key={bias.name} className="p-4 bg-slate-950 rounded-lg border border-slate-800 group hover:border-rose-500/30 transition-colors">
                        <h4 className="text-rose-400 font-bold flex items-center justify-between relative group/bias">
                          <span className="cursor-help underline decoration-rose-500/30 underline-offset-4 decoration-dotted group-hover:decoration-rose-500">
                            {bias.name}
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
                              {bias.definition || 'A cognitive shortcut that can lead to systematic deviations from logic or objective judgment.'}
                            </p>
                            <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-slate-900 border-r border-b border-slate-700 rotate-45"></div>
                          </div>
                        </h4>
                        <p className="text-sm text-slate-200 mt-2">{bias.description}</p>
                        <div className="mt-3 text-[10px] text-slate-500 font-mono">DETECTED IN: {bias.detectedIn}</div>
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
                     <XAITree node={result.xaiTree} />
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
                      <AreaChart data={result.simulation.labels.map((l, i) => ({ name: l, value: result.simulation.data[i] }))}>
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
                      {result.ethicalChecks.map((check) => (
                        <div key={check.framework} className="bg-slate-950 p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all group">
                           <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${
                                  check.alignment === 'High' ? 'bg-emerald-500/10 text-emerald-400' :
                                  check.alignment === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                                  'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {check.alignment === 'High' && <CheckCircle2 className="w-4 h-4" />}
                                  {check.alignment === 'Medium' && <AlertCircle className="w-4 h-4" />}
                                  {check.alignment === 'Low' && <XCircle className="w-4 h-4" />}
                                </div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{check.framework}</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                check.alignment === 'High' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                check.alignment === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {check.alignment} ALIGNMENT
                              </span>
                           </div>
                           <div className="space-y-2">
                              <h5 className="text-sm font-bold text-slate-100 leading-snug group-hover:text-emerald-400 transition-colors">
                                {check.summary}
                              </h5>
                              <p className="text-xs text-slate-400 leading-relaxed">
                                {check.analysis}
                              </p>
                           </div>
                        </div>
                      ))}
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
                    {result.roadmap.map((step, idx) => (
                      <div key={step.phase} className="relative z-10 flex flex-col items-center text-center">
                         <div className="w-12 h-12 rounded-full bg-slate-950 border-4 border-slate-800 flex items-center justify-center font-black text-emerald-400 text-lg mb-4 shadow-xl">
                            {idx + 1}
                         </div>
                         <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-widest">{step.phase}</h4>
                         <p className="text-sm text-slate-300 mb-4">{step.action}</p>
                         <div className="w-full p-3 bg-slate-950/50 rounded-lg border border-slate-800 flex items-center gap-2">
                           <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                           <span className="text-[10px] text-rose-400 font-medium text-left">CRITICAL RISK: {step.risk}</span>
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
