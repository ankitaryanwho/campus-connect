import React, { useState } from "react";
import {
  BookOpen, Award, Package, CheckSquare,
  Plus, Search, Clock, User, Home, Briefcase,
  MessageCircle, CreditCard, Zap, ChevronRight,
  CheckCircle, Circle, ArrowRight, Bell, Activity,
} from "lucide-react";

const ACTIVE_JOBS = [
  {
    id: "j1", type: "assignments", title: "BCA Sem 3 DBMS Assignment", provider: "Arjun M.", price: "₹299",
    step: 2, totalSteps: 5,
    steps: ["Booked", "Accepted", "In Progress", "Completed", "Delivered"],
    accent: "#5B4FE8", bg: "#EDE9FE", emoji: "📝", eta: "~3 days",
  },
  {
    id: "j2", type: "deliveries", title: "Snapeats Pickup → Hostel B3", provider: "Krish N.", price: "₹30",
    step: 3, totalSteps: 5,
    steps: ["Accepted", "Heading Out", "Order Placed", "On the Way", "Delivered"],
    accent: "#F59E0B", bg: "#FEF3C7", emoji: "🚀", eta: "~20 min",
  },
];

const OPEN_LISTINGS = [
  { id: 1, type: "assignments", title: "Python Flask Project Help", author: "Dev K.", price: "₹499", subject: "Web Dev", accent: "#5B4FE8", bg: "#EDE9FE", emoji: "📝", time: "3d", urgent: false, rating: 5.0 },
  { id: 2, type: "certifications", title: "AWS Cloud Project", author: "Rahul V.", price: "₹599", subject: "Cloud", accent: "#10B981", bg: "#D1FAE5", emoji: "🏆", time: "5d", urgent: false, rating: 4.9 },
  { id: 3, type: "deliveries", title: "Gate No. 3 Courier Collect", author: "Sanya M.", price: "₹20", subject: "Gate 3", accent: "#F59E0B", bg: "#FEF3C7", emoji: "🚀", time: "Now", urgent: true, rating: 4.8 },
  { id: 4, type: "tasks", title: "Design Poster for Tech Fest", author: "Ananya S.", price: "₹350", subject: "Design", accent: "#EF4444", bg: "#FEE2E2", emoji: "⚡", time: "3d", urgent: false, rating: 0 },
  { id: 5, type: "certifications", title: "Google Analytics Cert Help", author: "Priya S.", price: "₹399", subject: "Marketing", accent: "#10B981", bg: "#D1FAE5", emoji: "🏆", time: "2d", urgent: false, rating: 4.7 },
];

const CATEGORIES = [
  { id: "all", label: "All", emoji: "✦", accent: "#1C1917", bg: "#F0EDEA" },
  { id: "assignments", label: "Assignments", emoji: "📝", accent: "#5B4FE8", bg: "#EDE9FE" },
  { id: "certifications", label: "Certifications", emoji: "🏆", accent: "#10B981", bg: "#D1FAE5" },
  { id: "deliveries", label: "Delivery", emoji: "🚀", accent: "#F59E0B", bg: "#FEF3C7" },
  { id: "tasks", label: "Tasks", emoji: "⚡", accent: "#EF4444", bg: "#FEE2E2" },
];

function ActiveJobCard({ job }: { job: typeof ACTIVE_JOBS[number] }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: `1.5px solid ${job.accent}33` }}>
      {/* Top bar */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2" style={{ backgroundColor: job.bg }}>
        <span className="text-base">{job.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-[#1C1917] truncate">{job.title}</p>
          <p className="text-[10px] text-[#78716C]">by {job.provider} · <span className="font-semibold" style={{ color: job.accent }}>ETA {job.eta}</span></p>
        </div>
        <span className="text-[14px] font-black" style={{ color: job.accent }}>{job.price}</span>
      </div>

      {/* Progress */}
      <div className="bg-white px-3 py-3">
        {/* Bar */}
        <div className="w-full h-1.5 rounded-full mb-3" style={{ backgroundColor: job.bg }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${(job.step / (job.totalSteps - 1)) * 100}%`, backgroundColor: job.accent }}
          />
        </div>
        {/* Steps */}
        <div className="flex items-start justify-between">
          {job.steps.map((s, i) => {
            const done = i < job.step;
            const active = i === job.step;
            return (
              <div key={i} className="flex flex-col items-center gap-0.5" style={{ width: `${100 / job.steps.length}%` }}>
                {done ? (
                  <CheckCircle className="w-4 h-4" style={{ color: job.accent }} />
                ) : active ? (
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: job.accent }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: job.accent }} />
                  </div>
                ) : (
                  <Circle className="w-4 h-4 text-[#D6D3D1]" />
                )}
                <p className="text-[8px] text-center leading-tight" style={{ color: active ? job.accent : done ? "#78716C" : "#D6D3D1" }}>{s}</p>
              </div>
            );
          })}
        </div>
        {/* CTA */}
        <button className="mt-3 w-full py-2 rounded-xl text-[11px] font-bold text-white" style={{ backgroundColor: job.accent }}>
          Track Order →
        </button>
      </div>
    </div>
  );
}

function OpenListingRow({ listing, last }: { listing: typeof OPEN_LISTINGS[number]; last?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${last ? "" : "border-b"}`} style={{ borderColor: "#F0EDEA" }}>
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: listing.bg }}>
        <span className="text-lg">{listing.emoji}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {listing.urgent && (
            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: "#EF4444" }}>URGENT</span>
          )}
          <p className="text-[12px] font-bold text-[#1C1917] truncate">{listing.title}</p>
        </div>
        <p className="text-[10px] text-[#78716C]">{listing.author} · <span className="font-medium" style={{ color: listing.accent }}>{listing.subject}</span></p>
        <div className="flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3 text-[#A8A29E]" />
          <span className="text-[9px] text-[#A8A29E]">{listing.time} left</span>
        </div>
      </div>

      {/* Price + Book */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <p className="text-[14px] font-black" style={{ color: listing.accent }}>{listing.price}</p>
        <button className="px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ backgroundColor: listing.bg, color: listing.accent }}>
          Book
        </button>
      </div>
    </div>
  );
}

