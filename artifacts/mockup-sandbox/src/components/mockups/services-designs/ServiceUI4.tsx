import React, { useState } from 'react';
import { Bell, Search, Plus, Package, FileText, Zap, ChevronDown, ChevronRight, Book, Layers, Users, Tag, Clock } from 'lucide-react';

export function ServiceUI4() {
  const [fabOpen, setFabOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    assignments: true,
    delivery: true,
    tasks: true,
    certifications: false,
    projects: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="w-[390px] mx-auto h-[844px] overflow-hidden relative font-['Inter'] bg-[#FAF8F4] flex flex-col shadow-xl">
      {/* Header */}
      <div className="bg-white shadow-sm z-10 flex-shrink-0 pt-12 pb-4">
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-[#1A1A2E] text-[22px] font-bold">Services</h1>
            <div className="bg-[#10B981]/10 text-[#10B981] px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
              Active Now (2)
            </div>
          </div>
          <button className="relative p-2 text-[#1A1A2E]">
            <Bell size={24} />
            <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#EF4444] rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-bold">
              2
            </div>
          </button>
        </div>
        
        <div className="px-4">
          <div className="bg-[#FAF8F4] rounded-xl flex items-center px-3 py-2.5 border border-[#E8E4F0]">
            <Search size={18} className="text-[rgba(26,26,46,0.55)] mr-2" />
            <input 
              type="text" 
              placeholder="Search services..." 
              className="bg-transparent border-none outline-none text-[#1A1A2E] text-sm w-full placeholder:text-[rgba(26,26,46,0.55)]"
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="flex flex-col gap-6 py-6">
          
          {/* SECTION A - Assignments */}
          <div className="flex flex-col gap-3">
            <div 
              className="flex items-center justify-between px-4 cursor-pointer select-none"
              onClick={() => toggleSection('assignments')}
            >
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-4 bg-[#5B4FE8] rounded-full"></div>
                <h2 className="text-[#5B4FE8] text-sm font-bold">📝 Assignments</h2>
              </div>
              <div className="flex items-center gap-2 text-[rgba(26,26,46,0.55)]">
                <span className="text-xs">5 listings</span>
                {expandedSections.assignments ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>

            {expandedSections.assignments && (
              <div className="bg-white rounded-2xl p-4 border border-[#E8E4F0] shadow-sm mx-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-[#5B4FE8]/10 text-[#5B4FE8] px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center">
                    📝 Assignments
                  </div>
                  <div className="bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                    Open
                  </div>
                </div>
                
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[#1A1A2E] font-bold text-base leading-tight pr-4">BCA Sem 3 DBMS Assignment Help</h3>
                  <div className="text-[#5B4FE8] font-bold text-lg whitespace-nowrap">₹299</div>
                </div>
                
                <p className="text-[rgba(26,26,46,0.55)] text-xs mb-3">by Priya Sharma · Bennett University</p>
                
                <p className="text-[#1A1A2E] text-sm leading-snug mb-4">
                  Complete DBMS assignment with ER diagrams, normalization, and SQL queries. Submission-ready format.
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-1 bg-[#FAF8F4] text-[#1A1A2E] px-2 py-1 rounded text-xs border border-[#E8E4F0]">
                    <Book size={12} className="text-[rgba(26,26,46,0.55)]" /> DBMS
                  </div>
                  <div className="flex items-center gap-1 bg-[#FAF8F4] text-[#1A1A2E] px-2 py-1 rounded text-xs border border-[#E8E4F0]">
                    <Layers size={12} className="text-[rgba(26,26,46,0.55)]" /> BCA
                  </div>
                  <div className="flex items-center gap-1 bg-[#FAF8F4] text-[#1A1A2E] px-2 py-1 rounded text-xs border border-[#E8E4F0]">
                    Year 2
                  </div>
                </div>
                
                <button className="w-full bg-[#5B4FE8] text-white font-medium text-sm py-2.5 rounded-lg active:scale-[0.98] transition-transform">
                  Book Now
                </button>
              </div>
            )}
          </div>

          {/* SECTION B - Delivery */}
          <div className="flex flex-col gap-3">
            <div 
              className="flex items-center justify-between px-4 cursor-pointer select-none"
              onClick={() => toggleSection('delivery')}
            >
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-4 bg-[#F59E0B] rounded-full"></div>
                <h2 className="text-[#F59E0B] text-sm font-bold">🚀 Delivery</h2>
              </div>
              <div className="flex items-center gap-2 text-[rgba(26,26,46,0.55)]">
                <span className="text-xs">3 active</span>
                {expandedSections.delivery ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>

            {expandedSections.delivery && (
              <div className="bg-white rounded-2xl p-4 border border-[#E8E4F0] shadow-sm mx-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-[#F59E0B]/10 text-[#F59E0B] px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center">
                    🚀 Food Order
                  </div>
                  <div className="bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                    Accepted
                  </div>
                </div>
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col gap-1">
                    <div className="text-[#1A1A2E] font-bold text-sm">Southern Stories</div>
                    <div className="text-[rgba(26,26,46,0.55)] text-sm">→ Room 204, Block B</div>
                  </div>
                  <div className="text-[#F59E0B] font-bold text-lg whitespace-nowrap">₹370</div>
                </div>
                
                <div className="bg-[#FAF8F4] rounded-lg p-3 mb-4 border border-[#E8E4F0]">
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between text-[#1A1A2E]">
                      <span>Veg Burger ×1</span>
                      <span>₹130</span>
                    </div>
                    <div className="flex justify-between text-[#1A1A2E]">
                      <span>French Fries ×2</span>
                      <span>₹100</span>
                    </div>
                    <div className="flex justify-between text-[#1A1A2E]">
                      <span>Cold Coffee ×1</span>
                      <span>₹110</span>
                    </div>
                  </div>
                  
                  <div className="h-[1px] bg-[#E8E4F0] my-3"></div>
                  
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between text-[rgba(26,26,46,0.55)]">
                      <span>Subtotal</span>
                      <span>₹340</span>
                    </div>
                    <div className="flex justify-between text-[rgba(26,26,46,0.55)]">
                      <span>Delivery</span>
                      <span>₹30</span>
                    </div>
                    <div className="flex justify-between text-[#1A1A2E] font-bold mt-1 text-sm">
                      <span>Total</span>
                      <span>₹370</span>
                    </div>
                  </div>
                </div>
                
                <button className="w-full bg-[#F59E0B] text-white font-medium text-sm py-2.5 rounded-lg active:scale-[0.98] transition-transform">
                  Accept Request
                </button>
              </div>
            )}
          </div>

          {/* SECTION C - Tasks */}
          <div className="flex flex-col gap-3">
            <div 
              className="flex items-center justify-between px-4 cursor-pointer select-none"
              onClick={() => toggleSection('tasks')}
            >
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-4 bg-[#EF4444] rounded-full"></div>
                <h2 className="text-[#EF4444] text-sm font-bold">⚡ Tasks</h2>
              </div>
              <div className="flex items-center gap-2 text-[rgba(26,26,46,0.55)]">
                <span className="text-xs">6 open</span>
                {expandedSections.tasks ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>

            {expandedSections.tasks && (
              <div className="bg-white rounded-2xl p-4 border border-[#E8E4F0] shadow-sm mx-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-[#EF4444]/10 text-[#EF4444] px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center">
                    ⚡ Tasks
                  </div>
                  <div className="bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                    Open
                  </div>
                </div>
                
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[#1A1A2E] font-bold text-base leading-tight pr-4">Design my Final Year Project Poster</h3>
                  <div className="text-[#EF4444] font-bold text-lg whitespace-nowrap">₹500</div>
                </div>
                
                <p className="text-[rgba(26,26,46,0.55)] text-xs mb-3">by Rahul Kumar</p>
                
                <p className="text-[#1A1A2E] text-sm leading-snug mb-4">
                  Need a professional A3 poster for my BCA final year project. Canva or Figma designs welcome.
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-1 bg-[#FAF8F4] text-[#1A1A2E] px-2 py-1 rounded text-xs border border-[#E8E4F0]">
                    <Tag size={12} className="text-[rgba(26,26,46,0.55)]" /> design
                  </div>
                  <div className="flex items-center gap-1 bg-[#FAF8F4] text-[#1A1A2E] px-2 py-1 rounded text-xs border border-[#E8E4F0]">
                    <Users size={12} className="text-[rgba(26,26,46,0.55)]" /> 4 applied
                  </div>
                </div>
                
                <button className="w-full bg-[#EF4444] text-white font-medium text-sm py-2.5 rounded-lg active:scale-[0.98] transition-transform">
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* SECTION D - Certifications (Collapsed) */}
          <div className="flex flex-col gap-3">
            <div 
              className="flex items-center justify-between px-4 cursor-pointer select-none"
              onClick={() => toggleSection('certifications')}
            >
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-4 bg-[#10B981] rounded-full"></div>
                <h2 className="text-[#10B981] text-sm font-bold">🏆 Certifications</h2>
              </div>
              <div className="flex items-center gap-2 text-[rgba(26,26,46,0.55)]">
                <span className="text-xs">2 listings</span>
                {expandedSections.certifications ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>
          </div>

          {/* SECTION E - Projects (Collapsed) */}
          <div className="flex flex-col gap-3">
            <div 
              className="flex items-center justify-between px-4 cursor-pointer select-none"
              onClick={() => toggleSection('projects')}
            >
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-4 bg-[#6366F1] rounded-full"></div>
                <h2 className="text-[#6366F1] text-sm font-bold">💼 Projects</h2>
              </div>
              <div className="flex items-center gap-2 text-[rgba(26,26,46,0.55)]">
                <span className="text-xs">1 active</span>
                {expandedSections.projects ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* FAB & Speed Dial */}
      <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Speed Dial Buttons */}
        <div className={`flex flex-col items-center gap-3 transition-all duration-200 ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="flex items-center gap-3">
            <span className="bg-white px-3 py-1 rounded-md text-xs font-medium text-[#1A1A2E] shadow-sm border border-[#E8E4F0]">Task</span>
            <button className="w-10 h-10 bg-white border border-[#E8E4F0] rounded-full flex items-center justify-center text-[#EF4444] shadow-sm">
              <Zap size={18} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-white px-3 py-1 rounded-md text-xs font-medium text-[#1A1A2E] shadow-sm border border-[#E8E4F0]">Delivery</span>
            <button className="w-10 h-10 bg-white border border-[#E8E4F0] rounded-full flex items-center justify-center text-[#F59E0B] shadow-sm">
              <Package size={18} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-white px-3 py-1 rounded-md text-xs font-medium text-[#1A1A2E] shadow-sm border border-[#E8E4F0]">Assignment</span>
            <button className="w-10 h-10 bg-white border border-[#E8E4F0] rounded-full flex items-center justify-center text-[#5B4FE8] shadow-sm">
              <FileText size={18} />
            </button>
          </div>
        </div>

        <button 
          onClick={() => setFabOpen(!fabOpen)}
          className={`w-14 h-14 bg-[#5B4FE8] rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Backdrop for FAB */}
      {fabOpen && (
        <div 
          className="absolute inset-0 bg-white/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setFabOpen(false)}
        />
      )}
    </div>
  );
}
