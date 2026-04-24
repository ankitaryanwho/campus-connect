import React, { useState } from 'react';
import { X, MapPin, Paperclip, Send, Edit2, Bot, UtensilsCrossed } from 'lucide-react';

export function ChatOrder() {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  const buildings = ['Block A', 'Block B', 'Block C', 'Other...'];

  return (
    <div className="max-w-[390px] mx-auto min-h-screen bg-[#FAF8F4] relative overflow-hidden font-['Inter'] text-[#1A1A2E] flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-[#E8E4F0] sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#5B4FE8] flex items-center justify-center text-white shrink-0">
            <Bot size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-[15px] leading-tight text-[#1A1A2E]">CampusConnect Bot</h1>
            <p className="text-[12px] text-[#1A1A2E]/60">Delivery Assistant</p>
          </div>
        </div>
        <button className="w-8 h-8 rounded-full bg-[#FAF8F4] flex items-center justify-center text-[#1A1A2E]/60 hover:bg-[#E8E4F0] transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 pb-32">
        
        {/* Exchange 1 */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 max-w-[85%]">
            <div className="w-6 h-6 rounded-full bg-[#5B4FE8] flex items-center justify-center text-white shrink-0 mt-auto">
              <span className="text-[10px] font-bold">CC</span>
            </div>
            <div className="bg-white p-3 rounded-2xl rounded-bl-sm shadow-sm border border-[#E8E4F0]/50 text-[14px] text-[#1A1A2E]">
              Hey Sneha! 👋 What would you like me to get for you?
            </div>
          </div>
          <div className="flex gap-2 max-w-[85%] self-end">
            <div className="bg-[#5B4FE8] p-3 rounded-2xl rounded-br-sm text-[14px] text-white">
              2x Chicken Roll + 1 Cold Drink 🍗
            </div>
          </div>
        </div>

        {/* Exchange 2 */}
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex gap-2 max-w-[85%]">
            <div className="w-6 h-6 rounded-full bg-[#5B4FE8] flex items-center justify-center text-white shrink-0 mt-auto">
              <span className="text-[10px] font-bold">CC</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="bg-white p-3 rounded-2xl rounded-bl-sm shadow-sm border border-[#E8E4F0]/50 text-[14px] text-[#1A1A2E]">
                Got it! 🛒 Where should I pick it up from?
              </div>
              <div className="self-start px-2 py-1 bg-white border border-[#E8E4F0] rounded-full text-[11px] font-medium text-[#1A1A2E]/60 flex items-center gap-1 shadow-sm">
                8 options
              </div>
            </div>
          </div>
          <div className="flex gap-2 max-w-[85%] self-end">
            <div className="bg-[#5B4FE8] p-3 rounded-2xl rounded-br-sm text-[14px] text-white flex items-center gap-1.5">
              <UtensilsCrossed size={14} className="opacity-80" />
              Main Cafeteria
            </div>
          </div>
        </div>

        {/* Exchange 3 - ACTIVE */}
        <div className="flex flex-col gap-3 mt-2 mb-4">
          <div className="flex gap-2 max-w-[90%]">
            <div className="w-6 h-6 rounded-full bg-[#5B4FE8] flex items-center justify-center text-white shrink-0 mt-auto">
              <span className="text-[10px] font-bold">CC</span>
            </div>
            <div className="flex flex-col gap-2 w-full overflow-hidden">
              <div className="bg-white p-3 rounded-2xl rounded-bl-sm shadow-sm border border-[#E8E4F0]/50 text-[14px] text-[#1A1A2E] self-start">
                Perfect! 📍 Which building should I deliver to?
              </div>
              
              {/* Quick Reply Chips below bubble */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                {buildings.map((building) => (
                  <button
                    key={building}
                    onClick={() => {
                      setSelectedBuilding(building);
                      setInputText(building);
                    }}
                    className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 border shadow-sm ${
                      selectedBuilding === building
                        ? 'bg-[#5B4FE8] text-white border-[#5B4FE8]'
                        : 'bg-white text-[#5B4FE8] border-[rgba(91,79,232,0.15)] hover:bg-[#5B4FE8]/5'
                    }`}
                  >
                    {building}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Area (Fixed) */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E8E4F0] flex flex-col">
        
        {/* Summary Pill */}
        <div className="absolute -top-12 left-0 right-0 flex justify-center px-4 pointer-events-none">
          <div className="bg-[#FAF8F4] border border-[#E8E4F0] shadow-sm rounded-full py-1.5 px-3 flex items-center gap-2 pointer-events-auto">
            <span className="text-[11px] font-medium text-[#1A1A2E]/80">
              📦 Chicken Roll ×2 · 📍 Main Cafeteria → {selectedBuilding || '...'} · ₹40
            </span>
            <button className="text-[#5B4FE8] p-0.5 rounded-full hover:bg-[#5B4FE8]/10 transition-colors">
              <Edit2 size={12} />
            </button>
          </div>
        </div>

        {/* Floating quick replies if none selected */}
        {!selectedBuilding && (
          <div className="absolute -top-[88px] left-0 right-0 px-3 flex gap-2 overflow-x-auto scrollbar-hide pointer-events-auto pb-1">
             {buildings.map((building) => (
                <button
                  key={`float-${building}`}
                  onClick={() => {
                    setSelectedBuilding(building);
                    setInputText(building);
                  }}
                  className="shrink-0 px-3 py-1.5 bg-white border border-[rgba(91,79,232,0.15)] shadow-sm rounded-full text-[12px] font-medium text-[#5B4FE8]"
                >
                  {building}
                </button>
              ))}
          </div>
        )}

        {/* Input Row */}
        <div className="px-3 py-3 flex items-center gap-2 bg-white">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-[#1A1A2E]/40 hover:bg-[#FAF8F4] transition-colors shrink-0">
            <Paperclip size={20} />
          </button>
          
          <div className="flex-1 bg-[#FAF8F4] rounded-full px-4 py-2.5 flex items-center">
            <input
              type="text"
              placeholder="Type your reply..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="bg-transparent w-full text-[14px] text-[#1A1A2E] placeholder:text-[#1A1A2E]/40 outline-none"
            />
          </div>
          
          <button 
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              inputText.trim() 
                ? 'bg-[#5B4FE8] text-white hover:bg-[#4a3fda]' 
                : 'bg-[#E8E4F0] text-white'
            }`}
          >
            <Send size={18} className={inputText.trim() ? 'ml-0.5' : ''} />
          </button>
        </div>
        
        {/* iOS safe area bottom padding */}
        <div className="h-6 bg-white w-full"></div>
      </div>
      
      {/* Scrollbar hide styles */}
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
