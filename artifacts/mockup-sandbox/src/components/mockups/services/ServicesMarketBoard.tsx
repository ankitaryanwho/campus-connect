import React, { useState } from "react";
import {
  BookOpen, Award, Package, CheckSquare,
  Heart, ChevronRight, Plus, Search, SlidersHorizontal,
  Clock, Star, User, Home, Briefcase, MessageCircle, CreditCard,
  MapPin, Tag, Zap,
} from "lucide-react";

const CATEGORIES = [
  {
    id: "assignments", label: "Assignments", emoji: "📝", accent: "#5B4FE8", bg: "#EDE9FE",
    icon: BookOpen,
    listings: [
      { id: 1, title: "BCA Sem 3 DBMS Assignment", author: "Arjun M.", badge: "BTech · 3rd yr", price: "₹299", subject: "DBMS", status: "open", rating: 4.8, time: "2h left" },
      { id: 2, title: "Data Structures Lab Report", author: "Sneha P.", badge: "BCA · 2nd yr", price: "₹199", subject: "DSA", status: "open", rating: 4.6, time: "1d left" },
      { id: 3, title: "Python Flask Project", author: "Dev K.", badge: "BTech · 4th yr", price: "₹499", subject: "Web Dev", status: "booked", rating: 5.0, time: "3d left" },
    ],
  },
  {
    id: "certifications", label: "Certifications", emoji: "🏆", accent: "#10B981", bg: "#D1FAE5",
    icon: Award,
    listings: [
      { id: 4, title: "AWS Cloud Practitioner Project", author: "Rahul V.", badge: "MTech · 2nd yr", price: "₹599", subject: "Cloud", status: "open", rating: 4.9, time: "5d left" },
      { id: 5, title: "Google Analytics Certification", author: "Priya S.", badge: "MBA · 1st yr", price: "₹399", subject: "Marketing", status: "open", rating: 4.7, time: "2d left" },
    ],
  },
  {
    id: "deliveries", label: "Delivery", emoji: "🚀", accent: "#F59E0B", bg: "#FEF3C7",
    icon: Package,
    listings: [
      { id: 6, title: "Snapeats order pickup", author: "Krish N.", badge: "BTech · 2nd yr", price: "₹30", subject: "Snapeats", status: "open", rating: 4.5, time: "ASAP" },
      { id: 7, title: "Gate No. 3 courier collect", author: "Sanya M.", badge: "MBA · 2nd yr", price: "₹20", subject: "Gate 3", status: "accepted", rating: 4.8, time: "Now" },
    ],
  },
  {
    id: "tasks", label: "Tasks", emoji: "⚡", accent: "#EF4444", bg: "#FEE2E2",
    icon: CheckSquare,
    listings: [
      { id: 8, title: "Design poster for tech fest", author: "Ananya S.", badge: "BCA · 1st yr", price: "₹350", subject: "Design", status: "open", rating: 0, time: "3d left" },
      { id: 9, title: "Edit 5-min recap video", author: "Vikram S.", badge: "BTech · 4th yr", price: "₹500", subject: "Video", status: "open", rating: 4.3, time: "2d left" },
    ],
  },
] as const;

type CatId = typeof CATEGORIES[number]["id"];

function StatusPill({ status, accent }: { status: string; accent: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    open: { label: "Open", bg: "#D1FAE5", color: "#059669" },
    booked: { label: "Booked", bg: "#FEF3C7", color: "#D97706" },
    accepted: { label: "In Progress", bg: "#DBEAFE", color: "#2563EB" },
    completed: { label: "Done", bg: "#E0E7FF", color: "#4338CA" },
  };
  const s = map[status] || { label: status, bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function ListingMiniCard({ listing, accent, bg }: { listing: any; accent: string; bg: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <div
      className="flex-shrink-0 w-48 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-1">
          <p className="text-[12px] font-semibold text-[#1C1917] leading-tight line-clamp-2 flex-1">{listing.title}</p>
          <button onClick={() => setSaved(!saved)} className="flex-shrink-0 mt-0.5">
            <Heart className="w-3.5 h-3.5" fill={saved ? "#EF4444" : "none"} color={saved ? "#EF4444" : "#A8A29E"} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ backgroundColor: accent }}>
            {listing.author.split(" ").map((n: string) => n[0]).join("")}
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#1C1917]">{listing.author}</p>
            <p className="text-[9px] text-[#A8A29E]">{listing.badge}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: bg, color: accent }}>{listing.subject}</span>
          <StatusPill status={listing.status} accent={accent} />
        </div>
      </div>
      <div className="px-3 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[15px] font-black" style={{ color: accent }}>{listing.price}</p>
          <p className="text-[9px] text-[#A8A29E] flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5 inline" /> {listing.time}
          </p>
        </div>
        <button
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          Book
        </button>
      </div>
    </div>
  );
}

