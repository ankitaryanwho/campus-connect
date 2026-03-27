import React, { useState } from "react";
import {
  BookOpen, ShoppingBag, Calendar, MessageSquare,
  Heart, Share2, Bookmark, ChevronRight,
  Home, Search, PlusCircle, Bell, User,
  Eye, Coffee, Sun, Newspaper,
} from "lucide-react";

const TODAY = "Friday, March 28";
const EDITION = "Vol. 47 · Spring Semester";

const TOP_STORY = {
  id: 0,
  label: "🎪 Campus Buzz",
  headline: "DSA Study Group Fills Up in 4 Minutes — Second Batch Opening Sunday",
  body: "Arjun Mehta's study session for Sunday 11am went viral overnight. 'I posted it on a whim,' he says. The library has agreed to open Hall B early.",
  author: "Arjun Mehta",
  course: "BTech · 3rd yr",
  time: "8h ago",
  readTime: "2 min read",
  likes: 142,
  comments: 38,
  saved: false,
};

const SECTIONS = [
  {
    id: "study",
    emoji: "📚",
    title: "Study Corner",
    color: "#3B82F6",
    bg: "#EFF6FF",
    items: [
      { id: 1, author: "Priya S.", course: "BCA · 2nd", headline: "DBMS 3NF notes — will pay ₹200", time: "40m", likes: 14, type: "request" },
      { id: 2, author: "Riya J.", course: "BCA · 3rd", headline: "CN study partner needed — library, 6pm today", time: "1h", likes: 7, type: "meetup" },
      { id: 3, author: "Dev K.", course: "BTech · 2nd", headline: "Dijkstra explanation needed — confused by edge relaxation", time: "2h", likes: 22, type: "question" },
    ],
  },
  {
    id: "events",
    emoji: "🎪",
    title: "Around Campus",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    items: [
      { id: 4, author: "Fest Committee", course: "Official", headline: "Cultural Fest registrations close tonight at 11:59pm", time: "3h", likes: 89, type: "deadline" },
      { id: 5, author: "Anika R.", course: "MCA · 1st", headline: "Anyone up for badminton after 5pm? Court 3", time: "4h", likes: 31, type: "social" },
    ],
  },
  {
    id: "marketplace",
    emoji: "🛒",
    title: "Marketplace",
    color: "#F59E0B",
    bg: "#FFFBEB",
    items: [
      { id: 6, author: "Rahul P.", course: "BTech · 4th", headline: "Selling Cormen CLRS — great condition, ₹450 OBO", time: "5h", likes: 19, type: "sell" },
      { id: 7, author: "Sneha M.", course: "BCA · 1st", headline: "Lost: Blue AirPods case near Library entrance", time: "6h", likes: 44, type: "lost" },
    ],
  },
  {
    id: "confessions",
    emoji: "🙈",
    title: "Confessions",
    color: "#6B7280",
    bg: "#F3F4F6",
    items: [
      { id: 8, author: "Anonymous", course: "Profile Hidden", headline: "To the person who always saves a seat in Algo lectures — you're kind and I notice it", time: "7h", likes: 203, type: "kind" },
      { id: 9, author: "Anonymous", course: "Profile Hidden", headline: "I've been faking understanding recursion for two semesters. Today it finally clicked 😭", time: "8h", likes: 167, type: "relatable" },
    ],
  },
];

const TYPE_CHIP: Record<string, { label: string; color: string }> = {
  request: { label: "Request", color: "#3B82F6" },
  meetup:  { label: "Meetup",  color: "#10B981" },
  question:{ label: "Q&A",    color: "#8B5CF6" },
  deadline:{ label: "Urgent",  color: "#EF4444" },
  social:  { label: "Social",  color: "#EC4899" },
  sell:    { label: "For Sale",color: "#F59E0B" },
  lost:    { label: "Lost",    color: "#6B7280" },
  kind:    { label: "Wholesome",color: "#10B981" },
  relatable:{ label: "Relatable",color: "#8B5CF6"},
};

