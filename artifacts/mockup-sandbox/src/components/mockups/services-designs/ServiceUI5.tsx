import React, { useState } from 'react';
import { Search, Bell, Plus, Package, FileText, CheckSquare } from 'lucide-react';

export function ServiceUI5() {
  const [activeCategory, setActiveCategory] = useState('Assignments');

  const categories = [
    { id: 'All', label: 'All', icon: '✦' },
    { id: 'Delivery', label: 'Delivery', icon: '🚀' },
    { id: 'Assignments', label: 'Assignments', icon: '📝' },
    { id: 'Certs', label: 'Certs', icon: '🏆' },
    { id: 'Projects', label: 'Projects', icon: '💼' },
    { id: 'Tasks', label: 'Tasks', icon: '⚡' },
  ];

  return (
    <div className="max-w-[390px] mx-auto h-[844px] overflow-hidden relative font-sans bg-[#0F0E17] flex flex-col text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between px-5 py-4 bg-[#0F0E17] border-b border-white/10 shrink-0">
        <h1 className="text-[22px] font-bold text-white tracking-tight">Services</h1>
        <div className="flex items-center gap-3">
          <div className="bg-[#5B4FE8]/30 border border-[#5B4FE8]/50 text-[#9B87F5] text-xs font-medium rounded-full px-3 py-1">
            Active Now (2)
          </div>
          <div className="relative">
            <Bell className="w-6 h-6 text-white/70" strokeWidth={2} />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0F0E17]" />
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="px-5 pt-5 pb-4 shrink-0">
        <div className="bg-[#1A1926] border border-white/10 rounded-xl flex items-center px-4 py-3">
          <Search className="w-5 h-5 text-white/40 mr-3" />
          <input
            type="text"
            placeholder="Search services..."
            className="bg-transparent border-none outline-none text-white placeholder-white/50 w-full text-[15px]"
          />
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="pl-5 pb-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-4 pr-5 hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5
                ${
                  activeCategory === cat.id
                    ? 'bg-[#5B4FE8] text-white shadow-[0_0_12px_rgba(91,79,232,0.5)]'
                    : 'bg-[#1A1926] border border-white/10 text-white/40'
                }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-4">
        
        {/* ASSIGNMENT CARD */}
        <div className="bg-[#1A1926] border border-white/10 rounded-2xl p-4 flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <div className="bg-[#5B4FE8]/25 text-[#9B87F5] text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Assignment
            </div>
            <div className="bg-[#10B981]/20 text-[#10B981] text-xs font-medium px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.2)]">
              Open
            </div>
          </div>
          
          <div className="mb-2">
            <h3 className="text-lg font-bold text-white leading-tight mb-1">
              BCA Sem 3 DBMS Assignment Help
            </h3>
            <p className="text-[13px] text-white/60">
              by Priya Sharma · Bennett University
            </p>
          </div>

          <p className="text-[14px] text-white/50 leading-relaxed line-clamp-2 mb-3">
            Looking for someone to complete my DBMS assignment involving SQL queries and normalisation forms. Needs to be handwritten.
          </p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="bg-white/10 text-white/60 text-[11px] px-2 py-1 rounded-full font-medium">DBMS</span>
            <span className="bg-white/10 text-white/60 text-[11px] px-2 py-1 rounded-full font-medium">BCA</span>
            <span className="bg-white/10 text-white/60 text-[11px] px-2 py-1 rounded-full font-medium">Year 2</span>
          </div>

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
            <div>
              <p className="text-[11px] text-white/40 mb-0.5">Budget</p>
              <p className="text-xl font-bold text-[#9B87F5]">₹299</p>
            </div>
            <button className="bg-[#5B4FE8] text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-transform active:scale-95">
              Book Now
            </button>
          </div>
        </div>

        {/* DELIVERY CARD */}
        <div className="bg-[#1A1926] border border-white/10 rounded-2xl p-4 flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <div className="bg-[#F59E0B]/25 text-[#FCD34D] text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Food Order
            </div>
            <div className="bg-[#F59E0B]/20 text-[#FCD34D] text-xs font-medium px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.2)]">
              Accepted
            </div>
          </div>
          
          <div className="mb-3 flex items-center text-sm font-medium text-white">
            <span className="truncate">Southern Stories</span>
            <span className="mx-2 text-white/40">→</span>
            <span className="truncate text-white/60">Room 204 Block B</span>
          </div>

          <div className="bg-[#0F0E17] border border-white/10 rounded-xl p-3 mb-4">
            <ul className="space-y-2 mb-3">
              <li className="flex justify-between text-[13px] text-white">
                <span>Veg Burger ×1</span>
                <span className="text-white/60">₹130</span>
              </li>
              <li className="flex justify-between text-[13px] text-white">
                <span>French Fries ×2</span>
                <span className="text-white/60">₹100</span>
              </li>
              <li className="flex justify-between text-[13px] text-white">
                <span>Cold Coffee ×1</span>
                <span className="text-white/60">₹110</span>
              </li>
            </ul>
            <div className="flex justify-between items-center pt-2 border-t border-white/10 text-[12px] text-white/40">
              <span>Subtotal ₹340 + Delivery ₹30</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto pt-2">
            <div>
              <p className="text-[11px] text-white/40 mb-0.5">Total</p>
              <p className="text-xl font-bold text-[#FCD34D]">₹370</p>
            </div>
            <button className="bg-[#F59E0B] text-[#1A1A2E] font-bold text-sm px-5 py-2.5 rounded-xl transition-transform active:scale-95">
              Accept Request
            </button>
          </div>
        </div>

        {/* TASK CARD */}
        <div className="bg-[#1A1926] border border-white/10 rounded-2xl p-4 flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <div className="bg-[#EF4444]/25 text-[#FCA5A5] text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              Tasks
            </div>
            <div className="bg-[#10B981]/20 text-[#10B981] text-xs font-medium px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.2)]">
              Open
            </div>
          </div>
          
          <div className="mb-2">
            <h3 className="text-lg font-bold text-white leading-tight mb-1">
              Design my FYP Poster
            </h3>
            <p className="text-[13px] text-white/60">
              by Rahul Kumar
            </p>
          </div>

          <p className="text-[14px] text-white/50 leading-relaxed line-clamp-2 mb-3">
            Need a professional A3 poster for my Final Year Project showcase. I have the content ready, just need good visual design.
          </p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="bg-white/10 text-white/60 text-[11px] px-2 py-1 rounded-full font-medium">design</span>
            <span className="bg-white/10 text-white/60 text-[11px] px-2 py-1 rounded-full font-medium">4 applied</span>
          </div>

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
            <div>
              <p className="text-[11px] text-white/40 mb-0.5">Budget</p>
              <p className="text-xl font-bold text-[#FCA5A5]">₹500</p>
            </div>
            <button className="bg-[#EF4444] text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-transform active:scale-95">
              Apply
            </button>
          </div>
        </div>

      </div>

      {/* FAB */}
      <button className="absolute bottom-6 right-6 w-14 h-14 bg-[#5B4FE8] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(91,79,232,0.4)] transition-transform active:scale-90 z-10">
        <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
      </button>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
