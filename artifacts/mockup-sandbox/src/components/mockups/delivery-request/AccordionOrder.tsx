import React, { useState } from 'react';
import { 
  ChevronLeft, 
  HelpCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Circle, 
  CircleDot,
  UtensilsCrossed, 
  BookOpen, 
  Home, 
  Dumbbell, 
  ShoppingBag, 
  Cross, 
  Coffee
} from 'lucide-react';

const LOCATIONS = [
  { id: 'cafeteria', name: 'Main Cafeteria', subtitle: 'Food court, Ground floor', icon: UtensilsCrossed, color: 'text-orange-500', bg: 'bg-orange-100' },
  { id: 'library', name: 'Central Library', subtitle: 'Near admin block', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: 'hostel-a', name: 'Block A Hostel', subtitle: 'Boys hostel', icon: Home, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  { id: 'hostel-b', name: 'Block B Hostel', subtitle: 'Girls hostel', icon: Home, color: 'text-pink-500', bg: 'bg-pink-100' },
  { id: 'sports', name: 'Sports Complex', subtitle: 'Indoor stadium', icon: Dumbbell, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  { id: 'market', name: 'Main Gate Market', subtitle: 'Outside campus', icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-100' },
  { id: 'health', name: 'Health Center', subtitle: 'Medical block', icon: Cross, color: 'text-red-500', bg: 'bg-red-100' },
  { id: 'tech', name: 'Tech Block Canteen', subtitle: 'Block C, 1st floor', icon: Coffee, color: 'text-teal-500', bg: 'bg-teal-100' },
];

export function AccordionOrder() {
  const [activeCard, setActiveCard] = useState<string>('pickup');
  const [selectedLocation, setSelectedLocation] = useState<string>('cafeteria');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLocations = LOCATIONS.filter(loc => 
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    loc.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCard = (card: string) => {
    setActiveCard(activeCard === card ? '' : card);
  };

  return (
    <div className="max-w-[390px] mx-auto min-h-[100dvh] bg-[#FAF8F4] relative overflow-hidden font-['Inter'] text-[#1A1A2E] flex flex-col">
      
      {/* Header */}
      <div className="bg-[#1A1A2E] text-white pt-12 pb-4 px-4 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <button className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">New Delivery</h1>
          <button className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2">
          {/* Item - Filled */}
          <div className="h-1 flex-1 bg-[#5B4FE8] rounded-full"></div>
          {/* Pickup - Active Glow */}
          <div className="h-1 flex-1 bg-[#5B4FE8] rounded-full shadow-[0_0_8px_rgba(91,79,232,0.8)] relative">
            <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>
          </div>
          {/* Dropoff - Empty */}
          <div className="h-1 flex-1 bg-white/20 rounded-full"></div>
          {/* Payment - Empty */}
          <div className="h-1 flex-1 bg-white/20 rounded-full"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 pb-28">
        
        {/* Card 1: Item Details */}
        <div 
          className="bg-white rounded-[20px] shadow-sm border border-[#E8E4F0] overflow-hidden transition-all duration-300"
          onClick={() => toggleCard('item')}
        >
          <div className="p-4 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
              <span className="font-semibold text-[15px]">Item Details</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-[#1A1A2E]/60 truncate max-w-[120px]">Chicken Roll ×2</span>
              {activeCard === 'item' ? <ChevronUp className="w-5 h-5 text-[#1A1A2E]/40" /> : <ChevronDown className="w-5 h-5 text-[#1A1A2E]/40" />}
            </div>
          </div>
          {activeCard === 'item' && (
            <div className="px-4 pb-4 border-t border-[#E8E4F0]/50 mt-2 pt-4">
              <input type="text" placeholder="What needs to be delivered?" className="w-full bg-[#FAF8F4] border-none rounded-xl px-4 py-3 text-[15px] outline-none mb-3" defaultValue="Chicken Roll ×2" />
              <div className="flex gap-2 mb-3">
                <span className="px-3 py-1 bg-[#5B4FE8]/10 text-[#5B4FE8] rounded-full text-sm font-medium">Food</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">Documents</span>
              </div>
              <textarea placeholder="Any specific instructions?" className="w-full bg-[#FAF8F4] border-none rounded-xl px-4 py-3 text-[15px] outline-none h-20 resize-none"></textarea>
            </div>
          )}
        </div>

        {/* Card 2: Pickup Location */}
        <div 
          className={`bg-white rounded-[20px] shadow-sm border overflow-hidden transition-all duration-300 ${activeCard === 'pickup' ? 'border-[#5B4FE8]' : 'border-[#E8E4F0]'}`}
        >
          <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleCard('pickup')}>
            <div className="flex items-center gap-3">
              {activeCard === 'pickup' ? (
                <div className="w-2.5 h-2.5 rounded-full bg-[#5B4FE8] shadow-[0_0_6px_rgba(91,79,232,0.4)] ml-1.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
              )}
              <span className={`font-semibold text-[15px] ${activeCard === 'pickup' ? 'text-[#5B4FE8]' : 'text-[#1A1A2E]'}`}>Pickup Location</span>
              {activeCard === 'pickup' && (
                <span className="text-[10px] uppercase tracking-wider font-bold bg-[#5B4FE8]/10 text-[#5B4FE8] px-2 py-0.5 rounded-sm">Required</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeCard !== 'pickup' && (
                <span className="text-[14px] text-[#1A1A2E]/60 truncate max-w-[120px]">
                  {LOCATIONS.find(l => l.id === selectedLocation)?.name || 'Select'}
                </span>
              )}
              {activeCard === 'pickup' ? <ChevronUp className="w-5 h-5 text-[#1A1A2E]/40" /> : <ChevronDown className="w-5 h-5 text-[#1A1A2E]/40" />}
            </div>
          </div>
          
          {activeCard === 'pickup' && (
            <div className="px-4 pb-4">
              <div className="relative mb-4">
                <Search className="w-5 h-5 text-[#1A1A2E]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search locations..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FAF8F4] border-none rounded-xl pl-10 pr-4 py-3 text-[15px] outline-none focus:ring-1 focus:ring-[#5B4FE8]/30 placeholder:text-[#1A1A2E]/40"
                />
              </div>

              <div className="max-h-[320px] overflow-y-auto pr-1 -mr-1 space-y-1">
                {filteredLocations.map((loc, index) => {
                  const isSelected = selectedLocation === loc.id;
                  const Icon = loc.icon;
                  return (
                    <div key={loc.id}>
                      <button
                        onClick={() => setSelectedLocation(loc.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${isSelected ? 'bg-[#5B4FE8]/5' : 'hover:bg-[#FAF8F4]'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${loc.bg} ${loc.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-[15px]">{loc.name}</div>
                            <div className="text-[13px] text-[#1A1A2E]/50">{loc.subtitle}</div>
                          </div>
                        </div>
                        <div className="text-[#5B4FE8]">
                          {isSelected ? (
                            <CircleDot className="w-6 h-6 fill-[#5B4FE8]/10" />
                          ) : (
                            <Circle className="w-6 h-6 text-[#E8E4F0]" />
                          )}
                        </div>
                      </button>
                      {index < filteredLocations.length - 1 && (
                        <div className="h-[1px] bg-[#E8E4F0]/50 ml-14 my-1" />
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-3 border-t border-[#E8E4F0] text-center">
                <button className="text-[14px] font-medium text-[#5B4FE8] hover:underline">
                  Can't find your spot?
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Drop-off */}
        <div 
          className="bg-white rounded-[20px] shadow-sm border border-[#E8E4F0] overflow-hidden transition-all duration-300"
          onClick={() => toggleCard('dropoff')}
        >
          <div className="p-4 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E8E4F0] ml-1.5" />
              <span className="font-semibold text-[15px]">Drop-off</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-[#1A1A2E]/40 italic">Tap to enter your location</span>
              {activeCard === 'dropoff' ? <ChevronUp className="w-5 h-5 text-[#1A1A2E]/40" /> : <ChevronDown className="w-5 h-5 text-[#1A1A2E]/40" />}
            </div>
          </div>
          {activeCard === 'dropoff' && (
            <div className="px-4 pb-4 pt-2">
               <input type="text" placeholder="Room/Block Number" className="w-full bg-[#FAF8F4] border-none rounded-xl px-4 py-3 text-[15px] outline-none mb-3" />
            </div>
          )}
        </div>

        {/* Card 4: Payment */}
        <div 
          className="bg-white rounded-[20px] shadow-sm border border-[#E8E4F0] overflow-hidden transition-all duration-300"
          onClick={() => toggleCard('payment')}
        >
          <div className="p-4 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E8E4F0] ml-1.5" />
              <span className="font-semibold text-[15px]">Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-[#1A1A2E]/60 truncate max-w-[150px]">Wallet Balance: ₹120</span>
              {activeCard === 'payment' ? <ChevronUp className="w-5 h-5 text-[#1A1A2E]/40" /> : <ChevronDown className="w-5 h-5 text-[#1A1A2E]/40" />}
            </div>
          </div>
          {activeCard === 'payment' && (
            <div className="px-4 pb-4 pt-2">
              <div className="p-4 bg-[#FAF8F4] rounded-xl flex justify-between items-center mb-2">
                <span className="text-[#1A1A2E]/60">Wallet Balance</span>
                <span className="font-semibold">₹120</span>
              </div>
              <div className="p-4 bg-[#FAF8F4] rounded-xl flex justify-between items-center">
                <span className="text-[#1A1A2E]/60">Estimated Charge</span>
                <span className="font-semibold">₹40</span>
              </div>
            </div>
          )}
        </div>
        
      </div>

      {/* Bottom Sticky Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white p-4 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-[#E8E4F0] flex items-center justify-between">
        <div>
          <div className="text-[13px] text-[#1A1A2E]/60 mb-0.5">Total</div>
          <div className="text-xl font-bold">₹40</div>
        </div>
        <button className="bg-[#5B4FE8] text-white px-8 py-3.5 rounded-full font-semibold shadow-[0_4px_12px_rgba(91,79,232,0.3)] hover:opacity-90 transition-opacity w-[140px] flex items-center justify-center gap-2">
          Continue <span className="text-lg leading-none">→</span>
        </button>
      </div>

    </div>
  );
}
