import React, { useState, useEffect } from "react";
import { 
  Flame, 
  Clock, 
  Zap, 
  TrendingUp, 
  BookOpen, 
  Calendar, 
  ShoppingBag, 
  Users, 
  MessageSquare,
  Home,
  Search,
  PlusCircle,
  Bell,
  User,
  ArrowUpRight,
  Activity
} from "lucide-react";

// Mock Data
const HOT_POSTS = [
  {
    id: 1,
    author: "Priya Sharma",
    course: "BCA, 2nd yr",
    content: "Anyone have DBMS 3NF notes? Exam is Friday 😭 Will pay ₹200",
    category: "Study Help",
    icon: BookOpen,
    urgencyLevel: "high", // <1h
    timeRemaining: "45m left",
    color: "#EF4444", // Red
  },
  {
    id: 2,
    author: "Arjun Mehta",
    course: "BTech, 3rd yr",
    content: "DSA tutoring session this Sunday 11am. Free for first 5 people. DM to register 📚",
    category: "Event",
    icon: Calendar,
    urgencyLevel: "medium", // <4h
    timeRemaining: "3h left",
    color: "#F97316", // Orange
  }
];

const STREAM_POSTS = [
  {
    id: 4,
    author: "Rahul Verma",
    course: "MTech, 2nd yr",
    content: "Python + ML workshop next week! Register free before seats fill up 🐍",
    category: "Event",
    icon: Zap,
    heatLevel: "high",
    color: "#F97316", // Orange
    likes: 52,
    comments: 19,
    timeRemaining: "12h left"
  },
  {
    id: 3,
    author: "Sneha Patel",
    course: "MBA, 1st yr",
    content: "Selling Cormen (Algorithms textbook) ₹450, great condition. Hostel pickup. DM me!",
    category: "Buy/Sell",
    icon: ShoppingBag,
    heatLevel: "low",
    color: "#EAB308", // Yellow
    likes: 9,
    comments: 3,
    timeRemaining: "2d left"
  },
  {
    id: 5,
    author: "Ananya Singh",
    course: "BCA, 1st yr",
    content: "Lost my blue water bottle near the canteen. Has my name on it 🥲 Please DM if found",
    category: "Social",
    icon: Users,
    heatLevel: "none",
    color: "#6B7280", // Gray
    likes: 4,
    comments: 2,
    timeRemaining: "Active"
  }
];

export default function PulseDashboardFeed() {
  const [pulse, setPulse] = useState(true);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#111827] text-[#F9FAFB] font-sans pb-20 relative overflow-hidden"
         style={{
           backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
           backgroundSize: '24px 24px'
         }}>
      
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-[#111827]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#EF4444]" />
          <h1 className="text-lg font-bold tracking-tight">Campus Pulse</h1>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full text-xs font-medium text-[#6B7280]">
          <div className={`w-2 h-2 rounded-full bg-[#10B981] transition-opacity duration-700 ${pulse ? 'opacity-100' : 'opacity-40'}`}></div>
          Updated 2m ago
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Hot Right Now Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center relative w-5 h-5">
              <div className="absolute inset-0 bg-[#EF4444] rounded-full animate-ping opacity-25"></div>
              <div className="w-2.5 h-2.5 bg-[#EF4444] rounded-full"></div>
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#EF4444]">Hot Right Now</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {HOT_POSTS.map(post => {
              const Icon = post.icon;
              return (
                <div key={post.id} className="bg-[#1F2937] rounded-xl flex flex-col h-full border-t-2 overflow-hidden shadow-lg shadow-black/20"
                     style={{ borderTopColor: post.color }}>
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-1.5 rounded-md bg-black/20">
                        <Icon className="w-4 h-4" style={{ color: post.color }} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" style={{ color: post.color }} />
                        <span className="text-[11px] font-bold" style={{ color: post.color }}>
                          {post.timeRemaining}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm leading-snug font-medium mb-3 flex-1 line-clamp-3">
                      {post.content}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold truncate max-w-[80px] text-gray-300">{post.author}</span>
                        <span className="text-[9px] text-[#6B7280]">{post.course}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button className="w-full py-2 bg-[#374151] hover:bg-[#4B5563] transition-colors flex items-center justify-center gap-1 text-xs font-medium text-white">
                    Respond <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Activity Stream Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <TrendingUp className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6B7280]">Activity Stream</h2>
          </div>
          
          <div className="space-y-3">
            {STREAM_POSTS.map(post => {
              const Icon = post.icon;
              return (
                <div key={post.id} className="bg-[#1F2937] rounded-lg border-l-[3px] shadow-sm relative overflow-hidden flex flex-col"
                     style={{ borderLeftColor: post.color }}>
                  <div className="p-3.5 flex gap-3">
                    <div className="mt-1 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#111827] flex items-center justify-center border border-white/5">
                        <Icon className="w-4 h-4" style={{ color: post.color }} />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <h3 className="text-xs font-semibold text-gray-200">{post.author}</h3>
                        <span className="text-[10px] font-medium" style={{ color: post.color }}>{post.timeRemaining}</span>
                      </div>
                      <p className="text-[10px] text-[#6B7280] mb-2">{post.course} • {post.category}</p>
                      
                      <p className="text-sm text-gray-300 leading-relaxed mb-3">
                        {post.content}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-[#6B7280] font-medium">
                          <span className="flex items-center gap-1">
                            <Flame className={`w-3.5 h-3.5 ${post.heatLevel === 'high' ? 'text-[#F97316]' : post.heatLevel === 'low' ? 'text-[#EAB308]' : ''}`} /> 
                            {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" /> 
                            {post.comments}
                          </span>
                        </div>
                        
                        <button className="px-3 py-1.5 bg-[#374151] hover:bg-[#4B5563] transition-colors rounded text-xs font-medium text-white flex items-center gap-1">
                          Respond <ArrowUpRight className="w-3 h-3 text-white/70" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-[#111827]/95 backdrop-blur-md border-t border-white/10 pb-safe z-30">
        <div className="flex justify-around items-center h-16 px-2">
          <button className="flex flex-col items-center justify-center w-16 text-[#EF4444]">
            <Activity className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Pulse</span>
          </button>
          <button className="flex flex-col items-center justify-center w-16 text-[#6B7280] hover:text-white transition-colors">
            <Search className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Find</span>
          </button>
          <div className="relative -top-4">
            <button className="flex items-center justify-center w-12 h-12 bg-white text-black rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform">
              <PlusCircle className="w-6 h-6" />
            </button>
          </div>
          <button className="flex flex-col items-center justify-center w-16 text-[#6B7280] hover:text-white transition-colors relative">
            <Bell className="w-5 h-5 mb-1" />
            <span className="absolute top-1 right-4 w-1.5 h-1.5 bg-[#EF4444] rounded-full"></span>
            <span className="text-[10px] font-medium">Alerts</span>
          </button>
          <button className="flex flex-col items-center justify-center w-16 text-[#6B7280] hover:text-white transition-colors">
            <User className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>
      
      {/* Global styles injected for pb-safe support if used in an iOS context */}
      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 16px); }
      `}</style>
    </div>
  );
}
