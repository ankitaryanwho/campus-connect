import React, { useState } from "react";
import {
  BookOpen, Calendar, ShoppingBag, MessageCircle,
  Heart, Search, SlidersHorizontal, Plus,
  ChevronRight, Home, Briefcase, Bell, User,
} from "lucide-react";

const CATEGORIES = [
  {
    id: "study",
    label: "Study Help",
    emoji: "📚",
    accent: "#3B82F6",
    bg: "#EFF6FF",
    icon: BookOpen,
    posts: [
      { id: 1, author: "Priya Sharma", badge: "BCA · 2nd yr", content: "Anyone have DBMS 3NF notes? Exam is Friday 😭 Will pay ₹200", time: "40m ago", likes: 14, comments: 8 },
      { id: 2, author: "Riya Jain", badge: "BCA · 3rd yr", content: "Looking for study partner for CN exam. Library after 6pm?", time: "1h ago", likes: 7, comments: 4 },
      { id: 3, author: "Dev Kumar", badge: "BTech · 2nd yr", content: "Can someone explain Dijkstra with a clear example? Confused by edge weights", time: "2h ago", likes: 22, comments: 11 },
    ],
  },
  {
    id: "events",
    label: "Events",
    emoji: "🎪",
    accent: "#8B5CF6",
    bg: "#F5F3FF",
    icon: Calendar,
    posts: [
      { id: 4, author: "Arjun Mehta", badge: "BTech · 3rd yr", content: "DSA tutoring session Sunday 11am, Library Hall B. Free for first 5 🎓", time: "2h ago", likes: 36, comments: 12 },
      { id: 5, author: "Rahul Verma", badge: "MTech · 2nd yr", content: "Python + ML workshop next week! Register free before seats fill 🐍", time: "5h ago", likes: 52, comments: 19 },
      { id: 6, author: "CS Dept", badge: "Official", content: "Hackathon registrations open! Theme: AI for Social Good. Teams of 3-4.", time: "8h ago", likes: 89, comments: 31 },
    ],
  },
  {
    id: "buysell",
    label: "Buy / Sell",
    emoji: "🛒",
    accent: "#F59E0B",
    bg: "#FFFBEB",
    icon: ShoppingBag,
    posts: [
      { id: 7, author: "Sneha Patel", badge: "MBA · 1st yr", content: "Selling Cormen (Algorithms) ₹450, great condition. Hostel pickup 📦", time: "3h ago", likes: 9, comments: 3 },
      { id: 8, author: "Vikram S.", badge: "BTech · 4th yr", content: "Casio FX-991 calculator for sale ₹350. Perfect for exams.", time: "4h ago", likes: 5, comments: 2 },
      { id: 9, author: "Naina Kapoor", badge: "BCA · 1st yr", content: "Buying: any MBA notes from last semester. Will pay fair price. DM me!", time: "6h ago", likes: 3, comments: 7 },
    ],
  },
  {
    id: "social",
    label: "Social",
    emoji: "💬",
    accent: "#10B981",
    bg: "#ECFDF5",
    icon: MessageCircle,
    posts: [
      { id: 10, author: "Ananya Singh", badge: "BCA · 1st yr", content: "Lost my blue water bottle near canteen. Has my name on it 🥲 DM if found", time: "1h ago", likes: 4, comments: 2 },
      { id: 11, author: "Krish Nair", badge: "BTech · 2nd yr", content: "Anyone going to the college fest rehearsal today? Want to carpool 🚗", time: "30m ago", likes: 11, comments: 6 },
      { id: 12, author: "Sanya M.", badge: "MBA · 2nd yr", content: "Organizing chai & chill in the common room tonight 7pm. All welcome ☕", time: "45m ago", likes: 28, comments: 14 },
    ],
  },
];

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ["#667eea", "#f5576c", "#4facfe", "#43e97b", "#fa709a", "#a18cd1", "#f093fb"];

function getAvatarColor(name: string) {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function PostCard({ post, accent, bg }: { post: any; accent: string; bg: string }) {
  const [liked, setLiked] = useState(false);
  const avatarColor = getAvatarColor(post.author);

  return (
    <div
      className="flex-shrink-0 w-44 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ backgroundColor: avatarColor, fontSize: 10 }}
          >
            {getInitials(post.author)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#1C1917] leading-tight truncate">{post.author}</p>
            <p className="text-[9px] text-[#78716C]">{post.badge}</p>
          </div>
        </div>
        <p className="text-[12px] text-[#292524] leading-snug line-clamp-3 flex-1">
          {post.content}
        </p>
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-[10px] text-[#A8A29E]">{post.time}</span>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1 text-[10px] font-medium"
              style={{ color: liked ? "#EF4444" : "#A8A29E" }}
              onClick={() => setLiked(!liked)}
            >
              <Heart className="w-3 h-3" fill={liked ? "#EF4444" : "none"} />
              {post.likes + (liked ? 1 : 0)}
            </button>
            <span className="text-[10px] text-[#A8A29E]">{post.comments}💬</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryStrip({ cat }: { cat: typeof CATEGORIES[0] }) {
  const Icon = cat.icon;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: cat.bg }}
          >
            <Icon className="w-4 h-4" style={{ color: cat.accent }} />
          </div>
          <span className="text-sm font-bold text-[#1C1917]">{cat.emoji} {cat.label}</span>
        </div>
        <button className="flex items-center gap-0.5 text-xs font-medium" style={{ color: cat.accent }}>
          See all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-3 pl-4 pr-4 overflow-x-auto no-scrollbar">
        {cat.posts.map(post => (
          <PostCard key={post.id} post={post} accent={cat.accent} bg={cat.bg} />
        ))}
      </div>
    </section>
  );
}

export default function NoticeBoardFeed() {
  const [activeTab, setActiveTab] = useState("board");

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#FAF8F4] font-sans">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <header className="sticky top-0 z-20 bg-[#FAF8F4]/90 backdrop-blur-sm px-4 pt-12 pb-3 border-b border-[#E7E5E4]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-black text-[#1C1917] tracking-tight">Campus Board</h1>
            <p className="text-[11px] text-[#A8A29E] font-medium">Bennett University · 342 members active</p>
          </div>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center border border-[#E7E5E4]">
              <Search className="w-4 h-4 text-[#78716C]" />
            </button>
            <button className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center border border-[#E7E5E4]">
              <SlidersHorizontal className="w-4 h-4 text-[#78716C]" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: cat.bg,
                color: cat.accent,
                border: `1.5px solid ${cat.accent}22`,
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 py-5 space-y-6 pb-28">
        {CATEGORIES.map(cat => (
          <CategoryStrip key={cat.id} cat={cat} />
        ))}
      </main>

      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-[#E7E5E4] z-30">
        <div className="flex justify-around items-center h-16 px-2">
          {[
            { id: "board", icon: Home, label: "Board" },
            { id: "services", icon: Briefcase, label: "Services" },
            { id: "notif", icon: Bell, label: "Alerts", dot: true },
            { id: "profile", icon: User, label: "Profile" },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className="flex flex-col items-center justify-center w-16 relative"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon
                  className="w-5 h-5 mb-1"
                  style={{ color: active ? "#1C1917" : "#A8A29E" }}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                {tab.dot && (
                  <span className="absolute top-1 right-3.5 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-white" />
                )}
                <span className="text-[10px] font-medium" style={{ color: active ? "#1C1917" : "#A8A29E" }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <button className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-[#1C1917] text-white flex items-center justify-center shadow-lg z-40">
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
