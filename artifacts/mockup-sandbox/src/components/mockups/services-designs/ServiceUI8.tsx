import React, { useState } from 'react';
import { 
  Search, Bell, Plus, Package, FileText, Award, Briefcase, 
  CheckSquare, Zap, MapPin, Star, Users, Tag, Book, Layers, 
  Truck, ArrowRight, Clock, Check, X, ChevronRight, Filter, 
  TrendingUp, Activity 
} from 'lucide-react';

export function ServiceUI8() {
  const [activeCategory, setActiveCategory] = useState('✦ All');

  const categories = [
    { name: '✦ All' },
    { name: '🚀 Delivery' },
    { name: '📝 Assignments' },
    { name: '🏆 Certs' },
    { name: '💼 Projects' },
    { name: '⚡ Tasks' },
  ];

  return (
    <div className="max-w-[390px] mx-auto h-[844px] overflow-hidden relative bg-[#FAF8F4] font-sans text-[#1A1A2E]">
      {/* HEADER */}
      <div className="pt-12 pb-4 px-4">
        <div className="flex justify-between items-center">
          <h1 className="text-[26px] font-bold text-[#1A1A2E]">Services</h1>
          <div className="flex gap-3">
            <button className="w-10 h-10 rounded-full border border-[#E8E4F0] flex items-center justify-center bg-white">
              <Filter className="w-5 h-5 text-[#1A1A2E]" />
            </button>
            <button className="w-10 h-10 rounded-full border border-[#E8E4F0] flex items-center justify-center bg-white relative">
              <Bell className="w-5 h-5 text-[#1A1A2E]" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#5B4FE8] rounded-full border border-white"></span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="bg-[#EDE9FE] text-[#5B4FE8] px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Active Now (2)
          </div>
          <span className="text-[rgba(26,26,46,0.55)] text-sm">12 listings</span>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="mx-4 mt-2 mb-3 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1A1A2E]/40" />
        <input 
          type="text" 
          placeholder="Search services..." 
          className="w-full h-12 bg-white rounded-2xl border border-[#E8E4F0] shadow-sm pl-11 pr-4 text-[15px] outline-none placeholder:text-[#1A1A2E]/40"
        />
      </div>

      {/* CATEGORY CHIPS */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`snap-start whitespace-nowrap rounded-2xl px-4 py-2.5 font-semibold text-[13px] transition-colors ${
                activeCategory === cat.name
                  ? 'bg-[#5B4FE8] text-white'
                  : 'bg-white border border-[#E8E4F0] text-[#1A1A2E]/60'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* SCROLLABLE LIST */}
      <div className="h-[calc(100%-240px)] overflow-y-auto pb-24 px-4 space-y-4 scrollbar-hide pt-2">
        
        {/* ASSIGNMENT TILE */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-md relative">
          <div className="h-[6px] w-full bg-[#5B4FE8]"></div>
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#5B4FE8]" />
              </div>
              <div className="text-right">
                <div className="text-[22px] font-bold text-[#5B4FE8] leading-none mb-1">₹299</div>
                <span className="bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Open</span>
              </div>
            </div>
            
            <h3 className="text-[16px] font-bold text-[#1A1A2E] mt-3 leading-tight">BCA Sem 3 DBMS Assignment Help</h3>
            <p className="text-[12px] text-[rgba(26,26,46,0.55)] mt-1">by Priya Sharma · Bennett University</p>
            
            <div className="border-t border-[#E8E4F0] my-3"></div>
            
            <p className="text-[13px] text-[rgba(26,26,46,0.55)] leading-relaxed line-clamp-2">
              Need help completing 5 SQL queries and ER diagram for the final submission. Deadline is tomorrow 5 PM.
            </p>
            
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="px-2 py-1 bg-[#EDE9FE] text-[#5B4FE8] text-[11px] font-medium rounded-md">DBMS</span>
              <span className="px-2 py-1 bg-[#F5F5F5] text-[#1A1A2E]/60 text-[11px] font-medium rounded-md">BCA</span>
              <span className="px-2 py-1 bg-[#F5F5F5] text-[#1A1A2E]/60 text-[11px] font-medium rounded-md">Year 2</span>
            </div>
            
            <button className="w-full mt-4 bg-[#5B4FE8] text-white font-semibold py-3 rounded-xl text-[14px] active:scale-[0.98] transition-transform">
              Book Now
            </button>
          </div>
        </div>

        {/* DELIVERY TILE */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-md relative">
          <div className="h-[6px] w-full bg-[#F59E0B]"></div>
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div className="text-right">
                <div className="text-[22px] font-bold text-[#F59E0B] leading-none mb-1">₹370</div>
                <span className="bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Accepted</span>
              </div>
            </div>
            
            <h3 className="text-[16px] font-bold text-[#1A1A2E] mt-3 leading-tight">Southern Stories</h3>
            <p className="text-[12px] text-[rgba(26,26,46,0.55)] mt-1">→ Room 204, Block B</p>
            
            <div className="border-t border-[#E8E4F0] my-3"></div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#1A1A2E]">Veg Burger ×1</span>
                <span className="text-[rgba(26,26,46,0.55)]">₹130</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#1A1A2E]">French Fries ×2</span>
                <span className="text-[rgba(26,26,46,0.55)]">₹100</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#1A1A2E]">Cold Coffee ×1</span>
                <span className="text-[rgba(26,26,46,0.55)]">₹110</span>
              </div>
            </div>
            
            <div className="border-t border-dashed border-[#E8E4F0] my-3 pt-3">
              <div className="flex justify-between items-center text-[14px]">
                <span className="text-[rgba(26,26,46,0.55)]">Subtotal + Delivery</span>
                <span className="font-bold text-[#1A1A2E]">Total ₹370</span>
              </div>
            </div>
            
            <button className="w-full mt-3 bg-[#F59E0B] text-white font-semibold py-3 rounded-xl text-[14px] active:scale-[0.98] transition-transform">
              Accept Request
            </button>
          </div>
        </div>

        {/* TASK TILE */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-md relative">
          <div className="h-[6px] w-full bg-[#EF4444]"></div>
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-[#EF4444]/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#EF4444]" />
              </div>
              <div className="text-right">
                <div className="text-[22px] font-bold text-[#EF4444] leading-none mb-1">₹500</div>
                <span className="bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Open</span>
              </div>
            </div>
            
            <h3 className="text-[16px] font-bold text-[#1A1A2E] mt-3 leading-tight">Design my FYP Poster</h3>
            <p className="text-[12px] text-[rgba(26,26,46,0.55)] mt-1">by Rahul Kumar</p>
            
            <div className="border-t border-[#E8E4F0] my-3"></div>
            
            <p className="text-[13px] text-[rgba(26,26,46,0.55)] leading-relaxed line-clamp-2">
              Looking for someone to design an A1 size poster for my final year project. I have the content ready, need visual magic.
            </p>
            
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="px-2 py-1 bg-[#EF4444]/10 text-[#EF4444] text-[11px] font-medium rounded-md">design</span>
              <span className="px-2 py-1 bg-[#F5F5F5] text-[#1A1A2E]/60 text-[11px] font-medium rounded-md">4 applied</span>
            </div>
            
            <button className="w-full mt-4 bg-[#EF4444] text-white font-semibold py-3 rounded-xl text-[14px] active:scale-[0.98] transition-transform">
              Apply
            </button>
          </div>
        </div>

      </div>

      {/* FAB */}
      <button className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-[#5B4FE8] shadow-xl shadow-[#5B4FE8]/30 flex items-center justify-center active:scale-95 transition-transform z-10">
        <Plus className="w-6 h-6 text-white" />
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