function TopStoryCard({ story, onLike }: { story: typeof TOP_STORY; onLike: () => void }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="bg-[#1C1917] rounded-2xl overflow-hidden mb-5">
      <div className="bg-[#FAF8F4]/10 px-4 py-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-[#FAF8F4]/60 uppercase tracking-widest">{story.label}</span>
        <span className="ml-auto text-xs text-[#FAF8F4]/40">{story.readTime}</span>
      </div>
      <div className="px-4 pt-3 pb-4">
        <h2 className="text-lg font-bold text-[#FAF8F4] leading-snug mb-3">{story.headline}</h2>
        <p className="text-sm text-[#FAF8F4]/70 leading-relaxed mb-4">{story.body}</p>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-[#5B4FE8] flex items-center justify-center text-xs font-bold text-white">
            {story.author[0]}
          </div>
          <div>
            <div className="text-xs font-semibold text-[#FAF8F4]">{story.author}</div>
            <div className="text-[10px] text-[#FAF8F4]/40">{story.course} · {story.time}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-3 border-t border-[#FAF8F4]/10">
          <button onClick={() => { setLiked(l => !l); }} className="flex items-center gap-1.5 text-sm text-[#FAF8F4]/60">
            <Heart size={15} className={liked ? "fill-red-400 text-red-400" : ""} />
            <span className={liked ? "text-red-400" : ""}>{story.likes + (liked ? 1 : 0)}</span>
          </button>
          <button className="flex items-center gap-1.5 text-sm text-[#FAF8F4]/60">
            <MessageSquare size={15} /><span>{story.comments}</span>
          </button>
          <button onClick={() => setSaved(s => !s)} className="ml-auto flex items-center gap-1.5 text-sm text-[#FAF8F4]/60">
            <Bookmark size={15} className={saved ? "fill-amber-400 text-amber-400" : ""} />
          </button>
          <button className="flex items-center gap-1.5 text-sm text-[#FAF8F4]/60">
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: typeof SECTIONS[number] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? section.items : section.items.slice(0, 2);
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{section.emoji}</span>
        <h3 className="text-sm font-bold text-[#1C1917] uppercase tracking-wider">{section.title}</h3>
        <div className="flex-1 h-px bg-[#E7E5E4]" />
      </div>
      <div className="space-y-2.5">
        {visible.map(item => {
          const chip = TYPE_CHIP[item.type];
          return (
            <div key={item.id} className="bg-white rounded-xl px-3.5 py-3 flex items-start gap-3 shadow-sm border border-[#F0EDEA]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: chip.color }}>{chip.label}</span>
                </div>
                <p className="text-sm font-medium text-[#1C1917] leading-snug">{item.headline}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-[#78716C]">{item.author}</span>
                  <span className="text-[11px] text-[#A8A29E]">·</span>
                  <span className="text-[11px] text-[#A8A29E]">{item.time}</span>
                  <span className="ml-auto flex items-center gap-1 text-[11px] text-[#A8A29E]">
                    <Heart size={10} />{item.likes}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {section.items.length > 2 && (
        <button onClick={() => setExpanded(e => !e)} className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#5B4FE8]">
          {expanded ? "Show less" : `${section.items.length - 2} more in ${section.title}`}
          <ChevronRight size={12} className={expanded ? "rotate-90" : ""} />
        </button>
      )}
    </div>
  );
}

export function CampusBrief() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="w-[390px] h-[844px] bg-[#FAF8F4] flex flex-col overflow-hidden font-['Inter']">
      {/* Status bar */}
      <div className="flex items-center justify-between px-5 pt-3 pb-1">
        <span className="text-xs font-semibold text-[#1C1917]">9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-2 rounded-sm bg-[#1C1917]" />
          <div className="w-1 h-1 rounded-full bg-[#1C1917]" />
        </div>
      </div>

      {/* Masthead */}
      <div className="px-5 pt-2 pb-3 border-b border-[#E7E5E4]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Newspaper size={13} className="text-[#5B4FE8]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#5B4FE8]">Campus Brief</span>
            </div>
            <h1 className="text-xl font-['Playfair_Display'] font-bold text-[#1C1917] leading-tight">Today's Edition</h1>
            <p className="text-[11px] text-[#78716C] mt-0.5">{TODAY} · {EDITION}</p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button className="w-8 h-8 rounded-full bg-white border border-[#E7E5E4] flex items-center justify-center shadow-sm">
              <Bell size={14} className="text-[#1C1917]" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#5B4FE8] flex items-center justify-center">
              <span className="text-xs font-bold text-white">P</span>
            </div>
          </div>
        </div>

        {/* Reading progress pill */}
        <div className="flex items-center gap-2 mt-3 bg-white rounded-xl px-3 py-2 border border-[#F0EDEA] shadow-sm">
          <Coffee size={13} className="text-[#5B4FE8]" />
          <span className="text-[11px] text-[#78716C]">5 min read · 11 stories today</span>
          <div className="flex-1 mx-1 h-1.5 bg-[#F0EDEA] rounded-full overflow-hidden">
            <div className="h-full bg-[#5B4FE8] rounded-full" style={{ width: "30%" }} />
          </div>
          <span className="text-[10px] font-bold text-[#5B4FE8]">3/11</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
        {/* Top story */}
        <div className="flex items-center gap-2 mb-3">
          <Sun size={13} className="text-[#F59E0B]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">Top Story</span>
        </div>
        <TopStoryCard story={TOP_STORY} onLike={() => {}} />

        {/* Sections */}
        {SECTIONS.map(section => (
          <SectionBlock key={section.id} section={section} />
        ))}

        {/* End of edition */}
        <div className="flex flex-col items-center py-6 border-t border-[#E7E5E4]">
          <div className="w-8 h-1 bg-[#E7E5E4] rounded-full mb-3" />
          <p className="text-xs text-[#A8A29E] text-center mb-1">You've reached the end of today's brief.</p>
          <p className="text-[11px] font-semibold text-[#5B4FE8]">Next edition drops tomorrow at 7am ☕</p>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="bg-white border-t border-[#E7E5E4] px-6 pt-3 pb-5 safe-area-bottom">
        <div className="flex items-center justify-between">
          {[
            { id: "home",   Icon: Home,        label: "Brief"    },
            { id: "search", Icon: Search,      label: "Discover" },
            { id: "post",   Icon: PlusCircle,  label: "Post"     },
            { id: "notif",  Icon: Bell,        label: "Alerts"   },
            { id: "profile",Icon: User,        label: "You"      },
          ].map(({ id, Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)} className="flex flex-col items-center gap-0.5 min-w-[44px]">
              <Icon size={20} className={activeTab === id ? "text-[#5B4FE8]" : "text-[#A8A29E]"} />
              <span className={`text-[10px] font-medium ${activeTab === id ? "text-[#5B4FE8]" : "text-[#A8A29E]"}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