function CategoryStrip({ cat, onSeeAll }: { cat: typeof CATEGORIES[number]; onSeeAll: () => void }) {
  const Icon = cat.icon;
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.bg }}>
            <Icon className="w-3.5 h-3.5" style={{ color: cat.accent }} />
          </div>
          <span className="text-[14px] font-bold text-[#1C1917]">{cat.emoji} {cat.label}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: cat.accent }}>{cat.listings.length}</span>
        </div>
        <button onClick={onSeeAll} className="flex items-center gap-0.5 text-[12px] font-semibold" style={{ color: cat.accent }}>
          See all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-3 pl-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {cat.listings.map(l => (
          <ListingMiniCard key={l.id} listing={l} accent={cat.accent} bg={cat.bg} />
        ))}
        <div className="flex-shrink-0 w-4" />
      </div>
    </section>
  );
}

export default function ServicesMarketBoard() {
  const [activeTab, setActiveTab] = useState("bottom-home");
  const [activeCat, setActiveCat] = useState<CatId | "all">("all");

  return (
    <div className="w-full min-h-screen flex flex-col font-sans" style={{ backgroundColor: "#FAF8F4" }}>
      <style>{`.no-sb::-webkit-scrollbar{display:none}.no-sb{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 px-4 pt-12 pb-3 border-b" style={{ backgroundColor: "#FAF8F4", borderColor: "#E7E5E4" }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h1 className="text-[20px] font-black text-[#1C1917] tracking-tight">Services</h1>
            <p className="text-[11px] text-[#A8A29E]">Campus marketplace · 24 listings</p>
          </div>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center border" style={{ borderColor: "#E7E5E4" }}>
              <Search className="w-4 h-4 text-[#78716C]" />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center border" style={{ backgroundColor: "#5B4FE8", borderColor: "#5B4FE8" }}>
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto no-sb pb-0.5">
          {[{ id: "all", label: "All", emoji: "✦", accent: "#1C1917", bg: "#F0EDEA" }, ...CATEGORIES.map(c => ({ id: c.id, label: c.label, emoji: c.emoji, accent: c.accent, bg: c.bg }))].map(cat => {
            const active = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id as CatId | "all")}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border-[1.5px] transition-all"
                style={{ backgroundColor: active ? cat.bg : "white", color: active ? cat.accent : "#A8A29E", borderColor: active ? cat.accent + "44" : "#E7E5E4" }}
              >
                {cat.emoji} {cat.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-5 pb-28">
        {CATEGORIES.map(cat => (
          (activeCat === "all" || activeCat === cat.id) && (
            <CategoryStrip key={cat.id} cat={cat} onSeeAll={() => setActiveCat(cat.id)} />
          )
        ))}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t z-30" style={{ borderColor: "#E7E5E4" }}>
        <div className="flex justify-around items-center h-16 px-2">
          {[
            { id: "bottom-home", icon: Home, label: "Board" },
            { id: "bottom-svc", icon: Briefcase, label: "Services", active: true },
            { id: "bottom-chat", icon: MessageCircle, label: "Chat" },
            { id: "bottom-wallet", icon: CreditCard, label: "Wallet" },
            { id: "bottom-profile", icon: User, label: "Profile" },
          ].map(t => {
            const Icon = t.icon;
            const active = t.active;
            return (
              <button key={t.id} className="flex flex-col items-center justify-center w-14 gap-0.5">
                <Icon className="w-5 h-5" color={active ? "#5B4FE8" : "#A8A29E"} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium" style={{ color: active ? "#5B4FE8" : "#A8A29E" }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB */}
      <button className="fixed bottom-20 right-4 w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg z-40" style={{ backgroundColor: "#5B4FE8" }}>
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
