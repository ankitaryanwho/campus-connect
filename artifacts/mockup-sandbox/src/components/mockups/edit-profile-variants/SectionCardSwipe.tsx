import React, { useState, useRef, useEffect } from 'react';
import { Camera, User, GraduationCap, Phone } from 'lucide-react';

export function SectionCardSwipe() {
  const [activeTab, setActiveTab] = useState<'about' | 'academic' | 'contact'>('about');
  const scrollRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: 'about', label: 'About Me', icon: User, color: 'text-blue-500', bg: 'bg-blue-100' },
    { id: 'academic', label: 'Academic', icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-100' },
    { id: 'contact', label: 'Contact', icon: Phone, color: 'text-green-500', bg: 'bg-green-100' },
  ] as const;

  const scrollToCard = (id: string) => {
    setActiveTab(id as any);
    if (scrollRef.current) {
      const cardIndex = tabs.findIndex(t => t.id === id);
      const cardWidth = 280 + 16; // width + gap
      scrollRef.current.scrollTo({
        left: cardIndex * cardWidth,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = 280 + 16;
      const activeIndex = Math.round(scrollLeft / cardWidth);
      if (tabs[activeIndex] && tabs[activeIndex].id !== activeTab) {
        setActiveTab(tabs[activeIndex].id);
      }
    }
  };

  return (
    <div className="max-w-[390px] mx-auto min-h-[844px] bg-[#FAF8F4] relative overflow-hidden flex flex-col font-['Inter'] shadow-2xl">
      {/* Top Section - Gradient Header */}
      <div className="h-[340px] bg-gradient-to-b from-[#5B4FE8] to-[#9B8FFF] px-6 pt-14 pb-8 flex flex-col items-center shrink-0 rounded-b-[32px] relative z-10">
        <div className="flex justify-between w-full text-white mb-2">
          <button className="text-white/80 hover:text-white transition-colors">Cancel</button>
          <span className="font-semibold text-lg">Edit Profile</span>
          <button className="text-white/80 hover:text-white transition-colors invisible">Save</button>
        </div>

        <div className="relative mt-6 mb-4">
          <div className="w-24 h-24 rounded-full border-[4px] border-white flex items-center justify-center bg-gradient-to-br from-[#5B4FE8] to-[#9B8FFF] shadow-lg">
            <span className="text-white text-3xl font-bold">SP</span>
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-[#5B4FE8] hover:bg-gray-50 transition-colors">
            <Camera size={16} />
          </button>
        </div>

        <h2 className="text-white font-bold text-xl mb-1">Sneha Patel</h2>
        <p className="text-white/70 text-sm">Computer Science @ MIT</p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col -mt-10 relative z-20 pb-24">
        {/* Tabs */}
        <div className="flex justify-center gap-6 px-6 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => scrollToCard(tab.id)}
              className={`pb-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? 'text-[#5B4FE8]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5B4FE8] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Scrollable Cards */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 px-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-8 pt-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Card 1: About Me */}
          <div className={`shrink-0 w-[280px] bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 snap-center transition-all duration-300 ${activeTab === 'about' ? 'ring-2 ring-[#5B4FE8] scale-[1.02]' : 'scale-100 opacity-70'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tabs[0].bg} ${tabs[0].color}`}>
                <User size={20} />
              </div>
              <h3 className="font-bold text-[#1A1A2E]">About Me</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  defaultValue="Sneha Patel"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE8] focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Bio</label>
                <textarea 
                  defaultValue="CS junior | design + code 🎨"
                  rows={4}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE8] focus:bg-white transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Academic */}
          <div className={`shrink-0 w-[280px] bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 snap-center transition-all duration-300 ${activeTab === 'academic' ? 'ring-2 ring-[#5B4FE8] scale-[1.02]' : 'scale-100 opacity-70'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tabs[1].bg} ${tabs[1].color}`}>
                <GraduationCap size={20} />
              </div>
              <h3 className="font-bold text-[#1A1A2E]">Academic</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">College / University</label>
                <input 
                  type="text" 
                  defaultValue="MIT"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE8] focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Program / Major</label>
                <input 
                  type="text" 
                  defaultValue="Computer Science"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE8] focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Graduation Year</label>
                <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE8] focus:bg-white transition-colors appearance-none">
                  <option>2024</option>
                  <option selected>2025</option>
                  <option>2026</option>
                  <option>2027</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 3: Contact */}
          <div className={`shrink-0 w-[280px] bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 snap-center transition-all duration-300 ${activeTab === 'contact' ? 'ring-2 ring-[#5B4FE8] scale-[1.02]' : 'scale-100 opacity-70'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tabs[2].bg} ${tabs[2].color}`}>
                <Phone size={20} />
              </div>
              <h3 className="font-bold text-[#1A1A2E]">Contact</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone Number</label>
                <input 
                  type="tel" 
                  defaultValue="+1 (617) 555-0194"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE8] focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  defaultValue="sneha.p@mit.edu"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE8] focus:bg-white transition-colors opacity-60 cursor-not-allowed"
                  disabled
                />
                <p className="text-[10px] text-gray-400 mt-1">University email cannot be changed.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">LinkedIn / Portfolio (Optional)</label>
                <input 
                  type="url" 
                  placeholder="https://"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#1A1A2E] focus:outline-none focus:border-[#5B4FE8] focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>
          
          {/* spacer for right padding */}
          <div className="shrink-0 w-6"></div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FAF8F4] via-[#FAF8F4] to-transparent z-30">
        <button className="w-full h-12 bg-[#5B4FE8] text-white font-medium rounded-xl shadow-lg shadow-[#5B4FE8]/25 hover:bg-[#4a3fda] transition-colors flex items-center justify-center gap-2">
          Save Changes
        </button>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
