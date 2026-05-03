import React, { useState } from "react";
import {
  Users, Hash, Globe, UserCheck,
  Heart, MessageSquare, Share2,
  ChevronRight, Home, Grid2x2, MessageCircle, Wallet, User,
  Plus, Search,
} from "lucide-react";

const SPACES = [
  {
    id: "program",
    label: "BCA Students",
    shortLabel: "My Program",
    icon: Hash,
    members: 342,
    color: "#818CF8",
    glow: "rgba(129,140,248,0.3)",
    bg: "rgba(129,140,248,0.15)",
    posts: [
      { id: 1, author: "Priya Sharma", year: "2nd yr", content: "Anyone have DBMS 3NF notes? Exam is Friday 😭 Will pay ₹200", time: "40m", likes: 14, comments: 8, reacts: "🙏😭" },
      { id: 2, author: "Riya Jain", year: "3rd yr", content: "Looking for a study partner for CN exam. Library after 6pm today?", time: "1h", likes: 7, comments: 4, reacts: "👋" },
      { id: 3, author: "Dev Kumar", year: "2nd yr", content: "Can someone explain Dijkstra? Confused by the edge weight relaxation step 🤔", time: "2h", likes: 22, comments: 11, reacts: "🧠" },
      { id: 4, author: "Priya Sharma", year: "2nd yr", content: "Reminder: DBMS practical tomorrow 9am. Queries submission needed!", time: "3h", likes: 31, comments: 5, reacts: "📝" },
    ],
  },
  {
    id: "hostel",
    label: "Block C Hostel",
    shortLabel: "My Hostel",
    icon: Grid2x2,
    members: 128,
    color: "#34D399",
    glow: "rgba(52,211,153,0.3)",
    bg: "rgba(52,211,153,0.12)",
    posts: [
      { id: 5, author: "Ananya Singh", year: "1st yr", content: "Lost my blue water bottle near the canteen. Has my name on it 🥲", time: "1h", likes: 4, comments: 2, reacts: "😢" },
      { id: 6, author: "Krish Nair", year: "2nd yr", content: "Anyone going to the fest rehearsal today? Want to carpool 🚗", time: "30m", likes: 11, comments: 6, reacts: "🚗" },
      { id: 7, author: "Sanya M.", year: "MBA 2nd yr", content: "Chai & chill in the common room tonight 7pm. All welcome ☕", time: "45m", likes: 28, comments: 14, reacts: "☕🧡" },
    ],
  },
  {
    id: "campus",
    label: "Campus-Wide",
    shortLabel: "Campus",
    icon: Globe,
    members: 4821,
    color: "#FBBF24",
    glow: "rgba(251,191,36,0.3)",
    bg: "rgba(251,191,36,0.1)",
    posts: [
      { id: 8, author: "Arjun Mehta", year: "BTech 3rd yr", content: "DSA tutoring session Sunday 11am, Library Hall B. Free for first 5 🎓", time: "2h", likes: 36, comments: 12, reacts: "🙌" },
      { id: 9, author: "Rahul Verma", year: "MTech 2nd yr", content: "Python + ML workshop next week! Register free before seats fill 🐍", time: "5h", likes: 52, comments: 19, reacts: "🐍🔥" },
      { id: 10, author: "CS Dept", year: "Official", content: "Hackathon registrations open! Theme: AI for Social Good. Teams of 3–4. Prizes ₹50K 🏆", time: "8h", likes: 89, comments: 31, reacts: "🏆😍" },
    ],
  },
  {
    id: "following",
    label: "Following",
    shortLabel: "Following",
    icon: UserCheck,
    members: 18,
    color: "#F472B6",
    glow: "rgba(244,114,182,0.3)",
    bg: "rgba(244,114,182,0.12)",
    posts: [
      { id: 11, author: "Sneha Patel", year: "MBA 1st yr", content: "Selling Cormen (Algorithms) ₹450, great condition. Hostel pickup 📦", time: "3h", likes: 9, comments: 3, reacts: "📚" },
    ],
  },
];

const AVATAR_COLORS = ["#667eea", "#f5576c", "#4facfe", "#43e97b", "#fa709a", "#a18cd1"];

