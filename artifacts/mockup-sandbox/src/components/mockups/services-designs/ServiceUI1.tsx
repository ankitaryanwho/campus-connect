import React, { useState } from 'react';
import { Search, Bell, Plus, Package, FileText, Award, Briefcase, CheckSquare, Zap, MapPin, ChevronDown, Star, Users, Tag, Book, Layers, Truck, ArrowRight, Clock, Check, X } from 'lucide-react';

export function ServiceUI1() {
  const [activeTab, setActiveTab] = useState("Assignments");

  const tabs = [
    { id: "All", label: "✦ All" },
    { id: "Delivery", label: "🚀 Delivery" },
    { id: "Assignments", label: "📝 Assignments" },
    { id: "Certifications", label: "🏆 Certifications" },
    { id: "Projects", label: "💼 Projects" },
    { id: "Tasks", label: "⚡ Tasks" }
  ];

  return (
    <div className="max-w-[390px] mx-auto h-[844px] overflow-hidden relative font-['Inter'] bg-[#FAF8F4] flex flex-col text-[#1A1A2E]">
      
      {/* Header bar */}
      <div className="bg-white shadow-sm flex items-center justify-between px-4 py-3 shrink-0">
        <h1 className="text-[22px] font-bold">Services</h1>
        <div className="flex items-center gap-3">
          <div className="bg-[#10B981]/10 text-[#10B981] px-2 py-1 rounded-full text-xs font-semibold">
            Active Now (2)
          </div>
          <div className="relative">
            <Bell className="w-6 h-6 text-[#1A1A2E]" />
            <div className="absolute 0 right-0 w-2.5 h-2.5 bg-[#EF4444] rounded-full border-2 border-white translate-x-[2px] -translate-y-[2px]" />
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 my-3 shrink-0">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4F0] flex items-center px-3 py-2.5">
          <Search className="w-5 h-5 text-[#1A1A2E]/55 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Search services..." 
            className="bg-transparent border-none outline-none w-full text-[15px] placeholder:text-[#1A1A2E]/55"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="shrink-0 mb-4">
        <div className="flex px-4 gap-2 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive 
                    ? 'bg-[#5B4FE8] text-white shadow-md' 
                    : 'bg-white border border-[#E8E4F0] text-[#1A1A2E]/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable card list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 flex flex-col gap-4">
        
        {/* ASSIGNMENT CARD */}
        <div className="bg-white rounded-2xl border border-[#E8E4F0] shadow-sm p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="bg-[#5B4FE8]/10 text-[#5B4FE8] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
              📝 Assignments
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">Open</span>
            </div>
          </div>
          <div className="flex justify-between items-start mt-2">
            <h3 className="text-[16px] font-bold leading-tight flex-1 pr-4">BCA Sem 3 DBMS Assignment Help</h3>
            <span className="text-[16px] font-bold text-[#5B4FE8]">₹299</span>
          </div>
          <p className="text-[12px] text-[#1A1A2E]/55 mt-1">by Priya Sharma · Bennett University</p>
          <p className="text-[13px] text-[#1A1A2E]/60 mt-2 line-clamp-2 leading-relaxed">
            Complete DBMS assignment with ER diagrams, normalization, and SQL queries. Submission-ready format.
          </p>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1 bg-[#FAF8F4] border border-[#E8E4F0] rounded-full px-2 py-1">
              <Book className="w-3 h-3 text-[#1A1A2E]/60" />
              <span className="text-[11px] font-medium text-[#1A1A2E]/70">DBMS</span>
            </div>
            <div className="flex items-center gap-1 bg-[#FAF8F4] border border-[#E8E4F0] rounded-full px-2 py-1">
              <Layers className="w-3 h-3 text-[#1A1A2E]/60" />
              <span className="text-[11px] font-medium text-[#1A1A2E]/70">BCA</span>
            </div>
            <div className="flex items-center gap-1 bg-[#FAF8F4] border border-[#E8E4F0] rounded-full px-2 py-1">
              <span className="text-[11px] font-medium text-[#1A1A2E]/70">Year 2</span>
            </div>
          </div>

          <button className="w-full mt-4 bg-[#5B4FE8] text-white font-semibold rounded-xl py-3 text-[14px] active:scale-[0.98] transition-transform">
            Book Now
          </button>
        </div>

        {/* DELIVERY CARD */}
        <div className="bg-white rounded-2xl border border-[#E8E4F0] shadow-sm p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="bg-[#F59E0B]/10 text-[#F59E0B] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
              🚀 Food Order
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">Accepted</span>
            </div>
          </div>
          
          <div className="flex justify-between items-start mt-2">
            <div>
              <h3 className="text-[16px] font-bold leading-tight">Southern Stories</h3>
              <p className="text-[13px] text-[#1A1A2E]/55 mt-0.5">→ Room 204, Block B</p>
            </div>
            <span className="text-[16px] font-bold text-[#1A1A2E]">₹370</span>
          </div>

          <div className="bg-[#FAF8F4] rounded-xl p-3 mt-3">
            <div className="flex justify-between text-[13px] mb-1.5">
              <span className="text-[#1A1A2E]/80">Veg Burger ×1</span>
              <span className="font-medium">₹130</span>
            </div>
            <div className="flex justify-between text-[13px] mb-1.5">
              <span className="text-[#1A1A2E]/80">French Fries ×2</span>
              <span className="font-medium">₹100</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#1A1A2E]/80">Cold Coffee ×1</span>
              <span className="font-medium">₹110</span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#E8E4F0]/60 text-[11px] text-[#1A1A2E]/55 text-right">
              Subtotal ₹340 + Delivery ₹30 = ₹370
            </div>
          </div>

          <button className="w-full mt-4 bg-[#F59E0B] text-white font-semibold rounded-xl py-3 text-[14px] active:scale-[0.98] transition-transform">
            Accept Request
          </button>
        </div>

        {/* TASK CARD */}
        <div className="bg-white rounded-2xl border border-[#E8E4F0] shadow-sm p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="bg-[#EF4444]/10 text-[#EF4444] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
              ⚡ Tasks
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">Open</span>
            </div>
          </div>
          
          <div className="flex justify-between items-start mt-2">
            <h3 className="text-[16px] font-bold leading-tight flex-1 pr-4">Design my Final Year Project Poster</h3>
            <span className="text-[16px] font-bold text-[#EF4444]">₹500</span>
          </div>
          <p className="text-[12px] text-[#1A1A2E]/55 mt-1">by Rahul Kumar</p>
          
          <p className="text-[13px] text-[#1A1A2E]/60 mt-2 line-clamp-2 leading-relaxed">
            Need a professional A3 poster for my BCA final year project. Canva or Figma designs welcome.
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1 bg-[#FAF8F4] border border-[#E8E4F0] rounded-full px-2 py-1">
              <Tag className="w-3 h-3 text-[#1A1A2E]/60" />
              <span className="text-[11px] font-medium text-[#1A1A2E]/70">design</span>
            </div>
            <div className="flex items-center gap-1 bg-[#FAF8F4] border border-[#E8E4F0] rounded-full px-2 py-1">
              <Users className="w-3 h-3 text-[#1A1A2E]/60" />
              <span className="text-[11px] font-medium text-[#1A1A2E]/70">4 applied</span>
            </div>
          </div>

          <button className="w-full mt-4 bg-[#EF4444] text-white font-semibold rounded-xl py-3 text-[14px] active:scale-[0.98] transition-transform">
            Apply
          </button>
        </div>

      </div>

      {/* FAB */}
      <button className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-[#5B4FE8] shadow-[0_8px_16px_rgba(91,79,232,0.3)] flex flex-col items-center justify-center active:scale-[0.96] transition-transform z-10">
        <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
      </button>

      {/* Hide scrollbar styles */}
      <style dangerouslySetInlineStyle={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
