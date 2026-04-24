import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  Plus, 
  FileText, 
  Truck, 
  Zap, 
  TrendingUp, 
  Activity, 
  Clock 
} from 'lucide-react';

export function ServiceUI7() {
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = [
    { id: 'All', icon: '✦', label: 'All', count: null },
    { id: 'Delivery', icon: '🚀', label: 'Delivery', count: '3' },
    { id: 'Assignments', icon: '📝', label: 'Assignments', count: '5' },
    { id: 'Certs', icon: '🏆', label: 'Certs', count: '2' },
    { id: 'Projects', icon: '💼', label: 'Projects', count: '1' },
    { id: 'Tasks', icon: '⚡', label: 'Tasks', count: '8' },
  ];

  return (
    <div className="max-w-[390px] mx-auto h-[844px] bg-[#FAF8F4] overflow-hidden relative font-sans text-[#1A1A2E] flex flex-col shadow-xl">
      
      {/* Header */}
      <div className="bg-[#FAF8F4] pt-14 pb-3 px-4 flex justify-between items-center z-10 sticky top-0">
        <h1 className="text-[24px] font-bold text-[#1A1A2E] tracking-tight">Services</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#10B981]/10 text-[#10B981] px-2 py-1 rounded-full text-xs font-semibold border border-[#10B981]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] mr-1.5 animate-pulse"></div>
            Active Now (2)
          </div>
          <button className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[#E8E4F0] shadow-sm">
            <Bell size={20} className="text-[#1A1A2E]" />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#EF4444] rounded-full border border-white"></span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        {/* Stats Row */}
        <div className="mx-4 mt-1 mb-4 flex gap-2">
          <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm border border-[#E8E4F0] flex flex-col justify-between">
            <div className="w-6 h-6 rounded-full bg-[#5B4FE8]/10 flex items-center justify-center mb-1">
              <TrendingUp size={14} className="text-[#5B4FE8]" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#5B4FE8] leading-none mb-0.5">12</div>
              <div className="text-[10px] font-medium text-[#1A1A2E]/55">Open Listings</div>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm border border-[#E8E4F0] flex flex-col justify-between">
            <div className="w-6 h-6 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mb-1">
              <Activity size={14} className="text-[#F59E0B]" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#F59E0B] leading-none mb-0.5">3</div>
              <div className="text-[10px] font-medium text-[#1A1A2E]/55">Active Now</div>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm border border-[#E8E4F0] flex flex-col justify-between">
            <div className="w-6 h-6 rounded-full bg-[#10B981]/10 flex items-center justify-center mb-1">
              <Clock size={14} className="text-[#10B981]" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#10B981] leading-none mb-0.5">₹1,240</div>
              <div className="text-[10px] font-medium text-[#1A1A2E]/55">Earned This Week</div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="pl-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pr-4 scrollbar-hide pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-[#5B4FE8] text-white border-[#5B4FE8] shadow-sm'
                    : 'bg-white text-[#1A1A2E] border-[#E8E4F0] hover:bg-gray-50'
                }`}
              >
                <span className="mr-1.5">{cat.icon}</span>
                {cat.label}
                {cat.count && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] ${
                    activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#1A1A2E]/60'
                  }`}>
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mx-4 mb-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A2E]/40" />
            <input 
              type="text" 
              placeholder="Search assignments, food..." 
              className="w-full bg-white border border-[#E8E4F0] rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 focus:outline-none focus:ring-2 focus:ring-[#5B4FE8]/20"
            />
          </div>
        </div>

        {/* Feed */}
        <div className="px-4 pb-8 flex flex-col gap-3">
          
          {/* Assignment Card (Compact) */}
          <div className="bg-white rounded-xl p-3.5 border border-[#E8E4F0] flex flex-col gap-2.5 shadow-sm relative overflow-hidden">
            {/* Top row: Icon + Title + Price */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0 mt-0.5">
                <FileText size={16} className="text-[#5B4FE8]" />
              </div>
              <div className="flex-1 pr-2">
                <h3 className="text-[14px] font-bold text-[#1A1A2E] leading-tight">BCA Sem 3 DBMS Assignment Help</h3>
              </div>
              <div className="text-[20px] font-extrabold text-[#5B4FE8] shrink-0 leading-none mt-0.5">
                ₹299
              </div>
            </div>

            {/* Row 2: Author + Status */}
            <div className="flex items-center justify-between pl-11">
              <div className="text-[11px] font-medium text-[rgba(26,26,46,0.55)]">by Priya Sharma · Bennett University</div>
              <div className="px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[#10B981] text-[10px] font-bold uppercase tracking-wide">Open</div>
            </div>

            {/* Row 3: Description */}
            <div className="text-[12px] text-[rgba(26,26,46,0.65)] leading-relaxed line-clamp-1 pl-11">
              Need help completing 5 practical assignments for DBMS. Must follow the specific format.
            </div>

            {/* Row 4: Tags + Action */}
            <div className="flex items-center justify-between pt-1 pl-11">
              <div className="flex flex-wrap gap-1.5">
                {['DBMS', 'BCA', 'Year 2'].map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 rounded-md bg-gray-100 text-[rgba(26,26,46,0.65)] text-[10px] font-medium">
                    {tag}
                  </span>
                ))}
              </div>
              <button className="bg-[#5B4FE8] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm active:scale-95 transition-transform">
                Book Now
              </button>
            </div>
          </div>

          {/* Delivery Card (Compact) */}
          <div className="bg-white rounded-xl p-3.5 border border-[#E8E4F0] flex flex-col gap-2.5 shadow-sm relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0 mt-0.5">
                <Truck size={16} className="text-[#F59E0B]" />
              </div>
              <div className="flex-1 pr-2">
                <h3 className="text-[14px] font-bold text-[#1A1A2E] leading-tight">Southern Stories <span className="text-[#1A1A2E]/40 font-medium mx-0.5">→</span> Room 204 Block B</h3>
              </div>
              <div className="text-[20px] font-extrabold text-[#F59E0B] shrink-0 leading-none mt-0.5">
                ₹370
              </div>
            </div>

            <div className="flex items-center justify-between pl-11">
              <div className="flex gap-1.5">
                <div className="px-2 py-0.5 rounded-md bg-[#F59E0B]/10 text-[#F59E0B] text-[10px] font-bold uppercase tracking-wide">Food Order</div>
                <div className="px-2 py-0.5 rounded-md bg-[#F59E0B]/10 text-[#F59E0B] text-[10px] font-bold uppercase tracking-wide">Accepted</div>
              </div>
            </div>

            <div className="text-[12px] text-[rgba(26,26,46,0.65)] leading-relaxed line-clamp-1 pl-11 font-medium">
              Veg Burger ×1, French Fries ×2, Cold Coffee ×1...
            </div>

            <div className="flex items-center justify-between pt-1 pl-11">
              <div className="text-[11px] font-medium text-[rgba(26,26,46,0.55)]">
                ₹340 food + ₹30 delivery
              </div>
              <button className="bg-[#F59E0B] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm active:scale-95 transition-transform">
                Accept Request
              </button>
            </div>
          </div>

          {/* Task Card (Compact) */}
          <div className="bg-white rounded-xl p-3.5 border border-[#E8E4F0] flex flex-col gap-2.5 shadow-sm relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FEE2E2] flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={16} className="text-[#EF4444]" />
              </div>
              <div className="flex-1 pr-2">
                <h3 className="text-[14px] font-bold text-[#1A1A2E] leading-tight">Design my FYP Poster</h3>
              </div>
              <div className="text-[20px] font-extrabold text-[#EF4444] shrink-0 leading-none mt-0.5">
                ₹500
              </div>
            </div>

            <div className="flex items-center justify-between pl-11">
              <div className="text-[11px] font-medium text-[rgba(26,26,46,0.55)]">by Rahul Kumar</div>
              <div className="flex gap-1.5">
                <div className="px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[#10B981] text-[10px] font-bold uppercase tracking-wide">Open</div>
              </div>
            </div>

            <div className="text-[12px] text-[rgba(26,26,46,0.65)] leading-relaxed line-clamp-1 pl-11">
              Need a modern, minimalist A3 poster designed for my final year project presentation.
            </div>

            <div className="flex items-center justify-between pt-1 pl-11">
              <div className="flex flex-wrap gap-1.5">
                <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-[rgba(26,26,46,0.65)] text-[10px] font-medium">design</span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#EF4444]/10 text-[#EF4444] text-[10px] font-bold">4 applied</span>
              </div>
              <button className="bg-[#EF4444] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm active:scale-95 transition-transform">
                Apply
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* FAB */}
      <button className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-[#5B4FE8] text-white flex flex-col items-center justify-center shadow-lg shadow-[#5B4FE8]/30 active:scale-95 transition-transform border-2 border-white/20">
        <Plus size={24} strokeWidth={2.5} className="mb-0.5" />
        <span className="text-[9px] font-bold leading-none">Post</span>
      </button>

    </div>
  );
}
