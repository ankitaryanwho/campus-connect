import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Bell, 
  MapPin, 
  ChevronDown, 
  Target, 
  X, 
  UtensilsCrossed, 
  BookOpen, 
  Home, 
  Dumbbell, 
  ShoppingBag, 
  Cross, 
  Coffee,
  Check
} from 'lucide-react';

const locations = [
  { id: 'main-cafe', name: 'Main Cafeteria', icon: UtensilsCrossed },
  { id: 'central-lib', name: 'Central Library', icon: BookOpen },
  { id: 'block-a', name: 'Block A Hostel', icon: Home },
  { id: 'block-b', name: 'Block B Hostel', icon: Home },
  { id: 'sports-complex', name: 'Sports Complex', icon: Dumbbell },
  { id: 'main-gate', name: 'Main Gate Market', icon: ShoppingBag },
  { id: 'health-center', name: 'Health Center', icon: Cross },
  { id: 'tech-canteen', name: 'Tech Block Canteen', icon: Coffee },
];

export function MapDelivery() {
  const [showPickup, setShowPickup] = useState(true);
  const [selectedPickup, setSelectedPickup] = useState(locations[0]);
  const [item, setItem] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="max-w-[390px] mx-auto min-h-screen bg-[#FAF8F4] relative overflow-hidden font-['Inter'] text-[#1A1A2E] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-[#FAF8F4] sticky top-0 z-10">
        <button className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
          <ChevronLeft className="w-6 h-6 text-[#1A1A2E]" />
        </button>
        <h1 className="text-[17px] font-semibold">Request Delivery</h1>
        <button className="p-2 -mr-2 rounded-full hover:bg-black/5 transition-colors">
          <Bell className="w-5 h-5 text-[#1A1A2E]" />
        </button>
      </div>

      {/* Map Area */}
      <div className="relative h-[40vh] w-full bg-[#F0FDF4] overflow-hidden shrink-0 border-b border-[#E8E4F0]">
        {/* Roads mockup */}
        <div className="absolute top-1/4 -left-10 w-[120%] h-12 bg-white/60 -rotate-12 rounded-full"></div>
        <div className="absolute top-2/3 -left-10 w-[120%] h-8 bg-white/60 rotate-6 rounded-full"></div>
        <div className="absolute left-1/3 -top-10 w-10 h-[120%] bg-white/60 rotate-12 rounded-full"></div>

        {/* Path line SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          <path 
            d="M120,100 C150,180 220,120 260,200" 
            fill="none" 
            stroke="#5B4FE8" 
            strokeWidth="3" 
            strokeDasharray="8 6"
            className="opacity-60"
          />
        </svg>

        {/* Pickup Pin */}
        <div className="absolute top-[80px] left-[100px] flex flex-col items-center">
          <div className="bg-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm mb-1 text-[#1A1A2E]">
            Pickup
          </div>
          <div className="w-6 h-6 rounded-full bg-[#5B4FE8] flex items-center justify-center shadow-md">
            <div className="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>

        {/* Drop Pin */}
        <div className="absolute top-[190px] left-[250px] flex flex-col items-center">
          <div className="bg-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm mb-1 text-[#1A1A2E]">
            You
          </div>
          <div className="w-6 h-6 rounded-full bg-[#1A1A2E] flex items-center justify-center shadow-md border-2 border-white">
          </div>
        </div>

        {/* My Location Button */}
        <button className="absolute bottom-6 right-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
          <Target className="w-5 h-5 text-[#1A1A2E]" />
        </button>
      </div>

      {/* Bottom Sheet */}
      <div className="flex-1 bg-white rounded-t-[24px] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] -mt-4 relative z-20 flex flex-col p-5">
        <div className="w-12 h-1.5 bg-[#E8E4F0] rounded-full mx-auto mb-6"></div>

        {/* Delivering From */}
        <button 
          onClick={() => setShowPickup(true)}
          className="flex items-center justify-between w-full p-4 rounded-xl border border-[#E8E4F0] hover:border-[#5B4FE8]/30 transition-colors bg-[#FAF8F4]/50 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#5B4FE8]/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#5B4FE8]" />
            </div>
            <div className="text-left">
              <p className="text-[13px] text-[#1A1A2E]/60 font-medium mb-0.5">Delivering from</p>
              <p className="text-[15px] font-semibold text-[#1A1A2E]">{selectedPickup.name}</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-[#1A1A2E]/40 group-hover:text-[#5B4FE8] transition-colors" />
        </button>

        <div className="h-[1px] w-full bg-[#E8E4F0] my-5"></div>

        {/* What to get */}
        <div className="mb-5">
          <label className="block text-[14px] font-semibold text-[#1A1A2E] mb-2">What to get?</label>
          <input 
            type="text" 
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="e.g. 2x chicken roll, 1x cold coffee..." 
            className="w-full bg-[#FAF8F4] border border-[#E8E4F0] rounded-xl px-4 py-3.5 text-[15px] placeholder:text-[#1A1A2E]/40 focus:outline-none focus:border-[#5B4FE8] focus:ring-1 focus:ring-[#5B4FE8] transition-all"
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-[14px] font-semibold text-[#1A1A2E] mb-2">Notes</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions for the delivery partner?" 
            className="w-full bg-[#FAF8F4] border border-[#E8E4F0] rounded-xl px-4 py-3 text-[15px] placeholder:text-[#1A1A2E]/40 focus:outline-none focus:border-[#5B4FE8] focus:ring-1 focus:ring-[#5B4FE8] transition-all resize-none h-20"
          ></textarea>
        </div>

        <div className="mt-auto">
          {/* Fee & Time */}
          <div className="flex justify-center mb-4">
            <div className="bg-[#5B4FE8]/10 text-[#5B4FE8] px-4 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B4FE8]"></span>
              Est. fee: ₹25–40 • ~15 min
            </div>
          </div>

          <button className="w-full bg-[#5B4FE8] text-white rounded-full py-4 font-semibold text-[16px] shadow-[0_4px_12px_rgba(91,79,232,0.3)] hover:bg-[#4A3ED4] transition-all active:scale-[0.98]">
            Request Pickup
          </button>
        </div>
      </div>

      {/* Pickup Location Overlay */}
      {showPickup && (
        <>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 z-30 transition-opacity" 
            onClick={() => setShowPickup(false)}
          ></div>
          
          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-40 max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[#E8E4F0]">
              <h2 className="text-[18px] font-bold text-[#1A1A2E]">Choose Pickup Location</h2>
              <button 
                onClick={() => setShowPickup(false)}
                className="p-2 -mr-2 rounded-full bg-[#FAF8F4] hover:bg-[#E8E4F0] transition-colors"
              >
                <X className="w-5 h-5 text-[#1A1A2E]" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-2">
              {locations.map((loc) => {
                const Icon = loc.icon;
                const isSelected = selectedPickup.id === loc.id;
                
                return (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setSelectedPickup(loc);
                      setShowPickup(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-xl mb-1 transition-all ${
                      isSelected 
                        ? 'bg-[#5B4FE8]/10' 
                        : 'hover:bg-[#FAF8F4]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-[#5B4FE8] text-white' : 'bg-[#FAF8F4] text-[#1A1A2E]/60'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[16px] ${isSelected ? 'font-semibold text-[#5B4FE8]' : 'font-medium text-[#1A1A2E]'}`}>
                        {loc.name}
                      </span>
                    </div>
                    
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-[#5B4FE8] flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#E8E4F0]"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