function getAvatarColor(name: string) {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function PostCard({ post, accentColor }: { post: any; accentColor: string }) {
  const [liked, setLiked] = useState(false);
  const avatarColor = getAvatarColor(post.author);

  return (
    <div className="bg-[#1E293B] rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-xs"
          style={{ backgroundColor: avatarColor }}
        >
          {getInitials(post.author)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-[#F1F5F9] leading-tight">{post.author}</span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
            >
              {post.year}
            </span>
          </div>
          <span className="text-[11px] text-[#64748B]">{post.time} ago</span>
        </div>
        {post.reacts && (
          <span className="text-base">{post.reacts.split("").slice(0, 2).join("")}</span>
        )}
      </div>

      <p className="text-[14px] text-[#CBD5E1] leading-relaxed">
        {post.content}
      </p>

      <div className="flex items-center justify-between pt-1 border-t border-[#334155]">
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: liked ? "#F87171" : "#64748B" }}
            onClick={() => setLiked(!liked)}
          >
            <Heart className="w-4 h-4" fill={liked ? "#F87171" : "none"} />
            {post.likes + (liked ? 1 : 0)}
          </button>
          <button className="flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
            <MessageSquare className="w-4 h-4" />
            {post.comments}
          </button>
          <button className="flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        <button
          className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 transition-all"
          style={{ color: accentColor, backgroundColor: `${accentColor}18` }}
        >
          Reply in thread <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function SpacesContextFeed() {
  const [activeSpace, setActiveSpace] = useState(0);
  const [activeTab, setActiveTab] = useState("feed");

  const space = SPACES[activeSpace];
  const SpaceIcon = space.icon;

  return (
    <div className="w-full min-h-screen bg-[#0F172A] text-[#F1F5F9] font-sans flex flex-col">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes spaceGlow { 0%, 100% { opacity: 0.6 } 50% { opacity: 1 } }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0F172A]/90 backdrop-blur-md border-b border-white/5 px-4 pt-12 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-black tracking-tight text-[#F1F5F9]">Colyx</h1>
            <p className="text-[11px]" style={{ color: space.color }}>
              {space.members.toLocaleString()} members in this space
            </p>
          </div>
          <button className="w-9 h-9 rounded-full bg-[#1E293B] flex items-center justify-center border border-white/5">
            <Search className="w-4 h-4 text-[#64748B]" />
          </button>
        </div>

        {/* Space tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
          {SPACES.map((s, i) => {
            const Icon = s.icon;
            const active = i === activeSpace;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSpace(i)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: active ? s.bg : "rgba(255,255,255,0.04)",
                  color: active ? s.color : "#64748B",
                  boxShadow: active ? `0 0 16px ${s.glow}` : "none",
                  border: `1px solid ${active ? s.color + "55" : "transparent"}`,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.shortLabel}
              </button>
            );
          })}
        </div>
      </header>

      {/* Space hero */}
      <div
        className="mx-4 mt-4 rounded-2xl p-4 flex items-center gap-3 mb-2"
        style={{ background: `linear-gradient(135deg, ${space.bg}, transparent)`, border: `1px solid ${space.color}33` }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${space.color}22` }}
        >
          <SpaceIcon className="w-5 h-5" style={{ color: space.color }} />
        </div>
        <div>
          <p className="text-[13px] font-bold text-[#F1F5F9]">{space.label}</p>
          <p className="text-[11px] text-[#94A3B8]">{space.members.toLocaleString()} members · Active now</p>
        </div>
        <div className="ml-auto">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: space.color, boxShadow: `0 0 6px ${space.color}` }} />
        </div>
      </div>

      {/* Posts */}
      <main className="flex-1 px-4 pb-28 pt-2 space-y-3">
        {space.posts.map(post => (
          <PostCard key={post.id} post={post} accentColor={space.color} />
        ))}
        {space.posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-3xl">🌟</p>
            <p className="text-sm text-[#64748B] text-center">Be the first to post in this space</p>
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 w-full bg-[#0F172A]/95 backdrop-blur-md border-t border-white/5 z-30">
        <div className="flex justify-around items-center h-16 px-2">
          {[
            { id: "feed", icon: Home, label: "Feed" },
            { id: "spaces", icon: Users, label: "Spaces" },
            { id: "chat", icon: MessageCircle, label: "Chat" },
            { id: "wallet", icon: Wallet, label: "Wallet" },
            { id: "profile", icon: User, label: "You" },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id || (tab.id === "spaces");
            const isSpaces = tab.id === "spaces";
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center justify-center w-14"
              >
                <Icon
                  className="w-5 h-5 mb-1"
                  style={{ color: isSpaces ? space.color : (activeTab === tab.id ? "#F1F5F9" : "#475569") }}
                  strokeWidth={isSpaces || activeTab === tab.id ? 2.5 : 1.8}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isSpaces ? space.color : (activeTab === tab.id ? "#F1F5F9" : "#475569") }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB */}
      <button
        className="fixed bottom-20 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-xl z-40 text-white"
        style={{ backgroundColor: space.color, boxShadow: `0 4px 20px ${space.glow}` }}
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
