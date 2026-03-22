import React, { useState } from "react";
import {
  BookOpen, Award, Package, CheckSquare,
  Heart, Plus, Search, Clock, Star, User,
  Home, Briefcase, MessageCircle, CreditCard, MapPin,
  ChevronRight, Filter, Sparkles,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All", emoji: "✦", accent: "#1C1917", bg: "#F0EDEA" },
  { id: "assignments", label: "Assignments", emoji: "📝", accent: "#5B4FE8", bg: "#EDE9FE", icon: BookOpen },
  { id: "certifications", label: "Certifications", emoji: "🏆", accent: "#10B981", bg: "#D1FAE5", icon: Award },
  { id: "deliveries", label: "Delivery", emoji: "🚀", accent: "#F59E0B", bg: "#FEF3C7", icon: Package },
  { id: "tasks", label: "Tasks", emoji: "⚡", accent: "#EF4444", bg: "#FEE2E2", icon: CheckSquare },
];

const LISTINGS = [
  { id: 1, cat: "assignments", title: "DBMS Assignment Help", author: "Arjun", avatar: "AM", price: "₹299", subject: "DBMS", status: "open", rating: 4.8, reviews: 12, time: "2h", badge: "BTech" },
  { id: 2, cat: "assignments", title: "Python Flask Project", author: "Dev K.", avatar: "DK", price: "₹499", subject: "Web Dev", status: "booked", rating: 5.0, reviews: 8, time: "3d", badge: "4th yr" },
  { id: 3, cat: "certifications", title: "AWS Cloud Project Help", author: "Rahul V.", avatar: "RV", price: "₹599", subject: "Cloud", status: "open", rating: 4.9, reviews: 20, time: "5d", badge: "MTech" },
  { id: 4, cat: "tasks", title: "Design Poster for Fest", author: "Ananya S.", avatar: "AS", price: "₹350", subject: "Design", status: "open", rating: 0, reviews: 0, time: "3d", badge: "BCA" },
  { id: 5, cat: "deliveries", title: "Snapeats Pickup", author: "Krish N.", avatar: "KN", price: "₹30", subject: "Snapeats", status: "open", rating: 4.5, reviews: 31, time: "ASAP", badge: "BTech" },
  { id: 6, cat: "certifications", title: "Google Analytics Cert", author: "Priya S.", avatar: "PS", price: "₹399", subject: "Marketing", status: "open", rating: 4.7, reviews: 5, time: "2d", badge: "MBA" },
  { id: 7, cat: "tasks", title: "Edit 5-min Recap Video", author: "Vikram S.", avatar: "VS", price: "₹500", subject: "Video", status: "open", rating: 4.3, reviews: 7, time: "2d", badge: "BTech" },
  { id: 8, cat: "deliveries", title: "Gate 3 Courier Pickup", author: "Sanya M.", avatar: "SM", price: "₹20", subject: "Gate 3", status: "accepted", rating: 4.8, reviews: 44, time: "Now", badge: "MBA" },
  { id: 9, cat: "assignments", title: "Data Structures Report", author: "Sneha P.", avatar: "SP", price: "₹199", subject: "DSA", status: "open", rating: 4.6, reviews: 9, time: "1d", badge: "BCA" },
];

const SORT_OPTIONS = ["Newest", "Price ↑", "Price ↓", "Rating"];

function getCatMeta(catId: string) {
  return CATEGORIES.find(c => c.id === catId) || CATEGORIES[0];
}

function GridCard({ listing }: { listing: typeof LISTINGS[number] }) {
  const [saved, setSaved] = useState(false);
  const meta = getCatMeta(listing.cat);

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: "Open", color: "#059669", bg: "#D1FAE5" },
    booked: { label: "Booked", color: "#D97706", bg: "#FEF3C7" },
    accepted: { label: "Active", color: "#2563EB", bg: "#DBEAFE" },
  };
  const status = statusMap[listing.status] || { label: listing.status, color: "#6B7280", bg: "#F3F4F6" };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col" style={{ border: "0.5px solid #E7E5E4" }}>
      {/* Color top stripe */}
      <div className="h-1.5 w-full" style={{ backgroundColor: meta.accent }} />
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Subject + save */}
        <div className="flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ backgroundColor: meta.bg, color: meta.accent }}>{listing.subject}</span>
          <button onClick={() => setSaved(!saved)}>
            <Heart className="w-3.5 h-3.5" fill={saved ? "#EF4444" : "none"} color={saved ? "#EF4444" : "#D6D3D1"} />
          </button>
        </div>

        {/* Title */}
        <p className="text-[12px] font-bold text-[#1C1917] leading-snug">{listing.title}</p>

        {/* Provider */}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ backgroundColor: meta.accent }}>
            {listing.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#1C1917] truncate">{listing.author}</p>
            <p className="text-[9px] text-[#A8A29E]">{listing.badge}</p>
          </div>
        </div>

        {/* Rating */}
        {listing.rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-semibold text-[#78716C]">{listing.rating}</span>
            <span className="text-[9px] text-[#A8A29E]">({listing.reviews})</span>
          </div>
        )}

        {/* Status + time */}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto">
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: status.bg, color: status.color }}>{status.label}</span>
          <span className="flex items-center gap-0.5 text-[9px] text-[#A8A29E]">
            <Clock className="w-2.5 h-2.5" />{listing.time}
          </span>
        </div>
      </div>

      {/* Price + CTA */}
      <div className="px-3 pb-3 flex items-center justify-between">
        <p className="text-[16px] font-black" style={{ color: meta.accent }}>{listing.price}</p>
        <button className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: meta.accent }}>
          Book
        </button>
      </div>
    </div>
  );
}

