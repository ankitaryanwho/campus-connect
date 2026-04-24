import React, { useState } from "react";
import { Search, Bell, Plus, Package, FileText, Award, Briefcase, CheckSquare, Zap, MapPin, Star, Users, Tag, Book, Layers, Truck, ArrowRight, Clock, Check, X, ChevronRight, Filter, TrendingUp, Activity, Store, Home } from "lucide-react";

export function ServiceUI6() {
  const [activeTab, setActiveTab] = useState("All");

  const categories = [
    { id: "All", icon: "✦", label: "All" },
    { id: "Delivery", icon: "🚀", label: "Delivery" },
    { id: "Assignments", icon: "📝", label: "Assignments" },
    { id: "Certs", icon: "🏆", label: "Certs" },
    { id: "Projects", icon: "💼", label: "Projects" },
    { id: "Tasks", icon: "⚡", label: "Tasks" },
  ];

  return (
    <div className="max-w-[390px] mx-auto h-[844px] overflow-hidden relative bg-[#FAF8F4]" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER */}
      <div className="bg-white shadow-sm pt-12 pb-4 px-4 z-10 relative">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Services</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#10B981]/10 px-2.5 py-1 rounded-full">
              <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
              <span className="text-xs font-medium text-[#10B981]">2 active</span>
            </div>
            <div className="relative">
              <Bell size={24} className="text-[#1A1A2E]" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#EF4444] border-2 border-white rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={18} className="text-[rgba(26,26,46,0.55)]" />
          </div>
          <input
            type="text"
            placeholder="Search services, assignments..."
            className="w-full bg-[#FAF8F4] text-[#1A1A2E] text-sm rounded-xl py-3 pl-10 pr-4 outline-none border border-[#E8E4F0] placeholder-[rgba(26,26,46,0.55)]"
          />
        </div>
      </div>

      <div className="h-[calc(844px-140px)] overflow-y-auto pb-24">
        
        {/* CATEGORY PILLS */}
        <div className="px-4 py-4">
          <div className="flex overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
            <div className="flex gap-2 bg-[#E8E4F0] rounded-full p-1 w-max">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                    activeTab === cat.id
                      ? "bg-white shadow-sm text-[#5B4FE8] font-medium"
                      : "text-[rgba(26,26,46,0.55)] hover:text-[#1A1A2E]"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CARDS LIST */}
        <div className="px-4 flex flex-col gap-4">

          {/* ASSIGNMENT CARD */}
          <div className="bg-white rounded-2xl p-4 border border-[#E8E4F0] shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-[#5B4FE8]/10 text-[#5B4FE8] px-2 py-1 rounded flex items-center gap-1">
                  <FileText size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Assignments</span>
                </div>
                <div className="bg-[#10B981]/10 text-[#10B981] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                  Open
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-[#1A1A2E]">₹299</span>
              </div>
            </div>

            <h3 className="text-base font-bold text-[#1A1A2E] leading-tight mb-1">BCA Sem 3 DBMS Assignment Help</h3>
            <p className="text-xs text-[rgba(26,26,46,0.55)] mb-4">by Priya Sharma · Bennett University</p>

            {/* PROGRESS TRACKER */}
            <div className="mb-4 pt-2">
              <div className="relative flex justify-between items-center">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-[#E8E4F0] z-0"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-[2px] bg-[#5B4FE8] z-0"></div>
                
                {[
                  { label: 'Booked', status: 'current' },
                  { label: 'Accepted', status: 'upcoming' },
                  { label: 'In Progress', status: 'upcoming' },
                  { label: 'Completed', status: 'upcoming' },
                  { label: 'Delivered', status: 'upcoming' }
                ].map((step, idx) => (
                  <div key={idx} className="relative z-10 flex flex-col items-center gap-1 w-10">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      step.status === 'current' 
                        ? 'border-[#5B4FE8] bg-white ring-2 ring-[#5B4FE8]/20' 
                        : 'border-[#E8E4F0] bg-white'
                    }`}></div>
                    <span className={`text-[9px] absolute top-4 whitespace-nowrap ${
                      step.status === 'current' ? 'text-[#5B4FE8] font-medium' : 'text-[rgba(26,26,46,0.55)]'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-[#1A1A2E] line-clamp-2 mt-6 mb-3 leading-snug">
              Need help with normalization and SQL queries for the final assignment. Must be completed by Friday.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {['DBMS', 'BCA', 'Year 2'].map((tag) => (
                <span key={tag} className="text-[10px] bg-[#FAF8F4] text-[rgba(26,26,46,0.55)] px-2 py-1 rounded-md border border-[#E8E4F0]">
                  {tag}
                </span>
              ))}
            </div>

            <button className="w-full bg-[#5B4FE8] hover:bg-[#4a3fd1] text-white font-medium py-3 rounded-xl transition-colors">
              Book Now
            </button>
          </div>

          {/* DELIVERY CARD */}
          <div className="bg-white rounded-2xl p-4 border border-[#E8E4F0] shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-1 rounded flex items-center gap-1">
                  <Package size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Food Order</span>
                </div>
                <div className="bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                  Accepted
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-[#1A1A2E]">₹370</span>
              </div>
            </div>

            {/* ROUTE VISUALIZATION */}
            <div className="mb-5 flex items-center justify-between gap-2">
              <div className="flex-1 bg-[#FAF8F4] border border-[#E8E4F0] rounded-lg p-2.5 flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <Store size={16} className="text-[#1A1A2E]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[rgba(26,26,46,0.55)] uppercase tracking-wider">Pickup</p>
                  <p className="text-xs font-semibold text-[#1A1A2E] truncate">Southern Stories</p>
                </div>
              </div>
              
              <div className="flex-shrink-0 flex items-center text-[#E8E4F0]">
                <div className="w-6 border-t-[2px] border-dashed border-[#E8E4F0]"></div>
                <ArrowRight size={16} className="text-[#E8E4F0] -ml-1" />
              </div>

              <div className="flex-1 bg-[#FAF8F4] border border-[#E8E4F0] rounded-lg p-2.5 flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <Home size={16} className="text-[#1A1A2E]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[rgba(26,26,46,0.55)] uppercase tracking-wider">Drop</p>
                  <p className="text-xs font-semibold text-[#1A1A2E] truncate">Room 204 Block B</p>
                </div>
              </div>
            </div>

            {/* PROGRESS TRACKER */}
            <div className="mb-4">
              <div className="relative flex justify-between items-center">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-[#E8E4F0] z-0"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[20%] h-[2px] bg-[#F59E0B] z-0"></div>
                
                {[
                  { label: 'Awaiting', status: 'completed' },
                  { label: 'Accepted', status: 'current' },
                  { label: 'Heading Out', status: 'upcoming' },
                  { label: 'Placed', status: 'upcoming' },
                  { label: 'Collecting', status: 'upcoming' },
                  { label: 'Arrived', status: 'upcoming' }
                ].map((step, idx) => (
                  <div key={idx} className="relative z-10 flex flex-col items-center gap-1 w-6">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      step.status === 'completed' ? 'border-[#F59E0B] bg-[#F59E0B]' :
                      step.status === 'current' ? 'border-[#F59E0B] bg-white ring-2 ring-[#F59E0B]/20' :
                      'border-[#E8E4F0] bg-white'
                    }`}></div>
                    {/* Only show important labels to save space */}
                    {(idx === 0 || idx === 1 || idx === 5) && (
                      <span className={`text-[9px] absolute top-4 whitespace-nowrap ${
                        step.status === 'current' ? 'text-[#F59E0B] font-medium' : 'text-[rgba(26,26,46,0.55)]'
                      }`}>
                        {step.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#FAF8F4] rounded-xl p-3 mb-4 mt-6">
              <div className="space-y-2 mb-3 border-b border-[#E8E4F0] pb-3">
                {["Veg Burger ×1 — ₹130", "French Fries ×2 — ₹100", "Cold Coffee ×1 — ₹110"].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-xs text-[#1A1A2E]">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-[#F59E0B] rounded-full"></div>
                      <span>{item.split(' — ')[0]}</span>
                    </div>
                    <span className="font-medium">{item.split(' — ')[1]}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[rgba(26,26,46,0.55)]">Subtotal ₹340 + Delivery ₹30</span>
                <span className="font-bold text-[#1A1A2E]">Total ₹370</span>
              </div>
            </div>

            <button className="w-full bg-[#F59E0B] hover:bg-[#d98b09] text-white font-medium py-3 rounded-xl transition-colors">
              Accept Request
            </button>
          </div>

          {/* TASK CARD */}
          <div className="bg-white rounded-2xl p-4 border border-[#E8E4F0] shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-[#EF4444]/10 text-[#EF4444] px-2 py-1 rounded flex items-center gap-1">
                  <Zap size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Tasks</span>
                </div>
                <div className="bg-[#10B981]/10 text-[#10B981] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                  Open
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-[#1A1A2E]">₹500</span>
              </div>
            </div>

            <h3 className="text-base font-bold text-[#1A1A2E] leading-tight mb-1">Design my FYP Poster</h3>
            <p className="text-xs text-[rgba(26,26,46,0.55)] mb-4">by Rahul Kumar</p>

            {/* APPLICANT PROGRESS */}
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-[#1A1A2E]">4 applied</span>
                <span className="text-[rgba(26,26,46,0.55)]">10 slots</span>
              </div>
              <div className="h-2 w-full bg-[#FAF8F4] rounded-full overflow-hidden border border-[#E8E4F0]">
                <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>

            <p className="text-sm text-[#1A1A2E] line-clamp-2 mb-3 leading-snug">
              Looking for someone to design an A0 sized academic poster for my Final Year Project on ML.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {['design', '4 applied'].map((tag) => (
                <span key={tag} className="text-[10px] bg-[#FAF8F4] text-[rgba(26,26,46,0.55)] px-2 py-1 rounded-md border border-[#E8E4F0]">
                  {tag}
                </span>
              ))}
            </div>

            <button className="w-full bg-[#EF4444] hover:bg-[#dc2626] text-white font-medium py-3 rounded-xl transition-colors">
              Apply
            </button>
          </div>

        </div>
      </div>

      {/* FAB */}
      <button className="absolute bottom-6 right-6 w-14 h-14 bg-[#5B4FE8] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#4a3fd1] transition-transform active:scale-95">
        <Plus size={24} />
      </button>

    </div>
  );
}
