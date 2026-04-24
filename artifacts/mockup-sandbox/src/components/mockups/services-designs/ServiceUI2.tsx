import React, { useState } from 'react';
import { Search, Bell, Plus, Book, Layers, Tag, Users } from 'lucide-react';

export function ServiceUI2() {
  const [activeTab, setActiveTab] = useState('Assignments');

  const tabs = [
    { id: 'All', label: 'All' },
    { id: 'Delivery', label: 'Delivery' },
    { id: 'Assignments', label: 'Assignments' },
    { id: 'Certs', label: 'Certs' },
    { id: 'Projects', label: 'Projects' },
    { id: 'Tasks', label: 'Tasks' },
  ];

  return (
    <div className="max-w-[390px] mx-auto h-[844px] overflow-hidden relative font-['Inter'] bg-[#FAF8F4] text-[#1A1A2E] flex flex-col">
      {/* Header */}
      <div className="pt-12 pb-4 px-4 flex justify-between items-center bg-[#FAF8F4]">
        <h1 className="text-2xl font-bold">Services</h1>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-full border border-[#5B4FE8] text-[#5B4FE8] text-[11px] font-medium bg-[#5B4FE8]/5 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
            2 active
          </div>
          <div className="relative">
            <Bell size={24} color="#1A1A2E" strokeWidth={1.5} />
            <div className="absolute top-0 right-0.5 w-2 h-2 rounded-full bg-[#EF4444] border-2 border-[#FAF8F4]"></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-[#E8E4F0]">
        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-[1px]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 whitespace-nowrap text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'text-[#5B4FE8] border-b-2 border-[#5B4FE8]'
                  : 'text-[#1A1A2E]/40 border-b-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 my-3">
        <div className="bg-white rounded-xl border border-[#E8E4F0] flex items-center px-3 py-2.5 shadow-sm shadow-black/[0.02]">
          <Search size={18} className="text-[#1A1A2E]/40 mr-2" />
          <input
            type="text"
            placeholder="Search services..."
            className="flex-1 bg-transparent text-sm text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 outline-none"
          />
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 flex flex-col gap-3">
        {/* Assignment Card */}
        <div className="bg-white rounded-xl overflow-hidden flex shadow-sm shadow-black/[0.02]">
          <div className="w-1 bg-[#5B4FE8]"></div>
          <div className="flex-1 p-4">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-[15px] leading-tight">📝 BCA Sem 3 DBMS Assignment Help</h3>
              <span className="font-bold text-[#5B4FE8] whitespace-nowrap">₹299</span>
            </div>
            <div className="text-[11px] text-[#1A1A2E]/55 mt-1">by Priya Sharma · Bennett University</div>
            <p className="text-[12px] text-[#1A1A2E]/55 mt-2 line-clamp-2 leading-relaxed">
              Complete DBMS assignment with ER diagrams, normalization, and SQL queries. Submission-ready format.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <div className="flex items-center gap-1 bg-[#EDE9FE] text-[#5B4FE8] px-2 py-0.5 rounded text-[10px] font-medium">
                <Book size={10} /> DBMS
              </div>
              <div className="flex items-center gap-1 bg-[#EDE9FE] text-[#5B4FE8] px-2 py-0.5 rounded text-[10px] font-medium">
                <Layers size={10} /> BCA
              </div>
              <div className="bg-[#EDE9FE] text-[#5B4FE8] px-2 py-0.5 rounded text-[10px] font-medium">
                Year 2
              </div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="bg-[#10B981]/10 text-[#10B981] px-2.5 py-1 rounded-full text-[11px] font-medium">
                Open
              </div>
              <button className="bg-[#5B4FE8] text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-[#5B4FE8]/90 transition-colors">
                Book Now
              </button>
            </div>
          </div>
        </div>

        {/* Delivery Card */}
        <div className="bg-white rounded-xl overflow-hidden flex shadow-sm shadow-black/[0.02]">
          <div className="w-1 bg-[#F59E0B]"></div>
          <div className="flex-1 p-4">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-[15px] leading-tight">🚀 Southern Stories</h3>
              <span className="font-bold text-[#F59E0B] whitespace-nowrap">₹370</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <div className="text-[11px] text-[#1A1A2E]/55">→ Room 204, Block B</div>
              <div className="bg-[#F59E0B]/10 text-[#F59E0B] px-2.5 py-1 rounded-full text-[11px] font-medium">
                Accepted
              </div>
            </div>
            
            <div className="mt-3 bg-[#FAF8F4] rounded-lg p-2.5 space-y-1.5">
              <div className="text-[11px] text-[#1A1A2E]/70 flex justify-between">
                <span>Veg Burger ×1</span>
                <span>₹130</span>
              </div>
              <div className="text-[11px] text-[#1A1A2E]/70 flex justify-between">
                <span>French Fries ×2</span>
                <span>₹100</span>
              </div>
              <div className="text-[11px] text-[#1A1A2E]/70 flex justify-between">
                <span>Cold Coffee ×1</span>
                <span>₹110</span>
              </div>
            </div>

            <div className="text-right text-[11px] text-[#1A1A2E]/55 mt-2.5 font-medium">
              Subtotal ₹340 + ₹30 delivery
            </div>
            
            <div className="flex justify-end mt-4">
              <button className="bg-[#F59E0B] text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-[#F59E0B]/90 transition-colors">
                Accept Request
              </button>
            </div>
          </div>
        </div>

        {/* Task Card */}
        <div className="bg-white rounded-xl overflow-hidden flex shadow-sm shadow-black/[0.02]">
          <div className="w-1 bg-[#EF4444]"></div>
          <div className="flex-1 p-4">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-[15px] leading-tight">⚡ Design my FYP Poster</h3>
              <span className="font-bold text-[#EF4444] whitespace-nowrap">₹500</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <div className="text-[11px] text-[#1A1A2E]/55">by Rahul Kumar</div>
              <div className="bg-[#10B981]/10 text-[#10B981] px-2.5 py-1 rounded-full text-[11px] font-medium">
                Open
              </div>
            </div>
            <p className="text-[12px] text-[#1A1A2E]/55 mt-2 line-clamp-2 leading-relaxed">
              Need a professional A3 poster for my BCA final year project. Canva or Figma designs welcome.
            </p>
            <div className="flex justify-between items-end mt-4">
              <div className="flex gap-2">
                <div className="flex items-center gap-1 bg-[#FAF8F4] text-[#1A1A2E]/70 px-2 py-1 rounded text-[10px] font-medium border border-[#E8E4F0]">
                  <Tag size={10} /> design
                </div>
                <div className="flex items-center gap-1 bg-[#FAF8F4] text-[#1A1A2E]/70 px-2 py-1 rounded text-[10px] font-medium border border-[#E8E4F0]">
                  <Users size={10} /> 4 applied
                </div>
              </div>
              <button className="bg-[#EF4444] text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-[#EF4444]/90 transition-colors">
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button className="absolute bottom-6 right-6 w-14 h-14 bg-[#5B4FE8] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#5B4FE8]/90 transition-transform active:scale-95 shadow-[#5B4FE8]/30">
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Global CSS for hiding scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
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