export default function ServicesClassifiedGrid() {
  const [activeCat, setActiveCat] = useState("all");
  const [sort, setSort] = useState("Newest");
  const [showSort, setShowSort] = useState(false);

  const filtered = LISTINGS.filter(l => activeCat === "all" || l.cat === activeCat);

  return (
    <div className="w-full min-h-screen font-sans" style={{ backgroundColor: "#FAF8F4" }}>
      <style>{`.no-sb::-webkit-scrollbar{display:none}`}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 px-4 pt-12 pb-3 border-b" style={{ backgroundColor: "#FAF8F4", borderColor: "#E7E5E4" }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h1 className="text-[20px] font-black text-[#1C1917] tracking-tight">Services</h1>
            <p className="text-[11px] text-[#A8A29E]">Campus classifieds · {filtered.length} listings</p>
          </div>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center border" style={{ borderColor: "#E7E5E4" }}>
              <Search className="w-4 h-4 text-[#78716C]" />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "#5B4FE8" }}>
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto no-sb mb-2.5">
          {CATEGORIES.map(cat => {
            const active = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold border-[1.5px] transition-all"
                style={{
                  backgroundColor: active ? cat.bg : "white",
                  color: active ? cat.accent : "#A8A29E",
                  borderColor: active ? cat.accent + "44" : "#E7E5E4",
                }}
              >
                {cat.emoji} {cat.label}
              </button>
            );
          })}
        </div>

        {/* Sort row */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#78716C] font-medium">{filtered.length} listings found</p>
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-[11px] font-semibold text-[#78716C]"
              style={{ borderColor: "#E7E5E4", backgroundColor: "white" }}
            >
              <Filter className="w-3 h-3" /> {sort}
            </button>
            {showSort && (
              <div className="absolute right-0 top-9 bg-white rounded-xl shadow-lg border overflow-hidden z-50" style={{ borderColor: "#E7E5E4" }}>
                {SORT_OPTIONS.map(o => (
                  <button key={o} onClick={() => { setSort(o); setShowSort(false); }}
                    className="block w-full px-4 py-2 text-left text-[12px] font-medium"
                    style={{ color: o === sort ? "#5B4FE8" : "#1C1917", backgroundColor: o === sort ? "#EDE9FE" : "white" }}>
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sponsored banner */}
      <div className="mx-4 mt-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "linear-gradient(135deg,#EDE9FE,#FEE2E2)", border: "0.5px solid #E7E5E4" }}>
        <Sparkles className="w-4 h-4 text-[#5B4FE8] flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-[#1C1917]">Your posted tasks await takers!</p>
          <p className="text-[9px] text-[#78716C]">2 listings active · 5 views today</p>
        </div>
        <button className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: "#5B4FE8" }}>View</button>
      </div>

      {/* Grid */}
      <main className="px-4 pb-28">
        <div className="grid grid-cols-2 gap-3 mt-3">
          {filtered.map(l => <GridCard key={l.id} listing={l} />)}
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t z-30" style={{ borderColor: "#E7E5E4" }}>
        <div className="flex justify-around items-center h-16 px-2">
          {[
            { id: "bh", icon: Home, label: "Board" },
            { id: "bs", icon: Briefcase, label: "Services", active: true },
            { id: "bc", icon: MessageCircle, label: "Chat" },
            { id: "bw", icon: CreditCard, label: "Wallet" },
            { id: "bp", icon: User, label: "Profile" },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} className="flex flex-col items-center justify-center w-14 gap-0.5">
                <Icon className="w-5 h-5" color={t.active ? "#5B4FE8" : "#A8A29E"} strokeWidth={t.active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium" style={{ color: t.active ? "#5B4FE8" : "#A8A29E" }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
