import React, { useState } from 'react';
import { 
  Search, Bell, Plus, Package, FileText, Award, 
  Briefcase, CheckSquare, Zap, MapPin, ChevronDown, 
  Star, Users, Tag, Book, Layers, Truck, ArrowRight, 
  Clock, Check, X, Grid
} from 'lucide-react';

export function ServiceUI3() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="max-w-[390px] mx-auto h-[844px] bg-[#FAF8F4] relative font-['Inter'] overflow-hidden flex flex-col border border-[#E8E4F0] shadow-sm">
      {/* Header */}
      <div className="pt-12 px-4 pb-2 z-10 bg-[#FAF8F4]">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-[20px] font-bold text-[#1A1A2E]">Explore Services</h1>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#E8E4F0]">
              <Bell className="w-5 h-5 text-[#1A1A2E]" />
            </div>
            <div className="absolute top-0 right-0 w-4 h-4 bg-[#EF4444] rounded-full border-2 border-[#FAF8F4] flex items-center justify-center">
              <span className="text-[9px] font-bold text-white leading-none">2</span>
            </div>
          </div>
        </div>
        
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5B4FE8] rounded-full shadow-sm w-fit">
          <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
          <span className="text-xs font-medium text-white">Active Now (2)</span>
        </button>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Category Grid */}
        <div className="grid grid-cols-3 gap-2 px-4 mt-3 mb-1">
          {/* All */}
          <div className="flex flex-col items-center bg-white rounded-2xl py-3 px-2 shadow-sm border border-[#E8E4F0]">
            <div className="w-10 h-10 rounded-full bg-[#1A1A2E]/5 flex items-center justify-center mb-1.5">
              <Grid className="w-5 h-5 text-[#1A1A2E]" />
            </div>
            <span className="text-[11px] font-bold text-[#1A1A2E]">✦ All</span>
            <span className="text-[10px] text-[#1A1A2E]/55">12</span>
          </div>

          {/* Delivery */}
          <div className="flex flex-col items-center bg-white rounded-2xl py-3 px-2 shadow-sm border border-[#E8E4F0]">
            <div className="w-10 h-10 rounded-full bg-[#F59E0B]/15 flex items-center justify-center mb-1.5">
              <Truck className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <span className="text-[11px] font-bold text-[#1A1A2E]">🚀 Delivery</span>
            <span className="text-[10px] text-[#1A1A2E]/55">3</span>
          </div>

          {/* Assignments (Active) */}
          <div className="flex flex-col items-center bg-[#5B4FE8]/5 rounded-2xl py-3 px-2 shadow-sm border-2 border-[#5B4FE8]">
            <div className="w-10 h-10 rounded-full bg-[#5B4FE8]/15 flex items-center justify-center mb-1.5">
              <FileText className="w-5 h-5 text-[#5B4FE8]" />
            </div>
            <span className="text-[11px] font-bold text-[#5B4FE8]">📝 Assignments</span>
            <span className="text-[10px] text-[#1A1A2E]/55">5</span>
          </div>

          {/* Certifications */}
          <div className="flex flex-col items-center bg-white rounded-2xl py-3 px-2 shadow-sm border border-[#E8E4F0]">
            <div className="w-10 h-10 rounded-full bg-[#10B981]/15 flex items-center justify-center mb-1.5">
              <Award className="w-5 h-5 text-[#10B981]" />
            </div>
            <span className="text-[11px] font-bold text-[#1A1A2E]">🏆 Certs</span>
            <span className="text-[10px] text-[#1A1A2E]/55">2</span>
          </div>

          {/* Projects */}
          <div className="flex flex-col items-center bg-white rounded-2xl py-3 px-2 shadow-sm border border-[#E8E4F0]">
            <div className="w-10 h-10 rounded-full bg-[#6366F1]/15 flex items-center justify-center mb-1.5">
              <Briefcase className="w-5 h-5 text-[#6366F1]" />
            </div>
            <span className="text-[11px] font-bold text-[#1A1A2E]">💼 Projects</span>
            <span className="text-[10px] text-[#1A1A2E]/55">4</span>
          </div>

          {/* Tasks */}
          <div className="flex flex-col items-center bg-white rounded-2xl py-3 px-2 shadow-sm border border-[#E8E4F0]">
            <div className="w-10 h-10 rounded-full bg-[#EF4444]/15 flex items-center justify-center mb-1.5">
              <Zap className="w-5 h-5 text-[#EF4444]" />
            </div>
            <span className="text-[11px] font-bold text-[#1A1A2E]">⚡ Tasks</span>
            <span className="text-[10px] text-[#1A1A2E]/55">6</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 mt-2 mb-1">
          <div className="bg-white rounded-xl border border-[#E8E4F0] flex items-center px-3 py-2.5">
            <Search className="w-4 h-4 text-[#1A1A2E]/55 mr-2" />
            <input 
              type="text" 
              placeholder="Search services..." 
              className="bg-transparent flex-1 text-[13px] text-[#1A1A2E] placeholder:text-[#1A1A2E]/55 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Section Label */}
        <div className="px-4 mb-2 mt-4">
          <h2 className="text-[13px] font-bold text-[#5B4FE8]">📝 Assignments (5)</h2>
        </div>

        {/* Card List */}
        <div className="px-4 flex flex-col gap-3">
          
          {/* Assignment Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4F0] flex gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-[#5B4FE8]" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-[14px] text-[#1A1A2E] leading-tight">BCA Sem 3 DBMS Assignment Help</h3>
                <span className="font-bold text-[14px] text-[#5B4FE8]">₹299</span>
              </div>
              <p className="text-[11px] text-[#1A1A2E]/55 mt-1">by Priya Sharma · Bennett University</p>
              <p className="text-[12px] text-[#1A1A2E]/55 mt-2 line-clamp-2 leading-snug">
                Complete DBMS assignment with ER diagrams, normalization, and SQL queries. Submission-ready format.
              </p>
              
              <div className="flex flex-wrap gap-1.5 mt-3">
                <div className="flex items-center gap-1 px-2 py-1 bg-[#FAF8F4] rounded border border-[#E8E4F0]">
                  <Book className="w-3 h-3 text-[#1A1A2E]/55" />
                  <span className="text-[10px] font-medium text-[#1A1A2E]">DBMS</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-[#FAF8F4] rounded border border-[#E8E4F0]">
                  <Layers className="w-3 h-3 text-[#1A1A2E]/55" />
                  <span className="text-[10px] font-medium text-[#1A1A2E]">BCA</span>
                </div>
                <div className="flex items-center px-2 py-1 bg-[#FAF8F4] rounded border border-[#E8E4F0]">
                  <span className="text-[10px] font-medium text-[#1A1A2E]">Year 2</span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="px-2 py-1 bg-[#10B981]/15 rounded text-[10px] font-bold text-[#10B981]">
                  Open
                </div>
                <button className="px-4 py-1.5 bg-[#5B4FE8] text-white text-[12px] font-bold rounded-lg shadow-sm">
                  Book Now
                </button>
              </div>
            </div>
          </div>

          {/* Delivery Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4F0] flex gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
              <Truck className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-[14px] text-[#1A1A2E] leading-tight">Southern Stories</h3>
                  <p className="text-[12px] text-[#1A1A2E]/55 mt-0.5 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> Room 204, Block B
                  </p>
                </div>
                <div className="flex flex-col items-end">
                   <div className="px-2 py-1 bg-[#F59E0B]/15 rounded text-[10px] font-bold text-[#F59E0B] mb-1">
                    Accepted
                  </div>
                </div>
              </div>

              <div className="bg-[#FAF8F4] p-2 rounded-lg border border-[#E8E4F0] mb-3">
                <p className="text-[11px] text-[#1A1A2E] leading-tight">Veg Burger ×1 — ₹130</p>
                <p className="text-[11px] text-[#1A1A2E] leading-tight mt-0.5">French Fries ×2 — ₹100</p>
                <p className="text-[11px] text-[#1A1A2E] leading-tight mt-0.5">Cold Coffee ×1 — ₹110</p>
              </div>

              <div className="flex justify-between items-center border-t border-[#E8E4F0] pt-2">
                <div className="text-[10px] text-[#1A1A2E]/55 flex items-center gap-1.5">
                  <span>Subtotal ₹340</span>
                  <span className="w-1 h-1 rounded-full bg-[#E8E4F0]"></span>
                  <span>Delivery ₹30</span>
                </div>
                <div className="text-[13px] font-bold text-[#1A1A2E]">
                  Total ₹370
                </div>
              </div>

              <div className="mt-3">
                <button className="w-full py-2 bg-[#F59E0B] text-white text-[13px] font-bold rounded-xl shadow-sm">
                  Accept Request
                </button>
              </div>
            </div>
          </div>

          {/* Task Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4F0] flex gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2] flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-[#EF4444]" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-[14px] text-[#1A1A2E] leading-tight">Design my Final Year Project Poster</h3>
                <span className="font-bold text-[14px] text-[#EF4444]">₹500</span>
              </div>
              <p className="text-[11px] text-[#1A1A2E]/55 mt-1">by Rahul Kumar</p>
              
              <p className="text-[12px] text-[#1A1A2E]/55 mt-2 line-clamp-2 leading-snug">
                Need a professional A3 poster for my BCA final year project. Canva or Figma designs welcome.
              </p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                <div className="flex items-center gap-1 px-2 py-1 bg-[#FAF8F4] rounded border border-[#E8E4F0]">
                  <Tag className="w-3 h-3 text-[#1A1A2E]/55" />
                  <span className="text-[10px] font-medium text-[#1A1A2E]">design</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-[#FAF8F4] rounded border border-[#E8E4F0]">
                  <Users className="w-3 h-3 text-[#1A1A2E]/55" />
                  <span className="text-[10px] font-medium text-[#1A1A2E]">4 applied</span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="px-2 py-1 bg-[#10B981]/15 rounded text-[10px] font-bold text-[#10B981]">
                  Open
                </div>
                <button className="px-4 py-1.5 bg-[#EF4444] text-white text-[12px] font-bold rounded-lg shadow-sm">
                  Apply
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* FAB */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2 z-20">
        <div className="px-3 py-1.5 bg-white rounded-full shadow-md border border-[#E8E4F0]">
          <span className="text-[13px] font-bold text-[#1A1A2E]">Post</span>
        </div>
        <button className="w-14 h-14 rounded-full bg-[#5B4FE8] text-white flex items-center justify-center shadow-[0_8px_16px_rgba(91,79,232,0.3)] hover:scale-105 active:scale-95 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </div>

    </div>
  );
}
