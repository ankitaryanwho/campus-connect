import React, { useState } from 'react';
import { 
  UtensilsCrossed, 
  BookOpen, 
  Home, 
  Dumbbell, 
  ShoppingBag, 
  Cross, 
  Coffee,
  ChevronLeft,
  MapPin,
  Camera,
  MessageSquare,
  ArrowRight
} from 'lucide-react';

const CATEGORIES = [
  { id: 'food', label: 'Food', emoji: '🍽' },
  { id: 'grocery', label: 'Grocery', emoji: '🛒' },
  { id: 'pharmacy', label: 'Pharmacy', emoji: '💊' },
  { id: 'stationery', label: 'Stationery', emoji: '✏️' },
  { id: 'other', label: 'Other', emoji: '📦' },
];

const LOCATIONS = [
  { id: 'cafeteria', name: 'Main Cafeteria', icon: UtensilsCrossed, color: 'bg-green-100 text-green-600', time: '≈5 min' },
  { id: 'library', name: 'Central Library', icon: BookOpen, color: 'bg-blue-100 text-blue-600', time: '≈8 min' },
  { id: 'block_a', name: 'Block A Hostel', icon: Home, color: 'bg-orange-100 text-orange-600', time: '≈2 min' },
  { id: 'block_b', name: 'Block B Hostel', icon: Home, color: 'bg-red-100 text-red-600', time: '≈3 min' },
  { id: 'sports', name: 'Sports Complex', icon: Dumbbell, color: 'bg-purple-100 text-purple-600', time: '≈12 min' },
  { id: 'market', name: 'Main Gate Market', icon: ShoppingBag, color: 'bg-yellow-100 text-yellow-600', time: '≈15 min' },
  { id: 'health', name: 'Health Center', icon: Cross, color: 'bg-rose-100 text-rose-600', time: '≈10 min' },
  { id: 'tech', name: 'Tech Block Canteen', icon: Coffee, color: 'bg-amber-100 text-amber-600', time: '≈7 min' },
];

export function QuickOrder() {
  const [selectedCategory, setSelectedCategory] = useState('food');
  const [selectedLocation, setSelectedLocation] = useState('cafeteria');

  const selectedLocData = LOCATIONS.find(l => l.id === selectedLocation);

  return (
    <div className="max-w-[390px] mx-auto min-h-screen bg-[#FAF8F4] relative overflow-hidden font-['Inter'] text-[#1A1A2E] pb-24">
      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order Delivery</h1>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-full pl-3 pr-1 py-1 shadow-sm border border-[#E8E4F0]">
          <span className="text-sm font-medium">Hi, Sneha</span>
          <div className="w-8 h-8 rounded-full bg-[#5B4FE8] text-white flex items-center justify-center text-xs font-bold">
            SP
          </div>
        </div>
      </header>

      {/* Categories */}
      <div className="pl-5 overflow-x-auto no-scrollbar mb-8">
        <div className="flex gap-3 w-max pr-5 py-1">
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                  isSelected 
                    ? 'bg-[#5B4FE8] text-white shadow-md' 
                    : 'bg-white text-[#1A1A2E] shadow-sm border border-[#E8E4F0]'
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Locations */}
      <section className="px-5 mb-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A1A2E]">Pick a nearby spot</h2>
          <span className="text-xs text-[#1A1A2E]/60 font-medium">{LOCATIONS.length} locations</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {LOCATIONS.map(loc => {
            const isSelected = selectedLocation === loc.id;
            const Icon = loc.icon;
            
            return (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc.id)}
                className={`text-left relative bg-white p-3 rounded-2xl transition-all ${
                  isSelected
                    ? 'border-2 border-[#5B4FE8] shadow-md'
                    : 'border border-[#E8E4F0] shadow-sm hover:border-[#5B4FE8]/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${loc.color}`}>
                  <Icon size={20} />
                </div>
                <div className="font-bold text-[13px] leading-tight mb-1">{loc.name}</div>
                <div className="text-[11px] text-[#1A1A2E]/50 font-medium">{loc.time} away</div>
                
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-[#5B4FE8]/10 text-[#5B4FE8] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ✓ Selected
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* What to get */}
      <section className="px-5 mb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4F0] mb-3">
          <div className="flex items-start gap-3">
            <MessageSquare size={20} className="text-[#1A1A2E]/40 mt-0.5 shrink-0" />
            <textarea 
              placeholder="Describe what you need..." 
              className="w-full bg-transparent text-sm resize-none outline-none min-h-[60px] placeholder:text-[#1A1A2E]/40"
            ></textarea>
          </div>
        </div>
        
        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#E8E4F0] text-[#1A1A2E]/60 text-sm font-medium hover:bg-black/5 hover:border-[#5B4FE8]/30 transition-colors">
          <Camera size={18} className="text-[#5B4FE8]" />
          + Add photo
        </button>
      </section>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 w-full max-w-[390px] bg-white border-t border-[#E8E4F0] p-4 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#1A1A2E]/60 mb-0.5">
              <MapPin size={12} className="text-[#1A1A2E]/40" />
              <span>{selectedLocData?.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <ArrowRight size={14} className="text-[#5B4FE8]" />
              <span>Room B-204</span>
            </div>
          </div>
          
          <div className="w-[1px] h-8 bg-[#E8E4F0] mx-4"></div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-[#1A1A2E]/60 font-medium">Est. fee</div>
              <div className="text-sm font-bold">₹40</div>
            </div>
            <button className="bg-[#5B4FE8] text-white px-5 py-3 rounded-full text-sm font-bold shadow-[0_4px_12px_rgba(91,79,232,0.3)]">
              Order Now
            </button>
          </div>
        </div>
      </div>
      
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