export default function ServicesPriorityLane() {
  const [activeCat, setActiveCat] = useState("all");

  const filtered = OPEN_LISTINGS.filter(l => activeCat === "all" || l.type === activeCat);
  const urgentFirst = [...filtered].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));

  return (
    <div className="w-full min-h-screen font-sans" style={{ backgroundColor: "#FAF8F4" }}>
      <style>{`.no-sb::-webkit-scrollbar{display:none}`}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 px-4 pt-12 pb-3 border-b" style={{ backgroundColor: "#FAF8F4", borderColor: "#E7E5E4" }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h1 className="text-[20px] font-black text-[#1C1917] tracking-tight">Services</h1>
            <p className="text-[11px] text-[#A8A29E]">2 active · {OPEN_LISTINGS.length} open listings</p>
          </div>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center border" style={{ borderColor: "#E7E5E4" }}>
              <Search className="w-4 h-4 text-[#78716C]" />
            </button>
            <button className="relative w-9 h-9 rounded-full bg-white flex items-center justify-center border" style={{ borderColor: "#E7E5E4" }}>
              <Bell className="w-4 h-4 text-[#78716C]" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white" />
            </button>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto no-sb">
          {CATEGORIES.map(cat => {
            const active = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border-[1.5px]"
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
      </header>

      <main className="pb-28">

        {/* Activity banner */}
        <div className="mx-4 mt-4 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border" style={{ borderColor: "#E7E5E4" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#EDE9FE" }}>
            <Activity className="w-4 h-4" style={{ color: "#5B4FE8" }} />
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-bold text-[#1C1917]">Your activity</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] text-[#78716C]"><span className="font-semibold text-[#5B4FE8]">2</span> active jobs</span>
              <span className="text-[10px] text-[#78716C]"><span className="font-semibold text-[#10B981]">1</span> completed this week</span>
            </div>
          </div>
          <button className="flex-shrink-0 text-[11px] font-semibold" style={{ color: "#5B4FE8" }}>View all</button>
        </div>

        {/* Active jobs */}
        {ACTIVE_JOBS.length > 0 && activeCat === "all" && (
          <section className="mt-5 px-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h2 className="text-[14px] font-bold text-[#1C1917]">Active Now</h2>
              </div>
              <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#5B4FE8]">
                See all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {ACTIVE_JOBS.map(j => <ActiveJobCard key={j.id} job={j} />)}
            </div>
          </section>
        )}

        {/* Open listings */}
        <section className="mt-5">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-[14px] font-bold text-[#1C1917]">Open Listings</h2>
            <span className="text-[11px] text-[#A8A29E]">{urgentFirst.length} available</span>
          </div>
          <div className="mx-4 bg-white rounded-2xl overflow-hidden" style={{ border: "0.5px solid #E7E5E4" }}>
            {urgentFirst.map((l, i) => (
              <OpenListingRow key={l.id} listing={l} last={i === urgentFirst.length - 1} />
            ))}
          </div>
        </section>

        {/* Post CTA */}
        <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: "#EDE9FE", border: "0.5px solid #C4B5FD" }}>
          <Zap className="w-5 h-5 text-[#5B4FE8] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[12px] font-bold text-[#1C1917]">Offer a service or need help?</p>
            <p className="text-[10px] text-[#78716C]">Post in under 60 seconds</p>
          </div>
          <button className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: "#5B4FE8" }}>
            <Plus className="w-3.5 h-3.5" /> Post
          </button>
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

      {/* FAB */}
      <button className="fixed bottom-20 right-4 w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg z-40" style={{ backgroundColor: "#5B4FE8" }}>
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
