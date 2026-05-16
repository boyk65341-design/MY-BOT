/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Heart, Sparkles, User, Brain, Shield, PenTool, Video, Target, TrendingUp, DollarSign, X, Settings, GraduationCap, History, Plus, Trash2, Mic, MicOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatStream, SYSTEM_INSTRUCTION } from './lib/gemini';
import { cn } from './lib/utils';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatSession {
  id: string;
  timestamp: number;
  messages: Message[];
  title: string;
}

interface UserProfile {
  name: string;
  skills: {
    videoEditing: { level: string; goal: string };
    aiArt: { level: string; goal: string };
    coding: { level: string; goal: string };
    ethicalHacking: { level: string; goal: string };
  };
}

const INITIAL_PROFILE: UserProfile = {
  name: '',
  skills: {
    videoEditing: { level: 'Beginner', goal: '' },
    aiArt: { level: 'Beginner', goal: '' },
    coding: { level: 'Beginner', goal: '' },
    ethicalHacking: { level: 'Beginner', goal: '' },
  }
};

const WELCOME_MESSAGE: Message = {
  role: 'model',
  parts: [{ text: "Assalam-o-Alaikum! ❤️ Kaise ho? Main tumhari Friendly AI hoon, tumhari mentor aur life partner. Tumhein tech, AI, content creation ya ethical hacking mein champion banane ke liye main hamesha taiyar hoon. Aaj kya seekhna hai humein? ✨" }]
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Aapka browser voice recording support nahi karta! ❤️");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('jano_profile');
    return saved ? JSON.parse(saved) : INITIAL_PROFILE;
  });

  const [allChats, setAllChats] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('jano_chats');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentChatId, setCurrentChatId] = useState<string>(() => {
    return Math.random().toString(36).substring(7);
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('jano_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('jano_chats', JSON.stringify(allChats));
  }, [allChats]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveCurrentSession = () => {
    if (messages.length <= 1) return;

    setAllChats(prev => {
      const existingIndex = prev.findIndex(c => c.id === currentChatId);
      const title = messages.find(m => m.role === 'user')?.parts[0].text.substring(0, 30) || 'New Chat';
      
      const session: ChatSession = {
        id: currentChatId,
        timestamp: Date.now(),
        messages: messages,
        title: title
      };

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = session;
        return updated;
      }
      return [session, ...prev];
    });
  };

  const startNewChat = () => {
    saveCurrentSession();
    setMessages([WELCOME_MESSAGE]);
    setCurrentChatId(Math.random().toString(36).substring(7));
    setShowHistory(false);
  };

  const loadChat = (session: ChatSession) => {
    saveCurrentSession();
    setMessages(session.messages);
    setCurrentChatId(session.id);
    setShowHistory(false);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setAllChats(prev => prev.filter(c => c.id !== id));
    if (currentChatId === id) {
      setMessages([WELCOME_MESSAGE]);
      setCurrentChatId(Math.random().toString(36).substring(7));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: input }] };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Inject profile context into the chat
      const profileContext = `\n\n[USER CONTEXT: Skill Levels - Video: ${profile.skills.videoEditing.level}, AI Art: ${profile.skills.aiArt.level}, Coding: ${profile.skills.coding.level}, Hacking: ${profile.skills.ethicalHacking.level}. Goals: ${profile.skills.ethicalHacking.goal || 'To become expert'}]`;
      
      const stream = await chatStream(newMessages);
      let modelResponse = '';
      
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text || '';
        setMessages(prev => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage && lastMessage.role === 'model') {
            lastMessage.parts = [{ text: modelResponse }];
          }
          return updated;
        });
      }
      
      // Auto-save session periodically or after response
      saveCurrentSession();
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const skillOptions = [
    { key: 'videoEditing', label: 'Video Editing', icon: Video, color: 'text-blue-400' },
    { key: 'aiArt', label: 'AI Art', icon: Sparkles, color: 'text-purple-400' },
    { key: 'coding', label: 'Coding', icon: PenTool, color: 'text-pink-400' },
    { key: 'ethicalHacking', label: 'Ethical Hacking', icon: Shield, color: 'text-red-400' },
  ] as const;

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-zinc-100 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Heart className="text-white fill-white" size={20} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#09090b]" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-lg leading-tight">Friendly <span className="text-rose-500 text-sm italic">AI</span></h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Online • Stay Friendly</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(true)}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 transition-all text-zinc-400 hover:text-rose-400"
            title="Chat History"
          >
            <History size={20} />
          </button>
          <button 
            onClick={() => setShowProfile(true)}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 transition-all text-zinc-400 hover:text-rose-400"
            title="Profile & Goals"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex w-full mb-4",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "flex max-w-[88%] sm:max-w-[75%] gap-3",
                message.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border mt-1",
                  message.role === 'user' 
                    ? "bg-zinc-800 border-zinc-700 shadow-sm" 
                    : "bg-rose-500/10 border-rose-500/20 shadow-sm"
                )}>
                  {message.role === 'user' ? (
                    <User size={16} className="text-zinc-400" />
                  ) : (
                    <Heart size={16} className="text-rose-500 fill-rose-500" />
                  )}
                </div>
                
                <div className={cn(
                  "px-4 py-3 rounded-2xl shadow-sm",
                  message.role === 'user'
                    ? "bg-rose-600 text-white rounded-tr-none"
                    : "bg-[#18181b] border border-zinc-800 text-zinc-200 rounded-tl-none"
                )}>
                  <div className="markdown-body prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{message.parts[0].text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 text-rose-500/50 text-xs font-medium px-4 py-2">
              <div className="flex gap-1">
                {[0, 0.2, 0.4].map((delay) => (
                  <motion.div 
                    key={delay}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} 
                    transition={{ repeat: Infinity, duration: 1, delay }} 
                    className="w-1.5 h-1.5 bg-rose-500 rounded-full" 
                  />
                ))}
              </div>
              Friendly AI is typing...
            </div>
          </div>
        )}
      </main>

      {/* User Profile Drawer */}
      <AnimatePresence>
        {showProfile && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfile(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute top-0 right-0 h-full w-full max-w-md bg-[#09090b] border-l border-zinc-800 z-40 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GraduationCap className="text-rose-500" />
                  <h2 className="font-display font-semibold text-xl">Study Plan ❤️</h2>
                </div>
                <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors">
                  <X />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {skillOptions.map((skill) => (
                  <div key={skill.key} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <skill.icon size={18} className={skill.color} />
                      <h3 className="font-medium text-zinc-200">{skill.label}</h3>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {['Beginner', 'Intermediate', 'Expert'].map((level) => (
                        <button
                          key={level}
                          onClick={() => setProfile({
                            ...profile,
                            skills: {
                              ...profile.skills,
                              [skill.key]: { ...profile.skills[skill.key], level }
                            }
                          })}
                          className={cn(
                            "py-2 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                            profile.skills[skill.key].level === level
                              ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20"
                              : "bg-zinc-900 border-zinc-800 text-zinc-500"
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Goal / Project</label>
                      <textarea
                        value={profile.skills[skill.key].goal}
                        onChange={(e) => setProfile({
                          ...profile,
                          skills: {
                            ...profile.skills,
                            [skill.key]: { ...profile.skills[skill.key], goal: e.target.value }
                          }
                        })}
                        placeholder={`What do you want to build in ${skill.label}?`}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 transition-all min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-6 border-t border-zinc-800">
                <button 
                  onClick={() => setShowProfile(false)}
                  className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-semibold shadow-lg shadow-rose-500/20 transition-all active:scale-[0.98]"
                >
                  Save & Let's Go Baby! ❤️
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="absolute top-0 left-0 h-full w-full max-w-sm bg-[#09090b] border-r border-zinc-800 z-40 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="text-rose-500" />
                  <h2 className="font-display font-semibold text-xl">History ❤️</h2>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors">
                  <X />
                </button>
              </div>

              <div className="p-4">
                <button 
                  onClick={startNewChat}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 rounded-xl text-sm font-medium transition-all group"
                >
                  <Plus size={18} className="text-rose-500 group-hover:scale-110 transition-transform" />
                  Nayi Chat Shuru Karein...
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {allChats.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-zinc-500 text-sm italic">Abhi tak koi chat nahi hai...</p>
                  </div>
                ) : (
                  allChats.map((chat) => (
                    <div 
                      key={chat.id}
                      onClick={() => loadChat(chat)}
                      className={cn(
                        "group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                        currentChatId === chat.id 
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-100" 
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      )}
                    >
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="text-sm font-medium truncate">{chat.title}</span>
                        <span className="text-[10px] opacity-50 uppercase tracking-tighter">
                          {new Date(chat.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => deleteChat(e, chat.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all hover:scale-110"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer Skills Bar */}
      <div className="px-4 pb-2">
        <div className="flex overflow-x-auto gap-2 no-scrollbar py-2">
          {skillOptions.map((skill, i) => (
            <button
              key={i}
              onClick={() => setInput(prev => prev + (prev ? ' ' : '') + `Mujhe ${skill.label} mein help karo...`)}
              className="flex-shrink-0 flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <skill.icon size={14} className={skill.color} />
              {skill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <footer className="p-4 pt-2 bg-[#09090b]">
        <form 
          onSubmit={handleSubmit}
          className="relative max-w-4xl mx-auto group"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Kuch bhi pucho..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-6 pr-24 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all shadow-inner"
          />
          <div className="absolute right-2 top-2 bottom-2 flex gap-2">
            <button
              type="button"
              onClick={toggleRecording}
              className={cn(
                "w-12 rounded-xl flex items-center justify-center transition-all",
                isRecording 
                  ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30" 
                  : "bg-zinc-800 text-zinc-400 hover:text-rose-400"
              )}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "px-4 rounded-xl flex items-center justify-center transition-all",
                input.trim() && !isLoading 
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                  : "bg-zinc-800 text-zinc-500"
              )}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
        <p className="text-[10px] text-center text-zinc-600 mt-3 font-medium uppercase tracking-widest">
           Your Personal AI Companion & Tech Mentor
        </p>
      </footer>
    </div>
  );
}

